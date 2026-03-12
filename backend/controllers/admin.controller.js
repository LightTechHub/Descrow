// backend/controllers/admin.controller.js - COMPLETE FIXED VERSION
const Admin = require('../models/Admin.model');
const User = require('../models/User.model');
const Escrow = require('../models/Escrow.model');
const Dispute = require('../models/Dispute.model');
const Transaction = require('../models/Transaction.model');
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (admin.status !== 'active')
      return res.status(403).json({ success: false, message: 'Account is suspended. Contact master admin.' });

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await Admin.updateOne({ _id: admin._id }, { $set: { lastActive: new Date() } });

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
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
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

    // Normalize Decimal128 amount fields so frontend gets plain numbers
    const normalizedEscrows = escrows.map(e => ({
      ...e.toObject(),
      amount: e.amount ? parseFloat(e.amount.toString()) : 0,
      payment: e.payment ? {
        ...e.payment,
        amount: e.payment.amount ? parseFloat(e.payment.amount.toString()) : 0,
        buyerPays: e.payment.buyerPays ? parseFloat(e.payment.buyerPays.toString()) : 0,
        sellerReceives: e.payment.sellerReceives ? parseFloat(e.payment.sellerReceives.toString()) : 0,
        buyerFee: e.payment.buyerFee ? parseFloat(e.payment.buyerFee.toString()) : 0,
        sellerFee: e.payment.sellerFee ? parseFloat(e.payment.sellerFee.toString()) : 0,
      } : {}
    }));

    res.status(200).json({
      success: true,
      escrows: normalizedEscrows,
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
    if (verified === 'true' || verified === 'false') query.verified = verified === 'true';
    if (kycStatus) query['kycStatus.status'] = kycStatus;
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
        .limit(Number(limit)),
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
   GET USER DETAILS
========================================================= */
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -twoFactorSecret');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const escrows = await Escrow.find({ $or: [{ buyer: userId }, { seller: userId }] })
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    const disputes = await Dispute.find({ $or: [{ initiatedBy: userId }, { reportedUser: userId }] })
      .populate('escrow', 'escrowId title amount')
      .populate('initiatedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ success: true, data: { user, escrows, disputes } });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user details', error: error.message });
  }
};

