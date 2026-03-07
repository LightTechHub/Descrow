// backend/routes/kyc.routes.js - FINAL WORKING VERSION
const express = require('express');
const router = express.Router();
const { authenticate, adminAuth } = require('../middleware/auth.middleware');
const kycController = require('../controllers/kyc.controller');

// ==================== DIDIT REDIRECT CATCH-ALL (Public) ====================
// DiDIT v3 appends the redirect path onto the callback URL, producing:
// /api/kyc/webhooks/dealcross.net/kyc?status=...&session=...
// This route catches that and forwards the user to the correct frontend page.
router.get('/webhooks/*', (req, res) => {
  const frontendUrl = 'https://dealcross.net';
  const { status, session } = req.query;

  // If it's the real DiDIT webhook redirect (not the standard /webhooks/didit)
  // forward to frontend KYC page
  const path = req.path;
  if (path !== '/webhooks/didit') {
    console.log('⚠️  Caught malformed DiDIT redirect:', path, req.query);
    const safeStatus  = encodeURIComponent(status  || 'in_review');
    const safeSession = encodeURIComponent(session || '');
    return res.redirect(`${frontendUrl}/kyc?status=${safeStatus}&session=${safeSession}`);
  }

  // Otherwise fall through to next matching route
  return kycController.handleDiditWebhookRedirect(req, res);
});

// ==================== WEBHOOK ROUTES (Public) ====================
router.post('/webhooks/didit', kycController.handleDiditWebhook);
router.get('/webhooks/didit', kycController.handleDiditWebhookRedirect);

// ==================== USER ROUTES (Protected) ====================
router.post('/initiate', authenticate, kycController.initiateKYC);
router.post('/upload-business-documents', authenticate, kycController.uploadBusinessDocuments);
router.get('/status', authenticate, kycController.getKYCStatus);
router.post('/retry', authenticate, kycController.retryKYC);
router.get('/documents/:filename', authenticate, kycController.serveDocument);

// ==================== ADMIN ROUTES (Protected) ====================
router.get('/admin/pending-business', adminAuth, kycController.adminGetPendingBusinessKYCs);
router.get('/admin/business/:userId', adminAuth, kycController.adminGetBusinessKYCDetails);
router.post('/admin/approve/:userId', adminAuth, kycController.adminApproveKYC);
router.post('/admin/reject/:userId', adminAuth, kycController.adminRejectKYC);

module.exports = router;