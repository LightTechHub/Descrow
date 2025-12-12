const User = require('../models/User.model');
const Escrow = require('../models/Escrow.model');
const { validationResult } = require('express-validator');
const emailService = require('../services/email.service');
const feeConfig = require('../config/fee.config');
const mongoose = require('mongoose');
const diditService = require('../services/didit.service');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/// ======================================================
// ======================= KYC ==========================
// ======================================================

/**
 * Start KYC verification process with Didit
 */
exports.startKYCVerification = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate prerequisites
    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email before starting KYC verification'
      });
    }

    if (user.isKYCVerified && user.kycStatus.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Your KYC is already verified'
      });
    }

    // ✅ CHECK IF EXISTING SESSION IS VALID
    if (['pending', 'in_progress'].includes(user.kycStatus.status) && user.kycStatus.diditSessionId) {
      // Check if session is expired
      const sessionExpired = user.kycStatus.diditSessionExpiresAt && 
                            new Date(user.kycStatus.diditSessionExpiresAt) < new Date();
      
      if (!sessionExpired && user.kycStatus.diditVerificationUrl) {
        // Session still valid, return existing URL
        console.log('✅ Returning existing valid session:', user.kycStatus.diditSessionId);
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
      } else {
        // Session expired or invalid, clear it
        console.log('⚠️ Previous session expired or invalid, creating new one');
        user.kycStatus.status = 'unverified';
        user.kycStatus.diditSessionId = undefined;
        user.kycStatus.diditVerificationUrl = undefined;
        user.kycStatus.diditSessionExpiresAt = undefined;
        await user.save();
      }
    }

    console.log('🔄 Creating NEW Didit verification session for user:', userId);

    // Create NEW Didit verification session
    const diditResponse = await diditService.createVerificationSession(
      userId.toString(),
      {
        email: user.email,
        name: user.name,
        tier: user.tier || 'starter',
        phone: user.phone
      }
    );

    if (!diditResponse.success) {
      console.error('❌ Failed to create Didit session:', diditResponse);
      
      const errorMessage = extractErrorMessage(diditResponse.error);
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? diditResponse.error : undefined
      });
    }

    // Update user with NEW session info
    user.kycStatus.status = 'pending';
    user.kycStatus.diditSessionId = diditResponse.data.sessionId;
    user.kycStatus.diditVerificationUrl = diditResponse.data.verificationUrl;
    user.kycStatus.diditSessionExpiresAt = diditResponse.data.expiresAt;
    user.kycStatus.submittedAt = new Date();
    
    await user.save();

    console.log('✅ NEW KYC verification session created for user:', userId);

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
          submittedAt: user.kycStatus.submittedAt,
          verificationUrl: user.kycStatus.diditVerificationUrl
        }
      });
    }

    console.log('🔍 Checking Didit verification status for session:', user.kycStatus.diditSessionId);

    // Get status from Didit API
    const diditResponse = await diditService.getVerificationStatus(user.kycStatus.diditSessionId);

    if (!diditResponse.success) {
      console.error('❌ Failed to check Didit status:', diditResponse);
      
      // ✅ If session not found on Didit (404), clear local session
      if (diditResponse.error?.status === 404 || 
          diditResponse.message?.includes('not found') ||
          diditResponse.message?.includes('does not exist')) {
        console.log('⚠️ Session not found on Didit, clearing local session');
        user.kycStatus.status = 'unverified';
        user.kycStatus.diditSessionId = undefined;
        user.kycStatus.diditVerificationUrl = undefined;
        user.kycStatus.diditSessionExpiresAt = undefined;
        await user.save();
        
        return res.json({
          success: true,
          data: {
            status: 'unverified',
            isVerified: false,
            message: 'Previous session expired. Please start a new verification.'
          }
        });
      }
      
      // Return cached status if API fails but session might still be valid
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

    // Map Didit status to our status
    const updatedStatus = mapDiditStatus(status, verified, failureReason);
    const hasChanges = updateUserKYCStatus(user, updatedStatus, verificationResult, failureReason);

    // Save if changes occurred
    if (hasChanges) {
      await user.save();
      console.log(`📝 KYC status updated for user ${userId}: ${updatedStatus.kycStatus}`);
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
    res.status(500).json({
      success: false,
      message: 'Failed to check KYC status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * ✅ NEW: Reset/Cancel KYC Verification
 */
exports.resetKYCVerification = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow reset if not approved
    if (user.kycStatus.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reset approved KYC verification'
      });
    }

    console.log('🔄 Resetting KYC verification for user:', userId);

    // Cancel on Didit if session exists
    if (user.kycStatus.diditSessionId) {
      await diditService.cancelVerification(user.kycStatus.diditSessionId);
    }

    // Clear KYC status
    user.kycStatus.status = 'unverified';
    user.kycStatus.diditSessionId = undefined;
    user.kycStatus.diditVerificationUrl = undefined;
    user.kycStatus.diditSessionExpiresAt = undefined;
    user.kycStatus.submittedAt = undefined;
    user.kycStatus.rejectionReason = undefined;
    user.isKYCVerified = false;

    await user.save();

    console.log('✅ KYC verification reset for user:', userId);

    res.json({
      success: true,
      message: 'KYC verification reset successfully. You can start a new verification.',
      data: {
        status: 'unverified',
        isVerified: false
      }
    });

  } catch (error) {
    console.error('❌ Reset KYC verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset KYC verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to extract error message
function extractErrorMessage(error) {
  let errorMessage = 'Failed to start verification. Please try again.';
  
  if (!error) return errorMessage;
  
  if (typeof error === 'object' && error.detail) {
    errorMessage = error.detail;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  if (errorMessage.includes('authenticated') || 
      errorMessage.includes('access token') || 
      errorMessage.includes('401')) {
    errorMessage = 'KYC service configuration error. Please contact support.';
  }
  
  return errorMessage;
}

// Map Didit status to application KYC status
function mapDiditStatus(status, verified, failureReason) {
  let kycStatus = 'pending';
  let isKYCVerified = false;
  let logMessage = '';

  if (status === 'completed' && verified) {
    kycStatus = 'approved';
    isKYCVerified = true;
    logMessage = '✅ KYC approved';
  } else if (status === 'failed') {
    kycStatus = 'rejected';
    logMessage = `❌ KYC rejected: ${failureReason}`;
  } else if (status === 'expired') {
    kycStatus = 'expired';
    logMessage = '⏰ KYC expired';
  } else if (status === 'processing' || status === 'pending') {
    kycStatus = 'in_progress';
  }

  return { kycStatus, isKYCVerified, logMessage };
}

// Update user KYC status
function updateUserKYCStatus(user, mappedStatus, verificationResult, failureReason) {
  const { kycStatus, isKYCVerified, logMessage } = mappedStatus;
  let hasChanges = false;

  if (user.kycStatus.status !== kycStatus) {
    user.kycStatus.status = kycStatus;
    user.isKYCVerified = isKYCVerified;
    hasChanges = true;

    if (kycStatus === 'approved') {
      user.kycStatus.verifiedAt = new Date();
      user.kycStatus.verificationResult = verificationResult;
    } else if (kycStatus === 'rejected') {
      user.kycStatus.rejectionReason = failureReason || 'Verification failed';
      user.kycStatus.reviewedAt = new Date();
    } else if (kycStatus === 'expired') {
      user.kycStatus.rejectionReason = 'Verification session expired';
    }

    if (logMessage) console.log(logMessage);
  }

  return hasChanges;
}

/**
 * Check KYC verification status
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

    // If user has a Didit session ID, fetch latest status from Didit
    if (user.kycStatus.diditSessionId) {
      try {
        const diditStatus = await diditService.getVerificationStatus(
          user.kycStatus.diditSessionId
        );

        if (diditStatus.success && diditStatus.data) {
          const { status, verified, failureReason, verificationResult } = diditStatus.data;

          // Map Didit status to our status
          const mappedStatus = mapDiditStatus(status, verified, failureReason);
          
          // Update user status if changed
          const hasChanges = updateUserKYCStatus(
            user,
            mappedStatus,
            verificationResult,
            failureReason
          );

          if (hasChanges) {
            await user.save();
          }
        }
      } catch (error) {
        console.error('⚠️ Error fetching Didit status:', error);
        // Continue with stored status if Didit check fails
      }
    }

    res.json({
      success: true,
      data: {
        status: user.kycStatus.status || 'unverified',
        isKYCVerified: user.isKYCVerified || false,
        sessionId: user.kycStatus.diditSessionId,
        verificationUrl: user.kycStatus.diditVerificationUrl,
        submittedAt: user.kycStatus.submittedAt,
        verifiedAt: user.kycStatus.verifiedAt,
        reviewedAt: user.kycStatus.reviewedAt,
        rejectionReason: user.kycStatus.rejectionReason,
        expiresAt: user.kycStatus.diditSessionExpiresAt
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

// ======================================================
// =================== USER PROFILE =====================
// ======================================================

/**
 * Get User Profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get tier limits - with error handling
    let tierLimits;
    try {
      tierLimits = user.getTierLimits();
    } catch (error) {
      console.error('Error getting tier limits:', error);
      // Fallback tier limits
      tierLimits = {
        name: 'Free',
        maxTransactionsPerMonth: 3,
        maxTransactionAmount: { USD: 500, NGN: 750000 },
        escrowFee: { USD: 0.05, NGN: 0.05 }
      };
    }

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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update User Profile
 */
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

    // Update fields conditionally
    const updates = {
      name,
      phone,
      avatar,
      bio,
      address: address ? { ...user.address, ...address } : user.address,
      socialLinks: socialLinks ? { ...user.socialLinks, ...socialLinks } : user.socialLinks,
      businessInfo: businessInfo ? { ...user.businessInfo, ...businessInfo } : user.businessInfo
    };

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    });

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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change Password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// ======================================================
// =================== TIER MANAGEMENT ==================
// ======================================================

/**
 * Get Tier Information
 */
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Calculate Upgrade Benefits
 */
exports.calculateUpgradeBenefits = async (req, res) => {
  try {
    const { targetTier } = req.query;
    
    if (!targetTier) {
      return res.status(400).json({
        success: false,
        message: 'Target tier is required'
      });
    }

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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Initialize Tier Upgrade Payment
 */
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
    const selectedCurrency = currency === 'NGN' ? 'NGN' : 'USD';
    const monthlyCost = targetTierInfo.monthlyCost[selectedCurrency];
    const setupFee = targetTierInfo.setupFee ? targetTierInfo.setupFee[selectedCurrency] : 0;
    
    // For API tier, add setup fee
    const totalAmount = targetTier === 'api' ? monthlyCost + setupFee : monthlyCost;

    // Generate payment reference
    const reference = `TIER_${user._id}_${Date.now()}`;

    const paymentData = {
      reference,
      amount: totalAmount,
      currency: selectedCurrency,
      targetTier,
      monthlyCost,
      setupFee,
      userId: user._id,
      email: user.email,
      description: `Upgrade to ${targetTierInfo.name} tier`
    };

    // TODO: Initialize payment with actual gateway (Paystack/Flutterwave)
    
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Complete Tier Upgrade (after payment verification)
 */
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

    // Upgrade tier
    const oldTier = user.tier;
    user.tier = targetTier;
    
    // Set subscription details
    const now = new Date();
    user.subscription = {
      status: 'active',
      startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      lastPaymentDate: now,
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Cancel Subscription
 */
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Renew Subscription
 */
exports.renewSubscription = async (req, res) => {
  try {
    const { paymentReference } = req.body;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

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
    const now = new Date();
    user.subscription.status = 'active';
    user.subscription.lastPaymentDate = now;
    user.subscription.endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ======================================================
// =================== STATISTICS =======================
// ======================================================

/**
 * Get User Statistics
 */
exports.getUserStatistics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch escrows in parallel
    const [buyingEscrows, sellingEscrows] = await Promise.all([
      Escrow.find({ buyer: userId }),
      Escrow.find({ seller: userId })
    ]);

    // Calculate buying statistics
    const buyingStats = calculateEscrowStats(buyingEscrows, req.user.totalSpent);

    // Calculate selling statistics
    const sellingStats = calculateEscrowStats(sellingEscrows, req.user.totalEarned, true);

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
            : Math.max(0, tierLimits.maxTransactionsPerMonth - req.user.monthlyUsage.transactionCount)
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ======================================================
// =================== 2FA MANAGEMENT ===================
// ======================================================

/**
 * Enable 2FA
 */
exports.enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Dealcross (${user.email})`
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save secret (temporarily until verified)
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.status(200).json({
      success: true,
      message: '2FA setup initiated',
      data: {
        qrCode: qrCodeUrl,
        secret: secret.base32,
        instructions: 'Scan the QR code with Google Authenticator or enter the secret manually, then verify with a code to complete setup'
      }
    });

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable 2FA',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify 2FA and Enable
 */
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Please initiate 2FA setup first'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps for clock drift
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Disable 2FA
 */
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to disable 2FA'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled'
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ======================================================
// =================== HELPER FUNCTIONS =================
// ======================================================

/**
 * Extract meaningful error message from Didit error response
 */
function extractErrorMessage(error) {
  let errorMessage = 'Failed to start verification. Please try again.';
  
  if (!error) return errorMessage;
  
  // Handle object with detail property
  if (typeof error === 'object' && error.detail) {
    errorMessage = error.detail;
  } 
  // Handle string error
  else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  // Check for authentication/API key errors
  if (errorMessage.includes('authenticated') || 
      errorMessage.includes('access token') || 
      errorMessage.includes('401')) {
    errorMessage = 'KYC service configuration error. Please contact support.';
  }
  
  return errorMessage;
}

/**
 * Map Didit status to application KYC status
 */
function mapDiditStatus(status, verified, failureReason) {
  let kycStatus = 'pending';
  let isKYCVerified = false;
  let logMessage = '';

  if (status === 'completed' && verified) {
    kycStatus = 'approved';
    isKYCVerified = true;
    logMessage = '✅ KYC approved';
  } else if (status === 'failed') {
    kycStatus = 'rejected';
    logMessage = `❌ KYC rejected: ${failureReason}`;
  } else if (status === 'expired') {
    kycStatus = 'expired';
    logMessage = '⏰ KYC expired';
  } else if (status === 'processing' || status === 'pending') {
    kycStatus = 'in_progress';
  }

  return { kycStatus, isKYCVerified, logMessage };
}

/**
 * Update user KYC status
 */
function updateUserKYCStatus(user, mappedStatus, verificationResult, failureReason) {
  const { kycStatus, isKYCVerified, logMessage } = mappedStatus;
  let hasChanges = false;

  if (user.kycStatus.status !== kycStatus) {
    user.kycStatus.status = kycStatus;
    user.isKYCVerified = isKYCVerified;
    hasChanges = true;

    if (kycStatus === 'approved') {
      user.kycStatus.verifiedAt = new Date();
      user.kycStatus.verificationResult = verificationResult;
    } else if (kycStatus === 'rejected') {
      user.kycStatus.rejectionReason = failureReason || 'Verification failed';
      user.kycStatus.reviewedAt = new Date();
    } else if (kycStatus === 'expired') {
      user.kycStatus.rejectionReason = 'Verification session expired';
    }

    if (logMessage) console.log(logMessage);
  }

  return hasChanges;
}

/**
 * Calculate escrow statistics
 */
function calculateEscrowStats(escrows, totalAmount, isSelling = false) {
  const stats = {
    total: escrows.length,
    pending: 0,
    accepted: 0,
    funded: 0,
    delivered: 0,
    completed: 0,
    disputed: 0,
    cancelled: 0
  };

  escrows.forEach(escrow => {
    if (stats.hasOwnProperty(escrow.status)) {
      stats[escrow.status]++;
    }
 });

  if (isSelling) {
    stats.totalEarned = totalAmount;
  } else {
    stats.totalSpent = totalAmount;
  }

  return stats;
}

// ======================================================
// ================= NOTIFICATION SETTINGS ==============
// ======================================================

/**
 * Get notification preferences
 */
exports.getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        notifications: user.notificationPreferences || {
          email: {
            transactionUpdates: true,
            disputeAlerts: true,
            paymentConfirmations: true,
            marketingEmails: false,
            weeklyDigest: true
          },
          sms: {
            transactionUpdates: false,
            disputeAlerts: true,
            paymentConfirmations: false
          },
          push: {
            transactionUpdates: true,
            disputeAlerts: true,
            messages: true,
            paymentConfirmations: true
          }
        }
      }
    });

  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update notification preferences
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { email, sms, push } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize notification preferences if not exists
    if (!user.notificationPreferences) {
      user.notificationPreferences = { email: {}, sms: {}, push: {} };
    }

    // Update preferences
    if (email) {
      user.notificationPreferences.email = {
        ...user.notificationPreferences.email,
        ...email
      };
    }

    if (sms) {
      user.notificationPreferences.sms = {
        ...user.notificationPreferences.sms,
        ...sms
      };
    }

    if (push) {
      user.notificationPreferences.push = {
        ...user.notificationPreferences.push,
        ...push
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        notifications: user.notificationPreferences
      }
    });

  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ======================================================
// ================= PRIVACY & SECURITY =================
// ======================================================

/**
 * Get privacy settings
 */
exports.getPrivacySettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        privacy: user.privacySettings || {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          showTransactionHistory: false,
          allowMessages: true
        }
      }
    });

  } catch (error) {
    console.error('Get privacy settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch privacy settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update privacy settings
 */
exports.updatePrivacySettings = async (req, res) => {
  try {
    const { profileVisibility, showEmail, showPhone, showTransactionHistory, allowMessages } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate profile visibility
    const validVisibilityOptions = ['public', 'private', 'contacts'];
    if (profileVisibility && !validVisibilityOptions.includes(profileVisibility)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile visibility option'
      });
    }

    // Initialize privacy settings if not exists
    if (!user.privacySettings) {
      user.privacySettings = {};
    }

    // Update settings
    const updates = {
      profileVisibility,
      showEmail,
      showPhone,
      showTransactionHistory,
      allowMessages
    };

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        user.privacySettings[key] = updates[key];
      }
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: {
        privacy: user.privacySettings
      }
    });

  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update privacy settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get active sessions
 */
exports.getActiveSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get sessions from user model or session store
    const sessions = user.activeSessions || [];

    res.status(200).json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          device: session.device,
          browser: session.browser,
          ip: session.ip,
          location: session.location,
          lastActive: session.lastActive,
          current: session.id === req.sessionID
        }))
      }
    });

  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Revoke session
 */
exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent revoking current session
    if (sessionId === req.sessionID) {
      return res.status(400).json({
        success: false,
        message: 'Cannot revoke current session. Please logout instead.'
      });
    }

    // Remove session from user's active sessions
    if (user.activeSessions) {
      user.activeSessions = user.activeSessions.filter(
        session => session.id !== sessionId
      );
      await user.save();
    }

    // TODO: Also revoke from session store

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully'
    });

  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Revoke all sessions (except current)
 */
exports.revokeAllSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Keep only current session
    if (user.activeSessions) {
      user.activeSessions = user.activeSessions.filter(
        session => session.id === req.sessionID
      );
      await user.save();
    }

    // TODO: Also revoke from session store

    res.status(200).json({
      success: true,
      message: 'All other sessions revoked successfully'
    });

  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ======================================================
// ================= ACCOUNT MANAGEMENT =================
// ======================================================

/**
 * Request account deletion
 */
exports.requestAccountDeletion = async (req, res) => {
  try {
    const { password, reason } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account'
      });
    }

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

    // Check for active escrows
    const activeEscrows = await Escrow.find({
      $or: [
        { buyer: user._id },
        { seller: user._id }
      ],
      status: { $in: ['pending', 'accepted', 'funded', 'delivered', 'disputed'] }
    });

    if (activeEscrows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with active transactions. Please complete or cancel all active escrows first.',
        data: {
          activeEscrows: activeEscrows.length
        }
      });
    }

    // Mark account for deletion (30-day grace period)
    user.accountStatus = 'pending_deletion';
    user.deletionRequestedAt = new Date();
    user.deletionReason = reason;
    user.scheduledDeletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await user.save();

    // Send confirmation email
    await emailService.sendAccountDeletionRequestEmail(
      user.email,
      user.name,
      user.scheduledDeletionDate
    );

    res.status(200).json({
      success: true,
      message: 'Account deletion requested. Your account will be permanently deleted in 30 days. You can cancel this request anytime before then.',
      data: {
        scheduledDeletionDate: user.scheduledDeletionDate
      }
    });

  } catch (error) {
    console.error('Request account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request account deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Cancel account deletion request
 */
exports.cancelAccountDeletion = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.accountStatus !== 'pending_deletion') {
      return res.status(400).json({
        success: false,
        message: 'No pending deletion request found'
      });
    }

    // Cancel deletion
    user.accountStatus = 'active';
    user.deletionRequestedAt = undefined;
    user.deletionReason = undefined;
    user.scheduledDeletionDate = undefined;

    await user.save();

    // Send confirmation email
    await emailService.sendAccountDeletionCancelledEmail(user.email, user.name);

    res.status(200).json({
      success: true,
      message: 'Account deletion request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel account deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Export user data (GDPR compliance)
 */
exports.exportUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all user's escrows
    const escrows = await Escrow.find({
      $or: [
        { buyer: user._id },
        { seller: user._id }
      ]
    });

    // Compile user data
    const userData = {
      profile: user.toObject(),
      escrows: escrows.map(escrow => escrow.toObject()),
      exportDate: new Date(),
      dataRetentionPolicy: '30 days after account deletion'
    };

    // TODO: Generate PDF or send via email
    // For now, return JSON

    res.status(200).json({
      success: true,
      message: 'User data exported successfully',
      data: userData
    });

  } catch (error) {
    console.error('Export user data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ======================================================
// ================= VERIFICATION STATUS ================
// ======================================================

/**
 * Get comprehensive verification status
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const verificationStatus = {
      email: {
        verified: user.verified,
        email: user.email,
        verifiedAt: user.verifiedAt
      },
      kyc: {
        status: user.kycStatus.status || 'unverified',
        isVerified: user.isKYCVerified || false,
        submittedAt: user.kycStatus.submittedAt,
        verifiedAt: user.kycStatus.verifiedAt,
        rejectionReason: user.kycStatus.rejectionReason,
        canReapply: ['rejected', 'expired'].includes(user.kycStatus.status)
      },
      phone: {
        verified: user.phoneVerified || false,
        phone: user.phone,
        verifiedAt: user.phoneVerifiedAt
      },
      twoFactor: {
        enabled: user.twoFactorEnabled || false
      },
      overallStatus: calculateOverallVerificationStatus(user)
    };

    res.status(200).json({
      success: true,
      data: verificationStatus
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Calculate overall verification status
 */
function calculateOverallVerificationStatus(user) {
  const verifications = {
    email: user.verified,
    kyc: user.isKYCVerified,
    phone: user.phoneVerified || false
  };

  const totalVerifications = Object.keys(verifications).length;
  const completedVerifications = Object.values(verifications).filter(Boolean).length;
  const percentage = Math.round((completedVerifications / totalVerifications) * 100);

  let status = 'incomplete';
  if (percentage === 100) {
    status = 'fully_verified';
  } else if (percentage >= 66) {
    status = 'mostly_verified';
  } else if (percentage >= 33) {
    status = 'partially_verified';
  }

  return {
    status,
    percentage,
    completedVerifications,
    totalVerifications,
    missingVerifications: Object.keys(verifications).filter(key => !verifications[key])
  };
}

// ======================================================
// ================= ACTIVITY LOG =======================
// ======================================================

/**
 * Get user activity log
 */
exports.getActivityLog = async (req, res) => {
  try {
    const { limit = 50, skip = 0, type } = req.query;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build query
    let activities = user.activityLog || [];

    // Filter by type if specified
    if (type) {
      activities = activities.filter(activity => activity.type === type);
    }

    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const paginatedActivities = activities.slice(
      parseInt(skip),
      parseInt(skip) + parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: {
        activities: paginatedActivities,
        total: activities.length,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Clear activity log
 */
exports.clearActivityLog = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.activityLog = [];
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Activity log cleared successfully'
    });

  } catch (error) {
    console.error('Clear activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear activity log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = exports;