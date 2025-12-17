const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema({
  // Unique Escrow ID
  escrowId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic Info
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'CAD', 'AUD', 'XOF', 'XAF']
  },

  // File Attachments
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Participants
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ✅ Tier tracking (UPDATED: added "free")
  buyerTier: {
    type: String,
    enum: ['free', 'starter', 'growth', 'enterprise', 'api'],
    default: 'starter'
  },

  sellerTier: {
    type: String,
    enum: ['free', 'starter', 'growth', 'enterprise', 'api'],
    default: 'starter'
  },

  // Status Flow
  status: {
    type: String,
    enum: [
      'pending',
      'accepted',
      'funded',
      'delivered',
      'completed',
      'paid_out',
      'cancelled',
      'disputed'
    ],
    default: 'pending',
    index: true
  },

  // Timeline tracking
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String
  }],

  // Payment details
  payment: {
    method: {
      type: String,
      enum: ['paystack', 'flutterwave', 'crypto']
    },
    reference: String,
    transactionId: String,
    paymentId: String,

    amount: mongoose.Schema.Types.Decimal128,
    buyerFee: mongoose.Schema.Types.Decimal128,
    sellerFee: mongoose.Schema.Types.Decimal128,
    platformFee: mongoose.Schema.Types.Decimal128,
    buyerPays: mongoose.Schema.Types.Decimal128,
    sellerReceives: mongoose.Schema.Types.Decimal128,

    buyerFeePercentage: Number,
    sellerFeePercentage: Number,

    paidAt: Date,
    verifiedAt: Date,
    paidOutAt: Date,

    gatewayResponse: mongoose.Schema.Types.Mixed
  },

  // Chat system
  chat: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],

  // Delivery
  delivery: {
    method: {
      type: String,
      enum: ['physical', 'digital', 'service'],
      default: 'physical'
    },

    proof: {
      method: {
        type: String,
        enum: ['courier', 'personal', 'other']
      },
      courierName: String,
      trackingNumber: String,

      vehicleType: String,
      plateNumber: String,
      driverName: String,
      driverPhoto: String,
      vehiclePhoto: String,
      gpsEnabled: Boolean,
      gpsTrackingId: String,

      methodDescription: String,
      estimatedDelivery: Date,
      packagePhotos: [String],
      additionalNotes: String,
      submittedAt: Date,
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },

    trackingNumber: String,
    deliveredAt: Date,
    confirmedAt: Date,
    autoReleaseAt: Date,

    evidence: [{
      type: { type: String },
      url: String,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date, default: Date.now }
    }],

    notes: String
  },

  // Dispute management
  dispute: {
    isDisputed: { type: Boolean, default: false },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    raisedAt: Date,
    reason: String,
    evidence: [String],
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved'],
      default: 'pending'
    },
    resolution: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  },

  // Payout
  payout: {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount'
    },
    accountNumber: String,
    bankName: String,
    amount: mongoose.Schema.Types.Decimal128,
    transferCode: String,
    paidOut: {
      type: Boolean,
      default: false
    },
    paidOutAt: Date
  },

  // Category
  category: {
    type: String,
    enum: [
      'electronics', 'services', 'digital_goods',
      'fashion', 'automotive', 'real_estate', 'other'
    ],
    default: 'other'
  },

  // Ratings
  rating: {
    buyerRating: {
      score: { type: Number, min: 1, max: 5 },
      comment: String,
      createdAt: Date
    },
    sellerRating: {
      score: { type: Number, min: 1, max: 5 },
      comment: String,
      createdAt: Date
    }
  },

  chatUnlocked: {
    type: Boolean,
    default: false
  },

  visibility: {
    type: String,
    enum: ['private', 'public'],
    default: 'private'
  }

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      if (ret.amount) ret.amount = parseFloat(ret.amount.toString());

      if (ret.payment) {
        ['amount', 'buyerFee', 'sellerFee', 'platformFee', 'buyerPays', 'sellerReceives']
          .forEach(field => {
            if (ret.payment[field]) {
              ret.payment[field] = parseFloat(ret.payment[field].toString());
            }
          });
      }

      if (ret.payout?.amount) {
        ret.payout.amount = parseFloat(ret.payout.amount.toString());
      }

      if (ret.attachments) {
        ret.attachments = ret.attachments.map(a => ({
          ...a,
          sizeReadable: formatFileSize(a.size)
        }));
      }

      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Helper
function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Indexes
escrowSchema.index({ buyer: 1, status: 1 });
escrowSchema.index({ seller: 1, status: 1 });
escrowSchema.index({ createdAt: -1 });
escrowSchema.index({ 'payment.reference': 1 }, { sparse: true });
escrowSchema.index({ visibility: 1, status: 1 });

// Hooks
escrowSchema.pre('save', function (next) {
  if (!this.escrowId) {
    this.escrowId = `ESC${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
  next();
});

escrowSchema.pre('validate', function (next) {
  if (this.buyer && this.seller && this.buyer.equals(this.seller)) {
    return next(new Error('Buyer and Seller cannot be the same user'));
  }
  next();
});

escrowSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({ status: this.status, timestamp: new Date() });
  }
  next();
});

// Virtuals
escrowSchema.virtual('isCompleted').get(function () {
  return ['completed', 'paid_out'].includes(this.status);
});

escrowSchema.virtual('isActiveDeal').get(function () {
  return !['cancelled', 'disputed', 'paid_out', 'completed'].includes(this.status);
});

escrowSchema.virtual('canBeFunded').get(function () {
  return ['pending', 'accepted'].includes(this.status);
});

escrowSchema.virtual('canBeDelivered').get(function () {
  return this.status === 'funded';
});

escrowSchema.virtual('attachmentsCount').get(function () {
  return this.attachments?.length || 0;
});

// Methods
escrowSchema.methods.addAttachment = function (fileData, uploadedBy) {
  this.attachments.push({
    filename: fileData.filename,
    originalName: fileData.originalname,
    url: fileData.path || fileData.location,
    mimetype: fileData.mimetype,
    size: fileData.size,
    uploadedBy,
    uploadedAt: new Date()
  });
  return this.save();
};

escrowSchema.methods.removeAttachment = function (attachmentId) {
  this.attachments = this.attachments.filter(a => a._id.toString() !== attachmentId);
  return this.save();
};

escrowSchema.methods.canUserAccess = function (userId) {
  return this.buyer.toString() === userId.toString() ||
         this.seller.toString() === userId.toString();
};

escrowSchema.methods.updateStatus = function (newStatus, actorId, note = '') {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    actor: actorId,
    note,
    timestamp: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('Escrow', escrowSchema);