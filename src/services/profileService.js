// File: src/services/profileService.js - WITH TRACKING

import axios from 'axios';
import { apiTracker } from '../utils/apiCallTracker';

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

const profileService = {
  // Get profile - WITH BLOCKING
  getProfile: async () => {
    apiTracker.logCall('/profile', 'profileService.getProfile');
    
    return apiTracker.blockDuplicate('/profile', async () => {
      const response = await axios.get(
        `${API_URL}/profile`,
        getAuthHeaders()
      );
      return response.data;
    });
  },

  // Get KYC Status - WITH BLOCKING
  getKYCStatus: async () => {
    apiTracker.logCall('/users/profile', 'profileService.getKYCStatus');
    
    return apiTracker.blockDuplicate('/users/profile-kyc', async () => {
      try {
        const response = await axios.get(
          `${API_URL}/users/profile`,
          getAuthHeaders()
        );
        
        if (response.data.success) {
          return {
            success: true,
            data: {
              status: response.data.data?.user?.kycStatus?.status || 'unverified',
              tier: response.data.data?.user?.kycStatus?.tier || 'basic',
              submittedAt: response.data.data?.user?.kycStatus?.submittedAt,
              reviewedAt: response.data.data?.user?.kycStatus?.reviewedAt,
              rejectionReason: response.data.data?.user?.kycStatus?.rejectionReason,
              resubmissionAllowed: response.data.data?.user?.kycStatus?.resubmissionAllowed,
              personalInfo: response.data.data?.user?.kycStatus?.personalInfo,
              businessInfo: response.data.data?.user?.kycStatus?.businessInfo,
              approvedBy: response.data.data?.user?.kycStatus?.approvedBy,
              isKYCVerified: response.data.data?.user?.isKYCVerified || false
            }
          };
        }
        
        return {
          success: true,
          data: {
            status: 'unverified',
            tier: 'basic',
            isKYCVerified: false
          }
        };
        
      } catch (error) {
        console.error('Get KYC status error:', error);
        
        return {
          success: false,
          data: {
            status: 'unverified',
            tier: 'basic',
            isKYCVerified: false
          },
          error: error.message
        };
      }
    });
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await axios.put(
      `${API_URL}/profile`,
      data,
      getAuthHeaders()
    );
    return response.data;
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/profile/avatar`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  startKYCVerification: async () => {
    const response = await axios.post(
      `${API_URL}/users/kyc/start`,
      {},
      getAuthHeaders()
    );
    return response.data;
  },

  checkKYCStatus: async () => {
    const response = await axios.get(
      `${API_URL}/users/kyc/status`,
      getAuthHeaders()
    );
    return response.data;
  },

  // 🔥 NEW: Reset KYC Verification
  resetKYCVerification: async () => {
    const response = await axios.post(
      `${API_URL}/users/kyc/reset`,
      {},
      getAuthHeaders()
    );
    return response.data;
  },

  submitKYC: async (kycData) => {
    const response = await axios.post(
      `${API_URL}/users/upload-kyc`,
      kycData,
      getAuthHeaders()
    );
    return response.data;
  },

  getTierInfo: async () => {
    const response = await axios.get(
      `${API_URL}/profile/tier-info`,
      getAuthHeaders()
    );
    return response.data;
  },

  calculateUpgradeBenefits: async (targetTier) => {
    const response = await axios.get(
      `${API_URL}/profile/upgrade-benefits`,
      {
        ...getAuthHeaders(),
        params: { targetTier }
      }
    );
    return response.data;
  },

  initiateTierUpgrade: async (upgradeData) => {
    const response = await axios.post(
      `${API_URL}/profile/initiate-upgrade`,
      upgradeData,
      getAuthHeaders()
    );
    return response.data;
  },

  completeTierUpgrade: async (paymentData) => {
    const response = await axios.post(
      `${API_URL}/profile/complete-upgrade`,
      paymentData,
      getAuthHeaders()
    );
    return response.data;
  },

  cancelSubscription: async () => {
    const response = await axios.post(
      `${API_URL}/profile/cancel-subscription`,
      {},
      getAuthHeaders()
    );
    return response.data;
  },

  renewSubscription: async (paymentReference) => {
    const response = await axios.post(
      `${API_URL}/profile/renew-subscription`,
      { paymentReference },
      getAuthHeaders()
    );
    return response.data;
  },

  getUserStatistics: async () => {
    const response = await axios.get(
      `${API_URL}/profile/statistics`,
      getAuthHeaders()
    );
    return response.data;
  },

  enable2FA: async () => {
    const response = await axios.post(
      `${API_URL}/profile/enable-2fa`,
      {},
      getAuthHeaders()
    );
    return response.data;
  },

  verify2FA: async (token) => {
    const response = await axios.post(
      `${API_URL}/profile/verify-2fa`,
      { token },
      getAuthHeaders()
    );
    return response.data;
  },

  disable2FA: async (password) => {
    const response = await axios.post(
      `${API_URL}/profile/disable-2fa`,
      { password },
      getAuthHeaders()
    );
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await axios.post(
      `${API_URL}/profile/change-password`,
      { currentPassword, newPassword },
      getAuthHeaders()
    );
    return response.data;
  },

  deleteAccount: async (password, reason) => {
    const response = await axios.post(
      `${API_URL}/profile/delete-account`,
      { password, reason },
      getAuthHeaders()
    );
    return response.data;
  },

  // Bank account methods
  getBankAccounts: async () => {
    apiTracker.logCall('/bank/list', 'profileService.getBankAccounts');
    
    return apiTracker.blockDuplicate('/bank/list', async () => {
      const response = await axios.get(
        `${API_URL}/bank/list`,
        getAuthHeaders()
      );
      return response.data;
    });
  },

  getBanks: async (params = {}) => {
    const response = await axios.get(
      `${API_URL}/bank/banks`,
      {
        ...getAuthHeaders(),
        params
      }
    );
    return response.data;
  },

  addBankAccount: async (data) => {
    const response = await axios.post(
      `${API_URL}/bank/add`,
      data,
      getAuthHeaders()
    );
    return response.data;
  },

  deleteBankAccount: async (accountId) => {
    const response = await axios.delete(
      `${API_URL}/bank/${accountId}`,
      getAuthHeaders()
    );
    return response.data;
  },

  setPrimaryBankAccount: async (accountId) => {
    const response = await axios.put(
      `${API_URL}/bank/primary/${accountId}`,
      {},
      getAuthHeaders()
    );
    return response.data;
  },

  validateBankAccount: async (data) => {
    const response = await axios.post(
      `${API_URL}/bank/validate`,
      data,
      getAuthHeaders()
    );
    return response.data;
  },

  getWalletBalance: async () => {
    const response = await axios.get(
      `${API_URL}/profile/wallet`,
      getAuthHeaders()
    );
    return response.data;
  },

  getTransactionHistory: async (params = {}) => {
    const response = await axios.get(
      `${API_URL}/profile/transactions`,
      {
        ...getAuthHeaders(),
        params
      }
    );
    return response.data;
  },

  withdrawFunds: async (withdrawalData) => {
    const response = await axios.post(
      `${API_URL}/profile/withdraw`,
      withdrawalData,
      getAuthHeaders()
    );
    return response.data;
  },

  getEscrowStats: async () => {
    const response = await axios.get(
      `${API_URL}/profile/escrow-stats`,
      getAuthHeaders()
    );
    return response.data;
  },

  getDisputeHistory: async (params = {}) => {
    const response = await axios.get(
      `${API_URL}/profile/disputes`,
      {
        ...getAuthHeaders(),
        params
      }
    );
    return response.data;
  },

  getSecuritySettings: async () => {
    const response = await axios.get(
      `${API_URL}/profile/security-settings`,
      getAuthHeaders()
    );
    return response.data;
  },

  updateSecuritySettings: async (settings) => {
    const response = await axios.put(
      `${API_URL}/profile/security-settings`,
      settings,
      getAuthHeaders()
    );
    return response.data;
  },

  getAPIKeys: async () => {
    const response = await axios.get(
      `${API_URL}/profile/api-keys`,
      getAuthHeaders()
    );
    return response.data;
  },

  createAPIKey: async (keyData) => {
    const response = await axios.post(
      `${API_URL}/profile/api-keys`,
      keyData,
      getAuthHeaders()
    );
    return response.data;
  },

  deleteAPIKey: async (keyId) => {
    const response = await axios.delete(
      `${API_URL}/profile/api-keys/${keyId}`,
      getAuthHeaders()
    );
    return response.data;
  }
};

export default profileService;