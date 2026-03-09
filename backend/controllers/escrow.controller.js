const Escrow = require('../models/Escrow.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const feeConfig = require('../config/fee.config');
const { notifyEscrowParties, createNotification } = require('../utils/notificationHelper');

// ==================== CREATE ESCROW ====================
exports.createEscrow = async (req, res) => {
  try {
    const {
      title, description, amount, currency, currencyType, transactionType,
      sellerEmail, category, deliveryMethod, participants, milestones,
      agentEmail, inspectorEmail, arbitratorEmail, metadata, customTerms,
      inspectionPeriodDays, autoReleaseDays, shippingAddress, tags
    } = req.body;

    const buyerId = req.user.id;

    // Validation
    if (!title || !description || !amount || !sellerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, amount, sellerEmail'
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }

    // Validate currency
    const allCurrencies = [...Escrow.SUPPORTED_CURRENCIES.FIAT, ...Escrow.SUPPORTED_CURRENCIES.CRYPTO];
    if (!allCurrencies.includes(currency)) {
      return res.status(400).json({ success: false, message: `Unsupported currency` });
    }

    // Validate transaction type
    if (transactionType && !Object.values(Escrow.ESCROW_TYPES).includes(transactionType)) {
      return res.status(400).json({ success: false, message: `Invalid transaction type` });
    }

    // Find seller
    const seller = await User.findOne({ email: sellerEmail.toLowerCase() });
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    if (seller._id.toString() === buyerId) {
      return res.status(400).json({ success: false, message: 'Cannot create escrow with yourself' });
    }

    // Get buyer
    const buyer = await User.findById(buyerId);
    if (!buyer || !buyer.hasBankAccount) {
      return res.status(403).json({
        success: false,
        message: 'Bank account required',
        requiresVerification: true,
        verificationType: 'bank_account'
      });
    }

    // Check tier limits
    const canCreate = buyer.canCreateTransaction(parsedAmount, currency);
    if (!canCreate.allowed) {
      return res.status(403).json({
        success: false,
        message: canCreate.reason,
        upgradeRequired: true,
        currentTier: buyer.tier
      });
    }

    // Check milestone support
    if (milestones && milestones.length > 0) {
      const tierLimits = buyer.getTierLimits();
      if (!tierLimits.milestonePayments) {
        return res.status(403).json({
          success: false,
          message: 'Milestone payments require Growth tier or higher',
          upgradeRequired: true
        });
      }
    }

    // Calculate fees
    const feeBreakdown = await feeConfig.calculateSimpleFees(parsedAmount, currency);

    // FIX: Guard fee percentages against NaN/undefined.
    // calculateSimpleFees can return undefined percentages if tier data is missing,
    // and Mongoose's Number type will throw "Cast to Number failed for value NaN".
    const safeBuyerFeePercentage = (feeBreakdown && !isNaN(feeBreakdown.buyerFeePercentage))
      ? feeBreakdown.buyerFeePercentage : 0;
    const safeSellerFeePercentage = (feeBreakdown && !isNaN(feeBreakdown.sellerFeePercentage))
      ? feeBreakdown.sellerFeePercentage : 0;

    // FIX: shippingAddress arrives as a JSON string when sent via FormData.
    // Parse it back to an object before passing to Mongoose, which expects an object.
    let parsedShippingAddress;
    if (shippingAddress) {
      if (typeof shippingAddress === 'string') {
        try {
          parsedShippingAddress = JSON.parse(shippingAddress);
        } catch (e) {
          parsedShippingAddress = undefined;
        }
      } else if (typeof shippingAddress === 'object') {
        parsedShippingAddress = shippingAddress;
      }
      // If parsed result is empty object or has no street, treat as undefined
      if (parsedShippingAddress && !parsedShippingAddress.street) {
        parsedShippingAddress = undefined;
      }
    }

    // Handle attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        url: file.path,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: buyerId,
        uploadedByRole: 'buyer',
        uploadedAt: new Date()
      }));
    }

    // Build participants
    const escrowParticipants = [
      {
        user: buyerId,
        role: 'buyer',
        status: 'accepted',
        hasApproved: true,
        approvedAt: new Date()
      },
      {
        user: seller._id,
        role: 'seller',
        status: 'invited',
        invitedAt: new Date()
      }
    ];

    // Add optional participants
    if (agentEmail) {
      const agent = await User.findOne({ email: agentEmail.toLowerCase() });
      if (agent && agent.capabilities?.canBeAgent) {
        escrowParticipants.push({
          user: agent._id,
          role: 'agent',
          status: 'invited',
          invitedAt: new Date()
        });
      }
    }

    if (inspectorEmail) {
      const inspector = await User.findOne({ email: inspectorEmail.toLowerCase() });
      if (inspector && inspector.capabilities?.canBeInspector) {
        escrowParticipants.push({
          user: inspector._id,
          role: 'inspector',
          status: 'invited',
          invitedAt: new Date()
        });
      }
    }

    if (arbitratorEmail) {
      const arbitrator = await User.findOne({ email: arbitratorEmail.toLowerCase() });
      if (arbitrator && arbitrator.capabilities?.canBeArbitrator) {
        escrowParticipants.push({
          user: arbitrator._id,
          role: 'arbitrator',
          status: 'invited',
          invitedAt: new Date()
        });
      }
    }

    // Process milestones
    let processedMilestones = [];
    if (milestones && milestones.length > 0) {
      const parsedMilestones = typeof milestones === 'string' ? JSON.parse(milestones) : milestones;
      const totalMilestoneAmount = parsedMilestones.reduce((sum, m) => sum + parseFloat(m.amount), 0);
      if (Math.abs(totalMilestoneAmount - parsedAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Milestone amounts must sum to total amount`
        });
      }

      processedMilestones = parsedMilestones.map((m, index) => ({
        id: `MS${Date.now()}${index}`,
        title: m.title,
        description: m.description || '',
        amount: parseFloat(m.amount),
        percentage: (parseFloat(m.amount) / parsedAmount) * 100,
        deliverables: m.deliverables || [],
        dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
        status: 'pending'
      }));
    }

    // Determine currency type
    const determinedCurrencyType = currencyType ||
      (Escrow.SUPPORTED_CURRENCIES.CRYPTO.includes(currency) ? 'crypto' : 'fiat');

    // Process tags
    let parsedTags = tags;
    if (typeof tags === 'string') {
      try { parsedTags = JSON.parse(tags); } catch(e) { parsedTags = []; }
    }

    // Create escrow
    const escrowData = {
      title: title.trim(),
      description: description.trim(),
      amount: parsedAmount,
      currency,
      currencyType: determinedCurrencyType,
      transactionType: transactionType || 'custom',
      buyer: buyerId,
      seller: seller._id,
      buyerTier: buyer.tier,
      sellerTier: seller.tier,
      participants: escrowParticipants,
      milestones: processedMilestones,
      currentMilestone: processedMilestones.length > 0 ? 0 : undefined,
      category: category || 'other',
      delivery: {
        method: deliveryMethod || 'physical',
        shippingAddress: parsedShippingAddress,
        autoReleaseEnabled: autoReleaseDays ? true : false,
        autoReleaseDays: autoReleaseDays || 7
      },
      payment: {
        amount: feeBreakdown?.amount ?? parsedAmount,
        buyerFee: feeBreakdown?.buyerFee ?? 0,
        sellerFee: feeBreakdown?.sellerFee ?? 0,
        platformFee: feeBreakdown?.totalPlatformFee ?? 0,
        buyerPays: feeBreakdown?.buyerPays ?? parsedAmount,
        sellerReceives: feeBreakdown?.sellerReceives ?? parsedAmount,
        buyerFeePercentage: safeBuyerFeePercentage,
        sellerFeePercentage: safeSellerFeePercentage,
        remainingAmount: parsedAmount
      },
      attachments,
      terms: {
        customTerms: customTerms || undefined,
        agreedByBuyer: true,
        buyerAgreedAt: new Date(),
        inspectionPeriodDays: inspectionPeriodDays || 3
      },
      metadata: metadata || {},
      tags: parsedTags || [],
      timeline: [{
        status: 'pending',
        timestamp: new Date(),
        actor: buyerId,
        actorRole: 'buyer',
        note: 'Escrow created by buyer'
      }]
    };

    const escrow = await Escrow.create(escrowData);

    // Update buyer stats
    buyer.monthlyUsage.transactionCount += 1;
    buyer.stats.totalTransactions += 1;
    buyer.stats.asBuyer.totalTransactions += 1;
    await buyer.save();

    // Notify participants
    await createNotification(
      seller._id,
      'escrow_created',
      'New Escrow Request',
      `${buyer.name} created an escrow: "${title}"`,
      `/escrow/${escrow._id}`,
      { escrowId: escrow._id, amount: parsedAmount, currency }
    );

    for (const participant of escrowParticipants) {
      if (participant.role !== 'buyer' && participant.role !== 'seller') {
        await createNotification(
          participant.user,
          'escrow_invitation',
          `Invited as ${participant.role}`,
          `You've been invited to participate as ${participant.role}`,
          `/escrow/${escrow._id}`,
          { escrowId: escrow._id, role: participant.role }
        );
      }
    }

    await escrow.populate([
      { path: 'buyer', select: 'name email profilePicture tier' },
      { path: 'seller', select: 'name email profilePicture tier' },
      { path: 'participants.user', select: 'name email profilePicture capabilities' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Escrow created successfully',
      data: {
        escrow: {
          ...escrow.toObject(),
          feeBreakdown,
          buyerTier: buyer.tier,
          tierLimits: buyer.getTierLimits()
        }
      }
    });

  } catch (error) {
    console.error('Create escrow error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create escrow' });
  }
};

