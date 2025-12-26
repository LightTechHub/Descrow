const mongoose = require('mongoose');

// ==================== ENUMS & CONSTANTS ====================
const ESCROW_TYPES = {
  CUSTOM: 'custom',
  PHYSICAL_GOODS: 'physical_goods',
  DIGITAL_GOODS: 'digital_goods',
  SERVICES: 'services',
  FREELANCE: 'freelance',
  REAL_ESTATE: 'real_estate',
  VEHICLE: 'vehicle',
  DOMAIN_TRANSFER: 'domain_transfer',
  BUSINESS_SALE: 'business_sale',
  MILESTONE_BASED: 'milestone_based',
  CRYPTOCURRENCY: 'cryptocurrency',
  INTELLECTUAL_PROPERTY: 'intellectual_property',
  SUBSCRIPTION: 'subscription',
  MULTI_PARTY: 'multi_party'
};

const PARTICIPANT_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  AGENT: 'agent',
  ARBITRATOR: 'arbitrator',
  INSPECTOR: 'inspector',
  SHIPPER: 'shipper',
  BENEFICIARY: 'beneficiary'
};

const ESCROW_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  FUNDED: 'funded',
  IN_PROGRESS: 'in_progress',
  DELIVERED: 'delivered',
  INSPECTION_PENDING: 'inspection_pending',
  INSPECTION_PASSED: 'inspection_passed',
  INSPECTION_FAILED: 'inspection_failed',
  MILESTONE_COMPLETED: 'milestone_completed',
  DISPUTED: 'disputed',
  COMPLETED: 'completed',
  PAID_OUT: 'paid_out',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

const SUPPORTED_CURRENCIES = {
  FIAT: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'INR', 'CNY', 'JPY', 'CAD', 'AUD'],
  CRYPTO: ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'MATIC']
};

