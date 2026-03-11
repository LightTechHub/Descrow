// backend/controllers/user.controller.js
const User = require('../models/User.model');
const Escrow = require('../models/Escrow.model');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');
const feeConfig = require('../config/fee.config');
const mongoose = require('mongoose');
const diditService = require('../services/didit.service');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// ✅ FIXED: Import models used in deleteAccount
const APIKey      = require('../models/ApiKey.model');
const BankAccount = require('../models/BankAccount.model');
const Notification = require('../models/Notification.model');

// ======================================================
// ======================= KYC ==========================
// ======================================================

exports.startKYCVerification = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.verified) {
      return res.status(400).json({ success: false, message: 'Please verify your email before starting KYC verification' });
    }

    if (user.isKYCVerified && user.kycStatus.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Your KYC is already verified' });
    }

    // Return existing valid session
    if (['pending', 'in_progress'].includes(user.kycStatus.status) && user.kycStatus.diditSessionId) {
      const sessionExpired = user.kycStatus.diditSessionExpiresAt &&
        new Date(user.kycStatus.diditSessionExpiresAt) < new Date();

      if (!sessionExpired && user.kycStatus.diditVerificationUrl) {
        return res.json({
          success: true,
          message: 'Verification session already exists',
          data: {
            verificationUrl: user.kycStatus.diditVerificationUrl,
            sessionId: user.kycStatus.diditSessionId,
            expiresAt: user.kycStatus.diditSessionExpiresAt,
            isExisting: true
          }
        });
      }
      // Session expired — clear it
      user.kycStatus.status = 'unverified';
      user.kycStatus.diditSessionId = undefined;
      user.kycStatus.diditVerificationUrl = undefined;
      user.kycStatus.diditSessionExpiresAt = undefined;
      await user.save();
    }

    const diditResponse = await diditService.createVerificationSession(userId.toString(), {
      email: user.email, name: user.name, tier: user.tier || 'starter', phone: user.phone
    });

    if (!diditResponse.success) {
      return res.status(500).json({
        success: false,
        message: _extractErrorMessage(diditResponse.error),
        error: process.env.NODE_ENV === 'development' ? diditResponse.error : undefined
      });
    }

    user.kycStatus.status = 'pending';
    user.kycStatus.diditSessionId = diditResponse.data.sessionId;
    user.kycStatus.diditVerificationUrl = diditResponse.data.verificationUrl;
    user.kycStatus.diditSessionExpiresAt = diditResponse.data.expiresAt;
    user.kycStatus.submittedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Verification session created successfully',
      data: {
        verificationUrl: diditResponse.data.verificationUrl,
        sessionId: diditResponse.data.sessionId,
        expiresAt: diditResponse.data.expiresAt,
        isExisting: false
      }
    });
  } catch (error) {
    console.error('❌ Start KYC verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to start KYC verification' });
  }
};

