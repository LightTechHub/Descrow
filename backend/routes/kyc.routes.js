// backend/routes/kyc.routes.js - FINAL WORKING VERSION
const express = require('express');
const router = express.Router();
const { authenticate, adminAuth } = require('../middleware/auth.middleware');
const kycController = require('../controllers/kyc.controller');

// ==================== USER ROUTES (Protected) ====================
router.post('/initiate', authenticate, kycController.initiateKYC);
router.post('/upload-business-documents', authenticate, kycController.uploadBusinessDocuments);
router.get('/status', authenticate, kycController.getKYCStatus);
router.post('/retry', authenticate, kycController.retryKYC);
router.get('/documents/:filename', authenticate, kycController.serveDocument); // Added

// ==================== WEBHOOK ROUTES (Public) ====================
router.post('/webhooks/didit', kycController.handleDiditWebhook);

// ==================== ADMIN ROUTES (Protected) ====================
// Get pending business KYC reviews
router.get('/admin/pending-business', adminAuth, kycController.adminGetPendingBusinessKYCs);

// Get specific business KYC details
router.get('/admin/business/:userId', adminAuth, kycController.adminGetBusinessKYCDetails);

// Approve KYC (works for both individual AND business)
router.post('/admin/approve/:userId', adminAuth, kycController.adminApproveKYC);

// Reject KYC (works for both individual AND business)  
router.post('/admin/reject/:userId', adminAuth, kycController.adminRejectKYC);

module.exports = router;