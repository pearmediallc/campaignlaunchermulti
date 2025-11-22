const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const XLSX = require('xlsx');
const { authenticate } = require('../middleware/auth');
const { decryptToken } = require('./facebookSDKAuth');
const ResourceHelper = require('../services/ResourceHelper');
const LocationMapper = require('../services/LocationMapper');
const { FacebookAuth } = require('../models');

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

/**
 * GET /api/facebook-targeting/saved-audiences
 * Fetch all saved audiences from Facebook for the user's ad account
 */
router.get('/saved-audiences', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    // Get Facebook auth
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(400).json({
        success: false,
        error: 'Facebook authentication required'
      });
    }

    // Decrypt token
    const decryptedToken = decryptToken(facebookAuth.accessToken);

    if (!decryptedToken) {
      return res.status(401).json({
        success: false,
        error: 'Failed to decrypt Facebook access token'
      });
    }

    // Get active ad account
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(userId);

    if (!activeResources.selectedAdAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Please select an ad account first'
      });
    }

    // Ensure ad account ID has 'act_' prefix (but don't double it)
    const adAccountId = activeResources.selectedAdAccountId.toString();
    const formattedAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // Fetch saved audiences from Facebook
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${formattedAdAccountId}/saved_audiences`,
      {
        params: {
          access_token: decryptedToken,
          fields: 'id,name,targeting,time_created,time_updated'
        }
      }
    );

    console.log(`✅ Fetched ${response.data.data.length} saved audiences`);

    res.json({
      success: true,
      savedAudiences: response.data.data
    });
  } catch (error) {
    console.error('Error fetching saved audiences:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved audiences',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * POST /api/facebook-targeting/bulk-upload-states
 * Upload CSV/Excel file with state names and map to Facebook region keys
 */
router.post('/bulk-upload-states', authenticate, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`📁 Processing file: ${req.file.originalname} (${req.file.mimetype})`);

    let stateNames = [];

    // Parse file based on type
    if (req.file.mimetype === 'text/csv') {
      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split(/\r?\n/);

      stateNames = lines
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#')) // Remove empty and comment lines
        .map(line => {
          // Handle CSV with commas (take first column)
          const parts = line.split(',');
          return parts[0].trim();
        });
    } else {
      // Parse Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Extract first column values
      stateNames = data
        .map(row => row[0])
        .filter(val => val && typeof val === 'string')
        .map(val => val.trim());
    }

    console.log(`📊 Extracted ${stateNames.length} state names from file`);

    // Validate state names
    const validation = LocationMapper.validateStates(stateNames);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Some state names could not be recognized',
        invalidStates: validation.invalidStates,
        validCount: validation.validStates.length,
        invalidCount: validation.invalidStates.length
      });
    }

    // Map to Facebook region format
    const facebookRegions = validation.validStates;

    console.log(`✅ Successfully mapped ${facebookRegions.length} states`);

    res.json({
      success: true,
      regions: facebookRegions,
      count: facebookRegions.length,
      originalCount: stateNames.length
    });
  } catch (error) {
    console.error('Error processing bulk state upload:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process state upload',
      message: error.message
    });
  }
});

/**
 * POST /api/facebook-targeting/parse-states-text
 * Parse pasted text with state names and map to Facebook region keys
 */
router.post('/parse-states-text', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text input is required'
      });
    }

    console.log(`📝 Processing pasted text (${text.length} characters)`);

    // Parse text - split by newlines or commas
    const stateNames = text
      .split(/[\n,]+/) // Split by newlines or commas
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#')); // Remove empty and comment lines

    console.log(`📊 Extracted ${stateNames.length} state names from text`);

    // Validate state names
    const validation = LocationMapper.validateStates(stateNames);

    // Return results even if some are invalid
    res.json({
      success: true,
      regions: validation.validStates,
      count: validation.validStates.length,
      originalCount: stateNames.length,
      invalidStates: validation.invalidStates,
      hasInvalidStates: validation.invalidStates.length > 0
    });
  } catch (error) {
    console.error('Error processing text state input:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process state text',
      message: error.message
    });
  }
});

/**
 * GET /api/facebook-targeting/search-locations
 * Search for locations using Facebook's targeting search API
 */
router.get('/search-locations', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { query, type, countryCode } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Get Facebook auth
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(400).json({
        success: false,
        error: 'Facebook authentication required'
      });
    }

    // Decrypt token
    const decryptedToken = decryptToken(facebookAuth.accessToken);

    if (!decryptedToken) {
      return res.status(401).json({
        success: false,
        error: 'Failed to decrypt Facebook access token'
      });
    }

    // Build search parameters
    const params = {
      access_token: decryptedToken,
      type: 'adgeolocation',
      q: query
    };

    if (type) {
      params.location_types = JSON.stringify([type]); // e.g., "region", "city", "zip"
    }

    if (countryCode) {
      params.country_code = countryCode;
    }

    // Search Facebook locations
    const response = await axios.get(
      'https://graph.facebook.com/v18.0/search',
      { params }
    );

    console.log(`🔍 Found ${response.data.data.length} locations for query: "${query}"`);

    res.json({
      success: true,
      locations: response.data.data
    });
  } catch (error) {
    console.error('Error searching locations:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search locations',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;
