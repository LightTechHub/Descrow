// backend/controllers/kyc.controller.js
// Parallel verification flow:
//   - DiDIT and document upload are INDEPENDENT — no blocking
//   - Business user can upload documents regardless of DiDIT result
//   - Admin reviews both together
//   - Status reflects actual state honestly — no fake completions

const User = require('../models/User.model');
const diditService = require('../services/didit.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads/kyc/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Multer config ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${req.user._id}_${Date.now()}_${file.fieldname}_${sanitized}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext  = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  const okExt  = ['.jpeg', '.jpg', '.png', '.pdf'];
  const okMime = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (okExt.includes(ext) && okMime.includes(mime)) return cb(null, true);
  cb(new Error('Invalid file type. Only JPEG, PNG, and PDF allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter
}).fields([
  { name: 'businessRegistration', maxCount: 1 },
  { name: 'directorId',           maxCount: 1 },
  { name: 'proofOfAddress',       maxCount: 1 },
  { name: 'taxDocument',          maxCount: 1 },
  { name: 'additionalDoc',        maxCount: 1 }
]);

// ==================== INITIATE KYC ====================
exports.initiateKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isKYCVerified) return res.status(400).json({ success: false, message: 'KYC already verified' });
    if (!user.verified) {
      return res.status(400).json({ success: false, message: 'Please verify your email first', action: 'verify_email' });
    }

    const accountType = user.accountType || 'individual';
    console.log(`📋 Initiating ${accountType} verification for user:`, user._id);

    // Reuse existing valid session
    if (user.kycStatus?.status === 'pending' || user.kycStatus?.status === 'in_progress') {
      const expiry = user.kycStatus.diditSessionExpiresAt;
      if (expiry && new Date() < new Date(expiry)) {
        return res.json({
          success: true,
          message: 'Verification already in progress',
          data: {
            verificationUrl:    user.kycStatus.diditVerificationUrl,
            sessionId:          user.kycStatus.diditSessionId,
            status:             user.kycStatus.status,
            expiresAt:          user.kycStatus.diditSessionExpiresAt,
            accountType,
            verificationMethod: 'didit'
          }
        });
      }
    }

    // Create DiDIT session — no country check, all accounts
    const verification = await diditService.createVerificationSession(user._id, {
      email:        user.email,
      phone:        user.phone,
      tier:         user.tier,
      accountType,
      businessInfo: accountType === 'business' ? user.businessInfo : null
    });

    // DiDIT unavailable — for business, let them proceed to document upload only
    if (!verification.success) {
      console.warn('⚠️  DiDIT session creation failed:', verification.message);

      if (accountType === 'business') {
        // Don't block document upload — just flag DiDIT as unavailable
        user.kycStatus = {
          ...user.kycStatus,
          diditError:  verification.message,
          accountType: 'business'
        };
        // Only set status if it hasn't been set to something meaningful yet
        if (!user.kycStatus.status || user.kycStatus.status === 'unverified') {
          user.kycStatus.status = 'pending_documents';
        }
        await user.save();

        return res.json({
          success: true,
          message: 'Automated verification is temporarily unavailable. Please upload your business documents.',
          data: {
            verificationType: 'manual',
            accountType:      'business',
            status:           user.kycStatus.status
          }
        });
      }

      return res.status(500).json({
        success: false,
        message: verification.message || 'Failed to create verification session',
        error:   verification.error
      });
    }

    // DiDIT session created — update status, preserve any existing document data
    user.kycStatus = {
      ...user.kycStatus,             // preserve documents if already uploaded
      status:                'pending',
      submittedAt:           user.kycStatus?.submittedAt || new Date(),
      diditSessionId:        verification.data.sessionId,
      diditVerificationUrl:  verification.data.verificationUrl,
      diditSessionExpiresAt: verification.data.expiresAt,
      accountType,
      verificationMethod:    'didit'
    };
    await user.save();

    console.log(`✅ ${accountType} DiDIT session created:`, verification.data.sessionId);

    res.json({
      success: true,
      message: `${accountType === 'business' ? 'Business' : 'Identity'} verification session created`,
      data: {
        verificationUrl:    verification.data.verificationUrl,
        sessionId:          verification.data.sessionId,
        expiresAt:          verification.data.expiresAt,
        accountType,
        verificationMethod: 'didit'
      }
    });

  } catch (error) {
    console.error('❌ KYC initiation error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate KYC verification', error: error.message });
  }
};

