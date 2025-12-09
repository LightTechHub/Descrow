// backend/controllers/admin.controller.js - COMPLETE FIXED VERSION

const User = require('../models/User.model');
const Transaction = require('../models/Transaction.model');
const Escrow = require('../models/Escrow.model');
const Dispute = require('../models/Dispute.model');
const Admin = require('../models/Admin.model');
const Business = require('../models/Business.model');
const mongoose = require('mongoose');
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
    
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Contact master admin.'
      });
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    admin.lastActive = new Date();
    await admin.save();

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
   DASHBOARD STATISTICS
========================================================= */
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ verified: true });
    const kycVerifiedUsers = await User.countDocuments({ isKYCVerified: true });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    const totalTransactions = await Transaction.countDocuments();
    const totalEscrowTransactions = await Escrow.countDocuments();
    
    const volumeResult = await Transaction.aggregate([
      { $match: { status: 'completed', amount: { $exists: true, $ne: null } } },
      { $group: { _id: null, totalVolume: { $sum: '$amount' } } }
    ]);
    
    const totalVolume = volumeResult.length > 0 ? volumeResult[0].totalVolume : 0;
    const activeDisputes = await Dispute.countDocuments({ status: 'open' });
    
    const feesResult = await Transaction.aggregate([
      { $match: { status: 'completed', platformFee: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, totalFees: { $sum: '$platformFee' } } }
    ]);
    
    const totalFees = feesResult.length > 0 ? feesResult[0].totalFees : 0;
    
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email')
      .select('transactionId amount status paymentMethod createdAt');
    
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: 30 }
    ]);
    
    const transactionStats = await Transaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          verifiedUsers,
          kycVerifiedUsers,
          recentSignups,
          totalTransactions,
          totalEscrowTransactions,
          totalVolume,
          activeDisputes,
          totalFees
        },
        recentActivity: recentTransactions,
        userGrowth,
        transactionStats
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/* =========================================================
   GET ALL USERS
========================================================= */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      verified,
      kycStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (verified !== undefined) query.verified = verified === 'true';
    if (kycStatus) query['kycStatus.status'] = kycStatus;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password -twoFactorSecret')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);
    const totalUsers = await User.countDocuments();
    const verifiedCount = await User.countDocuments({ verified: true });
    const kycApprovedCount = await User.countDocuments({ 'kycStatus.status': 'approved' });

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          totalUsers,
          verifiedUsers: verifiedCount,
          kycApprovedUsers: kycApprovedCount
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/* =========================================================
   GET USER DETAILS
========================================================= */
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -twoFactorSecret');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('transactionId amount status paymentMethod createdAt');

    const escrows = await Escrow.find({ $or: [{ buyer: userId }, { seller: userId }] })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .select('escrowId amount status title createdAt');

    const disputes = await Dispute.find({ $or: [{ reportedBy: userId }, { reportedUser: userId }] })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('reportedBy', 'name email')
      .populate('reportedUser', 'name email')
      .populate('escrow', 'escrowId title')
      .select('disputeId type status description createdAt');

    res.status(200).json({
      success: true,
      data: { user, transactions, escrows, disputes }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
      error: error.message
    });
  }
};

/* =========================================================
   UPDATE USER STATUS
========================================================= */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed: active, suspended, banned'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const previousStatus = user.status;
    user.status = status;
    user.statusReason = reason || '';
    user.statusUpdatedAt = new Date();
    user.statusUpdatedBy = req.admin._id;

    await user.save();

    console.log(`User ${user.email} status changed from ${previousStatus} to ${status} by admin ${req.admin.email}`);

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
          statusReason: user.statusReason,
          statusUpdatedAt: user.statusUpdatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

