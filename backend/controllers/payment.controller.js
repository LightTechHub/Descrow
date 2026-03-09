// backend/controllers/payment.controller.js - PRODUCTION READY
const Escrow = require('../models/Escrow.model');
const User = require('../models/User.model');
const paymentService = require('../services/payment.service');
const emailService = require('../services/email.service');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// ✅ FIXED: Initialize Payment with proper status checks and currency validation
exports.initializePayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { escrowId, paymentMethod } = req.body;

    // Fetch escrow
    const escrow = await Escrow.findOne({ escrowId }).populate('buyer seller', 'email name');
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    // Verify buyer
    if (escrow.buyer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only buyer can initialize payment' });
    }

    // ✅ FIXED: Check correct statuses
    if (!['pending', 'accepted'].includes(escrow.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment already processed or escrow not ready for payment',
        currentStatus: escrow.status
      });
    }

    // Check if already paid
    if (escrow.payment?.paidAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'This escrow has already been paid'
      });
    }

    // Generate unique payment reference
    const reference = `PAY_${escrowId}_${Date.now()}`;

    // Calculate amount buyer needs to pay
    // FIX: If buyerPays is missing (legacy escrow created before fee fix),
    // recalculate fees from scratch and SAVE them to the escrow so this
    // never needs manual DB intervention. Every escrow self-heals on first payment attempt.
    const rawAmount = parseFloat(escrow.amount.toString());
    let buyerPays;

    if (escrow.payment?.buyerPays) {
      buyerPays = parseFloat(escrow.payment.buyerPays.toString());
    }

    if (!buyerPays || isNaN(buyerPays) || buyerPays <= 0) {
      console.warn(`⚠️ buyerPays missing for ${escrow.escrowId} — recalculating and saving fees now`);
      try {
        const feeConfig = require('../config/fee.config');
        const feeBreakdown = await feeConfig.calculateSimpleFees(rawAmount, escrow.currency || 'USD');
        buyerPays = feeBreakdown?.buyerPays || rawAmount * 1.02;

        // Persist so next payment attempt (or UI display) has correct values
        if (!escrow.payment) escrow.payment = {};
        escrow.payment.amount = rawAmount;
        escrow.payment.buyerFee = feeBreakdown?.buyerFee ?? (rawAmount * 0.02);
        escrow.payment.sellerFee = feeBreakdown?.sellerFee ?? (rawAmount * 0.015);
        escrow.payment.buyerPays = buyerPays;
        escrow.payment.sellerReceives = feeBreakdown?.sellerReceives ?? (rawAmount * 0.985);
        escrow.payment.buyerFeePercentage = feeBreakdown?.buyerFeePercentage ?? 2;
        escrow.payment.sellerFeePercentage = feeBreakdown?.sellerFeePercentage ?? 1.5;
        escrow.markModified('payment');
        await escrow.save();
        console.log(`✅ Fees recalculated and saved for ${escrow.escrowId}: buyerPays=${buyerPays}`);
      } catch (feeErr) {
        console.error('⚠️ Fee recalculation failed, using base amount:', feeErr.message);
        buyerPays = rawAmount * 1.02; // safe fallback with default 2% fee
      }
    }

    const metadata = {
      escrowId: escrow.escrowId,
      escrowMongoId: escrow._id.toString(),
      buyerId: escrow.buyer._id.toString(),
      buyerName: escrow.buyer.name,
      sellerId: escrow.seller._id.toString(),
      sellerName: escrow.seller.name,
      itemTitle: escrow.title,
      originalAmount: parseFloat(escrow.amount.toString()),
      buyerFee: parseFloat(escrow.payment.buyerFee.toString()),
      totalAmount: buyerPays
    };

    let paymentData;

    switch (paymentMethod) {
      case 'paystack':
        // ✅ Paystack ONLY supports NGN
        if (escrow.currency !== 'NGN') {
          return res.status(400).json({
            success: false,
            message: `Paystack only supports Nigerian Naira (NGN). Your escrow is in ${escrow.currency}. Please use Flutterwave or Cryptocurrency payment.`
          });
        }
        paymentData = await paymentService.initializePaystack(
          escrow.buyer.email,
          buyerPays,
          reference,
          metadata
        );
        break;

      case 'flutterwave':
        // ✅ Flutterwave supports multiple currencies
        if (!['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES', 'ZAR', 'CAD', 'AUD', 'XOF', 'XAF'].includes(escrow.currency)) {
          return res.status(400).json({
            success: false,
            message: `Currency ${escrow.currency} is not supported by Flutterwave. Please use Cryptocurrency payment.`
          });
        }
        paymentData = await paymentService.initializeFlutterwave(
          escrow.buyer.email,
          buyerPays,
          escrow.currency,
          reference,
          metadata
        );
        break;

      case 'crypto':
        // ✅ Crypto supports ALL currencies
        paymentData = await paymentService.initializeNowpayments(
          buyerPays,
          escrow.currency,
          reference,
          `Payment for ${escrow.title}`
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method. Choose: paystack, flutterwave, or crypto'
        });
    }

    // Save payment reference
    // FIX: markModified() required because payment is likely a Mixed type in Mongoose.
    // Without it, Mongoose doesn't detect nested field changes and save() is a no-op.
    if (!escrow.payment) escrow.payment = {};
    escrow.payment.reference = reference;
    escrow.payment.method = paymentMethod;
    if (paymentMethod === 'crypto') {
      escrow.payment.paymentId = paymentData.payment_id;
    }
    escrow.markModified('payment');
    await escrow.save();

    console.log(`✅ Payment initialized: ${reference} for escrow ${escrow.escrowId}`);

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      paymentData,
      reference,
      escrowId: escrow.escrowId,
      amount: buyerPays
    });

  } catch (error) {
    console.error('❌ Initialize payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize payment', 
      error: error.message 
    });
  }
};

