const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');
const { uploadMultiple } = require('../middleware/upload.middleware');
const { body } = require('express-validator');

// ======================================================
// ===================== PUBLIC =========================
// ======================================================

// Public route - no auth required
router.get('/me', authenticate, userController.getProfile); // Fixed: needs auth

// ======================================================
// ============= PROTECT ALL ROUTES BELOW ===============
// ======================================================

router.use(authenticate);

// ======================================================
// ===================== PROFILE ========================
// ======================================================

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

// ✅ NEW: 2FA Status Route
router.get('/profile/2fa-status', async (req, res) => {
  try {
    const User = require('../models/User.model');
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled || false
      }
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch 2FA status' 
    });
  }
});

// ✅ NEW: Sessions Route
router.get('/profile/sessions', userController.getActiveSessions);

// ======================================================
// ======================= KYC ==========================
// ======================================================

// Didit routes
router.post('/kyc/start', userController.startKYCVerification);
router.get('/kyc/status', userController.checkKYCStatus);
router.post('/kyc/force-sync', userController.forceSyncKYC);
router.post('/kyc/reset', userController.resetKYCVerification);

// ✅ NEW: Debug KYC Route
router.get('/debug/kyc-status', userController.debugKYCStatus);

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
// ======================== 2FA =========================
// ======================================================

router.post('/2fa/enable', userController.enable2FA);
router.post('/2fa/verify', userController.verify2FA);
router.post('/2fa/disable', userController.disable2FA);

// ======================================================
// ================ NOTIFICATION SETTINGS ===============
// ======================================================

router.get('/notifications/preferences', userController.getNotificationPreferences);
router.put('/notifications/preferences', userController.updateNotificationPreferences);

// ======================================================
// ================= PRIVACY & SECURITY =================
// ======================================================

router.get('/privacy', userController.getPrivacySettings);
router.put('/privacy', userController.updatePrivacySettings);
router.get('/sessions', userController.getActiveSessions);
router.delete('/sessions/:sessionId', userController.revokeSession);
router.delete('/sessions', userController.revokeAllSessions);

// ======================================================
// ================ ACCOUNT MANAGEMENT ==================
// ======================================================

router.post('/account/delete-request', userController.requestAccountDeletion);
router.post('/account/cancel-deletion', userController.cancelAccountDeletion);
router.get('/account/export', userController.exportUserData);

// ======================================================
// =============== VERIFICATION STATUS ==================
// ======================================================

router.get('/verification-status', userController.getVerificationStatus);

// ======================================================
// =================== ACTIVITY LOG =====================
// ======================================================

router.get('/activity-log', userController.getActivityLog);
router.delete('/activity-log', userController.clearActivityLog);

module.exports = router;