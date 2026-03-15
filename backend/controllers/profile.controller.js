// backend/controllers/profile.controller.js - FIXED
const User = require('../models/User.model');
const { deleteOldAvatar } = require('../middleware/upload.middleware');

// ─── GET PROFILE ─────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -twoFactorSecret -apiAccess.apiSecret');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userData = user.toObject();

    if (!userData.kycStatus) {
      userData.kycStatus = {
        status: 'unverified',
        tier: 'basic',
        documents: [],
        personalInfo: {},
        businessInfo: {},
      };
    }

    res.json({ success: true, data: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, bio, address, socialLinks, businessInfo, preferences } = req.body;

    const updates = {};

    if (name !== undefined)  updates.name  = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (bio !== undefined)   updates.bio   = bio.trim();

    if (address && typeof address === 'object') {
      const allowed = ['street', 'city', 'state', 'country', 'zipCode', 'postalCode', 'formatted'];
      allowed.forEach(field => {
        if (address[field] !== undefined) {
          updates[`address.${field}`] = address[field];
        }
      });
    }

    if (socialLinks && typeof socialLinks === 'object') {
      ['twitter', 'linkedin', 'website'].forEach(field => {
        if (socialLinks[field] !== undefined) {
          updates[`socialLinks.${field}`] = socialLinks[field];
        }
      });
    }

    if (businessInfo && typeof businessInfo === 'object') {
      // FIXED: added businessType and registrationNo to the allowed list
      const allowedBusiness = [
        'companyName', 'companyType', 'businessType', 'taxId',
        'registrationNumber', 'registrationNo',
        'industry', 'businessEmail', 'businessPhone', 'website',
      ];
      allowedBusiness.forEach(field => {
        if (businessInfo[field] !== undefined && businessInfo[field] !== '') {
          updates[`businessInfo.${field}`] = businessInfo[field];
        }
      });

      if (businessInfo.businessAddress && typeof businessInfo.businessAddress === 'object') {
        ['street', 'city', 'state', 'country', 'zipCode'].forEach(field => {
          if (businessInfo.businessAddress[field] !== undefined) {
            updates[`businessInfo.businessAddress.${field}`] = businessInfo.businessAddress[field];
          }
        });
      }
    }

    if (preferences && typeof preferences === 'object') {
      ['language', 'timezone', 'defaultCurrency', 'theme'].forEach(field => {
        if (preferences[field] !== undefined) {
          updates[`preferences.${field}`] = preferences[field];
        }
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: false }
    ).select('-password -twoFactorSecret -apiAccess.apiSecret');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toObject(),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile',
    });
  }
};

// ─── UPLOAD AVATAR ────────────────────────────────────────────────────────────
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete old avatar file from disk if it exists
    if (user.profilePicture) {
      deleteOldAvatar(user.profilePicture);
    }

    // FIXED: store full backend URL so frontend can render it from any domain
    // Without this, /uploads/avatars/filename.png resolves to the FRONTEND domain
    const backendUrl = process.env.BACKEND_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      `https://descrow-backend-5ykg.onrender.com`;

    const relativePath = req.avatarUrl || `/${req.file.path.replace(/\\/g, '/')}`;
    const fullUrl = relativePath.startsWith('http')
      ? relativePath
      : `${backendUrl}${relativePath}`;

    user.profilePicture = fullUrl;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl: fullUrl,
        profilePicture: fullUrl,
      },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
};

// ─── SUBMIT KYC ───────────────────────────────────────────────────────────────
exports.submitKYC = async (req, res) => {
  try {
    const { personalInfo, businessInfo, tier } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.kycStatus?.status === 'approved') {
      return res.status(400).json({ success: false, message: 'KYC is already approved' });
    }

    if (user.kycStatus?.status === 'pending') {
      return res.status(400).json({ success: false, message: 'KYC is already under review' });
    }

    user.kycStatus = {
      status: 'pending',
      tier: tier || 'basic',
      submittedAt: new Date(),
      reviewedAt: null,
      rejectionReason: null,
      documents: user.kycStatus?.documents || [],
      personalInfo: personalInfo || {},
      businessInfo: businessInfo || {},
    };

    await user.save();

    res.json({
      success: true,
      message: 'KYC submitted successfully. We will review within 24-48 hours.',
      data: { kycStatus: user.kycStatus },
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to submit KYC' });
  }
};

// ─── GET KYC STATUS ───────────────────────────────────────────────────────────
exports.getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kycStatus isKYCVerified');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        status: user.kycStatus?.status || 'unverified',
        tier: user.kycStatus?.tier || 'basic',
        submittedAt: user.kycStatus?.submittedAt,
        reviewedAt: user.kycStatus?.reviewedAt,
        rejectionReason: user.kycStatus?.rejectionReason,
        documents: user.kycStatus?.documents || [],
        personalInfo: user.kycStatus?.personalInfo || {},
        businessInfo: user.kycStatus?.businessInfo || {},
        isKYCVerified: user.isKYCVerified,
      },
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch KYC status' });
  }
};

// ─── UPLOAD KYC DOCUMENTS ─────────────────────────────────────────────────────
exports.uploadKYCDocuments = async (req, res) => {
  try {
    const { documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.kycStatus) {
      user.kycStatus = { status: 'unverified', tier: 'basic', documents: [], personalInfo: {}, businessInfo: {} };
    }
    if (!Array.isArray(user.kycStatus.documents)) {
      user.kycStatus.documents = [];
    }

    const documentUrl = `/uploads/kyc/${req.file.filename}`;
    user.kycStatus.documents.push({ type: documentType, url: documentUrl, uploadedAt: new Date() });

    if (user.kycStatus.status === 'unverified') {
      user.kycStatus.status = 'pending';
    }

    await user.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: { type: documentType, url: documentUrl },
        kycStatus: user.kycStatus,
      },
    });
  } catch (error) {
    console.error('Upload KYC document error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  try {
    const { password, reason } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password required to delete account' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    user.status = 'deleted';
    user.deletedAt = new Date();
    user.deletionReason = reason;
    await user.save();

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
};

module.exports = exports;
