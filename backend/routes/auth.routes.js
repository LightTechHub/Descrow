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
 * POST /api/auth/verify-email  -> Used by frontend when token is in URL
 * GET  /api/auth/verify/:token -> Used when user clicks link in email (redirects)
 */
router.post('/verify-email', authController.verifyEmail);
router.get('/verify/:token', authController.verifyEmailRedirect);

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

/* ============================================================
   ✅ VERIFY EMAIL (POST endpoint for frontend)
============================================================ */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }
    
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }
    
    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    console.error('❌ Verify email error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token'
    });
  }
};

/* ============================================================
   ✅ VERIFY EMAIL REDIRECT (GET endpoint - redirects to frontend)
============================================================ */
exports.verifyEmailRedirect = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.redirect(`${getFrontendUrl()}/login?verified=error&message=User not found`);
    }
    
    if (user.verified) {
      return res.redirect(`${getFrontendUrl()}/login?verified=already`);
    }
    
    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();
    
    // Redirect to login with success message
    res.redirect(`${getFrontendUrl()}/login?verified=success`);
  } catch (error) {
    console.error('❌ Verify email redirect error:', error);
    res.redirect(`${getFrontendUrl()}/login?verified=error&message=Invalid token`);
  }
};

/* ============================================================
   📧 RESEND VERIFICATION EMAIL
============================================================ */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }
    
    if (user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }
    
    const verificationToken = generateToken(user._id);
    
    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);
    
    res.status(200).json({
      success: true,
      message: 'Verification email sent! Check your inbox.'
    });
  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email'
    });
  }
};

/* ============================================================
   🔑 FORGOT PASSWORD
============================================================ */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Don't reveal if user exists or not (security)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a password reset link has been sent'
      });
    }
    
    const resetToken = generateToken(user._id);
    
    try {
      await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }
    
    res.status(200).json({
      success: true,
      message: 'If that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
};

/* ============================================================
   🔄 RESET PASSWORD
============================================================ */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Invalid reset token'
      });
    }
    
    // Update password (will be hashed by pre-save middleware)
    user.password = password;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }
};

/* ============================================================
   🔄 REFRESH TOKEN
============================================================ */
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Verify old token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }
    
    // Generate new token
    const newToken = generateToken(user._id, user.email);
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('❌ Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = router;