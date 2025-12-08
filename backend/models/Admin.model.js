// backend/models/Admin.model.js - COMPLETE FIXED VERSION

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['master', 'sub_admin'],
    default: 'sub_admin'
  },
  permissions: {
    viewTransactions: {
      type: Boolean,
      default: false
    },
    manageDisputes: {
      type: Boolean,
      default: false
    },
    verifyUsers: {
      type: Boolean,
      default: false
    },
    viewAnalytics: {
      type: Boolean,
      default: false
    },
    managePayments: {
      type: Boolean,
      default: false
    },
    manageAPI: {
      type: Boolean,
      default: false
    },
    manageAdmins: {
      type: Boolean,
      default: false
    },
    manageFees: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  lastActive: {
    type: Date
  },
  actionsCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// ✅ FIXED: Hash password before saving
adminSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    console.log('🔐 Hashing admin password...');
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
    next();
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    next(error);
  }
});

// ✅ FIXED: Compare passwords correctly
adminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('🔍 Comparing passwords...');
    console.log('📝 Candidate password length:', candidatePassword.length);
    console.log('📝 Stored hash exists:', !!this.password);
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔐 Password match result:', isMatch);
    
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

module.exports = mongoose.model('Admin', adminSchema);