/* =========================================================
   CHANGE USER TIER
========================================================= */
const changeUserTier = async (req, res) => {
  try {
    const crypto = require('crypto');
    const { userId } = req.params;
    const { newTier, reason } = req.body;

    const validTiers = ['starter', 'growth', 'enterprise', 'api'];
    if (!validTiers.includes(newTier))
      return res.status(400).json({ success: false, message: 'Invalid tier' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const oldTier = user.tier;
    user.tier = newTier;

    // Activate subscription for paid tiers
    if (newTier !== 'starter') {
      user.subscription = {
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastPaymentDate: new Date(),
        autoRenew: false
      };
    }

    // Auto-generate API keys when upgrading to api tier
    if (newTier === 'api') {
      // Only generate if not already generated
      if (!user.apiAccess?.apiKey) {
        const apiKey    = 'dc_live_' + crypto.randomBytes(24).toString('hex');
        const apiSecret = 'dc_secret_' + crypto.randomBytes(32).toString('hex');

        user.apiAccess = {
          enabled:      true,
          apiKey,
          apiSecret,
          createdAt:    new Date(),
          requestCount: 0
        };
        console.log(`🔑 API keys generated for user ${user.email}`);
      } else {
        // Already has keys — just enable access
        user.apiAccess.enabled = true;
        console.log(`✅ API access re-enabled for user ${user.email}`);
      }
    }

    // Disable API access if downgrading away from api tier
    if (oldTier === 'api' && newTier !== 'api') {
      if (user.apiAccess) {
        user.apiAccess.enabled = false;
      }
    }

    await user.save();

    console.log(`✅ Tier changed: ${user.email} — ${oldTier} → ${newTier}`);

    res.status(200).json({
      success: true,
      message: `User tier changed from ${oldTier} to ${newTier}`,
      data: {
        user: {
          id:      user._id,
          name:    user.name,
          email:   user.email,
          tier:    user.tier,
          apiAccess: newTier === 'api' ? {
            enabled:  user.apiAccess.enabled,
            apiKey:   user.apiAccess.apiKey,
            createdAt: user.apiAccess.createdAt
          } : undefined
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
      data: { user: { id: user._id, name: user.name, email: user.email, status: user.status, isActive: user.isActive } }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to change user status', error: error.message });
  }
};

/* =========================================================
   REVIEW KYC  ← FIXED
========================================================= */
const reviewKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const currentStatus = user.kycStatus?.status || user.kycStatus;
    const reviewableStatuses = ['pending', 'under_review', 'pending_documents', 'in_progress'];

    if (!reviewableStatuses.includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `KYC cannot be reviewed in current status: ${currentStatus}`
      });
    }

    if (action === 'approve') {
      user.kycStatus = {
        ...user.kycStatus,
        status: 'approved',
        verifiedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: req.admin._id
      };
      user.isKYCVerified = true;
    } else if (action === 'reject') {
      user.kycStatus = {
        ...user.kycStatus,
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: req.admin._id,
        rejectionReason: reason || 'Rejected by admin'
      };
      user.isKYCVerified = false;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Use approve or reject.' });
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
          kycStatus: user.kycStatus.status,
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
      { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: { $toDouble: '$amount' } } } }
    ]);

    const subscriptionRevenue = await User.aggregate([
      { $match: { tier: { $ne: 'starter' }, 'subscription.status': 'active' } },
      { $group: { _id: '$tier', count: { $sum: 1 } } }
    ]);

    const monthlyRevenue = subscriptionRevenue.reduce((acc, tier) => {
      const tierInfo = feeConfig.getTierInfo ? feeConfig.getTierInfo(tier._id) : { monthlyCost: { NGN: 0, USD: 0 } };
      const cost = tierInfo.monthlyCost?.NGN || tierInfo.monthlyCost?.USD || 0;
      return acc + (tier.count * cost);
    }, 0);

    let transactionStats = { totalTransactions: 0, totalVolume: 0 };
    try {
      if (Transaction) {
        const txAggregation = await Transaction.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, totalTransactions: { $sum: 1 }, totalVolume: { $sum: '$amount' } } }
        ]);
        if (txAggregation.length > 0) transactionStats = txAggregation[0];
      }
    } catch (txError) {
      console.log('Transaction model error:', txError.message);
    }

    res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers, byTier: usersByTier },
        escrows: escrowStats,
        transactions: transactionStats,
        revenue: { monthlySubscriptions: monthlyRevenue, currency: 'NGN' },
        disputes: { pending: await Dispute.countDocuments({ status: 'open' }) }
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
      { $lookup: { from: 'users', localField: 'buyer', foreignField: '_id', as: 'buyerData' } },
      { $unwind: '$buyerData' },
      { $group: { _id: '$buyerData.tier', totalRevenue: { $sum: '$adminFee' }, count: { $sum: 1 } } }
    ]);

    const paymentMethods = await Escrow.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
    ]);

    const disputeStats = await Dispute.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const statusDistribution = await Escrow.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: { period, startDate, endDate: new Date(), transactionsOverTime, revenueByTier, paymentMethods, disputeStats, userGrowth, statusDistribution }
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
      name, email, password, role: 'sub_admin', permissions, createdBy: req.admin._id, status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Sub-admin created successfully',
      admin: { id: subAdmin._id, name: subAdmin.name, email: subAdmin.email, role: subAdmin.role, permissions: subAdmin.permissions }
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

    res.status(200).json({ success: true, message: `Admin ${admin.status === 'active' ? 'activated' : 'suspended'} successfully`, admin });
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
const getFeeSettings = async (req, res) => {
  try {
    let feeSettings = await FeeSettings.findOne({ isActive: true });
    if (!feeSettings) {
      feeSettings = await FeeSettings.create({ lastUpdatedBy: req.admin._id, isActive: true });
    }
    res.status(200).json({ success: true, data: feeSettings });
  } catch (error) {
    console.error('Get fee settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fee settings', error: error.message });
  }
};

const updateFeeSettings = async (req, res) => {
  try {
    const { tier, currency, feeType, field, value } = req.body;

    const validTiers = ['starter', 'growth', 'enterprise', 'api'];
    if (!validTiers.includes(tier))
      return res.status(400).json({ success: false, message: 'Invalid tier' });

    let feeSettings = await FeeSettings.findOne({ isActive: true });
    if (!feeSettings) {
      feeSettings = await FeeSettings.create({ lastUpdatedBy: req.admin._id, isActive: true });
    }

    if (!feeSettings.tiers[tier]) feeSettings.tiers[tier] = {};

    if (feeType === 'fees') {
      if (!feeSettings.tiers[tier].fees) feeSettings.tiers[tier].fees = {};
      if (!feeSettings.tiers[tier].fees[currency]) feeSettings.tiers[tier].fees[currency] = {};
      feeSettings.tiers[tier].fees[currency][field] = parseFloat(value);
    } else if (feeType === 'monthlyCost') {
      if (!feeSettings.tiers[tier].monthlyCost) feeSettings.tiers[tier].monthlyCost = {};
      feeSettings.tiers[tier].monthlyCost[currency] = parseFloat(value);
    } else if (feeType === 'setupFee') {
      if (!feeSettings.tiers[tier].setupFee) feeSettings.tiers[tier].setupFee = {};
      feeSettings.tiers[tier].setupFee[currency] = parseFloat(value);
    } else if (feeType === 'maxTransactionAmount') {
      if (!feeSettings.tiers[tier].maxTransactionAmount) feeSettings.tiers[tier].maxTransactionAmount = {};
      feeSettings.tiers[tier].maxTransactionAmount[currency] = parseFloat(value);
    } else if (feeType === 'maxTransactionsPerMonth') {
      feeSettings.tiers[tier].maxTransactionsPerMonth = parseInt(value);
    }

    feeSettings.lastUpdatedBy = req.admin._id;
    feeSettings.version = (feeSettings.version || 0) + 1;
    await feeSettings.save();

    res.status(200).json({ success: true, message: 'Fee settings updated successfully', data: feeSettings });
  } catch (error) {
    console.error('Update fee settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update fee settings', error: error.message });
  }
};

