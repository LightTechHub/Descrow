// src/services/authService.js
import * as SecureStore from 'expo-secure-store';
import API from '../utils/api';

const authService = {
  login: async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.data.success && res.data.token) {
      await SecureStore.setItemAsync('token', res.data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  register: async (data) => {
    const res = await API.post('/auth/register', data);
    return res.data;
  },

  verify2FALogin: async (tempToken, code) => {
    const res = await API.post('/auth/2fa/verify-login', { tempToken, code });
    if (res.data.success && res.data.token) {
      await SecureStore.setItemAsync('token', res.data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout: async () => {
    try {
      await API.post('/auth/logout');
    } catch {}
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  },

  getCurrentUser: async () => {
    try {
      const u = await SecureStore.getItemAsync('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  getToken: async () => {
    return await SecureStore.getItemAsync('token');
  },

  isAuthenticated: async () => {
    const token = await SecureStore.getItemAsync('token');
    return !!token;
  },

  forgotPassword: async (email) => {
    const res = await API.post('/auth/forgot-password', { email });
    return res.data;
  },
};

export default authService;
