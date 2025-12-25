// backend/middleware/apiAuth.js - MERGED API KEY AUTHENTICATION MIDDLEWARE
const APIKey = require('../models/APIKey.model');
const User = require('../models/User.model');
const crypto = require('crypto');

/**
 * Authenticate API requests using API Key
 * Supports both X-API-Key header (single key) and X-API-Key + X-API-Secret (dual key)
 */
exports.authenticateApiKey = async (req, res, next) => {
  try {
    // Get API key from headers (multiple header formats supported)
    const apiKeyHeader = 
      req.headers['x-api-key'] || 
      req.headers['authorization']?.replace('Bearer ', '') ||
      req.headers['authorization']?.replace('bearer ', '');

    if (!apiKeyHeader) {
      return res.status(401).json({
        success: false,
        error: 'API_KEY_MISSING',
        message: 'API key is required. Include it in X-API-Key header or Authorization: Bearer header.'
      });
    }

    // Find API key (with secret for verification)
    const apiKey = await APIKey.findOne({ 
      apiKey: apiKeyHeader 
    }).select('+apiSecret').populate('userId');

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'Invalid API key'
      });
    }

    // If API secret is provided in headers, verify it
    const apiSecretHeader = req.headers['x-api-secret'];
    if (apiSecretHeader) {
      const hashedSecret = crypto
        .createHash('sha256')
        .update(apiSecretHeader)
        .digest('hex');

      if (hashedSecret !== apiKey.apiSecret) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_API_SECRET',
          message: 'Invalid API secret'
        });
      }
    }

    // Check if key is valid (status and expiration)
    if (!apiKey.isValid()) {
      const reason = apiKey.status !== 'active' 
        ? `API key is ${apiKey.status}`
        : 'API key has expired';
      
      return res.status(401).json({
        success: false,
        error: apiKey.status !== 'active' ? 'API_KEY_INACTIVE' : 'API_KEY_EXPIRED',
        message: reason
      });
    }

    // Check environment
    const requestedEnv = req.headers['x-environment'] || 'production';
    if (apiKey.environment !== requestedEnv) {
      return res.status(403).json({
        success: false,
        error: 'ENVIRONMENT_MISMATCH',
        message: `API key is for ${apiKey.environment} environment, but ${requestedEnv} was requested`
      });
    }

    // Check IP whitelist (if configured)
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      const clientIp = req.ip || 
                      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                      req.connection.remoteAddress ||
                      req.socket.remoteAddress;
      
      const normalizedClientIp = clientIp.replace('::ffff:', ''); // Remove IPv6 prefix
      
      const isWhitelisted = apiKey.ipWhitelist.some(ip => {
        const normalizedWhitelistedIp = ip.replace('::ffff:', '');
        return normalizedWhitelistedIp === normalizedClientIp;
      });

      if (!isWhitelisted) {
        return res.status(403).json({
          success: false,
          error: 'IP_NOT_WHITELISTED',
          message: 'Your IP address is not authorized for this API key',
          clientIp: normalizedClientIp
        });
      }
    }

    // Check daily rate limit
    if (!apiKey.canMakeRequest()) {
      return res.status(429).json({
        success: false,
        error: 'DAILY_RATE_LIMIT_EXCEEDED',
        message: 'Daily rate limit exceeded',
        limit: apiKey.rateLimit.requestsPerDay,
        current: apiKey.usage.requestsToday,
        resetsAt: new Date(apiKey.usage.lastResetDate).setHours(24, 0, 0, 0)
      });
    }

    // Get user (either from populated field or fetch separately)
    let user;
    if (apiKey.userId && typeof apiKey.userId === 'object') {
      user = apiKey.userId; // Already populated
    } else {
      user = await User.findById(apiKey.userId);
    }

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Associated user account not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'USER_INACTIVE',
        message: 'User account is inactive or suspended'
      });
    }

    // Check user tier still has API access
    if (!['growth', 'enterprise', 'api'].includes(user.tier)) {
      return res.status(403).json({
        success: false,
        error: 'TIER_DOWNGRADED',
        message: 'Your subscription tier no longer includes API access. Please upgrade.',
        currentTier: user.tier
      });
    }

    // Increment usage (async, don't wait for completion)
    apiKey.incrementUsage().catch(err => 
      console.error('Failed to increment API usage:', err)
    );

    // Attach to request for downstream use
    req.apiKey = apiKey;
    req.user = user;
    req.apiUser = user; // Alias for consistency
    req.environment = apiKey.environment;
    req.isApiRequest = true;

    next();

  } catch (error) {
    console.error('API authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

/**
 * Check specific API permission
 * Usage: router.post('/escrow', checkPermission('createEscrow'), controller)
 */
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'API authentication required'
      });
    }

    if (!req.apiKey.permissions || !req.apiKey.permissions[permission]) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED',
        message: `Permission '${permission}' is not enabled for this API key`,
        availablePermissions: Object.keys(req.apiKey.permissions || {}).filter(
          key => req.apiKey.permissions[key] === true
        )
      });
    }

    next();
  };
};

