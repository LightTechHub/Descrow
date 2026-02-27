import api from '../config/api';

const profileService = {

  getProfile: async () => {
    try {
      const response = await api.get('/profile');
      let userData = {};
      if (response.data?.data?.user)  userData = response.data.data.user;
      else if (response.data?.data)   userData = response.data.data;
      else if (response.data?.user)   userData = response.data.user;
      else                            userData = response.data;
      return { success: true, data: userData };
    } catch (error) {
      console.error('Get profile error:', error);
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (localUser?.email) return { success: true, data: localUser };
      throw error;
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await api.put('/profile', data);
      if (response.data.success) {
        // Deep merge so nested fields like address.country are preserved
        const current = JSON.parse(localStorage.getItem('user') || '{}');
        const fresh   = response.data.data || {};
        const merged  = {
          ...current,
          ...fresh,
          address:      { ...(current.address      || {}), ...(fresh.address      || {}) },
          businessInfo: { ...(current.businessInfo || {}), ...(fresh.businessInfo || {}) },
        };
        localStorage.setItem('user', JSON.stringify(merged));
      }
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        const avatarPath = response.data.data?.profilePicture || response.data.data?.avatarUrl;
        if (avatarPath) {
          const current = JSON.parse(localStorage.getItem('user') || '{}');
          current.profilePicture = avatarPath;
          localStorage.setItem('user', JSON.stringify(current));
        }
      }
      return response.data;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  },

  getKYCStatus: async () => {
    try {
      const response = await api.get('/profile');
      if (response.data.success) {
        const userData = response.data.data?.user || response.data.data;
        const kycData  = userData?.kycStatus || {};
        return {
          success: true,
          data: {
            status:          kycData.status          || 'unverified',
            tier:            kycData.tier            || 'basic',
            submittedAt:     kycData.submittedAt,
            reviewedAt:      kycData.reviewedAt,
            rejectionReason: kycData.rejectionReason,
            personalInfo:    kycData.personalInfo    || {},
            businessInfo:    kycData.businessInfo    || userData?.businessInfo || {},
            isKYCVerified:   userData?.isKYCVerified || false,
            documents:       kycData.documents       || [],
          },
        };
      }
      return { success: true, data: { status: 'unverified', tier: 'basic', isKYCVerified: false, documents: [] } };
    } catch (error) {
      console.error('Get KYC status error:', error);
      return { success: false, data: { status: 'unverified', tier: 'basic', isKYCVerified: false, documents: [] } };
    }
  },

  startKYCVerification: async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await api.post('/kyc/initiate', {
        accountType:  user?.accountType  || 'individual',
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

  // NEW: Manual business document upload for KYCTab
  uploadBusinessDocuments: async (formData) => {
    try {
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

  getBankAccounts: async () => {
    try { return (await api.get('/bank/list')).data; }
    catch (error) { console.error('Get bank accounts error:', error); throw error; }
  },

  addBankAccount: async (data) => {
    try { return (await api.post('/bank/add', data)).data; }
    catch (error) { console.error('Add bank account error:', error); throw error; }
  },

  deleteBankAccount: async (accountId) => {
    try { return (await api.delete(`/bank/${accountId}`)).data; }
    catch (error) { console.error('Delete bank account error:', error); throw error; }
  },

  setPrimaryBankAccount: async (accountId) => {
    try { return (await api.put(`/bank/primary/${accountId}`)).data; }
    catch (error) { console.error('Set primary bank account error:', error); throw error; }
  },

  validateBankAccount: async (data) => {
    try { return (await api.post('/bank/validate', data)).data; }
    catch (error) { console.error('Validate bank account error:', error); throw error; }
  },

  getBanks: async (params = {}) => {
    try { return (await api.get('/bank/banks', { params })).data; }
    catch (error) { console.error('Get banks error:', error); throw error; }
  },

  changePassword: async (currentPassword, newPassword) => {
    try { return (await api.post('/profile/change-password', { currentPassword, newPassword })).data; }
    catch (error) { console.error('Change password error:', error); throw error; }
  },

  setPassword: async (newPassword, confirmPassword) => {
    try { return (await api.post('/auth/set-password', { newPassword, confirmPassword })).data; }
    catch (error) { console.error('Set password error:', error); throw error; }
  },

  checkPasswordStatus: async () => {
    try { return (await api.get('/auth/password-status')).data; }
    catch (error) { console.error('Check password status error:', error); throw error; }
  },

  deleteAccount: async (password, reason) => {
    try { return (await api.post('/profile/delete-account', { password, reason })).data; }
    catch (error) { console.error('Delete account error:', error); throw error; }
  },

  enable2FA: async () => {
    try { return (await api.post('/profile/enable-2fa')).data; }
    catch (error) { console.error('Enable 2FA error:', error); throw error; }
  },

  verify2FA: async (token) => {
    try { return (await api.post('/profile/verify-2fa', { token })).data; }
    catch (error) { console.error('Verify 2FA error:', error); throw error; }
  },

  disable2FA: async (password) => {
    try { return (await api.post('/profile/disable-2fa', { password })).data; }
    catch (error) { console.error('Disable 2FA error:', error); throw error; }
  },

  getSecuritySettings: async () => {
    try { return (await api.get('/profile/security-settings')).data; }
    catch (error) { console.error('Get security settings error:', error); throw error; }
  },

  updateSecuritySettings: async (settings) => {
    try { return (await api.put('/profile/security-settings', settings)).data; }
    catch (error) { console.error('Update security settings error:', error); throw error; }
  },

  getTierInfo: async () => {
    try { return (await api.get('/profile/tier-info')).data; }
    catch (error) { console.error('Get tier info error:', error); throw error; }
  },

  getWalletBalance: async () => {
    try { return (await api.get('/profile/wallet')).data; }
    catch (error) { console.error('Get wallet balance error:', error); throw error; }
  },

  getTransactionHistory: async (params = {}) => {
    try { return (await api.get('/profile/transactions', { params })).data; }
    catch (error) { console.error('Get transaction history error:', error); throw error; }
  },

  getEscrowStats: async () => {
    try { return (await api.get('/profile/escrow-stats')).data; }
    catch (error) { console.error('Get escrow stats error:', error); throw error; }
  },

  getDisputeHistory: async (params = {}) => {
    try { return (await api.get('/profile/disputes', { params })).data; }
    catch (error) { console.error('Get dispute history error:', error); throw error; }
  },

  getUserStatistics: async () => {
    try { return (await api.get('/profile/statistics')).data; }
    catch (error) { console.error('Get user statistics error:', error); throw error; }
  },

  getAPIKeys: async () => {
    try { return (await api.get('/profile/api-keys')).data; }
    catch (error) { console.error('Get API keys error:', error); throw error; }
  },

  createAPIKey: async (keyData) => {
    try { return (await api.post('/profile/api-keys', keyData)).data; }
    catch (error) { console.error('Create API key error:', error); throw error; }
  },

  deleteAPIKey: async (keyId) => {
    try { return (await api.delete(`/profile/api-keys/${keyId}`)).data; }
    catch (error) { console.error('Delete API key error:', error); throw error; }
  },

  withdrawFunds: async (withdrawalData) => {
    try { return (await api.post('/profile/withdraw', withdrawalData)).data; }
    catch (error) { console.error('Withdraw funds error:', error); throw error; }
  },

  initiateTierUpgrade: async (upgradeData) => {
    try { return (await api.post('/profile/initiate-upgrade', upgradeData)).data; }
    catch (error) { console.error('Initiate tier upgrade error:', error); throw error; }
  },

  completeTierUpgrade: async (paymentData) => {
    try { return (await api.post('/profile/complete-upgrade', paymentData)).data; }
    catch (error) { console.error('Complete tier upgrade error:', error); throw error; }
  },

  cancelSubscription: async () => {
    try { return (await api.post('/profile/cancel-subscription')).data; }
    catch (error) { console.error('Cancel subscription error:', error); throw error; }
  },

  renewSubscription: async (paymentReference) => {
    try { return (await api.post('/profile/renew-subscription', { paymentReference })).data; }
    catch (error) { console.error('Renew subscription error:', error); throw error; }
  },

  calculateUpgradeBenefits: async (targetTier) => {
    try { return (await api.get('/profile/upgrade-benefits', { params: { targetTier } })).data; }
    catch (error) { console.error('Calculate upgrade benefits error:', error); throw error; }
  },
};

export default profileService;
