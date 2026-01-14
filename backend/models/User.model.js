// backend/models/User.model.js - COMPLETE UPDATED VERSION WITH KYC INTEGRATION
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ==================== BASIC INFO ====================
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  country: {
    type: String,
    trim: true
  },

  // ==================== ACCOUNT SETTINGS ====================
  role: {
    type: String,
    enum: ['dual'],
    default: 'dual'
  },
  accountType: {
    type: String,
    enum: ['individual', 'business'],
    default: 'individual'
  },
  tier: {
    type: String,
    enum: ['free', 'starter', 'growth', 'enterprise', 'api'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },

  // ==================== VERIFICATION ====================
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  isKYCVerified: {
    type: Boolean,
    default: false
  },
  kycStatus: {
    status: {
      type: String,
      enum: ['unverified', 'pending', 'in_progress', 'under_review', 'approved', 'rejected', 'expired', 'pending_documents'],
      default: 'unverified'
    },
    submittedAt: Date,
    verifiedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    rejectionReason: String,
    diditSessionId: String,
    diditVerificationUrl: String,
    diditSessionExpiresAt: Date,
    verificationMethod: { 
      type: String, 
      enum: ['didit', 'manual'],
      default: 'didit' 
    },
    accountType: String,
    documents: [{
      type: { type: String },
      url: String,
      filepath: String,
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now }
    }],
    reviewDeadline: Date,
    verificationResult: Object,
    personalInfo: Object,
    businessInfo: Object
  },

  // ==================== BUSINESS INFORMATION ====================
  businessInfo: {
    companyName: String,
    companyType: {
      type: String,
      enum: ['sole_proprietor', 'partnership', 'llc', 'corporation', 'ngo', 'other']
    },
    taxId: String,
    registrationNumber: String,
    industry: {
      type: String,
      enum: [
        'ecommerce',
        'real_estate',
        'freelance',
        'saas',
        'professional_services',
        'government',
        'logistics',
        'finance',
        'healthcare',
        'education',
        'manufacturing',
        'retail',
        'technology',
        'fashion',
        'automotive',
        'services',
        'other'
      ]
    },
    businessAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    businessEmail: String,
    businessPhone: String,
    website: String,
    documents: [{
      type: {
        type: String,
        enum: ['registration_certificate', 'tax_id', 'utility_bill', 'bank_statement', 'other']
      },
      url: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    businessVerified: {
      type: Boolean,
      default: false
    },
    businessVerifiedAt: Date,
    businessStats: {
      totalTransactions: { type: Number, default: 0 },
      totalVolume: { type: Number, default: 0 }
    }
  },

  // ==================== CAPABILITIES ====================
  capabilities: {
    canBeBuyer: { type: Boolean, default: true },
    canBeSeller: { type: Boolean, default: true },
    canBeArbitrator: { type: Boolean, default: false },
    canBeAgent: { type: Boolean, default: false },
    canBeInspector: { type: Boolean, default: false },
    canBeShipper: { type: Boolean, default: false }
  },
  specializations: [{
    type: String,
    enum: [
      'real_estate', 'vehicles', 'digital_goods', 'freelance',
      'business_sales', 'intellectual_property', 'domains', 'crypto'
    ]
  }],

  // ==================== SUBSCRIPTION & API ====================
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

  // ==================== STATISTICS ====================
  stats: {
    totalTransactions: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    completedEscrows: { type: Number, default: 0 },
    cancelledEscrows: { type: Number, default: 0 },
    asBuyer: {
      totalTransactions: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      completedDeals: { type: Number, default: 0 }
    },
    asSeller: {
      totalTransactions: { type: Number, default: 0 },
      totalEarned: { type: Number, default: 0 },
      completedDeals: { type: Number, default: 0 }
    },
    asArbitrator: {
      casesHandled: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 }
    },
    bankAccountsCount: { type: Number, default: 0 },
    verifiedBankAccountsCount: { type: Number, default: 0 },
    totalPayoutsReceived: { type: Number, default: 0 },
    totalPayoutAmount: { type: Number, default: 0 },
    lastPayoutAt: Date,
    totalLogins: { type: Number, default: 0 },
    accountAgeDays: { type: Number, default: 0 }
  },

  // ==================== CONTACT & PROFILE ====================
  phone: { type: String, trim: true },
  bio: { type: String, maxlength: 500 },
  address: {
    street: String,
    city: String,
    state: String,
    country: {
      type: String,
      trim: true,
      enum: [
        'United States', 'Nigeria', 'United Kingdom', 'Ghana', 
        'Kenya', 'South Africa', 'Germany', 'France', 'Canada',
        'Australia', 'India', 'Brazil', 'Mexico', 'Spain', 'Italy',
        'USA', 'UK' // Common abbreviations
      ]
    },
    zipCode: String,
    formatted: String
  },
  socialLinks: {
    twitter: String,
    linkedin: String,
    website: String
  },
  profilePicture: String,
  avatar: String,

  // ==================== SECURITY ====================
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
  deletedAt: Date,
  deletionReason: String,

  // ==================== BANKING ====================
  hasBankAccount: { type: Boolean, default: false },
  primaryBankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    sparse: true
  },

  // ==================== ESCROW ACCESS ====================
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

  // ==================== NOTIFICATIONS ====================
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

  // ==================== PREFERENCES ====================
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

  // ==================== RATINGS ====================
  ratings: {
    overall: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    asSeller: { type: Number, default: 0 },
    asAgent: { type: Number, default: 0 },
    asArbitrator: { type: Number, default: 0 }
  },

  // ==================== AUDIT LOG ====================
  auditLog: [{
    action: String,
    description: String,
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
    metadata: mongoose.Schema.Types.Mixed
  }],

  // ==================== TERMS ====================
  agreedToTerms: {
    type: Boolean,
    default: false
  },
  agreedToTermsAt: Date,
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  }
}, {
  timestamps: true
});