// ==================== UPLOAD BUSINESS DOCUMENTS ====================
// Always available for business accounts regardless of DiDIT status
exports.uploadBusinessDocuments = [
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: 'File upload error', error: err.message });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message || 'Invalid file upload' });
      }
      next();
    });
  },

  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      if (user.accountType !== 'business') {
        return res.status(400).json({ success: false, message: 'This endpoint is only for business accounts' });
      }
      if (user.isKYCVerified) {
        return res.status(400).json({ success: false, message: 'Business already fully verified' });
      }
      if (!req.files?.businessRegistration || !req.files?.directorId || !req.files?.proofOfAddress) {
        return res.status(400).json({
          success: false,
          message: 'Business Registration, Director ID, and Proof of Address are required'
        });
      }

      const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
      const documents = [];

      const addDoc = (fileArr, type) => {
        if (fileArr?.[0]) {
          const f = fileArr[0];
          documents.push({
            type,
            url:          `${baseUrl}/api/kyc/documents/${f.filename}`,
            filepath:     f.path,
            filename:     f.filename,
            originalName: f.originalname,
            mimetype:     f.mimetype,
            size:         f.size,
            uploadedAt:   new Date()
          });
        }
      };

      addDoc(req.files.businessRegistration, 'business_registration');
      addDoc(req.files.directorId,           'director_id');
      addDoc(req.files.proofOfAddress,       'proof_of_address');
      addDoc(req.files.taxDocument,          'tax_document');
      addDoc(req.files.additionalDoc,        'additional_document');

      // Preserve DiDIT session data — just add documents on top
      user.kycStatus = {
        ...user.kycStatus,
        status:         'under_review',
        accountType:    'business',
        documents,
        reviewDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      };

      if (!user.businessInfo) user.businessInfo = {};
      user.businessInfo.documents      = documents;
      user.businessInfo.kycSubmittedAt = new Date();

      await user.save();
      console.log('✅ Business documents uploaded:', user.email, '| Count:', documents.length);

      res.json({
        success: true,
        message: 'Documents uploaded! Our team will review within 1-3 business days.',
        data: {
          status:            'under_review',
          documentsUploaded: documents.length,
          submittedAt:       user.kycStatus.submittedAt,
          reviewDeadline:    user.kycStatus.reviewDeadline,
          documents:         documents.map(d => ({ type: d.type, originalName: d.originalName, uploadedAt: d.uploadedAt }))
        }
      });

    } catch (error) {
      console.error('❌ Upload business documents error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload documents', error: error.message });
    }
  }
];

// ==================== GET KYC STATUS ====================
exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('isKYCVerified kycStatus verified tier accountType businessInfo country');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let externalStatus = null;
    if (user.kycStatus?.diditSessionId) {
      externalStatus = await diditService.getVerificationStatus(user.kycStatus.diditSessionId);
    }

    res.json({
      success: true,
      data: {
        isKYCVerified:      user.isKYCVerified,
        status:             user.kycStatus?.status || 'unverified',
        submittedAt:        user.kycStatus?.submittedAt,
        verifiedAt:         user.kycStatus?.verifiedAt,
        diditVerifiedAt:    user.kycStatus?.diditVerifiedAt,
        rejectionReason:    user.kycStatus?.rejectionReason,
        accountType:        user.accountType,
        isBusinessAccount:  user.accountType === 'business',
        verificationMethod: user.kycStatus?.verificationMethod || 'didit',
        sessionId:          user.kycStatus?.diditSessionId,
        verificationUrl:    user.kycStatus?.diditVerificationUrl,
        expiresAt:          user.kycStatus?.diditSessionExpiresAt,
        externalStatus:     externalStatus?.data || null,
        documents:          user.kycStatus?.documents || [],
        businessInfo:       user.accountType === 'business' ? user.businessInfo : null,
        reviewDeadline:     user.kycStatus?.reviewDeadline
      }
    });

  } catch (error) {
    console.error('❌ Get KYC status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get KYC status' });
  }
};

