// backend/services/didit.service.js - Direct API Integration
const axios = require('axios');
const crypto = require('crypto');

class DiditService {
  constructor() {
    this.apiKey = process.env.DIDIT_API_KEY;
    this.apiSecret = process.env.DIDIT_API_SECRET;
    this.baseUrl = process.env.DIDIT_API_URL || 'https://api.didit.me/v1';
    this.webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;
  }

  /**
   * Generate authentication headers
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Secret': this.apiSecret,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Create a verification session for a user
   */
  async createVerificationSession(userId, userData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/verification/sessions`,
        {
          user_reference: userId,
          user_email: userData.email,
          user_name: userData.name,
          callback_url: `${process.env.FRONTEND_URL}/profile?tab=kyc&status=success`,
          webhook_url: `${process.env.BACKEND_URL}/api/webhooks/didit`,
          verification_types: ['identity', 'document', 'liveness'],
          country_code: 'AUTO', // Auto-detect or specify
          metadata: {
            user_id: userId,
            tier: userData.tier || 'free',
            timestamp: new Date().toISOString()
          }
        },
        {
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      console.log('✅ Didit session created:', response.data.session_id);

      return {
        success: true,
        data: {
          sessionId: response.data.session_id,
          verificationUrl: response.data.verification_url,
          expiresAt: response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
        }
      };
    } catch (error) {
      console.error('❌ Didit create session error:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create verification session',
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
        `${this.baseUrl}/verification/sessions/${sessionId}`,
        {
          headers: this.getHeaders(),
          timeout: 15000
        }
      );

      const data = response.data;

      return {
        success: true,
        data: {
          status: data.status, // pending, in_progress, completed, failed, expired
          userId: data.metadata?.user_id,
          verificationResult: {
            verified: data.verified === true,
            identity: data.identity_verification || {},
            document: data.document_verification || {},
            liveness: data.liveness_verification || {},
            address: data.address_verification || {}
          },
          completedAt: data.completed_at,
          failureReason: data.failure_reason
        }
      };
    } catch (error) {
      console.error('❌ Didit get status error:', error.response?.data || error.message);
      
      return {
        success: false,
        message: 'Failed to get verification status',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Verify webhook signature (HMAC SHA256)
   */
  verifyWebhookSignature(rawBody, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Process webhook event from Didit
   */
  async processWebhookEvent(event) {
    try {
      const { event_type, data } = event;

      console.log('📥 Processing Didit webhook:', event_type);

      switch (event_type) {
        case 'verification.completed':
          return {
            type: 'completed',
            userId: data.metadata?.user_id,
            sessionId: data.session_id,
            verified: data.verified === true,
            verificationData: {
              identity: data.identity_verification || {},
              document: data.document_verification || {},
              liveness: data.liveness_verification || {},
              address: data.address_verification || {}
            }
          };

        case 'verification.failed':
          return {
            type: 'failed',
            userId: data.metadata?.user_id,
            sessionId: data.session_id,
            reason: data.failure_reason || 'Verification failed'
          };

        case 'verification.expired':
          return {
            type: 'expired',
            userId: data.metadata?.user_id,
            sessionId: data.session_id
          };

        case 'verification.in_progress':
          return {
            type: 'in_progress',
            userId: data.metadata?.user_id,
            sessionId: data.session_id
          };

        default:
          console.warn('⚠️ Unknown event type:', event_type);
          return {
            type: 'unknown',
            event: event_type
          };
      }
    } catch (error) {
      console.error('❌ Process webhook error:', error);
      throw error;
    }
  }

  /**
   * Cancel verification session
   */
  async cancelVerification(sessionId) {
    try {
      await axios.post(
        `${this.baseUrl}/verification/sessions/${sessionId}/cancel`,
        {},
        {
          headers: this.getHeaders(),
          timeout: 15000
        }
      );

      console.log('✅ Didit session cancelled:', sessionId);
      return { success: true };
    } catch (error) {
      console.error('❌ Didit cancel session error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

  /**
   * Retry failed verification
   */
  async retryVerification(sessionId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/verification/sessions/${sessionId}/retry`,
        {},
        {
          headers: this.getHeaders(),
          timeout: 15000
        }
      );

      return {
        success: true,
        data: {
          sessionId: response.data.session_id,
          verificationUrl: response.data.verification_url
        }
      };
    } catch (error) {
      console.error('❌ Didit retry verification error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }
}

// Export singleton instance
module.exports = new DiditService();