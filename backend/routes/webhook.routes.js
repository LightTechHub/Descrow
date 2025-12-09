// backend/routes/webhook.routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const diditService = require('../services/didit.service');
const emailService = require('../services/email.service');

/**
 * Didit Webhook Handler
 * POST /api/webhooks/didit
 */
router.post('/didit', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-didit-signature'];
    const payload = JSON.parse(req.body.toString());

    // Verify webhook signature
    if (!diditService.verifyWebhookSignature(payload, signature)) {
      console.error('❌ Invalid Didit webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    // Process the event
    const event = await diditService.processWebhookEvent(payload);

    console.log('✅ Didit webhook event:', event.type);

    // Handle verification completed
    if (event.type === 'completed' && event.verified) {
      const user = await User.findById(event.userId);
      
      if (user) {
        // Update user KYC status
        user.kycStatus.status = 'approved';
        user.kycStatus.verifiedAt = new Date();
        user.kycStatus.verificationResult = event.data;
        user.isKYCVerified = true;
        user.markModified('kycStatus');
        await user.save();

        console.log(`✅ KYC auto-approved for user ${user.email} via Didit`);

        // Send approval email
        try {
          await emailService.sendKYCApprovedEmail(user.email, user.name);
        } catch (emailError) {
          console.error('Failed to send KYC approval email:', emailError);
        }
      }
    }

    // Handle verification failed
    if (event.type === 'failed') {
      const user = await User.findById(event.userId);
      
      if (user) {
        user.kycStatus.status = 'rejected';
        user.kycStatus.rejectionReason = event.reason || 'Verification failed';
        user.isKYCVerified = false;
        user.markModified('kycStatus');
        await user.save();

        console.log(`❌ KYC rejected for user ${user.email}: ${event.reason}`);

        // Send rejection email
        try {
          await emailService.sendKYCRejectedEmail(user.email, user.name, event.reason);
        } catch (emailError) {
          console.error('Failed to send KYC rejection email:', emailError);
        }
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

    res.status(200).json({ success: true, received: true });

  } catch (error) {
    console.error('❌ Didit webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

module.exports = router;
