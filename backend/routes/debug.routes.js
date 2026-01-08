// backend/routes/debug.routes.js - TEMPORARY DEBUG ENDPOINT
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const User = require('../models/User.model');

/**
 * ✅ Debug endpoint to check user account type
 * GET /api/debug/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name email accountType businessInfo.companyName kycStatus verified isKYCVerified');

    console.log('🔍 Debug user data:', {
      userId: user._id,
      email: user.email,
      accountType: user.accountType,
      isBusinessAccount: user.accountType === 'business',
      hasBusinessInfo: !!user.businessInfo?.companyName,
      kycStatus: user.kycStatus?.status,
      verified: user.verified,
      isKYCVerified: user.isKYCVerified
    });

    res.json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        isBusinessAccount: user.accountType === 'business',
        businessInfo: user.accountType === 'business' ? {
          companyName: user.businessInfo?.companyName,
          companyType: user.businessInfo?.companyType,
          industry: user.businessInfo?.industry
        } : null,
        verification: {
          emailVerified: user.verified,
          kycVerified: user.isKYCVerified,
          kycStatus: user.kycStatus?.status || 'unverified'
        }
      }
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

module.exports = router;

// ============================================
// Add to backend/server.js or app.js:
// ============================================
// const debugRoutes = require('./routes/debug.routes');
// app.use('/api/debug', debugRoutes);
