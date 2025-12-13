const express = require('express');
const router = express.Router();

const escrowController = require('../controllers/escrow.controller');
const { authenticate } = require('../middleware/auth.middleware');
const verificationMiddleware = require('../middleware/verification.middleware');
const { createEscrowValidator } = require('../validators/escrow.validator');
const { uploadMultiple } = require('../middleware/upload.middleware');

// ✅ PUBLIC ROUTES (No Authentication) - MUST COME FIRST BEFORE router.use(authenticate)

/**
 * @route   GET /api/escrow/public
 * @desc    Get public/featured deals for landing page (shows completed transactions)
 * @access  Public
 */
router.get('/public', async (req, res) => {
  try {
    const Escrow = require('../models/Escrow.model');
    
    // ✅ NEW: Check eligibility before creating escrow
router.get('/check-eligibility', escrowController.checkCanCreateEscrow);
    
    // Get recent completed/paid_out escrows as examples
    const publicDeals = await Escrow.find({
      status: { $in: ['completed', 'paid_out'] }
    })
    .select('title amount currency category createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    // Format for public display (no sensitive data)
    const formattedDeals = publicDeals.map(deal => ({
      id: deal._id,
      title: deal.title,
      amount: deal.amount ? parseFloat(deal.amount.toString()) : 0,
      currency: deal.currency || 'USD',
      category: deal.category || 'other',
      completedAt: deal.createdAt
    }));

    res.json({
      success: true,
      deals: formattedDeals,
      total: formattedDeals.length
    });

  } catch (error) {
    console.error('❌ Error fetching public deals:', error);
    // Return empty array instead of error for better UX
    res.json({
      success: true,
      deals: [],
      total: 0,
      message: 'No public deals available yet'
    });
  }
});

// 🔒 Apply authentication to ALL routes below this line
router.use(authenticate);

/**
 * @route   POST /api/escrow/create
 * @desc    Create a new escrow transaction
 * @access  Private (requires email verification)
 */
router.post(
  '/create', 
  verificationMiddleware,
  createEscrowValidator, 
  escrowController.createEscrow
);

/**
 * @route   GET /api/escrow/my-escrows
 * @desc    Get all escrows for the authenticated user
 * @access  Private
 */
router.get('/my-escrows', escrowController.getMyEscrows);

/**
 * @route   GET /api/escrow/dashboard-stats
 * @desc    Get dashboard statistics for the user
 * @access  Private
 */
router.get('/dashboard-stats', escrowController.getDashboardStats);

/**
 * @route   GET /api/escrow/calculate-fees
 * @desc    Preview escrow service fees before creating
 * @access  Private
 */
router.get('/calculate-fees', escrowController.calculateFeePreview);

/**
 * @route   GET /api/escrow/details/:id
 * @desc    Get escrow details by MongoDB _id (for payment page)
 * @access  Private
 */
router.get('/details/:id', escrowController.getEscrowById);

/**
 * @route   GET /api/escrow/track/:gpsTrackingId
 * @desc    Get GPS tracking information for delivery
 * @access  Private
 */
router.get('/track/:gpsTrackingId', escrowController.getGPSTracking);

/**
 * @route   GET /api/escrow/:id
 * @desc    Get details of a single escrow by ID (escrowId or _id)
 * @access  Private
 */
router.get('/:id', escrowController.getEscrowById);

/**
 * @route   POST /api/escrow/:id/accept
 * @desc    Accept an escrow offer (seller action)
 * @access  Private (Seller only)
 */
router.post('/:id/accept', escrowController.acceptEscrow);

/**
 * @route   POST /api/escrow/:id/fund
 * @desc    Fund escrow (buyer action)
 * @access  Private (Buyer only)
 */
router.post('/:id/fund', escrowController.fundEscrow);

/**
 * @route   POST /api/escrow/:id/deliver
 * @desc    Mark escrow item as delivered (seller action)
 * @access  Private (Seller only)
 */
router.post('/:id/deliver', escrowController.markDelivered);

/**
 * @route   POST /api/escrow/:id/upload-delivery-proof
 * @desc    Upload delivery proof with photos and tracking details
 * @access  Private (Seller only)
 */
router.post(
  '/:id/upload-delivery-proof',
  uploadMultiple('photos', 10), // Allow up to 10 photos
  (req, res) => {
    // Map uploaded file URLs to body
    req.body.packagePhotos = req.fileUrls || [];
    if (req.files?.driverPhoto) {
      req.body.driverPhoto = req.files.driverPhoto[0].url;
    }
    if (req.files?.vehiclePhoto) {
      req.body.vehiclePhoto = req.files.vehiclePhoto[0].url;
    }
    escrowController.uploadDeliveryProof(req, res);
  }
);

/**
 * @route   POST /api/escrow/:id/confirm
 * @desc    Confirm delivery (buyer action)
 * @access  Private (Buyer only)
 */
router.post('/:id/confirm', escrowController.confirmDelivery);

/**
 * @route   POST /api/escrow/:id/dispute
 * @desc    Raise a dispute for the escrow (either party)
 * @access  Private
 */
router.post('/:id/dispute', escrowController.raiseDispute);

/**
 * @route   POST /api/escrow/:id/cancel
 * @desc    Cancel escrow (allowed before funding)
 * @access  Private
 */
router.post('/:id/cancel', escrowController.cancelEscrow);

module.exports = router;