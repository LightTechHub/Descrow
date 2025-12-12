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
      console.log('📥 Incoming Didit webhook');

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

      // ============================================
      // 🔐 UPDATE KYC STATUS (Unified Logic)
      // ============================================
      switch (event.type) {
        case 'completed':
          if (event.verified) {
            user.kycStatus.status = 'approved';
            user.kycStatus.verifiedAt = new Date();
            user.kycStatus.verificationResult = event.verificationData || {};
            user.isKYCVerified = true;
          } else {
            user.kycStatus.status = 'rejected';
            user.kycStatus.rejectionReason = event.reason || 'Verification failed';
            user.kycStatus.reviewedAt = new Date();
            user.isKYCVerified = false;
          }
          break;

        case 'failed':
          user.kycStatus.status = 'rejected';
          user.kycStatus.rejectionReason = event.reason;
          user.kycStatus.reviewedAt = new Date();
          user.isKYCVerified = false;
          break;

        case 'expired':
          user.kycStatus.status = 'expired';
          user.isKYCVerified = false;
          break;

        case 'in_progress':
          user.kycStatus.status = 'in_progress';
          break;
      }

      // Store Didit session
      user.kycStatus.diditSessionId = event.sessionId;

      // Save updates
      user.markModified('kycStatus');
      await user.save();

      console.log(`✅ KYC updated (${event.type}) for user ${user.email}`);

      return res.status(200).json({
        success: true,
        received: true,
        event_type: event.type
      });

    } catch (error) {
      console.error('❌ DIDIT webhook error:', error);
      return res.status(500).json({
        success: false,
        message: 'Webhook failed',
        error: error.message
      });
    }
  }
);

/**
 * HEALTH CHECK
 */
router.get('/didit/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Didit webhook endpoint OK',
    version: process.env.DIDIT_WEBHOOK_VERSION || 'v2'
  });
});

module.exports = router;