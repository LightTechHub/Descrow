const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
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
   REGISTER
============================================================ */
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { name, email, password, phone, country, accountType, agreedToTerms, businessInfo } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      if (existingUser.status === 'deleted' || existingUser.deletedAt) {
        console.log('🗑️ Removing deleted account:', email);
        await User.findByIdAndDelete(existingUser._id);
      } else if (!existingUser.verified) {
        console.log('📧 Removing unverified account:', email);
        await User.findByIdAndDelete(existingUser._id);
      } else {
        return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });
      }
    }

    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      phone,
      accountType: accountType || 'individual',
      role: 'dual',
      tier: 'free',
      verified: false,
      status: 'active',
      authProvider: 'local',
      agreedToTerms: agreedToTerms || false,
      agreedToTermsAt: agreedToTerms ? new Date() : undefined
    };

    if (country) userData.address = { country };

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
    const verificationToken = generateToken(user._id);
    emailService.sendVerificationEmail(user.email, user.name, verificationToken).catch(console.error);

    console.log('✅ Registered:', user.email);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Check your email to verify.',
      requiresVerification: true
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

/* ============================================================
   LOGIN
============================================================ */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), status: { $ne: 'deleted' } }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        code: 'EMAIL_NOT_VERIFIED',
        requiresVerification: true,
        email: user.email
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive || user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        isKYCVerified: user.isKYCVerified,
        accountType: user.accountType,
        tier: user.tier,
        profilePicture: user.profilePicture,
        businessInfo: user.accountType === 'business' ? user.businessInfo : undefined
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

/* ============================================================
   GOOGLE AUTH
============================================================ */
exports.googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ success: false, message: 'Google ID and email required' });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
      }
      user.verified = true;
      user.verifiedAt = user.verifiedAt || new Date();
      user.lastLogin = new Date();
      user.profilePicture = picture || user.profilePicture;
      await user.save();

      const token = generateToken(user._id, user.email);

      return res.json({
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          accountType: user.accountType,
          verified: user.verified,
          profilePicture: user.profilePicture
        }
      });
    }

    return res.json({
      success: true,
      requiresProfileCompletion: true,
      googleData: { googleId, email, name, picture }
    });
  } catch (error) {
    console.error('❌ Google auth error:', error);
    res.status(500).json({ success: false, message: 'Google auth failed' });
  }
};

/* ============================================================
   GOOGLE COMPLETE PROFILE
============================================================ */
exports.completeGoogleProfile = async (req, res) => {
  try {
    const { googleId, name, email, phone, country, accountType, companyName, companyType, industry, registrationNumber, agreedToTerms, picture } = req.body;

    if (!googleId || !email || !agreedToTerms) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!['individual', 'business'].includes(accountType)) {
      return res.status(400).json({ success: false, message: 'Invalid account type' });
    }

    if (accountType === 'business' && !companyName) {
      return res.status(400).json({ success: false, message: 'Company name required for business' });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        googleId,
        email: email.toLowerCase(),
        name,
        password: crypto.randomBytes(32).toString('hex'),
        profilePicture: picture,
        authProvider: 'google',
        verified: true,
        verifiedAt: new Date(),
        role: 'dual',
        tier: 'free',
        status: 'active',
        accountType: 'individual'
      });
    }

    user.name = name;
    user.phone = phone;
    user.accountType = accountType;
    user.agreedToTerms = true;
    user.agreedToTermsAt = new Date();
    user.profilePicture = picture || user.profilePicture;
    user.verified = true;

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
    }

    await user.save();

    const token = generateToken(user._id, user.email);

    res.json({
      success: true,
      message: 'Profile completed',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        verified: user.verified,
        profilePicture: user.profilePicture,
        businessInfo: accountType === 'business' ? user.businessInfo : undefined
      }
    });
  } catch (error) {
    console.error('❌ Complete profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete profile' });
  }
};

/* ============================================================
   VERIFY EMAIL
============================================================ */
exports.verifyEmail = async (req, res) => {
  try {
    const token = req.query.token || req.params.token || req.body.token;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.verified) return res.json({ success: true, message: 'Already verified', alreadyVerified: true });

    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'Email verified! You can now login.' });
  } catch (error) {
    console.error('❌ Verify error:', error);
    res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }
};

/* ============================================================
   RESEND VERIFICATION
============================================================ */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.verified) return res.status(400).json({ success: false, message: 'Already verified' });

    const token = generateToken(user._id);
    await emailService.sendVerificationEmail(user.email, user.name, token);

    res.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    console.error('❌ Resend error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend' });
  }
};

/* ============================================================
   FORGOT PASSWORD
============================================================ */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      const token = generateToken(user._id);
      await emailService.sendPasswordResetEmail(user.email, user.name, token);
    }

    res.json({ success: true, message: 'If email exists, reset link sent' });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process' });
  }
};

/* ============================================================
   RESET PASSWORD
============================================================ */
exports.resetPassword = async (req, res) => {
  try {
    const token = req.query.token || req.params.token || req.body.token;
    const { password } = req.body;

    if (!token) return res.status(400).json({ success: false, message: 'Token required' });
    if (!password || password.length < 8) return res.status(400).json({ success: false, message: 'Password must be 8+ characters' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ success: false, message: 'Invalid token' });

    user.password = password;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully!' });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }
};

/* ============================================================
   LOGOUT
============================================================ */
exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out' });
};

/* ============================================================
   REFRESH TOKEN
============================================================ */
exports.refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) return res.status(403).json({ success: false, message: 'Account inactive' });

    const token = generateToken(user._id, user.email);
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Refresh failed' });
  }
};

module.exports = exports;
