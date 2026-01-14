// backend/controllers/kyc.controller.js - FINAL MERGED VERSION
const User = require('../models/User.model');
const diditService = require('../services/didit.service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Ensure upload directory exists
const uploadDir = 'uploads/kyc/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure file upload (multer)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // ✅ SECURITY: Sanitize filename
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueName = `${req.user._id}_${Date.now()}_${file.fieldname}_${sanitizedOriginal}`;
    cb(null, uniqueName);
  }
});

// ✅ FIXED: Proper file filter
const fileFilter = (req, file, cb) => {
  // Check file extension
  const fileExt = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpeg', '.jpg', '.png', '.pdf'];
  
  // Check mime type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  
  if (allowedExtensions.includes(fileExt) && allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  
  cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed'));
};

const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5 // Max 5 files
  },
  fileFilter
}).fields([
  { name: 'businessRegistration', maxCount: 1 },
  { name: 'directorId', maxCount: 1 },
  { name: 'proofOfAddress', maxCount: 1 },
  { name: 'taxDocument', maxCount: 1 },
  { name: 'additionalDoc', maxCount: 1 }
]);

// ✅ Helper: Check if country supports DiDIT business verification
const getSupportedCountries = () => {
  // Countries where DiDIT business verification works
  return [
    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
    'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'AT', 'PT', 'LU'
  ];
};

// ✅ Helper: Get verification method based on account type and country
const getVerificationMethod = (accountType, country) => {
  if (accountType === 'individual') {
    return 'didit'; // Always use DiDIT for individuals
  }
  
  if (accountType === 'business') {
    const supportedCountries = getSupportedCountries();
    const countryCode = country?.toUpperCase();
    
    if (countryCode && supportedCountries.includes(countryCode)) {
      return 'didit'; // Use DiDIT for supported countries
    }
    
    return 'manual'; // Use manual for unsupported countries
  }
  
  return 'manual'; // Default to manual
};