// ==================== DIDIT WEBHOOK ====================
exports.handleDiditWebhook = async (req, res) => {
  try {
    console.log('📥 DiDIT Webhook received:', req.body);

    if (req.headers['x-didit-signature'] && process.env.DIDIT_WEBHOOK_SECRET) {
      const isValid = diditService.verifyWebhookSignature(
        JSON.stringify(req.body),
        req.headers['x-didit-signature']
      );
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
    }

    const event  = await diditService.processWebhookEvent(req.body);
    const userId = event.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user ID' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const accountType = user.accountType || 'individual';
    console.log(`📝 DiDIT webhook: ${accountType} user ${userId} — event: ${event.type}`);

    if (event.type === 'completed' && event.verified) {

      if (accountType === 'business') {
        // Business: DiDIT passed but we still need document review.
        // If documents already uploaded → keep under_review.
        // If not yet → set pending_documents so they know to upload.
        const hasDocuments = user.kycStatus?.documents?.length > 0;
        user.kycStatus = {
          ...user.kycStatus,
          status:             hasDocuments ? 'under_review' : 'pending_documents',
          diditVerifiedAt:    new Date(),
          verificationResult: event.verificationData,
          accountType:        'business',
          verificationMethod: 'didit'
        };
        user.isKYCVerified = false; // Admin must approve after reviewing documents
        console.log(`✅ Business DiDIT passed. Documents uploaded: ${hasDocuments}. Status: ${user.kycStatus.status}`);

      } else {
        // Individual: DiDIT passed = fully verified
        user.kycStatus = {
          ...user.kycStatus,
          status:             'approved',
          verifiedAt:         new Date(),
          reviewedAt:         new Date(),
          verificationResult: event.verificationData,
          accountType:        'individual',
          verificationMethod: 'didit'
        };
        user.isKYCVerified = true;
        console.log('✅ Individual KYC approved:', userId);
      }

    } else if (event.type === 'failed') {
      // DiDIT failed — update status but DO NOT prevent document upload for business
      const hasDocuments = user.kycStatus?.documents?.length > 0;
      user.kycStatus = {
        ...user.kycStatus,
        // If business already submitted docs, keep under_review despite DiDIT failure
        status:             (accountType === 'business' && hasDocuments) ? 'under_review' : 'rejected',
        diditRejectedAt:    new Date(),
        rejectionReason:    event.failureReason || 'Identity verification failed',
        verificationResult: event.verificationData,
        accountType,
        verificationMethod: 'didit'
      };
      user.isKYCVerified = false;
      console.log(`❌ ${accountType} DiDIT failed. Has docs: ${hasDocuments}. Status: ${user.kycStatus.status}`);

    } else if (event.type === 'expired') {
      user.kycStatus = {
        ...user.kycStatus,
        status:          'expired',
        diditExpiredAt:  new Date(),
        rejectionReason: 'Verification session expired',
        accountType,
        verificationMethod: 'didit'
      };
      console.log(`⏰ ${accountType} session expired:`, userId);

    } else if (event.type === 'in_progress') {
      user.kycStatus = {
        ...user.kycStatus,
        status:             'in_progress',
        accountType,
        verificationMethod: 'didit'
      };
      console.log(`🔄 ${accountType} in progress:`, userId);
    }

    await user.save();
    res.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error: error.message });
  }
};

