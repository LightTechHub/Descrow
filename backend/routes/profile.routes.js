// backend/routes/profile.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const profileController = require('../controllers/profile.controller');
const { uploadAvatar } = require('../middleware/upload.middleware'); // ✅ ADD THIS

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.post('/avatar', uploadAvatar, profileController.uploadAvatar); // ✅ UPDATED - Added uploadAvatar middleware

// KYC routes
router.post('/kyc', profileController.submitKYC);
router.get('/kyc/status', profileController.getKYCStatus);

// Security routes
router.post('/change-password', profileController.changePassword);
router.post('/delete-account', profileController.deleteAccount);

module.exports = router;