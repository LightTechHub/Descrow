// src/services/authService.js
import api from '../config/api';
import { toast } from 'react-hot-toast';

export const authService = {
  /* =========================
     REGISTER
  ========================== */
  async register(userData) {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },

  /* =========================
     LOGIN
  ========================== */
  async login(credentials) {
    const res = await api.post('/auth/login', credentials);

    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Login failed');
    }

    if (!res.data.user) {
      throw new Error('Invalid server response');
    }

    if (!res.data.user.verified) {
      return {
        success: false,
        requiresVerification: true,
        user: res.data.user
      };
    }

    if (!res.data.token) {
      throw new Error('Authentication token missing');
    }

    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));

    return res.data;
  },

  /* =========================
     GOOGLE AUTH
  ========================== */
  async googleAuth(data) {
    const res = await api.post('/auth/google', data);

    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Google auth failed');
    }

    if (res.data.token && res.data.user) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }

    return res.data;
  },

  /* =========================
     VERIFY EMAIL
  ========================== */
  async verifyEmail(token) {
    const res = await api.post('/auth/verify-email', { token });
    return res.data;
  },

  /* =========================
     FORGOT / RESET
  ========================== */
  async forgotPassword(email) {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token, password) {
    const res = await api.post('/auth/reset-password', { token, password });
    return res.data;
  },

  /* =========================
     LOGOUT (SAFE)
  ========================== */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /* =========================
     CURRENT USER (SAFE)
  ========================== */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');

    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      return null;
    }

    try {
      return JSON.parse(userStr);
    } catch (err) {
      console.error('User parse failed:', err);
      // ❌ DO NOT DELETE TOKEN HERE
      return null;
    }
  },

  /* =========================
     TOKEN
  ========================== */
  getToken() {
    return localStorage.getItem('token');
  },

  /* =========================
     AUTH CHECK
  ========================== */
  isAuthenticated() {
    return !!(this.getToken() && this.getCurrentUser());
  }
};

export default authService;