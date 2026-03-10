// backend/models/Withdrawal.model.js
const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  bankDetails: {
    bankName: { type: String, required: true },
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankCode: { type: String }         // Paystack bank code
  },
  reference: { type: String, unique: true },
  paystackTransferCode: { type: String },
  paystackRecipientCode: { type: String },
  failureReason: { type: String },
  processedAt: { type: Date },
  completedAt: { type: Date },
  adminNote: { type: String },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
