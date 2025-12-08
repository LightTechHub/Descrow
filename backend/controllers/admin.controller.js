// src/controllers/admin.controller.js - COMPLETE FIXED VERSION
const Admin = require('../models/Admin.model');
const User = require('../models/User.model');
const Escrow = require('../models/Escrow.model');
const Dispute = require('../models/Dispute.model');
const FeeSettings = require('../models/FeeSettings.model');
const feeConfig = require('../config/fee.config');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

/* =========================================================
   JWT GENERATOR
========================================================= */
const generateToken = (adminId) => {
  return jwt.sign(
    { id: adminId, type: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/* =========================================================
   ADMIN LOGIN
========================================================= */
const login = async (req, res) => {
  try {
    console.log('🔐 Admin login attempt:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // ✅ FIX: Explicitly select password field
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin not found:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ Admin found:', {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      hasPassword: !!admin.password,
      passwordLength: admin.password?.length
    });

    // Check if admin is active
    if (admin.status !== 'active') {
      console.log('❌ Admin suspended:', email);
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Contact master admin.'
      });
    }

    // ✅ FIX: Verify password exists before comparing
    if (!admin.password) {
      console.log('❌ No password set for admin:', email);
      return res.status(500).json({
        success: false,
        message: 'Account configuration error. Please contact support.'
      });
    }

    // Verify password
    console.log('🔍 Verifying password...');
    console.log('Input password length:', password.length);
    console.log('Stored hash length:', admin.password.length);
    console.log('Stored hash starts with $2a$ or $2b$:', admin.password.startsWith('$2'));
    
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ Password verified successfully');

    // Update last active
    admin.lastActive = new Date();
    await admin.save();

    // Generate token
    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });
    
  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed', 
      error: error.message 
    });
  }
};

/* =========================================================
   DASHBOARD STATS
========================================================= */
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      totalUsers: await User.countDocuments(),
      totalEscrows: await Escrow.countDocuments(),
      activeEscrows: await Escrow.countDocuments({ status: { $in: ['in_escrow', 'awaiting_delivery'] } }),
      completedEscrows: await Escrow.countDocuments({ status: 'completed' }),
      pendingDisputes: await Dispute.countDocuments({ status: 'open' }),
      todayEscrows: await Escrow.countDocuments({ createdAt: { $gte: today } }),
      todayUsers: await User.countDocuments({ createdAt: { $gte: today } })
    };

    const revenueData = await Escrow.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$adminFee' } } }
    ]);

    stats.totalRevenue = revenueData[0]?.totalRevenue || 0;

    const recentEscrows = await Escrow.find()
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentDisputes = await Dispute.find()
      .populate('escrow')
      .populate('initiatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({ success: true, stats, recentEscrows, recentDisputes });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats', error: error.message });
  }
};

/* =========================================================
   GET TRANSACTIONS
========================================================= */
const getTransactions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) query.$or = [
      { escrowId: { $regex: search, $options: 'i' } },
      { itemName: { $regex: search, $options: 'i' } }
    ];

    const escrows = await Escrow.find(query)
      .populate('buyer', 'name email verified')
      .populate('seller', 'name email verified')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Escrow.countDocuments(query);

    res.status(200).json({
      success: true,
      escrows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCount: count
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
  }
};

/* =========================================================
   GET DISPUTES
========================================================= */
const getDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const disputes = await Dispute.find(query)
      .populate('escrow')
      .populate('initiatedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const count = await Dispute.countDocuments(query);

    res.status(200).json({
      success: true,
      disputes,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCount: count
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch disputes', error: error.message });
  }
};

/* =========================================================
   RESOLVE DISPUTE
========================================================= */
const resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { resolution, winner, refundAmount, notes } = req.body;

    const dispute = await Dispute.findById(disputeId).populate('escrow');
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.winner = winner;
    dispute.refundAmount = refundAmount;
    dispute.resolvedBy = req.admin._id;
    dispute.resolvedAt = new Date();
    dispute.adminNotes = notes;
    await dispute.save();

    const escrow = await Escrow.findById(dispute.escrow._id);
    if (winner === 'buyer') {
      escrow.status = 'cancelled';
    } else if (winner === 'seller') {
      escrow.status = 'completed';

      const seller = await User.findById(escrow.seller);
      seller.totalEarned += escrow.netAmount;
      await seller.save();
    }
    await escrow.save();

    const admin = await Admin.findById(req.admin._id);
    admin.actionsCount += 1;
    await admin.save();

    res.status(200).json({ success: true, message: 'Dispute resolved successfully', dispute });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve dispute', error: error.message });
  }
};

