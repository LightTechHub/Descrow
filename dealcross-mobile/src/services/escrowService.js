// src/services/escrowService.js
import API from '../utils/api';

const escrowService = {
  getMyEscrows: async (params = {}) => {
    const res = await API.get('/escrow/my-escrows', { params });
    return res.data;
  },

  getEscrowById: async (id) => {
    const res = await API.get(`/escrow/${id}`);
    return res.data;
  },

  createEscrow: async (data) => {
    const res = await API.post('/escrow/create', data);
    return res.data;
  },

  acceptEscrow: async (id) => {
    const res = await API.put(`/escrow/${id}/accept`);
    return res.data;
  },

  confirmDelivery: async (id) => {
    const res = await API.put(`/escrow/${id}/confirm`);
    return res.data;
  },

  cancelEscrow: async (id, reason) => {
    const res = await API.put(`/escrow/${id}/cancel`, { reason });
    return res.data;
  },

  fundFromWallet: async (id) => {
    const res = await API.post(`/escrow/${id}/fund-from-wallet`);
    return res.data;
  },

  getStats: async () => {
    const res = await API.get('/escrow/stats');
    return res.data;
  },
};

export default escrowService;
