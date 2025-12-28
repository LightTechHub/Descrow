const express = require('express');
const router = express.Router();

const escrowController = require('../controllers/escrow.controller');
const { authenticate } = require('../middleware/auth.middleware');
const verificationMiddleware = require('../middleware/verification.middleware');
const { createEscrowValidator } = require('../validators/escrow.validator');
const { uploadMultiple } = require('../middleware/upload.middleware');

// ==================== PUBLIC ROUTES (No Authentication) ====================
// MUST COME FIRST BEFORE router.use(authenticate)

/**
 * @route   GET /api/escrow/public
 * @desc    Get public/featured deals for landing page (shows completed transactions)
 * @access  Public
 */
router.get('/public', async (req, res) => {
  try {
    const Escrow = require('../models/Escrow.model');
    
    // Get recent completed/paid_out escrows with public visibility
    const publicDeals = await Escrow.find({
      status: { $in: ['completed', 'paid_out'] },
      visibility: 'public'
    })
    .select('title amount currency category transactionType createdAt')
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
      transactionType: deal.transactionType,
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

// ==================== APPLY AUTHENTICATION ====================
// 🔒 All routes below this line require authentication
router.use(authenticate);

// ==================== ELIGIBILITY CHECK ====================

/**
 * @route   GET /api/escrow/check-eligibility
 * @desc    Check if user can create escrow (email verification, KYC, etc.)
 * @access  Private
 */
router.get('/check-eligibility', escrowController.checkCanCreateEscrow);

// ==================== ESCROW MANAGEMENT ====================

/**
 * @route   POST /api/escrow/create
 * @desc    Create a new escrow transaction
 * @access  Private (requires email verification)
 */
router.post(
  '/create', 
  verificationMiddleware,
  uploadMultiple('attachments', 10),
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

// ==================== ESCROW ACTIONS ====================

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
  uploadMultiple('photos', 10),
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

// ==================== MILESTONE MANAGEMENT ====================

/**
 * @route   POST /api/escrow/:id/milestones
 * @desc    Add milestone to escrow
 * @access  Private
 */
router.post('/:id/milestones', escrowController.addMilestone);

/**
 * @route   POST /api/escrow/:id/milestones/:milestoneId/submit
 * @desc    Submit milestone for approval
 * @access  Private
 */
router.post(
  '/:id/milestones/:milestoneId/submit',
  uploadMultiple('attachments', 10),
  escrowController.submitMilestone
);

/**
 * @route   POST /api/escrow/:id/milestones/:milestoneId/approve
 * @desc    Approve milestone completion
 * @access  Private
 */
router.post('/:id/milestones/:milestoneId/approve', escrowController.approveMilestone);

/**
 * @route   POST /api/escrow/:id/milestones/:milestoneId/reject
 * @desc    Reject milestone submission
 * @access  Private
 */
router.post('/:id/milestones/:milestoneId/reject', escrowController.rejectMilestone);

// ==================== PARTICIPANT MANAGEMENT ====================

/**
 * @route   POST /api/escrow/:id/participants
 * @desc    Add participant to escrow
 * @access  Private
 */
router.post('/:id/participants', escrowController.addParticipant);

/**
 * @route   POST /api/escrow/:id/accept-invitation
 * @desc    Accept participant invitation
 * @access  Private
 */
router.post('/:id/accept-invitation', escrowController.acceptInvitation);

/**
 * @route   POST /api/escrow/:id/decline-invitation
 * @desc    Decline participant invitation
 * @access  Private
 */
router.post('/:id/decline-invitation', escrowController.declineInvitation);

// ==================== INSPECTION MANAGEMENT ====================

/**
 * @route   POST /api/escrow/:id/schedule-inspection
 * @desc    Schedule inspection for escrow
 * @access  Private
 */
router.post('/:id/schedule-inspection', escrowController.scheduleInspection);

/**
 * @route   POST /api/escrow/:id/complete-inspection
 * @desc    Complete inspection with photos
 * @access  Private
 */
router.post(
  '/:id/complete-inspection',
  uploadMultiple('photos', 10),
  escrowController.completeInspection
);

module.exports = router;
