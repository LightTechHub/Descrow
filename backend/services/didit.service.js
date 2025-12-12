// backend/services/didit.service.js - Corrected for Didit API v2
const axios = require('axios');
const crypto = require('crypto');

class DiditService {
  constructor() {
    this.apiKey = process.env.DIDIT_API_KEY;
    this.webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;
    this.workflowId = process.env.DIDIT_WORKFLOW_ID;
    this.baseUrl = process.env.DIDIT_API_URL || 'https://verification.didit.me';
    
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
    console.log('   Workflow ID:', this.workflowId ? `${this.workflowId.substring(0, 20)}...` : '❌ NOT SET');
    console.log('   Webhook Secret:', this.webhookSecret ? 'SET ✅' : '❌ NOT SET');
    
    if (!this.apiKey) {
      console.error('❌ CRITICAL: DIDIT_API_KEY is missing!');
    }
    
    if (!this.workflowId) {
      console.error('❌ CRITICAL: DIDIT_WORKFLOW_ID is missing!');
      console.error('   Get this from Didit Business Console > Workflows');
    }
  }

  /**
   * Generate authentication headers for Didit API v2
   */
  getHeaders() {
    if (!this.apiKey) {
      throw new Error('DIDIT_API_KEY is not configured');
    }

    return {
      'X-Api-Key': this.apiKey,
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
    
    if (!this.workflowId) {
      errors.push('DIDIT_WORKFLOW_ID is not set - get this from Didit Business Console');
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
        workflow_id: this.workflowId,
        callback: `${process.env.BACKEND_URL}/api/webhooks/didit`,
        vendor_data: userId.toString(),
        metadata: {
          user_id: userId.toString(),
          tier: userData.tier || 'starter',
          platform: 'dealcross',
          timestamp: new Date().toISOString()
        },
        contact_details: {
          email: userData.email,
          email_lang: 'en',
          phone: userData.phone || null
        }
      };

      // Construct the correct endpoint URL
      const endpoint = `${this.baseUrl}/v2/session/`;

      console.log('📤 Request details:', {
        url: endpoint,
        method: 'POST',
        workflowId: this.workflowId ? `${this.workflowId.substring(0, 20)}...` : 'NOT SET'
      });

      const response = await axios.post(
        endpoint,
        requestBody,
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
          sessionToken: response.data.session_token,
          sessionNumber: response.data.session_number,
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
        requestUrl: error.config?.url
      });

      // Provide specific error messages based on status code
      let errorMessage = 'Failed to create verification session';
      let errorDetail = error.response?.data?.detail || error.response?.data?.message || error.message;

      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed with KYC provider';
        errorDetail = 'Invalid API key. Please verify your credentials in Render environment variables.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access forbidden';
        errorDetail = 'Your API key does not have permission for this action.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Workflow not found';
        errorDetail = 'The configured workflow ID does not exist. Please verify DIDIT_WORKFLOW_ID.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Invalid request data';
        errorDetail = error.response?.data?.detail || 'Please check the request parameters.';
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
   * Get verification session status and decision
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

      const endpoint = `${this.baseUrl}/v2/session/${sessionId}/decision/`;

      const response = await axios.get(
        endpoint,
        {
          headers: this.getHeaders(),
          timeout: 15000
        }
      );

      const data = response.data;

      // Map Didit v2 status
      let status = 'pending';
      let verified = false;

      if (data.status === 'Verified' || data.status === 'Approved') {
        status = 'completed';
        verified = true;
      } else if (data.status === 'Rejected' || data.status === 'Failed') {
        status = 'failed';
        verified = false;
      } else if (data.status === 'Expired') {
        status = 'expired';
        verified = false;
      } else if (data.status === 'In Progress' || data.status === 'Pending' || data.status === 'Not Started') {
        status = 'processing';
        verified = false;
      }

      return {
        success: true,
        data: {
          status: status,
          verified: verified,
          userId: data.vendor_data,
          verificationResult: {
            identity: data.identity_verification || {},
            document: data.document_verification || {},
            liveness: data.liveness_check || {},
            address: data.address_verification || {},
            aml: data.aml_screening || {}
          },
          completedAt: data.completed_at,
          failureReason: data.rejection_reason || data.failure_reason
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
   * Verify webhook signature from Didit
   */
  verifyWebhookSignature(rawBody, signature) {
    try {
      if (!this.webhookSecret) {
        console.warn('⚠️ Webhook secret not configured');
        return false;
      }

      // Didit webhook signature verification
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
   * Process webhook event from Didit
   */
  async processWebhookEvent(event) {
    try {
      const { status, vendor_data, session_id, workflow_id } = event;

      console.log('📥 Processing Didit webhook:', {
        status,
        sessionId: session_id,
        workflowId: workflow_id
      });

      let eventType = 'unknown';
      let verified = false;

      if (status === 'Verified' || status === 'Approved') {
        eventType = 'completed';
        verified = true;
      } else if (status === 'Rejected' || status === 'Failed') {
        eventType = 'failed';
        verified = false;
      } else if (status === 'Expired') {
        eventType = 'expired';
        verified = false;
      } else if (status === 'In Progress' || status === 'Pending' || status === 'Not Started') {
        eventType = 'in_progress';
        verified = false;
      }

      return {
        type: eventType,
        userId: vendor_data,
        sessionId: session_id,
        verified: verified,
        verificationData: {
          identity: event.identity_verification || {},
          document: event.document_verification || {},
          liveness: event.liveness_check || {},
          address: event.address_verification || {},
          aml: event.aml_screening || {}
        },
        failureReason: event.rejection_reason || event.failure_reason
      };

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
      const endpoint = `${this.baseUrl}/v2/session/${sessionId}/`;
      
      await axios.delete(
        endpoint,
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
   * Health check - verify API credentials
   */
  async healthCheck() {
    try {
      // Validate configuration
      const configCheck = this.validateConfiguration();
      if (!configCheck.valid) {
        return {
          success: false,
          error: 'Configuration incomplete: ' + configCheck.errors.join(', ')
        };
      }

      // Try to fetch sessions list to verify credentials
      const endpoint = `${this.baseUrl}/v2/session/`;
      
      const response = await axios.get(
        endpoint,
        {
          headers: this.getHeaders(),
          timeout: 5000,
          params: { limit: 1 }
        }
      );

      console.log('✅ Didit API health check passed');
      return {
        success: true,
        message: 'Didit API connection successful',
        data: {
          baseUrl: this.baseUrl,
          workflowConfigured: !!this.workflowId
        }
      };
    } catch (error) {
      console.error('❌ Didit API health check failed:', {
        status: error.response?.status,
        message: error.response?.data || error.message
      });
      
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }
}

// Export singleton instance
module.exports = new DiditService()