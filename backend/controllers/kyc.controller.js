// backend/controllers/kyc.controller.js - FIXED VERSION
const User = require('../models/User.model');
const diditService = require('../services/didit.service');

// ==================== INITIATE KYC ====================
exports.initiateKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isKYCVerified) {
      return res.status(400).json({
        success: false,
        message: 'KYC already verified'
      });
    }

    // Check if email is verified
    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first',
        action: 'verify_email'
      });
    }

    // Check if already in progress
    if (user.kycStatus?.status === 'pending' || user.kycStatus?.status === 'in_progress') {
      const sessionExpiry = user.kycStatus.diditSessionExpiresAt;
      if (sessionExpiry && new Date() < sessionExpiry) {
        return res.json({
          success: true,
          message: 'Verification already in progress',
          data: {
            verificationUrl: user.kycStatus.diditVerificationUrl,
            sessionId: user.kycStatus.diditSessionId,
            status: user.kycStatus.status,
            expiresAt: user.kycStatus.diditSessionExpiresAt
          }
        });
      }
    }

    // ✅ FIX: Get account type from request body OR user model
    const accountType = req.body.accountType || user.accountType || 'individual';
    
    console.log(`📋 Initiating ${accountType} verification for user:`, user._id);

    // Create DiDIT verification session with account type
    const verification = await diditService.createVerificationSession(user._id, {
      email: user.email,
      phone: user.phone,
      tier: user.tier,
      accountType: accountType, // ✅ PASS ACCOUNT TYPE
      businessInfo: user.businessInfo // ✅ PASS BUSINESS INFO
    });

    if (!verification.success) {
      return res.status(500).json({
        success: false,
        message: verification.message || 'Failed to create verification session',
        error: verification.error
      });
    }

    // Update user with DiDIT session info
    user.kycStatus = {
      status: 'pending',
      submittedAt: new Date(),
      diditSessionId: verification.data.sessionId,
      diditVerificationUrl: verification.data.verificationUrl,
      diditSessionExpiresAt: verification.data.expiresAt,
      // ✅ Store account type in KYC status
      accountType: accountType
    };

    await user.save();

    console.log(`✅ ${accountType} verification session created:`, verification.data.sessionId);

    res.json({
      success: true,
      message: `${accountType === 'business' ? 'Business' : 'Identity'} verification session created successfully`,
      data: {
        verificationUrl: verification.data.verificationUrl,
        sessionId: verification.data.sessionId,
        expiresAt: verification.data.expiresAt,
        accountType: accountType
      }
    });

  } catch (error) {
    console.error('❌ KYC initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate KYC verification',
      error: error.message
    });
  }
};

// ==================== GET KYC STATUS ====================
exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('isKYCVerified kycStatus verified tier accountType businessInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If has DiDIT session, check current status
    let externalStatus = null;
    if (user.kycStatus?.diditSessionId) {
      externalStatus = await diditService.getVerificationStatus(
        user.kycStatus.diditSessionId
      );
    }

    res.json({
      success: true,
      data: {
        isKYCVerified: user.isKYCVerified,
        status: user.kycStatus?.status || 'unverified',
        submittedAt: user.kycStatus?.submittedAt,
        verifiedAt: user.kycStatus?.verifiedAt,
        rejectionReason: user.kycStatus?.rejectionReason,
        sessionId: user.kycStatus?.diditSessionId,
        verificationUrl: user.kycStatus?.diditVerificationUrl,
        expiresAt: user.kycStatus?.diditSessionExpiresAt,
        externalStatus: externalStatus?.data || null,
        emailVerified: user.verified,
        tier: user.tier,
        // ✅ Include account type in response
        accountType: user.accountType,
        isBusinessAccount: user.accountType === 'business',
        businessInfo: user.accountType === 'business' ? user.businessInfo : null
      }
    });

  } catch (error) {
    console.error('❌ Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status'
    });
  }
};

