// backend/services/payment.service.js - PRODUCTION READY
const axios = require('axios');

class PaymentService {
  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.flutterwaveSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    this.nowpaymentsApiKey = process.env.NOWPAYMENTS_API_KEY;
    
    // FIX: Hardcode fallback URLs so payments never break if env var is missing
    this.frontendUrl = (process.env.FRONTEND_URL || 'https://dealcross.net').replace(/\/$/, '');
    this.backendUrl = (process.env.BACKEND_URL || 'https://descrow-backend-5ykg.onrender.com').replace(/\/$/, '');
    
    this.validateKeys();
  }

  validateKeys() {
    const missing = [];
    if (!this.paystackSecretKey) missing.push('PAYSTACK_SECRET_KEY');
    if (!this.flutterwaveSecretKey) missing.push('FLUTTERWAVE_SECRET_KEY');
    if (!this.nowpaymentsApiKey) missing.push('NOWPAYMENTS_API_KEY');
    if (missing.length > 0) {
      console.warn(`⚠️ Missing payment keys: ${missing.join(', ')}`);
    }
  }

  // Safe amount parser - handles Decimal128, string, number, undefined
  _parseAmount(amount) {
    if (amount === null || amount === undefined) throw new Error('Amount is required');
    // Mongoose Decimal128 objects have a toString() method
    const num = parseFloat(amount.toString());
    if (isNaN(num) || num <= 0) throw new Error(`Invalid amount: ${amount}`);
    return num;
  }

  // ═══════════════════════════════════════════════════════════
  // PAYSTACK
  // ═══════════════════════════════════════════════════════════

  async initializePaystack(email, amount, reference, metadata) {
    try {
      if (!this.paystackSecretKey) throw new Error('Paystack not configured');

      // FIX: Use _parseAmount to safely handle Decimal128/string/number
      // Paystack requires integer kobo (multiply by 100, no decimals)
      const amountInKobo = Math.round(this._parseAmount(amount) * 100);

      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email,
          amount: amountInKobo,
          reference,
          metadata,
          // FIX: Use this.frontendUrl so callback_url is always a valid URI
          callback_url: `${this.frontendUrl}/payment/verify?reference=${reference}&method=paystack`,
          channels: ['card', 'bank', 'ussd', 'mobile_money', 'bank_transfer']
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Paystack initialized:', reference);
      return {
        success: true,
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference
      };
    } catch (error) {
      console.error('❌ Paystack initialization error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize Paystack payment');
    }
  }

  async verifyPaystack(reference) {
    try {
      if (!this.paystackSecretKey) throw new Error('Paystack not configured');

      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: { Authorization: `Bearer ${this.paystackSecretKey}` },
          timeout: 30000
        }
      );

      const data = response.data.data;
      console.log('✅ Paystack verification result:', { reference: data.reference, status: data.status, amount: data.amount / 100 });

      return {
        success: data.status === 'success',
        amount: data.amount / 100,
        currency: data.currency,
        reference: data.reference,
        transactionId: data.id,
        paidAt: data.paid_at,
        channel: data.channel,
        metadata: data.metadata,
        gatewayResponse: data
      };
    } catch (error) {
      console.error('❌ Paystack verification error:', error.response?.data || error.message);
      throw new Error('Failed to verify Paystack payment');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FLUTTERWAVE
  // ═══════════════════════════════════════════════════════════

  async initializeFlutterwave(email, amount, currency, reference, metadata) {
    try {
      if (!this.flutterwaveSecretKey) throw new Error('Flutterwave not configured');

      // FIX: Use _parseAmount to safely handle Decimal128/string/number
      const parsedAmount = this._parseAmount(amount);

      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        {
          tx_ref: reference,
          amount: parsedAmount,  // FIX: plain float, NOT .toFixed() which returns a string
          currency: currency || 'USD',
          // FIX: Use this.frontendUrl so redirect_url is always a valid URI
          redirect_url: `${this.frontendUrl}/payment/verify?reference=${reference}&method=flutterwave`,
          payment_options: 'card,banktransfer,ussd,mobilemoney,mpesa,account',
          customer: {
            email,
            name: metadata.buyerName || 'Customer'
          },
          customizations: {
            title: 'Dealcross Escrow Payment',
            description: `Payment for ${metadata.itemTitle || 'escrow transaction'}`,
            logo: `${this.frontendUrl}/logo.png`
          },
          meta: metadata
        },
        {
          headers: {
            Authorization: `Bearer ${this.flutterwaveSecretKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Flutterwave initialized:', reference);
      return {
        success: true,
        link: response.data.data.link,
        reference: reference
      };
    } catch (error) {
      console.error('❌ Flutterwave initialization error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize Flutterwave payment');
    }
  }

  async verifyFlutterwave(transactionId) {
    try {
      if (!this.flutterwaveSecretKey) throw new Error('Flutterwave not configured');

      const response = await axios.get(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        {
          headers: { Authorization: `Bearer ${this.flutterwaveSecretKey}` },
          timeout: 30000
        }
      );

      const data = response.data.data;
      console.log('✅ Flutterwave verification result:', { reference: data.tx_ref, status: data.status, amount: data.amount });

      return {
        success: data.status === 'successful',
        amount: parseFloat(data.amount),
        currency: data.currency,
        reference: data.tx_ref,
        transactionId: data.id,
        paidAt: data.created_at,
        metadata: data.meta,
        gatewayResponse: data
      };
    } catch (error) {
      console.error('❌ Flutterwave verification error:', error.response?.data || error.message);
      throw new Error('Failed to verify Flutterwave payment');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // NOWPAYMENTS (CRYPTO)
  // ═══════════════════════════════════════════════════════════

  async initializeNowpayments(amount, currency, orderId, orderDescription) {
    try {
      if (!this.nowpaymentsApiKey) throw new Error('Nowpayments not configured');

      const parsedAmount = this._parseAmount(amount);

      const response = await axios.post(
        'https://api.nowpayments.io/v1/invoice',
        {
          price_amount: parsedAmount,
          price_currency: currency || 'USD',
          order_id: orderId,
          order_description: orderDescription || 'Escrow payment',
          // FIX: Use this.backendUrl / this.frontendUrl for valid URIs
          ipn_callback_url: `${this.backendUrl}/api/payments/webhook/nowpayments`,
          success_url: `${this.frontendUrl}/payment/verify?reference=${orderId}&method=crypto`,
          cancel_url: `${this.frontendUrl}/payment/cancel?reference=${orderId}`
        },
        {
          headers: {
            'x-api-key': this.nowpaymentsApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Nowpayments initialized:', orderId);
      return {
        success: true,
        payment_id: response.data.id,
        invoice_url: response.data.invoice_url,
        order_id: response.data.order_id,
        price_amount: response.data.price_amount,
        price_currency: response.data.price_currency
      };
    } catch (error) {
      console.error('❌ Nowpayments initialization error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize Nowpayments');
    }
  }

  async verifyNowpayments(paymentId) {
    try {
      if (!this.nowpaymentsApiKey) throw new Error('Nowpayments not configured');

      const response = await axios.get(
        `https://api.nowpayments.io/v1/payment/${paymentId}`,
        {
          headers: { 'x-api-key': this.nowpaymentsApiKey },
          timeout: 30000
        }
      );

      const data = response.data;
      console.log('✅ Nowpayments verification result:', { paymentId: data.payment_id, status: data.payment_status });

      return {
        success: data.payment_status === 'finished',
        paymentId: data.payment_id,
        paymentStatus: data.payment_status,
        payAddress: data.pay_address,
        payCurrency: data.pay_currency,
        payAmount: data.pay_amount,
        priceAmount: data.price_amount,
        priceCurrency: data.price_currency,
        orderId: data.order_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        gatewayResponse: data
      };
    } catch (error) {
      console.error('❌ Nowpayments verification error:', error.response?.data || error.message);
      throw new Error('Failed to verify Nowpayments');
    }
  }

  async getAvailableCurrencies() {
    try {
      if (!this.nowpaymentsApiKey) return ['btc', 'eth', 'usdt', 'ltc', 'bnb'];
      const response = await axios.get('https://api.nowpayments.io/v1/currencies', {
        headers: { 'x-api-key': this.nowpaymentsApiKey },
        timeout: 10000
      });
      return response.data.currencies;
    } catch (error) {
      return ['btc', 'eth', 'usdt', 'ltc', 'bnb', 'trx', 'doge', 'sol'];
    }
  }

  async getEstimatedPrice(amount, currency_from, currency_to = 'btc') {
    try {
      if (!this.nowpaymentsApiKey) throw new Error('Nowpayments not configured');
      const response = await axios.get(
        `https://api.nowpayments.io/v1/estimate?amount=${amount}&currency_from=${currency_from}&currency_to=${currency_to}`,
        { headers: { 'x-api-key': this.nowpaymentsApiKey }, timeout: 10000 }
      );
      return { success: true, estimated_amount: response.data.estimated_amount, currency_from: response.data.currency_from, currency_to: response.data.currency_to };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async healthCheck() {
    const status = { paystack: false, flutterwave: false, nowpayments: false };
    if (this.paystackSecretKey) {
      try {
        await axios.get('https://api.paystack.co/bank', { headers: { Authorization: `Bearer ${this.paystackSecretKey}` }, timeout: 5000 });
        status.paystack = true;
      } catch {}
    }
    if (this.flutterwaveSecretKey) {
      try {
        await axios.get('https://api.flutterwave.com/v3/banks/NG', { headers: { Authorization: `Bearer ${this.flutterwaveSecretKey}` }, timeout: 5000 });
        status.flutterwave = true;
      } catch {}
    }
    if (this.nowpaymentsApiKey) {
      try {
        await axios.get('https://api.nowpayments.io/v1/status', { headers: { 'x-api-key': this.nowpaymentsApiKey }, timeout: 5000 });
        status.nowpayments = true;
      } catch {}
    }
    return status;
  }
}

module.exports = new PaymentService();
