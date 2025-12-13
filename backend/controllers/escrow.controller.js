const Escrow = require('../models/Escrow.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const feeConfig = require('../config/fee.config');
const { notifyEscrowParties, createNotification } = require('../utils/notificationHelper');

/**
 * Create new escrow (Buyer initiates) - WITH FILE UPLOAD SUPPORT
 */
exports.createEscrow = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      amount, 
      currency, 
      sellerEmail, 
      category, 
      deliveryMethod 
    } = req.body;

    const buyerId = req.user.id;

    // Validate required fields
    if (!title || !description || !amount || !sellerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, amount, sellerEmail'
      });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Validate currency
    const supportedCurrencies = ['USD', 'NGN', 'EUR', 'GBP', 'CAD', 'AUD', 'KES', 'GHS', 'ZAR', 'XOF', 'XAF'];
    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported currency. Supported: ${supportedCurrencies.join(', ')}`
      });
    }

    // Find seller by email
    const seller = await User.findOne({ email: sellerEmail.toLowerCase() });
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found with this email'
      });
    }

    // Prevent self-dealing
    if (seller._id.toString() === buyerId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot create an escrow with yourself'
      });
    }

    // ✅ FIX 1: FRESH FETCH of buyer with latest KYC status
    const buyer = await User.findById(buyerId).select('+kycStatus');
    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: 'Buyer not found'
      });
    }

    console.log('🔍 Buyer KYC Check:', {
      userId: buyer._id,
      email: buyer.email,
      verified: buyer.verified,
      isKYCVerified: buyer.isKYCVerified,
      kycStatus: buyer.kycStatus?.status,
      tier: buyer.tier
    });

    // ✅ FIX 2: EXPLICIT KYC verification check
    if (!buyer.verified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required before creating escrow',
        requiresVerification: true,
        verificationType: 'email'
      });
    }

    if (!buyer.isKYCVerified || buyer.kycStatus?.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required before creating escrow',
        requiresVerification: true,
        verificationType: 'kyc',
        currentKYCStatus: buyer.kycStatus?.status || 'unverified'
      });
    }

    // ✅ FIX 3: Check tier limits
    const canCreate = buyer.canCreateTransaction(parsedAmount, currency);
    if (!canCreate.allowed) {
      return res.status(403).json({
        success: false,
        message: canCreate.reason,
        limit: canCreate.limit,
        current: canCreate.current,
        upgradeRequired: true,
        currentTier: buyer.tier,
        suggestedTier: buyer.tier === 'starter' ? 'growth' : 'enterprise'
      });
    }

    // Calculate tier-based fees
    const feeBreakdown = await feeConfig.calculateSimpleFees(
      parsedAmount,
      currency
    );

    // Handle file attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        url: file.path,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      }));
    }

    // Create escrow with tier-based payment
    const escrowData = {
      title: title.trim(),
      description: description.trim(),
      amount: parsedAmount,
      currency: currency,
      buyer: buyerId,
      seller: seller._id,
      buyerTier: buyer.tier,
      sellerTier: seller.tier,
      category: category || 'other',
      delivery: {
        method: deliveryMethod || 'physical'
      },
      payment: {
        amount: feeBreakdown.amount,
        buyerFee: feeBreakdown.buyerFee,
        sellerFee: feeBreakdown.sellerFee,
        platformFee: feeBreakdown.totalPlatformFee,
        buyerPays: feeBreakdown.buyerPays,
        sellerReceives: feeBreakdown.sellerReceives,
        buyerFeePercentage: feeBreakdown.buyerFeePercentage,
        sellerFeePercentage: feeBreakdown.sellerFeePercentage
      },
      attachments: attachments,
      timeline: [{
        status: 'pending',
        timestamp: new Date(),
        actor: buyerId,
        note: 'Escrow created by buyer'
      }]
    };

    const escrow = await Escrow.create(escrowData);

    // Increment monthly usage
    buyer.monthlyUsage.transactionCount += 1;
    await buyer.save();

    // Notify seller
    await createNotification(
      seller._id,
      'escrow_created',
      'New Escrow Request',
      `${buyer.name} wants to create a ${currency} ${parsedAmount} escrow deal with you: "${title}"`,
      `/escrow/${escrow._id}`,
      { 
        escrowId: escrow._id, 
        amount: parsedAmount, 
        currency: currency,
        otherParty: buyer.name 
      }
    );

    // Populate and return
    await escrow.populate('buyer seller', 'firstName lastName email profilePicture tier');

    console.log('✅ Escrow created successfully:', escrow._id);

    res.status(201).json({
      success: true,
      message: 'Escrow created successfully. Waiting for seller acceptance.',
      data: {
        escrow: {
          ...escrow.toObject(),
          feeBreakdown,
          buyerTier: buyer.tier,
          tierLimits: buyer.getTierLimits(),
          attachmentsCount: attachments.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Create escrow error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create escrow'
    });
  }
};

/**
 * Check if user can create escrow (verification + tier check)
 */
exports.checkCanCreateEscrow = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, currency = 'USD' } = req.query;

    // Fresh fetch of user
    const user = await User.findById(userId).select('+kycStatus');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const checks = {
      emailVerified: user.verified,
      kycVerified: user.isKYCVerified && user.kycStatus?.status === 'approved',
      kycStatus: user.kycStatus?.status || 'unverified',
      tier: user.tier
    };

    // Check if can create
    let canCreate = true;
    let blockingReason = null;
    let requiresAction = null;

    if (!checks.emailVerified) {
      canCreate = false;
      blockingReason = 'Email verification required';
      requiresAction = 'verify_email';
    } else if (!checks.kycVerified) {
      canCreate = false;
      blockingReason = 'KYC verification required';
      requiresAction = 'complete_kyc';
    }

    // If amount provided, check tier limits
    let tierCheck = null;
    if (amount && canCreate) {
      const parsedAmount = parseFloat(amount);
      if (!isNaN(parsedAmount)) {
        tierCheck = user.canCreateTransaction(parsedAmount, currency);
        if (!tierCheck.allowed) {
          canCreate = false;
          blockingReason = tierCheck.reason;
          requiresAction = 'upgrade_tier';
        }
      }
    }

    res.json({
      success: true,
      data: {
        canCreate,
        blockingReason,
        requiresAction,
        checks,
        tierCheck,
        tierLimits: user.getTierLimits()
      }
    });

  } catch (error) {
    console.error('Check can create escrow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check escrow creation eligibility'
    });
  }
};

/**
 * Calculate fees for amount (preview before creating) - ENHANCED WITH CURRENCY SUPPORT
 */
exports.calculateFeePreview = async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.query;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Validate currency
    const supportedCurrencies = ['USD', 'NGN', 'EUR', 'GBP', 'CAD', 'AUD', 'KES', 'GHS', 'ZAR', 'XOF', 'XAF'];
    if (!supportedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported currency. Supported: ${supportedCurrencies.join(', ')}`
      });
    }

    // Get user's tier
    const user = await User.findById(userId);
    const userTier = user.tier || 'starter';

    // Calculate fees based on user's tier and currency
    const feeBreakdown = await feeConfig.calculateSimpleFees(
      parseFloat(amount),
      currency
    );

    // Get tier info
    const tierInfo = await feeConfig.getTierInfo(userTier);

    // Check if amount within limits
    const withinLimit = await feeConfig.isAmountWithinLimit(
      parseFloat(amount),
      currency,
      userTier
    );

    res.json({
      success: true,
      data: {
        feeBreakdown,
        userTier,
        tierInfo,
        withinLimit,
        upgradeAvailable: !withinLimit,
        currency: currency
      }
    });

  } catch (error) {
    console.error('Calculate fees error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate fees'
    });
  }
};

