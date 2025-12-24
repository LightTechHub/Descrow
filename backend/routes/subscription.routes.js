// backend/routes/subscription.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const subscriptionController = require('../controllers/subscription.controller');

// All routes require authentication
router.use(authenticate);

// Get all available tiers
router.get('/tiers', subscriptionController.getTiers);

// Get current subscription
router.get('/current', subscriptionController.getCurrentSubscription);

// Calculate upgrade cost
router.post('/calculate-upgrade', subscriptionController.calculateUpgrade);

// Initiate upgrade (creates payment)
router.post('/upgrade', subscriptionController.initiateUpgrade);

// Verify payment and complete upgrade
router.get('/verify/:reference', subscriptionController.verifyPayment);

// Cancel subscription
router.post('/cancel', subscriptionController.cancelSubscription);

module.exports = router;
