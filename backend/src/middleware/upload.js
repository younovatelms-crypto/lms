'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'profile-pictures');
ensureDir(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ext || '.jpg';
    const filename = `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, filename);
  },
});

const fileFilter = (_req, file, cb) => {
  const isImage = /^image\/(png|jpeg|jpg|webp|gif|bmp|svg\+xml)$/.test(file.mimetype);
  if (!isImage) {
    return cb(new Error('Only image files are allowed (png/jpg/jpeg/webp/gif).'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// expects multipart/form-data with field name: `profilePhoto`
const uploadProfilePhoto = upload.single('profilePhoto');

module.exports = { uploadProfilePhoto };