const bulkUpdateTierFees = async (req, res) => {
  try {
    const { tier, updates } = req.body;
    const validTiers = ['starter', 'growth', 'enterprise', 'api'];
    if (!validTiers.includes(tier))
      return res.status(400).json({ success: false, message: 'Invalid tier' });

    let feeSettings = await FeeSettings.findOne({ isActive: true });
    if (!feeSettings) {
      feeSettings = await FeeSettings.create({ lastUpdatedBy: req.admin._id, isActive: true });
    }

    if (!feeSettings.tiers[tier]) feeSettings.tiers[tier] = {};

    if (updates.fees) {
      if (!feeSettings.tiers[tier].fees) feeSettings.tiers[tier].fees = {};
      Object.keys(updates.fees).forEach(currency => {
        if (!feeSettings.tiers[tier].fees[currency]) feeSettings.tiers[tier].fees[currency] = {};
        Object.keys(updates.fees[currency]).forEach(field => {
          feeSettings.tiers[tier].fees[currency][field] = parseFloat(updates.fees[currency][field]);
        });
      });
    }

    if (updates.monthlyCost) {
      if (!feeSettings.tiers[tier].monthlyCost) feeSettings.tiers[tier].monthlyCost = {};
      Object.keys(updates.monthlyCost).forEach(currency => {
        feeSettings.tiers[tier].monthlyCost[currency] = parseFloat(updates.monthlyCost[currency]);
      });
    }

    if (updates.maxTransactionsPerMonth !== undefined) {
      feeSettings.tiers[tier].maxTransactionsPerMonth = parseInt(updates.maxTransactionsPerMonth);
    }

    feeSettings.lastUpdatedBy = req.admin._id;
    feeSettings.version = (feeSettings.version || 0) + 1;
    await feeSettings.save();

    res.status(200).json({ success: true, message: 'Tier fees updated successfully', data: feeSettings.tiers[tier] });
  } catch (error) {
    console.error('Bulk update tier fees error:', error);
    res.status(500).json({ success: false, message: 'Failed to update tier fees', error: error.message });
  }
};

const updateGatewayCosts = async (req, res) => {
  try {
    const { gateway, currency, field, value } = req.body;
    const validGateways = ['paystack', 'flutterwave', 'crypto'];
    if (!validGateways.includes(gateway))
      return res.status(400).json({ success: false, message: 'Invalid gateway' });

    let feeSettings = await FeeSettings.findOne({ isActive: true });
    if (!feeSettings) {
      feeSettings = await FeeSettings.create({ lastUpdatedBy: req.admin._id, isActive: true });
    }

    if (!feeSettings.gatewayCosts) feeSettings.gatewayCosts = {};
    if (!feeSettings.gatewayCosts[gateway]) feeSettings.gatewayCosts[gateway] = {};

    if (gateway === 'crypto') {
      feeSettings.gatewayCosts[gateway][field] = parseFloat(value);
    } else {
      if (!feeSettings.gatewayCosts[gateway][currency]) feeSettings.gatewayCosts[gateway][currency] = {};
      feeSettings.gatewayCosts[gateway][currency][field] = parseFloat(value);
    }

    feeSettings.lastUpdatedBy = req.admin._id;
    feeSettings.version = (feeSettings.version || 0) + 1;
    await feeSettings.save();

    res.status(200).json({ success: true, message: 'Gateway costs updated successfully', data: feeSettings.gatewayCosts });
  } catch (error) {
    console.error('Update gateway costs error:', error);
    res.status(500).json({ success: false, message: 'Failed to update gateway costs', error: error.message });
  }
};

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
      data: { history, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } }
    });
  } catch (error) {
    console.error('Get fee settings history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fee settings history', error: error.message });
  }
};