// ==================== INITIATE KYC ====================
exports.initiateKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isKYCVerified) {
      return res.status(400).json({
        success: false,
        message: 'KYC already verified'
      });
    }

    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first',
        action: 'verify_email'
      });
    }

    const accountType = user.accountType || 'individual';
    const country = user.businessInfo?.country || user.country;

    console.log(`📋 Initiating ${accountType} verification for user:`, user._id);

    // ✅ Determine verification method based on account type and country
    const verificationMethod = getVerificationMethod(accountType, country);

    // ✅ BUSINESS ACCOUNT: Check if manual or DiDIT
    if (accountType === 'business') {
      if (verificationMethod === 'manual') {
        // Update status to pending_documents
        user.kycStatus = {
          status: 'pending_documents',
          submittedAt: new Date(),
          accountType: 'business',
          verificationMethod: 'manual'
        };
        
        await user.save();

        return res.json({
          success: true,
          message: 'Please upload your business documents for verification',
          data: {
            verificationType: 'manual',
            accountType: 'business',
            status: 'pending_documents',
            requiredDocuments: [
              { name: 'Business Registration', required: true, field: 'businessRegistration' },
              { name: 'Director/Owner ID', required: true, field: 'directorId' },
              { name: 'Proof of Business Address', required: true, field: 'proofOfAddress' },
              { name: 'Tax Document', required: false, field: 'taxDocument' },
              { name: 'Additional Document', required: false, field: 'additionalDoc' }
            ]
          }
        });
      } else {
        // Business in supported country - use DiDIT
        console.log('🌍 Business in supported country, using DiDIT');
      }
    }

    // ✅ DIET VERIFICATION FLOW (Individual OR Business in supported countries)
    if (user.kycStatus?.status === 'pending' || user.kycStatus?.status === 'in_progress') {
      const sessionExpiry = user.kycStatus.diditSessionExpiresAt;
      if (sessionExpiry && new Date() < sessionExpiry) {
        return res.json({
          success: true,
          message: 'Verification already in progress',
          data: {
            verificationUrl: user.kycStatus.diditVerificationUrl,
            sessionId: user.kycStatus.diditSessionId,
            status: user.kycStatus.status,
            expiresAt: user.kycStatus.diditSessionExpiresAt,
            accountType: accountType,
            verificationMethod: 'didit'
          }
        });
      }
    }

    // Create DiDIT verification session
    const verification = await diditService.createVerificationSession(user._id, {
      email: user.email,
      phone: user.phone,
      tier: user.tier,
      accountType: accountType,
      businessInfo: accountType === 'business' ? user.businessInfo : null
    });

    if (!verification.success) {
      // ✅ FALLBACK: If DiDIT fails for business, offer manual upload
      if (accountType === 'business') {
        user.kycStatus = {
          status: 'pending_documents',
          submittedAt: new Date(),
          accountType: 'business',
          verificationMethod: 'manual',
          diditError: verification.message
        };
        
        await user.save();

        return res.json({
          success: true,
          message: 'Please upload your business documents for verification',
          data: {
            verificationType: 'manual',
            accountType: 'business',
            status: 'pending_documents',
            requiredDocuments: [
              { name: 'Business Registration', required: true, field: 'businessRegistration' },
              { name: 'Director/Owner ID', required: true, field: 'directorId' },
              { name: 'Proof of Business Address', required: true, field: 'proofOfAddress' },
              { name: 'Tax Document', required: false, field: 'taxDocument' },
              { name: 'Additional Document', required: false, field: 'additionalDoc' }
            ]
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        message: verification.message || 'Failed to create verification session',
        error: verification.error
      });
    }

    user.kycStatus = {
      status: 'pending',
      submittedAt: new Date(),
      diditSessionId: verification.data.sessionId,
      diditVerificationUrl: verification.data.verificationUrl,
      diditSessionExpiresAt: verification.data.expiresAt,
      accountType: accountType,
      verificationMethod: 'didit'
    };

    await user.save();

    console.log(`✅ ${accountType} verification session created:`, verification.data.sessionId);

    res.json({
      success: true,
      message: `${accountType === 'business' ? 'Business' : 'Identity'} verification session created successfully`,
      data: {
        verificationUrl: verification.data.verificationUrl,
        sessionId: verification.data.sessionId,
        expiresAt: verification.data.expiresAt,
        accountType: accountType,
        verificationMethod: 'didit'
      }
    });

  } catch (error) {
    console.error('❌ KYC initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate KYC verification',
      error: error.message
    });
  }
};

// ==================== UPLOAD BUSINESS DOCUMENTS ====================
exports.uploadBusinessDocuments = [
  // ✅ FIXED: Proper error handling for multer
  (req, res, next) => {
    upload => {
    upload(req, res, function(err) {
      if (err instanceof mul(req, res, function(err) {
      if (err instanceof multer.Multerter.MulterError) {
        // Multer-specificError) {
        // Mul errors
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: err.message
        });
      } else if (err) {
        // Other errors
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid file upload'
        });
      }
      next();
    });
  },
  
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.accountType !== 'business') {
        return res.status(400).json({
          success: false,
          message: 'This endpoint is only for business accounts'
        });
      }

      if (user.isKYCVerified) {
        return res.status(400).json({
          success: false,
          message: 'Business already verified'
        });
      }

      // ✅ Check required documents