// ==================== MILESTONE MANAGEMENT ====================
exports.addMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, amount, percentage, deliverables, dueDate } = req.body;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    if (escrow.buyer.toString() !== userId && escrow.seller.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['pending', 'accepted'].includes(escrow.status)) {
      return res.status(400).json({ success: false, message: 'Cannot add milestones after funding' });
    }

    await escrow.addMilestone({ title, description, amount, percentage, deliverables, dueDate });
    await escrow.populate('buyer seller', 'name email');

    res.json({ success: true, message: 'Milestone added', data: { escrow } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add milestone' });
  }
};

exports.submitMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);
    if (!escrow || escrow.seller.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const milestone = escrow.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    milestone.status = 'submitted';
    milestone.submittedAt = new Date();

    if (req.files) {
      milestone.attachments = req.files.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
        url: f.path,
        uploadedAt: new Date(),
        uploadedBy: userId
      }));
    }

    escrow.timeline.push({
      status: 'milestone_submitted',
      actor: userId,
      actorRole: 'seller',
      note: `Milestone "${milestone.title}" submitted`,
      timestamp: new Date()
    });

    await escrow.save();
    await createNotification(escrow.buyer, 'milestone_submitted', 'Milestone Ready',
      `Seller submitted: "${milestone.title}"`, `/escrow/${escrow._id}`, { escrowId: escrow._id });

    res.json({ success: true, message: 'Milestone submitted', data: { escrow, milestone } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit milestone' });
  }
};