// ==================== RETRY KYC ====================
exports.retryKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const allowed = ['rejected', 'expired', 'pending', 'in_progress', 'under_review', 'pending_documents'];
    if (!allowed.includes(user.kycStatus?.status)) {
      return res.status(400).json({
        success: false,
        message: 'Retry not allowed in current status',
        currentStatus: user.kycStatus?.status || 'unverified'
      });
    }

    const previousStatus = user.kycStatus?.status;

    user.kycStatus = {
      status:                'unverified',
      verificationMethod:    'didit',
      accountType:           user.accountType || 'individual',
      diditSessionId:        null,
      diditVerificationUrl:  null,
      diditSessionExpiresAt: null,
      diditVerifiedAt:       null,
      documents:             [],
      reviewDeadline:        null
    };
    user.isKYCVerified = false;
    await user.save();

    console.log(`🔄 KYC reset for ${user.accountType} user ${user._id} — was: ${previousStatus}`);

    res.json({
      success: true,
      message: 'KYC reset. You can start fresh.',
      data: { userId: user._id, accountType: user.accountType, resetAt: new Date() }
    });

  } catch (error) {
    console.error('❌ Retry KYC error:', error);
    res.status(500).json({ success: false, message: 'Failed to retry KYC', error: error.message });
  }
};

// ==================== SERVE DOCUMENT ====================
exports.serveDocument = async (req, res) => {
  try {
    const { filename } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const hasAccess = user.kycStatus?.documents?.some(d => d.filename === filename);
    if (!hasAccess && !req.admin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const filepath = path.join(uploadDir, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fs.createReadStream(filepath).pipe(res);

  } catch (error) {
    console.error('❌ Serve document error:', error);
    res.status(500).json({ success: false, message: 'Failed to serve document' });
  }
};

// ==================== ADMIN: GET PENDING BUSINESS KYCs ====================
exports.adminGetPendingBusinessKYCs = async (req, res) => {
  try {
    const users = await User.find({
      accountType: 'business',
      'kycStatus.status': 'under_review'
    })
      .select('name email businessInfo.companyName kycStatus createdAt')
      .sort({ 'kycStatus.submittedAt': -1 });

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('❌ Get pending KYCs error:', error);
    res.status(500).json({ success: false, message: 'Failed to get pending KYCs' });
  }
};

// ==================== ADMIN: GET BUSINESS KYC DETAILS ====================
exports.adminGetBusinessKYCDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('name email accountType businessInfo kycStatus createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email, accountType: user.accountType, createdAt: user.createdAt },
        businessInfo: user.businessInfo,
        kycStatus:    user.kycStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get KYC details' });
  }
};

// ==================== ADMIN: APPROVE KYC ====================
exports.adminApproveKYC = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.kycStatus = {
      ...user.kycStatus,
      status:      'approved',
      verifiedAt:  new Date(),
      reviewedAt:  new Date(),
      reviewedBy:  req.admin?._id || req.user._id,
      reviewNotes: req.body.notes || 'Manually approved by admin',
      accountType: user.accountType
    };
    user.isKYCVerified = true;
    await user.save();

    console.log(`✅ Admin approved ${user.accountType} KYC:`, req.params.userId);

    res.json({
      success: true,
      message: 'KYC approved',
      data: { userId: req.params.userId, status: 'approved', accountType: user.accountType, verifiedAt: user.kycStatus.verifiedAt }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve KYC' });
  }
};

// ==================== ADMIN: REJECT KYC ====================
exports.adminRejectKYC = async (req, res) => {
  try {
    if (!req.body.reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.kycStatus = {
      ...user.kycStatus,
      status:          'rejected',
      reviewedAt:      new Date(),
      reviewedBy:      req.admin?._id || req.user._id,
      rejectionReason: req.body.reason,
      accountType:     user.accountType
    };
    user.isKYCVerified = false;
    await user.save();

    console.log(`❌ Admin rejected ${user.accountType} KYC:`, req.params.userId);

    res.json({
      success: true,
      message: 'KYC rejected',
      data: { userId: req.params.userId, status: 'rejected', reason: req.body.reason }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject KYC' });
  }
};

module.exports = exports;
