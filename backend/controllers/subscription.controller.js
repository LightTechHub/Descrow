// backend/controllers/subscription.controller.js - TIER UPGRADE LOGIC
const User = require('../models/User.model');
const Subscription = require('../models/Subscription.model');
const Payment = require('../models/Payment.model');
const { getTierPricing, calculateUpgradeCost, getAllTiersInCurrency } = require('../config/pricing.config');
const paystackService = require('../services/paystack.service');

// ==================== GET ALL TIERS ====================
exports.getTiers = async (req, res) => {
  try {
    const currency = req.query.currency || req.user?.preferences?.defaultCurrency || 'USD';
    const tiers = getAllTiersInCurrency(currency);

    res.json({
      success: true,
      data: {
        tiers,
        currency,
        currentTier: req.user?.tier || 'free'
      }
    });

  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tiers'
    });
  }
};

// ==================== GET CURRENT SUBSCRIPTION ====================
exports.getCurrentSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const subscription = await Subscription.findOne({ 
      userId: req.user._id, 
      status: 'active' 
    });

    const currency = user.preferences?.defaultCurrency || 'USD';
    const currentTierInfo = getTierPricing(user.tier, currency);

    res.json({
      success: true,
      data: {
        currentTier: user.tier,
        tierInfo: currentTierInfo,
        subscription: subscription || null,
        usage: user.monthlyUsage
      }
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription'
    });
  }
};

// ==================== CALCULATE UPGRADE COST ====================
exports.calculateUpgrade = async (req, res) => {
  try {
    const { targetTier } = req.body;
    const user = await User.findById(req.user._id);

    if (!targetTier) {
      return res.status(400).json({
        success: false,
        message: 'Target tier is required'
      });
    }

    const currentTier = user.tier;
    const currency = user.preferences?.defaultCurrency || 'USD';

    // Validate upgrade path
    const tierOrder = ['free', 'starter', 'growth', 'enterprise', 'api'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(targetTier);

    if (targetIndex <= currentIndex) {
      return res.status(400).json({
        success: false,
        message: 'Cannot downgrade or upgrade to same tier'
      });
    }

    const upgradeCost = calculateUpgradeCost(currentTier, targetTier, currency);
    const targetTierInfo = getTierPricing(targetTier, currency);

    res.json({
      success: true,
      data: {
        currentTier,
        targetTier,
        cost: upgradeCost,
        tierInfo: targetTierInfo,
        currency
      }
    });

  } catch (error) {
    console.error('Calculate upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate upgrade cost'
    });
  }
};