// ==================== PRE-SAVE MIDDLEWARE ====================
userSchema.pre('save', function (next) {
  // Sync KYC verification status
  this.isKYCVerified = this.kycStatus?.status === 'approved';
  
  // Sync country from address if not set
  if (!this.country && this.address?.country) {
    this.country = this.address.country;
  }
  
  // Sync country from business info if not set
  if (!this.country && this.businessInfo?.businessAddress?.country) {
    this.country = this.businessInfo.businessAddress.country;
  }
  
  // Monthly usage reset
  const now = new Date();
  const lastReset = this.monthlyUsage?.lastResetDate;

  if (lastReset && now.getMonth() !== lastReset.getMonth()) {
    this.monthlyUsage.transactionCount = 0;
    this.monthlyUsage.lastResetDate = now;
  }

  // Calculate account age
  if (this.createdAt) {
    const ageInDays = Math.floor((now - this.createdAt) / (1000 * 60 * 60 * 24));
    this.stats.accountAgeDays = ageInDays;
  }

  next();
});

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

// ==================== INSTANCE METHODS ====================
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.getTierLimits = function() {
  const tierLimits = {
    free: {
      name: 'Free',
      maxTransactionsPerMonth: 3,
      maxTransactionAmount: {
        USD: 500, EUR: 450, GBP: 400, NGN: 750000,
        KES: 65000, GHS: 6000, ZAR: 9000, INR: 42000
      },
      escrowFee: { USD: 0.05, NGN: 0.05 },
      disputeResolution: false,
      prioritySupport: false,
      apiAccess: false,
      multiPartyEscrow: false,
      milestonePayments: false
    },
    starter: {
      name: 'Starter',
      maxTransactionsPerMonth: 10,
      maxTransactionAmount: {
        USD: 2000, EUR: 1800, GBP: 1600, NGN: 3000000,
        KES: 260000, GHS: 24000, ZAR: 36000, INR: 168000
      },
      escrowFee: { USD: 0.035, NGN: 0.035 },
      disputeResolution: false,
      prioritySupport: false,
      apiAccess: false,
      multiPartyEscrow: false,
      milestonePayments: false
    },
    growth: {
      name: 'Growth',
      maxTransactionsPerMonth: 50,
      maxTransactionAmount: {
        USD: 10000, EUR: 9000, GBP: 8000, NGN: 15000000,
        KES: 1300000, GHS: 120000, ZAR: 180000, INR: 840000
      },
      escrowFee: { USD: 0.025, NGN: 0.025 },
      disputeResolution: true,
      prioritySupport: false,
      apiAccess: false,
      multiPartyEscrow: true,
      milestonePayments: true,
      monthlyCost: { USD: 29, NGN: 45000 }
    },
    enterprise: {
      name: 'Enterprise',
      maxTransactionsPerMonth: -1,
      maxTransactionAmount: {
        USD: 100000, EUR: 90000, GBP: 80000, NGN: 150000000,
        KES: 13000000, GHS: 1200000, ZAR: 1800000, INR: 8400000
      },
      escrowFee: { USD: 0.015, NGN: 0.015 },
      disputeResolution: true,
      prioritySupport: true,
      apiAccess: true,
      multiPartyEscrow: true,
      milestonePayments: true,
      customBranding: true,
      monthlyCost: { USD: 99, NGN: 150000 }
    },
    api: {
      name: 'API',
      maxTransactionsPerMonth: -1,
      maxTransactionAmount: { USD: -1, NGN: -1 },
      escrowFee: { USD: 0.01, NGN: 0.01 },
      disputeResolution: true,
      prioritySupport: true,
      apiAccess: true,
      multiPartyEscrow: true,
      milestonePayments: true,
      customBranding: true,
      monthlyCost: { USD: 299, NGN: 450000 },
      setupFee: { USD: 500, NGN: 750000 }
    }
  };

  return tierLimits[this.tier] || tierLimits.free;
};

userSchema.methods.canCreateTransaction = function(amount, currency = 'USD') {
  const tierLimits = this.getTierLimits();

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

  const maxAmount = tierLimits.maxTransactionAmount[currency];
  if (maxAmount && maxAmount !== -1 && amount > maxAmount) {
    return {
      allowed: false,
      reason: `Transaction amount exceeds ${currency} ${maxAmount.toLocaleString()} limit for ${tierLimits.name} tier`,
      limit: maxAmount,
      current: amount
    };
  }

  return { allowed: true };
};

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