// ✅ ENHANCED: Verify Payment with idempotency
exports.verifyPayment = async (req, res) => {
  try {
    const { reference, paymentMethod, transactionId, paymentId } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference is required' });
    }

    // FIX: payment.reference is not in the Escrow schema so Mongoose drops it on save().
    // Primary lookup by reference (works after schema fix), fallback extracts escrowId
    // from the reference string format PAY_ESC{id}_{timestamp}.
    let escrow = await Escrow.findOne({ 'payment.reference': reference })
      .populate('buyer seller', 'name email');

    if (!escrow) {
      const escrowIdMatch = reference.match(/PAY_(ESC[^_]+)_/);
      if (escrowIdMatch) {
        escrow = await Escrow.findOne({ escrowId: escrowIdMatch[1] })
          .populate('buyer seller', 'name email');
        if (escrow && !escrow.payment?.reference) {
          // Patch reference so future lookups by reference work
          escrow.payment = escrow.payment || {};
          escrow.payment.reference = reference;
          escrow.markModified('payment');
          await escrow.save();
        }
      }
    }

    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found for this payment reference' });
    };

    // ✅ IDEMPOTENCY: If already funded, return success
    if (escrow.status === 'funded' && escrow.payment.paidAt) {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        escrow: {
          escrowId: escrow.escrowId,
          status: escrow.status,
          chatUnlocked: escrow.chatUnlocked
        }
      });
    }

    let verificationResult;

    switch (paymentMethod || escrow.payment.method) {
      case 'paystack':
        verificationResult = await paymentService.verifyPaystack(reference);
        break;

      case 'flutterwave':
        if (!transactionId) {
          return res.status(400).json({ success: false, message: 'Transaction ID required for Flutterwave' });
        }
        verificationResult = await paymentService.verifyFlutterwave(transactionId);
        break;

      case 'crypto': {
        // FIX: wrap in block {} so const declaration is valid inside switch
        const cryptoPaymentId = paymentId || escrow.payment.paymentId;
        if (!cryptoPaymentId) {
          return res.status(400).json({ success: false, message: 'Payment ID required for crypto' });
        }
        verificationResult = await paymentService.verifyNowpayments(cryptoPaymentId);
        break;
      }

      default:
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    if (!verificationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed',
        details: verificationResult
      });
    }

    // ✅ Update escrow to FUNDED status
    escrow.status = 'funded';
    escrow.chatUnlocked = true;
    escrow.payment.paidAt = new Date();
    escrow.payment.verifiedAt = new Date();
    escrow.payment.transactionId = verificationResult.transactionId || verificationResult.reference;
    escrow.payment.gatewayResponse = verificationResult;
    escrow.markModified('payment'); // FIX: Mixed type needs markModified
    await escrow.save();

    // Update buyer stats
    const buyer = await User.findById(escrow.buyer._id);
    if (buyer) {
      buyer.totalTransactions = (buyer.totalTransactions || 0) + 1;
      buyer.totalSpent = (buyer.totalSpent || 0) + parseFloat(escrow.payment.buyerPays.toString());
      await buyer.save();
    }

    // ✅ Send confirmation emails
    try {
      await emailService.sendPaymentConfirmedEmail(
        escrow.buyer.email,
        escrow.buyer.name,
        escrow.seller.email,
        escrow.seller.name,
        {
          escrowId: escrow.escrowId,
          title: escrow.title,
          amount: parseFloat(escrow.amount.toString()),
          currency: escrow.currency,
          buyerPaid: parseFloat(escrow.payment.buyerPays.toString())
        }
      );
    } catch (emailError) {
      console.error('❌ Failed to send confirmation email:', emailError);
      // Don't fail the payment if email fails
    }

    console.log(`✅ Payment verified and escrow funded: ${escrow.escrowId}`);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      escrow: {
        escrowId: escrow.escrowId,
        status: escrow.status,
        chatUnlocked: escrow.chatUnlocked,
        paidAt: escrow.payment.paidAt
      }
    });

  } catch (error) {
    console.error('❌ Verify payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify payment', 
      error: error.message 
    });
  }
};

