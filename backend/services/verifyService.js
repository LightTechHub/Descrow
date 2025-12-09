// src/services/verifyService.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const verifyService = {
  verifyEmail: async (token) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email/${token}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: 'Verification failed' };
    }
  },
  
  verifyKYC: async (userId, kycData) => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}/kyc`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(kycData)
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: 'KYC submission failed' };
    }
  }
};

export default verifyService;