ter-specific errors
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: err.message
        });
      } else if (err) {
        // Other errors
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid file upload'
        });
      }
      next();
    });
  },
  
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.accountType !== 'business') {
        return res.status(400).json({
          success: false,
          message: 'This endpoint is only for business accounts'
        });
      }

      if (user.isKYCVerified) {
        return res.status(400).json({
          success: false,
          message: 'Business already verified'
        });
      }

      // ✅ Check required documents
      if (!req      if (!req.files || !req.files.b.files || !req.fusinessRegistration || !req.files.businessRegistration || !req.files.directoriles.directorId || !req.files.proofId || !req.files.proofOfAddress) {
        returnOfAddress) {
        return res.status(400).json({
          success: false,
          message res.status(400).json({
          success: false,
: '          message: 'Business Registration, Director ID, and Proof of AddressBusiness Registration, Director ID, and Proof of Address are required'
        });
      }

      // ✅ Build documents are required'
        });
      }

      // ✅ Build documents array with secure URLs
      array with secure URLs
      const documents const documents = [];
      const = [];
      const baseUrl baseUrl = process.env. = process.env.API_BASE_URL || 'http://API_BASE_URL || 'http://localhost:5000';

     localhost:5000';

      const addDocument = (fileArray, type) => {
        if (fileArray && fileArray[0]) {
          const file = fileArray[0];
          documents.push({
            type: type,
            url: `${baseUrl}/api/kyc/documents/${file.filename}`, // ✅ Secure URL via API
            filepath: file.path,
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date()
          });
        }
      };

      const addDocument = (fileArray, type) => {
        if (fileArray && fileArray[0]) {
          const file = fileArray[0];
          documents.push({
            type: type,
            url: `${baseUrl}/api/kyc/documents/${file.filename}`, // ✅ Secure URL via API
            filepath: file.path,
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date()
          });
        }
      };

      addDocument(req.f addDocument(req.files.biles.businessRegistration, 'usinessRegistration, 'business_registration');
      addDocument(req.files.directorIdbusiness_registration');
      addDocument(req.files.directorId, 'director_id');
, 'director_id');
      addDocument(req.files      addDocument(req.files.proofOfAddress, '.proofOfAddress, 'proof_of_address');
      addproof_of_address');
      addDocument(reqDocument(req.files.tax.files.taxDocument, 'tax_document');
     Document, 'tax_document');
      addDocument(req.f addDocument(req.files.adiles.additionalDoc, 'additional_dditionalDoc, 'additional_document');

      // ✅ Update user Kocument');

      // ✅ Update user KYC status
      user.kycStatus = {
        status: 'under_review',
        submittedAt: new Date(),
        accountType: 'business',
        verificationMethod: 'manual',
        documents: documents,
        reviewDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      };

      // ✅ Update business info documents
      if (!user.businessInfo) {
        user.businessInfo = {};
      }
      user.businessInfo.documents = documents;
      user.businessInfo.kycSubmittedAt = new Date();

      await user.save();

      console.log('✅ Business documents uploaded:', user.email, '| Docs:', documents.length);

     YC status
      user.kycStatus = {
        status: 'under_review',
        submittedAt: new Date(),
        accountType: 'business',
        verificationMethod: 'manual',
        documents: documents,
        reviewDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      };

      // ✅ Update business info documents
      if (!user.businessInfo) {
        user.businessInfo = {};
      }
      user.businessInfo.documents = documents;
      user.businessInfo.kycSubmittedAt = new Date();

      await user.save();

      console.log('✅ Business documents uploaded:', user.email, '| Docs:', res.json({
        success: true,
        message: 'Business documents documents.length);

      res.json({
        success: true,
        message uploaded successfully! Our team will review them within 1-3 business days.',
        data: {
          status: 'under_review',
          documentsUploaded: documents.length,
          submittedAt: user.kycStatus.submittedAt,
          reviewDeadline: user.kycStatus.reviewDeadline,
          documents: documents.map(d => ({
            type: d.type,
            originalName: d.originalName,
            uploadedAt: d.uploadedAt
          }))
        }
      });

    } catch (error) {
      console.error('❌ Upload business documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload documents',
        error: error.message
      });
    }
  }
];

// ==================== GET KYC STATUS ====================
exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('isKYCVerified kycStatus verified tier accountType businessInfo country');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If has DiDIT session, check current status
    let externalStatus = null;
    if (user.kycStatus?.diditSessionId) {
      externalStatus = await diditService.getVerificationStatus(
        user.kycStatus.diditSessionId
      );
    }

    res.json({
      success: true,
      data: {
        isKYCVerified: user.isKYCVerified,
        status: user.kycStatus?.status || 'unverified',
        submittedAt: user.kycStatus?.submittedAt,
        verifiedAt: user.kycStatus?.verifiedAt,
        rejectionReason: user.kycStatus?.rejectionReason,
        accountType: user.accountType,
        isBusinessAccount: user.accountType === 'business',
        verificationMethod: user.kycStatus?.verificationMethod || 'didit',
        
        // Individual KYC data
        sessionId: user.kycStatus?.diditSessionId,
        verificationUrl: user.kycStatus?.diditVerificationUrl,
        expiresAt: user.kycStatus?.diditSessionExpiresAt,
        externalStatus: externalStatus?.data || null,
        
        // Business KYC data
        documents: user.kycStatus?.documents || [],
        businessInfo: user.accountType === 'business' ? user.businessInfo : null,
        reviewDeadline: user.kycStatus?.reviewDeadline
      }
    });

  } catch (error) {
    console.error('❌ Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status'
    });
  }
};

// ==================== SERVE DOCUMENT ====================
exports.serveDocument = async (req, res) => {
  try {
    const { filename } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user has access to this document
    const userHasDocument = user.kycStatus?.documents?.some(doc => 
      doc.filename === filename
   : 'Business documents uploaded successfully! Our team will review them within 1-3 business days.',
        data: {
          status: 'under_review',
          documentsUploaded: documents.length,
          submittedAt: user.kycStatus.submittedAt,
          reviewDeadline: user.kycStatus.reviewDeadline,
          documents: documents.map(d => ({
            type: d.type,
            originalName: d.originalName,
            uploadedAt: d.uploadedAt
          }))
        }
      });

    } catch (error) {
      console.error('❌ Upload business documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload documents',
        error: error.message
      });
    }
  }
];

