const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const FacebookAPI = require('../services/facebookApi');
const db = require('../models');
const { decryptToken } = require('./facebookSDKAuth');
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

router.post('/upload', authenticate, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Get user's Facebook auth credentials
    const userId = req.user?.id || req.userId;
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(401).json({
        success: false,
        error: 'Facebook authentication not found. Please reconnect your Facebook account.'
      });
    }

    // Decrypt access token
    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      decryptedToken = decryptToken(facebookAuth.accessToken);
      if (!decryptedToken) {
        return res.status(401).json({
          success: false,
          error: 'Failed to decrypt access token. Please reconnect your Facebook account.'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token format.'
      });
    }

    // Create FacebookAPI instance with user's credentials
    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: facebookAuth.selectedAdAccount.id.replace('act_', ''),
      pageId: facebookAuth.selectedPage.id
    });

    const isVideo = req.file.mimetype.startsWith('video/');
    const isImage = req.file.mimetype.startsWith('image/');

    console.log(`📤 Uploading ${isVideo ? 'video' : 'image'} for ad variation:`, req.file.originalname);

    let uploadResult;
    if (isVideo) {
      // Upload video and get video ID
      const videoId = await userFacebookApi.uploadVideo(req.file.path);
      uploadResult = {
        videoId: videoId,
        type: 'video',
        filename: req.file.filename,
        originalName: req.file.originalname
      };
      console.log(`  ✅ Video uploaded successfully. Video ID: ${videoId}`);
    } else if (isImage) {
      // Upload image and get image hash
      const imageHash = await userFacebookApi.uploadImage(req.file.path);
      uploadResult = {
        imageHash: imageHash,
        type: 'image',
        filename: req.file.filename,
        originalName: req.file.originalname
      };
      console.log(`  ✅ Image uploaded successfully. Image hash: ${imageHash}`);
    } else {
      throw new Error('Unsupported file type');
    }

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      data: uploadResult
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/upload-multiple', upload.array('media', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadedMedia = [];
    
    for (const file of req.files) {
      const imageHash = await facebookApi.uploadImage(file.path);
      uploadedMedia.push({
        hash: imageHash,
        filename: file.filename,
        originalName: file.originalname
      });
    }
    
    res.json({
      success: true,
      message: `${uploadedMedia.length} files uploaded successfully`,
      data: uploadedMedia
    });
  } catch (error) {
    console.error('Multiple media upload error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;