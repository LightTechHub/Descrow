// backend/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Admin = require('../models/Admin.model');

/**
 * Authenticate user via JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NO_TOKEN'
      });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication token',
          code: 'INVALID_TOKEN'
        });
      }
      throw jwtError;
    }

    // Get user from database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // FIXED: Allow /users/me and /profile even if email not verified
    // (dashboard needs to load basic user info first)
    const isAllowedUnverifiedRoute = 
      req.path.includes('/users/me') ||
      req.path.includes('/profile') ||
      req.path.includes('/notifications') ||     // common dashboard calls
      req.path.startsWith('/api/escrow') ||       // escrow list/view
      req.path.startsWith('/api/kyc') ||          // KYC status/check
      req.path.includes('/dashboard');            // if you have any /dashboard API

    if (!user.verified && !isAllowedUnverifiedRoute) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        code: 'EMAIL_NOT_VERIFIED',
        requiresVerification: true
      });
    }

    // Check account status (keep this - it's important)
    if (!user.isActive || user.status === 'suspended' || user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or inactive',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Alias for authenticate (backward compatibility)
 */
exports.protect = exports.authenticate;

// ... the rest of the file (optionalAuth, adminAuth, checkPermission, isAdmin) remains EXACTLY the same ...
// No need to change anything below this line

module.exports = exports;