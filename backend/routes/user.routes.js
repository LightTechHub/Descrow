const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');
const { uploadMultiple } = require('../middleware/upload.middleware');
const { body } = require('express-validator');

// ======================================================
// ===================== PROTECTED ======================
// ======================================================

// Protect all routes
router.use(authenticate);

// ======================================================
// ===================== PROFILE ========================
// ======================================================

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

// ======================================================
// ======================= KYC ==========================
// ======================================================


// didit route
router.post('/kyc/start', userController.startKYCVerification);
router.get('/kyc/status', userController.checkKYCStatus);

// ======================================================
// ================== TIER UPGRADE ======================
// ======================================================

// Get tier information
router.get('/tier-info', userController.getTierInfo);

// Calculate upgrade benefits
router.get('/tier-upgrade/benefits', userController.calculateUpgradeBenefits);

// Initiate tier upgrade (payment)
router.post(
  '/tier-upgrade/initiate',
  [
    body('targetTier')
      .isIn(['growth', 'enterprise', 'api'])
      .withMessage('Invalid tier. Choose: growth, enterprise, or api'),
    body('currency')
      .optional()
      .isIn(['USD', 'NGN'])
      .withMessage('Currency must be USD or NGN'),
    body('paymentMethod')
      .optional()
      .notEmpty()
      .withMessage('Payment method required')
  ],
  userController.initiateTierUpgrade
);

// Complete tier upgrade (after payment verification)
router.post(
  '/tier-upgrade/complete',
  [
    body('paymentReference')
      .notEmpty()
      .withMessage('Payment reference required'),
    body('targetTier')
      .isIn(['growth', 'enterprise', 'api'])
      .withMessage('Invalid tier')
  ],
  userController.completeTierUpgrade
);

// Subscription management
router.post('/subscription/cancel', userController.cancelSubscription);
router.post('/subscription/renew', userController.renewSubscription);

// ======================================================
// ==================== STATISTICS ======================
// ======================================================

router.get('/statistics', userController.getUserStatistics);

// ======================================================
// ======================== 2FA ==========================
// ======================================================

router.post('/2fa/enable', userController.enable2FA);
router.post('/2fa/verify', userController.verify2FA);
router.post('/2fa/disable', userController.disable2FA);

module.exports = router;