/**
 * Get user's escrows with filtering and pagination - FIXED FOR FRONTEND
 */
exports.getMyEscrows = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20, role = 'all', search = '' } = req.query;

    console.log('Fetching escrows for user:', userId, 'role:', role, 'status:', status);

    // Build query based on role (buyer, seller, or all)
    let query = {};
    
    if (role === 'buyer') {
      query.buyer = userId;
    } else if (role === 'seller') {
      query.seller = userId;
    } else {
      // 'all' or default - show both buying and selling
      query.$or = [{ buyer: userId }, { seller: userId }];
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        ...(query.$or || []),
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { escrowId: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Final query:', JSON.stringify(query));

    const escrows = await Escrow.find(query)
      .populate('buyer', 'firstName lastName email profilePicture')
      .populate('seller', 'firstName lastName email profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    console.log('Found escrows:', escrows.length);

    // Format the data properly for frontend
    const formattedEscrows = escrows.map(escrow => {
      // Determine user role
      const isBuyer = escrow.buyer && escrow.buyer._id.toString() === userId;
      const userRole = isBuyer ? 'buyer' : 'seller';
      
      // Determine other party
      const otherParty = isBuyer ? escrow.seller : escrow.buyer;

      return {
        _id: escrow._id,
        escrowId: escrow.escrowId,
        title: escrow.title,
        description: escrow.description,
        amount: escrow.amount ? parseFloat(escrow.amount.toString()) : 0,
        currency: escrow.currency || 'USD',
        status: escrow.status,
        category: escrow.category,
        deliveryMethod: escrow.delivery?.method,
        
        // User info
        userRole: userRole,
        
        // Party info
        buyer: escrow.buyer ? {
          _id: escrow.buyer._id,
          firstName: escrow.buyer.firstName,
          lastName: escrow.buyer.lastName,
          email: escrow.buyer.email,
          profilePicture: escrow.buyer.profilePicture
        } : null,
        
        seller: escrow.seller ? {
          _id: escrow.seller._id,
          firstName: escrow.seller.firstName,
          lastName: escrow.seller.lastName,
          email: escrow.seller.email,
          profilePicture: escrow.seller.profilePicture
        } : null,
        
        // Other party (for easy access)
        otherParty: otherParty ? {
          _id: otherParty._id,
          firstName: otherParty.firstName,
          lastName: otherParty.lastName,
          email: otherParty.email,
          profilePicture: otherParty.profilePicture
        } : null,

        // Payment info - MATCH FRONTEND EXPECTATIONS
        payment: escrow.payment ? {
          buyerPays: escrow.payment.buyerPays ? parseFloat(escrow.payment.buyerPays.toString()) : 0,
          sellerReceives: escrow.payment.sellerReceives ? parseFloat(escrow.payment.sellerReceives.toString()) : 0,
          buyerFee: escrow.payment.buyerFee ? parseFloat(escrow.payment.buyerFee.toString()) : 0,
          sellerFee: escrow.payment.sellerFee ? parseFloat(escrow.payment.sellerFee.toString()) : 0
        } : {
          buyerPays: 0,
          sellerReceives: 0,
          buyerFee: 0,
          sellerFee: 0
        },

        // Dates
        createdAt: escrow.createdAt,
        updatedAt: escrow.updatedAt,

        // Additional info
        attachmentsCount: escrow.attachments ? escrow.attachments.length : 0,
        timeline: escrow.timeline || [],
        chatUnlocked: escrow.chatUnlocked || false
      };
    });

    const total = await Escrow.countDocuments(query);

    console.log('Sending response with', formattedEscrows.length, 'escrows');

    // RETURN EXACT STRUCTURE FRONTEND EXPECTS
    res.json({
      success: true,
      data: {
        escrows: formattedEscrows, // Frontend expects "escrows" array
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get my escrows error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escrows',
      error: error.message
    });
  }
};

/**
 * Get dashboard statistics for user - FIXED FOR FRONTEND
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Fetching dashboard stats for user:', userId);

    // Get counts for different statuses for buying
    const buyingStats = await Escrow.aggregate([
      { $match: { buyer: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get counts for different statuses for selling
    const sellingStats = await Escrow.aggregate([
      { $match: { seller: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Convert to object format that frontend expects
    const buyingStatsObj = buyingStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const sellingStatsObj = sellingStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    // Calculate totals
    const totalBuying = await Escrow.countDocuments({ buyer: userId });
    const totalSelling = await Escrow.countDocuments({ seller: userId });

    // RETURN EXACT STRUCTURE FRONTEND EXPECTS
    const stats = {
      buying: {
        total: totalBuying,
        pending: buyingStatsObj.pending || 0,
        accepted: buyingStatsObj.accepted || 0,
        funded: buyingStatsObj.funded || 0,
        delivered: buyingStatsObj.delivered || 0,
        completed: buyingStatsObj.completed || 0,
        cancelled: buyingStatsObj.cancelled || 0,
        disputed: buyingStatsObj.disputed || 0
      },
      selling: {
        total: totalSelling,
        pending: sellingStatsObj.pending || 0,
        accepted: sellingStatsObj.accepted || 0,
        funded: sellingStatsObj.funded || 0,
        delivered: sellingStatsObj.delivered || 0,
        completed: sellingStatsObj.completed || 0,
        cancelled: sellingStatsObj.cancelled || 0,
        disputed: sellingStatsObj.disputed || 0
      }
    };

    console.log('Dashboard stats:', stats);

    res.json({
      success: true,
      data: stats // Frontend expects data.buying and data.selling
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get escrow by ID - FIXED FOR FRONTEND (ENHANCED VERSION)
 */
exports.getEscrowById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('Fetching escrow details for ID:', id, 'User ID:', userId);

    let escrow;
    
    // Try by MongoDB _id first, then by escrowId
    if (mongoose.Types.ObjectId.isValid(id)) {
      escrow = await Escrow.findById(id)
        .populate('buyer', 'firstName lastName email profilePicture phone')
        .populate('seller', 'firstName lastName email profilePicture phone')
        .populate('attachments.uploadedBy', 'firstName lastName email')
        .populate('timeline.actor', 'firstName lastName email')
        .populate('delivery.proof.submittedBy', 'firstName lastName email')
        .populate('dispute.raisedBy', 'firstName lastName email')
        .populate('dispute.resolvedBy', 'firstName lastName email');
    } else {
      escrow = await Escrow.findOne({ escrowId: id })
        .populate('buyer', 'firstName lastName email profilePicture phone')
        .populate('seller', 'firstName lastName email profilePicture phone')
        .populate('attachments.uploadedBy', 'firstName lastName email')
        .populate('timeline.actor', 'firstName lastName email')
        .populate('delivery.proof.submittedBy', 'firstName lastName email')
        .populate('dispute.raisedBy', 'firstName lastName email')
        .populate('dispute.resolvedBy', 'firstName lastName email');
    }

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Escrow not found'
      });
    }

    // Check if user has access to this escrow
    const isBuyer = escrow.buyer && escrow.buyer._id.toString() === userId;
    const isSeller = escrow.seller && escrow.seller._id.toString() === userId;
    
    if (!isBuyer && !isSeller && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this escrow'
      });
    }

    // Format the escrow data properly for frontend
    const formattedEscrow = {
      _id: escrow._id,
      escrowId: escrow.escrowId,
      title: escrow.title,
      description: escrow.description,
      amount: escrow.amount ? parseFloat(escrow.amount.toString()) : 0,
      currency: escrow.currency || 'USD',
      status: escrow.status,
      category: escrow.category,
      buyerTier: escrow.buyerTier,
      sellerTier: escrow.sellerTier,
      chatUnlocked: escrow.chatUnlocked || false,
      visibility: escrow.visibility || 'private',
      
      // Parties information
      buyer: escrow.buyer ? {
        _id: escrow.buyer._id,
        firstName: escrow.buyer.firstName,
        lastName: escrow.buyer.lastName,
        email: escrow.buyer.email,
        profilePicture: escrow.buyer.profilePicture,
        phone: escrow.buyer.phone
      } : null,
      
      seller: escrow.seller ? {
        _id: escrow.seller._id,
        firstName: escrow.seller.firstName,
        lastName: escrow.seller.lastName,
        email: escrow.seller.email,
        profilePicture: escrow.seller.profilePicture,
        phone: escrow.seller.phone
      } : null,

      // Payment information - ensure all fields are present
      payment: escrow.payment ? {
        method: escrow.payment.method,
        reference: escrow.payment.reference,
        transactionId: escrow.payment.transactionId,
        paymentId: escrow.payment.paymentId,
        amount: escrow.payment.amount ? parseFloat(escrow.payment.amount.toString()) : 0,
        buyerFee: escrow.payment.buyerFee ? parseFloat(escrow.payment.buyerFee.toString()) : 0,
        sellerFee: escrow.payment.sellerFee ? parseFloat(escrow.payment.sellerFee.toString()) : 0,
        platformFee: escrow.payment.platformFee ? parseFloat(escrow.payment.platformFee.toString()) : 0,
        buyerPays: escrow.payment.buyerPays ? parseFloat(escrow.payment.buyerPays.toString()) : 0,
        sellerReceives: escrow.payment.sellerReceives ? parseFloat(escrow.payment.sellerReceives.toString()) : 0,
        buyerFeePercentage: escrow.payment.buyerFeePercentage || 0,
        sellerFeePercentage: escrow.payment.sellerFeePercentage || 0,
        paidAt: escrow.payment.paidAt,
        verifiedAt: escrow.payment.verifiedAt,
        paidOutAt: escrow.payment.paidOutAt,
        gatewayResponse: escrow.payment.gatewayResponse
      } : {
        method: null,
        reference: null,
        amount: 0,
        buyerFee: 0,
        sellerFee: 0,
        platformFee: 0,
        buyerPays: 0,
        sellerReceives: 0,
        buyerFeePercentage: 0,
        sellerFeePercentage: 0
      },

      // Delivery information
      delivery: {
        method: escrow.delivery?.method || 'physical',
        trackingNumber: escrow.delivery?.trackingNumber,
        deliveredAt: escrow.delivery?.deliveredAt,
        confirmedAt: escrow.delivery?.confirmedAt,
        autoReleaseAt: escrow.delivery?.autoReleaseAt,
        notes: escrow.delivery?.notes,
        proof: escrow.delivery?.proof ? {
          method: escrow.delivery.proof.method,
          courierName: escrow.delivery.proof.courierName,
          trackingNumber: escrow.delivery.proof.trackingNumber,
          vehicleType: escrow.delivery.proof.vehicleType,
          plateNumber: escrow.delivery.proof.plateNumber,
          driverName: escrow.delivery.proof.driverName,
          driverPhoto: escrow.delivery.proof.driverPhoto,
          vehiclePhoto: escrow.delivery.proof.vehiclePhoto,
          gpsEnabled: escrow.delivery.proof.gpsEnabled || false,
          gpsTrackingId: escrow.delivery.proof.gpsTrackingId,
          methodDescription: escrow.delivery.proof.methodDescription,
          estimatedDelivery: escrow.delivery.proof.estimatedDelivery,
          packagePhotos: escrow.delivery.proof.packagePhotos || [],
          additionalNotes: escrow.delivery.proof.additionalNotes,
          submittedAt: escrow.delivery.proof.submittedAt,
          submittedBy: escrow.delivery.proof.submittedBy
        } : null,
        evidence: escrow.delivery?.evidence || []
      },

      // Dispute information
      dispute: escrow.dispute ? {
        isDisputed: escrow.dispute.isDisputed || false,
        raisedBy: escrow.dispute.raisedBy,
        raisedAt: escrow.dispute.raisedAt,
        reason: escrow.dispute.reason,
        description: escrow.dispute.description,
        evidence: escrow.dispute.evidence || [],
        status: escrow.dispute.status || 'pending',
        resolution: escrow.dispute.resolution,
        resolvedAt: escrow.dispute.resolvedAt,
        resolvedBy: escrow.dispute.resolvedBy
      } : {
        isDisputed: false,
        status: 'pending',
        evidence: []
      },

      // Attachments
      attachments: escrow.attachments ? escrow.attachments.map(att => ({
        _id: att._id,
        filename: att.filename,
        originalName: att.originalName,
        url: att.url,
        mimetype: att.mimetype,
        size: att.size,
        uploadedAt: att.uploadedAt,
        uploadedBy: att.uploadedBy
      })) : [],

      // Timeline
      timeline: escrow.timeline ? escrow.timeline.map(event => ({
        _id: event._id,
        status: event.status,
        timestamp: event.timestamp,
        actor: event.actor,
        note: event.note
      })) : [],

      // Chat
      chat: escrow.chat || [],

      // Ratings
      rating: escrow.rating || {
        buyerRating: null,
        sellerRating: null
      },

      // Dates
      createdAt: escrow.createdAt,
      updatedAt: escrow.updatedAt,
      expiresAt: escrow.expiresAt
    };

    console.log('Sending formatted escrow data for:', formattedEscrow.title);

    // ✅ FIXED: Return escrow in data.escrow for frontend setEscrow(response.data.escrow)
    res.json({
      success: true,
      data: {
        escrow: formattedEscrow, // ✅ WRAPPED: Now frontend can use response.data.escrow
        userRole: isBuyer ? 'buyer' : isSeller ? 'seller' : 'admin'
      }
    });

  } catch (error) {
    console.error('Get escrow by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escrow details',
      error: error.message
    });
  }
};

