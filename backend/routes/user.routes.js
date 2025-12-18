const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');
const { uploadMultiple } = require('../middleware/upload.middleware');
const { body } = require('express-validator');

// ======================================================
// ===================== PROTECTED ======================
// ======================================================

router.get('/me', authenticate, userController.getProfile);

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

router.post('/kyc/start', userController.startKYCVerification);
router.get('/kyc/status', userController.checkKYCStatus);
router.post('/kyc/reset', userController.resetKYCVerification);
router.post('/kyc/force-sync', userController.forceSyncKYC);

// ======================================================
// ================== TIER UPGRADE ======================
// ======================================================

router.get('/tier-info', userController.getTierInfo);
router.get('/tier-upgrade/benefits', userController.calculateUpgradeBenefits);
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

router.post('/subscription/cancel', userController.cancelSubscription);
router.post('/subscription/renew', userController.renewSubscription);

// ======================================================
// ==================== STATISTICS ======================
// ======================================================

router.get('/statistics', userController.getUserStatistics);

// ======================================================
// ======================== 2FA =========================
// ======================================================

router.post('/2fa/enable', userController.enable2FA);
router.post('/2fa/verify', userController.verify2FA);
router.post('/2fa/disable', userController.disable2FA);

module.exports = router;