// ==================== ESCROW SCHEMA ====================
const escrowSchema = new mongoose.Schema({
  // ==================== BASIC INFO ====================
  escrowId: {
    type: String,
    unique: true,
    default: () => `ESC${Date.now()}${Math.floor(Math.random() * 1000)}`
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: 2000
  },
  transactionType: {
    type: String,
    enum: Object.values(ESCROW_TYPES),
    default: 'custom'
  },
  category: {
    type: String,
    enum: ['goods', 'services', 'digital', 'real_estate', 'vehicle', 'other'],
    default: 'other'
  },

  // ==================== LEGACY BUYER/SELLER ====================
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerTier: String,
  sellerTier: String,

  // ==================== MULTI-PARTY PARTICIPANTS ====================
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: Object.values(PARTICIPANT_ROLES),
      required: true
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'removed'],
      default: 'invited'
    },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: Date,
    hasApproved: { type: Boolean, default: false },
    approvedAt: Date,
    compensation: { type: Number, default: 0 },
    compensationPercentage: { type: Number, default: 0 },
    compensationPaidAt: Date
  }],

  // ==================== AMOUNT & CURRENCY ====================
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Amount is required'],
    min: 0
  },
  currency: {
    type: String,
    required: true,
    enum: [...SUPPORTED_CURRENCIES.FIAT, ...SUPPORTED_CURRENCIES.CRYPTO],
    default: 'USD'
  },
  currencyType: {
    type: String,
    enum: ['fiat', 'crypto'],
    default: 'fiat'
  },

  // ==================== PAYMENT INFO ====================
  payment: {
    amount: mongoose.Schema.Types.Decimal128,
    buyerFee: mongoose.Schema.Types.Decimal128,
    sellerFee: mongoose.Schema.Types.Decimal128,
    agentFee: mongoose.Schema.Types.Decimal128,
    arbitratorFee: mongoose.Schema.Types.Decimal128,
    inspectorFee: mongoose.Schema.Types.Decimal128,
    platformFee: mongoose.Schema.Types.Decimal128,
    buyerPays: mongoose.Schema.Types.Decimal128,
    sellerReceives: mongoose.Schema.Types.Decimal128,
    buyerFeePercentage: Number,
    sellerFeePercentage: Number,
    remainingAmount: mongoose.Schema.Types.Decimal128,
    paidAt: Date,
    paymentMethod: String,
    paymentReference: String,
    paymentGateway: String,
    cryptoPayment: {
      walletAddress: String,
      transactionHash: String,
      confirmations: Number,
      confirmedAt: Date
    }
  },

  // ==================== MILESTONE PAYMENTS ====================
  milestones: [{
    id: String,
    title: String,
    description: String,
    amount: mongoose.Schema.Types.Decimal128,
    percentage: Number,
    deliverables: [String],
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'submitted', 'approved', 'rejected', 'paid'],
      default: 'pending'
    },
    startedAt: Date,
    submittedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    paidAt: Date,
    rejectionReason: String,
    attachments: [{
      filename: String,
      originalName: String,
      url: String,
      uploadedAt: Date,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
  }],
  currentMilestone: Number,
  completedMilestones: { type: Number, default: 0 },
  requiresMilestones: { type: Boolean, default: false },

  // ==================== STATUS & TIMELINE ====================
  status: {
    type: String,
    enum: Object.values(ESCROW_STATUS),
    default: 'pending'
  },
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: String,
    note: String
  }],

  // ==================== DELIVERY ====================
  delivery: {
    method: {
      type: String,
      enum: ['physical', 'digital', 'service', 'in_person', 'crypto'],
      default: 'physical'
    },
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'delivered', 'confirmed', 'rejected'],
      default: 'pending'
    },
    deliveredAt: Date,
    confirmedAt: Date,
    trackingNumber: String,
    courierService: String,
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    proofOfDelivery: [{
      type: String,
      url: String,
      uploadedAt: Date
    }],
    autoReleaseEnabled: { type: Boolean, default: false },
    autoReleaseDays: { type: Number, default: 7 },
    autoReleaseAt: Date
  },

  // ==================== INSPECTION ====================
  inspection: {
    required: { type: Boolean, default: false },
    inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledDate: Date,
    completedDate: Date,
    status: {
      type: String,
      enum: ['not_required', 'scheduled', 'in_progress', 'passed', 'failed'],
      default: 'not_required'
    },
    fee: { type: Number, default: 0 },
    report: {
      summary: String,
      details: String,
      photos: [String],
      passed: Boolean,
      issues: [String],
      recommendations: [String]
    }
  },

  // ==================== DISPUTE ====================
  dispute: {
    isDisputed: { type: Boolean, default: false },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    raisedByRole: String,
    raisedAt: Date,
    reason: String,
    description: String,
    evidence: [String],
    status: {
      type: String,
      enum: ['none', 'pending', 'under_review', 'resolved', 'closed'],
      default: 'none'
    },
    arbitrator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    resolution: String,
    resolutionType: {
      type: String,
      enum: ['refund_buyer', 'release_to_seller', 'partial_refund', 'split_payment']
    },
    refundAmount: mongoose.Schema.Types.Decimal128,
    releaseAmount: mongoose.Schema.Types.Decimal128,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    messages: [{
      from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      fromRole: String,
      message: String,
      timestamp: { type: Date, default: Date.now },
      attachments: [String]
    }]
  },

  // ==================== TERMS & CONDITIONS ====================
  terms: {
    customTerms: String,
    agreedByBuyer: { type: Boolean, default: false },
    agreedBySeller: { type: Boolean, default: false },
    buyerAgreedAt: Date,
    sellerAgreedAt: Date,
    inspectionPeriodDays: { type: Number, default: 3 },
    refundPolicy: String
  },

  // ==================== CHAT & COMMUNICATION ====================
  chat: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderRole: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    readBy: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      readAt: Date
    }],
    attachments: [String]
  }],
  chatUnlocked: { type: Boolean, default: false },

  // ==================== ATTACHMENTS ====================
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    mimetype: String,
    size: Number,
    category: {
      type: String,
      enum: ['contract', 'invoice', 'receipt', 'proof', 'other'],
      default: 'other'
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedByRole: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // ==================== METADATA ====================
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // ==================== RATINGS & REVIEWS ====================
  ratings: [{
    ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ratedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // ==================== VISIBILITY & ACCESS ====================
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'private'
  },
  tags: [String],
  
  // ==================== DATES ====================
  expiresAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: String,

  // ==================== COMPUTED FIELDS ====================
  isActiveDeal: { type: Boolean, default: true },
  isCompleted: { type: Boolean, default: false }

}, {
  timestamps: true
});