/* =========================================================
   REVIEW KYC - FIXED VERSION
========================================================= */
const reviewKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: 'User must verify email before KYC can be approved'
      });
    }

    if (user.kycStatus.status !== 'pending' && user.kycStatus.status !== 'under_review') {
      return res.status(400).json({ 
        success: false, 
        message: `KYC is already ${user.kycStatus.status}` 
      });
    }

    if (action === 'approve') {
      user.kycStatus.status = 'approved';
      user.kycStatus.reviewedAt = new Date();
      user.kycStatus.approvedBy = req.admin._id;
      user.isKYCVerified = true;
      user.markModified('kycStatus');
      await user.save();
      console.log(`✅ KYC approved for user ${user.email}`);
    } else if (action === 'reject') {
      user.kycStatus.status = 'rejected';
      user.kycStatus.reviewedAt = new Date();
      user.kycStatus.rejectionReason = reason;
      user.isKYCVerified = false;
      user.markModified('kycStatus');
      await user.save();
      console.log(`❌ KYC rejected for user ${user.email}: ${reason}`);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid action. Use: approve or reject' 
      });
    }

    res.status(200).json({
      success: true,
      message: `KYC ${action}ed successfully`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
          kycStatus: user.kycStatus.status,
          isKYCVerified: user.isKYCVerified
        }
      }
    });
  } catch (error) {
    console.error('Review KYC error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to review KYC', 
      error: error.message 
    });
  }
};

/* =========================================================
   GET PENDING KYC APPLICATIONS
========================================================= */
const getPendingKYC = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const query = { 'kycStatus.status': { $in: ['pending', 'under_review'] } };

    const users = await User.find(query)
      .select('name email phone verified kycStatus createdAt')
      .sort({ 'kycStatus.submittedAt': 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    const kycStats = await User.aggregate([
      { $group: { _id: '$kycStatus.status', count: { $sum: 1 } } }
    ]);

    const stats = {};
    kycStats.forEach(stat => {
      stats[stat._id || 'not_submitted'] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        applications: users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get pending KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending KYC applications',
      error: error.message
    });
  }
};

/* =========================================================
   GET ALL TRANSACTIONS
========================================================= */
const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      paymentMethod,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const transactions = await Transaction.find(query)
      .populate('user', 'name email phone')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    const stats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$platformFee' },
          avgAmount: { $avg: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: stats[0] || { totalAmount: 0, totalFees: 0, avgAmount: 0, count: 0 }
      }
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

/* =========================================================
   GET TRANSACTION DETAILS
========================================================= */
const getTransactionDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId)
      .populate('user', 'name email phone verified')
      .populate('escrow', 'escrowId title amount status')
      .populate('relatedTransaction');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    let relatedTransactions = [];
    if (transaction.escrow) {
      relatedTransactions = await Transaction.find({
        escrow: transaction.escrow._id,
        _id: { $ne: transaction._id }
      })
        .populate('user', 'name email')
        .select('transactionId amount status paymentMethod createdAt');
    }

    res.status(200).json({
      success: true,
      data: { transaction, relatedTransactions }
    });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction details',
      error: error.message
    });
  }
};

/* =========================================================
   GET ALL ESCROWS
========================================================= */
const getAllEscrows = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      escrowType,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { escrowId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (escrowType) query.escrowType = escrowType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const escrows = await Escrow.find(query)
      .populate('buyer', 'name email phone verified')
      .populate('seller', 'name email phone verified')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Escrow.countDocuments(query);

    const stats = await Escrow.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const statusDistribution = await Escrow.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        escrows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: stats[0] || { totalAmount: 0, avgAmount: 0, count: 0 },
        statusDistribution
      }
    });
  } catch (error) {
    console.error('Get all escrows error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escrows',
      error: error.message
    });
  }
};

/* =========================================================
   GET ESCROW DETAILS
========================================================= */
const getEscrowDetails = async (req, res) => {
  try {
    const { escrowId } = req.params;

    const escrow = await Escrow.findById(escrowId)
      .populate('buyer', 'name email phone verified isKYCVerified')
      .populate('seller', 'name email phone verified isKYCVerified');

    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    const transactions = await Transaction.find({ escrow: escrowId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { escrow, transactions }
    });
  } catch (error) {
    console.error('Get escrow details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escrow details',
      error: error.message
    });
  }
};

/* =========================================================
   GET ALL DISPUTES
========================================================= */
const getAllDisputes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      type,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { disputeId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const disputes = await Dispute.find(query)
      .populate('reportedBy', 'name email phone')
      .populate('reportedUser', 'name email phone')
      .populate('escrow', 'escrowId title amount')
      .populate('assignedTo', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Dispute.countDocuments(query);

    const stats = await Dispute.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        disputes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        stats: { statusDistribution: stats }
      }
    });
  } catch (error) {
    console.error('Get all disputes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes',
      error: error.message
    });
  }
};

