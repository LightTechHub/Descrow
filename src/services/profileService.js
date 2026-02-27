// src/services/profileService.js - FIXED
// Fix 1: updateProfile deep-merges server response into localStorage so
//         address.country and businessInfo fields persist correctly after save.
// Fix 2: uploadAvatar syncs the new profilePicture path into localStorage
//         so the image shows immediately without re-fetch.
// Fix 3: Added uploadBusinessDocuments for the manual KYC business flow.
// Fix 4: getProfile hits /profile (not /users/me) to get full businessInfo.
// Fix 5: Removed hardcoded test email block that was masking real data.

import api from '../config/api';

const profileService = {

  // ─── GET PROFILE ────────────────────────────────────────────────────────────
  getProfile: async () => {
    try {
      const response = await api.get('/profile');

      let userData = {};
      if (response.data?.data?.user) {
        userData = response.data.data.user;
      } else if (response.data?.data) {
        userData = response.data.data;
      } else if (response.data?.user) {
        userData = response.data.user;
      } else {
        userData = response.data;
      }

      return { success: true, data: userData };
    } catch (error) {
      console.error('Get profile error:', error);
      // Fallback to localStorage so the page doesn't crash offline
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (localUser?.email) {
        return { success: true, data: localUser };
      }
      throw error;
    }
  },

  // ─── UPDATE PROFILE ──────────────────────────────────────────────────────────
  updateProfile: async (data) => {
    try {
      const response = await api.put('/profile', data);

      if (response.data.success) {
        // ✅ FIX: Deep-merge server response into localStorage.
        // A shallow merge would overwrite address/businessInfo with whatever
        // partial object was in the response, wiping fields not in the form.
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const freshData = response.data.data || {};
        const merged = {
          ...currentUser,
          ...freshData,
          address: {
            ...(currentUser.address || {}),
            ...(freshData.address || {}),
          },
          businessInfo: {
            ...(currentUser.businessInfo || {}),
            ...(freshData.businessInfo || {}),
          },
        };
        localStorage.setItem('user', JSON.stringify(merged));
      }

      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // ─── UPLOAD AVATAR ────────────────────────────────────────────────────────────
  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        // ✅ FIX: Sync new avatar path into localStorage immediately so the
        // image resolves correctly before the next full profile re-fetch.
        const avatarPath =
          response.data.data?.profilePicture ||
          response.data.data?.avatarUrl;
        if (avatarPath) {
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
          currentUser.profilePicture = avatarPath;
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      }

      return response.data;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  },

  // ─── GET KYC STATUS (via profile endpoint) ───────────────────────────────────
  getKYCStatus: async () => {
    try {
      const response = await api.get('/profile');

      if (response.data.success) {
        const userData = response.data.data?.user || response.data.data;
        const kycData = userData?.kycStatus || {};

        return {
          success: true,
          data: {
            status: kycData.status || 'unverified',
            tier: kycData.tier || 'basic',
            submittedAt: kycData.submittedAt,
            reviewedAt: kycData.reviewedAt,
            rejectionReason: kycData.rejectionReason,
            personalInfo: kycData.personalInfo || {},
            businessInfo: kycData.businessInfo || userData?.businessInfo || {},
            isKYCVerified: userData?.isKYCVerified || false,
            documents: kycData.documents || [],
          },
        };
      }

      return {
        success: true,
        data: { status: 'unverified', tier: 'basic', isKYCVerified: false, documents: [] },
      };
    } catch (error) {
      console.error('Get KYC status error:', error);
      return {
        success: false,
        data: { status: 'unverified', tier: 'basic', isKYCVerified: false, documents: [] },
      };
    }
  },

  // ─── KYC VERIFICATION ─────────────────────────────────────────────────────────
  startKYCVerification: async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await api.post('/kyc/initiate', {
        accountType: user?.accountType || 'individual',
        businessInfo: user?.businessInfo || null,
      });
      return response.data;
    } catch (error) {
      console.error('Start KYC error:', error);
      throw error;
    }
  },

  checkKYCStatus: async () => {
    try {
      const response = await api.get('/kyc/status');
      return response.data;
    } catch (error) {
      console.error('Check KYC status error:', error);
      throw error;
    }
  },

  resetKYCVerification: async () => {
    try {
      const response = await api.post('/kyc/retry');
      return response.data;
    } catch (error) {
      console.error('Reset KYC error:', error);
      throw error;
    }
  },

  // ✅ NEW: Upload business documents for manual KYC verification.
  // KYCTab calls this when backend returns verificationType: 'manual'
  // (Nigerian and other African business accounts).
  // formData must be a FormData object with these fields:
  //   businessRegistration (required), directorId (required),
  //   proofOfAddress (required), taxDocument (optional), additionalDoc (optional)
  uploadBusinessDocuments: async (formData) => {
    try {
      // Do NOT manually set Content-Type — the browser sets it automatically
      // with the correct multipart/form-data boundary when body is FormData.
      const response = await api.post('/kyc/upload-business-documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Upload business documents error:', error);
      throw error;
    }
  },

  submitKYC: async (kycData) => {
    try {
      const response = await api.post('/users/upload-kyc', kycData);
      return response.data;
    } catch (error) {
      console.error('Submit KYC error:', error);
      throw error;
    }
  },

  // ─── BANK ACCOUNTS ────────────────────────────────────────────────────────────
  getBankAccounts: async () => {
    try {
      const response = await api.get('/bank/list');
      return response.data;
    } catch (error) {
      console.error('Get bank accounts error:', error);
      throw error;
    }
  },

  addBankAccount: async (data) => {
    try {
      const response = await api.post('/bank/add', data);
      return response.data;
    } catch (error) {
      console.error('Add bank account error:', error);
      throw error;
    }
  },

  deleteBankAccount: async (accountId) => {
    try {
      const response = await api.delete(`/bank/${accountId}`);
      return response.data;
    } catch (error) {
      console.error('Delete bank account error:', error);
      throw error;
    }
  },

  setPrimaryBankAccount: async (accountId) => {
    try {
      const response = await api.put(`/bank/primary/${accountId}`);
      return response.data;
    } catch (error) {
      console.error('Set primary bank account error:', error);
      throw error;
    }
  },

  validateBankAccount: async (data) => {
    try {
      const response = await api.post('/bank/validate', data);
      return response.data;
    } catch (error) {
      console.error('Validate bank account error:', error);
      throw error;
    }
  },

  getBanks: async (params = {}) => {
    try {
      const response = await api.get('/bank/banks', { params });
      return response.data;
    } catch (error) {
      console.error('Get banks error:', error);
      throw error;
    }
  },

  // ─── SECURITY & AUTH ──────────────────────────────────────────────────────────
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/profile/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  setPassword: async (newPassword, confirmPassword) => {
    try {
      const response = await api.post('/auth/set-password', { newPassword, confirmPassword });
      return response.data;
    } catch (error) {
      console.error('Set password error:', error);
      throw error;
    }
  },

  checkPasswordStatus: async () => {
    try {
      const response = await api.get('/auth/password-status');
      return response.data;
    } catch (error) {
      console.error('Check password status error:', error);
      throw error;
    }
  },

  deleteAccount: async (password, reason) => {
    try {
      const response = await api.post('/profile/delete-account', { password, reason });
      return response.data;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  },

  enable2FA: async () => {
    try {
      const response = await api.post('/profile/enable-2fa');
      return response.data;
    } catch (error) {
      console.error('Enable 2FA error:', error);
      throw error;
    }
  },

  verify2FA: async (token) => {
    try {
      const response = await api.post('/profile/verify-2fa', { token });
      return response.data;
    } catch (error) {
      console.error('Verify 2FA error:', error);
      throw error;
    }
  },

  disable2FA: async (password) => {
    try {
      const response = await api.post('/profile/disable-2fa', { password });
      return response.data;
    } catch (error) {
      console.error('Disable 2FA error:', error);
      throw error;
    }
  },

  getSecuritySettings: async () => {
    try {
      const response = await api.get('/profile/security-settings');
      return response.data;
    } catch (error) {
      console.error('Get security settings error:', error);
      throw error;
    }
  },

  updateSecuritySettings: async (settings) => {
    try {
      const response = await api.put('/profile/security-settings', settings);
      return response.data;
    } catch (error) {
      console.error('Update security settings error:', error);
      throw error;
    }
  },

  // ─── STATS & HISTORY ──────────────────────────────────────────────────────────
  getTierInfo: async () => {
    try {
      const response = await api.get('/profile/tier-info');
      return response.data;
    } catch (error) {
      console.error('Get tier info error:', error);
      throw error;
    }
  },

  getWalletBalance: async () => {
    try {
      const response = await api.get('/profile/wallet');
      return response.data;
    } catch (error) {
      console.error('Get wallet balance error:', error);
      throw error;
    }
  },

  getTransactionHistory: async (params = {}) => {
    try {
      const response = await api.get('/profile/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('Get transaction history error:', error);
      throw error;
    }
  },

  getEscrowStats: async () => {
    try {
      const response = await api.get('/profile/escrow-stats');
      return response.data;
    } catch (error) {
      console.error('Get escrow stats error:', error);
      throw error;
    }
  },

  getDisputeHistory: async (params = {}) => {
    try {
      const response = await api.get('/profile/disputes', { params });
      return response.data;
    } catch (error) {
      console.error('Get dispute history error:', error);
      throw error;
    }
  },

  getUserStatistics: async () => {
    try {
      const response = await api.get('/profile/statistics');
      return response.data;
    } catch (error) {
      console.error('Get user statistics error:', error);
      throw error;
    }
  },

  // ─── API KEYS ─────────────────────────────────────────────────────────────────
  getAPIKeys: async () => {
    try {
      const response = await api.get('/profile/api-keys');
      return response.data;
    } catch (error) {
      console.error('Get API keys error:', error);
      throw error;
    }
  },

  createAPIKey: async (keyData) => {
    try {
      const response = await api.post('/profile/api-keys', keyData);
      return response.data;
    } catch (error) {
      console.error('Create API key error:', error);
      throw error;
    }
  },

  deleteAPIKey: async (keyId) => {
    try {
      const response = await api.delete(`/profile/api-keys/${keyId}`);
      return response.data;
    } catch (error) {
      console.error('Delete API key error:', error);
      throw error;
    }
  },

  // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
  withdrawFunds: async (withdrawalData) => {
    try {
      const response = await api.post('/profile/withdraw', withdrawalData);
      return response.data;
    } catch (error) {
      console.error('Withdraw funds error:', error);
      throw error;
    }
  },

  initiateTierUpgrade: async (upgradeData) => {
    try {
      const response = await api.post('/profile/initiate-upgrade', upgradeData);
      return response.data;
    } catch (error) {
      console.error('Initiate tier upgrade error:', error);
      throw error;
    }
  },

  completeTierUpgrade: async (paymentData) => {
    try {
      const response = await api.post('/profile/complete-upgrade', paymentData);
      return response.data;
    } catch (error) {
      console.error('Complete tier upgrade error:', error);
      throw error;
    }
  },

  cancelSubscription: async () => {
    try {
      const response = await api.post('/profile/cancel-subscription');
      return response.data;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  },

  renewSubscription: async (paymentReference) => {
    try {
      const response = await api.post('/profile/renew-subscription', { paymentReference });
      return response.data;
    } catch (error) {
      console.error('Renew subscription error:', error);
      throw error;
    }
  },

  calculateUpgradeBenefits: async (targetTier) => {
    try {
      const response = await api.get('/profile/upgrade-benefits', { params: { targetTier } });
      return response.data;
    } catch (error) {
      console.error('Calculate upgrade benefits error:', error);
      throw error;
    }
  },
};

export default profileService;
