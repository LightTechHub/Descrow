const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },

  googleId: {
    type: String,
    sparse: true,
    unique: true
  }

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },

  role: {
    type: String,
    enum: ['dual'],
    default: 'dual'
  },

  tier: {
    type: String,
    enum: ['free', 'starter', 'growth', 'enterprise', 'api'],
    default: 'free'
  },

  /** EMAIL VERIFICATION **/
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,

  /** KYC FLAG **/
  isKYCVerified: {
    type: Boolean,
    default: false
  },

  // ==================================================================
  // 🚀 KYC STATUS - CLEAN + OPTIMIZED
  // ==================================================================
  kycStatus: {
    status: {
      type: String,
      enum: ['unverified', 'pending', 'in_progress', 'approved', 'rejected', 'expired'],
      default: 'unverified'
    },
    submittedAt: Date,
    verifiedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: String,

    // DIDIT FIELDS
    diditSessionId: String,
    diditVerificationUrl: String,
    diditSessionExpiresAt: Date,

    // RESULTS (RAW OBJECTS) - OPTIONAL
    verificationResult: {
      type: Object,
      default: undefined
    },

    // PERSONAL & BUSINESS INFO (RAW OBJECTS) - OPTIONAL
    personalInfo: {
      type: Object,
      default: undefined
    },
    businessInfo: {
      type: Object,
      default: undefined
    }
  },
  // ==================================================================

  apiAccess: {
    enabled: { type: Boolean, default: false },
    apiKey: { type: String, unique: true, sparse: true },
    apiSecret: { type: String, select: false },
    createdAt: Date,
    lastUsedAt: Date,
    requestCount: { type: Number, default: 0 }
  },

  subscription: {
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    lastPaymentDate: Date,
    autoRenew: { type: Boolean, default: true },
    paymentMethod: String
  },

  monthlyUsage: {
    transactionCount: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },

  stats: {
    totalTransactions: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    completedEscrows: { type: Number, default: 0 },
    cancelledEscrows: { type: Number, default: 0 },
    bankAccountsCount: { type: Number, default: 0 },
    verifiedBankAccountsCount: { type: Number, default: 0 },
    totalPayoutsReceived: { type: Number, default: 0 },
    totalPayoutAmount: { type: Number, default: 0 },
    lastPayoutAt: Date,
    totalLogins: { type: Number, default: 0 },
    accountAgeDays: { type: Number, default: 0 }
  },

  totalTransactions: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },

  phone: { type: String, trim: true },
  bio: { type: String, maxlength: 500 },

  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },

  socialLinks: {
    twitter: String,
    linkedin: String,
    website: String
  },

  // Top-level business info
  businessInfo: {
    companyName: String,
    taxId: String,
    industry: String
  },

  profilePicture: String,
  avatar: String,

  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },

  lastLogin: Date,
  isActive: { type: Boolean, default: true },

  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },

  deletedAt: Date,
  deletionReason: String,

  hasBankAccount: { type: Boolean, default: false },

  primaryBankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    sparse: true
  },

  escrowAccess: {
    canCreateEscrow: { type: Boolean, default: true },
    canReceiveEscrow: { type: Boolean, default: true },
    maxActiveEscrows: { type: Number, default: 5 },
    restrictions: [{
      type: String,
      enum: ['amount_limit', 'currency_restriction', 'geographic_restriction']
    }],
    suspendedUntil: Date,
    suspensionReason: String
  },

  notificationSettings: {
    email: {
      escrowUpdates: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      disputes: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      kycUpdates: { type: Boolean, default: true },
      payoutNotifications: { type: Boolean, default: true }
    },
    push: {
      escrowUpdates: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      disputes: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      kycUpdates: { type: Boolean, default: true }
    }
  },

  preferences: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    defaultCurrency: { type: String, default: 'USD' },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },

  auditLog: [{
    action: String,
    description: String,
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
    metadata: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// ======================================================
// PRE-SAVE MIDDLEWARE
// ======================================================
userSchema.pre('save', function (next) {
  // Sync isKYCVerified
  this.isKYCVerified = this.kycStatus?.status === 'approved';

  // Reset monthly usage
  const now = new Date();
  const lastReset = this.monthlyUsage?.lastResetDate;

  if (lastReset && now.getMonth() !== lastReset.getMonth()) {
    this.monthlyUsage.transactionCount = 0;
    this.monthlyUsage.lastResetDate = now;
  }

  // Update account age
  if (this.createdAt) {
    const ageInDays = Math.floor((now - this.createdAt) / (1000 * 60 * 60 * 24));
    this.stats.accountAgeDays = ageInDays;
  }

  next();
});

// Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ======================================================
// ✅ GET TIER LIMITS METHOD
// ======================================================
userSchema.methods.getTierLimits = function() {
  const tierLimits = {
    free: {
      name: 'Free',
      maxTransactionsPerMonth: 3,
      maxTransactionAmount: { USD: 500, NGN: 750000 },
      escrowFee: { USD: 0.05, NGN: 0.05 }, // 5%
      disputeResolution: false,
      prioritySupport: false,
      apiAccess: false,
      customBranding: false
    },
    starter: {
      name: 'Starter',
      maxTransactionsPerMonth: 5,
      maxTransactionAmount: { USD: 1000, NGN: 1500000 },
      escrowFee: { USD: 0.035, NGN: 0.035 }, // 3.5%
      disputeResolution: false,
      prioritySupport: false,
      apiAccess: false,
      customBranding: false
    },
    growth: {
      name: 'Growth',
      maxTransactionsPerMonth: 50,
      maxTransactionAmount: { USD: 10000, NGN: 15000000 },
      escrowFee: { USD: 0.025, NGN: 0.025 }, // 2.5%
      disputeResolution: true,
      prioritySupport: false,
      apiAccess: false,
      customBranding: false,
      monthlyCost: { USD: 29, NGN: 45000 }
    },
    enterprise: {
      name: 'Enterprise',
      maxTransactionsPerMonth: -1, // Unlimited
      maxTransactionAmount: { USD: 100000, NGN: 150000000 },
      escrowFee: { USD: 0.015, NGN: 0.015 }, // 1.5%
      disputeResolution: true,
      prioritySupport: true,
      apiAccess: true,
      customBranding: true,
      monthlyCost: { USD: 99, NGN: 150000 }
    },
    api: {
      name: 'API',
      maxTransactionsPerMonth: -1, // Unlimited
      maxTransactionAmount: { USD: -1, NGN: -1 }, // Unlimited
      escrowFee: { USD: 0.01, NGN: 0.01 }, // 1%
      disputeResolution: true,
      prioritySupport: true,
      apiAccess: true,
      customBranding: true,
      monthlyCost: { USD: 299, NGN: 450000 },
      setupFee: { USD: 500, NGN: 750000 }
    }
  };

  return tierLimits[this.tier] || tierLimits.free;
};

// ======================================================
// ✅ CHECK IF USER CAN CREATE TRANSACTION (TIER LIMITS)
// ======================================================
userSchema.methods.canCreateTransaction = function(amount, currency = 'USD') {
  const tierLimits = this.getTierLimits();
  
  // Check monthly transaction limit
  if (tierLimits.maxTransactionsPerMonth !== -1) {
    if (this.monthlyUsage.transactionCount >= tierLimits.maxTransactionsPerMonth) {
      return {
        allowed: false,
        reason: `Monthly transaction limit reached (${tierLimits.maxTransactionsPerMonth} transactions)`,
        limit: tierLimits.maxTransactionsPerMonth,
        current: this.monthlyUsage.transactionCount
      };
    }
  }
  
  // Check transaction amount limit
  const maxAmount = tierLimits.maxTransactionAmount[currency];
  if (maxAmount !== -1 && amount > maxAmount) {
    return {
      allowed: false,
      reason: `Transaction amount exceeds ${currency} ${maxAmount.toLocaleString()} limit for ${tierLimits.name} tier`,
      limit: maxAmount,
      current: amount
    };
  }
  
  return { allowed: true };
};

// ======================================================
// ✅ CHECK IF USER CAN ACCESS ESCROW (VERIFICATION)
// ======================================================
userSchema.methods.canAccessEscrow = function () {
  if (!this.verified) {
    return { 
      allowed: false, 
      reason: 'Email verification required', 
      action: 'verify_email' 
    };
  }
  
  if (!this.isKYCVerified || this.kycStatus?.status !== 'approved') {
    return { 
      allowed: false, 
      reason: 'KYC verification required', 
      action: 'complete_kyc',
      currentKYCStatus: this.kycStatus?.status || 'unverified'
    };
  }
  
  if (this.status !== 'active') {
    return { 
      allowed: false, 
      reason: 'Account not active',
      accountStatus: this.status
    };
  }
  
  if (!this.escrowAccess?.canCreateEscrow) {
    return { 
      allowed: false, 
      reason: 'Escrow access restricted',
      restriction: this.escrowAccess?.suspensionReason
    };
  }
  
  return { allowed: true };
};

// ======================================================
// AUDIT LOG METHOD
// ======================================================
userSchema.methods.addAuditLog = function (action, description, ip, agent, metadata = {}) {
  this.auditLog.push({
    action,
    description,
    ipAddress: ip,
    userAgent: agent,
    metadata
  });

  if (this.auditLog.length > 100) {
    this.auditLog = this.auditLog.slice(-100);
  }

  return this.save();
};

module.exports = mongoose.model('User', userSchema);