// ✅ ENHANCED: Nowpayments Webhook with proper idempotency
exports.nowpaymentsWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    const payload = req.body;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET || '')
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('❌ Invalid Nowpayments webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    console.log('✅ Nowpayments IPN received:', payload);

    // Only process 'finished' payments
    if (payload.payment_status === 'finished') {
      const escrow = await Escrow.findOne({ 'payment.reference': payload.order_id })
        .populate('buyer seller', 'name email');

      if (!escrow) {
        console.error(`❌ Escrow not found for order_id: ${payload.order_id}`);
        return res.status(404).json({ success: false, message: 'Escrow not found' });
      }

      // ✅ IDEMPOTENCY: Skip if already funded
      if (escrow.status === 'funded' && escrow.payment.paidAt) {
        console.log(`⚠️ Escrow ${escrow.escrowId} already funded, skipping duplicate webhook`);
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      // Check if payment is still in pending/accepted state
      if (!['pending', 'accepted'].includes(escrow.status)) {
        console.log(`⚠️ Escrow ${escrow.escrowId} status is ${escrow.status}, cannot fund`);
        return res.status(400).json({ success: false, message: 'Invalid escrow status' });
      }

      console.log(`✅ Auto-confirming crypto payment for escrow ${escrow.escrowId}`);

      // Update escrow
      escrow.status = 'funded';
      escrow.chatUnlocked = true;
      escrow.payment.paidAt = new Date();
      escrow.payment.verifiedAt = new Date();
      escrow.payment.paymentId = payload.payment_id;
      escrow.payment.gatewayResponse = payload;
      escrow.markModified('payment'); // FIX: Mixed type
      await escrow.save();

      // Update buyer stats
      const buyer = await User.findById(escrow.buyer._id);
      if (buyer) {
        buyer.totalTransactions = (buyer.totalTransactions || 0) + 1;
        buyer.totalSpent = (buyer.totalSpent || 0) + parseFloat(escrow.payment.buyerPays.toString());
        await buyer.save();
      }

      // Send confirmation emails
      try {
        await emailService.sendPaymentConfirmedEmail(
          escrow.buyer.email,
          escrow.buyer.name,
          escrow.seller.email,
          escrow.seller.name,
          {
            escrowId: escrow.escrowId,
            title: escrow.title,
            amount: parseFloat(escrow.amount.toString()),
            currency: escrow.currency,
            buyerPaid: parseFloat(escrow.payment.buyerPays.toString())
          }
        );
      } catch (emailError) {
        console.error('❌ Failed to send webhook email:', emailError);
      }

      console.log(`✅ Crypto payment auto-confirmed for ${escrow.escrowId}`);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Nowpayments webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ ENHANCED: Paystack Webhook with idempotency
exports.paystackWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('❌ Invalid Paystack signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body;
    console.log('✅ Paystack webhook received:', event.event);

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const escrow = await Escrow.findOne({ 'payment.reference': reference })
        .populate('buyer seller', 'name email');

      if (!escrow) {
        console.error(`❌ Escrow not found for reference: ${reference}`);
        return res.status(404).json({ success: false, message: 'Escrow not found' });
      }

      // ✅ IDEMPOTENCY
      if (escrow.status === 'funded' && escrow.payment.paidAt) {
        console.log(`⚠️ Escrow ${escrow.escrowId} already funded`);
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      if (!['pending', 'accepted'].includes(escrow.status)) {
        console.log(`⚠️ Escrow ${escrow.escrowId} status is ${escrow.status}`);
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      // Update escrow
      escrow.status = 'funded';
      escrow.chatUnlocked = true;
      escrow.payment.paidAt = new Date();
      escrow.payment.verifiedAt = new Date();
      escrow.payment.transactionId = event.data.id;
      escrow.payment.gatewayResponse = event.data;
      escrow.markModified('payment'); // FIX: Mixed type
      await escrow.save();

      // Update buyer stats
      const buyer = await User.findById(escrow.buyer._id);
      if (buyer) {
        buyer.totalTransactions = (buyer.totalTransactions || 0) + 1;
        buyer.totalSpent = (buyer.totalSpent || 0) + parseFloat(escrow.payment.buyerPays.toString());
        await buyer.save();
      }

      // Send emails
      try {
        await emailService.sendPaymentConfirmedEmail(
          escrow.buyer.email,
          escrow.buyer.name,
          escrow.seller.email,
          escrow.seller.name,
          {
            escrowId: escrow.escrowId,
            title: escrow.title,
            amount: parseFloat(escrow.amount.toString()),
            currency: escrow.currency,
            buyerPaid: parseFloat(escrow.payment.buyerPays.toString())
          }
        );
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
      }

      console.log(`✅ Paystack payment confirmed for ${escrow.escrowId}`);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Paystack webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ ENHANCED: Flutterwave Webhook with idempotency
exports.flutterwaveWebhook = async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET || '';
    const signature = req.headers['verif-hash'];

    if (!signature || signature !== secretHash) {
      console.error('❌ Invalid Flutterwave signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const payload = req.body;
    console.log('✅ Flutterwave webhook received:', payload.event);

    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const reference = payload.data.tx_ref;
      const escrow = await Escrow.findOne({ 'payment.reference': reference })
        .populate('buyer seller', 'name email');

      if (!escrow) {
        console.error(`❌ Escrow not found for reference: ${reference}`);
        return res.status(404).json({ success: false, message: 'Escrow not found' });
      }

      // ✅ IDEMPOTENCY
      if (escrow.status === 'funded' && escrow.payment.paidAt) {
        console.log(`⚠️ Escrow ${escrow.escrowId} already funded`);
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      if (!['pending', 'accepted'].includes(escrow.status)) {
        console.log(`⚠️ Escrow ${escrow.escrowId} status is ${escrow.status}`);
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      // Update escrow
      escrow.status = 'funded';
      escrow.chatUnlocked = true;
      escrow.payment.paidAt = new Date();
      escrow.payment.verifiedAt = new Date();
      escrow.payment.transactionId = payload.data.id;
      escrow.payment.gatewayResponse = payload.data;
      escrow.markModified('payment'); // FIX: Mixed type
      await escrow.save();

      // Update buyer stats
      const buyer = await User.findById(escrow.buyer._id);
      if (buyer) {
        buyer.totalTransactions = (buyer.totalTransactions || 0) + 1;
        buyer.totalSpent = (buyer.totalSpent || 0) + parseFloat(escrow.payment.buyerPays.toString());
        await buyer.save();
      }

      // Send emails
      try {
        await emailService.sendPaymentConfirmedEmail(
          escrow.buyer.email,
          escrow.buyer.name,
          escrow.seller.email,
          escrow.seller.name,
          {
            escrowId: escrow.escrowId,
            title: escrow.title,
            amount: parseFloat(escrow.amount.toString()),
            currency: escrow.currency,
            buyerPaid: parseFloat(escrow.payment.buyerPays.toString())
          }
        );
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
      }

      console.log(`✅ Flutterwave payment confirmed for ${escrow.escrowId}`);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Flutterwave webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generic webhook handler
exports.paymentWebhook = async (req, res) => {
  const paystackSignature = req.headers['x-paystack-signature'];
  const flutterwaveSignature = req.headers['verif-hash'];
  const nowpaymentsSignature = req.headers['x-nowpayments-sig'];

  if (paystackSignature) {
    return exports.paystackWebhook(req, res);
  } else if (flutterwaveSignature) {
    return exports.flutterwaveWebhook(req, res);
  } else if (nowpaymentsSignature) {
    return exports.nowpaymentsWebhook(req, res);
  } else {
    return res.status(400).json({ success: false, message: 'Unknown webhook source' });
  }
};
