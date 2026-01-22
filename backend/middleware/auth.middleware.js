// backend/middleware/auth.middleware.js - REFINED & COMPLETE
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Admin = require('../models/Admin.model');

/**
 * Authenticate user via JWT token
 * Allows unverified users to access basic routes (profile, dashboard data)
 * but blocks them from creating escrows or sensitive actions
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

    // ✅ FIXED: Allow these routes even if email not verified
    // Dashboard needs to load basic user info to show verification banner
    const isAllowedUnverifiedRoute = 
      req.path.includes('/users/me') ||
      req.path.includes('/profile') ||
      req.path.includes('/notifications') ||
      req.path.includes('/kyc/status') ||           // Allow checking KYC status
      req.path.includes('/verify-email') ||         // Allow email verification
      req.path.includes('/resend-verification') ||  // Allow resending verification
      req.method === 'GET';                         // Allow all GET requests (reading data)

    // Block unverified users from creating/modifying data
    if (!user.verified && !isAllowedUnverifiedRoute) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        code: 'EMAIL_NOT_VERIFIED',
        requiresVerification: true
      });
    }

    // Check account status
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

/**
 * Optional authentication (doesn't block if no token)
 * Used for public endpoints that can show different content for logged-in users
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Silently ignore errors for optional auth
      }
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Admin authentication
 * Verifies admin JWT token and checks admin status
 */
exports.adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required',
        code: 'NO_TOKEN'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Admin account is not active',
        code: 'ADMIN_INACTIVE'
      });
    }

    req.admin = admin;
    next();

  } catch (error) {
    console.error('❌ AdminAuth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Check specific admin permission
 * Usage: router.post('/users', adminAuth, checkPermission('manage_users'), controller)
 */
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    const admin = req.admin;

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    // Master admin has all permissions
    if (admin.role === 'master') {
      return next();
    }

    if (!admin.permissions || !admin.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission} required`
      });
    }

    next();
  };
};

/**
 * Backward-compatible: old isAdmin middleware
 * Checks if user (not admin) has admin role
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

module.exports = exports;
