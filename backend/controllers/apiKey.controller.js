// backend/controllers/apiKey.controller.js - MERGED & COMPLETE API KEY MANAGEMENT
const User = require('../models/User.model');
const APIKey = require('../models/APIKey.model');
const apiKeyService = require('../services/apiKey.service');
const crypto = require('crypto');
const axios = require('axios');

// ==================== HELPER FUNCTIONS ====================

// Generate API credentials
const generateApiCredentials = () => {
  const apiKey = `dk_live_${crypto.randomBytes(24).toString('hex')}`;
  const apiSecret = crypto.randomBytes(32).toString('hex');
  const hashedSecret = crypto.createHash('sha256').update(apiSecret).digest('hex');
  
  return { apiKey, apiSecret, hashedSecret };
};

// Get rate limits based on tier
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

// ==================== GENERATE API KEYS (First Time) ====================
exports.generateApiKeys = async (req, res) => {
  try {
    const { name, environment, businessName, businessEmail } = req.body;
    
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has API access tier
    if (!['api', 'enterprise', 'growth'].includes(user.tier)) {
      return res.status(403).json({
        success: false,
        message: 'API access requires Growth, Enterprise, or API tier',
        action: 'upgrade_required',
        currentTier: user.tier,
        upgradeRequired: true
      });
    }

    // Check if already has active API keys
    const existingKey = await APIKey.findOne({ 
      userId: user._id, 
      status: 'active',
      environment: environment || 'production'
    });

    if (existingKey) {
      return res.status(400).json({
        success: false,
        message: 'API keys already exist for this environment. Use regenerate to create new keys.'
      });
    }

    // Generate key pair using service or helper
    let apiKey, apiSecret, hashedSecret;
    
    if (apiKeyService && apiKeyService.generateKeyPair) {
      const keyPair = apiKeyService.generateKeyPair(environment || 'production');
      apiKey = keyPair.apiKey;
      apiSecret = keyPair.apiSecret;
      hashedSecret = await apiKeyService.hashSecret(apiSecret);
    } else {
      const credentials = generateApiCredentials();
      apiKey = credentials.apiKey;
      apiSecret = credentials.apiSecret;
      hashedSecret = credentials.hashedSecret;
    }

    // Get rate limits for tier
    const rateLimits = getRateLimitsForTier(user.tier);

    // Generate webhook secret
    const webhookSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');

    // Create API key record
    const apiKeyRecord = await APIKey.create({
      userId: user._id,
      businessName: businessName || user.businessName || user.fullName,
      businessEmail: businessEmail || user.email,
      name: name || `${environment || 'Production'} API Key`,
      apiKey,
      apiSecret: hashedSecret,
      status: 'active',
      environment: environment || 'production',
      rateLimit: rateLimits,
      webhookSecret,
      permissions: {
        createEscrow: true,
        viewEscrow: true,
        updateEscrow: true,
        deleteEscrow: false,
        releasePayment: user.tier === 'api' || user.tier === 'enterprise',
        refunds: user.tier === 'api' || user.tier === 'enterprise',
        webhooks: true,
        viewTransactions: true
      },
      metadata: {
        createdBy: 'user',
        notes: 'Auto-generated on tier upgrade',
        tier: user.tier
      }
    });

    // Update user
    user.apiAccess = {
      enabled: true,
      apiKey: apiKey,
      createdAt: new Date(),
      lastUsedAt: null,
      requestCount: 0
    };
    await user.save();

    res.status(201).json({
      success: true,
      message: '⚠️ IMPORTANT: Save these credentials now! The secret will not be shown again.',
      data: {
        apiKey,
        apiSecret, // ⚠️ Only shown once!
        webhookSecret,
        rateLimits,
        permissions: apiKeyRecord.permissions,
        environment: apiKeyRecord.environment,
        createdAt: apiKeyRecord.createdAt
      },
      warning: 'Store your API secret securely. You will not be able to see it again!'
    });

  } catch (error) {
    console.error('Generate API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate API keys',
      error: error.message
    });
  }
};

