// src/services/authService.js
import api from '../config/api';
import { toast } from 'react-hot-toast';

export const authService = {
  /**
   * 📝 Register a new user
   */
  async register(userData) {
    try {
      const res = await api.post('/auth/register', userData);
      toast.success(
        res.data.message ||
          'Registration successful! Please check your email to verify your account.'
      );
      return res.data;
    } catch (err) {
      console.error('Registration error:', err);
      toast.error(err.response?.data?.message || 'Registration failed.');
      throw err.response?.data || { message: 'Registration failed.' };
    }
  },

  /**
   * 🔑 Login user
   */
  async login(credentials) {
    try {
      console.log('🔐 authService.login called with:', credentials.email);
      
      const res = await api.post('/auth/login', credentials);
      
      console.log('📦 Backend response:', res.data);

      if (!res.data.success) {
        const errorMsg = res.data.message || 'Login failed';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (!res.data.user) {
        toast.error('Invalid response from server');
        throw new Error('No user data in response');
      }

      if (!res.data.user.verified) {
        console.warn('⚠️ User not verified');
        localStorage.setItem('user', JSON.stringify(res.data.user));
        toast.error('Your email is not verified yet. Please check your inbox.');
        
        return {
          success: false,
          message: 'Email not verified',
          user: res.data.user,
          requiresVerification: true
        };
      }

      if (!res.data.token) {
        toast.error('Authentication token missing');
        throw new Error('No token in response');
      }

      console.log('✅ Saving token and user to localStorage');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      console.log('💾 Token saved:', !!localStorage.getItem('token'));
      console.log('💾 User saved:', !!localStorage.getItem('user'));

      return res.data;

    } catch (err) {
      console.error('❌ authService.login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Invalid credentials.';
      toast.error(errorMessage);
      throw err.response?.data || { message: errorMessage };
    }
  },

  /**
   * 🔵 Google OAuth Login
   */
  async googleAuth(googleData) {
    try {
      const res = await api.post('/auth/google', googleData);

      if (!res.data.success) {
        toast.error(res.data.message || 'Google authentication failed');
        throw new Error(res.data.message || 'Google authentication failed');
      }

      if (res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }

      toast.success('Google login successful');
      return res.data;

    } catch (err) {
      console.error('❌ Google auth error:', err);
      const errorMessage =
        err.response?.data?.message || 'Google authentication failed.';
      toast.error(errorMessage);
      throw err.response?.data || { message: errorMessage };
    }
  },

  /**
   * 📧 Verify email
   */
  async verifyEmail(token) {
    try {
      const res = await api.post('/auth/verify-email', { token });
      toast.success('✅ Email verified successfully! You can now log in.');

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser.email === res.data.user.email) {
        localStorage.setItem(
          'user',
          JSON.stringify({ ...storedUser, verified: true })
        );
      }

      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

      return res.data;
    } catch (err) {
      console.error('Verify email error:', err);
      toast.error(err.response?.data?.message || 'Invalid or expired link.');
      throw err.response?.data || { message: 'Verification failed.' };
    }
  },

  /**
   * 🔁 Resend verification email
   */
  async resendVerification(email) {
    try {
      const res = await api.post('/auth/resend-verification', { email });
      toast.success('📩 A new verification email has been sent.');
      return res.data;
    } catch (err) {
      console.error('Resend verification error:', err);
      toast.error(err.response?.data?.message || 'Failed to resend verification email.');
      throw err.response?.data || { message: 'Resend verification failed.' };
    }
  },

  /**
   * 🔐 Forgot password
   */
  async forgotPassword(email) {
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success('📨 Password reset link sent to your email.');
      return res.data;
    } catch (err) {
      console.error('Forgot password error:', err);
      toast.error(err.response?.data?.message || 'Failed to send reset link.');
      throw err.response?.data || { message: 'Forgot password failed.' };
    }
  },

  /**
   * 🔁 Reset password
   */
  async resetPassword(token, password) {
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      toast.success('✅ Password reset successful! You can now log in.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return res.data;
    } catch (err) {
      console.error('Reset password error:', err);
      toast.error(err.response?.data?.message || 'Failed to reset password.');
      throw err.response?.data || { message: 'Password reset failed.' };
    }
  },

  /**
   * 🚪 Logout
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('You have been logged out.');
    window.location.href = '/login';
  },

  /**
   * 👤 Get current logged-in user
   */
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};