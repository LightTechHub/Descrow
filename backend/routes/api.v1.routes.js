// backend/routes/api.v1.routes.js
// External API - accessed by developers using dc_live_* API keys
// All routes require API key auth via Authorization: Bearer dc_live_xxxxx

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateApiKey, checkPermission, apiRateLimiter } = require('../middleware/apiAuth');
const Escrow = require('../models/Escrow.model');
const User = require('../models/User.model');

router.use(authenticateApiKey);
router.use(apiRateLimiter);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function sendWebhook(url, payload) {
  try {
    const axios = require('axios');
    await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json', 'X-Dealcross-Event': payload.event },
      timeout: 5000
    });
  } catch (err) {
    console.error('Webhook delivery failed:', err.message);
  }
}

// Look up a user by email - returns user or throws a clean 400
async function resolveUser(email, role) {
  if (!email) throw { status: 400, code: 'MISSING_FIELD', message: `${role}Email is required` };
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('_id name email tier');
  if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: `No Dealcross account found for ${role} email: ${email}` };
  return user;
}

// ── POST /api/v1/escrow/create ────────────────────────────────────────────────
router.post('/escrow/create', checkPermission('createEscrow'), async (req, res) => {
  try {
    const { title, description, amount, currency, category, buyerEmail, sellerEmail, metadata } = req.body;

    if (!title || !amount || !buyerEmail || !sellerEmail) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Missing required fields: title, amount, buyerEmail, sellerEmail' });
    }
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'INVALID_AMOUNT', message: 'amount must be a positive number' });
    }
    if (buyerEmail.toLowerCase() === sellerEmail.toLowerCase()) {
      return res.status(400).json({ success: false, error: 'SAME_USER', message: 'buyer and seller cannot be the same account' });
    }

    // Resolve both users - returns clean errors if not found
    let buyer, seller;
    try { buyer = await resolveUser(buyerEmail, 'buyer'); } catch (e) { return res.status(e.status || 400).json({ success: false, error: e.code, message: e.message }); }
    try { seller = await resolveUser(sellerEmail, 'seller'); } catch (e) { return res.status(e.status || 400).json({ success: false, error: e.code, message: e.message }); }

    const escrow = await Escrow.create({
      title: title.trim(),
      description: description?.trim() || '',
      amount: parseFloat(amount),
      currency: (currency || 'NGN').toUpperCase(),
      category: category || 'general',
      buyer: buyer._id,
      seller: seller._id,
      buyerTier: buyer.tier || 'starter',
      sellerTier: seller.tier || 'starter',
      status: 'pending',
      createdViaAPI: true,
      apiKeyId: req.apiKey._id,
      metadata: metadata || {},
      timeline: [{ status: 'pending', timestamp: new Date(), note: 'Created via API' }]
    });

    if (req.apiKey.webhookUrl) {
      sendWebhook(req.apiKey.webhookUrl, { event: 'escrow.created', data: { escrowId: escrow._id, escrowRef: escrow.escrowId, status: escrow.status, amount: escrow.amount, currency: escrow.currency } });
    }

    res.status(201).json({
      success: true,
      data: {
        escrowId: escrow._id,
        escrowRef: escrow.escrowId,
        status: escrow.status,
        amount: escrow.amount,
        currency: escrow.currency,
        buyer: { id: buyer._id, name: buyer.name, email: buyer.email },
        seller: { id: seller._id, name: seller.name, email: seller.email },
        createdAt: escrow.createdAt
      }
    });
  } catch (error) {
    console.error('API create escrow error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create escrow' });
  }
});

// ── GET /api/v1/escrow/:id ────────────────────────────────────────────────────
router.get('/escrow/:id', checkPermission('viewEscrow'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'INVALID_ID', message: 'Invalid escrow ID format' });
    }

    const escrow = await Escrow.findOne({ _id: req.params.id, apiKeyId: req.apiKey._id })
      .populate('buyer', 'name email')
      .populate('seller', 'name email');

    if (!escrow) return res.status(404).json({ success: false, error: 'ESCROW_NOT_FOUND', message: 'Escrow not found or does not belong to this API key' });

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
        category: escrow.category,
        buyer: { id: escrow.buyer?._id, name: escrow.buyer?.name, email: escrow.buyer?.email },
        seller: { id: escrow.seller?._id, name: escrow.seller?.name, email: escrow.seller?.email },
        payment: escrow.payment || {},
        delivery: escrow.delivery || {},
        timeline: escrow.timeline || [],
        metadata: escrow.metadata || {},
        createdAt: escrow.createdAt,
        updatedAt: escrow.updatedAt
      }
    });
  } catch (error) {
    console.error('API get escrow error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to retrieve escrow' });
  }
});

