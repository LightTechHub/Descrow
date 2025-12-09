// File: src/services/securityService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

const securityService = {
  // 2FA Methods
  get2FAStatus: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/profile/2fa-status`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Get 2FA status error:', error);
      return {
        success: false,
        data: { enabled: false }
      };
    }
  },

  setup2FA: async () => {
    try {
      const response = await axios.post(
        `${API_URL}/profile/setup-2fa`,
        {},
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Setup 2FA error:', error);
      throw error;
    }
  },

  verify2FA: async (code) => {
    try {
      const response = await axios.post(
        `${API_URL}/profile/verify-2fa`,
        { code },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Verify 2FA error:', error);
      throw error;
    }
  },

  disable2FA: async (code, password) => {
    try {
      const response = await axios.post(
        `${API_URL}/profile/disable-2fa`,
        { code, password },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Disable 2FA error:', error);
      throw error;
    }
  },

  // Session Methods
  getSessions: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/profile/sessions`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Get sessions error:', error);
      return {
        success: false,
        data: []
      };
    }
  },

  revokeSession: async (sessionId) => {
    try {
      const response = await axios.post(
        `${API_URL}/profile/revoke-session`,
        { sessionId },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  },

  revokeAllSessions: async () => {
    try {
      const response = await axios.post(
        `${API_URL}/profile/revoke-all-sessions`,
        {},
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      throw error;
    }
  },

  // Security Logs
  getSecurityLogs: async (params = {}) => {
    try {
      const response = await axios.get(
        `${API_URL}/profile/security-logs`,
        {
          ...getAuthHeaders(),
          params
        }
      );
      return response.data;
    } catch (error) {
      console.error('Get security logs error:', error);
      return {
        success: false,
        data: []
      };
    }
  }
};

export default securityService;