exports.checkKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.kycStatus.diditSessionId) {
      return res.json({
        success: true,
        data: {
          status: user.kycStatus.status || 'unverified',
          isVerified: user.isKYCVerified || false,
          verifiedAt: user.kycStatus.verifiedAt,
          rejectionReason: user.kycStatus.rejectionReason,
          submittedAt: user.kycStatus.submittedAt,
          verificationUrl: user.kycStatus.diditVerificationUrl
        }
      });
    }

    const diditResponse = await diditService.getVerificationStatus(user.kycStatus.diditSessionId);

    if (!diditResponse.success) {
      if (diditResponse.error?.status === 404 ||
        diditResponse.message?.includes('not found') ||
        diditResponse.message?.includes('does not exist')) {
        user.kycStatus.status = 'unverified';
        user.kycStatus.diditSessionId = undefined;
        user.kycStatus.diditVerificationUrl = undefined;
        user.kycStatus.diditSessionExpiresAt = undefined;
        await user.save();
        return res.json({
          success: true,
          data: { status: 'unverified', isVerified: false, message: 'Previous session expired. Please start a new verification.' }
        });
      }
      return res.json({
        success: true,
        data: {
          status: user.kycStatus.status,
          isVerified: user.isKYCVerified,
          verifiedAt: user.kycStatus.verifiedAt,
          rejectionReason: user.kycStatus.rejectionReason,
          submittedAt: user.kycStatus.submittedAt,
          verificationUrl: user.kycStatus.diditVerificationUrl
        }
      });
    }

    const { status, verified, verificationResult, failureReason } = diditResponse.data;
    const updatedStatus = _mapDiditStatus(status, verified, failureReason);
    const hasChanges = _updateUserKYCStatus(user, updatedStatus, verificationResult, failureReason);
    if (hasChanges) await user.save();

    // ✅ Send KYC status email on approval/rejection
    if (hasChanges) {
      try {
        if (updatedStatus.kycStatus === 'approved') {
          await emailService.sendKYCStatusEmail(user.email, user.name, 'approved', null);
        } else if (updatedStatus.kycStatus === 'rejected') {
          await emailService.sendKYCStatusEmail(user.email, user.name, 'rejected', failureReason);
        }
      } catch (emailErr) {
        console.error('KYC status email failed:', emailErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        status: user.kycStatus.status,
        isVerified: user.isKYCVerified,
        verifiedAt: user.kycStatus.verifiedAt,
        rejectionReason: user.kycStatus.rejectionReason,
        submittedAt: user.kycStatus.submittedAt,
        verificationUrl: user.kycStatus.diditVerificationUrl
      }
    });
  } catch (error) {
    console.error('❌ Check KYC status error:', error);
    res.status(500).json({ success: false, message: 'Failed to check KYC status' });
  }
};

exports.forceSyncKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.kycStatus?.diditSessionId) {
      const diditStatus = await diditService.getVerificationStatus(user.kycStatus.diditSessionId);
      if (diditStatus.success && diditStatus.data) {
        const { status, verified } = diditStatus.data;
        if (status === 'completed' && verified) {
          user.kycStatus.status = 'approved';
          user.isKYCVerified = true;
          user.kycStatus.verifiedAt = new Date();
        }
        await user.save();
      }
    }

    res.json({
      success: true,
      data: { verified: user.verified, isKYCVerified: user.isKYCVerified, kycStatus: user.kycStatus?.status }
    });
  } catch (error) {
    console.error('Force sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync' });
  }
};

exports.debugKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let diditStatus = null;
    let diditError = null;

    if (user.kycStatus?.diditSessionId) {
      try {
        const response = await diditService.getVerificationStatus(user.kycStatus.diditSessionId);
        if (response.success) diditStatus = response.data;
        else diditError = response.error || response.message;
      } catch (error) {
        diditError = error.message;
      }
    }

    res.json({
      success: true,
      data: {
        email: user.email, verified: user.verified, tier: user.tier,
        database: {
          isKYCVerified: user.isKYCVerified,
          kycStatus: user.kycStatus?.status || 'unverified',
          sessionId: user.kycStatus?.diditSessionId,
          verificationUrl: user.kycStatus?.diditVerificationUrl,
          submittedAt: user.kycStatus?.submittedAt,
          verifiedAt: user.kycStatus?.verifiedAt,
          expiresAt: user.kycStatus?.diditSessionExpiresAt
        },
        diditAPI: diditStatus ? { status: diditStatus.status, verified: diditStatus.verified, failureReason: diditStatus.failureReason } : null,
        diditError,
        diagnosis: {
          hasSession: !!user.kycStatus?.diditSessionId,
          dbSaysVerified: user.isKYCVerified === true,
          diditSaysVerified: diditStatus?.verified === true,
          statusMatch: user.kycStatus?.status === diditStatus?.status,
          mismatch: user.isKYCVerified && !diditStatus?.verified
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.resetKYCVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.kycStatus.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot reset approved KYC verification' });
    }

    if (user.kycStatus.diditSessionId) {
      await diditService.cancelVerification(user.kycStatus.diditSessionId);
    }

    user.kycStatus.status = 'unverified';
    user.kycStatus.diditSessionId = undefined;
    user.kycStatus.diditVerificationUrl = undefined;
    user.kycStatus.diditSessionExpiresAt = undefined;
    user.kycStatus.submittedAt = undefined;
    user.kycStatus.rejectionReason = undefined;
    user.isKYCVerified = false;
    await user.save();

    res.json({ success: true, message: 'KYC verification reset. You can start a new verification.', data: { status: 'unverified', isVerified: false } });
  } catch (error) {
    console.error('❌ Reset KYC error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset KYC verification' });
  }
};

