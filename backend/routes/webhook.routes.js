// backend/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const diditService = require('../services/didit.service');

/**
 * DIDIT WEBHOOK (v2)
 * POST /api/webhooks/didit
 */
router.post(
  '/didit',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  }),
  async (req, res) => {
    try {
      console.log('📥 Incoming Didit webhook (POST)');

      // Get signature
      const signature =
        req.headers['x-didit-signature'] ||
        req.headers['x-webhook-signature'] ||
        req.headers['x-signature'];

      if (!signature) {
        console.error('❌ Missing Didit signature');
        return res.status(401).json({
          success: false,
          message: 'Missing signature header'
        });
      }

      // Verify signature
      const isValid = diditService.verifyWebhookSignature(req.rawBody, signature);

      if (!isValid) {
        console.error('❌ Invalid Didit signature');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }

      const payload = req.body;

      console.log('📦 Didit event received:', {
        type: payload.type,
        status: payload.data?.status,
        sessionId: payload.data?.session_id,
        userRef: payload.data?.vendor_data,
        timestamp: new Date().toISOString()
      });

      // Process event (normalize fields)
      const event = await diditService.processWebhookEvent(payload);

      if (!event.userId) {
        console.warn('⚠️ Webhook missing userId:', event);
        return res.status(200).json({
          success: true,
          received: true,
          warning: 'Missing user reference'
        });
      }

      // ============================================
      // 🔍 LOAD USER
      // ============================================
      const user = await User.findById(event.userId);
      if (!user) {
        console.error('❌ User not found:', event.userId);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const previousStatus = user.kycStatus.status;

      // ============================================
      // 🔐 UPDATE KYC STATUS (Dynamic Based on Event)
      // ============================================
      switch (event.type) {
        case 'completed':
          if (event.verified) {
            user.kycStatus.status = 'approved';
            user.kycStatus.verifiedAt = new Date();
            user.kycStatus.verificationResult = event.verificationData || {};
            user.isKYCVerified = true;
            console.log('✅ KYC APPROVED for user:', user.email);
          } else {
            // Completed but not verified = failed verification
            user.kycStatus.status = 'rejected';
            user.kycStatus.rejectionReason = event.failureReason || 'Verification completed but not approved';
            user.kycStatus.reviewedAt = new Date();
            user.isKYCVerified = false;
            console.log('❌ KYC REJECTED (completed but unverified) for user:', user.email);
          }
          break;

        case 'failed':
          user.kycStatus.status = 'rejected';
          user.kycStatus.rejectionReason = event.failureReason || 'Verification failed';
          user.kycStatus.reviewedAt = new Date();
          user.isKYCVerified = false;
          console.log('❌ KYC FAILED for user:', user.email);
          break;

        case 'expired':
          user.kycStatus.status = 'expired';
          user.kycStatus.rejectionReason = 'Verification session expired';
          user.isKYCVerified = false;
          console.log('⏰ KYC EXPIRED for user:', user.email);
          break;

        case 'in_progress':
          user.kycStatus.status = 'in_progress';
          console.log('🔄 KYC IN PROGRESS for user:', user.email);
          break;

        case 'unknown':
        default:
          // Don't change status for unknown events
          console.warn('⚠️ Unknown event type:', event.type, 'for user:', user.email);
          break;
      }

      // Store Didit session
      user.kycStatus.diditSessionId = event.sessionId;

      // Save updates
      user.markModified('kycStatus');
      await user.save();

      console.log(`✅ KYC status updated: ${previousStatus} → ${user.kycStatus.status} for user ${user.email}`);

      return res.status(200).json({
        success: true,
        received: true,
        event_type: event.type,
        previous_status: previousStatus,
        new_status: user.kycStatus.status
      });

    } catch (error) {
      console.error('❌ DIDIT webhook error:', error);
      return res.status(500).json({
        success: false,
        message: 'Webhook failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * ✅ DIDIT REDIRECT HANDLER (GET)
 * Handles cases where Didit redirects users to webhook URL instead of success_url
 * GET /api/webhooks/didit?verificationSessionId=xxx&status=xxx
 */
router.get('/didit', async (req, res) => {
  try {
    const { verificationSessionId, status, session_id } = req.query;
    
    const sessionId = verificationSessionId || session_id;
    
    console.log('🔄 Didit redirect (GET):', {
      sessionId,
      status,
      timestamp: new Date().toISOString()
    });

    // Map Didit status to frontend-friendly status
    let frontendStatus = 'unknown';
    
    if (status) {
      const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
      
      if (normalizedStatus.includes('review') || normalizedStatus.includes('progress') || normalizedStatus.includes('pending')) {
        frontendStatus = 'in_review';
      } else if (normalizedStatus.includes('verified') || normalizedStatus.includes('approved') || normalizedStatus.includes('complete')) {
        frontendStatus = 'success';
      } else if (normalizedStatus.includes('reject') || normalizedStatus.includes('fail')) {
        frontendStatus = 'failed';
      } else if (normalizedStatus.includes('cancel')) {
        frontendStatus = 'cancelled';
      } else if (normalizedStatus.includes('expire')) {
        frontendStatus = 'expired';
      } else {
        frontendStatus = normalizedStatus;
      }
    }

    // Build redirect URL with parameters
    const redirectUrl = `${process.env.FRONTEND_URL}/profile?tab=kyc&status=${frontendStatus}${sessionId ? `&sessionId=${sessionId}` : ''}`;
    
    console.log('↪️ Redirecting user to frontend:', redirectUrl);
    
    // Redirect to frontend
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Webhook GET redirect error:', error);
    
    // Fallback redirect to frontend with error status
    const fallbackUrl = `${process.env.FRONTEND_URL}/profile?tab=kyc&status=error`;
    console.log('↪️ Fallback redirect to:', fallbackUrl);
    
    res.redirect(fallbackUrl);
  }
});

/**
 * HEALTH CHECK
 */
router.get('/didit/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Didit webhook endpoint OK',
    version: process.env.DIDIT_WEBHOOK_VERSION || 'v2',
    endpoints: {
      webhook: 'POST /api/webhooks/didit',
      redirect: 'GET /api/webhooks/didit',
      health: 'GET /api/webhooks/didit/health'
    }
  });
});

module.exports = router;