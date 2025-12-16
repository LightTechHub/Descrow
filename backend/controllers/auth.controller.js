// controllers/auth.controller.js
const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');

// -------------------- Helper: Generate JWT --------------------
const generateToken = (userId, email = null) => {
  return jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// -------------------- Helper: Get Clean Frontend URL --------------------
const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL || 'http://localhost:3000';
  return url.replace(/\/$/, '');
};

/* ============================================================
   🔵 GOOGLE AUTH
============================================================ */
exports.googleAuth = async (req, res) => {
  try {
    const { email, name, googleId, picture } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google authentication data'
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    // 🆕 Create user if not exists
    if (!user) {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        profilePicture: picture,
        verified: true, // ✅ Google emails are trusted
        role: 'dual',
        tier: 'free',
        password: Math.random().toString(36) + Math.random().toString(36)
      });
    }

    // 🚫 Block suspended users
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Contact support.'
      });
    }

    const token = generateToken(user._id, user.email);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        isKYCVerified: user.isKYCVerified || false,
        tier: user.tier,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('❌ Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
};

/* ============================================================
   📝 REGISTER
============================================================ */
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'dual',
      tier: 'free',
      verified: false
    });

    const verificationToken = generateToken(user._id);

    emailService.sendVerificationEmail(user.email, user.name, verificationToken)
      .catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      email: user.email
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

/* ============================================================
   🔑 LOGIN
============================================================ */
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        requiresVerification: true,
        email: user.email
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() }, { runValidators: false });

    const token = generateToken(user._id, user.email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tier: user.tier,
        verified: user.verified,
        kycStatus: user.kycStatus
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
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
    
    const user = await User.findOne({ _id: decoded.id });
    
    if (!user) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?verified=error&message=User+not+found`);
    }
    
    if (user.verified) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?verified=already`);
    }
    
    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();
    
    // Redirect to login with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?verified=success`);
  } catch (error) {
    console.error('❌ Verify email redirect error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?verified=error&message=Invalid+token`);
  }
};

/* ============================================================
   🚪 LOGOUT
============================================================ */
exports.logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled on the frontend
    // by removing the token from localStorage
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/* ============================================================
   🔄 REFRESH TOKEN
============================================================ */
exports.refreshToken = async (req, res) => {
  try {
    const userId = req.user.id; // From authenticate middleware
    
    const user = await User.findById(userId);
    
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
    const token = generateToken(user._id, user.email);
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed',
      token
    });
  } catch (error) {
    console.error('❌ Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
};

/* ============================================================
   ✅ VERIFY EMAIL
============================================================ */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token
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
      message: 'Email verified successfully'
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
   📧 RESEND VERIFICATION
============================================================ */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
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
    
    const verificationToken = generateToken(user._id);
    
    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);
    
    res.status(200).json({
      success: true,
      message: 'Verification email sent'
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
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a password reset link has been sent'
      });
    }
    
    const resetToken = generateToken(user._id);
    
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
    
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
    const { token } = req.params;
    const { password } = req.body;
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Invalid reset token'
      });
    }
    
    user.password = password;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
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
   (All other handlers remain unchanged below)
============================================================ */
// verifyEmail
// verifyEmailRedirect
// resendVerification
// forgotPassword
// resetPassword
// refreshToken