// ==================== VIRTUAL FIELDS ====================
escrowSchema.virtual('amountValue').get(function() {
  return this.amount ? parseFloat(this.amount.toString()) : 0;
});

escrowSchema.virtual('totalFees').get(function() {
  return this.calculateTotalFees();
});

// ==================== PRE-SAVE MIDDLEWARE ====================
escrowSchema.pre('save', function(next) {
  this.isActiveDeal = !['cancelled', 'completed', 'paid_out', 'refunded', 'expired'].includes(this.status);
  this.isCompleted = ['completed', 'paid_out'].includes(this.status);
  
  if (this.milestones && this.milestones.length > 0) {
    this.requiresMilestones = true;
    this.completedMilestones = this.milestones.filter(m => m.status === 'paid').length;
  }
  
  next();
});

// ==================== INSTANCE METHODS ====================

escrowSchema.methods.getUserRoles = function(userId) {
  return this.participants
    .filter(p => p.user.toString() === userId.toString())
    .map(p => p.role);
};

escrowSchema.methods.canUserAccess = function(userId) {
  if (this.buyer.toString() === userId.toString() || this.seller.toString() === userId.toString()) {
    return true;
  }
  return this.participants.some(p => p.user.toString() === userId.toString());
};

escrowSchema.methods.addAttachment = function(fileData, uploadedBy, uploadedByRole, category = 'other') {
  this.attachments.push({
    filename: fileData.filename,
    originalName: fileData.originalname,
    url: fileData.path || fileData.location,
    mimetype: fileData.mimetype,
    size: fileData.size,
    category,
    uploadedBy,
    uploadedByRole,
    uploadedAt: new Date()
  });
  return this.save();
};

escrowSchema.methods.removeAttachment = function(attachmentId) {
  this.attachments = this.attachments.filter(a => a._id.toString() !== attachmentId);
  return this.save();
};

escrowSchema.methods.updateStatus = function(newStatus, actorId, actorRole = '', note = '') {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    actor: actorId,
    actorRole,
    note,
    timestamp: new Date()
  });
  return this.save();
};

escrowSchema.methods.addMilestone = function(milestoneData) {
  const milestoneId = `MS${Date.now()}${Math.floor(Math.random() * 1000)}`;
  this.milestones.push({
    id: milestoneId,
    title: milestoneData.title,
    description: milestoneData.description,
    amount: milestoneData.amount,
    percentage: milestoneData.percentage,
    deliverables: milestoneData.deliverables || [],
    dueDate: milestoneData.dueDate,
    status: 'pending'
  });
  return this.save();
};

escrowSchema.methods.updateMilestone = function(milestoneId, status, data = {}) {
  const milestone = this.milestones.find(m => m.id === milestoneId);
  if (!milestone) throw new Error('Milestone not found');
  
  milestone.status = status;
  if (status === 'in_progress') milestone.startedAt = new Date();
  if (status === 'submitted') milestone.submittedAt = new Date();
  if (status === 'approved') milestone.approvedAt = new Date();
  if (status === 'paid') milestone.paidAt = new Date();
  if (status === 'rejected') milestone.rejectionReason = data.rejectionReason;
  
  return this.save();
};

escrowSchema.methods.getNextMilestone = function() {
  return this.milestones.find(m => m.status === 'pending' || m.status === 'in_progress');
};

escrowSchema.methods.getRemainingMilestoneAmount = function() {
  const paidAmount = this.milestones
    .filter(m => m.status === 'paid')
    .reduce((sum, m) => sum + parseFloat(m.amount.toString()), 0);
  return parseFloat(this.amount.toString()) - paidAmount;
};