exports.approveMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);
    if (!escrow || escrow.buyer.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await escrow.updateMilestone(milestoneId, 'approved');
    const milestone = escrow.milestones.find(m => m.id === milestoneId);

    escrow.timeline.push({
      status: 'milestone_approved',
      actor: userId,
      actorRole: 'buyer',
      note: `Milestone "${milestone.title}" approved`,
      timestamp: new Date()
    });

    const approvedIndex = escrow.milestones.findIndex(m => m.id === milestoneId);
    if (approvedIndex !== -1) escrow.currentMilestone = approvedIndex + 1;

    const allApproved = escrow.milestones.every(m => ['approved', 'paid'].includes(m.status));
    if (allApproved) escrow.status = 'completed';

    await escrow.save();
    await createNotification(escrow.seller, 'milestone_approved', 'Milestone Approved',
      `Buyer approved: "${milestone.title}"`, `/escrow/${escrow._id}`, { escrowId: escrow._id });

    res.json({ success: true, message: 'Milestone approved', data: { escrow, milestone } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve milestone' });
  }
};

exports.rejectMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const userId = req.user.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason required' });
    }

    const escrow = await Escrow.findById(id);
    if (!escrow || escrow.buyer.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await escrow.updateMilestone(milestoneId, 'rejected', { rejectionReason });
    const milestone = escrow.milestones.find(m => m.id === milestoneId);

    escrow.timeline.push({
      status: 'milestone_rejected',
      actor: userId,
      actorRole: 'buyer',
      note: `Milestone "${milestone.title}" rejected: ${rejectionReason}`,
      timestamp: new Date()
    });

    await escrow.save();
    await createNotification(escrow.seller, 'milestone_rejected', 'Milestone Rejected',
      `Buyer rejected: "${milestone.title}"`, `/escrow/${escrow._id}`, { escrowId: escrow._id });

    res.json({ success: true, message: 'Milestone rejected', data: { escrow, milestone } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject milestone' });
  }
};

// ==================== PARTICIPANT MANAGEMENT ====================
exports.addParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { email, role, compensation, compensationPercentage } = req.body;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    if (escrow.buyer.toString() !== userId && escrow.seller.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const participant = await User.findOne({ email: email.toLowerCase() });
    if (!participant || !participant.canParticipateAs(role)) {
      return res.status(400).json({ success: false, message: 'User not authorized for this role' });
    }

    await escrow.addParticipant(participant._id, role, compensation || 0, compensationPercentage || 0);
    await createNotification(participant._id, 'escrow_invitation', `Invited as ${role}`,
      `You've been invited as ${role}`, `/escrow/${escrow._id}`, { escrowId: escrow._id, role });

    res.json({ success: true, message: `${role} added`, data: { escrow } });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.acceptInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    const participant = escrow.participants.find(
      p => p.user.toString() === userId && p.status === 'invited'
    );

    if (!participant) {
      return res.status(404).json({ success: false, message: 'No invitation found' });
    }

    participant.status = 'accepted';
    participant.respondedAt = new Date();
    escrow.timeline.push({
      status: 'participant_accepted',
      actor: userId,
      actorRole: participant.role,
      note: `${participant.role} accepted`,
      timestamp: new Date()
    });

    await escrow.save();
    await createNotification(escrow.buyer, 'participant_accepted', `${participant.role} Accepted`,
      `${participant.role} accepted invitation`, `/escrow/${escrow._id}`, { escrowId: escrow._id });

    res.json({ success: true, message: 'Invitation accepted', data: { escrow } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to accept invitation' });
  }
};

exports.declineInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    const participant = escrow.participants.find(
      p => p.user.toString() === userId && p.status === 'invited'
    );

    if (!participant) {
      return res.status(404).json({ success: false, message: 'No invitation found' });
    }

    participant.status = 'declined';
    participant.respondedAt = new Date();

    await escrow.save();
    res.json({ success: true, message: 'Invitation declined' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to decline invitation' });
  }
};

// ==================== INSPECTION ====================
exports.scheduleInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { inspectorEmail, scheduledDate, fee } = req.body;

    const escrow = await Escrow.findById(id);
    if (!escrow || escrow.buyer.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const inspector = await User.findOne({ email: inspectorEmail.toLowerCase() });
    if (!inspector || !inspector.capabilities?.canBeInspector) {
      return res.status(404).json({ success: false, message: 'Inspector not found' });
    }

    await escrow.scheduleInspection(inspector._id, new Date(scheduledDate), fee || 0);
    await createNotification(inspector._id, 'inspection_scheduled', 'Inspection Scheduled',
      `Assigned to inspect: "${escrow.title}"`, `/escrow/${escrow._id}`, { escrowId: escrow._id });

    res.json({ success: true, message: 'Inspection scheduled', data: { escrow } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to schedule inspection' });
  }
};

exports.completeInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { summary, details, passed, issues, recommendations } = req.body;

    const escrow = await Escrow.findById(id);
    if (!escrow || !escrow.inspection.inspector ||
        escrow.inspection.inspector.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let photos = [];
    if (req.files) photos = req.files.map(f => f.path);

    const report = { summary, details, photos, passed, issues, recommendations };
    await escrow.completeInspection(report);
    await createNotification(escrow.buyer, 'inspection_completed', 'Inspection Completed',
      `Inspection ${passed ? 'passed' : 'failed'}`, `/escrow/${escrow._id}`, { escrowId: escrow._id });

    res.json({ success: true, message: 'Inspection completed', data: { escrow } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to complete inspection' });
  }
};

// ==================== ESCROW QUERIES ====================
exports.getMyEscrows = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20, role = 'all', search = '', transactionType } = req.query;

    // Build the user-ownership condition
    let ownershipCondition = {};
    if (role === 'buyer') {
      ownershipCondition = { buyer: userId };
    } else if (role === 'seller') {
      ownershipCondition = { seller: userId };
    } else if (role === 'all') {
      ownershipCondition = {
        $or: [
          { buyer: userId },
          { seller: userId },
          { 'participants.user': userId }
        ]
      };
    } else {
      ownershipCondition = {
        'participants.user': userId,
        'participants.role': role
      };
    }

    // Build additional filters separately so they never overwrite $or
    const filters = {};
    if (status && status !== 'all') filters.status = status;
    if (transactionType) filters.transactionType = transactionType;

    // FIX: Previously `if (search) query.$or = [...]` overwrote the ownership $or,
    // making ALL escrows vanish for the user whenever a search term was present.
    // Use $and to combine ownership condition with search so both must be satisfied.
    let query;
    if (search && search.trim()) {
      query = {
        $and: [
          ownershipCondition,
          {
            $or: [
              { title: { $regex: search.trim(), $options: 'i' } },
              { description: { $regex: search.trim(), $options: 'i' } }
            ]
          },
          filters
        ]
      };
    } else {
      query = { ...ownershipCondition, ...filters };
    }

    const escrows = await Escrow.find(query)
      .populate('buyer seller participants.user', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Escrow.countDocuments(query);

    res.json({
      success: true,
      data: {
        escrows,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch escrows' });
  }
};

exports.getEscrowById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let escrow = mongoose.Types.ObjectId.isValid(id)
      ? await Escrow.findById(id)
      : await Escrow.findOne({ escrowId: id });

    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    if (!escrow.canUserAccess(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await escrow.populate([
      { path: 'buyer seller', select: 'name email profilePicture phone' },
      { path: 'participants.user', select: 'name email profilePicture capabilities' },
      { path: 'inspection.inspector dispute.arbitrator', select: 'name email' }
    ]);

    const formattedEscrow = {
      ...escrow.toObject(),
      amount: escrow.amount ? parseFloat(escrow.amount.toString()) : 0,
      payment: escrow.payment ? {
        ...escrow.payment,
        amount: escrow.payment.amount ? parseFloat(escrow.payment.amount.toString()) : 0,
        buyerPays: escrow.payment.buyerPays ? parseFloat(escrow.payment.buyerPays.toString()) : 0,
        sellerReceives: escrow.payment.sellerReceives ? parseFloat(escrow.payment.sellerReceives.toString()) : 0,
        buyerFee: escrow.payment.buyerFee ? parseFloat(escrow.payment.buyerFee.toString()) : 0,
        sellerFee: escrow.payment.sellerFee ? parseFloat(escrow.payment.sellerFee.toString()) : 0
      } : {}
    };

    // FIX: getUserRoles only checks participants[]. Derive role from top-level buyer/seller too.
    const buyerIdStr = escrow.buyer?._id?.toString() || escrow.buyer?.toString();
    const sellerIdStr = escrow.seller?._id?.toString() || escrow.seller?.toString();
    let derivedUserRole = escrow.getUserRoles(userId);
    if (!derivedUserRole.length) {
      if (buyerIdStr === userId.toString()) derivedUserRole = ['buyer'];
      else if (sellerIdStr === userId.toString()) derivedUserRole = ['seller'];
    }

    res.json({
      success: true,
      data: {
        escrow: formattedEscrow,
        userRole: derivedUserRole,
        requiresAction: escrow.requiresUserAction(userId)
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch escrow' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const allEscrows = await Escrow.find({
      $or: [{ buyer: userId }, { seller: userId }, { 'participants.user': userId }]
    });

    const stats = {
      total: allEscrows.length,
      buying: {
        total: allEscrows.filter(e => e.buyer.toString() === userId).length,
        pending: allEscrows.filter(e => e.buyer.toString() === userId && e.status === 'pending').length,
        funded: allEscrows.filter(e => e.buyer.toString() === userId && e.status === 'funded').length,
        completed: allEscrows.filter(e => e.buyer.toString() === userId && e.status === 'completed').length
      },
      selling: {
        total: allEscrows.filter(e => e.seller.toString() === userId).length,
        pending: allEscrows.filter(e => e.seller.toString() === userId && e.status === 'pending').length,
        delivered: allEscrows.filter(e => e.seller.toString() === userId && e.status === 'delivered').length,
        completed: allEscrows.filter(e => e.seller.toString() === userId && e.status === 'completed').length
      },
      asAgent: allEscrows.filter(e => e.participants?.some(p => p.user.toString() === userId && p.role === 'agent')).length,
      asArbitrator: allEscrows.filter(e => e.participants?.some(p => p.user.toString() === userId && p.role === 'arbitrator')).length,
      asInspector: allEscrows.filter(e => e.participants?.some(p => p.user.toString() === userId && p.role === 'inspector')).length,
      disputed: allEscrows.filter(e => e.status === 'disputed').length,
      requiresAction: allEscrows.filter(e => e.requiresUserAction && e.requiresUserAction(userId)).length
    };

    res.json({ success: true, data: stats });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

exports.acceptEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    const isSeller = escrow.seller.toString() === userId;
    const participant = escrow.participants.find(p => p.user.toString() === userId);

    if (!isSeller && !participant) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (isSeller && escrow.status === 'pending') {
      escrow.status = 'accepted';
      escrow.chatUnlocked = true;
      escrow.timeline.push({
        status: 'accepted',
        timestamp: new Date(),
        actor: userId,
        actorRole: 'seller',
        note: 'Accepted by seller'
      });
    }

    if (participant) {
      participant.status = 'accepted';
      participant.hasApproved = true;
      participant.approvedAt = new Date();
    }

    await escrow.save();
    await escrow.populate('buyer seller participants.user', 'name email');

    res.json({
      success: true,
      message: 'Escrow accepted',
      data: { escrow: escrow.toObject() }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to accept escrow' });
  }
};

exports.calculateFeePreview = async (req, res) => {
  try {
    const { amount, currency = 'USD', transactionType } = req.query;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }

    const allCurrencies = [
      'USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR', 'INR', 'CNY', 'JPY', 'CAD', 'AUD',
      'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'MATIC'
    ];
    if (!allCurrencies.includes(currency)) {
      return res.status(400).json({ success: false, message: 'Unsupported currency' });
    }

    const user = await User.findById(userId);
    const parsedAmount = parseFloat(amount);
    const feeBreakdown = await feeConfig.calculateSimpleFees(parsedAmount, currency);

    // FIX: getTierInfo does not exist on feeConfig — call isAmountWithinLimit safely
    let withinLimit = true;
    try {
      withinLimit = await feeConfig.isAmountWithinLimit(parsedAmount, currency, user?.tier || 'starter');
    } catch (e) {
      withinLimit = true; // default to allowed if check fails
    }

    if (!feeBreakdown) {
      return res.status(500).json({ success: false, message: 'Fee calculation failed' });
    }

    res.json({
      success: true,
      data: {
        feeBreakdown,
        userTier: user?.tier || 'starter',
        withinLimit,
        upgradeAvailable: !withinLimit,
        currency
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate fees' });
  }
};

exports.checkCanCreateEscrow = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, currency = 'USD' } = req.query;

    const user = await User.findById(userId).select('+kycStatus');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const checks = {
      emailVerified: user.verified,
      kycVerified: user.isKYCVerified && user.kycStatus?.status === 'approved',
      kycStatus: user.kycStatus?.status || 'unverified',
      hasBankAccount: user.hasBankAccount,
      tier: user.tier
    };

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
    } else if (!checks.hasBankAccount) {
      canCreate = false;
      blockingReason = 'Bank account required';
      requiresAction = 'add_bank_account';
    }

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
    res.status(500).json({ success: false, message: 'Failed to check eligibility' });
  }
};

// ==================== ESCROW ACTIONS ====================
exports.fundEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    if (escrow.buyer.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only buyer can fund' });
    }

    if (escrow.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Cannot fund in current status' });
    }

    escrow.status = 'funded';
    escrow.payment.paidAt = new Date();
    escrow.timeline.push({
      status: 'funded',
      timestamp: new Date(),
      actor: userId,
      actorRole: 'buyer',
      note: 'Escrow funded by buyer'
    });

    await escrow.save();
    await escrow.populate('buyer seller', 'name email');

    res.json({
      success: true,
      message: 'Escrow funded',
      data: { escrow: escrow.toObject() }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fund escrow' });
  }
};

exports.markDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    if (escrow.seller.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only seller can mark delivered' });
    }

    if (escrow.status !== 'funded') {
      return res.status(400).json({ success: false, message: 'Cannot mark delivered in current status' });
    }

    escrow.status = 'delivered';
    escrow.delivery.deliveredAt = new Date();

    if (escrow.delivery.autoReleaseEnabled) {
      const autoReleaseDays = escrow.delivery.autoReleaseDays || 7;
      escrow.delivery.autoReleaseAt = new Date(Date.now() + autoReleaseDays * 24 * 60 * 60 * 1000);
    }

    escrow.timeline.push({
      status: 'delivered',
      timestamp: new Date(),
      actor: userId,
      actorRole: 'seller',
      note: 'Item delivered by seller'
    });

    await escrow.save();
    await escrow.populate('buyer seller', 'name email');

    res.json({
      success: true,
      message: 'Marked as delivered',
      data: { escrow: escrow.toObject() }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark delivered' });
  }
};

exports.confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    if (escrow.buyer.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only buyer can confirm' });
    }

    if (escrow.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot confirm in current status' });
    }

    escrow.status = 'completed';
    escrow.delivery.confirmedAt = new Date();
    escrow.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      actor: userId,
      actorRole: 'buyer',
      note: 'Delivery confirmed by buyer'
    });

    await escrow.save();
    await escrow.populate('buyer seller', 'name email');

    res.json({
      success: true,
      message: 'Delivery confirmed',
      data: { escrow: escrow.toObject() }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to confirm delivery' });
  }
};

exports.raiseDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason, description } = req.body;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    const isBuyer = escrow.buyer.toString() === userId;
    const isSeller = escrow.seller.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ success: false, message: 'Only participants can raise disputes' });
    }

    if (!['accepted', 'funded', 'delivered'].includes(escrow.status)) {
      return res.status(400).json({ success: false, message: 'Cannot dispute in current status' });
    }

    let evidence = [];
    if (req.files && req.files.length > 0) {
      evidence = req.files.map(f => f.path);
    }

    const userRole = isBuyer ? 'buyer' : 'seller';
    await escrow.raiseDispute(userId, userRole, reason, description, evidence);

    await escrow.populate('buyer seller', 'name email');

    res.json({
      success: true,
      message: 'Dispute raised',
      data: { escrow: escrow.toObject() }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to raise dispute' });
  }
};

