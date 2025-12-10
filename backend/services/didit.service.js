// backend/services/didit.service.js
const axios = require('axios');
const crypto = require('crypto');

class DiditService {
  constructor() {
    this.apiKey = process.env.DIDIT_API_KEY;
    this.appId = process.env.DIDIT_APP_ID;
    this.webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;
    this.webhookVersion = process.env.DIDIT_WEBHOOK_VERSION || 'v2';
    this.baseUrl = process.env.DIDIT_API_URL || 'https://api.didit.me/v1';
    
    // Log configuration on startup (safely)
    this.logConfiguration();
  }

  /**
   * Log configuration without exposing secrets
   */
  logConfiguration() {
    console.log('🔑 Didit Service Configuration:');
    console.log('   Base URL:', this.baseUrl);
    console.log('   API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : '❌ NOT SET');
    console.log('   App ID:', this.appId ? `${this.appId.substring(0, 10)}...` : '❌ NOT SET');
    console.log('   Webhook Secret:', this.webhookSecret ? 'SET ✅' : '❌ NOT SET');
    console.log('   Webhook Version:', this.webhookVersion);
    
    if (!this.apiKey || !this.appId) {
      console.error('❌ CRITICAL: Didit API credentials are missing!');
      console.error('   Please set DIDIT_API_KEY and DIDIT_APP_ID in your environment variables');
    }
  }

  /**
   * Generate authentication headers for Didit API
   */
  getHeaders() {
    if (!this.apiKey) {
      throw new Error('DIDIT_API_KEY is not configured');
    }
    
    if (!this.appId) {
      throw new Error('DIDIT_APP_ID is not configured');
    }

    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-App-Id': this.appId,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Validate configuration before making requests
   */
  validateConfiguration() {
    const errors = [];
    
    if (!this.apiKey) {
      errors.push('DIDIT_API_KEY is not set');
    }
    
    if (!this.appId) {
      errors.push('DIDIT_APP_ID is not set');
    }
    
    if (errors.length > 0) {
      console.error('❌ Didit configuration errors:', errors);
      return {
        valid: false,
        errors
      };
    }
    
    return { valid: true };
  }

  /**
   * Create a verification session for a user
   */
  async createVerificationSession(userId, userData) {
    try {
      // Validate configuration first
      const configCheck = this.validateConfiguration();
      if (!configCheck.valid) {
        return {
          success: false,
          message: 'KYC service is not properly configured',
          error: {
            detail: `Missing configuration: ${configCheck.errors.join(', ')}. Please contact support.`
          }
        };
      }

      console.log('🔄 Creating Didit verification session for user:', userId);

      const requestBody = {
        reference_id: userId,
        email: userData.email,
        name: userData.name,
        success_url: `${process.env.FRONTEND_URL}/profile?tab=kyc&status=success`,
        cancel_url: `${process.env.FRONTEND_URL}/profile?tab=kyc&status=cancelled`,
        webhook_url: `${process.env.BACKEND_URL}/api/webhooks/didit`,
        verification_type: 'full',
        metadata: {
          user_id: userId,
          tier: userData.tier || 'free',
          platform: 'dealcross',
          timestamp: new Date().toISOString()
        }
      };

      console.log('📤 Request details:', {
        url: `${this.baseUrl}/verifications`,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ***',
          'X-App-Id': this.appId ? `${this.appId.substring(0, 10)}...` : 'NOT SET',
          'Content-Type': 'application/json'
        }
      });

      const response = await axios.post(
        `${this.baseUrl}/verifications`,
        requestBody,
        {
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      console.log('✅ Didit session created:', response.data.id);

      return {
        success: true,
        data: {
          sessionId: response.data.id,
          verificationUrl: response.data.url,
          expiresAt: response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

    } catch (error) {
      console.error('❌ Didit create session error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: {
            ...error.config?.headers,
            'Authorization': error.config?.headers?.Authorization ? 'Bearer ***' : undefined
          }
        }
      });

      // Provide specific error messages based on status code
      let errorMessage = 'Failed to create verification session';
      let errorDetail = error.response?.data?.detail || error.response?.data?.message || error.message;

      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed with KYC provider';
        errorDetail = 'Invalid API credentials. Please contact support.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access forbidden';
        errorDetail = 'Your API key does not have permission for this action.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded';
        errorDetail = 'Too many requests. Please try again later.';
      }
      
      return {
        success: false,
        message: errorMessage,
        error: {
          detail: errorDetail,
          status: error.response?.status
        }
      };
    }
  }

  /**
   * Get verification session status
   */
  async getVerificationStatus(sessionId) {
    try {
      // Validate configuration first
      const configCheck = this.validateConfiguration();
      if (!configCheck.valid) {
        return {
          success: false,
          message: 'KYC service is not properly configured',
          error: configCheck.errors
        };
      }

      console.log('🔍 Checking Didit verification status:', sessionId);

      const response = await axios.get(
        `${this.baseUrl}/verifications/${sessionId}`,
        {
          headers: this.getHeaders(),
          timeout: 15000
        }
      );

      const data = response.data;

      return {
        success: true,
        data: {
          status: data.status,
          verified: data.verification_result?.verified === true,
          userId: data.reference_id,
          verificationResult: {
            identity: {
              verified: data.verification_result?.identity?.verified || false,
              firstName: data.verification_result?.identity?.first_name,
              lastName: data.verification_result?.identity?.last_name,
              dateOfBirth: data.verification_result?.identity?.date_of_birth,
              nationality: data.verification_result?.identity?.nationality
            },
            document: {
              verified: data.verification_result?.document?.verified || false,
              type: data.verification_result?.document?.type,
              number: data.verification_result?.document?.number,
              country: data.verification_result?.document?.country,
              expiryDate: data.verification_result?.document?.expiry_date
            },
            liveness: {
              verified: data.verification_result?.liveness?.verified || false,
              score: data.verification_result?.liveness?.score
            },
            address: {
              verified: data.verification_result?.address?.verified || false,
              street: data.verification_result?.address?.street,
              city: data.verification_result?.address?.city,
              state: data.verification_result?.address?.state,
              country: data.verification_result?.address?.country,
              postalCode: data.verification_result?.address?.postal_code
            }
          },
          completedAt: data.completed_at,
          failureReason: data.failure_reason
        }
      };
    } catch (error) {
      console.error('❌ Didit get status error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      return {
        success: false,
        message: 'Failed to get verification status',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Verify webhook signature (v2)
   */
  verifyWebhookSignature(rawBody, signature) {
    try {
      if (!this.webhookSecret) {
        console.warn('⚠️ Webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      console.log(isValid ? '✅ Webhook signature valid' : '❌ Webhook signature invalid');
      return isValid;

    } catch (error) {
      console.error('❌ Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Process webhook event from Didit v2
   */
  async processWebhookEvent(event) {
    try {
      const { type, data } = event;

      console.log('📥 Processing Didit webhook:', type);

      switch (type) {
        case 'verification.completed':
        case 'verification.success':
          return {
            type: 'completed',
            userId: data.reference_id || data.metadata?.user_id,
            sessionId: data.id,
            verified: data.verification_result?.verified === true,
            verificationData: {
              identity: data.verification_result?.identity || {},
              document: data.verification_result?.document || {},
              liveness: data.verification_result?.liveness || {},
              address: data.verification_result?.address || {}
            }
          };

        case 'verification.failed':
        case 'verification.rejected':
          return {
            type: 'failed',
            userId: data.reference_id || data.metadata?.user_id,
            sessionId: data.id,
            reason: data.failure_reason || data.rejection_reason || 'Verification failed'
          };

        case 'verification.expired':
          return {
            type: 'expired',
            userId: data.reference_id || data.metadata?.user_id,
            sessionId: data.id
          };

        case 'verification.processing':
        case 'verification.pending':
          return {
            type: 'in_progress',
            userId: data.reference_id || data.metadata?.user_id,
            sessionId: data.id
          };

        default:
          console.warn('⚠️ Unknown Didit webhook event type:', type);
          return {
            type: 'unknown',
            event: type,
            userId: data.reference_id || data.metadata?.user_id
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
      await axios.delete(
        `${this.baseUrl}/verifications/${sessionId}`,
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
   * Get supported countries
   */
  async getSupportedCountries() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/countries`,
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Get countries error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check - verify API credentials
   */
  async healthCheck() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/health`,
        {
          headers: this.getHeaders(),
          timeout: 5000
        }
      );

      console.log('✅ Didit API health check passed');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Didit API health check failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new DiditService();