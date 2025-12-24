// backend/models/Payment.model.js - PAYMENT TRACKING
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ['tier_upgrade', 'subscription_renewal', 'api_setup', 'transaction_fee'],
    required: true
  },

  tier: {
    type: String,
    enum: ['free', 'starter', 'growth', 'enterprise', 'api']
  },

  amount: {
    type: Number,
    required: true
  },

  currency: {
    type: String,
    default: 'USD'
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },

  paymentMethod: {
    type: String,
    enum: ['paystack', 'flutterwave', 'stripe', 'bank_transfer', 'manual'],
    required: true
  },

  // Payment gateway references
  reference: {
    type: String,
    unique: true,
    required: true
  },

  gatewayReference: String,
  authorizationUrl: String,

  // Breakdown
  breakdown: {
    setupFee: Number,
    monthlyCost: Number,
    subtotal: Number,
    gatewayFee: Number,
    total: Number
  },

  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },

  paidAt: Date,
  failedAt: Date,

  // Webhook data
  webhookData: mongoose.Schema.Types.Mixed,

  // Metadata
  metadata: {
    description: String,
    subscriptionId: mongoose.Schema.Types.ObjectId,
    ipAddress: String,
    userAgent: String
  }

}, {
  timestamps: true
});

// Generate unique reference
paymentSchema.statics.generateReference = function() {
  return `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

module.exports = mongoose.model('Payment', paymentSchema);
