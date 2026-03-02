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
const kycRoutes = require('./routes/kyc.routes');
const subscriptionRoutes = require('./routes/subscription.routes'); // ✅ ADDED

const app = express();

// ==================== TRUST PROXY ====================
app.set('trust proxy', 1);

// ==================== SECURITY MIDDLEWARE ====================
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

app.use(mongoSanitize());
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
    if (allowedOrigins.includes(origin)) return callback(null, true);
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
  skip: (req) => req.path.includes('/webhook')
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many authentication attempts, try again later.' },
  skipSuccessfulRequests: true
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ==================== STATIC FILES ====================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== DATABASE CONNECTION ====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`✅ MongoDB Connected`);
    startSubscriptionCron();
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== API ROUTES ====================

// Auth & Users
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/verify-email', verifyRoutes);

// KYC
app.use('/api/kyc', kycRoutes);

// Subscription (✅ ADDED)
app.use('/api/subscription', subscriptionRoutes);

// Escrow & Core
app.use('/api/escrow', escrowRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/disputes', disputeRoutes);

// Payments
app.use('/api/payments', paymentRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Admin
app.use('/api/admin', adminRoutes);

// Platform
app.use('/api/platform', platformSettingsRoutes);

// API Keys
app.use('/api/api-keys', apiKeyRoutes);

// Business & Banking
app.use('/api/business', businessRoutes);
app.use('/api/bank', bankAccountRoutes);

// Contact
app.use('/api/contact', contactRoutes);

// Webhooks
app.use('/api/webhooks', webhookRoutes);

// Public API
app.use('/api/v1', apiV1Routes);

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

// ==================== UNHANDLED ERRORS ====================
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 SERVER STARTED SUCCESSFULLY       ║
╠════════════════════════════════════════╣
║   Port: ${PORT}                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}
║   Frontend: ${process.env.FRONTEND_URL}
║   Backend: ${process.env.BACKEND_URL}
╚════════════════════════════════════════╝
  `);
});

// Set server timeout
server.timeout = 30000;

// Keep alive timeout
server.keepAliveTimeout = 65000;

// Headers timeout
server.headersTimeout = 66000;

if (process.env.RESET_ADMIN === 'true') require('./scripts/resetAdmin');
module.exports = app;