/**
 * Get GPS tracking information - FIXED
 */
exports.getGPSTracking = async (req, res) => {
  try {
    const { gpsTrackingId } = req.params;
    const userId = req.user.id;

    // Find escrow with this GPS tracking ID
    const escrow = await Escrow.findOne({
      'delivery.proof.gpsTrackingId': gpsTrackingId,
      $or: [{ buyer: userId }, { seller: userId }]
    });

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Tracking information not found'
      });
    }

    // Return basic tracking info
    const trackingData = {
      trackingId: gpsTrackingId,
      status: 'active',
      lastUpdate: new Date(),
      escrowTitle: escrow.title,
      estimatedDelivery: escrow.delivery?.proof?.estimatedDelivery || null
    };

    res.json({
      success: true,
      data: trackingData
    });

  } catch (error) {
    console.error('Get GPS tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tracking information'
    });
  }
};

/**
 * Upload delivery proof - FIXED
 */
exports.uploadDeliveryProof = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      method,
      courierName,
      trackingNumber,
      vehicleType,
      plateNumber,
      driverName,
      gpsEnabled,
      methodDescription,
      estimatedDelivery,
      additionalNotes,
      packagePhotos = [],
      driverPhoto,
      vehiclePhoto
    } = req.body;

    const escrow = await Escrow.findById(id);

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Escrow not found'
      });
    }

    // Check if user is the seller
    if (escrow.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only seller can upload delivery proof'
      });
    }

    // Check if escrow can have delivery proof uploaded
    if (!['funded', 'accepted'].includes(escrow.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot upload delivery proof in current status'
      });
    }

    // Update delivery proof
    escrow.delivery.proof = {
      method: method || 'other',
      courierName,
      trackingNumber,
      vehicleType,
      plateNumber,
      driverName,
      driverPhoto,
      vehiclePhoto,
      gpsEnabled: gpsEnabled === 'true',
      methodDescription,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
      packagePhotos: Array.isArray(packagePhotos) ? packagePhotos : [packagePhotos],
      additionalNotes,
      submittedAt: new Date(),
      submittedBy: userId
    };

    // Add to timeline
    escrow.timeline.push({
      status: 'delivered',
      timestamp: new Date(),
      actor: userId,
      note: 'Delivery proof uploaded by seller'
    });

    await escrow.save();

    // Populate before sending response
    await escrow.populate('buyer seller', 'firstName lastName email');

    // ✅ FIXED: Return escrow in data.escrow
    res.json({
      success: true,
      message: 'Delivery proof uploaded successfully',
      data: {
        escrow: escrow.toObject() // ✅ WRAPPED
      }
    });

  } catch (error) {
    console.error('Upload delivery proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload delivery proof'
    });
  }
};

