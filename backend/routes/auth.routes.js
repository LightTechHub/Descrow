const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { body } = require('express-validator');
const emailService = require('../services/email.service');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth.middleware');

/**
 * ============================================================
 * 🔵 GOOGLE AUTHENTICATION
 * ============================================================
 */
router.post('/google', authController.googleAuth);

/**
 * ✅ NEW: Complete Google profile after OAuth
 */
router.post('/google/complete-profile', authController.completeGoogleProfile);

/**
 * ============================================================
 * 📝 REGISTER
 * ============================================================
 */
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

/**
 * ============================================================
 * 🔑 LOGIN
 * ============================================================
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
  authController.login
);

/**
 * ============================================================
 * ✅ EMAIL VERIFICATION
 * ============================================================
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * 📧 Resend verification email
 */
router.post('/resend-verification', authController.resendVerification);

/**
 * ============================================================
 * 🔑 PASSWORD MANAGEMENT
 * ============================================================
 */
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

/**
 * ✅ NEW: Set password for OAuth users
 */
router.post('/set-password', protect, authController.setPassword);

/**
 * ✅ NEW: Check if user needs to set password
 */
router.get('/password-status', protect, authController.checkPasswordStatus);

/**
 * ============================================================
 * 🔄 TOKEN REFRESH
 * ============================================================
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * ============================================================
 * 🚪 LOGOUT
 * ============================================================
 */
router.post('/logout', authController.logout);

/**
 * ============================================================
 * 🧪 DEV: TEST EMAIL (Development only)
 * ============================================================
 */
if (process.env.NODE_ENV === 'development') {
  router.get('/dev/test-email', async (req, res) => {
    try {
      const email = req.query.email;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const testToken = jwt.sign(
        { id: 'test-user-id' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      await emailService.sendVerificationEmail(
        email,
        'Test User',
        testToken
      );

      res.status(200).json({
        success: true,
        message: `Test email sent to ${email}`,
        token: testToken
      });
    } catch (error) {
      console.error('❌ Dev test email error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: error.message
      });
    }
  });
}

// backend/routes/auth.routes.js - ADD THIS TEMPORARY DEBUG ENDPOINT

/**
 * 🔍 DEBUG: Check if Google user exists
 * POST /api/auth/google/debug
 */
router.post('/google/debug', async (req, res) => {
  try {
    const { googleId, email } = req.body;
    
    console.log('🔍 Debugging Google user:', { googleId, email });
    
    // Search by googleId
    const userByGoogleId = await User.findOne({ googleId });
    
    // Search by email
    const userByEmail = await User.findOne({ email: email?.toLowerCase() });
    
    // Search by either
    const userByEither = await User.findOne({
      $or: [
        { googleId },
        { email: email?.toLowerCase() }
      ]
    });
    
    res.json({
      success: true,
      debug: {
        searchCriteria: { googleId, email },
        foundByGoogleId: userByGoogleId ? {
          _id: userByGoogleId._id,
          email: userByGoogleId.email,
          googleId: userByGoogleId.googleId,
          accountType: userByGoogleId.accountType,
          agreedToTerms: userByGoogleId.agreedToTerms
        } : null,
        foundByEmail: userByEmail ? {
          _id: userByEmail._id,
          email: userByEmail.email,
          googleId: userByEmail.googleId,
          accountType: userByEmail.accountType,
          agreedToTerms: userByEmail.agreedToTerms
        } : null,
        foundByEither: userByEither ? {
          _id: userByEither._id,
          email: userByEither.email,
          googleId: userByEither.googleId,
          accountType: userByEither.accountType,
          agreedToTerms: userByEither.agreedToTerms
        } : null,
        totalGoogleUsers: await User.countDocuments({ authProvider: 'google' })
      }
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;