/* =========================================================
   GET ALL USERS
========================================================= */
const getUsers = async (req, res) => {
  try {
    const { verified, kycStatus, tier, page = 1, limit = 20, search, status } = req.query;

    const query = {};
    if (verified !== undefined) query.verified = verified === 'true';
    if (kycStatus) query.kycStatus = kycStatus;
    if (tier && tier !== 'all') query.tier = tier;
    if (status && status !== 'all') query.status = status;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -twoFactorSecret')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};

/* =========================================================
   CHANGE USER TIER
========================================================= */
const changeUserTier = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newTier, reason } = req.body;

    const validTiers = ['starter', 'growth', 'enterprise', 'api'];
    if (!validTiers.includes(newTier)) {
      return res.status(400).json({ success: false, message: 'Invalid tier' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const oldTier = user.tier;
    user.tier = newTier;

    if (newTier !== 'starter' && oldTier === 'starter') {
      user.subscription = {
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastPaymentDate: new Date(),
        autoRenew: false
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `User tier changed from ${oldTier} to ${newTier}`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          tier: user.tier,
          subscription: user.subscription
        }
      }
    });

  } catch (error) {
    console.error('Change user tier error:', error);
    res.status(500).json({ success: false, message: 'Failed to change user tier', error: error.message });
  }
};

