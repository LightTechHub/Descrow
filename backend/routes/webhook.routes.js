// backend/routes/webhook.routes.js - Updated for Didit v2
const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const diditService = require('../services/didit.service');

/**
 * Didit Webhook Handler (v2)
 * POST /api/webhooks/didit
 */
router.post('/didit', express.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}), async (req, res) => {
  try {
    // Get signature from headers (try multiple possible header names)
    const signature = req.headers['x-didit-signature'] || 
                     req.headers['x-webhook-signature'] ||
                     req.headers['x-signature'];
    
    if (!signature) {
      console.error('❌ Missing Didit webhook signature');
      return res.status(401).json({ 
        success: false, 
        message: 'Missing signature header' 
      });
    }

    // Verify webhook signature
    const isValid = diditService.verifyWebhookSignature(req.rawBody, signature);
    
    if (!isValid) {
      console.error('❌ Invalid Didit webhook signature');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid signature' 
      });
    }

    const payload = req.body;
    console.log('✅ Didit webhook received:', {
      type: payload.type,
      id: payload.data?.id,
      timestamp: new Date().toISOString()
    });

    // Process the event
    const event = await diditService.processWebhookEvent(payload);

    if (!event.userId) {
      console.warn('⚠️ Webhook event missing userId:', event);
      return res.status(200).json({ 
        success: true, 
        received: true,
        warning: 'Missing user reference' 
      });
    }

    // Handle verification completed
    if (event.type === 'completed' && event.verified) {
      const user = await User.findById(event.userId);
      
      if (!user) {
        console.error('❌ User not found:', event.userId);
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      user.kycStatus.status = 'approved';
      user.kycStatus.verifiedAt = new Date();
      user.kycStatus.verificationResult = event.verificationData;
      user.kycStatus.diditSessionId = event.sessionId;
      user.isKYCVerified = true;
      user.markModified('kycStatus');
      await user.save();

      console.log(`✅ KYC auto-approved for user ${user.email} via Didit`);

      // TODO: Send approval email
      // await emailService.sendKYCApprovedEmail(user.email, user.name);
    }

    // Handle verification failed
    if (event.type === 'failed') {
      const user = await User.findById(event.userId);
      
      if (user) {
        user.kycStatus.status = 'rejected';
        user.kycStatus.rejectionReason = event.reason;
        user.kycStatus.diditSessionId = event.sessionId;
        user.isKYCVerified = false;
        user.markModified('kycStatus');
        await user.save();

        console.log(`❌ KYC rejected for user ${user.email}: ${event.reason}`);

        // TODO: Send rejection email
        // await emailService.sendKYCRejectedEmail(user.email, user.name, event.reason);
      }
    }

    // Handle verification expired
    if (event.type === 'expired') {
      const user = await User.findById(event.userId);
      
      if (user) {
        user.kycStatus.status = 'expired';
        user.kycStatus.diditSessionId = event.sessionId;
        user.markModified('kycStatus');
        await user.save();

        console.log(`⏰ KYC session expired for user ${user.email}`);
      }
    }

    // Handle in progress
    if (event.type === 'in_progress') {
      const user = await User.findById(event.userId);
      
      if (user) {
        user.kycStatus.status = 'in_progress';
        user.kycStatus.diditSessionId = event.sessionId;
        user.markModified('kycStatus');
        await user.save();

        console.log(`🔄 KYC in progress for user ${user.email}`);
      }
    }

    res.status(200).json({ 
      success: true, 
      received: true,
      event_type: event.type
    });

  } catch (error) {
    console.error('❌ Didit webhook error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Webhook processing failed',
      error: error.message
    });
  }
});

/**
 * Health check endpoint for webhook
 */
router.get('/didit/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Didit webhook endpoint is healthy',
    version: process.env.DIDIT_WEBHOOK_VERSION || 'v2'
  });
});

module.exports = router;