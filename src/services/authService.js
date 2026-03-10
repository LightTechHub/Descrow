// src/services/authService.js - FIXED: no-throw-literal, 401 auto-logout, backend logout call
import api from '../config/api';
import { toast } from 'react-hot-toast';

// ── 401 response interceptor: fires custom event so App.jsx can auto-logout ──
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { status: 401 } }));
    }
    return Promise.reject(err);
  }
);

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
      const errorMsg = err.response?.data?.message || 'Registration failed.';
      toast.error(errorMsg);
      throw err.response?.data || { message: errorMsg };
    }
  },

  /**
   * 🔑 Login user
   */
  async login(credentials) {
    try {
      const res = await api.post('/auth/login', credentials);

      if (!res.data.success) {
        const errorMsg = res.data.message || 'Login failed';
        toast.error(errorMsg);
        // FIX: throw proper Error object (no-throw-literal)
        const err = new Error(errorMsg);
        err.data = res.data;
        throw err;
      }

      if (!res.data.user) {
        toast.error('Invalid response from server');
        throw new Error('No user data in response');
      }

      if (!res.data.token) {
        toast.error('Authentication token missing');
        throw new Error('No token in response');
      }

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      return res.data;

    } catch (err) {
      // FIX: handle EMAIL_NOT_VERIFIED without throw-literal
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        const verifyErr = new Error(err.response.data.message || 'Email not verified');
        verifyErr.code = 'EMAIL_NOT_VERIFIED';
        verifyErr.email = err.response.data.email;
        verifyErr.requiresVerification = true;
        throw verifyErr;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Invalid credentials.';
      if (!err.data) toast.error(errorMessage); // avoid double toast
      const outErr = new Error(errorMessage);
      outErr.data = err.response?.data || {};
      throw outErr;
    }
  },

  /**
   * 🔵 Google OAuth Login
   */
  async googleAuth(googleData) {
    try {
      const res = await api.post('/auth/google', googleData);

      if (!res.data.success) {
        const errorMsg = res.data.message || 'Google authentication failed';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (res.data.requiresProfileCompletion) {
        return res.data;
      }

      if (res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        toast.success('Google login successful');
      }

      return res.data;

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Google authentication failed.';
      toast.error(errorMessage);
      const outErr = new Error(errorMessage);
      outErr.data = err.response?.data || {};
      throw outErr;
    }
  },

  /**
   * ✅ Complete Google Profile
   */
  async completeGoogleProfile(profileData) {
    try {
      const res = await api.post('/auth/google/complete-profile', profileData);

      if (!res.data.success) {
        const errorMsg = res.data.message || 'Failed to complete profile';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        toast.success('Account created successfully!');
      }

      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to complete profile';
      toast.error(errorMsg);
      const outErr = new Error(errorMsg);
      outErr.data = err.response?.data || {};
      throw outErr;
    }
  },

  /**
   * 📧 Verify email
   */
  async verifyEmail(token) {
    try {
      if (!token || token === 'undefined' || token.trim() === '') {
        throw new Error('Verification token is required');
      }

      const res = await api.post('/auth/verify-email', { token });

      if (!res.data.success) {
        throw new Error(res.data.message || 'Verification failed');
      }

      toast.success(res.data.message || 'Email verified successfully!');

      const storedUser = this.getCurrentUser();
      if (storedUser && res.data.user?.email && storedUser.email === res.data.user.email) {
        const updatedUser = { ...storedUser, verified: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      return res.data;

    } catch (err) {
      const errorMsg = err.response?.data?.message
        || err.message
        || 'Invalid or expired verification link. Please request a new one.';
      toast.error(errorMsg);
      throw new Error(errorMsg);
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
      const errorMsg = err.response?.data?.message || 'Failed to resend verification email.';
      toast.error(errorMsg);
      throw new Error(errorMsg);
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
      const errorMsg = err.response?.data?.message || 'Failed to send reset link.';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  },

  /**
   * 🔁 Reset password
   */
  async resetPassword(token, password) {
    try {
      if (!token) throw new Error('Reset token is required');
      if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');

      const res = await api.post(`/auth/reset-password?token=${token}`, { password });

      toast.success('✅ Password reset successful! You can now log in.');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to reset password.';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  },

  /**
   * 🚪 Logout — calls backend to invalidate token, then clears local storage
   */
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await api.post('/auth/logout').catch(() => {}); // fire-and-forget; don't block on failure
      }
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.success('You have been logged out.');
      window.location.href = '/login';
    }
  },

  /**
   * 👤 Get current logged-in user
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') return null;
    try {
      return JSON.parse(userStr);
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  },

  /**
   * 🎫 Get authentication token
   */
  getToken() {
    return localStorage.getItem('token');
  },

  /**
   * ✅ Check if user is authenticated
   */
  isAuthenticated() {
    return !!(this.getToken() && this.getCurrentUser());
  },

  /**
   * 🔄 Refresh user data from localStorage
   */
  refreshUser() {
    return this.getCurrentUser();
  },

  /**
   * 💾 Update user data in localStorage
   */
  updateUser(userData) {
    try {
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        const updatedUser = { ...currentUser, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      }
      return null;
    } catch {
      return null;
    }
  }
};

export default authService;
