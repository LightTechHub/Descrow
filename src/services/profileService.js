// File: src/services/profileService.js - FIXED & COMPLETE
import api from '../config/api';

const API_URL = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';

const profileService = {
  // Get profile
  getProfile: async () => {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // Get KYC Status
  getKYCStatus: async () => {
    try {
      const response = await api.get('/users/profile');
      
      if (response.data.success) {
        const kycData = response.data.data?.user?.kycStatus || {};
        return {
          success: true,
          data: {
            status: kycData.status || 'unverified',
            tier: kycData.tier || 'basic',
            submittedAt: kycData.submittedAt,
            reviewedAt: kycData.reviewedAt,
            rejectionReason: kycData.rejectionReason,
            resubmissionAllowed: kycData.resubmissionAllowed,
            personalInfo: kycData.personalInfo || {},
            businessInfo: kycData.businessInfo || {},
            approvedBy: kycData.approvedBy,
            isKYCVerified: response.data.data?.user?.isKYCVerified || false,
            documents: kycData.documents || []
          }
        };
      }
      
      return {
        success: true,
        data: {
          status: 'unverified',
          tier: 'basic',
          isKYCVerified: false,
          documents: []
        }
      };
      
    } catch (error) {
      console.error('Get KYC status error:', error);
      return {
        success: false,
        data: {
          status: 'unverified',
          tier: 'basic',
          isKYCVerified: false,
          documents: []
        },
        error: error.message
      };
    }
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      const response = await api.put('/profile', data);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  },

  // KYC Methods
  startKYCVerification: async () => {
    try {
      const response = await api.post('/users/kyc/start');
      return response.data;
    } catch (error) {
      console.error('Start KYC error:', error);
      throw error;
    }
  },

  checkKYCStatus: async () => {
    try {
      const response = await api.get('/users/kyc/status');
      return response.data;
    } catch (error) {
      console.error('Check KYC status error:', error);
      throw error;
    }
  },

  resetKYCVerification: async () => {
    try {
      const response = await api.post('/users/kyc/reset');
      return response.data;
    } catch (error) {
      console.error('Reset KYC error:', error);
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

  // Tier Methods
  getTierInfo: async () => {
    try {
      const response = await api.get('/profile/tier-info');
      return response.data;
    } catch (error) {
      console.error('Get tier info error:', error);
      throw error;
    }
  },

  calculateUpgradeBenefits: async (targetTier) => {
    try {
      const response = await api.get('/profile/upgrade-benefits', {
        params: { targetTier }
      });
      return response.data;
    } catch (error) {
      console.error('Calculate upgrade benefits error:', error);
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

  // Statistics
  getUserStatistics: async () => {
    try {
      const response = await api.get('/profile/statistics');
      return response.data;
    } catch (error) {
      console.error('Get user statistics error:', error);
      throw error;
    }
  },

  // 2FA Methods
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

  // Password & Account
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/profile/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  deleteAccount: async (password, reason) => {
    try {
      const response = await api.post('/profile/delete-account', {
        password,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  },

  // Bank Account Methods
  getBankAccounts: async () => {
    try {
      const response = await api.get('/bank/list');
      return response.data;
    } catch (error) {
      console.error('Get bank accounts error:', error);
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

  // Wallet & Transactions
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

  withdrawFunds: async (withdrawalData) => {
    try {
      const response = await api.post('/profile/withdraw', withdrawalData);
      return response.data;
    } catch (error) {
      console.error('Withdraw funds error:', error);
      throw error;
    }
  },

  // Escrow & Disputes
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

  // Security Settings
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

  // API Keys
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
  }
};

export default profileService;