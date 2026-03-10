// backend/models/Wallet.model.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit', 'debit', 'withdrawal', 'refund', 'fee'],
    required: true
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  description: { type: String },
  escrowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow' },
  escrowRef: { type: String }, // human-readable escrow ID
  withdrawalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Withdrawal' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  balanceBefore: { type: Number },
  balanceAfter: { type: Number },
  reference: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: { type: Number, default: 0 },          // available to withdraw
  pendingBalance: { type: Number, default: 0 },    // held (not yet available)
  totalEarned: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' },
  transactions: [transactionSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Credit wallet (escrow completion)
walletSchema.methods.credit = async function(amount, description, escrowId, escrowRef, reference) {
  const before = this.balance;
  this.balance += amount;
  this.totalEarned += amount;
  this.transactions.push({
    type: 'credit',
    amount,
    currency: this.currency,
    description,
    escrowId,
    escrowRef,
    status: 'completed',
    balanceBefore: before,
    balanceAfter: this.balance,
    reference
  });
  return this.save();
};

// Debit wallet (withdrawal)
walletSchema.methods.debit = async function(amount, description, withdrawalId, reference) {
  if (this.balance < amount) throw new Error('Insufficient wallet balance');
  const before = this.balance;
  this.balance -= amount;
  this.totalWithdrawn += amount;
  this.transactions.push({
    type: 'withdrawal',
    amount,
    currency: this.currency,
    description,
    withdrawalId,
    status: 'completed',
    balanceBefore: before,
    balanceAfter: this.balance,
    reference
  });
  return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);
