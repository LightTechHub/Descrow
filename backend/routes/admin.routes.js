// backend/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protectAdmin, checkPermission, masterOnly } = require('../middleware/admin.middleware');
const { body } = require('express-validator');



router.get('/debug-token', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.json({ error: 'no token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const Admin = require('../models/Admin.model');
    const admin = await Admin.findById(decoded.id);
    res.json({
      decoded,
      adminFound: !!admin,
      adminId: admin?._id,
      jwtSecretSet: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length
    });
  } catch (err) {
    res.json({ error: err.message, name: err.name });
  }
});
```

Push, then in Postman:
```
GET https://descrow-backend-5ykg.onrender.com/api/admin/debug-token
Authorization: Bearer YOUR_FRESH_TOKEN


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
router.get(
  '/transactions',
  protectAdmin,
  checkPermission('viewTransactions'),
  adminController.getTransactions
);

router.get(
  '/transactions/:transactionId',
  protectAdmin,
  checkPermission('viewTransactions'),
  adminController.getTransactionDetails
);

// ----------------- Disputes -----------------
router.get(
  '/disputes',
  protectAdmin,
  checkPermission('manageDisputes'),
  adminController.getDisputes
);

router.put(
  '/disputes/:disputeId/assign',
  protectAdmin,
  checkPermission('manageDisputes'),
  adminController.assignDispute
);

router.put(
  '/disputes/:disputeId/resolve',
  protectAdmin,
  checkPermission('manageDisputes'),
  adminController.resolveDispute
);

// ----------------- Users -----------------
router.get(
  '/users',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.getUsers
);

router.get(
  '/users/:userId',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.getUserDetails
);

router.put(
  '/users/:userId/tier',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.changeUserTier
);

router.put(
  '/users/:userId/kyc',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.reviewKYC
);

router.put(
  '/users/:userId/toggle-status',
  protectAdmin,
  checkPermission('verifyUsers'),
  adminController.toggleUserStatus
);

// ----------------- Analytics & Stats -----------------
router.get(
  '/analytics',
  protectAdmin,
  checkPermission('viewAnalytics'),
  adminController.getAnalytics
);

router.get(
  '/platform-stats',
  protectAdmin,
  checkPermission('viewAnalytics'),
  adminController.getPlatformStats
);

// ======================================================
// ========== ADMIN MANAGEMENT (MASTER ONLY) ============
// ======================================================

router.get(
  '/admins',
  protectAdmin,
  masterOnly,
  adminController.getAdmins
);

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

router.put(
  '/admins/:adminId/permissions',
  protectAdmin,
  masterOnly,
  [
    body('permissions').isObject().withMessage('Permissions must be an object')
  ],
  adminController.updateSubAdminPermissions
);

router.put(
  '/admins/:adminId/toggle-status',
  protectAdmin,
  masterOnly,
  adminController.toggleAdminStatus
);

router.delete(
  '/admins/:adminId',
  protectAdmin,
  masterOnly,
  adminController.deleteSubAdmin
);

// ======================================================
// =========== FEE MANAGEMENT (MASTER ONLY) =============
// ======================================================

router.get(
  '/fees',
  protectAdmin,
  masterOnly,
  adminController.getFeeSettings
);

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

router.get(
  '/fees/history',
  protectAdmin,
  masterOnly,
  adminController.getFeeSettingsHistory
);

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