/**
 * Accept escrow (seller) - FIXED
 */
exports.acceptEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Escrow not found'
      });
    }

    // Check if user is the seller
    if (escrow.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only seller can accept escrow'
      });
    }

    // Check if escrow can be accepted
    if (escrow.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Escrow cannot be accepted in current status'
      });
    }

    // Update status
    escrow.status = 'accepted';
    escrow.chatUnlocked = true;

    // Add to timeline
    escrow.timeline.push({
      status: 'accepted',
      timestamp: new Date(),
      actor: userId,
      note: 'Escrow accepted by seller'
    });

    await escrow.save();

    // Populate before sending response
    await escrow.populate('buyer seller', 'firstName lastName email');

    // ✅ FIXED: Return escrow in data.escrow
    res.json({
      success: true,
      message: 'Escrow accepted successfully',
      data: {
        escrow: escrow.toObject() // ✅ WRAPPED
      }
    });

  } catch (error) {
    console.error('Accept escrow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept escrow'
    });
  }
};

/**
 * Fund escrow (buyer payment) - FIXED
 */
exports.fundEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Escrow not found'
      });
    }

    // Check if user is the buyer
    if (escrow.buyer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only buyer can fund escrow'
      });
    }

    // Check if escrow can be funded
    if (escrow.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Escrow cannot be funded in current status'
      });
    }

    // Update status to funded
    escrow.status = 'funded';

    // Add to timeline
    escrow.timeline.push({
      status: 'funded',
      timestamp: new Date(),
      actor: userId,
      note: 'Escrow funded by buyer'
    });

    await escrow.save();

    // Populate before sending response
    await escrow.populate('buyer seller', 'firstName lastName email');

    // ✅ FIXED: Return escrow in data.escrow
    res.json({
      success: true,
      message: 'Escrow funded successfully',
      data: {
        escrow: escrow.toObject() // ✅ WRAPPED
      }
    });

  } catch (error) {
    console.error('Fund escrow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fund escrow'
    });
  }
};