exports.cancelEscrow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    const isBuyer = escrow.buyer.toString() === userId;
    const isSeller = escrow.seller.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ success: false, message: 'Only participants can cancel' });
    }

    if (!['pending', 'accepted'].includes(escrow.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel in current status' });
    }

    escrow.status = 'cancelled';
    escrow.cancelledAt = new Date();
    escrow.cancelledBy = userId;
    escrow.cancellationReason = reason;

    escrow.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      actor: userId,
      actorRole: isBuyer ? 'buyer' : 'seller',
      note: `Cancelled: ${reason || 'No reason provided'}`
    });

    await escrow.save();
    await escrow.populate('buyer seller', 'name email');

    res.json({
      success: true,
      message: 'Escrow cancelled',
      data: { escrow: escrow.toObject() }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel escrow' });
  }
};

exports.uploadDeliveryProof = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      method, courierName, trackingNumber, vehicleType, plateNumber,
      driverName, gpsEnabled, methodDescription, estimatedDelivery,
      additionalNotes
    } = req.body;

    const escrow = await Escrow.findById(id);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found' });
    }

    if (escrow.seller.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only seller can upload proof' });
    }

    if (!['funded', 'accepted'].includes(escrow.status)) {
      return res.status(400).json({ success: false, message: 'Cannot upload proof in current status' });
    }

    let packagePhotos = [];
    if (req.files && req.files.length > 0) {
      packagePhotos = req.files.map(f => f.path);
    }

    escrow.delivery.proof = {
      method: method || 'other',
      courierName,
      trackingNumber,
      vehicleType,
      plateNumber,
      driverName,
      gpsEnabled: gpsEnabled === 'true',
      methodDescription,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
      packagePhotos,
      additionalNotes,
      submittedAt: new Date(),
      submittedBy: userId
    };

    escrow.timeline.push({
      status: 'delivery_proof_uploaded',
      timestamp: new Date(),
      actor: userId,
      actorRole: 'seller',
      note: 'Delivery proof uploaded'
    });

    await escrow.save();
    await escrow.populate('buyer seller', 'name email');

    res.json({
      success: true,
      message: 'Delivery proof uploaded',
      data: { escrow: escrow.toObject() }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload proof' });
  }
};

exports.getGPSTracking = async (req, res) => {
  try {
    const { gpsTrackingId } = req.params;
    const userId = req.user.id;

    const escrow = await Escrow.findOne({ 'delivery.gpsTrackingId': gpsTrackingId });
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'Tracking not found' });
    }

    if (!escrow.canUserAccess(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        trackingId: gpsTrackingId,
        delivery: escrow.delivery,
        status: escrow.status,
        escrowId: escrow._id
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tracking' });
  }
};

module.exports = exports;
