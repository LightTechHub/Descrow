// backend/models/APIKey.model.js - MERGED API KEY MODEL
const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Business information
  businessName: {
    type: String,
    trim: true
  },

  businessEmail: {
    type: String,
    lowercase: true,
    trim: true
  },

  // Key details
  name: {
    type: String,
    default: 'Default API Key'
  },

  apiKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  apiSecret: {
    type: String,
    required: true,
    select: false // Never return in queries by default
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked'],
    default: 'active',
    index: true
  },

  // Environment
  environment: {
    type: String,
    enum: ['test', 'sandbox', 'production'],
    default: 'test'
  },

  // Permissions (combined approach)
  permissions: {
    createEscrow: { type: Boolean, default: true },
    viewEscrow: { type: Boolean, default: true },
    updateEscrow: { type: Boolean, default: true },
    deleteEscrow: { type: Boolean, default: false },
    releasePayment: { type: Boolean, default: true },
    refunds: { type: Boolean, default: false },
    webhooks: { type: Boolean, default: true },
    viewTransactions: { type: Boolean, default: true }
  },

  // Rate limiting
  rateLimit: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerHour: { type: Number, default: 1000 },
    requestsPerDay: { type: Number, default: 5000 }
  },

  // Usage tracking (enhanced)
  usage: {
    totalRequests: { type: Number, default: 0 },
    requestsToday: { type: Number, default: 0 },
    requestsThisMonth: { type: Number, default: 0 },
    transactionsCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    lastResetDate: { type: Date, default: Date.now },
    lastMonthlyReset: { type: Date, default: Date.now }
  },

  // Webhook configuration
  webhookUrl: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid webhook URL'
    }
  },

  webhookSecret: {
    type: String,
    select: false
  },

  webhookEvents: [{
    type: String,
    enum: [
      'escrow.created',
      'escrow.funded',
      'escrow.delivered',
      'escrow.confirmed',
      'escrow.released',
      'escrow.cancelled',
      'escrow.disputed',
      'escrow.refunded',
      'payment.received',
      'payment.failed'
    ]
  }],

  // IP whitelist (optional security)
  ipWhitelist: [String],

  // Metadata
  metadata: {
    createdBy: String,
    lastRotatedAt: Date,
    notes: String,
    tier: {
      type: String,
      enum: ['free', 'starter', 'growth', 'enterprise', 'api'],
      default: 'free'
    }
  },

  // Expiry (optional)
  expiresAt: Date

}, {
  timestamps: true
});

// ==================== INDEXES ====================
apiKeySchema.index({ userId: 1, status: 1 });
apiKeySchema.index({ apiKey: 1, status: 1 });
apiKeySchema.index({ environment: 1 });
apiKeySchema.index({ 'usage.lastUsedAt': 1 });

// ==================== PRE-SAVE HOOKS ====================

// Generate API key and secret if not provided
apiKeySchema.pre('save', function(next) {
  // Generate API key
  if (!this.apiKey) {
    const prefix = this.environment === 'production' 
      ? 'sk_live_' 
      : this.environment === 'sandbox'
      ? 'sk_sandbox_'
      : 'sk_test_';
    this.apiKey = prefix + crypto.randomBytes(32).toString('hex');
  }

  // Generate API secret
  if (!this.apiSecret) {
    this.apiSecret = crypto.randomBytes(48).toString('hex');
  }

  // Generate webhook secret if webhook URL exists
  if (this.webhookUrl && !this.webhookSecret) {
    this.webhookSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');
  }

  next();
});

// Auto-reset daily usage
apiKeySchema.pre('save', function(next) {
  const now = new Date();
  const lastReset = this.usage.lastResetDate;

  // Reset daily counter
  if (lastReset && now.getDate() !== lastReset.getDate()) {
    this.usage.requestsToday = 0;
    this.usage.lastResetDate = now;
  }

  // Reset monthly counter
  const lastMonthlyReset = this.usage.lastMonthlyReset;
  if (lastMonthlyReset && now.getMonth() !== lastMonthlyReset.getMonth()) {
    this.usage.requestsThisMonth = 0;
    this.usage.lastMonthlyReset = now;
  }

  next();
});