// ======================================================
// =================== USER PROFILE =====================
// ======================================================

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let tierLimits;
    try {
      tierLimits = user.getTierLimits();
    } catch (error) {
      tierLimits = { name: 'Free', maxTransactionsPerMonth: 3, maxTransactionAmount: { USD: 500, NGN: 750000 }, escrowFee: { USD: 0.05, NGN: 0.05 } };
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name || `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          verified: user.verified,
          isKYCVerified: user.isKYCVerified,
          kycStatus: user.kycStatus?.status || 'unverified',
          tier: user.tier,
          role: user.role,
          profilePicture: user.profilePicture,
          phone: user.phone
        },
        tierLimits
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, phone, avatar, bio, address, socialLinks, businessInfo } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // ── KYC Field Locking ─────────────────────────────────────────────────────
    // After KYC approval, core identity fields are locked to prevent fraud.
    // Fields that CAN still be changed: phone, avatar, bio, address, socialLinks, password, preferences.
    const kycApproved = user.isKYCVerified && user.kycStatus?.status === 'approved';
    if (kycApproved) {
      const LOCKED_FIELDS = ['name', 'businessInfo.companyName', 'accountType'];
      const attemptedLocked = [];

      // Check if name is being changed (covers firstName/lastName rolled into name)
      if (req.body.name !== undefined && req.body.name !== user.name) {
        attemptedLocked.push('Full Name');
      }
      // Check if businessName / companyName is being changed
      if (businessInfo?.companyName !== undefined && businessInfo.companyName !== user.businessInfo?.companyName) {
        attemptedLocked.push('Business Name');
      }

      if (attemptedLocked.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Cannot change ${attemptedLocked.join(' and ')} after KYC approval. Contact support@dealcross.net if this is an error.`
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const updates = {
      name,
      phone,
      avatar,
      bio,
      address: address ? { ...user.address, ...address } : user.address,
      socialLinks: socialLinks ? { ...user.socialLinks, ...socialLinks } : user.socialLinks,
      businessInfo: businessInfo ? { ...user.businessInfo, ...businessInfo } : user.businessInfo
    };
    Object.keys(updates).forEach(key => { if (updates[key] !== undefined) user[key] = updates[key]; });
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: { id: user._id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar, bio: user.bio, address: user.address, socialLinks: user.socialLinks, businessInfo: user.businessInfo } }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    await emailService.sendPasswordChangedEmail(user.email, user.name);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

// ======================================================
// =================== TIER MANAGEMENT ==================
// ======================================================

exports.getTierInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const currentTierInfo = feeConfig.getTierInfo(user.tier);
    const allTiers = feeConfig.getAllTiers();

    res.json({ success: true, data: { currentTier: user.tier, currentTierInfo, allTiers, monthlyUsage: user.monthlyUsage, subscription: user.subscription } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tier information' });
  }
};

