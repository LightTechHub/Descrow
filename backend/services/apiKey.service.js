// backend/services/apiKey.service.js - API KEY GENERATION SERVICE
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class APIKeyService {
  /**
   * Generate API key pair (key + secret)
   */
  generateKeyPair() {
    // Generate API Key (public)
    const apiKey = `dk_${this.generateRandomString(32)}`;
    
    // Generate API Secret (private)
    const apiSecret = `sk_${this.generateRandomString(48)}`;

    return { apiKey, apiSecret };
  }

  /**
   * Generate random string
   */
  generateRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase();
  }

  /**
   * Hash API secret for storage
   */
  async hashSecret(secret) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(secret, salt);
  }

  /**
   * Verify API secret
   */
  async verifySecret(plainSecret, hashedSecret) {
    return bcrypt.compare(plainSecret, hashedSecret);
  }

  /**
   * Generate webhook signature
   */
  generateWebhookSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get rate limits by tier
   */
  getRateLimits(tier) {
    const limits = {
      free: {
        requestsPerMinute: 10,
        requestsPerDay: 100
      },
      starter: {
        requestsPerMinute: 20,
        requestsPerDay: 500
      },
      growth: {
        requestsPerMinute: 60,
        requestsPerDay: 5000
      },
      enterprise: {
        requestsPerMinute: 120,
        requestsPerDay: 50000
      },
      api: {
        requestsPerMinute: 300,
        requestsPerDay: -1 // Unlimited
      }
    };

    return limits[tier] || limits.free;
  }
}

module.exports = new APIKeyService();
