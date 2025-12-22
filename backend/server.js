// backend/server.js - CLEANED & PRODUCTION READY
require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const fs = require('fs');

// ==================== CREATE UPLOAD DIRECTORIES ====================
const uploadDirs = [
  'uploads',
  'uploads/avatars',
  'uploads/documents',
  'uploads/kyc',
  'uploads/disputes'
];

uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// ==================== IMPORT CRON JOBS ====================
const { startSubscriptionCron } = require('./jobs/subscription.cron');

// ==================== IMPORT ROUTES ====================
const authRoutes = require('./routes/auth.routes');
const webhookRoutes = require('./routes/webhook.routes');
const userRoutes = require('./routes/user.routes');
const profileRoutes = require('./routes/profile.routes');
const securityRoutes = require('./routes/security.routes');
const escrowRoutes = require('./routes/escrow.routes');
const chatRoutes = require('./routes/chat.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const disputeRoutes = require('./routes/dispute.routes');
const adminRoutes = require('./routes/admin.routes');
const apiKeyRoutes = require('./routes/apiKey.routes');
const verifyRoutes = require('./routes/verify.routes');
const notificationRoutes = require('./routes/notification.routes');
const platformSettingsRoutes = require('./routes/platformSettings.routes');
const paymentRoutes = require('./routes/payment.routes');
const contactRoutes = require('./routes/contact.routes');
const apiV1Routes = require('./routes/api.v1.routes');
const businessRoutes = require('./routes/business.routes');
const bankAccountRoutes = require('./routes/bankAccount.routes');

const app = express();

// ==================== TRUST PROXY ====================
app.set('trust proxy', 1);

// ==================== SECURITY MIDDLEWARE ====================

// Helmet - Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.paystack.co", "https://api.flutterwave.com", "https://api.nowpayments.io"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// MongoDB Sanitization - Prevent NoSQL injection
app.use(mongoSanitize());

// Compression
app.use(compression());

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://descrow-5l46.onrender.com',
  'https://descrow-ow5e.onrender.com',
  'https://dealcross.net',
  'https://www.dealcross.net',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log('❌ Blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

app.options('*', cors());

// ==================== BODY PARSERS ====================
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== LOGGING ====================
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
}

// ==================== RATE LIMITING ====================

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.includes('/webhook')
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many authentication attempts, try again later.' },
  skipSuccessfulRequests: true
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many payment attempts, please wait.' }
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  skipFailedRequests: true
});

const profileLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many profile requests. Please refresh the page.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payments/initialize', paymentLimiter);
app.use('/api/payments/webhook', webhookLimiter);
app.use('/api/profile', profileLimiter);

// ==================== STATIC FILES ====================
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true,
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

// ==================== DATABASE CONNECTION ====================
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log(`✅ MongoDB Connected: ${mongoose.connection.name}`);
    console.log(`📊 Database Host: ${mongoose.connection.host}`);
    
    startSubscriptionCron();
    console.log('⏰ Subscription cron jobs started');
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

mongoose.connection.on('error', err => {
  console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dealcross API running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  const healthCheck = {
    success: true,
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  };

  res.json(healthCheck);
});

// ==================== API ROUTES ====================

// Authentication & User Management
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/verify-email', verifyRoutes);

// Core Escrow Functionality
app.use('/api/escrow', escrowRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/disputes', disputeRoutes);

// Payments
app.use('/api/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Admin Panel
app.use('/api/admin', adminRoutes);

// Platform Settings
app.use('/api/platform', platformSettingsRoutes);

// API Keys Management
app.use('/api/api-keys', apiKeyRoutes);

// Contact & Support
app.use('/api/contact', contactRoutes);

// Business Features
app.use('/api/business', businessRoutes);

// Bank Account Management
app.use('/api/bank', bankAccountRoutes);

// Webhooks
app.use('/api/webhooks', webhookRoutes);

// Public API Routes (v1)
app.use('/api/v1', apiV1Routes);

// ==================== DEBUG ROUTES (DEVELOPMENT ONLY) ====================
if (process.env.NODE_ENV === 'development') {
  const Admin = require('./models/Admin.model');
  
  app.get('/api/debug/db-info', async (req, res) => {
    try {
      const dbName = mongoose.connection.name;
      const collections = await mongoose.connection.db.listCollections().toArray();
      const adminCount = await Admin.countDocuments();
      
      res.json({
        success: true,
        database: dbName,
        host: mongoose.connection.host,
        collections: collections.map(c => c.name),
        adminCount,
        connectionState: mongoose.connection.readyState
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.get('/api/debug/uploads', (req, res) => {
    const uploadsPath = path.join(__dirname, 'uploads/avatars');
    
    try {
      const files = fs.readdirSync(uploadsPath);
      res.json({
        success: true,
        uploadsPath,
        files,
        fileCount: files.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        uploadsPath
      });
    }
  });
}

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Multer Errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // CORS Errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }

  // Default Error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`✅ CORS Origins: ${allowedOrigins.length} allowed`);
  console.log(`⏰ Cron jobs: ACTIVE`);
  console.log(`📁 Upload directories: Created`);
  console.log('='.repeat(60));
});

server.timeout = 30000;

// ==================== GRACEFUL SHUTDOWN ====================
const shutdown = async (signal) => {
  console.log(`\n👋 ${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('💤 HTTP server closed');

    try {
      await mongoose.connection.close(false);
      console.log('📦 MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('⚠️ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => shutdown(signal));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

module.exports = app;