// ==================== GET KYC STATUS ====================
exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('isKYCVerified kycStatus verified tier accountType businessInfo country');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If has DiDIT session, check current status
    let externalStatus = null;
    if (user.kycStatus?.diditSessionId) {
      externalStatus = await diditService.getVerificationStatus(
        user.kycStatus.diditSessionId
      );
    }

    res.json({
      success: true,
      data: {
        isKYCVerified: user.isKYCVerified,
        status: user.kycStatus?.status || 'unverified',
        submittedAt: user.kycStatus?.submittedAt,
        verifiedAt: user.kycStatus?.verifiedAt,
        rejectionReason: user.kycStatus?.rejectionReason,
        accountType: user.accountType,
        isBusinessAccount: user.accountType === 'business',
        verificationMethod: user.kycStatus?.verificationMethod || 'didit',
        
        // Individual KYC data
        sessionId: user.kycStatus?.diditSessionId,
        verificationUrl: user.kycStatus?.diditVerificationUrl,
        expiresAt: user.kycStatus?.diditSessionExpiresAt,
        externalStatus: externalStatus?.data || null,
        
        // Business KYC data
        documents: user.kycStatus?.documents || [],
        businessInfo: user.accountType === 'business' ? user.businessInfo : null,
        reviewDeadline: user.kycStatus?.reviewDeadline
      }
    });

  } catch (error) {
    console.error('❌ Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status'
    });
  }
};