/* =========================================================
   TOGGLE USER STATUS
========================================================= */
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (action === 'suspend') {
      user.status = 'suspended';
      user.isActive = false;
    } else if (action === 'activate') {
      user.status = 'active';
      user.isActive = true;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${action}d successfully`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to change user status', error: error.message });
  }
};

/* =========================================================
   REVIEW KYC
========================================================= */
const reviewKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.kycStatus !== 'pending') {
      return res.status(400).json({ success: false, message: `KYC is already ${user.kycStatus}` });
    }

    if (action === 'approve') {
      user.kycStatus = 'approved';
      user.isKYCVerified = true;
    } else if (action === 'reject') {
      user.kycStatus = 'rejected';
      user.isKYCVerified = false;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `KYC ${action}d successfully`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          kycStatus: user.kycStatus,
          isKYCVerified: user.isKYCVerified
        }
      }
    });

  } catch (error) {
    console.error('Review KYC error:', error);
    res.status(500).json({ success: false, message: 'Failed to review KYC', error: error.message });
  }
};

/* =========================================================
   PLATFORM STATS
========================================================= */
const getPlatformStats = async (req, res) => {
  try {
    const usersByTier = await User.aggregate([
      { $group: { _id: '$tier', count: { $sum: 1 } } }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });

    const escrowStats = await Escrow.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: { $toDouble: '$amount' } }
        }
      }
    ]);

    const subscriptionRevenue = await User.aggregate([
      {
        $match: {
          tier: { $ne: 'starter' },
          'subscription.status': 'active'
        }
      },
      { $group: { _id: '$tier', count: { $sum: 1 } } }
    ]);

    const monthlyRevenue = subscriptionRevenue.reduce((acc, tier) => {
      const tierInfo = feeConfig.getTierInfo(tier._id);
      const cost = tierInfo.monthlyCost.NGN || tierInfo.monthlyCost.USD;
      return acc + tier.count * cost;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers, byTier: usersByTier },
        escrows: escrowStats,
        revenue: { monthlySubscriptions: monthlyRevenue, currency: 'NGN' }
      }
    });

  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch platform statistics', error: error.message });
  }
};

/* =========================================================
   ANALYTICS
========================================================= */
const getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const startDate = new Date();
    if (period === '7d') startDate.setDate(startDate.getDate() - 7);
    if (period === '30d') startDate.setDate(startDate.getDate() - 30);
    if (period === '90d') startDate.setDate(startDate.getDate() - 90);
    if (period === '1y') startDate.setFullYear(startDate.getFullYear() - 1);

    const transactionsOverTime = await Escrow.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$adminFee' }
      }},
      { $sort: { _id: 1 } }
    ]);

    const revenueByTier = await Escrow.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate } } },
      {
        $lookup: {
          from: 'users',
          localField: 'buyer',
          foreignField: '_id',
          as: 'buyerData'
        }
      },
      { $unwind: '$buyerData' },
      {
        $group: {
          _id: '$buyerData.tier',
          totalRevenue: { $sum: '$adminFee' },
          count: { $sum: 1 }
        }
      }
    ]);

    const paymentMethods = await Escrow.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const disputeStats = await Dispute.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        transactionsOverTime,
        revenueByTier,
        paymentMethods,
        disputeStats,
        userGrowth
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
};

/* =========================================================
   ADMIN MANAGEMENT
========================================================= */
const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins', error: error.message });
  }
};

const createSubAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, permissions } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) return res.status(400).json({ success: false, message: 'Email already registered' });

    const subAdmin = await Admin.create({
      name,
      email,
      password,
      role: 'sub_admin',
      permissions,
      createdBy: req.admin._id,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Sub-admin created successfully',
      admin: {
        id: subAdmin._id,
        name: subAdmin.name,
        email: subAdmin.email,
        role: subAdmin.role,
        permissions: subAdmin.permissions
      }
    });

  } catch (error) {
    console.error('Create sub-admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to create sub-admin', error: error.message });
  }
};

const updateSubAdminPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { permissions } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (admin.role === 'master')
      return res.status(400).json({ success: false, message: 'Cannot modify master admin permissions' });

    admin.permissions = permissions;
    await admin.save();

    res.status(200).json({ success: true, message: 'Permissions updated successfully', admin });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ success: false, message: 'Failed to update permissions', error: error.message });
  }
};

const toggleAdminStatus = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (admin.role === 'master')
      return res.status(400).json({ success: false, message: 'Cannot suspend master admin' });

    admin.status = admin.status === 'active' ? 'suspended' : 'active';
    await admin.save();

    res.status(200).json({
      success: true,
      message: `Admin ${admin.status === 'active' ? 'activated' : 'suspended'} successfully`,
      admin
    });
  } catch (error) {
    console.error('Toggle admin status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update admin status', error: error.message });
  }
};

const deleteSubAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (admin.role === 'master')
      return res.status(400).json({ success: false, message: 'Cannot delete master admin' });

    await Admin.findByIdAndDelete(adminId);

    res.status(200).json({ success: true, message: 'Sub-admin deleted successfully' });
  } catch (error) {
    console.error('Delete sub-admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sub-admin', error: error.message });
  }
};

/* =========================================================
   FEE SETTINGS MANAGEMENT
========================================================= */

// Get current fee settings
const getFeeSettings = async (req, res) => {
  try {
    let feeSettings = await FeeSettings.findOne({ isActive: true });

    if (!feeSettings) {
      feeSettings = await FeeSettings.create({
        lastUpdatedBy: req.admin._id,
        isActive: true
      });
    }

    res.status(200).json({
      success: true,
      data: feeSettings
    });

  } catch (error) {
    console.error('Get fee settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fee settings',
      error: error.message
    });
  }
};

// Update fee settings
const updateFeeSettings = async (req, res) => {
  try {
    const { tier, currency, feeType, field, value } = req.body;

    const validTiers = ['starter', 'growth', 'enterprise', 'api'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier'
      });
    }

    const validCurrencies = ['NGN', 'USD', 'crypto'];
    if (feeType === 'fees' && !validCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currency'
      });
    }

    const validFields = ['buyer', 'seller'];
    if (feeType === 'fees' && !validFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid field. Use: buyer or seller'
      });
    }

    let feeSettings = await FeeSettings.findOne({ isActive: true });

    if (!feeSettings) {
      feeSettings = await FeeSettings.create({
        lastUpdatedBy: req.admin._id,
        isActive: true
      });
    }

    // Update the specific field
    if (feeType === 'fees') {
      feeSettings.tiers[tier].fees[currency][field] = parseFloat(value);
    } else if (feeType === 'monthlyCost') {
      feeSettings.tiers[tier].monthlyCost[currency] = parseFloat(value);
    } else if (feeType === 'setupFee') {
      if (!feeSettings.tiers[tier].setupFee) {
        feeSettings.tiers[tier].setupFee = {};
      }
      feeSettings.tiers[tier].setupFee[currency] = parseFloat(value);
    } else if (feeType === 'maxTransactionAmount') {
      feeSettings.tiers[tier].maxTransactionAmount[currency] = parseFloat(value);
    } else if (feeType === 'maxTransactionsPerMonth') {
      feeSettings.tiers[tier].maxTransactionsPerMonth = parseInt(value);
    }

    feeSettings.lastUpdatedBy = req.admin._id;
    feeSettings.version += 1;
    await feeSettings.save();

    console.log(`✅ Admin ${req.admin.email} updated ${tier} ${feeType} ${currency} ${field} to ${value}`);

    res.status(200).json({
      success: true,
      message: 'Fee settings updated successfully',
      data: feeSettings
    });

  } catch (error) {
    console.error('Update fee settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update fee settings',
      error: error.message
    });
  }
};

// Bulk update tier fees
const bulkUpdateTierFees = async (req, res) => {
  try {
    const { tier, updates } = req.body;

    const validTiers = ['starter', 'growth', 'enterprise', 'api'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier'
      });
    }

    let feeSettings = await FeeSettings.findOne({ isActive: true });

    if (!feeSettings) {
      feeSettings = await FeeSettings.create({
        lastUpdatedBy: req.admin._id,
        isActive: true
      });
    }

    // Update all provided fields
    if (updates.fees) {
      Object.keys(updates.fees).forEach(currency => {
        if (feeSettings.tiers[tier].fees[currency]) {
          Object.keys(updates.fees[currency]).forEach(field => {
            feeSettings.tiers[tier].fees[currency][field] = parseFloat(updates.fees[currency][field]);
          });
        }
      });
    }

    if (updates.monthlyCost) {
      Object.keys(updates.monthlyCost).forEach(currency => {
        feeSettings.tiers[tier].monthlyCost[currency] = parseFloat(updates.monthlyCost[currency]);
      });
    }

    if (updates.setupFee) {
      if (!feeSettings.tiers[tier].setupFee) {
        feeSettings.tiers[tier].setupFee = {};
      }
      Object.keys(updates.setupFee).forEach(currency => {
        feeSettings.tiers[tier].setupFee[currency] = parseFloat(updates.setupFee[currency]);
      });
    }

    if (updates.maxTransactionAmount) {
      Object.keys(updates.maxTransactionAmount).forEach(currency => {
        feeSettings.tiers[tier].maxTransactionAmount[currency] = parseFloat(updates.maxTransactionAmount[currency]);
      });
    }

    if (updates.maxTransactionsPerMonth !== undefined) {
      feeSettings.tiers[tier].maxTransactionsPerMonth = parseInt(updates.maxTransactionsPerMonth);
    }

    feeSettings.lastUpdatedBy = req.admin._id;
    feeSettings.version += 1;
    await feeSettings.save();

    console.log(`✅ Admin ${req.admin.email} bulk updated ${tier} tier settings`);

    res.status(200).json({
      success: true,
      message: 'Tier fees updated successfully',
      data: feeSettings.tiers[tier]
    });

  } catch (error) {
    console.error('Bulk update tier fees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tier fees',
      error: error.message
    });
  }
};

// Update gateway costs
const updateGatewayCosts = async (req, res) => {
  try {
    const { gateway, currency, field, value } = req.body;

    const validGateways = ['paystack', 'flutterwave', 'crypto'];
    if (!validGateways.includes(gateway)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gateway'
      });
    }

    let feeSettings = await FeeSettings.findOne({ isActive: true });

    if (!feeSettings) {
      feeSettings = await FeeSettings.create({
        lastUpdatedBy: req.admin._id,
        isActive: true
      });
    }

    // Update gateway cost
    if (gateway === 'crypto') {
      feeSettings.gatewayCosts[gateway][field] = parseFloat(value);
    } else {
      if (field === 'transferFee' && gateway === 'paystack') {
      // Paystack has transfer fee tiers
        const { tier, amount } = value;
        feeSettings.gatewayCosts.paystack.transferFee[tier] = parseFloat(amount);
      } else {
        feeSettings.gatewayCosts[gateway][currency][field] = parseFloat(value);
      }
    }

    feeSettings.lastUpdatedBy = req.admin._id;
    feeSettings.version += 1;
    await feeSettings.save();

    console.log(`✅ Admin ${req.admin.email} updated ${gateway} gateway costs`);

    res.status(200).json({
      success: true,
      message: 'Gateway costs updated successfully',
      data: feeSettings.gatewayCosts
    });

  } catch (error) {
    console.error('Update gateway costs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update gateway costs',
      error: error.message
    });
  }
};

// Get fee settings history
const getFeeSettingsHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await Promise.all([
      FeeSettings.find()
        .populate('lastUpdatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FeeSettings.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get fee settings history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fee settings history',
      error: error.message
    });
  }
};

// Reset fees to default
const resetFeesToDefault = async (req, res) => {
  try {
    const { tier } = req.body;

    const validTiers = ['starter', 'growth', 'enterprise', 'api', 'all'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier. Use: starter, growth, enterprise, api, or all'
      });
    }

    // Create new default settings
    const defaultSettings = new FeeSettings({
      lastUpdatedBy: req.admin._id,
      isActive: true
    });

    if (tier !== 'all') {
      // Only reset specific tier
      let currentSettings = await FeeSettings.findOne({ isActive: true });
      if (currentSettings) {
        const defaultTier = new FeeSettings().tiers[tier];
        currentSettings.tiers[tier] = defaultTier;
        currentSettings.lastUpdatedBy = req.admin._id;
        currentSettings.version += 1;
        await currentSettings.save();

        res.status(200).json({
          success: true,
          message: `${tier} tier reset to default values`,
          data: currentSettings.tiers[tier]
        });
      }
    } else {
      // Reset all tiers
      await defaultSettings.save();

      res.status(200).json({
        success: true,
        message: 'All fees reset to default values',
        data: defaultSettings
      });
    }

    console.log(`✅ Admin ${req.admin.email} reset ${tier} fees to default`);

  } catch (error) {
    console.error('Reset fees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset fees',
      error: error.message
    });
  }
};

/* =========================================================
   EXPORT ALL FUNCTIONS
========================================================= */
module.exports = {
  // Authentication
  login,
  
  // Dashboard
  getDashboardStats,
  
  // Transactions
  getTransactions,
  
  // Disputes
  getDisputes,
  resolveDispute,
  
  // Users
  getUsers,
  changeUserTier,
  toggleUserStatus,
  reviewKYC,
  
  // Analytics & Stats
  getPlatformStats,
  getAnalytics,
  
  // Admin Management
  getAdmins,
  createSubAdmin,
  updateSubAdminPermissions,
  toggleAdminStatus,
  deleteSubAdmin,
  
  // Fee Settings Management
  getFeeSettings,
  updateFeeSettings,
  bulkUpdateTierFees,
  updateGatewayCosts,
  getFeeSettingsHistory,
  resetFeesToDefault
};