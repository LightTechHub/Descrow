// backend/controllers/kyc.controller.js
const User = require('../models/User');
const diditService = require('../services/didit.service');

/**
 * Start KYC verification process
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

    // Check if email is verified
    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email before starting KYC'
      });
    }

    // Check if already verified
    if (user.isKYCVerified && user.kycStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'KYC already verified'
      });
    }

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
      console.error('Failed to create Didit session:', diditResponse);
      return res.status(500).json({
        success: false,
        message: diditResponse.message || 'Failed to start verification',
        error: diditResponse.error
      });
    }

    // Update user with session info
    user.kycSessionId = diditResponse.data.sessionId;
    user.kycStatus = 'pending';
    user.kycSubmittedAt = new Date();
    await user.save();

    console.log('✅ KYC verification started for user:', userId);

    res.json({
      success: true,
      message: 'Verification session created',
      data: {
        verificationUrl: diditResponse.data.verificationUrl,
        sessionId: diditResponse.data.sessionId,
        expiresAt: diditResponse.data.expiresAt
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

/**
 * Get KYC status
 */
exports.getKYCStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      'kycStatus kycSessionId kycVerifiedAt kycRejectionReason isKYCVerified kycSubmittedAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        status: user.kycStatus || 'unverified',
        sessionId: user.kycSessionId,
        verifiedAt: user.kycVerifiedAt,
        submittedAt: user.kycSubmittedAt,
        rejectionReason: user.kycRejectionReason,
        isVerified: user.isKYCVerified || false
      }
    });

  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status',
      error: error.message
    });
  }
};

/**
 * Check KYC status from Didit API
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

    if (!user.kycSessionId) {
      return res.status(400).json({
        success: false,
        message: 'No KYC session found'
      });
    }

    // Get status from Didit
    const diditResponse = await diditService.getVerificationStatus(user.kycSessionId);

    if (!diditResponse.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check verification status'
      });
    }

    const { status, verified, verificationResult } = diditResponse.data;

    // Update user based on Didit response
    let kycStatus = 'pending';
    let isKYCVerified = false;

    if (status === 'completed' && verified) {
      kycStatus = 'approved';
      isKYCVerified = true;
      user.kycVerifiedAt = new Date();
      user.kycVerificationData = verificationResult;
    } else if (status === 'failed' || status === 'expired') {
      kycStatus = 'rejected';
      user.kycRejectionReason = diditResponse.data.failureReason || 'Verification failed';
    } else if (status === 'processing' || status === 'pending') {
      kycStatus = 'in_progress';
    }

    user.kycStatus = kycStatus;
    user.isKYCVerified = isKYCVerified;
    await user.save();

    console.log('✅ KYC status updated for user:', userId, 'Status:', kycStatus);

    res.json({
      success: true,
      data: {
        status: kycStatus,
        isVerified: isKYCVerified,
        verifiedAt: user.kycVerifiedAt,
        rejectionReason: user.kycRejectionReason
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

/**
 * Cancel KYC verification
 */
exports.cancelKYCVerification = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.kycSessionId) {
      return res.status(400).json({
        success: false,
        message: 'No active KYC session'
      });
    }

    // Cancel on Didit
    await diditService.cancelVerification(user.kycSessionId);

    // Update user
    user.kycStatus = 'cancelled';
    user.kycSessionId = null;
    await user.save();

    console.log('✅ KYC verification cancelled for user:', userId);

    res.json({
      success: true,
      message: 'KYC verification cancelled'
    });

  } catch (error) {
    console.error('Cancel KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel KYC verification',
      error: error.message
    });
  }
};

/**
 * Retry KYC verification (for rejected cases)
 */
exports.retryKYCVerification = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset KYC status
    user.kycStatus = 'unverified';
    user.kycSessionId = null;
    user.kycRejectionReason = null;
    user.kycSubmittedAt = null;
    await user.save();

    console.log('✅ KYC reset for retry for user:', userId);

    res.json({
      success: true,
      message: 'KYC reset. You can start verification again.'
    });

  } catch (error) {
    console.error('Retry KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry KYC',
      error: error.message
    });
  }
};