// ==================== SERVE DOCUMENT ====================
exports.serveDocument = async (req, res) => {
  try {
    const { filename } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user has access to this document
    const userHasDocument = user.kycStatus?.documents?.some(doc => 
      doc.filename === filename );

    if (!userHasDocument && !req.admin) {
    );

    if (!userHasDocument && !req // Changed from req.user.isAdmin to req.admin
      return res.status(403)..admin) { // Changed from req.user.isAdmin to req.admin
      return res.status(403).json({ 
       json({ 
        success: false, 
        message: success: false, 
        'Access denied to this document' 
      });
    }

    const filepath = path.join(uploadDir, filename);
    
 message: 'Access denied to this document' 
      });
    }

    const filepath = path.join(uploadDir, filename    if (!fs.existsSync(filepath)) {
      return);
    
    if (!fs.existsSync(filepath)) {
 res.status(404).json({ 
        success: false, 
        message: 'Document not found' 
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Serve document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve document'
    });
  }
};

// ==================== DIDIT WEBHOOK HANDLER ====================
exports.handleDiditWebhook = async (req, res) => {
  try {
    console.log      return res.status(404).json({ 
        success: false, 
        message: 'Document not found' 
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Serve document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve document'
    });
  }
};

// ==================== DIDIT WEBHOOK HANDLER ====================
exports.handleDiditWebhook = async (req, res) => {
  try {
    console.log('📥 Di('📥 DiDIT Webhook received:', req.body);

   DIT Webhook received:', req.body);

    const signature const signature = req.headers[' = req.headers['x-didit-signature'];
    if (x-didit-signaturesignature && process.env.DIDIT_WEBHOOK_SECRET) {
      const rawBody = JSON.stringify(req.body);
      const isValid = diditService.verifyWebhookSignature(rawBody, signature);
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }
    }

    const event = await diditService.processWebhookEvent(req.body);
    const userId = event.userId;

    if (!userId) {
      console.error('❌ No userId in webhook event');
      return res.status(400).json({
        success: false'];
    if (signature && process.env.DIDIT_WEBHOOK_SECRET) {
      const rawBody = JSON.stringify(req.body);
      const isValid = diditService.verifyWebhookSignature(rawBody, signature);
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }
    }

    const event = await diditService.processWebhookEvent(req.body);
    const userId = event.userId;

    if (!userId) {
      console.error('❌ No userId in webhook event');
      return res.status(400).json({
,
        message: 'Missing        success: false,
        message: 'Missing user ID'
      });
    }

    const user = await User.findById user ID'
      });
    }

    const user = await(userId);
    if (!user) User.findById(userId);
    if (!user) {
      console.error {
      console.error('❌ User not found:', userId('❌ User not found:', userId);
     );
      return res.status(404).json({
        success return res.status(404).: false,
        message:json({
        success: false,
        message: 'User not found 'User not found'
      });
    }

    const accountType ='
      });
    }

    const accountType = user.accountType || 'individual';
    console.log(` user.accountType || 'individual';
   📝 Updating ${accountType console.log(`📝 Updating ${accountType} KYC status} KYC status for user ${userId}: ${event.type for user ${userId}: ${event.type}`);

    //}`);

    // Update user KYC status based on event type
    if (event.type === 'completed' && event.verified) {
      user.kycStatus = {
        ...user.kycStatus,
        status: 'approved',
        Update user KYC status based on event type
    if (event.type === 'completed' && event.verified) {
      user.kycStatus = {
        ...user.kycStatus,
        status: 'approved',
        verifiedAt verifiedAt: new Date(),
        reviewedAt: new Date: new Date(),
        reviewedAt: new Date(),
        verificationResult(),
        verificationResult: event.verificationData,
       : event.verificationData accountType: accountType,
        verification,
        accountType: accountType,
        verificationMethod:Method: 'didit'
      };
      user.isK 'didit'
      };
      user.isKYCVerifiedYCVerified = true;

      console.log(`✅ ${account = true;

      console.log(`✅Type} KYC Approved for ${accountType} KYC Approved for user:`, userId user:`, userId);

    } else if (event.type === 'failed') {
      user.kycStatus = {
       );

    } else if (event.type === 'failed') {
      user.kycStatus = {
        ...user ...user.kycStatus,
        status: 're.kycStatus,
        status: 'rejected',
        reviewedAt: new Date(),
       jected',
        reviewedAt: rejectionReason: event.failure new Date(),
        rejectionReason: event.failureReason ||Reason || 'Verification failed',
        verificationResult: event 'Verification failed',
        verificationResult: event.verificationData.verificationData,
        accountType: accountType,
,
        accountType: account        verificationMethod: 'didit'
      };
      user.isKType,
        verificationMethod: 'didit'
      };
YCVerified = false      user.isKYCVerified = false;

      console.log(`❌ ${accountType} K;

      console.log(`❌ ${YC Rejected for user:`, userId);

    } elseaccountType} KYC Rejected for user:`, userId if (event.type === ');

    } else if (event.type === 'expired') {
expired') {
      user.kycStatus = {
      user.kycStatus = {
        ...user.        ...user.kycStatus,
        statuskycStatus,
        status: 'expired',
        reviewedAt: new Date(),
        rejectionReason:: 'expired',
        reviewedAt: new Date(),
 'Verification session expired',
        rejectionReason: 'Verification session expired',
        accountType:        accountType: accountType,
        verificationMethod: 'didit'
      };

      accountType,
        verificationMethod: 'didit'
      console.log(`⏰ ${accountType} KYC Session Exp };

      console.log(`⏰ ${accountType}ired for user:`, userId);

    } else if (event.type === 'in_progress') {
      user.kycStatus = KYC Session Expired for user:`, userId);

    } else if (event.type === 'in_progress') {
      user.kycStatus = {
        ...user.kycStatus,
        status: 'in_progress',
        accountType: accountType,
        verificationMethod: {
        ...user.kycStatus,
        status: 'in_progress',
        accountType: accountType,
        verificationMethod: 'did 'didit'
      };

      console.log(`🔄it'
      };

      console.log(`🔄 ${account ${accountType} KYC In Progress for user:`, userId);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Webhook processed successfullyType} KYC In Progress for user:`, userId);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

 '
    });

  } catch (error) {
    console } catch (error) {
    console.error('❌.error('❌ DiDIT webhook processing error:', error);
 DiDIT webhook processing    res.status(500).json({
      success: false error:', error);
    res.status(500).json({
      success,
      message: 'Webhook processing failed',
      error: false,
      message: 'Webhook processing failed',
: error.message
    });
  }
      error: error.message
    });
  }
};

//};

// ==================== RETRY KYC ====================
exports.retryK ==================== RETRY KYC ====================
exports.retryKYC = async (YC = async (req, res) => {
  tryreq, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status( {
    const user = await User.findById(req.user._id);

    if (!user) {
     404).json({
        success: false,
        message: return res.status(404).json({
        success: false 'User not found'
      });
    }

    if (,
        message: 'User not found'
      });
    }

   user.kycStatus?.status !== 'rejected' && user.kycStatus?.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: 'KYC retry not allowed in current status',
        currentStatus: user.kycStatus?.status
      });
    }

    user.kycStatus = {
      status: 'unverified'
    };
    user.isKYCVerified = false;

    await user.save();

    res.json({
      success: true,
      message: 'KYC reset. You can now start a new verification.'
 if (user.kycStatus?.status !== 'rejected' && user.kycStatus?.status !== 'expired') {
      return res.status(400).json({
        success: false,
        message: 'KYC retry not allowed in current status',
        currentStatus: user.kycStatus?.status
      });
    }

    user.kycStatus = {
      status: 'unverified'
    };
    user.isKYCVerified = false;

    await user.save();

    res.json({
      success: true,
      message: 'KYC reset. You can now start a new verification.'
    });

    });

  } catch (error) {
    console.error  } catch (error) {
    console.error('❌ Retry KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry KYC'
    });
  }
};

// ==================== ADMIN: GET PENDING BUSINESS KYCs ====================
exports.adminGetPendingBusinessKYCs = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      accountType: 'business',
      'kycStatus.status': 'under_review'
    }).select('name email businessInfo.companyName kycStatus createdAt')
      .sort({ 'kycStatus.submittedAt': -1 });

    res.json({
      success:('❌ Retry KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry KYC'
    });
  }
};

