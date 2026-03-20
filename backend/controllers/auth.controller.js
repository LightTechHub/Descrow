// backend/controllers/auth.controller.js
// CHANGES:
//   - register: saves gender field from req.body / businessInfo
//   - completeGoogleProfile: saves gender field
//   - verify2FALogin: reads secret from TwoFactor collection (existing fix preserved)
//   - login: checks TwoFactor collection for 2FA gate (existing fix preserved)

const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');
const speakeasy = require('speakeasy');
const TwoFactor = require('../models/TwoFactor');

// Generate JWT
const generateToken = (userId, email = null, scope = 'full', expiresIn = null) => {
  const expiry = expiresIn || (scope === '2fa_pending' ? '5m' : (process.env.JWT_EXPIRE || '7d'));
  return jwt.sign(
    { id: userId, email, scope },
    process.env.JWT_SECRET,
    { expiresIn: expiry }
  );
};

// Parse device info from request
const parseDeviceInfo = (req) => {
  const ua = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'desktop';

  if (/Mobile|Android|iPhone|iPad/.test(ua)) deviceType = 'mobile';
  if (/iPad/.test(ua)) deviceType = 'tablet';

  if (/Chrome\//.test(ua) && !/Chromium|Edg/.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';

  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';

  return { ip, browser, os, deviceType, userAgent: ua };
};

/* ============================================================
   REGISTER
   ADDED: saves gender field (top-level, from req.body or businessInfo block)
============================================================ */
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { name, email, password, phone, country, accountType, agreedToTerms, businessInfo, gender } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      if (existingUser.status === 'deleted' || existingUser.deletedAt) {
        await User.findByIdAndDelete(existingUser._id);
      } else if (!existingUser.verified) {
        await User.findByIdAndDelete(existingUser._id);
      } else {
        return res.status(400).json({ success: false, message: 'This email is already registered. Please login instead.' });
      }
    }

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
      agreedToTermsAt: agreedToTerms ? new Date() : undefined,
      // Save gender only when a valid non-empty value is provided (guards against enum error)
      gender: (['male','female','prefer_not_to_say'].includes(gender) ? gender : 
               ['male','female','prefer_not_to_say'].includes(businessInfo?.gender) ? businessInfo.gender : null)
    };

    if (country) userData.address = { country };

    if (accountType === 'business' && businessInfo) {
      userData.businessInfo = {
        companyName:        businessInfo.companyName,
        companyType:        businessInfo.companyType,
        businessType:       businessInfo.businessType,
        industry:           businessInfo.industry,
        registrationNumber: businessInfo.registrationNumber,
        taxId:              businessInfo.taxId
      };
    }

    const user = await User.create(userData);
    const verificationToken = generateToken(user._id);
    emailService.sendVerificationEmail(user.email, user.name, verificationToken)
      .catch(err => console.error('Failed to send verification email:', err));

    console.log('User registered:', user.email);
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      email: user.email
    });

  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Email already registered' });
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   LOGIN - with lockout, device tracking, and 2FA gate
============================================================ */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), status: { $ne: 'deleted' } })
      .select('+password +loginAttempts +lockUntil +loginSessions +twoFactorSecret +twoFactorEnabled');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.isLocked) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED',
        requiresVerification: true,
        email: user.email
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      const attemptsLeft = Math.max(0, 5 - (user.loginAttempts + 1));
      const message = attemptsLeft > 0
        ? `Invalid email or password. ${attemptsLeft} attempt(s) remaining before lockout.`
        : 'Invalid email or password. Account has been locked for 30 minutes.';
      return res.status(401).json({ success: false, message });
    }

    if (!user.isActive || user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account is suspended. Please contact support.' });
    }

    await user.resetLoginAttempts();

    // 2FA gate — check BOTH User.twoFactorEnabled AND TwoFactor collection
    const twoFactorDoc = await TwoFactor.findOne({ user: user._id });
    const has2FA = user.twoFactorEnabled && twoFactorDoc && twoFactorDoc.enabled;

    if (has2FA) {
      const tempToken = generateToken(user._id, user.email, '2fa_pending');
      return res.json({
        success: true,
        requires2FA: true,
        tempToken,
        message: 'Enter your 2FA code to complete login'
      });
    }

    // No 2FA — proceed with full login + device tracking
    const device = parseDeviceInfo(req);
    const sessionId = crypto.randomBytes(16).toString('hex');

    const knownDevice = user.loginSessions?.find(
      s => s.isActive && s.ipAddress === device.ip && s.browser === device.browser && s.os === device.os
    );

    if (!knownDevice) {
      emailService.sendNewDeviceAlertEmail(user.email, user.name, {
        browser: device.browser, os: device.os, ip: device.ip,
        deviceType: device.deviceType, time: new Date().toLocaleString()
      }).catch(err => console.error('Failed to send new device alert:', err));
    }

    const newSession = {
      sessionId, ipAddress: device.ip, userAgent: device.userAgent,
      deviceType: device.deviceType, browser: device.browser, os: device.os,
      createdAt: new Date(), lastActivity: new Date(), isActive: true
    };
    user.loginSessions = [...(user.loginSessions || []).slice(-9), newSession];
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.email);

    console.log('User logged in:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id, name: user.name, email: user.email, role: user.role, tier: user.tier,
        verified: user.verified, isKYCVerified: user.isKYCVerified, accountType: user.accountType,
        profilePicture: user.profilePicture,
        businessInfo: user.accountType === 'business' ? user.businessInfo : undefined
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   VERIFY 2FA LOGIN
   FIX: Reads secret from TwoFactor collection
============================================================ */
exports.verify2FALogin = async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ success: false, message: 'Temp token and 2FA code are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: '2FA session expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (decoded.scope !== '2fa_pending') {
      return res.status(401).json({ success: false, message: 'Invalid token for 2FA verification' });
    }

    const user = await User.findById(decoded.id).select('+loginSessions');
    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const twoFactorDoc = await TwoFactor.findOne({ user: user._id });

    if (!twoFactorDoc || !twoFactorDoc.enabled || !twoFactorDoc.secret) {
      return res.status(400).json({
        success: false,
        message: '2FA is not configured for this account. Please set it up again in Security settings.'
      });
    }

    const isValid = speakeasy.totp.verify({
      secret: twoFactorDoc.secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 2
    });

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA code. Please try again.' });
    }

    const device = parseDeviceInfo(req);
    const sessionId = crypto.randomBytes(16).toString('hex');

    const knownDevice = user.loginSessions?.find(
      s => s.isActive && s.ipAddress === device.ip && s.browser === device.browser && s.os === device.os
    );

    if (!knownDevice) {
      emailService.sendNewDeviceAlertEmail(user.email, user.name, {
        browser: device.browser, os: device.os, ip: device.ip,
        deviceType: device.deviceType, time: new Date().toLocaleString()
      }).catch(() => {});
    }

    const newSession = {
      sessionId, ipAddress: device.ip, userAgent: device.userAgent,
      deviceType: device.deviceType, browser: device.browser, os: device.os,
      createdAt: new Date(), lastActivity: new Date(), isActive: true
    };
    user.loginSessions = [...(user.loginSessions || []).slice(-9), newSession];
    user.lastLogin = new Date();

    twoFactorDoc.lastVerified = new Date();
    await twoFactorDoc.save();
    await user.save();

    const token = generateToken(user._id, user.email);

    console.log('User completed 2FA login:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id, name: user.name, email: user.email, role: user.role, tier: user.tier,
        verified: user.verified, isKYCVerified: user.isKYCVerified, accountType: user.accountType,
        profilePicture: user.profilePicture,
        businessInfo: user.accountType === 'business' ? user.businessInfo : undefined
      }
    });

  } catch (error) {
    console.error('2FA login verification error:', error);
    res.status(500).json({ success: false, message: '2FA verification failed' });
  }
};