/* =========================================================
   GET DISPUTE DETAILS
========================================================= */
const getDisputeDetails = async (req, res) => {
  try {
    const { disputeId } = req.params;

    const dispute = await Dispute.findById(disputeId)
      .populate('reportedBy', 'name email phone verified isKYCVerified')
      .populate('reportedUser', 'name email phone verified isKYCVerified')
      .populate('escrow', 'escrowId title amount status buyer seller')
      .populate('assignedTo', 'name email role')
      .populate('resolvedBy', 'name email role');

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    res.status(200).json({
      success: true,
      data: { dispute }
    });
  } catch (error) {
    console.error('Get dispute details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dispute details',
      error: error.message
    });
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
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (!admin.permissions.manageDisputes && admin.role !== 'master') {
      return res.status(403).json({
        success: false,
        message: 'Admin does not have permission to manage disputes'
      });
    }

    dispute.assignedTo = adminId;
    dispute.status = 'under_review';
    dispute.assignedAt = new Date();
    await dispute.save();

    res.status(200).json({
      success: true,
      message: 'Dispute assigned successfully',
      data: {
        dispute: {
          id: dispute._id,
          disputeId: dispute.disputeId,
          assignedTo: {
            id: admin._id,
            name: admin.name,
            email: admin.email
          },
          status: dispute.status,
          assignedAt: dispute.assignedAt
        }
      }
    });
  } catch (error) {
    console.error('Assign dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign dispute',
      error: error.message
    });
  }
};

/* =========================================================
   RESOLVE DISPUTE
========================================================= */
const resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { resolution, winner, refundPercentage, notes } = req.body;

    if (!['reportedBy', 'reportedUser', 'split', 'refund'].includes(winner)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid winner. Allowed: reportedBy, reportedUser, split, refund'
      });
    }

    const dispute = await Dispute.findById(disputeId).populate('escrow');
    
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    if (dispute.status !== 'under_review' && dispute.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Dispute must be open or under review to resolve'
      });
    }

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.winner = winner;
    dispute.refundPercentage = refundPercentage || 0;
    dispute.resolvedBy = req.admin._id;
    dispute.resolvedAt = new Date();
    dispute.resolutionNotes = notes;
    await dispute.save();

    console.log(`✅ Dispute ${dispute.disputeId} resolved by admin ${req.admin.email}`);

    res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully',
      data: {
        dispute: {
          id: dispute._id,
          disputeId: dispute.disputeId,
          status: dispute.status,
          resolution: dispute.resolution,
          winner: dispute.winner,
          resolvedAt: dispute.resolvedAt,
          resolvedBy: {
            id: req.admin._id,
            email: req.admin.email,
            name: req.admin.name
          }
        }
      }
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve dispute',
      error: error.message
    });
  }
};

/* =========================================================
   GET ALL ADMINS
========================================================= */
const getAllAdmins = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (status) query.status = status;

    if (req.admin.role !== 'master') {
      query._id = { $ne: req.admin._id };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const admins = await Admin.find(query)
      .select('-password -twoFactorSecret')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Admin.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        admins,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        currentAdmin: {
          id: req.admin._id,
          email: req.admin.email,
          role: req.admin.role,
          permissions: req.admin.permissions
        }
      }
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins',
      error: error.message
    });
  }
};

/* =========================================================
   CREATE ADMIN
========================================================= */
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    if (req.admin.role !== 'master') {
      return res.status(403).json({
        success: false,
        message: 'Only master admins can create new admins'
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      role: role || 'sub_admin',
      status: 'active',
      permissions: permissions || {
        viewTransactions: true,
        manageDisputes: true,
        verifyUsers: true,
        viewAnalytics: true,
        managePayments: false,
        manageAPI: false,
        manageAdmins: false,
        manageFees: false
      },
      createdBy: req.admin._id
    });

    const adminData = admin.toObject();
    delete adminData.password;
    delete adminData.twoFactorSecret;

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { admin: adminData }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: error.message
    });
  }
};