// ── GET /api/v1/escrows ───────────────────────────────────────────────────────
router.get('/escrows', checkPermission('viewEscrow'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const safePage  = Math.max(parseInt(page) || 1, 1);

    const query = { apiKeyId: req.apiKey._id };
    const validStatuses = ['pending','accepted','funded','in_escrow','delivered','completed','cancelled','disputed'];
    if (status && validStatuses.includes(status)) query.status = status;

    const [escrows, count] = await Promise.all([
      Escrow.find(query)
        .select('escrowId title amount currency status category createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      Escrow.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: escrows,
      pagination: { page: safePage, limit: safeLimit, total: count, pages: Math.ceil(count / safeLimit) }
    });
  } catch (error) {
    console.error('API list escrows error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to list escrows' });
  }
});

// ── PATCH /api/v1/escrow/:id/status ─────────────────────────────────────────
// Used by sellers to mark delivery, or to accept/cancel
router.patch('/escrow/:id/status', checkPermission('deliverEscrow'), async (req, res) => {
  try {
    const { status, trackingNumber, courier, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'INVALID_ID', message: 'Invalid escrow ID' });
    }

    const validTransitions = {
      pending:    ['accepted', 'cancelled'],
      accepted:   ['cancelled'],
      funded:     ['cancelled'],
      in_escrow:  ['delivered'],
      delivered:  []
    };

    const escrow = await Escrow.findOne({ _id: req.params.id, apiKeyId: req.apiKey._id });
    if (!escrow) return res.status(404).json({ success: false, error: 'ESCROW_NOT_FOUND', message: 'Escrow not found' });

    const allowed = validTransitions[escrow.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TRANSITION',
        message: `Cannot move from '${escrow.status}' to '${status}'. Allowed: [${allowed.join(', ') || 'none'}]`
      });
    }

    escrow.status = status;
    escrow.timeline.push({ status, timestamp: new Date(), note: notes || `Status updated to ${status} via API` });

    if (status === 'delivered') {
      escrow.delivery = {
        ...escrow.delivery,
        deliveredAt: new Date(),
        trackingNumber: trackingNumber || '',
        courier: courier || '',
        notes: notes || ''
      };
    }
    if (status === 'accepted') {
      escrow.acceptedAt = new Date();
    }
    if (status === 'cancelled') {
      escrow.cancelledAt = new Date();
      escrow.cancellationReason = notes || 'Cancelled via API';
    }

    await escrow.save();

    if (req.apiKey.webhookUrl) {
      sendWebhook(req.apiKey.webhookUrl, { event: `escrow.${status}`, data: { escrowId: escrow._id, escrowRef: escrow.escrowId, status, updatedAt: escrow.updatedAt } });
    }

    res.json({ success: true, data: { escrowId: escrow._id, escrowRef: escrow.escrowId, status: escrow.status, updatedAt: escrow.updatedAt } });
  } catch (error) {
    console.error('API update status error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to update escrow status' });
  }
});

// ── GET /api/v1/account ──────────────────────────────────────────────────────
// Returns info about the API key owner
router.get('/account', async (req, res) => {
  try {
    const user = await User.findById(req.apiKey.user).select('name email tier subscription apiAccess');
    if (!user) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Account not found' });
    res.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        tier: user.tier,
        apiKey: req.apiKey.key,
        permissions: req.apiKey.permissions,
        requestCount: req.apiKey.requestCount || 0,
        createdAt: req.apiKey.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch account info' });
  }
});

// ── POST /api/v1/webhook ──────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const { url, events } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'MISSING_URL', message: 'Webhook URL is required' });
    const ApiKey = require('../models/ApiKey.model');
    await ApiKey.findByIdAndUpdate(req.apiKey._id, { webhookUrl: url, webhookEvents: events || ['escrow.*'] });
    res.json({ success: true, message: 'Webhook URL saved', data: { url, events: events || ['escrow.*'] } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to save webhook' });
  }
});

// ── POST /api/v1/webhook/test ─────────────────────────────────────────────────
router.post('/webhook/test', async (req, res) => {
  try {
    if (!req.apiKey.webhookUrl) {
      return res.status(400).json({ success: false, error: 'NO_WEBHOOK', message: 'No webhook URL configured. Call POST /webhook first.' });
    }
    await sendWebhook(req.apiKey.webhookUrl, {
      event: 'webhook.test',
      data: { message: 'Webhook test from Dealcross API', timestamp: new Date().toISOString() }
    });
    res.json({ success: true, message: 'Test event sent to ' + req.apiKey.webhookUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to send test webhook' });
  }
});

module.exports = router;
