// src/services/authService.js - FINAL FIXED VERSION
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
      const errorMsg = err.response?.data?.message || 'Registration failed.';
      toast.error(errorMsg);
      throw err.response?.data || { message: errorMsg };
    }
  },

  /**
   * 🔑 Login user - FIXED: Backend handles verification check
   */
  async login(credentials) {
    try {
      console.log('🔐 authService.login called with:', credentials.email);
      
      const res = await api.post('/auth/login', credentials);
      
      console.log('📦 Backend response:', res.data);

      // ✅ FIX: If backend returns success, user is verified!
      if (!res.data.success) {
        const errorMsg = res.data.message || 'Login failed';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (!res.data.user) {
        toast.error('Invalid response from server');
        throw new Error('No user data in response');
      }

      if (!res.data.token) {
        toast.error('Authentication token missing');
        throw new Error('No token in response');
      }

      // ✅ Save credentials (backend already verified email)
      console.log('✅ Saving token and user to localStorage');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      console.log('💾 Token saved:', !!localStorage.getItem('token'));
      console.log('💾 User saved:', !!localStorage.getItem('user'));

      return res.data;

    } catch (err) {
      console.error('❌ authService.login error:', err);
      
      // ✅ FIX: Backend returns 403 with specific code for unverified users
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        // DON'T save anything to localStorage
        throw {
          code: 'EMAIL_NOT_VERIFIED',
          message: err.response.data.message,
          email: err.response.data.email,
          requiresVerification: true
        };
      }

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
        const errorMsg = res.data.message || 'Google authentication failed';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      // ✅ Check if profile completion is required
      if (res.data.requiresProfileCompletion) {
        console.log('📝 Profile completion required');
        return res.data;
      }

      // ✅ Existing user - save token and user
      if (res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        toast.success('Google login successful');
      }

      return res.data;

    } catch (err) {
      console.error('❌ Google auth error:', err);
      const errorMessage = err.response?.data?.message || 'Google authentication failed.';
      toast.error(errorMessage);
      throw err.response?.data || { message: errorMessage };
    }
  },

  /**
   * ✅ Complete Google Profile
   */
  async completeGoogleProfile(profileData) {
    try {
      console.log('📝 Completing Google profile...');
      
      const res = await api.post('/auth/google/complete-profile', profileData);
      
      if (!res.data.success) {
        const errorMsg = res.data.message || 'Failed to complete profile';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        console.log('✅ Profile completed and user saved');
        toast.success('Account created successfully!');
      }
      
      return res.data;
    } catch (err) {
      console.error('❌ Complete Google profile error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to complete profile';
      toast.error(errorMsg);
      throw err.response?.data || { message: errorMsg };
    }
  },

  /**
   * 📧 Verify email
   */
  async verifyEmail(token) {
    try {
      console.log('📧 Verifying email with token:', token ? token.substring(0, 20) + '...' : 'MISSING');

      if (!token || token === 'undefined' || token.trim() === '') {
        throw new Error('Verification token is required');
      }

      const res = await api.post('/auth/verify-email', { token });

      if (!res.data.success) {
        throw new Error(res.data.message || 'Verification failed');
      }

      toast.success(res.data.message || 'Email verified successfully!');

      // Update local storage user
      const storedUser = this.getCurrentUser();
      if (storedUser && storedUser.email === res.data.user?.email) {
        const updatedUser = { ...storedUser, verified: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('✅ Local user marked as verified');
      }

      return res.data;

    } catch (err) {
      console.error('❌ Verify email error:', err);
      const errorMsg = err.response?.data?.message 
        || err.message 
        || 'Invalid or expired verification link. Please request a new one.';
      
      toast.error(errorMsg);
      throw { message: errorMsg };
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
      const errorMsg = err.response?.data?.message || 'Failed to resend verification email.';
      toast.error(errorMsg);
      throw err.response?.data || { message: errorMsg };
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
      const errorMsg = err.response?.data?.message || 'Failed to send reset link.';
      toast.error(errorMsg);
      throw err.response?.data || { message: errorMsg };
    }
  },

  /**
   * 🔁 Reset password
   */
  async resetPassword(token, password) {
    try {
      console.log('🔐 Resetting password with token:', token ? token.substring(0, 20) + '...' : 'MISSING');
      
      if (!token) {
        throw new Error('Reset token is required');
      }

      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const res = await api.post(`/auth/reset-password?token=${token}`, { password });
      
      toast.success('✅ Password reset successful! You can now log in.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return res.data;
    } catch (err) {
      console.error('❌ Reset password error:', err);
      const errorMsg = err.response?.data?.message || 'Failed to reset password.';
      toast.error(errorMsg);
      throw err.response?.data || { message: errorMsg };
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
    const userStr = localStorage.getItem('user');
    
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      return null;
    }
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
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
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
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
    } catch (error) {
      console.error('❌ Error updating user data:', error);
      return null;
    }
  }
};

export default authService;