// ==================== ADMIN: GET PENDING BUSINESS KYCs ====================
exports.adminGetPendingBusinessKYCs = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      accountType: 'business',
      'kycStatus.status': 'under_review'
    }).select('name email businessInfo.companyName kycStatus createdAt')
      .sort({ 'kycStatus.submittedAt': -1 });

    res.json({
      true,
      count: pendingUsers.length,
      data: success: true,
      count: pendingUsers.length,
      data: pendingUsers
    pendingUsers
    });

  } catch (error) {
    console });

  } catch (error) {
    console.error('.error('❌ Get pending❌ Get pending KYCs error:', KYCs error:', error);
    res.status(500). error);
    res.status(500).json({
      success: false,
      message:json({
      success: false,
      message: 'Failed to 'Failed to get pending KY get pending KYCs'
    });
  }
};

// =================Cs'
    });
  }
=== ADMIN: GET BUSINESS KYC DETAILS ===================};

// ==================== ADMIN: GET BUSINESS KYC DETAIL=
exports.adminGetBusinessKYCDetails = async (reqS ====================
exports.adminGetBusinessKYCDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('name email accountType businessInfo kycStatus createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          accountType: user.accountType,
          createdAt: user.createdAt
        },
        businessInfo: user.businessInfo,
        kycStatus: user.kycStatus
      }
    });

  } catch (error) {
    console.error('❌ Get KYC details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC details'
    });
  }
};

