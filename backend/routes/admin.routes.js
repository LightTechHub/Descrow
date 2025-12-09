// backend/routes/admin.routes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protectAdmin, checkPermission, masterOnly } = require('../middleware/admin.middleware');
const { body } = require('express-validator');

// ======================================================
// =============== PUBLIC ADMIN ROUTES ==================
// ======================================================

// Admin Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  adminController.login
);

// ======================================================
// =============== PROTECTED ADMIN ROUTES ===============
// ======================================================

// Dashboard Overview
router.get(
  '/dashboard',
  protectAdmin,
  adminController.getDashboardStats
);

// ----------------- Transactions -----------------
// Get all transactions/escrows
router.get(
  '/transactions',
  protectAdmin,
  checkPermission('viewTransactions'),
  adminController.getTransactions
);

// Get transaction details
router.get(
  '/transactions/:transactionId',
  protectAdmin,
  checkPermission('viewTransactions'),
  adminController.getTransactionDetails
);

// ----------------- Disputes -----------------
// Get all disputes
router.get(
  '/disputes',
  protectAdmin,
  checkPermission('manageDisputes'),
  adminController.getDisputes
);

// Assign dispute to admin
router.put(
  '/disputes/:disputeId/assign',
  protectAdmin,
  checkPermission('manageDisputes'),
  adminController.assignDispute
);

// Resolve dispute
router.put(
  '/disputes/:disputeId/resolve',
  protectAdmin,
  checkPermission('manageDisputes'),
  adminController.resolveDispute
);

// ----------------- Users -----------------
// Get all users
router.get(
  '/users',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.getUsers
);

// Get user details
router.get(
  '/users/:userId',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.getUserDetails
);

// Change user tier
router.put(
  '/users/:userId/tier',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.changeUserTier
);

// Review KYC
router.put(
  '/users/:userId/kyc',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.reviewKYC
);

// Toggle user status (activate/suspend)
router.put(
  '/users/:userId/toggle-status',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.toggleUserStatus
);

// ----------------- Analytics & Stats -----------------
// Get analytics data
router.get(
  '/analytics',
  protectAdmin,
  checkPermission('viewAnalytics'),
  adminController.getAnalytics
);

// Get platform statistics
router.get(
  '/platform-stats',
  protectAdmin,
  checkPermission('viewAnalytics'),
  adminController.getPlatformStats
);

// ======================================================
// ========== ADMIN MANAGEMENT (MASTER ONLY) ============
// ======================================================

// Get all admins
router.get(
  '/admins',
  protectAdmin,
  masterOnly,
  adminController.getAdmins
);

// Create new sub-admin
router.post(
  '/admins',
  protectAdmin,
  masterOnly,
  [
    body('name').notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('permissions').optional().isObject().withMessage('Permissions must be an object')
  ],
  adminController.createSubAdmin
);

// Update sub-admin permissions
router.put(
  '/admins/:adminId/permissions',
  protectAdmin,
  masterOnly,
  [
    body('permissions').isObject().withMessage('Permissions must be an object')
  ],
  adminController.updateSubAdminPermissions
);

// Toggle sub-admin active/suspended state
router.put(
  '/admins/:adminId/toggle-status',
  protectAdmin,
  masterOnly,
  adminController.toggleAdminStatus
);

// Delete sub-admin
router.delete(
  '/admins/:adminId',
  protectAdmin,
  masterOnly,
  adminController.deleteSubAdmin
);

// ======================================================
// =========== FEE MANAGEMENT (MASTER ONLY) =============
// ======================================================

// Get current fee settings
router.get(
  '/fees',
  protectAdmin,
  masterOnly,
  adminController.getFeeSettings
);

// Update individual fee setting
router.put(
  '/fees/update',
  protectAdmin,
  masterOnly,
  [
    body('tier').isIn(['starter', 'growth', 'enterprise', 'api']).withMessage('Invalid tier'),
    body('feeType').isIn(['fees', 'monthlyCost', 'setupFee', 'maxTransactionAmount', 'maxTransactionsPerMonth']).withMessage('Invalid fee type'),
    body('field').optional().isString().withMessage('Field must be a string'),
    body('currency').optional().isIn(['NGN', 'USD', 'crypto']).withMessage('Invalid currency'),
    body('value').notEmpty().withMessage('Value required')
  ],
  adminController.updateFeeSettings
);

// Bulk update tier fees
router.put(
  '/fees/bulk-update',
  protectAdmin,
  masterOnly,
  [
    body('tier').isIn(['starter', 'growth', 'enterprise', 'api']).withMessage('Invalid tier'),
    body('updates').isObject().withMessage('Updates object required')
  ],
  adminController.bulkUpdateTierFees
);

// Update gateway costs
router.put(
  '/fees/gateway-costs',
  protectAdmin,
  masterOnly,
  [
    body('gateway').isIn(['paystack', 'flutterwave', 'crypto']).withMessage('Invalid gateway'),
    body('currency').optional().isIn(['NGN', 'USD']).withMessage('Invalid currency'),
    body('field').notEmpty().withMessage('Field required'),
    body('value').notEmpty().withMessage('Value required')
  ],
  adminController.updateGatewayCosts
);

// Get fee settings history
router.get(
  '/fees/history',
  protectAdmin,
  masterOnly,
  adminController.getFeeSettingsHistory
);

// Reset fees to default
router.post(
  '/fees/reset',
  protectAdmin,
  masterOnly,
  [
    body('tier').isIn(['starter', 'growth', 'enterprise', 'api', 'all']).withMessage('Invalid tier')
  ],
  adminController.resetFeesToDefault
);

module.exports = router;