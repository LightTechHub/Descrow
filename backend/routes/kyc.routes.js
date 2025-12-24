// backend/routes/kyc.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const kycController = require('../controllers/kyc.controller');

// ==================== USER ROUTES (Protected) ====================
router.post('/initiate', authenticate, kycController.initiateKYC);
router.get('/status', authenticate, kycController.getKYCStatus);
router.post('/retry', authenticate, kycController.retryKYC);

// ==================== WEBHOOK ROUTES (Public) ====================
// DiDIT will call this endpoint
router.post('/webhooks/didit', kycController.handleDiditWebhook);

// ==================== ADMIN ROUTES ====================
// TODO: Add admin authentication middleware
router.post('/admin/approve/:userId', authenticate, kycController.adminApproveKYC);
router.post('/admin/reject/:userId', authenticate, kycController.adminRejectKYC);

module.exports = router;