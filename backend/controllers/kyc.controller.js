// backend/controllers/kyc.controller.js - KYC Management
const User = require('../models/User.model');
const diditService = require('../services/didit.service');

// Initiate KYC verification
exports.initiateKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.kycVerified) {
      return res.status(400).json({
        success: false,
        message: 'KYC already verified'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    // Initiate DiDIT verification (will automatically use correct flow based on accountType)
    const verification = await diditService.initiateVerification(user);

    // Save verification ID to user
    user.kycVerificationId = verification.verificationId;
    user.kycStatus = 'pending';
    user.kycInitiatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: `${user.accountType === 'business' ? 'Business' : 'Identity'} verification initiated`,
      data: {
        verificationUrl: verification.verificationUrl,
        verificationType: verification.flowType,
        expiresAt: verification.expiresAt
      }
    });

  } catch (error) {
    console.error('KYC initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate KYC verification'
    });
  }
};

// Get KYC status
exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('kycVerified kycStatus kycVerificationId kycInitiatedAt accountType');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let verificationStatus = null;
    if (user.kycVerificationId) {
      verificationStatus = await diditService.getVerificationStatus(user.kycVerificationId);
    }

    res.json({
      success: true,
      data: {
        kycVerified: user.kycVerified,
        kycStatus: user.kycStatus,
        kycInitiatedAt: user.kycInitiatedAt,
        accountType: user.accountType,
        verificationType: user.accountType === 'business' ? 'Business AML/KYC-B' : 'Individual KYC',
        externalStatus: verificationStatus
      }
    });

  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status'
    });
  }
};

// DiDIT Webhook Handler - Individual KYC
exports.handleIndividualKYCWebhook = async (req, res) => {
  try {
    const userId = req.params.userId;
    const webhookData = req.body;

    console.log('Individual KYC Webhook received:', { userId, status: webhookData.status });

    const result = await diditService.handleWebhook(webhookData);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user based on verification result
    if (result.status === 'completed' && result.data.score >= 70) {
      user.kycVerified = true;
      user.kycStatus = 'approved';
      user.kycVerifiedAt = new Date();
      user.kycData = {
        verificationType: 'individual',
        score: result.data.score,
        checks: result.data.checks,
        riskLevel: result.data.riskLevel
      };
    } else if (result.status === 'failed') {
      user.kycStatus = 'rejected';
      user.kycRejectionReason = 'Verification failed. Please try again or contact support.';
    }

    await user.save();

    // Send notification email
    // await emailService.sendKYCStatusEmail(user);

    res.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('Individual KYC webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

// DiDIT Webhook Handler - Business AML/KYC
exports.handleBusinessKYCWebhook = async (req, res) => {
  try {
    const userId = req.params.userId;
    const webhookData = req.body;

    console.log('Business KYC Webhook received:', { userId, status: webhookData.status });

    const result = await diditService.handleWebhook(webhookData);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Business verification requires higher score
    if (result.status === 'completed' && result.data.score >= 80) {
      user.kycVerified = true;
      user.kycStatus = 'approved';
      user.kycVerifiedAt = new Date();
      user.kycData = {
        verificationType: 'business',
        score: result.data.score,
        checks: result.data.checks,
        riskLevel: result.data.riskLevel,
        uboVerified: result.data.checks.ubo_verification === 'passed',
        amlCleared: result.data.checks.aml_screening === 'passed'
      };
    } else if (result.status === 'failed') {
      user.kycStatus = 'rejected';
      user.kycRejectionReason = 'Business verification failed. Please ensure all documents are valid.';
    }

    await user.save();

    res.json({ success: true, message: 'Business webhook processed' });

  } catch (error) {
    console.error('Business KYC webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};
