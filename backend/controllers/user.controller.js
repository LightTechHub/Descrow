const User = require('../models/User.model');
const Escrow = require('../models/Escrow.model');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');
const feeConfig = require('../config/fee.config');
const mongoose = require('mongoose');
const diditService = require('../services/didit.service');

// ... your existing methods ...

// ======================================================
// ======================= KYC ==========================
// ======================================================

/**
 * Start KYC verification process with Didit
 */
exports.startKYCVerification = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is verified FIRST
    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email before starting KYC verification'
      });
    }

    // Check if already verified
    if (user.isKYCVerified && user.kycStatus.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Your KYC is already verified'
      });
    }

    // Check if there's a pending verification
    if (user.kycStatus.status === 'pending' || user.kycStatus.status === 'in_progress') {
      if (user.kycStatus.diditSessionId) {
        return res.status(400).json({
          success: false,
          message: 'You already have a verification in progress',
          data: {
            verificationUrl: user.kycStatus.diditVerificationUrl,
            sessionId: user.kycStatus.diditSessionId
          }
        });
      }
    }

    console.log('🔄 Creating Didit verification session for user:', userId);

    // Create Didit verification session
    const diditResponse = await diditService.createVerificationSession(
      userId.toString(),
      {
        email: user.email,
        name: user.name,
        tier: user.tier || 'free'
      }
    );

    if (!diditResponse.success) {
      console.error('❌ Failed to create Didit session:', diditResponse);
      
      // Check if it's an API key error
      if (diditResponse.error?.includes('401') || diditResponse.error?.includes('authenticated')) {
        return res.status(500).json({
          success: false,
          message: 'KYC service configuration error. Please contact support.',
          error: 'Invalid Didit API key'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: diditResponse.message || 'Failed to start verification. Please try again.',
        error: process.env.NODE_ENV === 'development' ? diditResponse.error : undefined
      });
    }

    // Update user with session info
    user.kycStatus.status = 'pending';
    user.kycStatus.diditSessionId = diditResponse.data.sessionId;
    user.kycStatus.diditVerificationUrl = diditResponse.data.verificationUrl;
    user.kycStatus.diditSessionExpiresAt = diditResponse.data.expiresAt;
    user.kycStatus.submittedAt = new Date();
    
    await user.save();

    console.log('✅ KYC verification started for user:', userId);

    res.json({
      success: true,
      message: 'Verification session created successfully',
      data: {
        verificationUrl: diditResponse.data.verificationUrl,
        sessionId: diditResponse.data.sessionId,
        expiresAt: diditResponse.data.expiresAt
      }
    });

  } catch (error) {
    console.error('❌ Start KYC verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start KYC verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check KYC status from Didit API and update user
 */
exports.checkKYCStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If no session ID, return current status
    if (!user.kycStatus.diditSessionId) {
      return res.json({
        success: true,
        data: {
          status: user.kycStatus.status || 'unverified',
          isVerified: user.isKYCVerified || false,
          verifiedAt: user.kycStatus.verifiedAt,
          rejectionReason: user.kycStatus.rejectionReason,
          submittedAt: user.kycStatus.submittedAt
        }
      });
    }

    console.log('🔍 Checking Didit verification status for session:', user.kycStatus.diditSessionId);

    // Get status from Didit API
    const diditResponse = await diditService.getVerificationStatus(user.kycStatus.diditSessionId);

    if (!diditResponse.success) {
      console.error('❌ Failed to check Didit status:', diditResponse);
      // Return cached status if API fails
      return res.json({
        success: true,
        data: {
          status: user.kycStatus.status,
          isVerified: user.isKYCVerified,
          verifiedAt: user.kycStatus.verifiedAt,
          rejectionReason: user.kycStatus.rejectionReason
        }
      });
    }

    const { status, verified, verificationResult, failureReason } = diditResponse.data;

    // Map Didit status to our status
    let kycStatus = 'pending';
    let isKYCVerified = false;
    let hasChanges = false;

    if (status === 'completed' && verified) {
      kycStatus = 'approved';
      isKYCVerified = true;
      
      if (user.kycStatus.status !== 'approved') {
        user.kycStatus.verifiedAt = new Date();
        user.kycStatus.verificationResult = verificationResult;
        hasChanges = true;
        console.log('✅ KYC approved for user:', userId);
      }
    } else if (status === 'failed') {
      kycStatus = 'rejected';
      if (user.kycStatus.status !== 'rejected') {
        user.kycStatus.rejectionReason = failureReason || 'Verification failed';
        user.kycStatus.reviewedAt = new Date();
        hasChanges = true;
        console.log('❌ KYC rejected for user:', userId, 'Reason:', failureReason);
      }
    } else if (status === 'expired') {
      kycStatus = 'expired';
      if (user.kycStatus.status !== 'expired') {
        user.kycStatus.rejectionReason = 'Verification session expired';
        hasChanges = true;
        console.log('⏰ KYC expired for user:', userId);
      }
    } else if (status === 'processing' || status === 'pending') {
      kycStatus = 'in_progress';
    }

    // Update user if status changed
    if (hasChanges || user.kycStatus.status !== kycStatus) {
      user.kycStatus.status = kycStatus;
      user.isKYCVerified = isKYCVerified;
      await user.save();
    }

    res.json({
      success: true,
      data: {
        status: kycStatus,
        isVerified: isKYCVerified,
        verifiedAt: user.kycStatus.verifiedAt,
        rejectionReason: user.kycStatus.rejectionReason,
        submittedAt: user.kycStatus.submittedAt
      }
    });

  } catch (error) {
    console.error('❌ Check KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check KYC status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ... other methods (KEEP THESE, REMOVE DUPLICATES BELOW) ...

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

// ✅ Get Tier Information
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

// ✅ Calculate Upgrade Benefits
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

// ✅ Initialize Tier Upgrade Payment
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

// ✅ Complete Tier Upgrade (after payment)
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

// ✅ Cancel Subscription
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

// ✅ Renew Subscription
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