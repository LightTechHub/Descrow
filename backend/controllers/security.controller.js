// backend/controllers/security.controller.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const TwoFactor = require('../models/TwoFactor');
const User = require('../models/User.model'); // ✅ FIXED: was missing, caused crash in disable2FA

// NOTE: We do NOT use a separate Session model.
// Sessions are stored in user.loginSessions[] (added in auth.controller.js session tracking).
// The token blacklist in auth.middleware.js handles revocation.

/* ============================================================
   SETUP 2FA — generate secret + QR code + backup codes
============================================================ */
exports.setup2FA = async (req, res) => {
  try {
    const existing = await TwoFactor.findOne({ user: req.user.id });
    if (existing && existing.enabled) {
      return res.status(400).json({ success: false, message: '2FA is already enabled' });
    }

    const secret = speakeasy.generateSecret({
      name: `Dealcross (${req.user.email})`,
      issuer: 'Dealcross'
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    const backupCodes = Array.from({ length: 10 }, () => ({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      used: false
    }));

    if (existing) {
      existing.secret = secret.base32;
      existing.backupCodes = backupCodes;
      await existing.save();
    } else {
      await TwoFactor.create({
        user: req.user.id,
        secret: secret.base32,
        backupCodes,
        enabled: false
      });
    }

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntry: secret.base32,
        backupCodes: backupCodes.map(bc => bc.code)
      }
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({ success: false, message: 'Failed to setup 2FA' });
  }
};

/* ============================================================
   VERIFY & ENABLE 2FA
============================================================ */
exports.verify2FA = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Verification code is required' });

    const twoFactor = await TwoFactor.findOne({ user: req.user.id });
    if (!twoFactor) {
      return res.status(404).json({ success: false, message: '2FA setup not found. Please setup 2FA first.' });
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) return res.status(400).json({ success: false, message: 'Invalid verification code' });

    twoFactor.enabled = true;
    twoFactor.lastVerified = new Date();
    await twoFactor.save();

    // ✅ Keep User model in sync so auth.controller can check it during login
    await User.findByIdAndUpdate(req.user.id, { twoFactorEnabled: true });

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify 2FA' });
  }
};

/* ============================================================
   DISABLE 2FA
============================================================ */
exports.disable2FA = async (req, res) => {
  try {
    const { code, password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ success: false, message: 'Code and password are required' });
    }

    // ✅ FIXED: User is now imported
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect password' });

    const twoFactor = await TwoFactor.findOne({ user: req.user.id });
    if (!twoFactor || !twoFactor.enabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled' });
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) return res.status(400).json({ success: false, message: 'Invalid verification code' });

    await TwoFactor.findByIdAndDelete(twoFactor._id);

    // ✅ Keep User model in sync
    await User.findByIdAndUpdate(req.user.id, { twoFactorEnabled: false, twoFactorSecret: undefined });

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
};

/* ============================================================
   GET 2FA STATUS
============================================================ */
exports.get2FAStatus = async (req, res) => {
  try {
    const twoFactor = await TwoFactor.findOne({ user: req.user.id });

    res.json({
      success: true,
      data: {
        enabled: twoFactor ? twoFactor.enabled : false,
        lastVerified: twoFactor?.lastVerified || null,
        hasBackupCodes: twoFactor ? twoFactor.backupCodes.some(bc => !bc.used) : false,
        remainingBackupCodes: twoFactor ? twoFactor.backupCodes.filter(bc => !bc.used).length : 0
      }
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch 2FA status' });
  }
};

/* ============================================================
   VERIFY BACKUP CODE (used during login if TOTP unavailable)
============================================================ */
exports.verifyBackupCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Backup code is required' });

    const twoFactor = await TwoFactor.findOne({ user: req.user.id });
    if (!twoFactor || !twoFactor.enabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled' });
    }

    const backupCode = twoFactor.backupCodes.find(
      bc => bc.code === code.toUpperCase() && !bc.used
    );

    if (!backupCode) {
      return res.status(400).json({ success: false, message: 'Invalid or already used backup code' });
    }

    backupCode.used = true;
    backupCode.usedAt = new Date();
    twoFactor.lastVerified = new Date();
    await twoFactor.save();

    const remaining = twoFactor.backupCodes.filter(bc => !bc.used).length;

    res.json({
      success: true,
      message: 'Backup code verified successfully',
      data: { remainingBackupCodes: remaining }
    });
  } catch (error) {
    console.error('Verify backup code error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify backup code' });
  }
};

/* ============================================================
   GET ACTIVE SESSIONS
   Reads from user.loginSessions[] — no separate Session model needed
============================================================ */
exports.getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('loginSessions');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const sessions = (user.loginSessions || [])
      .filter(s => s.isActive)
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .map(s => ({
        id: s.sessionId,
        deviceType: s.deviceType,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        country: s.country,
        city: s.city,
        createdAt: s.createdAt,
        lastActivity: s.lastActivity
      }));

    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};

/* ============================================================
   REVOKE SESSION
============================================================ */
exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const session = (user.loginSessions || []).find(s => s.sessionId === sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    session.isActive = false;
    await user.save();

    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke session' });
  }
};

/* ============================================================
   REVOKE ALL SESSIONS EXCEPT CURRENT
============================================================ */
exports.revokeAllSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Mark all sessions inactive except the one matching the current token's IP+browser
    // (We can't match exact token here, so we deactivate all — user stays logged in via current token)
    (user.loginSessions || []).forEach(s => { s.isActive = false; });
    await user.save();

    res.json({ success: true, message: 'All sessions revoked successfully' });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke sessions' });
  }
};