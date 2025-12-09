// backend/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const diditService = require('../services/didit.service');

/**
 * Didit Webhook Handler
 * POST /api/webhooks/didit
 */
router.post('/didit', express.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}), async (req, res) => {
  try {
    const signature = req.headers['x-didit-signature'] || req.headers['x-webhook-signature'];
    
    if (!signature) {
      console.error('❌ Missing Didit webhook signature');
      return res.status(401).json({ success: false, message: 'Missing signature' });
    }

    // Verify webhook signature
    const isValid = diditService.verifyWebhookSignature(req.rawBody, signature);
    
    if (!isValid) {
      console.error('❌ Invalid Didit webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const payload = req.body;
    console.log('✅ Didit webhook received:', payload.event_type);

    // Process the event
    const event = await diditService.processWebhookEvent(payload);

    // Handle verification completed
    if (event.type === 'completed' && event.verified) {
      const user = await User.findById(event.userId);
      
      if (user) {
        user.kycStatus.status = 'approved';
        user.kycStatus.verifiedAt = new Date();
        user.kycStatus.verificationResult = event.verificationData;
        user.isKYCVerified = true;
        user.markModified('kycStatus');
        await user.save();

        console.log(`✅ KYC auto-approved for user ${user.email} via Didit`);

        // TODO: Send approval email
      }
    }

    // Handle verification failed
    if (event.type === 'failed') {
      const user = await User.findById(event.userId);
      
      if (user) {
        user.kycStatus.status = 'rejected';
        user.kycStatus.rejectionReason = event.reason;
        user.isKYCVerified = false;
        user.markModified('kycStatus');
        await user.save();

        console.log(`❌ KYC rejected for user ${user.email}: ${event.reason}`);

        // TODO: Send rejection email
      }
    }

    // Handle verification expired
    if (event.type === 'expired') {
      const user = await User.findById(event.userId);
      
      if (user) {
        user.kycStatus.status = 'expired';
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
        user.markModified('kycStatus');
        await user.save();

        console.log(`🔄 KYC in progress for user ${user.email}`);
      }
    }

    res.status(200).json({ success: true, received: true });

  } catch (error) {
    console.error('❌ Didit webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

module.exports = router;