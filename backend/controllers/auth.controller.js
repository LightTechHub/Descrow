// backend/controllers/auth.controller.js
const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ---------- Helper: Generate JWT ----------
const generateToken = (userId, email = null) => {
  return jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// ---------- Helper: Get Clean Frontend URL ----------
const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL || 'http://localhost:3000';
  return url.replace(/\/$/, '');
};

/* ============================================================
   GOOGLE AUTH
============================================================ */
exports.googleAuth = async (req, res) => {
  try {
    const { credential, googleData } = req.body;

    let email, name, picture, googleId;

    if (credential) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleId = payload.sub;
    } else if (googleData) {
      ({ email, name, picture, googleId } = googleData);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google authentication data'
      });
    }

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google authentication data'
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.profilePicture = picture;
        user.authProvider = 'google';
        await user.save();
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is suspended. Contact support.'
        });
      }

      const token = generateToken(user._id, user.email);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
          isKYCVerified: user.isKYCVerified,
          profilePicture: user.profilePicture,
          tier: user.tier,
          role: user.role
        }
      });
    }

    return res.json({
      success: true,
      requiresProfileCompletion: true,
      googleData: {
        email,
        name,
        picture,
        googleId,
        emailVerified: true
      },
      message: 'Please complete your profile'
    });

  } catch (error) {
    console.error('❌ Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   Complete Google Profile
============================================================ */
exports.completeGoogleProfile = async (req, res) => {
  try {
    const {
      email,
      name,
      googleId,
      picture,
      phone,
      country,
      accountType,
      companyName,
      companyType,
      industry,
      agreedToTerms
    } = req.body;

    if (!email || !name || !phone || !country || !agreedToTerms) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

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
      phone,
      country,
      googleId,
      profilePicture: picture,
      authProvider: 'google',
      verified: true,
      accountType: accountType || 'individual',
      role: 'dual',
      tier: 'free',
      agreedToTerms: true,
      agreedToTermsAt: new Date(),
      password: Math.random().toString(36) + Math.random().toString(36),
      
      ...(accountType === 'business' && {
        businessInfo: {
          companyName,
          companyType,
          industry
        }
      })
    });

    emailService.sendWelcomeEmail(user.email, user.name).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    const token = generateToken(user._id, user.email);

    console.log('✅ Google user profile completed:', user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        isKYCVerified: user.isKYCVerified || false,
        profilePicture: user.profilePicture,
        tier: user.tier,
        role: user.role,
        accountType: user.accountType
      }
    });

  } catch (error) {
    console.error('❌ Complete Google profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   REGISTER
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
      verified: false,
      authProvider: 'local'
    });

    const verificationToken = generateToken(user._id);

    emailService.sendVerificationEmail(user.email, user.name, verificationToken)
      .catch(err => console.error('Failed to send verification email:', err));

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
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   LOGIN
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
        isKYCVerified: user.isKYCVerified || false,
        profilePicture: user.profilePicture,
        kycStatus: user.kycStatus
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   VERIFY EMAIL (API endpoint - FIXED)
============================================================ */
exports.verifyEmail = async (req, res) => {
  try {
    // Get token from query params, route params, or body
    const token = req.query.token || req.params.token || req.body.token;

    // Validate token exists and is not literally "undefined"
    if (!token || token === 'undefined' || token.trim() === '') {
      console.log('❌ Missing or invalid token:', token);
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    console.log('📧 Verifying email with token:', token.substring(0, 20) + '...');

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
      return res.status(200).json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true
      });
    }

    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();

    console.log('✅ Email verified successfully for user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('❌ Verify email error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired',
        expired: true
      });
    }

    res.status(400).json({
      success: false,
      message: 'Email verification failed'
    });
  }
};

/* ============================================================
   RESEND VERIFICATION
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

    console.log('✅ Verification email resent to:', user.email);

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
   FORGOT PASSWORD
============================================================ */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
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
   RESET PASSWORD
============================================================ */
exports.resetPassword = async (req, res) => {
  try {
    // Support both query and route params
    const token = req.query.token || req.params.token || req.body.token;
    const { password } = req.body;

    if (!token || token === 'undefined' || token.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

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
   LOGOUT
============================================================ */
exports.logout = async (req, res) => {
  try {
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
   REFRESH TOKEN
============================================================ */
exports.refreshToken = async (req, res) => {
  try {
    const userId = req.user.id;

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

module.exports = exports;