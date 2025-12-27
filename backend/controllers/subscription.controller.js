// backend/controllers/subscription.controller.js - TIER UPGRADE LOGIC WITH AUTO API KEY GENERATION
const User = require('../models/User.model');
const Subscription = require('../models/Subscription.model');
const Payment = require('../models/Payment.model');
const APIKey = require('../models/APIKey.model');
const { getTierPricing, calculateUpgradeCost, getAllTiersInCurrency } = require('../config/pricing.config');
const paystackService = require('../services/paystack.service');
const crypto = require('crypto');

// Helper function to generate API credentials
const generateApiCredentials = () => {
  const apiKey = `dk_live_${crypto.randomBytes(24).toString('hex')}`;
  const apiSecret = crypto.randomBytes(32).toString('hex');
  const hashedSecret = crypto.createHash('sha256').update(apiSecret).digest('hex');
  
  return { apiKey, apiSecret, hashedSecret };
};

// Helper function to get rate limits based on tier
const getRateLimitsForTier = (tier) => {
  const limits = {
    free: { requestsPerMinute: 10, requestsPerHour: 100, requestsPerDay: 1000 },
    starter: { requestsPerMinute: 30, requestsPerHour: 500, requestsPerDay: 5000 },
    growth: { requestsPerMinute: 60, requestsPerHour: 1000, requestsPerDay: 10000 },
    enterprise: { requestsPerMinute: 120, requestsPerHour: 5000, requestsPerDay: 50000 },
    api: { requestsPerMinute: 200, requestsPerHour: 10000, requestsPerDay: 100000 }
  };
  
  return limits[tier] || limits.free;
};

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
        usage: user.monthlyUsage,
        apiAccess: user.apiAccess || { enabled: false }
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

    // ✅ AUTO-GENERATE API KEYS FOR API TIER
    let apiCredentials = null;
    if (payment.tier === 'api' || payment.tier === 'enterprise') {
      try {
        // Enable API access
        user.apiAccess = {
          enabled: true,
          createdAt: new Date(),
          lastUsedAt: null,
          requestCount: 0
        };

        // Generate API credentials
        const { apiKey, apiSecret, hashedSecret } = generateApiCredentials();
        const rateLimits = getRateLimitsForTier(payment.tier);
        const webhookSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');

        // Create API key record
        await APIKey.create({
          userId: user._id,
          businessName: user.businessName || user.fullName,
          businessEmail: user.email,
          name: 'Production API Key (Auto-generated)',
          apiKey,
          apiSecret: hashedSecret,
          status: 'active',
          environment: 'production',
          rateLimit: rateLimits,
          webhookSecret,
          permissions: {
            createEscrow: true,
            viewEscrow: true,
            updateEscrow: true,
            deleteEscrow: false,
            releasePayment: true,
            refunds: payment.tier === 'api',
            webhooks: true,
            viewTransactions: true
          },
          metadata: {
            createdBy: 'auto_upgrade',
            notes: `Auto-generated on ${payment.tier} tier upgrade`,
            tier: payment.tier
          }
        });

        // Update user with API key reference
        user.apiAccess.apiKey = apiKey;
        user.apiAccess.createdAt = new Date();
        await user.save();

        // Store credentials to return (only time they'll see the secret)
        apiCredentials = {
          apiKey,
          apiSecret, // ⚠️ Only shown once!
          webhookSecret,
          rateLimits,
          warning: '⚠️ IMPORTANT: Save these credentials now! The secret will never be shown again.'
        };

        console.log('✅ API keys auto-generated for user:', user._id);

      } catch (apiError) {
        console.error('❌ Failed to auto-generate API keys:', apiError);
        // Don't fail the entire upgrade, just log the error
        // User can manually generate keys later from dashboard
      }
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
        },
        ...(apiCredentials && { apiCredentials }) // Include API creds if generated
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

    // Note: Don't immediately revoke API keys, let them work until period end
    // A cron job should handle this

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        subscription,
        note: 'You will have access until the end of your current billing period',
        accessUntil: subscription.currentPeriodEnd
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

// ==================== REACTIVATE SUBSCRIPTION ====================
exports.reactivateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'cancelled'
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No cancelled subscription found'
      });
    }

    // Check if still within billing period
    if (new Date() > subscription.currentPeriodEnd) {
      return res.status(400).json({
        success: false,
        message: 'Subscription period has ended. Please create a new subscription.'
      });
    }

    subscription.status = 'active';
    subscription.autoRenew = true;
    subscription.cancelledAt = null;
    subscription.cancelReason = null;
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: { subscription }
    });

  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate subscription'
    });
  }
};

module.exports = exports;