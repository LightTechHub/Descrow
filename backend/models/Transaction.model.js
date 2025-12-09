// backend/models/Transaction.model.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  escrow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow'
  },
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  reference: {
    type: String,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'NGN', 'EUR', 'GBP', 'CAD', 'AUD', 'KES', 'GHS', 'ZAR', 'XOF', 'XAF']
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'wallet', 'mobile_money', 'crypto', 'paypal'],
    required: true
  },
  paymentProvider: {
    type: String,
    enum: ['paystack', 'flutterwave', 'stripe', 'nowpayments', 'manual']
  },
  paymentProviderRef: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['escrow_funding', 'escrow_release', 'escrow_refund', 'withdrawal', 'deposit', 'fee', 'refund'],
    required: true
  },
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  gatewayFee: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  description: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  paymentDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    bankCode: String,
    recipientCode: String,
    authorizationUrl: String,
    accessCode: String
  },
  completedAt: Date,
  refundedAt: Date,
  refundReason: String,
  relatedTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }
}, {
  timestamps: true
});

// Generate transaction ID before save
transactionSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const prefix = this.type === 'withdrawal' ? 'WTH' : 'TXN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.transactionId = `${prefix}${timestamp}${random}`;
  }
  
  // Calculate net amount
  if (this.type === 'withdrawal' || this.type === 'escrow_release') {
    this.netAmount = this.amount - this.platformFee - this.gatewayFee;
  } else {
    this.netAmount = this.amount;
  }
  
  next();
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

// Virtual for display amount
transactionSchema.virtual('displayAmount').get(function() {
  return this.currency === 'NGN' ? `₦${this.amount.toLocaleString()}` : `$${this.amount.toFixed(2)}`;
});

transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Transaction', transactionSchema);
