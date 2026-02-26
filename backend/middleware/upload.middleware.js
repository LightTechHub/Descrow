// backend/middleware/upload.middleware.js - FIXED
// Fix: req.avatarUrl now stores ONLY the path without BACKEND_URL prefix.
//      The frontend resolveAvatarUrl already prepends the API base, so adding
//      the full URL here caused double-prefixing → 404 on /api/uploads/avatars/...
//      Correct stored value: /uploads/avatars/filename.jpg
//      Frontend resolves it to: https://your-backend.com/uploads/avatars/filename.jpg

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  'uploads/avatars',
  'uploads/kyc',
  'uploads/delivery',
  'uploads/disputes',
  'uploads/chat',
  'uploads/escrow'
];

uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';

    if (req.baseUrl.includes('/profile') || req.path.includes('/avatar')) {
      uploadPath += 'avatars/';
    } else if (req.baseUrl.includes('/delivery')) {
      uploadPath += 'delivery/';
    } else if (req.baseUrl.includes('/users') && req.path.includes('/kyc')) {
      uploadPath += 'kyc/';
    } else if (req.baseUrl.includes('/disputes')) {
      uploadPath += 'disputes/';
    } else if (req.baseUrl.includes('/chat')) {
      uploadPath += 'chat/';
    } else if (req.baseUrl.includes('/escrow')) {
      uploadPath += 'escrow/';
    }

    const fullPath = path.join(__dirname, '..', uploadPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);

    if (file.fieldname === 'avatar') {
      cb(null, `avatar-${req.user._id}-${uniqueSuffix}${ext}`);
    } else {
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  }
});

// General file filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|gif|doc|docx|txt|mp4|mov|avi|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only images, PDFs, documents, and video files are allowed'));
};

// Avatar-specific file filter
const avatarFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('image/');
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for avatars'));
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: avatarFileFilter
});

// Upload single file
exports.uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File too large. Maximum size is 25MB' });
        }
        return res.status(400).json({ success: false, message: 'File upload error', error: err.message });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (req.file) {
        // Store full URL for non-avatar files (used in escrow/chat/etc)
        req.fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/${req.file.path.replace(/\\/g, '/')}`;
        req.fileData = {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path
        };
      }

      next();
    });
  };
};

// ✅ FIXED: Avatar upload middleware
// Stores ONLY the path (e.g. /uploads/avatars/avatar-xxx.jpg) — NOT the full URL.
// The frontend resolveAvatarUrl() prepends REACT_APP_BACKEND_URL (NOT REACT_APP_API_URL)
// to build the correct full URL. See profileService notes below.
exports.uploadAvatar = (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Avatar too large. Maximum size is 5MB' });
      }
      return res.status(400).json({ success: false, message: 'Avatar upload error', error: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (req.file) {
      // ✅ Store clean path only — no domain prefix
      req.avatarUrl = `/uploads/avatars/${req.file.filename}`;
      req.avatarData = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      };
    }

    next();
  });
};

// Upload multiple files
exports.uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'One or more files are too large. Maximum size is 25MB per file' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ success: false, message: `Too many files. Maximum ${maxCount} files allowed` });
        }
        return res.status(400).json({ success: false, message: 'File upload error', error: err.message });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      if (req.files && req.files.length > 0) {
        req.fileUrls = req.files.map(file =>
          `${process.env.BACKEND_URL || 'http://localhost:5000'}/${file.path.replace(/\\/g, '/')}`
        );
        req.filesData = req.files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path
        }));
      }

      next();
    });
  };
};

// Upload escrow attachments
exports.uploadEscrowAttachments = (req, res, next) => {
  upload.array('attachments', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum size is 25MB per file' });
      }
      return res.status(400).json({ success: false, message: 'File upload error', error: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (req.files && req.files.length > 0) {
      req.attachments = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
        url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/${file.path.replace(/\\/g, '/')}`
      }));
    }

    next();
  });
};

// Cleanup files on failed operations
exports.cleanupFiles = (files) => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
      try {
        const responseData = JSON.parse(data);
        if (!responseData.success && req.files) {
          req.files.forEach(file => {
            try {
              if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            } catch (cleanupErr) {
              console.error('Error cleaning up file:', cleanupErr);
            }
          });
        }
      } catch (e) {
        // Not JSON, continue
      }
      originalSend.call(this, data);
    };
    next();
  };
};

// ✅ Helper: delete old avatar from disk
exports.deleteOldAvatar = (avatarPath) => {
  if (!avatarPath) return;
  // Handle both /uploads/avatars/file.jpg and full URLs
  const cleanPath = avatarPath.startsWith('http')
    ? new URL(avatarPath).pathname
    : avatarPath;
  const fullPath = path.join(__dirname, '..', cleanPath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log('✅ Deleted old avatar:', cleanPath);
    } catch (error) {
      console.error('❌ Error deleting old avatar:', error);
    }
  }
};

module.exports = exports;
