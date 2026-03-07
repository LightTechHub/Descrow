// backend/services/didit.service.js - UPDATED WITH DUAL WORKFLOW SUPPORT
const axios = require('axios');
const crypto = require('crypto');

// ── URL helpers ────────────────────────────────────────────────────────────────
const cleanUrl = (url) => (url || '').replace(/\/$/, '');

const FRONTEND = cleanUrl(process.env.FRONTEND_URL) || 'https://dealcross.net';
const BACKEND  = cleanUrl(process.env.BACKEND_URL)  || 'https://descrow-backend-5ykg.onrender.com';

class DiditService {
  constructor() {
    this.apiKey          = process.env.DIDIT_API_KEY;
    this.webhookSecret   = process.env.DIDIT_WEBHOOK_SECRET;
    this.baseUrl         = process.env.DIDIT_API_URL || 'https://verification.didit.me';
    this.individualFlowId = process.env.DIDIT_INDIVIDUAL_FLOW_ID;
    this.businessFlowId   = process.env.DIDIT_BUSINESS_FLOW_ID;
    this.logConfiguration();
  }

  logConfiguration() {
    console.log('🔑 DiDIT Service Configuration:');
    console.log('   Base URL:', this.baseUrl);
    console.log('   Frontend:', FRONTEND);
    console.log('   Backend:', BACKEND);
    console.log('   API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : '❌ NOT SET');
    console.log('   Individual Flow:', this.individualFlowId ? `${this.individualFlowId.substring(0, 20)}...` : '❌ NOT SET');
    console.log('   Business Flow:', this.businessFlowId ? `${this.businessFlowId.substring(0, 20)}...` : '❌ NOT SET');
    console.log('   Webhook Secret:', this.webhookSecret ? 'SET ✅' : '❌ NOT SET');
    if (!this.apiKey) console.error('❌ CRITICAL: DIDIT_API_KEY is missing!');
    if (!this.individualFlowId) console.error('❌ WARNING: DIDIT_INDIVIDUAL_FLOW_ID is missing!');
    if (!this.businessFlowId) console.error('❌ WARNING: DIDIT_BUSINESS_FLOW_ID is missing!');
  }

  getHeaders() {
    if (!this.apiKey) throw new Error('DIDIT_API_KEY is not configured');
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  getWorkflowId(accountType) {
    if (accountType === 'business') {
      if (!this.businessFlowId) {
        console.warn('⚠️ Business workflow ID not set, falling back to individual');
        return this.individualFlowId;
      }
      return this.businessFlowId;
    }
    if (!this.individualFlowId) throw new Error('Individual workflow ID not configured');
    return this.individualFlowId;
  }

  validateConfiguration(accountType = 'individual') {
    const errors = [];
    if (!this.apiKey) errors.push('DIDIT_API_KEY is not set');
    const workflowId = this.getWorkflowId(accountType);
    if (!workflowId) errors.push(`DIDIT_${accountType.toUpperCase()}_FLOW_ID is not set`);
    if (errors.length > 0) {
      console.error('❌ DiDIT configuration errors:', errors);
      return { valid: false, errors };
    }
    return { valid: true };
  }

  /**
   * Create a verification session for a user
   */
  async createVerificationSession(userId, userData) {
    try {
      const accountType = userData.accountType || 'individual';

      const configCheck = this.validateConfiguration(accountType);
      if (!configCheck.valid) {
        return {
          success: false,
          message: 'KYC service is not properly configured',
          error: { detail: configCheck.errors.join(', ') }
        };
      }

      const workflowId = this.getWorkflowId(accountType);

      console.log(`🔄 Creating DiDIT ${accountType} verification session for user:`, userId);

      // ── URLs ──────────────────────────────────────────────────────────────────
      // callback  → backend webhook (POST from DiDIT servers, not user browser)
      // success_url → where DiDIT sends the USER BROWSER after completion
      // cancel_url  → where DiDIT sends the USER BROWSER if they cancel
      const callbackUrl = `${BACKEND}/api/kyc/webhooks/didit`;
      const successUrl  = `${FRONTEND}/kyc?status=completed&session={session_id}`;
      const cancelUrl   = `${FRONTEND}/kyc?status=cancelled`;

      console.log('🔗 URLs being sent to DiDIT:');
      console.log('   callback (webhook):', callbackUrl);
      console.log('   success_url:', successUrl);
      console.log('   cancel_url:', cancelUrl);

      const requestBody = {
        workflow_id:  workflowId,
        callback:     callbackUrl,
        vendor_data:  userId.toString(),
        success_url:  successUrl,
        cancel_url:   cancelUrl,
        metadata: {
          user_id:      userId.toString(),
          account_type: accountType,
          tier:         userData.tier || 'starter',
          platform:     'dealcross',
          timestamp:    new Date().toISOString()
        },
        contact_details: {
          email:      userData.email,
          email_lang: 'en',
          phone:      userData.phone || null
        }
      };

      if (accountType === 'business' && userData.businessInfo) {
        requestBody.metadata = {
          ...requestBody.metadata,
          company_name:        userData.businessInfo.companyName,
          company_type:        userData.businessInfo.companyType,
          industry:            userData.businessInfo.industry,
          registration_number: userData.businessInfo.registrationNumber
        };
      }

      const endpoint = `${this.baseUrl}/v2/session/`;

      const response = await axios.post(endpoint, requestBody, {
        headers: this.getHeaders(),
        timeout: 30000
      });

      console.log(`✅ DiDIT ${accountType} session created:`, response.data.session_id);

      return {
        success: true,
        data: {
          sessionId:       response.data.session_id,
          sessionToken:    response.data.session_token,
          sessionNumber:   response.data.session_number,
          verificationUrl: response.data.url,
          accountType,
          expiresAt:       response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

    } catch (error) {
      console.error('❌ DiDIT create session error:', {
        status:     error.response?.status,
        statusText: error.response?.statusText,
        data:       error.response?.data,
        message:    error.message
      });

      let errorMessage = 'Failed to create verification session';
      let errorDetail  = error.response?.data?.detail || error.response?.data?.message || error.message;

      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed with KYC provider';
        errorDetail  = 'Invalid API credentials. Please verify your credentials.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access forbidden';
        errorDetail  = 'Your API key does not have permission for this action.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Workflow not found';
        errorDetail  = 'The configured workflow ID does not exist. Please verify DIDIT_WORKFLOW_ID.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Invalid request data';
        errorDetail  = error.response?.data?.detail || 'Please check the request parameters.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded';
        errorDetail  = 'Too many requests. Please try again later.';
      }

      return {
        success: false,
        message: errorMessage,
        error: { detail: errorDetail, status: error.response?.status }
      };
    }
  }

  /**
   * Get verification session status and decision
   */
  async getVerificationStatus(sessionId) {
    try {
      if (!this.apiKey) return { success: false, message: 'KYC service not configured' };

      console.log('🔍 Checking DiDIT verification status:', sessionId);

      const response = await axios.get(
        `${this.baseUrl}/v2/session/${sessionId}/decision/`,
        { headers: this.getHeaders(), timeout: 15000 }
      );

      const data = response.data;
      let status = 'pending';
      let verified = false;

      if (data.status === 'Verified' || data.status === 'Approved') {
        status = 'completed'; verified = true;
      } else if (data.status === 'Rejected' || data.status === 'Failed') {
        status = 'failed'; verified = false;
      } else if (data.status === 'Expired') {
        status = 'expired'; verified = false;
      } else if (['In Progress', 'Pending', 'Not Started'].includes(data.status)) {
        status = 'processing'; verified = false;
      }

      return {
        success: true,
        data: {
          status,
          verified,
          userId: data.vendor_data,
          verificationResult: {
            identity: data.identity_verification || {},
            document: data.document_verification || {},
            liveness: data.liveness_check        || {},
            address:  data.address_verification  || {},
            aml:      data.aml_screening         || {},
            company:  data.company_verification  || {},
            ubo:      data.ubo_verification      || {}
          },
          completedAt:   data.completed_at,
          failureReason: data.rejection_reason || data.failure_reason
        }
      };
    } catch (error) {
      console.error('❌ DiDIT get status error:', {
        status:  error.response?.status,
        data:    error.response?.data,
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

      console.log('📥 Processing DiDIT webhook:', { status, sessionId: session_id, workflowId: workflow_id });

      let eventType = 'unknown';
      let verified  = false;

      if (status === 'Verified' || status === 'Approved') {
        eventType = 'completed'; verified = true;
      } else if (status === 'Rejected' || status === 'Failed') {
        eventType = 'failed'; verified = false;
      } else if (status === 'Expired') {
        eventType = 'expired'; verified = false;
      } else if (['In Progress', 'Pending', 'Not Started'].includes(status)) {
        eventType = 'in_progress'; verified = false;
      }

      return {
        type:      eventType,
        userId:    vendor_data,
        sessionId: session_id,
        verified,
        verificationData: {
          identity: event.identity_verification || {},
          document: event.document_verification || {},
          liveness: event.liveness_check        || {},
          address:  event.address_verification  || {},
          aml:      event.aml_screening         || {},
          company:  event.company_verification  || {},
          ubo:      event.ubo_verification      || {}
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
      await axios.delete(
        `${this.baseUrl}/v2/session/${sessionId}/`,
        { headers: this.getHeaders(), timeout: 15000 }
      );
      console.log('✅ DiDIT session cancelled:', sessionId);
      return { success: true };
    } catch (error) {
      console.error('❌ DiDIT cancel session error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const configCheck = this.validateConfiguration('individual');
      if (!configCheck.valid) {
        return { success: false, error: 'Configuration incomplete: ' + configCheck.errors.join(', ') };
      }
      const response = await axios.get(
        `${this.baseUrl}/v2/session/`,
        { headers: this.getHeaders(), timeout: 5000, params: { limit: 1 } }
      );
      console.log('✅ DiDIT API health check passed');
      return {
        success: true,
        message: 'DiDIT API connection successful',
        data: {
          baseUrl:                this.baseUrl,
          individualFlowConfigured: !!this.individualFlowId,
          businessFlowConfigured:   !!this.businessFlowId
        }
      };
    } catch (error) {
      console.error('❌ DiDIT API health check failed:', {
        status:  error.response?.status,
        message: error.response?.data || error.message
      });
      return { success: false, error: error.response?.data || error.message, status: error.response?.status };
    }
  }
}

module.exports = new DiditService();// backend/services/didit.service.js - UPDATED WITH DUAL WORKFLOW SUPPORT
const axios = require('axios');
const crypto = require('crypto');

// ── URL helpers ────────────────────────────────────────────────────────────────
const cleanUrl = (url) => (url || '').replace(/\/$/, '');

const FRONTEND = cleanUrl(process.env.FRONTEND_URL) || 'https://dealcross.net';
const BACKEND  = cleanUrl(process.env.BACKEND_URL)  || 'https://descrow-backend-5ykg.onrender.com';

class DiditService {
  constructor() {
    this.apiKey          = process.env.DIDIT_API_KEY;
    this.webhookSecret   = process.env.DIDIT_WEBHOOK_SECRET;
    this.baseUrl         = process.env.DIDIT_API_URL || 'https://verification.didit.me';
    this.individualFlowId = process.env.DIDIT_INDIVIDUAL_FLOW_ID;
    this.businessFlowId   = process.env.DIDIT_BUSINESS_FLOW_ID;
    this.logConfiguration();
  }

  logConfiguration() {
    console.log('🔑 DiDIT Service Configuration:');
    console.log('   Base URL:', this.baseUrl);
    console.log('   Frontend:', FRONTEND);
    console.log('   Backend:', BACKEND);
    console.log('   API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : '❌ NOT SET');
    console.log('   Individual Flow:', this.individualFlowId ? `${this.individualFlowId.substring(0, 20)}...` : '❌ NOT SET');
    console.log('   Business Flow:', this.businessFlowId ? `${this.businessFlowId.substring(0, 20)}...` : '❌ NOT SET');
    console.log('   Webhook Secret:', this.webhookSecret ? 'SET ✅' : '❌ NOT SET');
    if (!this.apiKey) console.error('❌ CRITICAL: DIDIT_API_KEY is missing!');
    if (!this.individualFlowId) console.error('❌ WARNING: DIDIT_INDIVIDUAL_FLOW_ID is missing!');
    if (!this.businessFlowId) console.error('❌ WARNING: DIDIT_BUSINESS_FLOW_ID is missing!');
  }

  getHeaders() {
    if (!this.apiKey) throw new Error('DIDIT_API_KEY is not configured');
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  getWorkflowId(accountType) {
    if (accountType === 'business') {
      if (!this.businessFlowId) {
        console.warn('⚠️ Business workflow ID not set, falling back to individual');
        return this.individualFlowId;
      }
      return this.businessFlowId;
    }
    if (!this.individualFlowId) throw new Error('Individual workflow ID not configured');
    return this.individualFlowId;
  }

  validateConfiguration(accountType = 'individual') {
    const errors = [];
    if (!this.apiKey) errors.push('DIDIT_API_KEY is not set');
    const workflowId = this.getWorkflowId(accountType);
    if (!workflowId) errors.push(`DIDIT_${accountType.toUpperCase()}_FLOW_ID is not set`);
    if (errors.length > 0) {
      console.error('❌ DiDIT configuration errors:', errors);
      return { valid: false, errors };
    }
    return { valid: true };
  }

  /**
   * Create a verification session for a user
   */
  async createVerificationSession(userId, userData) {
    try {
      const accountType = userData.accountType || 'individual';

      const configCheck = this.validateConfiguration(accountType);
      if (!configCheck.valid) {
        return {
          success: false,
          message: 'KYC service is not properly configured',
          error: { detail: configCheck.errors.join(', ') }
        };
      }

      const workflowId = this.getWorkflowId(accountType);

      console.log(`🔄 Creating DiDIT ${accountType} verification session for user:`, userId);

      // ── URLs ──────────────────────────────────────────────────────────────────
      // callback  → backend webhook (POST from DiDIT servers, not user browser)
      // success_url → where DiDIT sends the USER BROWSER after completion
      // cancel_url  → where DiDIT sends the USER BROWSER if they cancel
      const callbackUrl = `${BACKEND}/api/kyc/webhooks/didit`;
      const successUrl  = `${FRONTEND}/kyc?status=completed&session={session_id}`;
      const cancelUrl   = `${FRONTEND}/kyc?status=cancelled`;

      console.log('🔗 URLs being sent to DiDIT:');
      console.log('   callback (webhook):', callbackUrl);
      console.log('   success_url:', successUrl);
      console.log('   cancel_url:', cancelUrl);

      const requestBody = {
        workflow_id:  workflowId,
        callback:     callbackUrl,
        vendor_data:  userId.toString(),
        success_url:  successUrl,
        cancel_url:   cancelUrl,
        metadata: {
          user_id:      userId.toString(),
          account_type: accountType,
          tier:         userData.tier || 'starter',
          platform:     'dealcross',
          timestamp:    new Date().toISOString()
        },
        contact_details: {
          email:      userData.email,
          email_lang: 'en',
          phone:      userData.phone || null
        }
      };

      if (accountType === 'business' && userData.businessInfo) {
        requestBody.metadata = {
          ...requestBody.metadata,
          company_name:        userData.businessInfo.companyName,
          company_type:        userData.businessInfo.companyType,
          industry:            userData.businessInfo.industry,
          registration_number: userData.businessInfo.registrationNumber
        };
      }

      const endpoint = `${this.baseUrl}/v2/session/`;

      const response = await axios.post(endpoint, requestBody, {
        headers: this.getHeaders(),
        timeout: 30000
      });

      console.log(`✅ DiDIT ${accountType} session created:`, response.data.session_id);

      return {
        success: true,
        data: {
          sessionId:       response.data.session_id,
          sessionToken:    response.data.session_token,
          sessionNumber:   response.data.session_number,
          verificationUrl: response.data.url,
          accountType,
          expiresAt:       response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

    } catch (error) {
      console.error('❌ DiDIT create session error:', {
        status:     error.response?.status,
        statusText: error.response?.statusText,
        data:       error.response?.data,
        message:    error.message
      });

      let errorMessage = 'Failed to create verification session';
      let errorDetail  = error.response?.data?.detail || error.response?.data?.message || error.message;

      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed with KYC provider';
        errorDetail  = 'Invalid API credentials. Please verify your credentials.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access forbidden';
        errorDetail  = 'Your API key does not have permission for this action.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Workflow not found';
        errorDetail  = 'The configured workflow ID does not exist. Please verify DIDIT_WORKFLOW_ID.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Invalid request data';
        errorDetail  = error.response?.data?.detail || 'Please check the request parameters.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded';
        errorDetail  = 'Too many requests. Please try again later.';
      }

      return {
        success: false,
        message: errorMessage,
        error: { detail: errorDetail, status: error.response?.status }
      };
    }
  }

  /**
   * Get verification session status and decision
   */
  async getVerificationStatus(sessionId) {
    try {
      if (!this.apiKey) return { success: false, message: 'KYC service not configured' };

      console.log('🔍 Checking DiDIT verification status:', sessionId);

      const response = await axios.get(
        `${this.baseUrl}/v2/session/${sessionId}/decision/`,
        { headers: this.getHeaders(), timeout: 15000 }
      );

      const data = response.data;
      let status = 'pending';
      let verified = false;

      if (data.status === 'Verified' || data.status === 'Approved') {
        status = 'completed'; verified = true;
      } else if (data.status === 'Rejected' || data.status === 'Failed') {
        status = 'failed'; verified = false;
      } else if (data.status === 'Expired') {
        status = 'expired'; verified = false;
      } else if (['In Progress', 'Pending', 'Not Started'].includes(data.status)) {
        status = 'processing'; verified = false;
      }

      return {
        success: true,
        data: {
          status,
          verified,
          userId: data.vendor_data,
          verificationResult: {
            identity: data.identity_verification || {},
            document: data.document_verification || {},
            liveness: data.liveness_check        || {},
            address:  data.address_verification  || {},
            aml:      data.aml_screening         || {},
            company:  data.company_verification  || {},
            ubo:      data.ubo_verification      || {}
          },
          completedAt:   data.completed_at,
          failureReason: data.rejection_reason || data.failure_reason
        }
      };
    } catch (error) {
      console.error('❌ DiDIT get status error:', {
        status:  error.response?.status,
        data:    error.response?.data,
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

      console.log('📥 Processing DiDIT webhook:', { status, sessionId: session_id, workflowId: workflow_id });

      let eventType = 'unknown';
      let verified  = false;

      if (status === 'Verified' || status === 'Approved') {
        eventType = 'completed'; verified = true;
      } else if (status === 'Rejected' || status === 'Failed') {
        eventType = 'failed'; verified = false;
      } else if (status === 'Expired') {
        eventType = 'expired'; verified = false;
      } else if (['In Progress', 'Pending', 'Not Started'].includes(status)) {
        eventType = 'in_progress'; verified = false;
      }

      return {
        type:      eventType,
        userId:    vendor_data,
        sessionId: session_id,
        verified,
        verificationData: {
          identity: event.identity_verification || {},
          document: event.document_verification || {},
          liveness: event.liveness_check        || {},
          address:  event.address_verification  || {},
          aml:      event.aml_screening         || {},
          company:  event.company_verification  || {},
          ubo:      event.ubo_verification      || {}
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
      await axios.delete(
        `${this.baseUrl}/v2/session/${sessionId}/`,
        { headers: this.getHeaders(), timeout: 15000 }
      );
      console.log('✅ DiDIT session cancelled:', sessionId);
      return { success: true };
    } catch (error) {
      console.error('❌ DiDIT cancel session error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const configCheck = this.validateConfiguration('individual');
      if (!configCheck.valid) {
        return { success: false, error: 'Configuration incomplete: ' + configCheck.errors.join(', ') };
      }
      const response = await axios.get(
        `${this.baseUrl}/v2/session/`,
        { headers: this.getHeaders(), timeout: 5000, params: { limit: 1 } }
      );
      console.log('✅ DiDIT API health check passed');
      return {
        success: true,
        message: 'DiDIT API connection successful',
        data: {
          baseUrl:                this.baseUrl,
          individualFlowConfigured: !!this.individualFlowId,
          businessFlowConfigured:   !!this.businessFlowId
        }
      };
    } catch (error) {
      console.error('❌ DiDIT API health check failed:', {
        status:  error.response?.status,
        message: error.response?.data || error.message
      });
      return { success: false, error: error.response?.data || error.message, status: error.response?.status };
    }
  }
}

module.exports = new DiditService();// backend/services/didit.service.js - UPDATED WITH DUAL WORKFLOW SUPPORT
const axios = require('axios');
const crypto = require('crypto');

// ── URL helpers ────────────────────────────────────────────────────────────────
const cleanUrl = (url) => (url || '').replace(/\/$/, '');

const FRONTEND = cleanUrl(process.env.FRONTEND_URL) || 'https://dealcross.net';
const BACKEND  = cleanUrl(process.env.BACKEND_URL)  || 'https://descrow-backend-5ykg.onrender.com';

class DiditService {
  constructor() {
    this.apiKey          = process.env.DIDIT_API_KEY;
    this.webhookSecret   = process.env.DIDIT_WEBHOOK_SECRET;
    this.baseUrl         = process.env.DIDIT_API_URL || 'https://verification.didit.me';
    this.individualFlowId = process.env.DIDIT_INDIVIDUAL_FLOW_ID;
    this.businessFlowId   = process.env.DIDIT_BUSINESS_FLOW_ID;
    this.logConfiguration();
  }

  logConfiguration() {
    console.log('🔑 DiDIT Service Configuration:');
    console.log('   Base URL:', this.baseUrl);
    console.log('   Frontend:', FRONTEND);
    console.log('   Backend:', BACKEND);
    console.log('   API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : '❌ NOT SET');
    console.log('   Individual Flow:', this.individualFlowId ? `${this.individualFlowId.substring(0, 20)}...` : '❌ NOT SET');
    console.log('   Business Flow:', this.businessFlowId ? `${this.businessFlowId.substring(0, 20)}...` : '❌ NOT SET');
    console.log('   Webhook Secret:', this.webhookSecret ? 'SET ✅' : '❌ NOT SET');
    if (!this.apiKey) console.error('❌ CRITICAL: DIDIT_API_KEY is missing!');
    if (!this.individualFlowId) console.error('❌ WARNING: DIDIT_INDIVIDUAL_FLOW_ID is missing!');
    if (!this.businessFlowId) console.error('❌ WARNING: DIDIT_BUSINESS_FLOW_ID is missing!');
  }

  getHeaders() {
    if (!this.apiKey) throw new Error('DIDIT_API_KEY is not configured');
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  getWorkflowId(accountType) {
    if (accountType === 'business') {
      if (!this.businessFlowId) {
        console.warn('⚠️ Business workflow ID not set, falling back to individual');
        return this.individualFlowId;
      }
      return this.businessFlowId;
    }
    if (!this.individualFlowId) throw new Error('Individual workflow ID not configured');
    return this.individualFlowId;
  }

  validateConfiguration(accountType = 'individual') {
    const errors = [];
    if (!this.apiKey) errors.push('DIDIT_API_KEY is not set');
    const workflowId = this.getWorkflowId(accountType);
    if (!workflowId) errors.push(`DIDIT_${accountType.toUpperCase()}_FLOW_ID is not set`);
    if (errors.length > 0) {
      console.error('❌ DiDIT configuration errors:', errors);
      return { valid: false, errors };
    }
    return { valid: true };
  }

  /**
   * Create a verification session for a user
   */
  async createVerificationSession(userId, userData) {
    try {
      const accountType = userData.accountType || 'individual';

      const configCheck = this.validateConfiguration(accountType);
      if (!configCheck.valid) {
        return {
          success: false,
          message: 'KYC service is not properly configured',
          error: { detail: configCheck.errors.join(', ') }
        };
      }

      const workflowId = this.getWorkflowId(accountType);

      console.log(`🔄 Creating DiDIT ${accountType} verification session for user:`, userId);

      // ── URLs ──────────────────────────────────────────────────────────────────
      // callback  → backend webhook (POST from DiDIT servers, not user browser)
      // success_url → where DiDIT sends the USER BROWSER after completion
      // cancel_url  → where DiDIT sends the USER BROWSER if they cancel
      const callbackUrl = `${BACKEND}/api/kyc/webhooks/didit`;
      const successUrl  = `${FRONTEND}/kyc?status=completed&session={session_id}`;
      const cancelUrl   = `${FRONTEND}/kyc?status=cancelled`;

      console.log('🔗 URLs being sent to DiDIT:');
      console.log('   callback (webhook):', callbackUrl);
      console.log('   success_url:', successUrl);
      console.log('   cancel_url:', cancelUrl);

      const requestBody = {
        workflow_id:  workflowId,
        callback:     callbackUrl,
        vendor_data:  userId.toString(),
        success_url:  successUrl,
        cancel_url:   cancelUrl,
        metadata: {
          user_id:      userId.toString(),
          account_type: accountType,
          tier:         userData.tier || 'starter',
          platform:     'dealcross',
          timestamp:    new Date().toISOString()
        },
        contact_details: {
          email:      userData.email,
          email_lang: 'en',
          phone:      userData.phone || null
        }
      };

      if (accountType === 'business' && userData.businessInfo) {
        requestBody.metadata = {
          ...requestBody.metadata,
          company_name:        userData.businessInfo.companyName,
          company_type:        userData.businessInfo.companyType,
          industry:            userData.businessInfo.industry,
          registration_number: userData.businessInfo.registrationNumber
        };
      }

      const endpoint = `${this.baseUrl}/v2/session/`;

      const response = await axios.post(endpoint, requestBody, {
        headers: this.getHeaders(),
        timeout: 30000
      });

      console.log(`✅ DiDIT ${accountType} session created:`, response.data.session_id);

      return {
        success: true,
        data: {
          sessionId:       response.data.session_id,
          sessionToken:    response.data.session_token,
          sessionNumber:   response.data.session_number,
          verificationUrl: response.data.url,
          accountType,
          expiresAt:       response.data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

    } catch (error) {
      console.error('❌ DiDIT create session error:', {
        status:     error.response?.status,
        statusText: error.response?.statusText,
        data:       error.response?.data,
        message:    error.message
      });

      let errorMessage = 'Failed to create verification session';
      let errorDetail  = error.response?.data?.detail || error.response?.data?.message || error.message;

      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed with KYC provider';
        errorDetail  = 'Invalid API credentials. Please verify your credentials.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access forbidden';
        errorDetail  = 'Your API key does not have permission for this action.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Workflow not found';
        errorDetail  = 'The configured workflow ID does not exist. Please verify DIDIT_WORKFLOW_ID.';
      } else if (error.response?.status === 422) {
        errorMessage = 'Invalid request data';
        errorDetail  = error.response?.data?.detail || 'Please check the request parameters.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded';
        errorDetail  = 'Too many requests. Please try again later.';
      }

      return {
        success: false,
        message: errorMessage,
        error: { detail: errorDetail, status: error.response?.status }
      };
    }
  }

  /**
   * Get verification session status and decision
   */
  async getVerificationStatus(sessionId) {
    try {
      if (!this.apiKey) return { success: false, message: 'KYC service not configured' };

      console.log('🔍 Checking DiDIT verification status:', sessionId);

      const response = await axios.get(
        `${this.baseUrl}/v2/session/${sessionId}/decision/`,
        { headers: this.getHeaders(), timeout: 15000 }
      );

      const data = response.data;
      let status = 'pending';
      let verified = false;

      if (data.status === 'Verified' || data.status === 'Approved') {
        status = 'completed'; verified = true;
      } else if (data.status === 'Rejected' || data.status === 'Failed') {
        status = 'failed'; verified = false;
      } else if (data.status === 'Expired') {
        status = 'expired'; verified = false;
      } else if (['In Progress', 'Pending', 'Not Started'].includes(data.status)) {
        status = 'processing'; verified = false;
      }

      return {
        success: true,
        data: {
          status,
          verified,
          userId: data.vendor_data,
          verificationResult: {
            identity: data.identity_verification || {},
            document: data.document_verification || {},
            liveness: data.liveness_check        || {},
            address:  data.address_verification  || {},
            aml:      data.aml_screening         || {},
            company:  data.company_verification  || {},
            ubo:      data.ubo_verification      || {}
          },
          completedAt:   data.completed_at,
          failureReason: data.rejection_reason || data.failure_reason
        }
      };
    } catch (error) {
      console.error('❌ DiDIT get status error:', {
        status:  error.response?.status,
        data:    error.response?.data,
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

      console.log('📥 Processing DiDIT webhook:', { status, sessionId: session_id, workflowId: workflow_id });

      let eventType = 'unknown';
      let verified  = false;

      if (status === 'Verified' || status === 'Approved') {
        eventType = 'completed'; verified = true;
      } else if (status === 'Rejected' || status === 'Failed') {
        eventType = 'failed'; verified = false;
      } else if (status === 'Expired') {
        eventType = 'expired'; verified = false;
      } else if (['In Progress', 'Pending', 'Not Started'].includes(status)) {
        eventType = 'in_progress'; verified = false;
      }

      return {
        type:      eventType,
        userId:    vendor_data,
        sessionId: session_id,
        verified,
        verificationData: {
          identity: event.identity_verification || {},
          document: event.document_verification || {},
          liveness: event.liveness_check        || {},
          address:  event.address_verification  || {},
          aml:      event.aml_screening         || {},
          company:  event.company_verification  || {},
          ubo:      event.ubo_verification      || {}
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
      await axios.delete(
        `${this.baseUrl}/v2/session/${sessionId}/`,
        { headers: this.getHeaders(), timeout: 15000 }
      );
      console.log('✅ DiDIT session cancelled:', sessionId);
      return { success: true };
    } catch (error) {
      console.error('❌ DiDIT cancel session error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const configCheck = this.validateConfiguration('individual');
      if (!configCheck.valid) {
        return { success: false, error: 'Configuration incomplete: ' + configCheck.errors.join(', ') };
      }
      const response = await axios.get(
        `${this.baseUrl}/v2/session/`,
        { headers: this.getHeaders(), timeout: 5000, params: { limit: 1 } }
      );
      console.log('✅ DiDIT API health check passed');
      return {
        success: true,
        message: 'DiDIT API connection successful',
        data: {
          baseUrl:                this.baseUrl,
          individualFlowConfigured: !!this.individualFlowId,
          businessFlowConfigured:   !!this.businessFlowId
        }
      };
    } catch (error) {
      console.error('❌ DiDIT API health check failed:', {
        status:  error.response?.status,
        message: error.response?.data || error.message
      });
      return { success: false, error: error.response?.data || error.message, status: error.response?.status };
    }
  }
}

module.exports = new DiditService();
