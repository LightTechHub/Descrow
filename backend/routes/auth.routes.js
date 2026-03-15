const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth.middleware');

// ── GOOGLE AUTH ──────────────────────────────────────────────────────────────
router.post('/google', authController.googleAuth);
router.post('/google/complete-profile', authController.completeGoogleProfile);

// ── REGISTER & LOGIN ─────────────────────────────────────────────────────────
// NO protect middleware here - 403 on login when already logged in but unverified
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  authController.register
);
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  authController.login
);

// ── 2FA LOGIN COMPLETION ─────────────────────────────────────────────────────
// Called after login() returns requires2FA: true
// Body: { tempToken, code }  - no protect middleware needed (tempToken is the auth)
router.post('/2fa/verify-login', authController.verify2FALogin);

// ── EMAIL VERIFICATION ───────────────────────────────────────────────────────
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// ── PASSWORD MANAGEMENT ──────────────────────────────────────────────────────
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// ── PROTECTED ROUTES ─────────────────────────────────────────────────────────
router.post('/set-password', protect, authController.setPassword);
router.get('/password-status', protect, authController.checkPasswordStatus);
router.post('/refresh-token', protect, authController.refreshToken);
router.post('/logout', protect, authController.logout);

// ── DEV / DEBUG ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  router.get('/dev/test-email', async (req, res) => {
    res.json({ message: 'test endpoint' });
  });
  router.post('/google/debug', async (req, res) => {
    res.json({ body: req.body });
  });
}

module.exports = router;
