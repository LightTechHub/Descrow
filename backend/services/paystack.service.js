// backend/services/paystack.service.js - PAYSTACK INTEGRATION
const axios = require('axios');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseUrl = 'https://api.paystack.co';
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Initialize payment
   */
  async initializePayment({ email, amount, currency, reference, metadata, callback_url }) {
    try {
      // Paystack amount is in kobo (multiply by 100)
      const amountInKobo = Math.round(amount * 100);

      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          email,
          amount: amountInKobo,
          currency: currency || 'NGN',
          reference,
          metadata,
          callback_url
        },
        { headers: this.getHeaders() }
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data
        };
      }

      return {
        success: false,
        error: response.data.message
      };

    } catch (error) {
      console.error('Paystack initialize error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(reference) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        { headers: this.getHeaders() }
      );

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data
        };
      }

      return {
        success: false,
        error: response.data.message
      };

    } catch (error) {
      console.error('Paystack verify error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Handle webhook
   */
  async handleWebhook(event) {
    try {
      const { event: eventType, data } = event;

      console.log('📥 Paystack webhook:', eventType);

      if (eventType === 'charge.success') {
        return {
          type: 'payment_success',
          reference: data.reference,
          amount: data.amount / 100,
          currency: data.currency,
          customer: data.customer,
          metadata: data.metadata
        };
      }

      return {
        type: eventType,
        data
      };

    } catch (error) {
      console.error('Paystack webhook error:', error);
      throw error;
    }
  }
}

module.exports = new PaystackService();