escrowSchema.methods.addChatMessage = function(senderId, senderRole, message, attachments = []) {
  this.chat.push({
    sender: senderId,
    senderRole,
    message,
    timestamp: new Date(),
    read: false,
    attachments
  });
  return this.save();
};

escrowSchema.methods.markMessagesAsRead = function(userId) {
  this.chat.forEach(msg => {
    if (msg.sender.toString() !== userId.toString()) {
      msg.read = true;
      if (!msg.readBy) msg.readBy = [];
      const alreadyRead = msg.readBy.some(r => r.user.toString() === userId.toString());
      if (!alreadyRead) {
        msg.readBy.push({ user: userId, readAt: new Date() });
      }
    }
  });
  return this.save();
};

escrowSchema.methods.getUnreadCount = function(userId) {
  return this.chat.filter(msg => 
    msg.sender.toString() !== userId.toString() && !msg.read
  ).length;
};

escrowSchema.methods.raiseDispute = function(userId, userRole, reason, description, evidence = []) {
  if (this.dispute.isDisputed) throw new Error('Dispute already raised');
  
  this.status = 'disputed';
  this.dispute = {
    isDisputed: true,
    raisedBy: userId,
    raisedByRole: userRole,
    raisedAt: new Date(),
    reason,
    description,
    evidence,
    status: 'pending'
  };
  return this.save();
};

escrowSchema.methods.assignArbitrator = function(arbitratorId) {
  if (!this.dispute.isDisputed) throw new Error('No active dispute');
  
  this.dispute.arbitrator = arbitratorId;
  this.dispute.assignedAt = new Date();
  this.dispute.status = 'under_review';
  return this.save();
};

escrowSchema.methods.resolveDispute = function(resolvedBy, resolution, resolutionType, amounts = {}) {
  if (!this.dispute.isDisputed) throw new Error('No active dispute');
  
  this.dispute.status = 'resolved';
  this.dispute.resolution = resolution;
  this.dispute.resolutionType = resolutionType;
  this.dispute.resolvedBy = resolvedBy;
  this.dispute.resolvedAt = new Date();
  
  if (amounts.refundAmount) this.dispute.refundAmount = amounts.refundAmount;
  if (amounts.releaseAmount) this.dispute.releaseAmount = amounts.releaseAmount;
  
  if (resolutionType === 'refund_buyer') this.status = 'refunded';
  else if (resolutionType === 'release_to_seller') this.status = 'completed';
  else if (resolutionType === 'partial_refund' || resolutionType === 'split_payment') this.status = 'completed';
  
  return this.save();
};

escrowSchema.methods.scheduleInspection = function(inspectorId, scheduledDate, fee = 0) {
  this.inspection.required = true;
  this.inspection.inspector = inspectorId;
  this.inspection.scheduledDate = scheduledDate;
  this.inspection.fee = fee;
  this.inspection.status = 'in_progress';
  return this.save();
};

escrowSchema.methods.completeInspection = function(report) {
  if (!this.inspection.required) throw new Error('Inspection not required');
  
  this.inspection.status = report.passed ? 'passed' : 'failed';
  this.inspection.completedDate = new Date();
  this.inspection.report = report;
  this.status = report.passed ? 'inspection_passed' : 'inspection_failed';
  return this.save();
};

escrowSchema.methods.calculateTotalFees = function() {
  const payment = this.payment || {};
  const buyerFee = payment.buyerFee ? parseFloat(payment.buyerFee.toString()) : 0;
  const sellerFee = payment.sellerFee ? parseFloat(payment.sellerFee.toString()) : 0;
  const agentFee = payment.agentFee ? parseFloat(payment.agentFee.toString()) : 0;
  const arbitratorFee = payment.arbitratorFee ? parseFloat(payment.arbitratorFee.toString()) : 0;
  const inspectorFee = payment.inspectorFee ? parseFloat(payment.inspectorFee.toString()) : 0;
  return buyerFee + sellerFee + agentFee + arbitratorFee + inspectorFee;
};

escrowSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