// ==================== INITIATE UPGRADE ====================
exports.initiateUpgrade = async (req, res) => {
  try {
    const { targetTier, paymentMethod = 'paystack' } = req.body;
    const user = await User.findById(req.user._id);

    if (!targetTier) {
      return res.status(400).json({
        success: false,
        message: 'Target tier is required'
      });
    }

    // Check if KYC verified for paid tiers
    if (targetTier !== 'free' && targetTier !== 'starter') {
      if (!user.isKYCVerified) {
        return res.status(403).json({
          success: false,
          message: 'KYC verification required for paid tiers',
          action: 'complete_kyc'
        });
      }
    }

    const currentTier = user.tier;
    const currency = user.preferences?.defaultCurrency || 'USD';

    // Validate upgrade path
    const tierOrder = ['free', 'starter', 'growth', 'enterprise', 'api'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const targetIndex = tierOrder.indexOf(targetTier);

    if (targetIndex <= currentIndex) {
      return res.status(400).json({
        success: false,
        message: 'Cannot downgrade or upgrade to same tier'
      });
    }

    const upgradeCost = calculateUpgradeCost(currentTier, targetTier, currency);
    const targetTierInfo = getTierPricing(targetTier, currency);

    // If free upgrade (starter), do it immediately
    if (upgradeCost.totalDue === 0) {
      user.tier = targetTier;
      await user.save();

      // Create free subscription record
      const subscription = await Subscription.create({
        userId: user._id,
        tier: targetTier,
        status: 'active',
        currency,
        monthlyCost: 0,
        setupFee: 0,
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        autoRenew: false,
        metadata: {
          previousTier: currentTier,
          upgradeReason: 'Free upgrade'
        }
      });

      return res.json({
        success: true,
        message: `Upgraded to ${targetTierInfo.name} tier successfully!`,
        data: {
          tier: targetTier,
          subscription
        }
      });
    }

    // Create payment record for paid upgrade
    const paymentReference = Payment.generateReference();
    
    const payment = await Payment.create({
      userId: user._id,
      type: 'tier_upgrade',
      tier: targetTier,
      amount: upgradeCost.totalDue,
      currency,
      status: 'pending',
      paymentMethod,
      reference: paymentReference,
      breakdown: {
        setupFee: upgradeCost.setupFee,
        monthlyCost: upgradeCost.monthlyCost,
        subtotal: upgradeCost.totalDue,
        total: upgradeCost.totalDue
      },
      metadata: {
        description: `Upgrade to ${targetTierInfo.name} tier`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Initialize payment with Paystack
    let paymentUrl;
    if (paymentMethod === 'paystack') {
      const paystackResult = await paystackService.initializePayment({
        email: user.email,
        amount: upgradeCost.totalDue,
        currency,
        reference: paymentReference,
        metadata: {
          userId: user._id.toString(),
          targetTier,
          type: 'tier_upgrade'
        },
        callback_url: `${process.env.FRONTEND_URL}/upgrade/callback`
      });

      if (paystackResult.success) {
        payment.authorizationUrl = paystackResult.data.authorization_url;
        payment.gatewayReference = paystackResult.data.reference;
        await payment.save();

        paymentUrl = paystackResult.data.authorization_url;
      } else {
        payment.status = 'failed';
        await payment.save();

        return res.status(500).json({
          success: false,
          message: 'Failed to initialize payment',
          error: paystackResult.error
        });
      }
    }

    res.json({
      success: true,
      message: 'Payment initialized',
      data: {
        paymentReference,
        paymentUrl,
        amount: upgradeCost.totalDue,
        currency,
        targetTier,
        tierInfo: targetTierInfo
      }
    });

  } catch (error) {
    console.error('Initiate upgrade error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate upgrade',
      error: error.message
    });
  }
};

// ==================== VERIFY PAYMENT & COMPLETE UPGRADE ====================
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const payment = await Payment.findOne({ reference });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if already processed
    if (payment.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: { status: 'completed' }
      });
    }

    // Verify with Paystack
    const verification = await paystackService.verifyPayment(reference);

    if (!verification.success) {
      payment.status = 'failed';
      payment.failedAt = new Date();
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verification.error
      });
    }

    const paymentData = verification.data;

    if (paymentData.status !== 'success') {
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.webhookData = paymentData;
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment was not successful'
      });
    }

    // ✅ PAYMENT SUCCESSFUL - UPGRADE USER
    payment.status = 'completed';
    payment.paidAt = new Date();
    payment.webhookData = paymentData;
    await payment.save();

    const user = await User.findById(payment.userId);
    const previousTier = user.tier;

    // Update user tier
    user.tier = payment.tier;
    await user.save();

    // Create subscription record
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // 30 days

    const subscription = await Subscription.create({
      userId: user._id,
      tier: payment.tier,
      status: 'active',
      currency: payment.currency,
      monthlyCost: payment.breakdown.monthlyCost,
      setupFee: payment.breakdown.setupFee,
      currentPeriodEnd,
      nextBillingDate: currentPeriodEnd,
      paymentMethod: payment.paymentMethod,
      paymentReference: reference,
      lastPayment: {
        amount: payment.amount,
        currency: payment.currency,
        reference,
        paidAt: payment.paidAt,
        method: payment.paymentMethod
      },
      metadata: {
        previousTier,
        upgradeReason: 'Paid upgrade'
      }
    });

    // If API tier, enable API access
    if (payment.tier === 'api') {
      user.apiAccess.enabled = true;
      await user.save();
    }

    res.json({
      success: true,
      message: `Successfully upgraded to ${payment.tier} tier!`,
      data: {
        tier: payment.tier,
        subscription,
        payment: {
          reference,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: payment.paidAt
        }
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// ==================== CANCEL SUBSCRIPTION ====================
exports.cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;

    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'active'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason;
    subscription.autoRenew = false;
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        subscription,
        note: 'You will have access until the end of your current billing period'
      }
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

module.exports = exports;
