// backend/routes/api.v1.routes.js
const express = require('express');
const router = express.Router();
const { authenticateApiKey, checkPermission, apiRateLimiter } = require('../middleware/apiAuth');
const Escrow = require('../models/Escrow.model');

// Apply authentication and rate limiting to all routes
router.use(authenticateApiKey);
router.use(apiRateLimiter);

// ==================== CREATE ESCROW ====================
router.post('/escrow/create', checkPermission('createEscrow'), async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      currency,
      category,
      buyerEmail,
      sellerEmail,
      metadata
    } = req.body;

    // Validation
    if (!title || !amount || !buyerEmail || !sellerEmail) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: title, amount, buyerEmail, sellerEmail'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Amount must be greater than 0'
      });
    }

    // Create escrow
    const escrow = await Escrow.create({
      title,
      description,
      amount,
      currency: currency || 'USD',
      category: category || 'general',
      buyer: { email: buyerEmail },
      seller: { email: sellerEmail },
      status: 'pending',
      createdViaAPI: true,
      apiKeyId: req.apiKey._id,
      metadata: metadata || {}
    });

    // Send webhook if configured
    if (req.apiKey.webhookUrl) {
      sendWebhook(req.apiKey.webhookUrl, {
        event: 'escrow.created',
        data: escrow
      });
    }

    res.status(201).json({
      success: true,
      data: {
        escrowId: escrow._id,
        escrowRef: escrow.escrowId,
        status: escrow.status,
        amount: escrow.amount,
        currency: escrow.currency,
        createdAt: escrow.createdAt
      }
    });

  } catch (error) {
    console.error('Create Escrow API Error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to create escrow'
    });
  }
});

// ==================== GET ESCROW DETAILS ====================
router.get('/escrow/:id', checkPermission('viewEscrow'), async (req, res) => {
  try {
    const escrow = await Escrow.findOne({
      _id: req.params.id,
      apiKeyId: req.apiKey._id
    });

    if (!escrow) {
      return res.status(404).json({
        success: false,
        error: 'ESCROW_NOT_FOUND',
        message: 'Escrow not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        escrowId: escrow._id,
        escrowRef: escrow.escrowId,
        title: escrow.title,
        description: escrow.description,
        amount: escrow.amount,
        currency: escrow.currency,
        status: escrow.status,
        buyer: escrow.buyer.email,
        seller: escrow.seller.email,
        payment: escrow.payment,
        delivery: escrow.delivery,
        timeline: escrow.timeline,
        createdAt: escrow.createdAt,
        updatedAt: escrow.updatedAt
      }
    });

  } catch (error) {
    console.error('Get Escrow API Error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve escrow'
    });
  }
});

// ==================== LIST ESCROWS ====================
router.get('/escrows', checkPermission('viewEscrow'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = { apiKeyId: req.apiKey._id };
    if (status) query.status = status;

    const escrows = await Escrow.find(query)
      .select('escrowId title amount currency status createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Escrow.countDocuments(query);

    res.json({
      success: true,
      data: escrows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('List Escrows API Error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to list escrows'
    });
  }
});

// ==================== UPDATE ESCROW STATUS ====================
router.patch('/escrow/:id/status', checkPermission('updateEscrow'), async (req, res) => {
  try {
    const { status, trackingNumber, notes } = req.body;

    const escrow = await Escrow.findOne({
      _id: req.params.id,
      apiKeyId: req.apiKey._id
    });

    if (!escrow) {
      return res.status(404).json({
        success: false,
        error: 'ESCROW_NOT_FOUND',
        message: 'Escrow not found or access denied'
      });
    }

    // Update based on status
    if (status === 'delivered') {
      escrow.status = 'delivered';
      escrow.delivery = {
        deliveredAt: new Date(),
        trackingNumber: trackingNumber || '',
        notes: notes || ''
      };
    }

    await escrow.save();

    // Send webhook
    if (req.apiKey.webhookUrl) {
      sendWebhook(req.apiKey.webhookUrl, {
        event: 'escrow.status_updated',
        data: { escrowId: escrow._id, status: escrow.status }
      });
    }

    res.json({
      success: true,
      data: {
        escrowId: escrow._id,
        status: escrow.status,
        updatedAt: escrow.updatedAt
      }
    });

  } catch (error) {
    console.error('Update Escrow API Error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to update escrow'
    });
  }
});

// ==================== WEBHOOK HELPER ====================
async function sendWebhook(url, payload) {
  try {
    const axios = require('axios');
    await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
  } catch (error) {
    console.error('Webhook Error:', error.message);
  }
}

module.exports = router;