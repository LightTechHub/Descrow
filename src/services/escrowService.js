import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

const escrowService = {
  createEscrow: async (data) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/escrow/create`, data, {
      headers: { Authorization: `Bearer ${token}` }
      // No Content-Type — let browser set multipart boundary for FormData
    });
    return response.data;
  },

  getMyEscrows: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(`${API_URL}/escrow/my-escrows?${queryString}`, getAuthHeaders());
    return response.data;
  },

  getEscrowById: async (id) => {
    const response = await axios.get(`${API_URL}/escrow/${id}`, getAuthHeaders());
    return response.data;
  },

  acceptEscrow: async (id) => {
    const response = await axios.post(`${API_URL}/escrow/${id}/accept`, {}, getAuthHeaders());
    return response.data;
  },

  fundEscrow: async (id, paymentData) => {
    const response = await axios.post(`${API_URL}/escrow/${id}/fund`, paymentData, getAuthHeaders());
    return response.data;
  },

  markDelivered: async (id, deliveryData) => {
    const response = await axios.post(`${API_URL}/escrow/${id}/deliver`, deliveryData, getAuthHeaders());
    return response.data;
  },

  confirmDelivery: async (id) => {
    const response = await axios.post(`${API_URL}/escrow/${id}/confirm`, {}, getAuthHeaders());
    return response.data;
  },

  raiseDispute: async (id, disputeData) => {
    const response = await axios.post(`${API_URL}/escrow/${id}/dispute`, disputeData, getAuthHeaders());
    return response.data;
  },

  cancelEscrow: async (id, reason) => {
    const response = await axios.post(`${API_URL}/escrow/${id}/cancel`, { reason }, getAuthHeaders());
    return response.data;
  },

  // FIX: was calculateFees(amount) — missing currency and transactionType params.
  // CreateEscrowModal calls calculateFees(amount, currency, transactionType).
  // Backend endpoint is GET /escrow/calculate-fees?amount=X&currency=Y
  calculateFees: async (amount, currency = 'USD', transactionType = 'custom') => {
    const response = await axios.get(
      `${API_URL}/escrow/calculate-fees?amount=${amount}&currency=${currency}&transactionType=${transactionType}`,
      getAuthHeaders()
    );
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await axios.get(`${API_URL}/escrow/dashboard-stats`, getAuthHeaders());
    return response.data;
  },

  checkCanCreate: async (amount, currency = 'USD') => {
    const response = await axios.get(
      `${API_URL}/escrow/can-create?amount=${amount}&currency=${currency}`,
      getAuthHeaders()
    );
    return response.data;
  }
};

export default escrowService;