exports.calculateUpgradeBenefits = async (req, res) => {
  try {
    const { targetTier } = req.query;
    if (!targetTier) return res.status(400).json({ success: false, message: 'Target tier is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const benefits = feeConfig.getUpgradeBenefits(user.tier, targetTier);
    if (!benefits) return res.status(400).json({ success: false, message: 'Invalid tier comparison' });

    res.json({ success: true, data: benefits });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate upgrade benefits' });
  }
};

exports.initiateTierUpgrade = async (req, res) => {
  try {
    const { targetTier, currency, paymentMethod } = req.body;
    const validTiers = ['growth', 'enterprise', 'api'];
    if (!validTiers.includes(targetTier)) return res.status(400).json({ success: false, message: 'Invalid tier. Choose: growth, enterprise, or api' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const tierHierarchy = { starter: 0, growth: 1, enterprise: 2, api: 3 };
    if (tierHierarchy[user.tier] >= tierHierarchy[targetTier]) {
      return res.status(400).json({ success: false, message: 'Cannot downgrade tier. Please contact support.' });
    }

    const targetTierInfo = feeConfig.getTierInfo(targetTier);
    const selectedCurrency = currency === 'NGN' ? 'NGN' : 'USD';
    const monthlyCost = targetTierInfo.monthlyCost[selectedCurrency];
    const setupFee = targetTierInfo.setupFee ? targetTierInfo.setupFee[selectedCurrency] : 0;
    const totalAmount = targetTier === 'api' ? monthlyCost + setupFee : monthlyCost;
    const reference = `TIER_${user._id}_${Date.now()}`;

    res.json({
      success: true,
      message: 'Tier upgrade payment initiated',
      data: { reference, amount: totalAmount, currency: selectedCurrency, targetTier, monthlyCost, setupFee, userId: user._id, email: user.email, description: `Upgrade to ${targetTierInfo.name} tier` }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to initiate tier upgrade' });
  }
};

exports.completeTierUpgrade = async (req, res) => {
  try {
    const { paymentReference, targetTier } = req.body;
    if (!paymentReference || !targetTier) return res.status(400).json({ success: false, message: 'Payment reference and target tier required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const oldTier = user.tier;
    user.tier = targetTier;
    const now = new Date();
    user.subscription = { status: 'active', startDate: now, endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), lastPaymentDate: now, autoRenew: true, paymentMethod: 'card' };
    await user.save();

    const tierInfo = feeConfig.getTierInfo(targetTier);
    await emailService.sendTierUpgradeEmail(user.email, user.name, tierInfo.name);

    res.json({ success: true, message: `Successfully upgraded from ${oldTier} to ${targetTier} tier`, data: { user: { tier: user.tier, tierLimits: user.getTierLimits(), subscription: user.subscription } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to complete tier upgrade' });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.tier === 'starter') return res.status(400).json({ success: false, message: 'Starter tier has no subscription to cancel' });

    user.subscription.status = 'cancelled';
    user.subscription.autoRenew = false;
    await user.save();

    res.json({ success: true, message: `Subscription cancelled. You will retain ${user.tier} tier benefits until ${user.subscription.endDate.toDateString()}`, data: { subscription: user.subscription } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
  }
};

exports.renewSubscription = async (req, res) => {
  try {
    const { paymentReference } = req.body;
    if (!paymentReference) return res.status(400).json({ success: false, message: 'Payment reference is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.tier === 'starter') return res.status(400).json({ success: false, message: 'Starter tier has no subscription' });

    const now = new Date();
    user.subscription.status = 'active';
    user.subscription.lastPaymentDate = now;
    user.subscription.endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    user.subscription.autoRenew = true;
    await user.save();

    res.json({ success: true, message: 'Subscription renewed successfully', data: { subscription: user.subscription } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to renew subscription' });
  }
};

// ======================================================
// =================== STATISTICS =======================
// ======================================================

exports.getUserStatistics = async (req, res) => {
  try {
    const userId = req.user._id;
    const [buyingEscrows, sellingEscrows] = await Promise.all([
      Escrow.find({ buyer: userId }),
      Escrow.find({ seller: userId })
    ]);

    const buyingStats = _calculateEscrowStats(buyingEscrows, req.user.totalSpent);
    const sellingStats = _calculateEscrowStats(sellingEscrows, req.user.totalEarned, true);
    const tierLimits = req.user.getTierLimits();

    res.json({
      success: true,
      data: {
        buying: buyingStats,
        selling: sellingStats,
        monthlyTransactions: {
          count: req.user.monthlyUsage.transactionCount,
          limit: tierLimits.maxTransactionsPerMonth,
          remaining: tierLimits.maxTransactionsPerMonth === -1 ? 'Unlimited' : Math.max(0, tierLimits.maxTransactionsPerMonth - req.user.monthlyUsage.transactionCount)
        },
        tier: req.user.tier,
        tierLimits,
        subscription: req.user.subscription
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};

// ======================================================
// =================== 2FA MANAGEMENT ===================
// ======================================================

exports.enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.twoFactorEnabled) return res.status(400).json({ success: false, message: '2FA is already enabled' });

    const secret = speakeasy.generateSecret({ name: `Dealcross (${user.email})` });
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({ success: true, message: '2FA setup initiated', data: { qrCode: qrCodeUrl, secret: secret.base32, instructions: 'Scan the QR code with Google Authenticator or enter the secret manually, then verify with a code to complete setup' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required' });

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.twoFactorSecret) return res.status(400).json({ success: false, message: 'Please initiate 2FA setup first' });

    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 2 });
    if (!verified) return res.status(400).json({ success: false, message: 'Invalid verification code' });

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify 2FA' });
  }
};

exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required to disable 2FA' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.twoFactorEnabled) return res.status(400).json({ success: false, message: '2FA is not enabled' });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Incorrect password' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
};

// ======================================================
// ================= NOTIFICATION SETTINGS ==============
// ======================================================

exports.getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        notifications: user.notificationPreferences || {
          email: { transactionUpdates: true, disputeAlerts: true, paymentConfirmations: true, marketingEmails: false, weeklyDigest: true },
          sms: { transactionUpdates: false, disputeAlerts: true, paymentConfirmations: false },
          push: { transactionUpdates: true, disputeAlerts: true, messages: true, paymentConfirmations: true }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification preferences' });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { email, sms, push } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.notificationPreferences) user.notificationPreferences = { email: {}, sms: {}, push: {} };
    if (email) user.notificationPreferences.email = { ...user.notificationPreferences.email, ...email };
    if (sms) user.notificationPreferences.sms = { ...user.notificationPreferences.sms, ...sms };
    if (push) user.notificationPreferences.push = { ...user.notificationPreferences.push, ...push };
    await user.save();

    res.json({ success: true, message: 'Notification preferences updated successfully', data: { notifications: user.notificationPreferences } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notification preferences' });
  }
};

// ======================================================
// ================= PRIVACY & SECURITY =================
// ======================================================

exports.getPrivacySettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        privacy: user.privacySettings || { profileVisibility: 'public', showEmail: false, showPhone: false, showTransactionHistory: false, allowMessages: true }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch privacy settings' });
  }
};

exports.updatePrivacySettings = async (req, res) => {
  try {
    const { profileVisibility, showEmail, showPhone, showTransactionHistory, allowMessages } = req.body;
    const validVisibilityOptions = ['public', 'private', 'contacts'];
    if (profileVisibility && !validVisibilityOptions.includes(profileVisibility)) {
      return res.status(400).json({ success: false, message: 'Invalid profile visibility option' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.privacySettings) user.privacySettings = {};
    const updates = { profileVisibility, showEmail, showPhone, showTransactionHistory, allowMessages };
    Object.keys(updates).forEach(key => { if (updates[key] !== undefined) user.privacySettings[key] = updates[key]; });
    await user.save();

    res.json({ success: true, message: 'Privacy settings updated successfully', data: { privacy: user.privacySettings } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update privacy settings' });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Use loginSessions from auth.controller session tracking
    const sessions = (user.loginSessions || []).filter(s => s.isActive).map(s => ({
      id: s.sessionId,
      device: s.deviceType,
      browser: s.browser,
      ip: s.ipAddress,
      os: s.os,
      country: s.country,
      lastActive: s.lastActivity,
      createdAt: s.createdAt,
      current: false // client can determine from token
    }));

    res.json({ success: true, data: { sessions } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch active sessions' });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ success: false, message: 'Session ID is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const session = (user.loginSessions || []).find(s => s.sessionId === sessionId);
    if (session) {
      session.isActive = false;
      await user.save();
    }

    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to revoke session' });
  }
};

exports.revokeAllSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    (user.loginSessions || []).forEach(s => { s.isActive = false; });
    await user.save();

    res.json({ success: true, message: 'All sessions revoked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to revoke sessions' });
  }
};

// ======================================================
// ================= ACCOUNT MANAGEMENT =================
// ======================================================

exports.requestAccountDeletion = async (req, res) => {
  try {
    const { password, reason } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required to delete account' });

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Incorrect password' });

    const activeEscrows = await Escrow.find({
      $or: [{ buyer: user._id }, { seller: user._id }],
      status: { $in: ['pending', 'accepted', 'funded', 'delivered', 'disputed'] }
    });

    if (activeEscrows.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete account with active transactions. Please complete or cancel all active escrows first.', data: { activeEscrows: activeEscrows.length } });
    }

    user.accountStatus = 'pending_deletion';
    user.deletionRequestedAt = new Date();
    user.deletionReason = reason;
    user.scheduledDeletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await user.save();

    await emailService.sendAccountDeletionRequestEmail(user.email, user.name, user.scheduledDeletionDate);

    res.json({ success: true, message: 'Account deletion requested. Your account will be permanently deleted in 30 days.', data: { scheduledDeletionDate: user.scheduledDeletionDate } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to request account deletion' });
  }
};

exports.cancelAccountDeletion = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.accountStatus !== 'pending_deletion') return res.status(400).json({ success: false, message: 'No pending deletion request found' });

    user.accountStatus = 'active';
    user.deletionRequestedAt = undefined;
    user.deletionReason = undefined;
    user.scheduledDeletionDate = undefined;
    await user.save();

    await emailService.sendAccountDeletionCancelledEmail(user.email, user.name);
    res.json({ success: true, message: 'Account deletion request cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel account deletion' });
  }
};

exports.exportUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFactorSecret');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const escrows = await Escrow.find({ $or: [{ buyer: user._id }, { seller: user._id }] });
    const userData = { profile: user.toObject(), escrows: escrows.map(e => e.toObject()), exportDate: new Date(), dataRetentionPolicy: '30 days after account deletion' };

    res.json({ success: true, message: 'User data exported successfully', data: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export user data' });
  }
};

// ✅ FIXED deleteAccount — models properly imported at top of file
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password, reason } = req.body;

    const user = await User.findById(userId).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.authProvider === 'local') {
      if (!password) return res.status(400).json({ success: false, message: 'Password required to delete account' });
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const activeEscrows = await Escrow.countDocuments({
      $or: [{ buyer: userId }, { seller: userId }],
      status: { $in: ['pending', 'funded', 'in_progress', 'in_dispute'] }
    });

    if (activeEscrows > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete account. You have ${activeEscrows} active transaction(s). Please complete or cancel them first.`, activeEscrows });
    }

    // ✅ Cleanup related data — models imported at top
    await Promise.allSettled([
      APIKey.deleteMany({ userId }),
      BankAccount.deleteMany({ userId }),
      Notification.deleteMany({ userId })
    ]);

    await User.findByIdAndDelete(userId);

    console.log('✅ User account permanently deleted:', user.email);
    res.json({ success: true, message: 'Account permanently deleted. You can create a new account with this email anytime.' });
  } catch (error) {
    console.error('❌ Delete account error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account', error: error.message });
  }
};

// ======================================================
// ================= VERIFICATION STATUS ================
// ======================================================

exports.getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        email: { verified: user.verified, email: user.email, verifiedAt: user.verifiedAt },
        kyc: { status: user.kycStatus.status || 'unverified', isVerified: user.isKYCVerified || false, submittedAt: user.kycStatus.submittedAt, verifiedAt: user.kycStatus.verifiedAt, rejectionReason: user.kycStatus.rejectionReason, canReapply: ['rejected', 'expired'].includes(user.kycStatus.status) },
        phone: { verified: user.phoneVerified || false, phone: user.phone, verifiedAt: user.phoneVerifiedAt },
        twoFactor: { enabled: user.twoFactorEnabled || false },
        overallStatus: _calculateOverallVerificationStatus(user)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch verification status' });
  }
};

// ======================================================
// ================= ACTIVITY LOG =======================
// ======================================================

exports.getActivityLog = async (req, res) => {
  try {
    const { limit = 50, skip = 0, type } = req.query;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let activities = user.activityLog || [];
    if (type) activities = activities.filter(a => a.type === type);
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const paginatedActivities = activities.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

    res.json({ success: true, data: { activities: paginatedActivities, total: activities.length, limit: parseInt(limit), skip: parseInt(skip) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch activity log' });
  }
};

exports.clearActivityLog = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.activityLog = [];
    await user.save();
    res.json({ success: true, message: 'Activity log cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear activity log' });
  }
};

// ======================================================
// ================= PRIVATE HELPERS ====================
// (prefixed with _ to avoid duplicate declarations)
// ======================================================

function _extractErrorMessage(error) {
  let msg = 'Failed to start verification. Please try again.';
  if (!error) return msg;
  if (typeof error === 'object' && error.detail) msg = error.detail;
  else if (typeof error === 'string') msg = error;
  if (msg.includes('authenticated') || msg.includes('access token') || msg.includes('401')) {
    msg = 'KYC service configuration error. Please contact support.';
  }
  return msg;
}

function _mapDiditStatus(status, verified, failureReason) {
  let kycStatus = 'pending';
  let isKYCVerified = false;
  let logMessage = '';

  if ((status === 'completed' || status === 'approved') && verified) {
    kycStatus = 'approved'; isKYCVerified = true; logMessage = '✅ KYC approved';
  } else if (status === 'failed') {
    kycStatus = 'rejected'; logMessage = `❌ KYC rejected: ${failureReason}`;
  } else if (status === 'expired') {
    kycStatus = 'expired'; logMessage = '⏰ KYC expired';
  } else if (status === 'processing' || status === 'pending') {
    kycStatus = 'in_progress';
  }
  return { kycStatus, isKYCVerified, logMessage };
}

function _updateUserKYCStatus(user, mappedStatus, verificationResult, failureReason) {
  const { kycStatus, isKYCVerified, logMessage } = mappedStatus;
  let hasChanges = false;

  if (user.kycStatus.status !== kycStatus) {
    user.kycStatus.status = kycStatus;
    user.isKYCVerified = isKYCVerified;
    hasChanges = true;
    if (kycStatus === 'approved') { user.kycStatus.verifiedAt = new Date(); user.kycStatus.verificationResult = verificationResult; }
    else if (kycStatus === 'rejected') { user.kycStatus.rejectionReason = failureReason || 'Verification failed'; user.kycStatus.reviewedAt = new Date(); }
    else if (kycStatus === 'expired') { user.kycStatus.rejectionReason = 'Verification session expired'; }
    if (logMessage) console.log(logMessage);
  }
  return hasChanges;
}

function _calculateEscrowStats(escrows, totalAmount, isSelling = false) {
  const stats = { total: escrows.length, pending: 0, accepted: 0, funded: 0, delivered: 0, completed: 0, disputed: 0, cancelled: 0 };
  escrows.forEach(escrow => { if (stats.hasOwnProperty(escrow.status)) stats[escrow.status]++; });
  if (isSelling) stats.totalEarned = totalAmount;
  else stats.totalSpent = totalAmount;
  return stats;
}

function _calculateOverallVerificationStatus(user) {
  const verifications = { email: user.verified, kyc: user.isKYCVerified, phone: user.phoneVerified || false };
  const total = Object.keys(verifications).length;
  const completed = Object.values(verifications).filter(Boolean).length;
  const percentage = Math.round((completed / total) * 100);
  let status = 'incomplete';
  if (percentage === 100) status = 'fully_verified';
  else if (percentage >= 66) status = 'mostly_verified';
  else if (percentage >= 33) status = 'partially_verified';
  return { status, percentage, completedVerifications: completed, totalVerifications: total, missingVerifications: Object.keys(verifications).filter(k => !verifications[k]) };
}

module.exports = exports;