userSchema.methods.canParticipateAs = function(role) {
  const roleMap = {
    'buyer': this.capabilities.canBeBuyer,
    'seller': this.capabilities.canBeSeller,
    'arbitrator': this.capabilities.canBeArbitrator,
    'agent': this.capabilities.canBeAgent,
    'inspector': this.capabilities.canBeInspector,
    'shipper': this.capabilities.canBeShipper
  };

  return roleMap[role] !== false;
};

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

// ==================== KYC SPECIFIC METHODS ====================
userSchema.methods.getVerificationMethod = function() {
  const accountType = this.accountType || 'individual';
  const country = this.country || this.address?.country || this.businessInfo?.businessAddress?.country;
  
  if (accountType === 'individual') {
    return 'didit'; // Always DiDIT for individuals
  }
  
  if (accountType === 'business') {
    // Countries where DiDIT business verification works
    const diditSupportedCountries = [
      'United States', 'USA', 'United Kingdom', 'UK', 'Canada', 'Australia',
      'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium',
      'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland',
      'Austria', 'Portugal', 'Luxembourg'
    ];
    
    if (country && diditSupportedCountries.includes(country)) {
      return 'didit';
    }
    
    return 'manual'; // Manual for unsupported countries
  }
  
  return 'manual'; // Default to manual
};

userSchema.methods.requiresManualKYC = function() {
  return this.getVerificationMethod() === 'manual' && 
         this.accountType === 'business' && 
         this.kycStatus?.status !== 'approved';
};

userSchema.methods.getKYCStatusDisplay = function() {
  const status = this.kycStatus?.status || 'unverified';
  const verificationMethod = this.kycStatus?.verificationMethod || this.getVerificationMethod();
  
  const statusMap = {
    'unverified': { label: 'Not Started', color: 'gray' },
    'pending': { 
      label: verificationMethod === 'didit' ? 'Pending - Complete with DiDIT' : 'Pending - Upload Documents', 
      color: 'yellow' 
    },
    'pending_documents': { label: 'Documents Required', color: 'blue' },
    'in_progress': { 
      label: verificationMethod === 'didit' ? 'In Progress - DiDIT' : 'In Progress - Manual Review', 
      color: 'blue' 
    },
    'under_review': { label: 'Under Review', color: 'blue' },
    'approved': { label: 'Verified', color: 'green' },
    'rejected': { label: 'Rejected', color: 'red' },
    'expired': { label: 'Expired', color: 'orange' }
  };
  
  return statusMap[status] || { label: 'Unknown', color: 'gray' };
};

userSchema.methods.getRequiredDocuments = function() {
  const country = this.country || this.address?.country || this.businessInfo?.businessAddress?.country || 'Global';
  
  const documentTemplates = {
    'Nigeria': {
      registration: 'CAC Certificate of Incorporation',
      tax: 'Tax Identification Number (TIN)',
      idType: 'NIN, Driver\'s License, or International Passport'
    },
    'Kenya': {
      registration: 'Certificate of Incorporation',
      tax: 'KRA PIN Certificate',
      idType: 'National ID or Passport'
    },
    'Ghana': {
      registration: 'Company Registration Certificate',
      tax: 'TIN Certificate',
      idType: 'Ghana Card or Passport'
    },
    'South Africa': {
      registration: 'CIPC Registration Certificate',
      tax: 'Tax Clearance Certificate',
      idType: 'ID Book or Passport'
    },
    'United States': {
      registration: 'Articles of Incorporation',
      tax: 'EIN Confirmation Letter',
      idType: 'Driver\'s License or Passport'
    },
    'USA': {
      registration: 'Articles of Incorporation',
      tax: 'EIN Confirmation Letter',
      idType: 'Driver\'s License or Passport'
    },
    'United Kingdom': {
      registration: 'Certificate of Incorporation',
      tax: 'UTR (Unique Taxpayer Reference)',
      idType: 'Passport or Driver\'s Licence'
    },
    'UK': {
      registration: 'Certificate of Incorporation',
      tax: 'UTR (Unique Taxpayer Reference)',
      idType: 'Passport or Driver\'s Licence'
    }
  };
  
  return documentTemplates[country] || {
    registration: 'Business Registration Certificate',
    tax: 'Tax Identification Document',
    idType: 'Government-issued ID or Passport'
  };
};

// ==================== BUSINESS ACCOUNT METHODS ====================
userSchema.methods.getDisplayName = function() {
  if (this.accountType === 'business' && this.businessInfo?.companyName) {
    return this.businessInfo.companyName;
  }
  return this.name;
};

userSchema.methods.getAccountTypeDisplay = function() {
  return this.accountType === 'business' ? 'Business Account' : 'Individual Account';
};

userSchema.methods.getAccountIcon = function() {
  return this.accountType === 'business' ? '🏢' : '👤';
};

userSchema.methods.getAccountColor = function() {
  return this.accountType === 'business' ? 'purple' : 'blue';
};

module.exports = mongoose.model('User', userSchema); // This line should already exist

module.exports = mongoose.model('User', userSchema);