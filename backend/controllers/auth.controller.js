// backend/controllers/auth.controller.js
const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');
const { OAuth2Client } = require('google-auth-library'); // ✅ ADDED

// ✅ ADDED: Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
   🔵 GOOGLE AUTH - UPDATED
============================================================ */
exports.googleAuth = async (req, res) => {
  try {
    const { credential, googleData } = req.body;

    // ✅ NEW: Verify Google token if credential is provided
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
      // ✅ Fallback: Accept googleData directly (for testing/legacy)
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

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // ✅ EXISTING USER - Login directly
      if (!user.googleId) {
        user.googleId = googleId;
        user.profilePicture = picture;
        user.authProvider = 'google';
        await user.save();
      }

      // 🚫 Block suspended users
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

    // ✅ NEW USER - Return data for profile completion
    return res.json({
      success: true,
      requiresProfileCompletion: true,
      googleData: {
        email,
        name,
        picture,
        googleId,
        emailVerified: true // Google emails are pre-verified
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
   ✅ NEW: Complete Google Profile
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
      accountType, // 'individual' or 'business'
      // Business fields (optional)
      companyName,
      companyType,
      industry,
      agreedToTerms
    } = req.body;

    // Validate required fields
    if (!email || !name || !phone || !country || !agreedToTerms) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user with a random secure password (not used for Google login)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      country,
      googleId,
      profilePicture: picture,
      authProvider: 'google',
      verified: true, // ✅ Google emails are pre-verified
      accountType: accountType || 'individual',
      role: 'dual',
      tier: 'free',
      agreedToTerms: true,
      agreedToTermsAt: new Date(),
      password: Math.random().toString(36) + Math.random().toString(36), // Random password
      
      // Business fields
      ...(accountType === 'business' && {
        businessInfo: {
          companyName,
          companyType,
          industry
        }
      })
    });

    // ✅ Send welcome email (background - don't block response)
    emailService.sendWelcomeEmail(user.email, user.name).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Generate token
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
      verified: false,
      authProvider: 'local'
    });

    const verificationToken = generateToken(user._id);

    // Send verification email (don't block response)
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

    // Update last login
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
   ✅ VERIFY EMAIL REDIRECT (GET endpoint - redirects to frontend)
============================================================ */
exports.verifyEmailRedirect = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findOne({ _id: decoded.id });
    
    const frontendUrl = getFrontendUrl();
    
    if (!user) {
      return res.redirect(`${frontendUrl}/login?verified=error&message=User+not+found`);
    }
    
    if (user.verified) {
      return res.redirect(`${frontendUrl}/login?verified=already`);
    }
    
    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();
    
    // Redirect to login with success message
    res.redirect(`${frontendUrl}/login?verified=success`);
  } catch (error) {
    console.error('❌ Verify email redirect error:', error);
    const frontendUrl = getFrontendUrl();
    res.redirect(`${frontendUrl}/login?verified=error&message=Invalid+token`);
  }
};

/* ============================================================
   ✅ VERIFY EMAIL (API endpoint)
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

module.exports = exports;