// backend/services/didit.service.js
const axios = require('axios');

class DiditService {
  constructor() {
    this.apiKey = process.env.DIDIT_API_KEY;
    this.apiSecret = process.env.DIDIT_API_SECRET;
    this.baseUrl = process.env.DIDIT_API_URL || 'https://api.didit.me/v1';
    this.webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;
  }

  /**
   * Create a verification session for a user
   */
  async createVerificationSession(userId, userData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/verification-sessions`,
        {
          user_id: userId,
          email: userData.email,
          full_name: userData.name,
          redirect_url: `${process.env.FRONTEND_URL}/profile?tab=kyc&status=success`,
          webhook_url: `${process.env.BACKEND_URL}/api/webhooks/didit`,
          verification_types: ['identity', 'document', 'liveness'],
          metadata: {
            user_id: userId,
            tier: userData.tier || 'free'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-API-Secret': this.apiSecret,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: {
          sessionId: response.data.session_id,
          verificationUrl: response.data.verification_url,
          expiresAt: response.data.expires_at
        }
      };
    } catch (error) {
      console.error('Didit create session error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to create verification session',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get verification session status
   */
  async getVerificationStatus(sessionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/verification-sessions/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-API-Secret': this.apiSecret
          }
        }
      );

      return {
        success: true,
        data: {
          status: response.data.status, // pending, in_progress, completed, failed, expired
          userId: response.data.metadata?.user_id,
          verificationResult: response.data.verification_result,
          completedAt: response.data.completed_at,
          documents: response.data.documents || []
        }
      };
    } catch (error) {
      console.error('Didit get status error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to get verification status',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event) {
    try {
      const { type, data } = event;

      switch (type) {
        case 'verification.completed':
          return {
            type: 'completed',
            userId: data.metadata?.user_id,
            sessionId: data.session_id,
            status: data.status,
            verified: data.verification_result?.verified === true,
            data: data.verification_result
          };

        case 'verification.failed':
          return {
            type: 'failed',
            userId: data.metadata?.user_id,
            sessionId: data.session_id,
            status: data.status,
            reason: data.failure_reason
          };

        case 'verification.expired':
          return {
            type: 'expired',
            userId: data.metadata?.user_id,
            sessionId: data.session_id
          };

        default:
          return {
            type: 'unknown',
            event: type
          };
      }
    } catch (error) {
      console.error('Process webhook error:', error);
      throw error;
    }
  }

  /**
   * Cancel verification session
   */
  async cancelVerification(sessionId) {
    try {
      await axios.post(
        `${this.baseUrl}/verification-sessions/${sessionId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-API-Secret': this.apiSecret
          }
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Didit cancel session error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DiditService();
