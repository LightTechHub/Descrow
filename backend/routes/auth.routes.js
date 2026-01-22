const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth.middleware');

// ────────────────────────────────────────────────
// GOOGLE AUTH
// ────────────────────────────────────────────────
router.post('/google', authController.googleAuth);
router.post('/google/complete-profile', authController.completeGoogleProfile);

// ────────────────────────────────────────────────
// REGISTER & LOGIN
// ────────────────────────────────────────────────
// IMPORTANT: NO protect middleware here — otherwise 403 on login when already logged in but unverified
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
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

// ────────────────────────────────────────────────
// EMAIL VERIFICATION
// ────────────────────────────────────────────────
// Allow both GET (email link click) and POST (frontend call)
router.get('/verify-email/:token', authController.verifyEmail);          // for direct email link clicks
router.post('/verify-email', authController.verifyEmail);               // for frontend AJAX call

router.post('/resend-verification', authController.resendVerification);

// ────────────────────────────────────────────────
// PASSWORD MANAGEMENT
// ────────────────────────────────────────────────
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// ────────────────────────────────────────────────
// PROTECTED ROUTES (these can have protect)
// ────────────────────────────────────────────────
router.post('/set-password', protect, authController.setPassword);
router.get('/password-status', protect, authController.checkPasswordStatus);
router.post('/refresh-token', protect, authController.refreshToken);
router.post('/logout', protect, authController.logout);

// ────────────────────────────────────────────────
// DEV / DEBUG (keep only in development)
// ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  router.get('/dev/test-email', async (req, res) => {
    // ... (your existing test code)
  });

  router.post('/google/debug', async (req, res) => {
    // ... (your existing debug code)
  });
}

module.exports = router;