// ==================== GENERATE ADDITIONAL API KEY ====================
exports.generateAPIKey = async (req, res) => {
  try {
    const { name, permissions, environment } = req.body;

    const user = await User.findById(req.user._id);

    // Check user tier for multiple keys
    if (!['enterprise', 'api'].includes(user.tier)) {
      return res.status(403).json({
        success: false,
        message: 'Multiple API keys require Enterprise or API tier',
        currentTier: user.tier
      });
    }

    // Count existing keys
    const keyCount = await APIKey.countDocuments({ 
      userId: user._id, 
      status: 'active' 
    });

    const maxKeys = user.tier === 'api' ? 10 : user.tier === 'enterprise' ? 5 : 1;

    if (keyCount >= maxKeys) {
      return res.status(403).json({
        success: false,
        message: `Maximum of ${maxKeys} API keys allowed for ${user.tier} tier`
      });
    }

    // Generate key
    const credentials = generateApiCredentials();
    const rateLimits = getRateLimitsForTier(user.tier);

    // Create API key record
    const apiKey = await APIKey.create({
      userId: user._id,
      businessName: user.businessName || user.fullName,
      businessEmail: user.email,
      name: name || 'API Key',
      apiKey: credentials.apiKey,
      apiSecret: credentials.hashedSecret,
      environment: environment || 'production',
      status: 'active',
      rateLimit: rateLimits,
      permissions: permissions || {
        createEscrow: true,
        viewEscrow: true,
        updateEscrow: true,
        releasePayment: false,
        refunds: false,
        webhooks: true,
        viewTransactions: true
      },
      metadata: {
        createdBy: 'user',
        tier: user.tier
      }
    });

    res.status(201).json({
      success: true,
      message: 'API key generated successfully',
      data: {
        id: apiKey._id,
        name: apiKey.name,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret, // Only shown once
        environment: apiKey.environment,
        permissions: apiKey.permissions,
        rateLimits,
        createdAt: apiKey.createdAt
      },
      warning: 'Save this key securely. You will not be able to see it again.'
    });

  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate API key',
      error: error.message
    });
  }
};

// ==================== LIST USER'S API KEYS ====================
exports.listAPIKeys = async (req, res) => {
  try {
    const apiKeys = await APIKey.find({ 
      userId: req.user._id, 
      status: { $in: ['active', 'suspended'] }
    })
      .select('-apiSecret -webhookSecret')
      .sort({ createdAt: -1 });

    const formattedKeys = apiKeys.map(key => ({
      id: key._id,
      name: key.name,
      maskedKey: key.maskedKey,
      environment: key.environment,
      status: key.status,
      permissions: key.permissions,
      rateLimit: key.rateLimit,
      usage: key.usage,
      webhookUrl: key.webhookUrl,
      createdAt: key.createdAt,
      lastUsedAt: key.usage.lastUsedAt
    }));

    res.json({
      success: true,
      count: apiKeys.length,
      data: formattedKeys
    });

  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list API keys',
      error: error.message
    });
  }
};

// ==================== REGENERATE API KEYS ====================
exports.regenerateApiKeys = async (req, res) => {
  try {
    const { confirmPassword, reason, keyId } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation required'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Verify password
    const isPasswordValid = await user.comparePassword(confirmPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Find the key to regenerate
    let oldKey;
    if (keyId) {
      oldKey = await APIKey.findOne({ _id: keyId, userId: user._id });
    } else {
      oldKey = await APIKey.findOne({ userId: user._id, status: 'active' });
    }

    if (!oldKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Revoke old key
    oldKey.status = 'revoked';
    await oldKey.save();

    // Generate new credentials
    const credentials = generateApiCredentials();
    const rateLimits = getRateLimitsForTier(user.tier);
    const webhookSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');

    // Create new key
    const newKey = await APIKey.create({
      userId: user._id,
      businessName: oldKey.businessName,
      businessEmail: oldKey.businessEmail,
      name: oldKey.name + ' (Regenerated)',
      apiKey: credentials.apiKey,
      apiSecret: credentials.hashedSecret,
      status: 'active',
      environment: oldKey.environment,
      rateLimit: rateLimits,
      webhookSecret,
      webhookUrl: oldKey.webhookUrl,
      webhookEvents: oldKey.webhookEvents,
      permissions: oldKey.permissions,
      metadata: {
        createdBy: 'user_regenerate',
        notes: reason || 'Manual regeneration',
        lastRotatedAt: new Date(),
        tier: user.tier
      }
    });

    // Update user if primary key
    if (user.apiAccess?.apiKey === oldKey.apiKey) {
      user.apiAccess.apiKey = newKey.apiKey;
      await user.save();
    }

    res.json({
      success: true,
      message: '⚠️ Old key revoked! Save these new credentials now!',
      data: {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret, // Only shown once!
        webhookSecret,
        rateLimits,
        permissions: newKey.permissions,
        createdAt: newKey.createdAt
      }
    });

  } catch (error) {
    console.error('Regenerate API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate API keys',
      error: error.message
    });
  }
};

// ==================== GET API USAGE & INFO ====================
exports.getApiUsage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.apiAccess?.enabled && !['api', 'enterprise', 'growth'].includes(user.tier)) {
      return res.status(403).json({
        success: false,
        message: 'API access not enabled',
        action: 'generate_keys',
        currentTier: user.tier
      });
    }

    const apiKeys = await APIKey.find({ 
      userId: user._id, 
      status: 'active' 
    }).select('-apiSecret');

    if (apiKeys.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active API keys found',
        action: 'generate_keys'
      });
    }

    // Calculate total usage across all keys
    const totalUsage = apiKeys.reduce((acc, key) => ({
      totalRequests: acc.totalRequests + key.usage.totalRequests,
      requestsToday: acc.requestsToday + key.usage.requestsToday,
      requestsThisMonth: acc.requestsThisMonth + key.usage.requestsThisMonth,
      transactionsCount: acc.transactionsCount + key.usage.transactionsCount
    }), {
      totalRequests: 0,
      requestsToday: 0,
      requestsThisMonth: 0,
      transactionsCount: 0
    });

    res.json({
      success: true,
      data: {
        tier: user.tier,
        totalKeys: apiKeys.length,
        totalUsage,
        keys: apiKeys.map(key => ({
          id: key._id,
          name: key.name,
          apiKey: key.maskedKey,
          environment: key.environment,
          status: key.status,
          rateLimit: key.rateLimit,
          usage: key.usage,
          webhookUrl: key.webhookUrl,
          webhookEvents: key.webhookEvents,
          permissions: key.permissions,
          createdAt: key.createdAt,
          lastUsedAt: key.usage.lastUsedAt
        }))
      }
    });

  } catch (error) {
    console.error('Get API usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API usage',
      error: error.message
    });
  }
};

