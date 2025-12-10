// File: src/services/profileService.js - FIXED WITH REQUEST DEDUPLICATION
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

// 🚨 REQUEST CACHE - Prevents duplicate API calls
const REQUEST_CACHE = {
  profile: { promise: null, data: null, timestamp: 0 },
  kycStatus: { promise: null, data: null, timestamp: 0 },
  bankAccounts: { promise: null, data: null, timestamp: 0 }
};

const CACHE_DURATION = 5000; // 5 seconds cache

// Helper function to handle cached requests
const cachedRequest = async (cacheKey, requestFn) => {
  const now = Date.now();
  const cache = REQUEST_CACHE[cacheKey];

  // Return cached data if fresh
  if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
    console.log(`✅ Using cached ${cacheKey} data`);
    return cache.data;
  }

  // Return existing promise if request in flight
  if (cache.promise) {
    console.log(`⏸️ ${cacheKey} request already in flight, waiting...`);
    return cache.promise;
  }

  // Make new request
  console.log(`🔄 Making new ${cacheKey} request`);
  cache.promise = requestFn()
    .then(response => {
      cache.data = response;
      cache.timestamp = now;
      cache.promise = null;
      return response;
    })
    .catch(error => {
      cache.promise = null;
      throw error;
    });

  return cache.promise;
};

