// backend/models/Subscription.model.js - SUBSCRIPTION MODEL
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  tier: {
    type: String,
    enum: ['free', 'starter', 'growth', 'enterprise', 'api'],
    required: true
  },

  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'paused'],
    default: 'active'
  },

  // Pricing details
  currency: {
    type: String,
    default: 'USD'
  },

  monthlyCost: {
    type: Number,
    required: true
  },

  setupFee: {
    type: Number,
    default: 0
  },

  // Dates
  startDate: {
    type: Date,
    default: Date.now
  },

  currentPeriodStart: {
    type: Date,
    default: Date.now
  },

  currentPeriodEnd: {
    type: Date,
    required: true
  },

  nextBillingDate: Date,

  cancelledAt: Date,
  cancelReason: String,

  // Payment info
  paymentMethod: {
    type: String,
    enum: ['paystack', 'flutterwave', 'stripe', 'manual'],
    default: 'paystack'
  },

  paymentReference: String,

  lastPayment: {
    amount: Number,
    currency: String,
    reference: String,
    paidAt: Date,
    method: String
  },

  // Auto-renewal
  autoRenew: {
    type: Boolean,
    default: true
  },

  // Usage tracking
  usage: {
    transactionsThisMonth: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },

  // Metadata
  metadata: {
    upgradeReason: String,
    previousTier: String,
    notes: String
  }

}, {
  timestamps: true
});

// Auto-expire check
subscriptionSchema.methods.isExpired = function() {
  return this.currentPeriodEnd < new Date();
};

// Check if renewal is due
subscriptionSchema.methods.isRenewalDue = function() {
  if (!this.autoRenew) return false;
  const daysUntilExpiry = Math.ceil((this.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 7; // Renew 7 days before expiry
};

// Reset monthly usage
subscriptionSchema.methods.resetMonthlyUsage = function() {
  const now = new Date();
  const lastReset = this.usage.lastResetDate;

  if (lastReset && now.getMonth() !== lastReset.getMonth()) {
    this.usage.transactionsThisMonth = 0;
    this.usage.lastResetDate = now;
    return this.save();
  }
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