escrowSchema.methods.shouldAutoRelease = function() {
  if (!this.delivery.autoReleaseEnabled) return false;
  if (!this.delivery.autoReleaseAt) return false;
  if (this.status !== 'delivered') return false;
  return new Date() >= this.delivery.autoReleaseAt;
};

escrowSchema.methods.requiresUserAction = function(userId) {
  const userRoles = this.getUserRoles(userId);
  const isBuyer = this.buyer.toString() === userId.toString();
  const isSeller = this.seller.toString() === userId.toString();
  
  if (isBuyer || userRoles.includes('buyer')) {
    if (this.status === 'accepted' && !this.payment.paidAt) return 'fund_escrow';
    if (this.status === 'delivered') return 'confirm_delivery';
    if (this.status === 'milestone_completed') return 'approve_milestone';
  }
  
  if (isSeller || userRoles.includes('seller')) {
    if (this.status === 'pending') return 'accept_escrow';
    if (this.status === 'funded') return 'deliver_item';
    if (this.status === 'in_progress' && this.requiresMilestones) return 'submit_milestone';
  }
  
  if (userRoles.includes('inspector')) {
    if (this.status === 'awaiting_inspection' && this.inspection.status === 'in_progress') {
      return 'complete_inspection';
    }
  }
  
  if (userRoles.includes('arbitrator')) {
    if (this.dispute.isDisputed && this.dispute.status === 'under_review') {
      return 'resolve_dispute';
    }
  }
  
  return null;
};

escrowSchema.methods.addParticipant = function(userId, role, compensation = 0, compensationPercentage = 0) {
  const exists = this.participants.some(p => p.user.toString() === userId.toString() && p.role === role);
  if (exists) throw new Error('Participant already exists with this role');
  
  this.participants.push({
    user: userId,
    role,
    status: 'invited',
    invitedAt: new Date(),
    compensation,
    compensationPercentage
  });
  return this.save();
};

// ==================== STATIC METHODS ====================

escrowSchema.statics.findByParticipant = function(userId, role = null) {
  const query = { 'participants.user': userId };
  if (role) query['participants.role'] = role;
  return this.find(query);
};

escrowSchema.statics.findActiveForUser = function(userId) {
  return this.find({
    $or: [
      { buyer: userId },
      { seller: userId },
      { 'participants.user': userId }
    ],
    status: { $nin: ['cancelled', 'completed', 'paid_out', 'refunded', 'expired'] }
  });
};

escrowSchema.statics.findRequiringAction = function(userId) {
  return this.find({
    $or: [
      { buyer: userId, status: 'accepted', 'payment.paidAt': null },
      { buyer: userId, status: 'delivered' },
      { seller: userId, status: 'pending' },
      { seller: userId, status: 'funded' },
      { 'participants.user': userId, 'participants.role': 'inspector', status: 'awaiting_inspection' },
      { 'participants.user': userId, 'participants.role': 'arbitrator', 'dispute.status': 'under_review' }
    ]
  });
};

escrowSchema.statics.getUserStats = async function(userId) {
  const escrows = await this.find({
    $or: [
      { buyer: userId },
      { seller: userId },
      { 'participants.user': userId }
    ]
  });
  
  return {
    total: escrows.length,
    asBuyer: escrows.filter(e => e.buyer.toString() === userId.toString()).length,
    asSeller: escrows.filter(e => e.seller.toString() === userId.toString()).length,
    active: escrows.filter(e => e.isActiveDeal).length,
    completed: escrows.filter(e => e.isCompleted).length,
    disputed: escrows.filter(e => e.status === 'disputed').length,
    totalValue: escrows.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0)
  };
};

// ==================== EXPORT ENUMS ====================
escrowSchema.statics.ESCROW_TYPES = ESCROW_TYPES;
escrowSchema.statics.PARTICIPANT_ROLES = PARTICIPANT_ROLES;
escrowSchema.statics.ESCROW_STATUS = ESCROW_STATUS;
escrowSchema.statics.SUPPORTED_CURRENCIES = SUPPORTED_CURRENCIES;

module.exports = mongoose.model('Escrow', escrowSchema);