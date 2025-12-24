// backend/routes/kyc.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const kycController = require('../controllers/kyc.controller');

// Protected routes (require authentication)
router.post('/initiate', authenticate, kycController.initiateKYC);
router.get('/status', authenticate, kycController.getKYCStatus);

// Webhook routes (no authentication - DiDIT will call these)
router.post('/webhooks/didit/individual/:userId', kycController.handleIndividualKYCWebhook);
router.post('/webhooks/didit/business/:userId', kycController.handleBusinessKYCWebhook);

module.exports = router;
