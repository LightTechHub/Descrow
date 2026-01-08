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

// backend/controllers/auth.controller.js

/* ============================================================
   GOOGLE AUTH - INITIAL LOGIN/SIGNUP
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

    // ✅ Check if user exists by googleId OR email
    let user = await User.findOne({
      $or: [
        { googleId },
        { email: email.toLowerCase() }
      ]
    });

    // ✅ CASE 1: Existing user found
    if (user) {
      // If found by email but no googleId, link the accounts
      if (!user.googleId && user.email === email.toLowerCase()) {
        console.log('🔗 Linking existing email account to Google:', email);
        user.googleId = googleId;
        user.authProvider = 'google';
        user.verified = true; // Google emails are pre-verified
        user.verifiedAt = new Date();
        user.profilePicture = picture;
        await user.save();
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

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
          profilePicture: user.profilePicture,
          businessInfo: user.accountType === 'business' ? user.businessInfo : undefined
        }
      });
    }

    // ✅ CASE 2: New user - Create temporary user and require profile completion
    console.log('👤 New Google user, creating temporary account:', email);

    // Create temporary user with googleId
    const tempUser = await User.create({
      googleId,
      email: email.toLowerCase(),
      name,
      profilePicture: picture,
      authProvider: 'google',
      verified: true, // Google emails are pre-verified
      verifiedAt: new Date(),
      role: 'dual',
      tier: 'free',
      status: 'active',
      // ✅ Mark as incomplete profile
      agreedToTerms: false,
      accountType: 'individual' // Default, will be updated in complete-profile
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
   ✅ FIXED: Better user lookup and error handling
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

    console.log('📝 Completing Google profile:', {
      email,
      googleId: googleId ? `${googleId.substring(0, 10)}...` : 'MISSING',
      accountType
    });

    // ✅ Validation
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
        message: 'Valid account type is required (individual or business)'
      });
    }

    if (accountType === 'business' && !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required for business accounts'
      });
    }

    // ✅ FIXED: Find user by googleId OR email
    let user = await User.findOne({
      $or: [
        { googleId },
        { email: email.toLowerCase() }
      ]
    });

    if (!user) {
      console.error('❌ User not found:', { googleId, email });
      
      // ✅ Try to create user if not found (recovery mechanism)
      console.log('🔄 Creating user as recovery...');
      user = await User.create({
        googleId,
        email: email.toLowerCase(),
        name,
        profilePicture: picture,
        authProvider: 'google',
        verified: true,
        verifiedAt: new Date(),
        role: 'dual',
        tier: 'free',
        status: 'active',
        accountType: 'individual'
      });
      
      console.log('✅ Recovery user created:', user._id);
    }

    // ✅ Update user profile
    user.name = name;
    user.phone = phone;
    user.accountType = accountType;
    user.agreedToTerms = true;
    user.agreedToTermsAt = new Date();
    user.profilePicture = picture || user.profilePicture;
    user.googleId = googleId; // Ensure googleId is set

    // Add country to address
    if (country) {
      user.address = user.address || {};
      user.address.country = country;
    }

    // ✅ Handle business account
    if (accountType === 'business') {
      user.businessInfo = {
        companyName,
        companyType: companyType || 'other',
        industry: industry || 'other',
        registrationNumber: registrationNumber || '',
        businessEmail: email,
        businessPhone: phone
      };
      
      console.log('✅ Business info populated:', {
        companyName,
        companyType,
        industry
      });
    }

    await user.save();

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Profile completed successfully:', {
      userId: user._id,
      email: user.email,
      accountType: user.accountType
    });

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
    
    // ✅ Better error response
    let errorMessage = 'Failed to complete profile';
    
    if (error.code === 11000) {
      errorMessage = 'This email is already registered with a different account';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// backend/controllers/auth.controller.js - COMPLETE GOOGLE PROFILE FIX

// ✅ FIXED: Complete Google Profile - Ensure accountType is saved
exports.completeGoogleProfile = async (req, res) => {
  try {
    const {
      googleId,
      name,
      email,
      phone,
      country,
      accountType, // ✅ MUST be 'individual' or 'business'
      companyName,
      companyType,
      industry,
      registrationNumber,
      agreedToTerms,
      picture
    } = req.body;

    console.log('📝 Completing Google profile with accountType:', accountType);

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

    // ✅ Validate accountType
    if (!accountType || !['individual', 'business'].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid account type is required (individual or business)'
      });
    }

    // ✅ Business validation
    if (accountType === 'business') {
      if (!companyName) {
        return res.status(400).json({
          success: false,
          message: 'Company name is required for business accounts'
        });
      }
    }

    // Find user by googleId
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please sign up again.'
      });
    }

    // ✅ Update user with complete profile data
    user.name = name;
    user.phone = phone;
    user.address = { country };
    user.accountType = accountType; // ✅ CRITICAL: Save account type
    user.agreedToTerms = true;
    user.agreedToTermsAt = new Date();
    user.profilePicture = picture;

    // ✅ If business account, populate businessInfo
    if (accountType === 'business') {
      user.businessInfo = {
        companyName,
        companyType: companyType || 'other',
        industry: industry || 'other',
        registrationNumber: registrationNumber || '',
        businessEmail: email,
        businessPhone: phone
      };
      
      console.log('✅ Business info populated:', {
        companyName,
        companyType,
        industry
      });
    }

    await user.save();

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Profile completed for', accountType, 'account:', user.email);

    res.json({
      success: true,
      message: 'Profile completed successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType, // ✅ Include in response
        verified: user.verified,
        isKYCVerified: user.isKYCVerified,
        tier: user.tier,
        businessInfo: accountType === 'business' ? user.businessInfo : undefined
      }
    });

  } catch (error) {
    console.error('❌ Complete Google profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete profile',
      error: error.message
    });
  }
};

/* ============================================================
   REGISTER (UNIVERSAL - SUPPORTS INDIVIDUAL & BUSINESS)
   ✅ FIXED: Allows email reuse after account deletion
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

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // ✅ FIXED: Check for ACTIVE users only (ignore deleted/unverified)
    const existingUser = await User.findOne({ 
      email: email.toLowerCase()
    });

    if (existingUser) {
      // ✅ Case 1: User is deleted - allow re-registration
      if (existingUser.status === 'deleted' || existingUser.deletedAt) {
        console.log('🗑️ Found deleted account, removing for re-registration:', email);
        await User.findByIdAndDelete(existingUser._id);
        
        // Also clean up related data
        try {
          await APIKey.deleteMany({ userId: existingUser._id });
          await BankAccount.deleteMany({ userId: existingUser._id });
          await Notification.deleteMany({ userId: existingUser._id });
        } catch (cleanupError) {
          console.error('⚠️ Cleanup error (non-blocking):', cleanupError.message);
        }
      }
      // ✅ Case 2: User is unverified - allow re-registration (clean slate)
      else if (!existingUser.verified) {
        console.log('📧 Found unverified account, removing for fresh registration:', email);
        await User.findByIdAndDelete(existingUser._id);
      }
      // ✅ Case 3: User is active and verified - block registration
      else if (existingUser.verified && existingUser.status !== 'deleted') {
        return res.status(400).json({
          success: false,
          message: 'This email is already registered. Please login instead.',
          action: 'login_required'
        });
      }
    }

    // Build user data object
    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || undefined,
      accountType: accountType || 'individual',
      role: 'dual',
      tier: 'free',
      verified: false,
      status: 'active', // ✅ Ensure status is active
      authProvider: 'local',
      agreedToTerms: agreedToTerms || false,
      agreedToTermsAt: agreedToTerms ? new Date() : undefined
    };

    // Add country to address if provided
    if (country) {
      userData.address = {
        country
      };
    }

    // Add business info if business account
    if (accountType === 'business' && businessInfo) {
      userData.businessInfo = {
        companyName: businessInfo.companyName,
        companyType: businessInfo.companyType,
        industry: businessInfo.industry,
        registrationNumber: businessInfo.registrationNumber,
        taxId: businessInfo.taxId
      };
      
      console.log('🏢 Registering business account:', businessInfo.companyName);
    }

    // Create user
    const user = await User.create(userData);

    // Generate verification token
    const verificationToken = generateToken(user._id);

    // Send verification email
    emailService.sendVerificationEmail(user.email, user.name, verificationToken)
      .catch(err => console.error('Failed to send verification email:', err));

    console.log('✅ User registered:', user.email, '| Account Type:', user.accountType);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      email: user.email,
      accountType: user.accountType
    });

  } catch (error) {
    console.error('❌ Register error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. If you deleted your account, please wait a moment and try again.'
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
        kycStatus: user.kycStatus,
        accountType: user.accountType,
        businessInfo: user.businessInfo,
        hasBankAccount: user.hasBankAccount
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
   VERIFY EMAIL
============================================================ */
exports.verifyEmail = async (req, res) => {
  try {
    const token = req.query.token || req.params.token || req.body.token;

    if (!token || token === 'undefined' || token.trim() === '') {
      console.log('❌ Missing or invalid token:', token);
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    console.log('📧 Verifying email with token:', token.substring(0, 20) + '...');

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
   SET PASSWORD (FOR OAUTH USERS)
============================================================ */
exports.setPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    // Validation
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user signed up via OAuth (Google)
    if (user.authProvider !== 'google') {
      return res.status(400).json({
        success: false,
        message: 'This feature is only for users who signed up via Google'
      });
    }

    // Check if they already have a real password set
    // The placeholder password from Google sign-up is 72 characters (2 random strings)
    if (user.password && user.password.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Password already set. Use "Change Password" instead.'
      });
    }

    // Set the new password
    user.password = newPassword;
    user.authProvider = 'both'; // They can now use both Google and password
    await user.save();

    console.log('✅ Password set for OAuth user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password set successfully! You can now use it for security operations.'
    });

  } catch (error) {
    console.error('❌ Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   CHECK PASSWORD STATUS (FOR OAUTH USERS)
============================================================ */
exports.checkPasswordStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hasPassword = user.authProvider === 'local' || 
                       user.authProvider === 'both' ||
                       (user.password && user.password.length < 50);

    res.json({
      success: true,
      data: {
        hasPassword,
        authProvider: user.authProvider,
        needsPasswordSetup: user.authProvider === 'google' && !hasPassword
      }
    });

  } catch (error) {
    console.error('❌ Check password status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check password status'
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