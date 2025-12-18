// backend/middleware/verification.middleware.js
const User = require('../models/User.model');

const verificationMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ Check email verification - Use 'verified' field (not isEmailVerified)
    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required to create transactions',
        requiresVerification: true,
        verificationType: 'email',
        verificationStatus: {
          email: false,
          kyc: user.isKYCVerified || false
        }
      });
    }

    // ✅ Check KYC verification - Use kycStatus.status field
    if (!user.isKYCVerified || user.kycStatus?.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required before creating escrow',
        requiresVerification: true,
        verificationType: 'kyc',
        currentKYCStatus: user.kycStatus?.status || 'unverified',
        verificationStatus: {
          email: true,
          kyc: false
        }
      });
    }

    // ✅ All verifications passed
    req.verificationStatus = {
      email: user.verified,
      kyc: user.isKYCVerified
    };

    next();
  } catch (error) {
    console.error('Verification middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification check failed'
    });
  }
};

module.exports = verificationMiddleware;