/**
 * Mark escrow as delivered (seller) - FIXED
 */
exports.markDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Escrow not found'
      });
    }

    // Check if user is the seller
    if (escrow.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only seller can mark as delivered'
      });
    }

    // Check if escrow can be marked as delivered
    if (escrow.status !== 'funded') {
      return res.status(400).json({
        success: false,
        message: 'Escrow cannot be marked as delivered in current status'
      });
    }

    // Update status to delivered
    escrow.status = 'delivered';
    escrow.delivery.deliveredAt = new Date();

    // Add to timeline
    escrow.timeline.push({
      status: 'delivered',
      timestamp: new Date(),
      actor: userId,
      note: 'Item marked as delivered by seller'
    });

    await escrow.save();

    // Populate before sending response
    await escrow.populate('buyer seller', 'firstName lastName email');

    // ✅ FIXED: Return escrow in data.escrow
    res.json({
      success: true,
      message: 'Item marked as delivered successfully',
      data: {
        escrow: escrow.toObject() // ✅ WRAPPED
      }
    });

  } catch (error) {
    console.error('Mark delivered error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as delivered'
    });
  }
};

/**
 * Confirm delivery (buyer) - FIXED
 */
exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Escrow not found'
      });
    }

    // Check if user is the buyer
    if (escrow.buyer.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only buyer can confirm delivery'
      });
    }

    // Check if escrow can be confirmed
    if (escrow.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Escrow cannot be confirmed in current status'
      });
    }

    // Update status to completed
    escrow.status = 'completed';
    escrow.delivery.confirmedAt = new Date();

    // Add to timeline
    escrow.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      actor: userId,
      note: 'Delivery confirmed by buyer'
    });

    await escrow.save();

    // Populate before sending response
    await escrow.populate('buyer seller', 'firstName lastName email');

    // ✅ FIXED: Return escrow in data.escrow
    res.json({
      success: true,
      message: 'Delivery confirmed successfully',
      data: {
        escrow: escrow.toObject() // ✅ WRAPPED
      }
    });

  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm delivery'
    });
  }
};