const profileService = {
  // Clear cache - useful for manual refresh
  clearCache: () => {
    console.log('🧹 Clearing profile cache');
    REQUEST_CACHE.profile = { promise: null, data: null, timestamp: 0 };
    REQUEST_CACHE.kycStatus = { promise: null, data: null, timestamp: 0 };
    REQUEST_CACHE.bankAccounts = { promise: null, data: null, timestamp: 0 };
  },

  // Get profile - WITH CACHING
  getProfile: async () => {
    return cachedRequest('profile', async () => {
      const response = await axios.get(
        `${API_URL}/profile`,
        getAuthHeaders()
      );
      return response.data;
    });
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await axios.put(
      `${API_URL}/profile`,
      data,
      getAuthHeaders()
    );
    // Clear cache after update
    REQUEST_CACHE.profile = { promise: null, data: null, timestamp: 0 };
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
    // Clear cache after avatar update
    REQUEST_CACHE.profile = { promise: null, data: null, timestamp: 0 };
    return response.data;
  },

  // ✅ Start KYC Verification
  startKYCVerification: async () => {
    const response = await axios.post(
      `${API_URL}/users/kyc/start`,
      {},
      getAuthHeaders()
    );
    // Clear KYC cache after starting verification
    REQUEST_CACHE.kycStatus = { promise: null, data: null, timestamp: 0 };
    return response.data;
  },

  // ✅ Check KYC Status
  checkKYCStatus: async () => {
    const response = await axios.get(
      `${API_URL}/users/kyc/status`,
      getAuthHeaders()
    );
    return response.data;
  },

  // ✅ Submit KYC
  submitKYC: async (kycData) => {
    const response = await axios.post(
      `${API_URL}/users/upload-kyc`,
      kycData,
      getAuthHeaders()
    );
    // Clear KYC cache after submission
    REQUEST_CACHE.kycStatus = { promise: null, data: null, timestamp: 0 };
    return response.data;
  },

  // ✅ Get KYC Status - WITH CACHING
  getKYCStatus: async () => {
    return cachedRequest('kycStatus', async () => {
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

  // Get Tier Information
  getTierInfo: async () => {
    const response = await axios.get(
      `${API_URL}/profile/tier-info`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Calculate Upgrade Benefits
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

  // Initialize Tier Upgrade Payment
  initiateTierUpgrade: async (upgradeData) => {
    const response = await axios.post(
      `${API_URL}/profile/initiate-upgrade`,
      upgradeData,
      getAuthHeaders()
    );
    return response.data;
  },

  // Complete Tier Upgrade
  completeTierUpgrade: async (paymentData) => {
    const response = await axios.post(
      `${API_URL}/profile/complete-upgrade`,
      paymentData,
      getAuthHeaders()
    );
    // Clear profile cache after upgrade
    REQUEST_CACHE.profile = { promise: null, data: null, timestamp: 0 };
    REQUEST_CACHE.kycStatus = { promise: null, data: null, timestamp: 0 };
    return response.data;
  },

  // Cancel Subscription
  cancelSubscription: async () => {
    const response = await axios.post(
      `${API_URL}/profile/cancel-subscription`,
      {},
      getAuthHeaders()
    );
    // Clear profile cache
    REQUEST_CACHE.profile = { promise: null, data: null, timestamp: 0 };
    return response.data;
  },

  // Renew Subscription
  renewSubscription: async (paymentReference) => {
    const response = await axios.post(
      `${API_URL}/profile/renew-subscription`,
      { paymentReference },
      getAuthHeaders()
    );
    // Clear profile cache
    REQUEST_CACHE.profile = { promise: null, data: null, timestamp: 0 };
    return response.data;
  },

  // Get User Statistics
  getUserStatistics: async () => {
    const response = await axios.get(
      `${API_URL}/profile/statistics`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Enable 2FA
  enable2FA: async () => {
    const response = await axios.post(
      `${API_URL}/profile/enable-2fa`,
      {},
      getAuthHeaders()
    );
    return response.data;
  },

  // Verify 2FA Token
  verify2FA: async (token) => {
    const response = await axios.post(
      `${API_URL}/profile/verify-2fa`,
      { token },
      getAuthHeaders()
    );
    return response.data;
  },

  // Disable 2FA
  disable2FA: async (password) => {
    const response = await axios.post(
      `${API_URL}/profile/disable-2fa`,
      { password },
      getAuthHeaders()
    );
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await axios.post(
      `${API_URL}/profile/change-password`,
      { currentPassword, newPassword },
      getAuthHeaders()
    );
    return response.data;
  },

  // Delete account
  deleteAccount: async (password, reason) => {
    const response = await axios.post(
      `${API_URL}/profile/delete-account`,
      { password, reason },
      getAuthHeaders()
    );
    return response.data;
  },

  // ==================== BANK ACCOUNT METHODS ====================

  // Get user's bank accounts - WITH CACHING
  getBankAccounts: async () => {
    return cachedRequest('bankAccounts', async () => {
      const response = await axios.get(
        `${API_URL}/bank/list`,
        getAuthHeaders()
      );
      return response.data;
    });
  },

  // Get banks list
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

  // Add bank account
  addBankAccount: async (data) => {
    const response = await axios.post(
      `${API_URL}/bank/add`,
      data,
      getAuthHeaders()
    );
    // Clear bank accounts cache
    REQUEST_CACHE.bankAccounts = { promise: null, data: null, timestamp: 0 };
    return response.data;
  },

  // Delete bank account
  deleteBankAccount: async (accountId) => {
    const response = await axios.delete(
      `${API_URL}/bank/${accountId}`,
      getAuthHeaders()
    );
    // Clear bank accounts cache
    REQUEST_CACHE.bankAccounts = { promise: null, data: null, timestamp: 0 };
    return response.data;
  },

  // Set primary bank account
  setPrimaryBankAccount: async (accountId) => {
    const response = await axios.put(
      `${API_URL}/bank/primary/${accountId}`,
      {},
      getAuthHeaders()
    );
    // Clear bank accounts cache
    REQUEST_CACHE.bankAccounts = { promise: null, data: null, timestamp: 0 };
    return response.data;
  },

  // Validate bank account
  validateBankAccount: async (data) => {
    const response = await axios.post(
      `${API_URL}/bank/validate`,
      data,
      getAuthHeaders()
    );
    return response.data;
  },

  // Get user's wallet balance
  getWalletBalance: async () => {
    const response = await axios.get(
      `${API_URL}/profile/wallet`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Get user's transaction history
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

  // Withdraw funds
  withdrawFunds: async (withdrawalData) => {
    const response = await axios.post(
      `${API_URL}/profile/withdraw`,
      withdrawalData,
      getAuthHeaders()
    );
    return response.data;
  },

  // Get user's escrow stats
  getEscrowStats: async () => {
    const response = await axios.get(
      `${API_URL}/profile/escrow-stats`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Get user's dispute history
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

  // Get user's security settings
  getSecuritySettings: async () => {
    const response = await axios.get(
      `${API_URL}/profile/security-settings`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Update security settings
  updateSecuritySettings: async (settings) => {
    const response = await axios.put(
      `${API_URL}/profile/security-settings`,
      settings,
      getAuthHeaders()
    );
    return response.data;
  },

  // Get user's API keys
  getAPIKeys: async () => {
    const response = await axios.get(
      `${API_URL}/profile/api-keys`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Create API key
  createAPIKey: async (keyData) => {
    const response = await axios.post(
      `${API_URL}/profile/api-keys`,
      keyData,
      getAuthHeaders()
    );
    return response.data;
  },

  // Delete API key
  deleteAPIKey: async (keyId) => {
    const response = await axios.delete(
      `${API_URL}/profile/api-keys/${keyId}`,
      getAuthHeaders()
    );
    return response.data;
  }
};

export default profileService;