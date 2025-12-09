const User = require('../models/User.model');
const Escrow = require('../models/Escrow.model');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');
const feeConfig = require('../config/fee.config');
const mongoose = require('mongoose');

// Get User Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get tier limits
    const tierLimits = user.getTierLimits();

    res.status(200).json({
      success: true,
      data: {
        user,
        tierLimits
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, phone, avatar, bio, address, socialLinks, businessInfo } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;
    if (bio) user.bio = bio;
    if (address) user.address = { ...user.address, ...address };
    if (socialLinks) user.socialLinks = { ...user.socialLinks, ...socialLinks };
    if (businessInfo) user.businessInfo = { ...user.businessInfo, ...businessInfo };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          bio: user.bio,
          address: user.address,
          socialLinks: user.socialLinks,
          businessInfo: user.businessInfo
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send email notification
    await emailService.sendPasswordChangedEmail(user.email, user.name);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// ✅ NEW: Start Didit Verification
exports.startKYCVerification = async (req, res) => {
  try {
    const diditService = require('../services/didit.service');
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is verified
    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email before starting KYC',
        requiresEmailVerification: true
      });
    }

    // Check if already verified
    if (user.kycStatus.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Your KYC is already approved'
      });
    }

    // Check if there's an active session
    if (user.kycStatus.diditSessionId && user.kycStatus.diditSessionExpiresAt > new Date()) {
      return res.status(200).json({
        success: true,
        message: 'Active verification session found',
        data: {
          sessionId: user.kycStatus.diditSessionId,
          verificationUrl: user.kycStatus.diditVerificationUrl,
          expiresAt: user.kycStatus.diditSessionExpiresAt
        }
      });
    }

    // Create new Didit verification session
    const sessionResult = await diditService.createVerificationSession(user._id.toString(), {
      email: user.email,
      name: user.name,
      tier: user.tier
    });

    if (!sessionResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create verification session',
        error: sessionResult.error
      });
    }

    // Update user with session info
    user.kycStatus.status = 'pending';
    user.kycStatus.diditSessionId = sessionResult.data.sessionId;
    user.kycStatus.diditVerificationUrl = sessionResult.data.verificationUrl;
    user.kycStatus.diditSessionExpiresAt = new Date(sessionResult.data.expiresAt);
    user.markModified('kycStatus');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Verification session created successfully',
      data: {
        sessionId: sessionResult.data.sessionId,
        verificationUrl: sessionResult.data.verificationUrl,
        expiresAt: sessionResult.data.expiresAt
      }
    });

  } catch (error) {
    console.error('Start KYC verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start KYC verification',
      error: error.message
    });
  }
};

// ✅ NEW: Check Verification Status
exports.checkKYCStatus = async (req, res) => {
  try {
    const diditService = require('../services/didit.service');
    
    const user = await User.findById(req.user._id);
    if (!user || !user.kycStatus.diditSessionId) {
      return res.status(404).json({
        success: false,
        message: 'No verification session found'
      });
    }

    const statusResult = await diditService.getVerificationStatus(user.kycStatus.diditSessionId);

    if (!statusResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check verification status',
        error: statusResult.error
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: user.kycStatus.status,
        diditStatus: statusResult.data.status,
        verificationResult: statusResult.data.verificationResult,
        isKYCVerified: user.isKYCVerified
      }
    });

  } catch (error) {
    console.error('Check KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check KYC status',
      error: error.message
    });
  }
};

// ✅ NEW: Get Tier Information
exports.getTierInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentTierInfo = feeConfig.getTierInfo(user.tier);
    const allTiers = feeConfig.getAllTiers();

    res.status(200).json({
      success: true,
      data: {
        currentTier: user.tier,
        currentTierInfo,
        allTiers,
        monthlyUsage: user.monthlyUsage,
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Get tier info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tier information',
      error: error.message
    });
  }
};

// ✅ NEW: Calculate Upgrade Benefits
exports.calculateUpgradeBenefits = async (req, res) => {
  try {
    const { targetTier } = req.query;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const benefits = feeConfig.getUpgradeBenefits(user.tier, targetTier);
    
    if (!benefits) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier comparison'
      });
    }

    res.status(200).json({
      success: true,
      data: benefits
    });

  } catch (error) {
    console.error('Calculate upgrade benefits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate upgrade benefits',
      error: error.message
    });
  }
};

