// backend/services/didit.service.js - UPDATED WITH DUAL WORKFLOW SUPPORT
const axios = require('axios');
const crypto = require('crypto');

class DiditService {
  constructor() {
    this.apiKey = process.env.DIDIT_API_KEY;
    this.webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;
    this.baseUrl = process.env.DIDIT_API_URL || 'https://verification.didit.me';
    
    // TWO SEPARATE WORKFLOW IDs - Individual vs Business
    this.individualFlowId = process.env.DIDIT_INDIVIDUAL_FLOW_ID;
    this.businessFlowId = process.env.DIDIT_BUSINESS_FLOW_ID;
    
    this.logConfiguration();
  }

  /**
   * Log configuration without exposing secrets
   */
  logConfiguration() {
    console.log('🔑 DiDIT Service Configuration:');
    console.log('   Base URL:', this.baseUrl);
    console.log('   API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : '❌ NOT SET');
    console.log('   Individual Flow:', this.individualFlowId ? `${this.individualFlowId.substring(0, 20)}...` : '❌ NOT SET');
    console.log('   Business Flow:', this.businessFlowId ? `${this.businessFlowId.substring(0, 20)}...` : '❌ NOT SET');
    console.log('   Webhook Secret:', this.webhookSecret ? 'SET ✅' : '❌ NOT SET');
    
    if (!this.apiKey) {
      console.error('❌ CRITICAL: DIDIT_API_KEY is missing!');
    }
    if (!this.individualFlowId) {
      console.error('❌ WARNING: DIDIT_INDIVIDUAL_FLOW_ID is missing!');
    }
    if (!this.businessFlowId) {
      console.error('❌ WARNING: DIDIT_BUSINESS_FLOW_ID is missing!');
    }
  }

  /**
   * Generate authentication headers for DiDIT API v2
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
   * Get appropriate workflow ID based on account type
   */
  getWorkflowId(accountType) {
    if (accountType === 'business') {
      if (!this.businessFlowId) {
        console.warn('⚠️ Business workflow ID not set, falling back to individual');
        return this.individualFlowId;
      }
      return this.businessFlowId;
    } else {
      if (!this.individualFlowId) {
        throw new Error('Individual workflow ID not configured');
      }
      return this.individualFlowId;
    }
  }

  /**
   * Validate configuration before making requests
   */
  validateConfiguration(accountType = 'individual') {
    const errors = [];
    
    if (!this.apiKey) {
      errors.push('DIDIT_API_KEY is not set');
    }
    
    const workflowId = this.getWorkflowId(accountType);
    if (!workflowId) {
      errors.push(`DIDIT_${accountType.toUpperCase()}_FLOW_ID is not set`);
    }
    
    if (errors.length > 0) {
      console.error('❌ DiDIT configuration errors:', errors);
      return {
        valid: false,
        errors
      };
    }
    
    return { valid: true };
  }

  /**
   * Create a verification session for a user (supports both individual and business)
   */
  async createVerificationSession(userId, userData) {
    try {
      // Determine account type
      const accountType = userData.accountType || 'individual';
      
      // Validate configuration
      const configCheck = this.validateConfiguration(accountType);
      if (!configCheck.valid) {
        return {
          success: false,
          message: 'KYC service is not properly configured',
          error: {
            detail: configCheck.errors.join(', ')
          }
        };
      }

      const workflowId = this.getWorkflowId(accountType);

      console.log(`🔄 Creating DiDIT ${accountType} verification session for user:`, userId);

      const requestBody = {
        workflow_id: workflowId,
        callback: `${process.env.BACKEND_URL}/api/kyc/webhooks/didit`,
        vendor_data: userId.toString(),
        
        // Success/Cancel URLs
        success_url: `${process.env.FRONTEND_URL}/kyc-verification?status=success&session={session_id}`,
        cancel_url: `${process.env.FRONTEND_URL}/kyc-verification?status=cancelled`,
        
        metadata: {
          user_id: userId.toString(),
          account_type: accountType,
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

      // Add business-specific metadata if applicable
      if (accountType === 'business' && userData.businessInfo) {
        requestBody.metadata = {
          ...requestBody.metadata,
          company_name: userData.businessInfo.companyName,
          company_type: userData.businessInfo.companyType,
          industry: userData.businessInfo.industry,
          registration_number: userData.businessInfo.registrationNumber
        };
      }

      const endpoint = `${this.baseUrl}/v2/session/`;

      console.log('📤 Request details:', {
        url: endpoint,
        accountType,
        workflowId: workflowId ? `${workflowId.substring(0, 20)}...` : 'NOT SET',
        successUrl: requestBody.success_url,
        callbackUrl: requestBody.callback
      });

      const response = await axios.post(
        endpoint,
        requestBody,
        {
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      console.log(`✅ DiDIT ${accountType} session created:`, response.data.session_id);

      return {
        success: true,
        data: {
          sessionId: response.data.session_id,
          sessionToken: response.data.session_token,
          sessionNumber: response.data.session_number,
          verificationUrl: response.data.url,
          accountType,
          expiresAt: response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

    } catch (error) {
      console.error('❌ DiDIT create session error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        requestUrl: error.config?.url
      });

      let errorMessage = 'Failed to create verification session';
      let errorDetail = error.response?.data?.detail || error.response?.data?.message || error.message;

      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed with KYC provider';
        errorDetail = 'Invalid API credentials. Please verify your credentials.';
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
      if (!this.apiKey) {
        return {
          success: false,
          message: 'KYC service not configured'
        };
      }

      console.log('🔍 Checking DiDIT verification status:', sessionId);

      const endpoint = `${this.baseUrl}/v2/session/${sessionId}/decision/`;

      const response = await axios.get(
        endpoint,
        {
          headers: this.getHeaders(),
          timeout: 15000
        }
      );

      const data = response.data;

      // Map DiDIT v2 status
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
            aml: data.aml_screening || {},
            // Business-specific
            company: data.company_verification || {},
            ubo: data.ubo_verification || {}
          },
          completedAt: data.completed_at,
          failureReason: data.rejection_reason || data.failure_reason
        }
      };
    } catch (error) {
      console.error('❌ DiDIT get status error:', {
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
   * Verify webhook signature from DiDIT
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
   * Process webhook event from DiDIT
   */
  async processWebhookEvent(event) {
    try {
      const { status, vendor_data, session_id, workflow_id } = event;

      console.log('📥 Processing DiDIT webhook:', {
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
          aml: event.aml_screening || {},
          // Business-specific
          company: event.company_verification || {},
          ubo: event.ubo_verification || {}
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

      console.log('✅ DiDIT session cancelled:', sessionId);
      return { success: true };
    } catch (error) {
      console.error('❌ DiDIT cancel session error:', error.response?.data || error.message);
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
      const configCheck = this.validateConfiguration('individual');
      if (!configCheck.valid) {
        return {
          success: false,
          error: 'Configuration incomplete: ' + configCheck.errors.join(', ')
        };
      }

      const endpoint = `${this.baseUrl}/v2/session/`;
      
      const response = await axios.get(
        endpoint,
        {
          headers: this.getHeaders(),
          timeout: 5000,
          params: { limit: 1 }
        }
      );

      console.log('✅ DiDIT API health check passed');
      return {
        success: true,
        message: 'DiDIT API connection successful',
        data: {
          baseUrl: this.baseUrl,
          individualFlowConfigured: !!this.individualFlowId,
          businessFlowConfigured: !!this.businessFlowId
        }
      };
    } catch (error) {
      console.error('❌ DiDIT API health check failed:', {
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
module.exports = new DiditService();