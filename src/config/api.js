// src/config/api.js
import axios from 'axios';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add token
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (no response from server)
    if (!error.response) {
      console.error('❌ Network error:', error.message);
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Only logout on SPECIFIC auth errors with error codes
    if (status === 401) {
      if (data.code === 'TOKEN_EXPIRED') {
        console.log('🔐 Token expired, logging out...');
        toast.error('Your session has expired. Please login again.');
        authService.logout();
      } else if (data.code === 'INVALID_TOKEN') {
        console.log('🔐 Invalid token, logging out...');
        toast.error('Authentication error. Please login again.');
        authService.logout();
      } else if (data.code === 'USER_NOT_FOUND') {
        console.log('🔐 User not found, logging out...');
        authService.logout();
      }
      // Don't logout on NO_TOKEN (user just not logged in yet)
      else if (data.code === 'NO_TOKEN') {
        // Silent - just means they need to login
      } else {
        // Generic 401 without code - might be temporary, DON'T logout
        console.warn('⚠️ 401 without error code, not logging out');
        toast.error(data.message || 'Authentication required');
      }
    }

    // 403 Forbidden (permissions, not auth) - DON'T logout
    else if (status === 403) {
      if (data.code === 'ACCOUNT_SUSPENDED') {
        toast.error('Your account has been suspended');
        authService.logout();
      } else {
        toast.error(data.message || 'Access denied');
      }
    }

    // Server errors (500+) - DON'T logout
    else if (status >= 500) {
      console.error('❌ Server error:', status);
      toast.error('Server error. Please try again.');
    }

    return Promise.reject(error);
  }
);

export default api;