// ✅ NEW: Initialize Tier Upgrade Payment
exports.initiateTierUpgrade = async (req, res) => {
  try {
    const { targetTier, currency, paymentMethod } = req.body;

    const validTiers = ['growth', 'enterprise', 'api'];
    if (!validTiers.includes(targetTier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier. Choose: growth, enterprise, or api'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if trying to downgrade
    const tierHierarchy = { starter: 0, growth: 1, enterprise: 2, api: 3 };
    if (tierHierarchy[user.tier] >= tierHierarchy[targetTier]) {
      return res.status(400).json({
        success: false,
        message: 'Cannot downgrade tier. Please contact support.'
      });
    }

    const targetTierInfo = feeConfig.getTierInfo(targetTier);
    const monthlyCost = targetTierInfo.monthlyCost[currency === 'NGN' ? 'NGN' : 'USD'];
    const setupFee = targetTierInfo.setupFee ? targetTierInfo.setupFee[currency === 'NGN' ? 'NGN' : 'USD'] : 0;
    
    // For API tier, add setup fee
    const totalAmount = targetTier === 'api' ? monthlyCost + setupFee : monthlyCost;

    // Generate payment reference
    const reference = `TIER_${user._id}_${Date.now()}`;

    const paymentData = {
      reference,
      amount: totalAmount,
      currency: currency || 'USD',
      targetTier,
      monthlyCost,
      setupFee,
      userId: user._id,
      email: user.email,
      description: `Upgrade to ${targetTierInfo.name} tier`
    };

    // TODO: Initialize payment with actual gateway (Paystack/Flutterwave)
    // For now, return payment data
    
    res.status(200).json({
      success: true,
      message: 'Tier upgrade payment initiated',
      data: paymentData
    });

  } catch (error) {
    console.error('Initiate tier upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate tier upgrade',
      error: error.message
    });
  }
};

// ✅ NEW: Complete Tier Upgrade (after payment)
exports.completeTierUpgrade = async (req, res) => {
  try {
    const { paymentReference, targetTier } = req.body;

    if (!paymentReference || !targetTier) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference and target tier required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // TODO: Verify payment with gateway
    // For now, assume payment is verified

    // Upgrade tier
    const oldTier = user.tier;
    user.tier = targetTier;
    
    // Set subscription details
    user.subscription = {
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      lastPaymentDate: new Date(),
      autoRenew: true,
      paymentMethod: 'card' // TODO: Get from payment data
    };

    await user.save();

    // Send confirmation email
    const tierInfo = feeConfig.getTierInfo(targetTier);
    await emailService.sendTierUpgradeEmail(user.email, user.name, tierInfo.name);

    res.status(200).json({
      success: true,
      message: `Successfully upgraded from ${oldTier} to ${targetTier} tier`,
      data: {
        user: {
          tier: user.tier,
          tierLimits: user.getTierLimits(),
          subscription: user.subscription
        }
      }
    });

  } catch (error) {
    console.error('Complete tier upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete tier upgrade',
      error: error.message
    });
  }
};

// ✅ NEW: Cancel Subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.tier === 'starter') {
      return res.status(400).json({
        success: false,
        message: 'Starter tier has no subscription to cancel'
      });
    }

    // Mark subscription as cancelled
    user.subscription.status = 'cancelled';
    user.subscription.autoRenew = false;
    
    // User keeps tier until end date
    await user.save();

    res.status(200).json({
      success: true,
      message: `Subscription cancelled. You will retain ${user.tier} tier benefits until ${user.subscription.endDate.toDateString()}`,
      data: {
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};

// ✅ NEW: Renew Subscription
exports.renewSubscription = async (req, res) => {
  try {
    const { paymentReference } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.tier === 'starter') {
      return res.status(400).json({
        success: false,
        message: 'Starter tier has no subscription'
      });
    }

    // TODO: Verify payment with gateway

    // Renew subscription
    user.subscription.status = 'active';
    user.subscription.lastPaymentDate = new Date();
    user.subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.subscription.autoRenew = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Subscription renewed successfully',
      data: {
        subscription: user.subscription
      }
    });

  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to renew subscription',
      error: error.message
    });
  }
};

// Get User Statistics
exports.getUserStatistics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Buying statistics
    const buyingEscrows = await Escrow.find({ buyer: userId });
    const buyingStats = {
      total: buyingEscrows.length,
      pending: buyingEscrows.filter(e => e.status === 'pending').length,
      accepted: buyingEscrows.filter(e => e.status === 'accepted').length,
      funded: buyingEscrows.filter(e => e.status === 'funded').length,
      delivered: buyingEscrows.filter(e => e.status === 'delivered').length,
      completed: buyingEscrows.filter(e => e.status === 'completed').length,
      disputed: buyingEscrows.filter(e => e.status === 'disputed').length,
      cancelled: buyingEscrows.filter(e => e.status === 'cancelled').length,
      totalSpent: req.user.totalSpent
    };

    // Selling statistics
    const sellingEscrows = await Escrow.find({ seller: userId });
    const sellingStats = {
      total: sellingEscrows.length,
      pending: sellingEscrows.filter(e => e.status === 'pending').length,
      accepted: sellingEscrows.filter(e => e.status === 'accepted').length,
      funded: sellingEscrows.filter(e => e.status === 'funded').length,
      delivered: sellingEscrows.filter(e => e.status === 'delivered').length,
      completed: sellingEscrows.filter(e => e.status === 'completed').length,
      disputed: sellingEscrows.filter(e => e.status === 'disputed').length,
      totalEarned: req.user.totalEarned
    };

    const tierLimits = req.user.getTierLimits();

    res.status(200).json({
      success: true,
      data: {
        buying: buyingStats,
        selling: sellingStats,
        monthlyTransactions: {
          count: req.user.monthlyUsage.transactionCount,
          limit: tierLimits.maxTransactionsPerMonth,
          remaining: tierLimits.maxTransactionsPerMonth === -1 
            ? 'Unlimited' 
            : tierLimits.maxTransactionsPerMonth - req.user.monthlyUsage.transactionCount
        },
        tier: req.user.tier,
        tierLimits,
        subscription: req.user.subscription
      }
    });

  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// Enable 2FA
exports.enable2FA = async (req, res) => {
  try {
    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Dealcross (${user.email})`
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save secret (temporarily)
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA setup initiated',
      data: {
        qrCode: qrCodeUrl,
        secret: secret.base32,
        instructions: 'Scan QR code with Google Authenticator or enter secret manually'
      }
    });

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable 2FA',
      error: error.message
    });
  }
};

// Verify 2FA and Enable
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const speakeasy = require('speakeasy');

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA enabled successfully'
    });

  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA',
      error: error.message
    });
  }
};

// Disable 2FA
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA disabled successfully'
    });

  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
      error: error.message
    });
  }
};

module.exports = exports;