// ==================== INSTANCE METHODS ====================

// Check if key is valid
apiKeySchema.methods.isValid = function() {
  if (this.status !== 'active') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

// Check rate limit (per day)
apiKeySchema.methods.canMakeRequest = function() {
  if (this.rateLimit.requestsPerDay === -1) return true; // Unlimited
  return this.usage.requestsToday < this.rateLimit.requestsPerDay;
};

// Check hourly rate limit
apiKeySchema.methods.canMakeHourlyRequest = function() {
  if (this.rateLimit.requestsPerHour === -1) return true; // Unlimited
  // This would need additional tracking - simplified for now
  return this.usage.requestsToday < this.rateLimit.requestsPerDay;
};

// Increment usage
apiKeySchema.methods.incrementUsage = async function() {
  this.usage.totalRequests += 1;
  this.usage.requestsToday += 1;
  this.usage.requestsThisMonth += 1;
  this.usage.lastUsedAt = new Date();
  return this.save();
};

// Increment transaction count
apiKeySchema.methods.incrementTransactions = async function() {
  this.usage.transactionsCount += 1;
  return this.save();
};

// Reset monthly counters (manual reset if needed)
apiKeySchema.methods.resetMonthlyCounters = function() {
  this.usage.requestsThisMonth = 0;
  this.usage.lastMonthlyReset = new Date();
  return this.save();
};

// Reset daily counters (manual reset if needed)
apiKeySchema.methods.resetDailyCounters = function() {
  this.usage.requestsToday = 0;
  this.usage.lastResetDate = new Date();
  return this.save();
};

// Rotate API key
apiKeySchema.methods.rotateKey = async function() {
  const prefix = this.environment === 'production' 
    ? 'sk_live_' 
    : this.environment === 'sandbox'
    ? 'sk_sandbox_'
    : 'sk_test_';
  
  this.apiKey = prefix + crypto.randomBytes(32).toString('hex');
  this.apiSecret = crypto.randomBytes(48).toString('hex');
  this.metadata.lastRotatedAt = new Date();
  
  return this.save();
};

// Revoke key
apiKeySchema.methods.revoke = async function() {
  this.status = 'revoked';
  return this.save();
};

// Suspend key
apiKeySchema.methods.suspend = async function() {
  this.status = 'suspended';
  return this.save();
};

// Activate key
apiKeySchema.methods.activate = async function() {
  this.status = 'active';
  return this.save();
};

// Check permission
apiKeySchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Verify IP whitelist
apiKeySchema.methods.isIPAllowed = function(ip) {
  if (!this.ipWhitelist || this.ipWhitelist.length === 0) return true;
  return this.ipWhitelist.includes(ip);
};

// ==================== STATIC METHODS ====================

// Find active keys for user
apiKeySchema.statics.findActiveByUser = function(userId) {
  return this.find({ 
    userId, 
    status: 'active',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Find by API key (with secret)
apiKeySchema.statics.findByApiKey = function(apiKey) {
  return this.findOne({ apiKey, status: 'active' }).select('+apiSecret +webhookSecret');
};

// ==================== VIRTUAL FIELDS ====================

// Get masked API key
apiKeySchema.virtual('maskedKey').get(function() {
  if (!this.apiKey) return '';
  const key = this.apiKey;
  const prefix = key.substring(0, 11); // sk_live_xx or sk_test_xx
  return `${prefix}...${key.slice(-4)}`;
});

// Get usage percentage
apiKeySchema.virtual('usagePercentage').get(function() {
  if (this.rateLimit.requestsPerDay === -1) return 0;
  return (this.usage.requestsToday / this.rateLimit.requestsPerDay) * 100;
});

// Check if near limit
apiKeySchema.virtual('nearLimit').get(function() {
  return this.usagePercentage > 80;
});

// ==================== TOJSON ====================
apiKeySchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.apiSecret;
    delete ret.webhookSecret;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('APIKey', apiKeySchema);