/* ============================================================
   GOOGLE AUTH
============================================================ */
exports.googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;
    if (!googleId || !email) return res.status(400).json({ success: false, message: 'Google ID and email are required' });

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (user) {
      if (!user.googleId) { user.googleId = googleId; user.authProvider = 'google'; }
      user.verified = true;
      user.verifiedAt = user.verifiedAt || new Date();
      user.lastLogin = new Date();
      user.profilePicture = picture || user.profilePicture;
      await user.save();

      if (!user.agreedToTerms) return res.json({ success: true, requiresProfileCompletion: true, googleData: { googleId, email, name, picture } });

      const token = generateToken(user._id, user.email);
      return res.json({
        success: true, message: 'Login successful', token,
        user: {
          _id: user._id, name: user.name, email: user.email, accountType: user.accountType,
          verified: user.verified, isKYCVerified: user.isKYCVerified, tier: user.tier,
          profilePicture: user.profilePicture,
          businessInfo: user.accountType === 'business' ? user.businessInfo : undefined
        }
      });
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    await User.create({
      googleId, email: email.toLowerCase(), name, password: randomPassword,
      profilePicture: picture, authProvider: 'google', verified: true,
      verifiedAt: new Date(), role: 'dual', tier: 'free', status: 'active',
      accountType: 'individual', agreedToTerms: false
    });

    return res.json({ success: true, requiresProfileCompletion: true, message: 'Please complete your profile', googleData: { googleId, email, name, picture } });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false, message: 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* ============================================================
   GOOGLE AUTH - COMPLETE PROFILE
   ADDED: saves gender field
============================================================ */
exports.completeGoogleProfile = async (req, res) => {
  try {
    const {
      googleId, name, email, phone, country, accountType,
      companyName, companyType, businessType, industry,
      registrationNumber, agreedToTerms, picture,
      gender  // ADDED
    } = req.body;

    if (!googleId || !email) return res.status(400).json({ success: false, message: 'Google ID and email are required' });
    if (!agreedToTerms) return res.status(400).json({ success: false, message: 'You must agree to the terms and conditions' });
    if (!accountType || !['individual', 'business'].includes(accountType)) return res.status(400).json({ success: false, message: 'Valid account type required' });
    if (accountType === 'business' && !companyName) return res.status(400).json({ success: false, message: 'Company name is required for business accounts' });

    const user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });
    if (!user) return res.status(404).json({ success: false, message: 'User not found. Please sign in with Google again.' });

    user.name = name;
    user.phone = phone;
    user.accountType = accountType;
    user.agreedToTerms = true;
    user.agreedToTermsAt = new Date();
    user.profilePicture = picture || user.profilePicture;
    user.googleId = googleId;
    user.verified = true;
    user.verifiedAt = user.verifiedAt || new Date();

    // Save gender only when a valid non-empty value is provided
    if (['male','female','prefer_not_to_say'].includes(gender)) user.gender = gender;

    if (country) { user.address = user.address || {}; user.address.country = country; }

    if (accountType === 'business') {
      user.businessInfo = {
        companyName,
        companyType: companyType || 'other',
        businessType: businessType || '',
        industry: industry || 'other',
        registrationNumber: registrationNumber || '',
        businessEmail: email,
        businessPhone: phone
      };
    }

    await user.save();

    const token = generateToken(user._id, user.email);
    res.json({
      success: true, message: 'Profile completed successfully', token,
      user: {
        _id: user._id, name: user.name, email: user.email, accountType: user.accountType,
        verified: user.verified, isKYCVerified: user.isKYCVerified, tier: user.tier,
        profilePicture: user.profilePicture,
        businessInfo: accountType === 'business' ? user.businessInfo : undefined
      }
    });

  } catch (error) {
    console.error('Complete Google profile error:', error);
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'This email is already registered' });
    res.status(500).json({
      success: false, message: 'Failed to complete profile',
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
    if (!token || token === 'undefined') return res.status(400).json({ success: false, message: 'Verification token is required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.verified) return res.json({ success: true, message: 'Email already verified', alreadyVerified: true });

    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();

    console.log('Email verified:', user.email);
    res.json({ success: true, message: 'Email verified successfully! You can now login.' });

  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(400).json({ success: false, message: 'Verification link expired', expired: true });
    res.status(400).json({ success: false, message: 'Invalid verification link' });
  }
};

/* ============================================================
   RESEND VERIFICATION
============================================================ */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.verified) return res.status(400).json({ success: false, message: 'Email already verified' });

    const verificationToken = generateToken(user._id);
    await emailService.sendVerificationEmail(user.email, user.name, verificationToken);
    res.json({ success: true, message: 'Verification email sent! Please check your inbox.' });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend verification email' });
  }
};