/**
 * Check multiple permissions (any one must be true)
 * Usage: router.post('/action', checkAnyPermission(['createEscrow', 'updateEscrow']), controller)
 */
exports.checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'API authentication required'
      });
    }

    const hasPermission = permissions.some(
      permission => req.apiKey.permissions?.[permission] === true
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED',
        message: `One of these permissions is required: ${permissions.join(', ')}`,
        availablePermissions: Object.keys(req.apiKey.permissions || {}).filter(
          key => req.apiKey.permissions[key] === true
        )
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware (per-minute limiting)
 * This runs after authenticateApiKey
 */
exports.apiRateLimiter = async (req, res, next) => {
  try {
    if (!req.apiKey) {
      return next(); // Skip if no API key (shouldn't happen if used after auth)
    }

    // Initialize global rate limit store
    if (!global.apiRateLimits) {
      global.apiRateLimits = new Map();
    }

    const now = Date.now();
    const oneMinute = 60 * 1000;
    const keyId = req.apiKey._id.toString();
    
    // Get or create rate limit data for this key
    let limitData = global.apiRateLimits.get(keyId);

    if (!limitData || now > limitData.resetAt) {
      // Create new or reset expired window
      limitData = {
        count: 0,
        resetAt: now + oneMinute
      };
    }

    // Check if limit exceeded
    if (limitData.count >= req.apiKey.rateLimit.requestsPerMinute) {
      const retryAfter = Math.ceil((limitData.resetAt - now) / 1000);
      
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests per minute',
        limit: req.apiKey.rateLimit.requestsPerMinute,
        current: limitData.count,
        retryAfter: retryAfter,
        resetAt: new Date(limitData.resetAt).toISOString()
      });
    }

    // Increment counter
    limitData.count += 1;
    global.apiRateLimits.set(keyId, limitData);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', req.apiKey.rateLimit.requestsPerMinute);
    res.setHeader('X-RateLimit-Remaining', req.apiKey.rateLimit.requestsPerMinute - limitData.count);
    res.setHeader('X-RateLimit-Reset', new Date(limitData.resetAt).toISOString());

    next();

  } catch (error) {
    console.error('Rate limiter error:', error);
    // Don't block request on rate limiter error
    next();
  }
};

/**
 * Clean up expired rate limit entries (run periodically)
 */
exports.cleanupRateLimits = () => {
  if (!global.apiRateLimits) return;

  const now = Date.now();
  for (const [keyId, limitData] of global.apiRateLimits.entries()) {
    if (now > limitData.resetAt) {
      global.apiRateLimits.delete(keyId);
    }
  }
};

// Run cleanup every 5 minutes
if (!global.rateLimitCleanupInterval) {
  global.rateLimitCleanupInterval = setInterval(exports.cleanupRateLimits, 5 * 60 * 1000);
}

/**
 * Verify webhook signature
 * Usage: router.post('/webhook', verifyWebhookSignature, controller)
 */
exports.verifyWebhookSignature = async (req, res, next) => {
  try {
    const signature = req.headers['x-dealcross-signature'];
    const apiKeyHeader = req.headers['x-api-key'];

    if (!signature || !apiKeyHeader) {
      return res.status(401).json({
        success: false,
        error: 'WEBHOOK_AUTH_FAILED',
        message: 'Webhook signature and API key required'
      });
    }

    // Find API key with webhook secret
    const apiKey = await APIKey.findOne({ apiKey: apiKeyHeader })
      .select('+webhookSecret');

    if (!apiKey || !apiKey.webhookSecret) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_WEBHOOK_KEY',
        message: 'Invalid API key or webhook not configured'
      });
    }

    // Verify signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', apiKey.webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_SIGNATURE',
        message: 'Webhook signature verification failed'
      });
    }

    req.apiKey = apiKey;
    next();

  } catch (error) {
    console.error('Webhook verification error:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: 'Webhook verification failed'
    });
  }
};

/**
 * Optional: Sandbox mode check
 */
exports.requireProduction = (req, res, next) => {
  if (req.apiKey && req.apiKey.environment !== 'production') {
    return res.status(403).json({
      success: false,
      error: 'PRODUCTION_ONLY',
      message: 'This endpoint requires a production API key'
    });
  }
  next();
};

/**
 * Optional: Test mode check
 */
exports.allowTestMode = (req, res, next) => {
  // Just pass through - used for documentation purposes
  next();
};

module.exports = exports;