// backend/middleware/upload.middleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Ensure upload directories exist (including avatars)
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
    
    // ✅ Route-based directory selection
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
    
    // ✅ Ensure the specific directory exists
    const fullPath = path.join(__dirname, '..', uploadPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    
    // ✅ Special naming for avatars
    if (file.fieldname === 'avatar') {
      cb(null, `avatar-${req.user._id}-${uniqueSuffix}${ext}`);
    } else {
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|gif|doc|docx|txt|mp4|mov|avi|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, documents, and video files are allowed'));
  }
};

// ✅ Avatar-specific file filter (images only)
const avatarFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('image/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for avatars'));
  }
};

// Multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max file size
  },
  fileFilter: fileFilter
});

// ✅ Avatar upload instance (smaller size limit, images only)
const avatarUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max for avatars
  },
  fileFilter: avatarFileFilter
});

// Upload single file
exports.uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);
    
    uploadSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 25MB'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      // Add file URL to request
      if (req.file) {
        req.fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/${req.file.path}`;
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

// ✅ Avatar upload middleware
exports.uploadAvatar = (req, res, next) => {
  const uploadSingle = avatarUpload.single('avatar');
  
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Avatar too large. Maximum size is 5MB'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Avatar upload error',
        error: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Add file data to request
    if (req.file) {
      req.avatarUrl = `/${req.file.path.replace(/\\/g, '/')}`;
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
    const uploadMultiple = upload.array(fieldName, maxCount);
    
    uploadMultiple(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'One or more files are too large. Maximum size is 25MB per file'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum ${maxCount} files allowed`
          });
        }
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      // Add file URLs to request
      if (req.files && req.files.length > 0) {
        req.fileUrls = req.files.map(file => 
          `${process.env.BACKEND_URL || 'http://localhost:5000'}/${file.path}`
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

// Upload for escrow attachments specifically
exports.uploadEscrowAttachments = (req, res, next) => {
  const uploadMultiple = upload.array('attachments', 10);
  
  uploadMultiple(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 25MB per file'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error',
        error: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Add file data to request for escrow creation
    if (req.files && req.files.length > 0) {
      req.attachments = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
        url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/${file.path}`
      }));
    }
    
    next();
  });
};

// Middleware to handle file deletion on failed operations
exports.cleanupFiles = (files) => {
  return (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send function
    res.send = function(data) {
      // If response indicates error, clean up uploaded files
      try {
        const responseData = JSON.parse(data);
        if (!responseData.success && req.files) {
          req.files.forEach(file => {
            try {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (cleanupErr) {
              console.error('Error cleaning up file:', cleanupErr);
            }
          });
        }
      } catch (e) {
        // Not JSON response, continue
      }
      
      // Call original send function
      originalSend.call(this, data);
    };
    
    next();
  };
};

// ✅ Helper function to delete old avatar
exports.deleteOldAvatar = (avatarPath) => {
  if (!avatarPath) return;
  
  const fullPath = path.join(__dirname, '..', avatarPath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log('✅ Deleted old avatar:', avatarPath);
    } catch (error) {
      console.error('❌ Error deleting old avatar:', error);
    }
  }
};

module.exports = exports;