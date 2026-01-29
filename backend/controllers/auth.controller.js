const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');

// Generate JWT
const generateToken = (userId, email = null) => {
  return jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/* ============================================================
   REGISTER (LOCAL - EMAIL/PASSWORD)
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

    const { name, email, password, phone, country, accountType, agreedToTerms, businessInfo } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase()
    });

    if (existingUser) {
      // Allow re-registration if deleted or unverified
      if (existingUser.status === 'deleted' || existingUser.deletedAt) {
        console.log('🗑️ Removing deleted account for re-registration:', email);
        await User.findByIdAndDelete(existingUser._id);
      } else if (!existingUser.verified) {
        console.log('📧 Removing unverified account for fresh registration:', email);
        await User.findByIdAndDelete(existingUser._id);
      } else {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered. Please login instead.'
        });
      }
    }

    // Create user
    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || undefined,
      accountType: accountType || 'individual',
      role: 'dual',
      tier: 'free',
      verified: false,
      status: 'active',
      authProvider: 'local',
      agreedToTerms: agreedToTerms || false,
      agreedToTermsAt: agreedToTerms ? new Date() : undefined
    };

    if (country) {
      userData.address = { country };
    }

    if (accountType === 'business' && businessInfo) {
      userData.businessInfo = {
        companyName: businessInfo.companyName,
        companyType: businessInfo.companyType,
        industry: businessInfo.industry,
        registrationNumber: businessInfo.registrationNumber,
        taxId: businessInfo.taxId
      };
    }

    const user = await User.create(userData);

    // Send verification email
    const verificationToken = generateToken(user._id);
    emailService.sendVerificationEmail(user.email, user.name, verificationToken)
      .catch(err => console.error('Failed to send verification email:', err));

    console.log('✅ User registered:', user.email, '| Type:', user.accountType);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      email: user.email
    });

  } catch (error) {
    console.error('❌ Register error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   LOGIN (LOCAL - EMAIL/PASSWORD)
============================================================ */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      status: { $ne: 'deleted' }
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified BEFORE password check
    if (!user.verified) {
      console.log('⚠️ Login attempt with unverified email:', email);
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED',
        requiresVerification: true,
        email: user.email
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check account status
    if (!user.isActive || user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact support.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.email);

    console.log('✅ User logged in:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tier: user.tier,
        verified: user.verified,
        isKYCVerified: user.isKYCVerified,
        accountType: user.accountType,
        profilePicture: user.profilePicture,
        businessInfo: user.accountType === 'business' ? user.businessInfo : undefined
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
   GOOGLE AUTH - INITIAL
   ✅ FIXED: Creates temporary user immediately
============================================================ */
exports.googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    console.log('🔵 Google auth request:', { googleId, email, name });

    if (!googleId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Google ID and email are required'
      });
    }

    // Find existing user by googleId or email
    let user = await User.findOne({
      $or: [
        { googleId },
        { email: email.toLowerCase() }
      ]
    });

    // EXISTING USER - Login
    if (user) {
      // Link Google account if not linked
      if (!user.googleId) {
        console.log('🔗 Linking Google account to existing user:', email);
        user.googleId = googleId;
        user.authProvider = 'google';
      }
      
      user.verified = true;
      user.verifiedAt = user.verifiedAt || new Date();
      user.lastLogin = new Date();
      user.profilePicture = picture || user.profilePicture;
      await user.save();

      // Check if profile is complete
      if (!user.agreedToTerms) {
        console.log('📝 Existing user needs to complete profile');
        return res.json({
          success: true,
          requiresProfileCompletion: true,
          googleData: { googleId, email, name, picture }
        });
      }

      const token = generateToken(user._id, user.email);

      console.log('✅ Existing Google user logged in:', email);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          accountType: user.accountType,
          verified: user.verified,
          isKYCVerified: user.isKYCVerified,
          tier: user.tier,
          profilePicture: user.profilePicture,
          businessInfo: user.accountType === 'business' ? user.businessInfo : undefined
        }
      });
    }

    // ✅ NEW USER - Create temporary user immediately
    console.log('👤 New Google user, creating temporary account:', email);

    const randomPassword = crypto.randomBytes(32).toString('hex');
    
    const tempUser = await User.create({
      googleId,
      email: email.toLowerCase(),
      name,
      password: randomPassword,
      profilePicture: picture,
      authProvider: 'google',
      verified: true,
      verifiedAt: new Date(),
      role: 'dual',
      tier: 'free',
      status: 'active',
      accountType: 'individual',
      agreedToTerms: false // Mark as incomplete
    });

    console.log('✅ Temporary Google user created:', tempUser._id);

    return res.json({
      success: true,
      requiresProfileCompletion: true,
      message: 'Please complete your profile',
      googleData: {
        googleId,
        email,
        name,
        picture
      }
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
   GOOGLE AUTH - COMPLETE PROFILE
   ✅ FIXED: Updates existing temporary user
============================================================ */
exports.completeGoogleProfile = async (req, res) => {
  try {
    const {
      googleId,
      name,
      email,
      phone,
      country,
      accountType,
      companyName,
      companyType,
      industry,
      registrationNumber,
      agreedToTerms,
      picture
    } = req.body;

    console.log('📝 Completing Google profile for:', email);

    // Validation
    if (!googleId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Google ID and email are required'
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({
        success: false,
        message: 'You must agree to the terms and conditions'
      });
    }

    if (!accountType || !['individual', 'business'].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid account type required (individual or business)'
      });
    }

    if (accountType === 'business' && !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required for business accounts'
      });
    }

    // ✅ Find user by googleId OR email
    const user = await User.findOne({
      $or: [
        { googleId },
        { email: email.toLowerCase() }
      ]
    });

    if (!user) {
      console.error('❌ Temporary user not found for:', { googleId, email });
      return res.status(404).json({
        success: false,
        message: 'User not found. Please sign in with Google again.'
      });
    }

    // ✅ Update profile
    user.name = name;
    user.phone = phone;
    user.accountType = accountType;
    user.agreedToTerms = true;
    user.agreedToTermsAt = new Date();
    user.profilePicture = picture || user.profilePicture;
    user.googleId = googleId;
    user.verified = true;
    user.verifiedAt = user.verifiedAt || new Date();

    if (country) {
      user.address = user.address || {};
      user.address.country = country;
    }

    if (accountType === 'business') {
      user.businessInfo = {
        companyName,
        companyType: companyType || 'other',
        industry: industry || 'other',
        registrationNumber: registrationNumber || '',
        businessEmail: email,
        businessPhone: phone
      };
      console.log('✅ Business info set:', companyName);
    }

    await user.save();

    const token = generateToken(user._id, user.email);

    console.log('✅ Google profile completed:', email, '| Type:', accountType);

    res.json({
      success: true,
      message: 'Profile completed successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        verified: user.verified,
        isKYCVerified: user.isKYCVerified,
        tier: user.tier,
        profilePicture: user.profilePicture,
        businessInfo: accountType === 'business' ? user.businessInfo : undefined
      }
    });

  } catch (error) {
    console.error('❌ Complete Google profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to complete profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   VERIFY EMAIL
============================================================ */
exports.verifyEmail = async (req, res) => {
  try {
    const token = req.query.token || req.params.token || req.body.token;

    if (!token || token === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.verified) {
      return res.json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true
      });
    }

    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();

    console.log('✅ Email verified:', user.email);

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.'
    });

  } catch (error) {
    console.error('❌ Verify email error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Verification link expired',
        expired: true
      });
    }

    res.status(400).json({
      success: false,
      message: 'Invalid verification link'
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

    console.log('✅ Verification email resent:', email);

    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
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
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent'
      });
    }

    const resetToken = generateToken(user._id);
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset'
    });
  }
};

/* ============================================================
   RESET PASSWORD
============================================================ */
exports.resetPassword = async (req, res) => {
  try {
    const token = req.query.token || req.params.token || req.body.token;
    const { password } = req.body;

    if (!token) {
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

    console.log('✅ Password reset:', user.email);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now login.'
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
exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

/* ============================================================
   REFRESH TOKEN
============================================================ */
exports.refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account inactive'
      });
    }

    const token = generateToken(user._id, user.email);
    res.json({
      success: true,
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Refresh failed'
    });
  }
};

module.exports = exports;