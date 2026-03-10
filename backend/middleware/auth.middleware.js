// backend/middleware/auth.middleware.js
// ADDED: in-memory token blacklist (for logout invalidation)
// For production scale, use Redis instead of the in-memory Set
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// ── In-memory token blacklist ─────────────────────────────────────────────────
// Holds JTI or full tokens that have been explicitly logged out.
// Auto-clears expired entries every hour to prevent unbounded growth.
const tokenBlacklist = new Set();

setInterval(() => {
  // We can't easily decode without verifying, so we do a brute-force clear
  // of tokens older than 7d (the max JWT_EXPIRE). In production use Redis TTL.
  // Here we just prune the set if it gets large (simple heuristic).
  if (tokenBlacklist.size > 10000) {
    console.log('⚠️ Token blacklist pruned (exceeded 10k entries)');
    tokenBlacklist.clear();
  }
}, 60 * 60 * 1000);

// Export so auth.controller.js can call blacklistToken(token)
const blacklistToken = (token) => {
  if (token) tokenBlacklist.add(token);
};

// ── Paths that don't need a fully verified user ───────────────────────────────
const PUBLIC_GET_PATHS = [
  '/api/escrow/public',
  '/api/platform',
  '/api/health'
];

/* ============================================================
   authenticate (alias: protect)
   - Verifies JWT
   - Checks token blacklist
   - Allows unverified email on GET requests
============================================================ */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // ── Blacklist check ────────────────────────────────────────────────────────
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ success: false, message: 'Token has been revoked. Please log in again.', code: 'TOKEN_REVOKED' });
    }

    // ── Verify JWT ────────────────────────────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token', code: 'TOKEN_INVALID' });
    }

    // ── Load user ─────────────────────────────────────────────────────────────
    const user = await User.findById(decoded.id).select('-password -twoFactorSecret');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.status === 'deleted') {
      return res.status(401).json({ success: false, message: 'Account not found' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Contact support.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // ── Email verification gate ───────────────────────────────────────────────
    // Allow unverified users on GET requests and specific exempt paths
    const exemptPaths = [
      '/api/auth/verify-email',
      '/api/auth/resend-verification',
      '/api/auth/logout',
      '/api/auth/refresh-token',
      '/api/profile',
      '/api/auth/password-status',
      '/api/auth/set-password'
    ];

    const isExempt = exemptPaths.some(p => req.path.startsWith(p));
    const isGetRequest = req.method === 'GET';
    const isPublicGetPath = PUBLIC_GET_PATHS.some(p => req.path.startsWith(p));

    if (!user.verified && !isExempt && !isGetRequest && !isPublicGetPath) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email to access this feature.',
        code: 'EMAIL_NOT_VERIFIED',
        requiresVerification: true,
        email: user.email
      });
    }

    req.user = user;
    req.token = token; // so logout can blacklist it
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

/* ============================================================
   optionalAuth — doesn't fail if no token present
============================================================ */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    if (!token || tokenBlacklist.has(token)) return next();

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password -twoFactorSecret');
      if (user && user.status === 'active') {
        req.user = user;
        req.token = token;
      }
    } catch { /* ignore — optional */ }

    next();
  } catch {
    next();
  }
};

/* ============================================================
   adminAuth — for admin routes
============================================================ */
const Admin = require('../models/Admin.model');

const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || tokenBlacklist.has(token)) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized as admin' });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(403).json({ success: false, message: 'Admin account not found or inactive' });
    }

    req.admin = admin;
    req.token = token;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Admin session expired' });
    }
    res.status(401).json({ success: false, message: 'Admin authentication failed' });
  }
};

/* ============================================================
   checkPermission — granular admin permission check
============================================================ */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }
    if (req.admin.role === 'master') return next();
    if (!req.admin.permissions?.[permission]) {
      return res.status(403).json({ success: false, message: `Permission denied: ${permission}` });
    }
    next();
  };
};

/* ============================================================
   isAdmin — alias for adminAuth (backward compat)
============================================================ */
const isAdmin = adminAuth;

/* ============================================================
   protectAdmin — alias for adminAuth used in admin.routes
============================================================ */
const protectAdmin = adminAuth;

module.exports = {
  authenticate,
  protect: authenticate,    // alias
  optionalAuth,
  adminAuth,
  protectAdmin,
  isAdmin,
  checkPermission,
  blacklistToken            // exported so logout controller can call it
};