/**
 * Raise dispute for escrow - FIXED
 */
exports.raiseDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason, description } = req.body;

    const escrow = await Escrow.findById(id);

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Escrow not found'
      });
    }

    // Check if user is participant
    const isBuyer = escrow.buyer.toString() === userId;
    const isSeller = escrow.seller.toString() === userId;
    
    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Only participants can raise disputes'
      });
    }

    // Check if escrow can be disputed
    if (!['accepted', 'funded', 'delivered'].includes(escrow.status)) {
      return res.status(400).json({
        success: false,
        message: 'Escrow cannot be disputed in current status'
      });
    }

    // Create dispute
    escrow.dispute = {
      isDisputed: true,
      raisedBy: userId,
      raisedAt: new Date(),
      reason,
      description,
      status: 'pending'
    };

    // Update status to disputed
    escrow.status = 'disputed';

    // Add to timeline
    escrow.timeline.push({
      status: 'disputed',
      timestamp: new Date(),
      actor: userId,
      note: `Dispute raised: ${reason}`
    });

    await escrow.save();

    // Populate before sending response
    await escrow.populate('buyer seller', 'firstName lastName email');

    // ✅ FIXED: Return escrow in data.escrow
    res.json({
      success: true,
      message: 'Dispute raised successfully',
      data: {
        escrow: escrow.toObject() // ✅ WRAPPED
      }
    });

  } catch (error) {
    console.error('Raise dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to raise dispute'
    });
  }
};

/**
 * Cancel escrow - FIXED
 */
exports.cancelEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const escrow = await Escrow.findById(id);

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: 'Escrow not found'
      });
    }

    // Check if user is participant
    const isBuyer = escrow.buyer.toString() === userId;
    const isSeller = escrow.seller.toString() === userId;
    
    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Only participants can cancel escrow'
      });
    }

    // Check if escrow can be cancelled
    if (!['pending', 'accepted'].includes(escrow.status)) {
      return res.status(400).json({
        success: false,
        message: 'Escrow cannot be cancelled in current status'
      });
    }

    // Update status to cancelled
    escrow.status = 'cancelled';

    // Add to timeline
    escrow.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      actor: userId,
      note: `Escrow cancelled: ${reason || 'No reason provided'}`
    });

    await escrow.save();

    // Populate before sending response
    await escrow.populate('buyer seller', 'firstName lastName email');

    // ✅ FIXED: Return escrow in data.escrow
    res.json({
      success: true,
      message: 'Escrow cancelled successfully',
      data: {
        escrow: escrow.toObject() // ✅ WRAPPED
      }
    });

  } catch (error) {
    console.error('Cancel escrow error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel escrow'
    });
  }
};