// backend/models/Dispute.model.js
const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  disputeId: {
    type: String,
    unique: true,
    required: true
  },
  escrow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['non_delivery', 'item_not_as_described', 'unauthorized_transaction', 'seller_not_responding', 'buyer_not_responding', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'closed', 'dismissed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  evidence: [{
    url: String,
    type: String,
    name: String,
    description: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  assignedAt: Date,
  resolution: {
    type: String,
    enum: ['refund_buyer', 'release_to_seller', 'partial_refund', 'split', 'other']
  },
  winner: {
    type: String,
    enum: ['reportedBy', 'reportedUser', 'split', 'refund']
  },
  refundPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  resolvedAt: Date,
  resolutionNotes: String,
  resolutionHistory: [{
    action: String,
    by: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'resolutionHistory.byModel'
    },
    byModel: {
      type: String,
      enum: ['User', 'Admin']
    },
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  communication: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    message: String,
    attachments: [String],
    isInternal: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Generate dispute ID before save
disputeSchema.pre('save', async function(next) {
  if (!this.disputeId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.disputeId = `DSP${timestamp}${random}`;
  }
  next();
});

// Indexes
disputeSchema.index({ disputeId: 1 });
disputeSchema.index({ escrow: 1 });
disputeSchema.index({ reportedBy: 1 });
disputeSchema.index({ reportedUser: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ assignedTo: 1 });
disputeSchema.index({ createdAt: -1 });

// Methods
disputeSchema.methods.addEvidence = function(evidenceData, userId) {
  this.evidence.push({
    ...evidenceData,
    uploadedBy: userId,
    uploadedAt: new Date()
  });
  
  this.resolutionHistory.push({
    action: 'evidence_added',
    by: userId,
    byModel: 'User',
    notes: `Evidence added: ${evidenceData.name || evidenceData.type}`,
    timestamp: new Date()
  });
};

disputeSchema.methods.assignToAdmin = function(adminId) {
  this.assignedTo = adminId;
  this.assignedAt = new Date();
  this.status = 'under_review';
  
  this.resolutionHistory.push({
    action: 'assigned',
    by: adminId,
    byModel: 'Admin',
    notes: 'Dispute assigned to admin for review',
    timestamp: new Date()
  });
};

disputeSchema.methods.resolve = function(resolutionData, adminId) {
  this.status = 'resolved';
  this.resolution = resolutionData.resolution;
  this.winner = resolutionData.winner;
  this.refundPercentage = resolutionData.refundPercentage || 100;
  this.resolvedBy = adminId;
  this.resolvedAt = new Date();
  this.resolutionNotes = resolutionData.notes;
  
  this.resolutionHistory.push({
    action: 'resolved',
    by: adminId,
    byModel: 'Admin',
    notes: `Dispute resolved: ${resolutionData.resolution}`,
    timestamp: new Date()
  });
};

module.exports = mongoose.model('Dispute', disputeSchema);