// src/services/adminService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

const adminService = {
  login: async (credentials) => {
    try {
      console.log('📡 Admin login request:', credentials.email);
      
      const response = await api.post('/admin/login', {
        email: credentials.email.trim(),
        password: credentials.password
      });
      
      console.log('📦 Response:', response.data);
      
      if (response.data.success && response.data.token) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('admin', JSON.stringify(response.data.admin));
        console.log('✅ Admin logged in');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
  },

  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getTransactions: async (params = {}) => {
    const response = await api.get('/admin/transactions', { params });
    return response.data;
  },

  getDisputes: async (params = {}) => {
    const response = await api.get('/admin/disputes', { params });
    return response.data;
  },

  resolveDispute: async (disputeId, data) => {
    const response = await api.put(`/admin/disputes/${disputeId}/resolve`, data);
    return response.data;
  },

  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  changeUserTier: async (userId, tierData) => {
    const response = await api.put(`/admin/users/${userId}/tier`, tierData);
    return response.data;
  },

  toggleUserStatus: async (userId, statusData) => {
    const response = await api.put(`/admin/users/${userId}/toggle-status`, statusData);
    return response.data;
  },

  reviewKYC: async (userId, kycData) => {
    const response = await api.put(`/admin/users/${userId}/kyc`, kycData);
    return response.data;
  },

  getAnalytics: async (params = {}) => {
    const response = await api.get('/admin/analytics', { params });
    return response.data;
  },

  getPlatformStats: async () => {
    const response = await api.get('/admin/platform-stats');
    return response.data;
  },

  getAdmins: async () => {
    const response = await api.get('/admin/admins');
    return response.data;
  },

  createSubAdmin: async (adminData) => {
    const response = await api.post('/admin/admins', adminData);
    return response.data;
  },

  updateAdminPermissions: async (adminId, permissions) => {
    const response = await api.put(`/admin/admins/${adminId}/permissions`, { permissions });
    return response.data;
  },

  toggleAdminStatus: async (adminId) => {
    const response = await api.put(`/admin/admins/${adminId}/toggle-status`);
    return response.data;
  },

  deleteSubAdmin: async (adminId) => {
    const response = await api.delete(`/admin/admins/${adminId}`);
    return response.data;
  },

  getFeeSettings: async () => {
    const response = await api.get('/admin/fees');
    return response.data;
  },

  updateFeeSettings: async (feeData) => {
    const response = await api.put('/admin/fees/update', feeData);
    return response.data;
  },

  bulkUpdateTierFees: async (tier, updates) => {
    const response = await api.put('/admin/fees/bulk-update', { tier, updates });
    return response.data;
  },

  updateGatewayCosts: async (gatewayData) => {
    const response = await api.put('/admin/fees/gateway-costs', gatewayData);
    return response.data;
  },

  getFeeHistory: async (params = {}) => {
    const response = await api.get('/admin/fees/history', { params });
    return response.data;
  },

  resetFeesToDefault: async (tier) => {
    const response = await api.post('/admin/fees/reset', { tier });
    return response.data;
  }
};

export default adminService;
export { adminService };