// ==================== UPDATE WEBHOOK CONFIGURATION ====================
exports.updateWebhookConfig = async (req, res) => {
  try {
    const { webhookUrl, webhookEvents, keyId } = req.body;

    let apiKey;
    if (keyId) {
      apiKey = await APIKey.findOne({ _id: keyId, userId: req.user._id, status: 'active' });
    } else {
      apiKey = await APIKey.findOne({ userId: req.user._id, status: 'active' });
    }

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'No active API key found'
      });
    }

    // Validate webhook URL
    if (webhookUrl && !/^https?:\/\/.+/.test(webhookUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook URL format. Must start with http:// or https://'
      });
    }

    // Update configuration
    if (webhookUrl !== undefined) {
      apiKey.webhookUrl = webhookUrl;
      
      // Generate new webhook secret if URL is being set for first time
      if (webhookUrl && !apiKey.webhookSecret) {
        apiKey.webhookSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');
      }
    }

    if (webhookEvents) {
      apiKey.webhookEvents = webhookEvents;
    }

    await apiKey.save();

    res.json({
      success: true,
      message: 'Webhook configuration updated successfully',
      data: {
        webhookUrl: apiKey.webhookUrl,
        webhookEvents: apiKey.webhookEvents,
        webhookSecret: apiKey.webhookSecret
      }
    });

  } catch (error) {
    console.error('Update webhook config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update webhook configuration',
      error: error.message
    });
  }
};

// ==================== REVOKE SINGLE API KEY ====================
exports.revokeAPIKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const { reason } = req.body;

    const apiKey = await APIKey.findOne({ 
      _id: keyId, 
      userId: req.user._id 
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    apiKey.status = 'revoked';
    apiKey.metadata.notes = reason || 'Revoked by user';
    await apiKey.save();

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });

  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke API key',
      error: error.message
    });
  }
};

// ==================== REVOKE ALL API ACCESS ====================
exports.revokeApiAccess = async (req, res) => {
  try {
    const { confirmPassword, reason } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation required'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Verify password
    const isPasswordValid = await user.comparePassword(confirmPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Revoke all keys
    const result = await APIKey.updateMany(
      { userId: user._id, status: 'active' },
      { 
        status: 'revoked',
        'metadata.notes': reason || 'All API access revoked by user'
      }
    );

    // Update user
    user.apiAccess.enabled = false;
    user.apiAccess.revokedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: `API access revoked successfully. ${result.modifiedCount} key(s) revoked.`,
      data: {
        revokedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Revoke API access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke API access',
      error: error.message
    });
  }
};

// ==================== TEST WEBHOOK ====================
exports.testWebhook = async (req, res) => {
  try {
    const { keyId } = req.body;

    let apiKey;
    if (keyId) {
      apiKey = await APIKey.findOne({ _id: keyId, userId: req.user._id, status: 'active' })
        .select('+webhookSecret');
    } else {
      apiKey = await APIKey.findOne({ userId: req.user._id, status: 'active' })
        .select('+webhookSecret');
    }

    if (!apiKey || !apiKey.webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'No webhook URL configured for this API key'
      });
    }

    // Create test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Dealcross API',
        apiKey: apiKey.maskedKey,
        environment: apiKey.environment
      }
    };

    // Generate signature
    const signature = crypto
      .createHmac('sha256', apiKey.webhookSecret)
      .update(JSON.stringify(testPayload))
      .digest('hex');

    // Send webhook
    try {
      const response = await axios.post(apiKey.webhookUrl, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Dealcross-Signature': signature,
          'X-Dealcross-Event': 'webhook.test'
        },
        timeout: 5000
      });

      res.json({
        success: true,
        message: 'Test webhook sent successfully',
        data: {
          statusCode: response.status,
          statusText: response.statusText,
          response: response.data
        }
      });

    } catch (webhookError) {
      res.status(200).json({
        success: false,
        message: 'Webhook test failed',
        error: {
          message: webhookError.message,
          code: webhookError.code,
          statusCode: webhookError.response?.status,
          response: webhookError.response?.data
        }
      });
    }

  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test webhook',
      error: error.message
    });
  }
};

module.exports = exports;