// ==================== ADMIN: MANUAL APPROVE ====================
exports.adminApproveKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const account, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('name email accountType businessInfo kycStatus createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          accountType: user.accountType,
          createdAt: user.createdAt
        },
        businessInfo: user.businessInfo,
        kycStatus: user.kycStatus
      }
    });

  } catch (error) {
    console.error('❌ Get KYC details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC details'
    });
  }
};

// ==================== ADMIN: MANUAL APPROVE ====================
exports.adminApproveKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const accountType =Type = user.accountType || 'individual';

    user. user.accountType || 'individual';

    user.kycStatus = {
      ...userkycStatus = {
      ...user.kycStatus,
     .kycStatus,
      status: 'approved',
      verifiedAt status: 'approved',
      verifiedAt: new Date(),
: new Date(),
      reviewedAt: new Date(),
           reviewedAt: new Date(),
      reviewedBy: req reviewedBy: req.admin?._id || req.user._.admin?._id || req.user._id,
      reviewNotes:id,
      reviewNotes: notes || `Manually approved notes || `Manually approved by admin (${accountType by admin (${accountType})`,
      accountType: accountType})`,
      accountType:
    };
    user.isKYCVerified = true;

 accountType
    };
    user.isKYCVerified =    await user.save();

    console.log(`✅ Admin approved true;

    await user.save();

    console.log(`✅ Admin approved ${accountType} KYC for user:`, userId);

 ${accountType} KYC for user:`, userId);

    res.json({
      success: true,
      message: `${account    res.json({
      success: true,
      message:Type} KYC manually approved`,
      data: {
        `${accountType} KYC manually approved`,
      data: userId,
        status: 'approved',
        accountType,
 {
        userId,
        status: 'approved',
        accountType,
        verifiedAt: user.        verifiedAt: user.kycStatus.verifiedAtkycStatus.verifiedAt
      }
    });

  } catch (error) {
    console
      }
    });

  } catch (error) {
    console.error('❌.error('❌ Admin approve KYC error:', error);
 Admin approve KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve KYC'
    });
     res.status(500).json({
      success: false,
      message: 'Failed to approve KYC'
    }
};

// ==================== ADMIN: MANUAL REJECT });
  }
};

// ==================== ADMIN: MANUAL REJECT ====================
exports.adminRejectKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const accountType = user.accountType || 'individual';

    user.kycStatus = {
      ... ====================
exports.adminRejectKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const accountType = user.accountType || 'individual';

    user.kyuser.kycStatus,
      status: 'rejectedcStatus = {
      ...user.kycStatus,
      status: 'rejected',
     ',
      reviewedAt: new Date(),
      reviewedBy: req.admin?._id || req.user._id,
      rejectionReason reviewedAt: new Date(),
      reviewedBy: req.admin?._id || req.user._id,
      rejectionReason: reason,
      accountType: accountType
    };
: reason,
      accountType: accountType
    };
    user    user.isKYCVerified = false;

    await user.save();

    console.log(`❌ Admin rejected ${accountType} KYC for user:`, userId);

    res.json({
      success: true,
      message: `${accountType} KYC manually rejected`,
      data: {
        userId,
        status: 'rejected',
        accountType,
        reason
      }
    });

  } catch (error) {
    console.error('❌ Admin reject KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject KYC'
    });
  }
};

module.exports = exports;