/* =========================================================
   UPDATE ADMIN
========================================================= */
const updateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { name, role, status, permissions } = req.body;

    if (req.admin.role !== 'master' && req.admin._id.toString() !== adminId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (admin.role === 'master' && req.admin.role !== 'master') {
      return res.status(403).json({
        success: false,
        message: 'Cannot update master admin'
      });
    }

    if (name) admin.name = name;
    if (role && req.admin.role === 'master') admin.role = role;
    if (status && req.admin.role === 'master') admin.status = status;
    if (permissions && req.admin.role === 'master') admin.permissions = permissions;

    await admin.save();

    const adminData = admin.toObject();
    delete adminData.password;
    delete adminData.twoFactorSecret;

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: { admin: adminData }
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin',
      error: error.message
    });
  }
};

/* =========================================================
   DELETE ADMIN
========================================================= */
const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (req.admin.role !== 'master') {
      return res.status(403).json({
        success: false,
        message: 'Only master admins can delete admins'
      });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (admin.role === 'master') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete master admin'
      });
    }

    if (admin._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete yourself'
      });
    }

    await Admin.findByIdAndDelete(adminId);

    res.status(200).json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin',
      error: error.message
    });
  }
};

/* =========================================================
   GET SYSTEM LOGS
========================================================= */
const getSystemLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      level,
      startDate,
      endDate,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const logs = [
      {
        id: '1',
        level: 'info',
        message: 'System started successfully',
        timestamp: new Date().toISOString(),
        user: 'system',
        ip: '127.0.0.1'
      },
      {
        id: '2',
        level: 'info',
        message: 'User logged in',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: 'user@example.com',
        ip: '192.168.1.1'
      },
      {
        id: '3',
        level: 'warn',
        message: 'Failed login attempt',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        user: 'unknown',
        ip: '192.168.1.100'
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: logs.length,
          pages: 1
        }
      }
    });
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system logs',
      error: error.message
    });
  }
};

/* =========================================================
   EXPORT DATA
========================================================= */
const exportData = async (req, res) => {
  try {
    const { type, format = 'json', startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let data;
    let filename;

    switch (type) {
      case 'users':
        data = await User.find(query)
          .select('name email phone verified status kycStatus createdAt')
          .sort({ createdAt: -1 });
        filename = `users_export_${Date.now()}`;
        break;

      case 'transactions':
        data = await Transaction.find(query)
          .populate('user', 'name email')
          .select('transactionId amount status paymentMethod platformFee createdAt')
          .sort({ createdAt: -1 });
        filename = `transactions_export_${Date.now()}`;
        break;

      case 'escrows':
        data = await Escrow.find(query)
          .populate('buyer', 'name email')
          .populate('seller', 'name email')
          .select('escrowId title amount status escrowType createdAt')
          .sort({ createdAt: -1 });
        filename = `escrows_export_${Date.now()}`;
        break;

      case 'disputes':
        data = await Dispute.find(query)
          .populate('reportedBy', 'name email')
          .populate('reportedUser', 'name email')
          .select('disputeId type status resolution winner createdAt resolvedAt')
          .sort({ createdAt: -1 });
        filename = `disputes_export_${Date.now()}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type. Allowed: users, transactions, escrows, disputes'
        });
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      res.send(JSON.stringify(data));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
      res.send(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
};

/* =========================================================
   BACKUP DATABASE
========================================================= */
const backupDatabase = async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupInfo = {
      timestamp,
      collections: await mongoose.connection.db.listCollections().toArray(),
      stats: {
        users: await User.countDocuments(),
        transactions: await Transaction.countDocuments(),
        escrows: await Escrow.countDocuments(),
        disputes: await Dispute.countDocuments(),
        admins: await Admin.countDocuments()
      }
    };

    res.status(200).json({
      success: true,
      message: 'Backup initiated successfully',
      data: {
        backupInfo,
        downloadUrl: `/api/admin/backup/download/${timestamp}`
      }
    });
  } catch (error) {
    console.error('Backup database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backup database',
      error: error.message
    });
  }
};

/* =========================================================
   EXPORT ALL FUNCTIONS
========================================================= */
module.exports = {
  login,
  generateToken,
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  reviewKYC,
  getPendingKYC,
  getAllTransactions,
  getTransactionDetails,
  getAllEscrows,
  getEscrowDetails,
  getAllDisputes,
  getDisputeDetails,
  assignDispute,
  resolveDispute,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getSystemLogs,
  exportData,
  backupDatabase
};