const resetFeesToDefault = async (req, res) => {
  try {
    const { tier } = req.body;
    const validTiers = ['starter', 'growth', 'enterprise', 'api', 'all'];
    if (!validTiers.includes(tier))
      return res.status(400).json({ success: false, message: 'Invalid tier' });

    let feeSettings = await FeeSettings.findOne({ isActive: true });
    if (!feeSettings) {
      feeSettings = await FeeSettings.create({ lastUpdatedBy: req.admin._id, isActive: true });
    }

    const defaultSettings = new FeeSettings();
    if (tier === 'all') {
      feeSettings.tiers = defaultSettings.tiers;
    } else {
      feeSettings.tiers[tier] = defaultSettings.tiers[tier];
    }

    feeSettings.lastUpdatedBy = req.admin._id;
    feeSettings.version = (feeSettings.version || 0) + 1;
    await feeSettings.save();

    res.status(200).json({
      success: true,
      message: `${tier === 'all' ? 'All fees' : tier + ' tier'} reset to default values`,
      data: tier === 'all' ? feeSettings : feeSettings.tiers[tier]
    });
  } catch (error) {
    console.error('Reset fees error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset fees', error: error.message });
  }
};

/* =========================================================
   TRANSACTION DETAILS
========================================================= */
const getTransactionDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;

    let transaction = await Escrow.findById(transactionId)
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone');

    if (!transaction && Transaction) {
      transaction = await Transaction.findById(transactionId).populate('user', 'name email phone');
    }

    if (!transaction)
      return res.status(404).json({ success: false, message: 'Transaction not found' });

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transaction details', error: error.message });
  }
};

/* =========================================================
   ASSIGN DISPUTE
========================================================= */
const assignDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { adminId } = req.body;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    dispute.assignedTo = adminId;
    dispute.status = 'under_review';
    dispute.assignedAt = new Date();
    await dispute.save();

    res.status(200).json({ success: true, message: 'Dispute assigned successfully', data: dispute });
  } catch (error) {
    console.error('Assign dispute error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign dispute', error: error.message });
  }
};