// ==================== DIDIT WEBHOOK HANDLER ====================
exports.handleDiditWebhook = async (req, res) => {
  try {
    console.log('📥 DiDIT Webhook received:', req.body);

    const signature = req.headers['x-didit-signature'];
    if (signature && process.env.DIDIT_WEBHOOK_SECRET) {
      const rawBody = JSON.stringify(req.body);
      const isValid = diditService.verifyWebhookSignature(rawBody, signature);
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }
    }

    const event = await diditService.processWebhookEvent(req.body);
    const userId = event.userId;

    if (!userId) {
      console.error('❌ No userId in webhook event');
      return res.status(400).json({
        success: false,
        message: 'Missing user ID'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const accountType = user.accountType || 'individual';
    console.log(`📝 Updating ${accountType} KYC status for user ${userId}: ${event.type}`);

    // Update user KYC status based on event type
    if (event.type === 'completed' && event.verified) {
      // ✅ APPROVED
      user.kycStatus = {
        ...user.kycStatus,
        status: 'approved',
        verifiedAt: new Date(),
        reviewedAt: new Date(),
        verificationResult: event.verificationData,
        accountType: accountType
      };
      user.isKYCVerified = true;

      console.log(`✅ ${accountType} KYC Approved for user:`, userId);

    } else if (event.type === 'failed') {
      // ❌ REJECTED
      user.kycStatus = {
        ...user.kycStatus,
        status: 'rejected',
        reviewedAt: new Date(),
        rejectionReason: event.failureReason || 'Verification failed',
        verificationResult: event.verificationData,
        accountType: accountType
      };
      user.isKYCVerified = false;

      console.log(`❌ ${accountType} KYC Rejected for user:`, userId);

    } else if (event.type === 'expired') {
      // ⏰ EXPIRED
      user.kycStatus = {
        ...user.kycStatus,
        status: 'expired',
        reviewedAt: new Date(),
        rejectionReason: 'Verification session expired',
        accountType: accountType
      };

      console.log(`⏰ ${accountType} KYC Session Expired for user:`, userId);

    } else if (event.type === 'in_progress') {
      // 🔄 IN PROGRESS
      user.kycStatus = {
        ...user.kycStatus,
        status: 'in_progress',
        accountType: accountType
      };

      console.log(`🔄 ${accountType} KYC In Progress for user:`, userId);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('❌ DiDIT webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};

// ==================== RETRY KYC ====================
exports.retryKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.kycStatus?.status !== 'rejected' && user.kycStatus?.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: 'KYC retry not allowed in current status',
        currentStatus: user.kycStatus?.status
      });
    }

    user.kycStatus = {
      status: 'unverified'
    };
    user.isKYCVerified = false;

    await user.save();

    res.json({
      success: true,
      message: 'KYC reset. You can now start a new verification.'
    });

  } catch (error) {
    console.error('❌ Retry KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry KYC'
    });
  }
};

// ==================== ADMIN: MANUAL APPROVE ====================
exports.adminApproveKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const accountType = user.accountType || 'individual';

    user.kycStatus = {
      ...user.kycStatus,
      status: 'approved',
      verifiedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
      rejectionReason: notes || `Manually approved by admin (${accountType})`,
      accountType: accountType
    };
    user.isKYCVerified = true;

    await user.save();

    console.log(`✅ Admin approved ${accountType} KYC for user:`, userId);

    res.json({
      success: true,
      message: `${accountType} KYC manually approved`,
      data: {
        userId,
        status: 'approved',
        accountType,
        verifiedAt: user.kycStatus.verifiedAt
      }
    });

  } catch (error) {
    console.error('❌ Admin approve KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve KYC'
    });
  }
};

// ==================== ADMIN: MANUAL REJECT ====================
exports.adminRejectKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const accountType = user.accountType || 'individual';

    user.kycStatus = {
      ...user.kycStatus,
      status: 'rejected',
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
      rejectionReason: reason,
      accountType: accountType
    };
    user.isKYCVerified = false;

    await user.save();

    console.log(`❌ Admin rejected ${accountType} KYC for user:`, userId);

    res.json({
      success: true,
      message: `${accountType} KYC manually rejected`,
      data: {
        userId,
        status: 'rejected',
        accountType,
        reason
      }
    });

  } catch (error) {
    console.error('❌ Admin reject KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject KYC'
    });
  }
};

module.exports = exports;