const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { body } = require('express-validator');
const emailService = require('../services/email.service');
const jwt = require('jsonwebtoken');

/**
 * ---------------- GOOGLE AUTH ----------------
 */
router.post('/google', authController.googleAuth);

/**
 * ---------------- REGISTER ----------------
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
 * ---------------- LOGIN ----------------
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
 * ---------------- VERIFY EMAIL ----------------
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * ---------------- RESEND VERIFICATION ----------------
 */
router.post('/resend-verification', authController.resendVerification);

/**
 * ---------------- FORGOT & RESET PASSWORD ----------------
 */
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

/**
 * ---------------- REFRESH TOKEN ----------------
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * ---------------- DEV: TEST EMAIL ----------------
 */
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
      message: `Test email sent to ${email}`
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

module.exports = router;