/* ============================================================
   FORGOT PASSWORD
============================================================ */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });

    const resetToken = generateToken(user._id);
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
    res.json({ success: true, message: 'If that email exists, a reset link has been sent' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process password reset' });
  }
};

/* ============================================================
   RESET PASSWORD
============================================================ */
exports.resetPassword = async (req, res) => {
  try {
    const token = req.query.token || req.params.token || req.body.token;
    const { password } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Reset token is required' });
    if (!password || password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'Invalid reset token' });

    user.password = password;
    await user.save();

    emailService.sendPasswordChangedEmail(user.email, user.name)
      .catch(err => console.error('Failed to send password changed email:', err));

    res.json({ success: true, message: 'Password reset successfully! You can now login.' });

  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }
};

/* ============================================================
   LOGOUT
============================================================ */
exports.logout = (req, res) => {
  try {
    const { blacklistToken } = require('../middleware/auth.middleware');
    if (req.token) blacklistToken(req.token);
  } catch (e) { /* non-fatal */ }

  if (req.user) {
    User.findByIdAndUpdate(req.user._id, {
      $set: { 'loginSessions.$[].isActive': false }
    }).catch(() => {});
  }

  res.json({ success: true, message: 'Logged out successfully' });
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

/* ============================================================
   SET PASSWORD
============================================================ */
exports.setPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = password;
    await user.save();
    res.json({ success: true, message: 'Password set successfully' });
  } catch (error) {
    console.error('setPassword error:', error);
    res.status(500).json({ success: false, message: 'Failed to set password' });
  }
};

/* ============================================================
   CHECK PASSWORD STATUS
============================================================ */
exports.checkPasswordStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, hasPassword: !!user.password });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check password status' });
  }
};

module.exports = exports;