/* =========================================================
   FORCE-COMPLETE / FORCE-CANCEL ESCROW (Admin intervention)
========================================================= */
const forceCompleteEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const Escrow = require('../models/Escrow.model');

    const escrow = await Escrow.findById(id).populate('buyer seller', 'name email');
    if (!escrow) return res.status(404).json({ success: false, message: 'Escrow not found' });
    if (escrow.status === 'completed') return res.status(400).json({ success: false, message: 'Already completed' });

    escrow.status = 'completed';
    escrow.delivery = escrow.delivery || {};
    escrow.delivery.confirmedAt = new Date();
    escrow.payment = escrow.payment || {};
    escrow.payment.payoutAvailableAt = new Date(); // immediate — admin override
    escrow.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      note: `Force-completed by admin: ${reason || 'Admin intervention'}`
    });
    await escrow.save();

    // Credit wallet
    try {
      const { creditWalletOnCompletion } = require('./wallet.controller');
      await creditWalletOnCompletion(escrow.seller._id, escrow);
    } catch (e) { console.error('wallet credit failed:', e.message); }

    // Notify both parties
    try {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification(escrow.seller._id, 'escrow_completed', 'Escrow Completed by Admin', `"${escrow.title}" was completed by an admin. Funds added to your wallet.`, '/wallet', { escrowId: escrow._id });
      await createNotification(escrow.buyer._id, 'escrow_completed', 'Escrow Completed by Admin', `"${escrow.title}" was completed by an admin.`, `/escrow/${escrow._id}`, { escrowId: escrow._id });
    } catch (e) { /* non-fatal */ }

    res.json({ success: true, message: 'Escrow force-completed', data: { escrowId: escrow._id, status: escrow.status } });
  } catch (err) {
    console.error('forceCompleteEscrow error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const forceCancelEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, refundBuyer = true } = req.body;
    const Escrow = require('../models/Escrow.model');

    const escrow = await Escrow.findById(id).populate('buyer seller', 'name email');
    if (!escrow) return res.status(404).json({ success: false, message: 'Escrow not found' });
    if (['completed', 'cancelled'].includes(escrow.status)) {
      return res.status(400).json({ success: false, message: 'Escrow already finalised' });
    }

    escrow.status = 'cancelled';
    escrow.cancelledAt = new Date();
    escrow.cancellationReason = `Admin: ${reason || 'Admin intervention'}`;
    escrow.timeline.push({ status: 'cancelled', timestamp: new Date(), note: `Force-cancelled by admin: ${reason || ''}` });
    await escrow.save();

    // Refund buyer wallet if funded and requested
    if (refundBuyer && escrow.payment?.buyerPaid) {
      try {
        const Wallet = require('../models/Wallet.model');
        let wallet = await Wallet.findOne({ user: escrow.buyer._id });
        if (!wallet) wallet = await Wallet.create({ user: escrow.buyer._id });
        const refundAmount = parseFloat((escrow.payment.buyerPaid || escrow.amount).toString());
        const before = wallet.balance;
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: 'refund', amount: refundAmount, currency: wallet.currency,
          description: `Refund for cancelled escrow: ${escrow.title}`,
          escrowId: escrow._id, status: 'completed',
          balanceBefore: before, balanceAfter: wallet.balance,
          reference: `REFUND_CANCEL_${escrow.escrowId}`
        });
        await wallet.save();
      } catch (e) { console.error('refund wallet failed:', e.message); }
    }

    const { createNotification } = require('../utils/notificationHelper').catch ? {} : require('../utils/notificationHelper');
    try {
      await createNotification(escrow.buyer._id, 'escrow_cancelled', 'Escrow Cancelled by Admin', `"${escrow.title}" was cancelled by an admin. ${refundBuyer ? 'Refund added to your wallet.' : ''}`, '/wallet', { escrowId: escrow._id });
      await createNotification(escrow.seller._id, 'escrow_cancelled', 'Escrow Cancelled by Admin', `"${escrow.title}" was cancelled by an admin.`, '/dashboard', { escrowId: escrow._id });
    } catch (e) { /* non-fatal */ }

    res.json({ success: true, message: 'Escrow force-cancelled', data: { escrowId: escrow._id, refundIssued: refundBuyer } });
  } catch (err) {
    console.error('forceCancelEscrow error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   BAN / SUSPEND USERS
========================================================= */
const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, duration } = req.body; // duration in days, null = permanent

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.status = 'suspended';
    user.escrowAccess = user.escrowAccess || {};
    user.escrowAccess.canCreateEscrow = false;
    user.escrowAccess.canReceiveEscrow = false;
    user.escrowAccess.suspensionReason = reason || 'Policy violation';
    if (duration) {
      user.escrowAccess.suspendedUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    }

    user.auditLog = user.auditLog || [];
    user.auditLog.push({
      action: 'ACCOUNT_BANNED',
      description: `Banned by admin ${req.admin._id}: ${reason}`,
      timestamp: new Date(),
      metadata: { adminId: req.admin._id, reason, duration }
    });

    await user.save();

    try {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification(user._id, 'account_suspended', 'Account Suspended',
        `Your account has been suspended. Reason: ${reason || 'Policy violation'}. Contact support to appeal.`,
        '/contact', { reason });
    } catch (e) { /* non-fatal */ }

    res.json({ success: true, message: `User ${duration ? `suspended for ${duration} days` : 'permanently banned'}`, data: { userId: user._id, status: user.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.status = 'active';
    user.escrowAccess = user.escrowAccess || {};
    user.escrowAccess.canCreateEscrow = true;
    user.escrowAccess.canReceiveEscrow = true;
    user.escrowAccess.suspensionReason = null;
    user.escrowAccess.suspendedUntil = null;

    user.auditLog = user.auditLog || [];
    user.auditLog.push({ action: 'ACCOUNT_UNBANNED', description: `Unbanned by admin: ${reason || ''}`, timestamp: new Date() });
    await user.save();

    res.json({ success: true, message: 'User unbanned', data: { userId: user._id, status: user.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   BROADCAST NOTIFICATIONS
========================================================= */
const broadcastNotification = async (req, res) => {
  try {
    const { title, message, link, targetTier, targetAll = true } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message required' });

    const query = { status: 'active' };
    if (!targetAll && targetTier) query.tier = targetTier;

    const users = await User.find(query).select('_id').lean();
    const { createNotification } = require('../utils/notificationHelper');

    let sent = 0;
    const BATCH = 100;
    for (let i = 0; i < users.length; i += BATCH) {
      const batch = users.slice(i, i + BATCH);
      await Promise.all(batch.map(u =>
        createNotification(u._id, 'announcement', title, message, link || '/dashboard', { fromAdmin: true })
          .catch(() => {})
      ));
      sent += batch.length;
    }

    res.json({ success: true, message: `Broadcast sent to ${sent} users`, data: { sent, total: users.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   ADMIN WALLET MANAGEMENT (view/credit/debit any user)
========================================================= */
const getUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const Wallet = require('../models/Wallet.model');

    const user = await User.findById(userId).select('name email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) wallet = await Wallet.create({ user: userId });

    const recentTx = [...wallet.transactions].reverse().slice(0, 20);

    res.json({ success: true, data: { user, balance: wallet.balance, pendingBalance: wallet.pendingBalance, totalEarned: wallet.totalEarned, totalWithdrawn: wallet.totalWithdrawn, currency: wallet.currency, recentTransactions: recentTx } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const adminCreditWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required for audit' });

    const Wallet = require('../models/Wallet.model');
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) wallet = await Wallet.create({ user: userId });

    await wallet.credit(parseFloat(amount), `Admin credit: ${reason}`, null, null, `ADMIN_CREDIT_${Date.now()}`);

    // Audit log on user
    await User.findByIdAndUpdate(userId, { $push: { auditLog: { action: 'ADMIN_WALLET_CREDIT', description: `Admin ${req.admin._id} credited ₦${amount}: ${reason}`, timestamp: new Date() } } });

    res.json({ success: true, message: `₦${amount} credited to user wallet`, data: { newBalance: wallet.balance + parseFloat(amount) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const adminDebitWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required for audit' });

    const Wallet = require('../models/Wallet.model');
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet || wallet.balance < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    await wallet.debit(parseFloat(amount), `Admin debit: ${reason}`, null, `ADMIN_DEBIT_${Date.now()}`);
    await User.findByIdAndUpdate(userId, { $push: { auditLog: { action: 'ADMIN_WALLET_DEBIT', description: `Admin ${req.admin._id} debited ₦${amount}: ${reason}`, timestamp: new Date() } } });

    res.json({ success: true, message: `₦${amount} debited from user wallet`, data: { newBalance: wallet.balance - parseFloat(amount) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   REVENUE DASHBOARD
========================================================= */
const getRevenueStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const Escrow = require('../models/Escrow.model');
    const Withdrawal = require('../models/Withdrawal.model');

    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [completedEscrows, withdrawalsTotal, totalUsers, activeEscrows] = await Promise.all([
      Escrow.find({ status: 'completed', updatedAt: { $gte: since } })
        .select('amount payment escrowId createdAt updatedAt'),
      Withdrawal.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      User.countDocuments({ createdAt: { $gte: since } }),
      Escrow.countDocuments({ status: { $in: ['pending', 'accepted', 'funded', 'delivered'] } })
    ]);

    // Calculate fees earned (transaction volume × fee rate)
    let totalVolume = 0;
    let totalFees = 0;
    for (const escrow of completedEscrows) {
      const amount = parseFloat((escrow.amount || 0).toString());
      totalVolume += amount;
      const buyerPaid = escrow.payment?.buyerPaid ? parseFloat(escrow.payment.buyerPaid.toString()) : 0;
      const sellerReceives = escrow.payment?.sellerReceives ? parseFloat(escrow.payment.sellerReceives.toString()) : 0;
      if (buyerPaid && sellerReceives) totalFees += buyerPaid - sellerReceives;
    }

    // Daily breakdown for chart
    const dailyMap = {};
    for (const escrow of completedEscrows) {
      const day = escrow.updatedAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, volume: 0, fees: 0, count: 0 };
      const amount = parseFloat((escrow.amount || 0).toString());
      dailyMap[day].volume += amount;
      dailyMap[day].count += 1;
      const bp = escrow.payment?.buyerPaid ? parseFloat(escrow.payment.buyerPaid.toString()) : 0;
      const sr = escrow.payment?.sellerReceives ? parseFloat(escrow.payment.sellerReceives.toString()) : 0;
      if (bp && sr) dailyMap[day].fees += (bp - sr);
    }

    const dailyStats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalVolume: Math.round(totalVolume),
          totalFees: Math.round(totalFees),
          completedTransactions: completedEscrows.length,
          totalWithdrawals: withdrawalsTotal[0]?.total || 0,
          withdrawalCount: withdrawalsTotal[0]?.count || 0,
          newUsers: totalUsers,
          activeEscrows
        },
        dailyStats
      }
    });
  } catch (err) {
    console.error('getRevenueStats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   WITHDRAWAL AUTO-APPROVAL THRESHOLD
========================================================= */
const getWithdrawalSettings = async (req, res) => {
  res.json({
    success: true,
    data: {
      autoApprovalThreshold: parseInt(process.env.WITHDRAWAL_AUTO_APPROVE_THRESHOLD || '50000'),
      currency: 'NGN',
      minWithdrawal: 1000,
      maxWithdrawal: parseInt(process.env.MAX_WITHDRAWAL_AMOUNT || '5000000')
    }
  });
};

const updateWithdrawalSettings = async (req, res) => {
  // In production this would persist to DB / env management
  // For now returns confirmation — set via Render env vars
  res.json({ success: true, message: 'Update WITHDRAWAL_AUTO_APPROVE_THRESHOLD in Render environment variables', data: req.body });
};

/* =========================================================
   WALLET DEPOSITS — Admin visibility & audit trail
========================================================= */
const getWalletDeposits = async (req, res) => {
  try {
    const { page = 1, limit = 30, userId, status, from, to } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Deposits show up as wallet transactions of type 'credit' with source 'deposit'
    // Filter from Wallet.transactions array using aggregation
    const matchStage = {};
    if (userId) matchStage['user'] = new (require('mongoose').Types.ObjectId)(userId);
    if (from || to) {
      matchStage['transactions.createdAt'] = {};
      if (from) matchStage['transactions.createdAt'].$gte = new Date(from);
      if (to)   matchStage['transactions.createdAt'].$lte = new Date(to);
    }

    const Wallet = require('../models/Wallet.model');
    const deposits = await Wallet.aggregate([
      { $unwind: '$transactions' },
      { $match: { 'transactions.type': 'credit', 'transactions.description': { $regex: 'deposit|top.up|wallet fund|topup|top_up', $options: 'i' } } },
      { $sort: { 'transactions.createdAt': -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' } },
      { $unwind: { path: '$userInfo', includeArrayIndex: null, preserveNullAndEmptyArrays: true } },
      { $project: {
        _id: '$transactions._id',
        amount: '$transactions.amount',
        description: '$transactions.description',
        reference: '$transactions.reference',
        createdAt: '$transactions.createdAt',
        userId: '$user',
        userName: '$userInfo.name',
        userEmail: '$userInfo.email'
      }}
    ]);

    const total = await Wallet.aggregate([
      { $unwind: '$transactions' },
      { $match: { 'transactions.type': 'credit', 'transactions.description': { $regex: 'deposit|top.up|wallet fund|topup|top_up', $options: 'i' } } },
      { $count: 'total' }
    ]);

    res.json({
      success: true,
      data: {
        deposits,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0]?.total || 0,
          pages: Math.ceil((total[0]?.total || 0) / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error('getWalletDeposits error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   KYC FIELD UNLOCK — Admin override for locked identity fields
========================================================= */
const unlockKYCFields = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, newName, newBusinessName } = req.body;

    if (!reason) return res.status(400).json({ success: false, message: 'Reason for unlock is required.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (!user.isKYCVerified) {
      return res.status(400).json({ success: false, message: 'User is not KYC verified — fields are not locked.' });
    }

    const changes = {};
    if (newName && newName !== user.name) {
      changes.previousName = user.name;
      user.name = newName;
      changes.newName = newName;
    }
    if (newBusinessName && user.businessInfo?.companyName && newBusinessName !== user.businessInfo.companyName) {
      changes.previousBusinessName = user.businessInfo.companyName;
      user.businessInfo = { ...user.businessInfo, companyName: newBusinessName };
      changes.newBusinessName = newBusinessName;
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided.' });
    }

    // Log the admin override
    user.kycStatus = {
      ...user.kycStatus,
      adminOverride: {
        at: new Date(),
        by: req.admin._id,
        reason,
        changes
      }
    };

    await user.save();
    console.log(`✅ Admin KYC field unlock: ${req.admin.email} changed fields for user ${userId}. Reason: ${reason}`);

    res.json({
      success: true,
      message: 'KYC-locked fields updated successfully.',
      data: { userId, changes, reason }
    });
  } catch (err) {
    console.error('unlockKYCFields error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   KYC PENDING QUEUE — All users awaiting review
========================================================= */
const getKYCQueue = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending_documents' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const validStatuses = ['pending', 'pending_documents', 'under_review', 'in_progress'];
    const statusFilter = validStatuses.includes(status) ? status : { $in: validStatuses };

    const [users, total, counts] = await Promise.all([
      User.find({ 'kycStatus.status': statusFilter })
        .select('name email accountType kycStatus createdAt')
        .sort({ 'kycStatus.submittedAt': 1 }) // oldest first
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments({ 'kycStatus.status': statusFilter }),
      // Counts for all statuses for the stats cards in the UI
      Promise.all([
        User.countDocuments({ 'kycStatus.status': { $in: ['pending', 'pending_documents', 'under_review', 'in_progress'] } }),
        User.countDocuments({ 'kycStatus.status': 'approved' }),
        User.countDocuments({ 'kycStatus.status': 'rejected' }),
      ])
    ]);

    res.json({
      success: true,
      data: {
        users,
        counts: { pending: counts[0], approved: counts[1], rejected: counts[2] },
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (err) {
    console.error('getKYCQueue error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   REFERRAL STATS — Platform-wide referral overview
========================================================= */
const getReferralStats = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Users who have referral data
    const [referrers, totalReferrals, pendingRewards] = await Promise.all([
      User.find({ 'referral.totalReferrals': { $gt: 0 } })
        .select('name email referral createdAt tier')
        .sort({ 'referral.totalReferrals': -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$referral.totalReferrals' }, earned: { $sum: '$referral.totalEarnings' }, pending: { $sum: '$referral.pendingEarnings' } } }]),
      User.countDocuments({ 'referral.pendingEarnings': { $gt: 0 } })
    ]);

    const summary = totalReferrals[0] || { total: 0, earned: 0, pending: 0 };

    res.json({
      success: true,
      data: {
        summary: {
          totalReferrals: summary.total,
          totalEarningsPaid: summary.earned,
          totalPendingPayouts: summary.pending,
          usersWithPendingRewards: pendingRewards
        },
        referrers,
        pagination: { page: parseInt(page), limit: parseInt(limit) }
      }
    });
  } catch (err) {
    console.error('getReferralStats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   REFERRAL — Manually award or adjust referral credit
========================================================= */
const adjustReferralCredit = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, amount, reason } = req.body; // action: 'award' | 'deduct' | 'approve_pending'

    if (!['award', 'deduct', 'approve_pending'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be: award | deduct | approve_pending' });
    }
    if (!reason) return res.status(400).json({ success: false, message: 'Reason is required.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const Wallet = require('../models/Wallet.model');
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) return res.status(404).json({ success: false, message: 'User wallet not found.' });

    const amountNGN = parseFloat(amount) || 0;
    const ref = `REFERRAL_ADMIN_${Date.now()}`;

    if (action === 'award') {
      await wallet.credit(amountNGN, `Admin referral award: ${reason}`, null, ref);
      if (!user.referral) user.referral = {};
      user.referral.totalEarnings = (user.referral.totalEarnings || 0) + amountNGN;
    } else if (action === 'deduct') {
      if (wallet.balance < amountNGN) return res.status(400).json({ success: false, message: 'Insufficient wallet balance to deduct.' });
      await wallet.debit(amountNGN, `Admin referral deduction: ${reason}`, null, ref);
    } else if (action === 'approve_pending') {
      // Move pendingEarnings to wallet
      const pending = user.referral?.pendingEarnings || 0;
      if (pending <= 0) return res.status(400).json({ success: false, message: 'No pending referral earnings.' });
      await wallet.credit(pending, `Referral reward approved: ${reason}`, null, ref);
      user.referral.totalEarnings = (user.referral.totalEarnings || 0) + pending;
      user.referral.pendingEarnings = 0;
    }

    await user.save();

    res.json({ success: true, message: `Referral ${action} completed.`, data: { userId, action, amount: amountNGN, ref } });
  } catch (err) {
    console.error('adjustReferralCredit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   NEWSLETTER SUBSCRIBERS — View & export list
========================================================= */
const getNewsletterSubscribers = async (req, res) => {
  try {
    // If you build a Subscriber model later, query it here.
    // For now: subscribers are logged to console on backend + emailed to admin.
    // Return placeholder so admin UI can show the list once model exists.
    res.json({
      success: true,
      message: 'Newsletter subscribers are currently emailed to support@dealcross.net on signup. Wire to a subscriber model or Resend Audience for full list management.',
      data: { subscribers: [], total: 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   CONTACT FORM INBOX — View submissions (if logged to DB)
========================================================= */
const getContactSubmissions = async (req, res) => {
  try {
    // Contact submissions currently go directly to email via Resend.
    // This endpoint is ready for when you add a ContactSubmission model.
    res.json({
      success: true,
      message: 'Contact submissions are currently forwarded to support@dealcross.net via Resend. Add a ContactSubmission model to log them to the database.',
      data: { submissions: [], total: 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   EXPORT ALL FUNCTIONS
========================================================= */
module.exports = {
  login,
  getDashboardStats,
  getTransactions,
  getTransactionDetails,
  getDisputes,
  resolveDispute,
  assignDispute,
  getUsers,
  getUserDetails,
  changeUserTier,
  toggleUserStatus,
  reviewKYC,
  getPlatformStats,
  getAnalytics,
  getAdmins,
  createSubAdmin,
  updateSubAdminPermissions,
  toggleAdminStatus,
  deleteSubAdmin,
  getFeeSettings,
  updateFeeSettings,
  bulkUpdateTierFees,
  updateGatewayCosts,
  getFeeSettingsHistory,
  resetFeesToDefault,
  forceCompleteEscrow,
  forceCancelEscrow,
  banUser,
  unbanUser,
  broadcastNotification,
  getUserWallet,
  adminCreditWallet,
  adminDebitWallet,
  getRevenueStats,
  getWithdrawalSettings,
  updateWithdrawalSettings,
  // ── New features ──────────────────────────────────────────
  getWalletDeposits,
  unlockKYCFields,
  getKYCQueue,
  getReferralStats,
  adjustReferralCredit,
  getNewsletterSubscribers,
  getContactSubmissions,
};
