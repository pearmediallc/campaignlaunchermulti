const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const FacebookAPI = require('../services/facebookApi');
const ResourceHelper = require('../services/ResourceHelper');
const FailureTracker = require('../services/FailureTracker');
const { authenticate, requirePermission } = require('../middleware/auth');
const { requireFacebookAuth, refreshFacebookToken } = require('../middleware/facebookAuth');
const AuditService = require('../services/AuditService');
const { uploadSingle } = require('../middleware/upload');
const db = require('../models');
const { decryptToken } = require('./facebookSDKAuth');
const {
  processImageAspectRatio,
  extractVideoThumbnail,
  processVideoThumbnail,
  processVideoAspectRatio
} = require('../utils/mediaProcessor');

// Get OAuth resources (pages, pixels, business managers) for form population
router.get('/resources', authenticate, async (req, res) => {
  try {
    const { FacebookAuth } = db;
    const userId = req.user?.id || req.userId;

    // Get user's Facebook auth data
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.json({
        pages: [],
        pixels: [],
        businessManagers: [],
        adAccounts: [],
        hasAuth: false
      });
    }

    // Parse resources from stored data
    let pages = [];
    let pixels = [];
    let businessManagers = [];
    let adAccounts = [];

    try {
      if (facebookAuth.pages) {
        pages = typeof facebookAuth.pages === 'string'
          ? JSON.parse(facebookAuth.pages)
          : facebookAuth.pages;
      }
    } catch (e) {
      console.log('Error parsing pages:', e);
    }

    try {
      if (facebookAuth.pixels) {
        pixels = typeof facebookAuth.pixels === 'string'
          ? JSON.parse(facebookAuth.pixels)
          : facebookAuth.pixels;
      }
    } catch (e) {
      console.log('Error parsing pixels:', e);
    }

    try {
      if (facebookAuth.businessAccounts) {
        businessManagers = typeof facebookAuth.businessAccounts === 'string'
          ? JSON.parse(facebookAuth.businessAccounts)
          : facebookAuth.businessAccounts;
      }
    } catch (e) {
      console.log('Error parsing business managers:', e);
    }

    try {
      if (facebookAuth.adAccounts) {
        adAccounts = typeof facebookAuth.adAccounts === 'string'
          ? JSON.parse(facebookAuth.adAccounts)
          : facebookAuth.adAccounts;
      }
    } catch (e) {
      console.log('Error parsing ad accounts:', e);
    }

    // Get selected values
    const selectedPage = facebookAuth.selectedPage || null;
    const selectedPixel = facebookAuth.selectedPixel || null;
    const selectedAdAccount = facebookAuth.selectedAdAccount || null;

    res.json({
      pages,
      pixels,
      businessManagers,
      adAccounts,
      selectedPage,
      selectedPixel,
      selectedAdAccount,
      hasAuth: true
    });
  } catch (error) {
    console.error('Error fetching OAuth resources:', error);
    res.status(500).json({
      error: 'Failed to fetch resources',
      pages: [],
      pixels: [],
      businessManagers: [],
      adAccounts: [],
      hasAuth: false
    });
  }
});

// Strategy 150 validation rules - Meta compliant
const validateStrategy150 = [
  // Campaign level validations
  body('campaignName').notEmpty().withMessage('Campaign name is required'),
  body('buyingType').optional().isIn(['AUCTION', 'RESERVED']).withMessage('Invalid buying type'),
  body('objective').notEmpty().withMessage('Objective is required'),
  body('budgetLevel').optional().isIn(['campaign', 'adset']).withMessage('Invalid budget level'),
  body('specialAdCategories').optional().isArray(),
  body('campaignBudgetOptimization').optional().isBoolean(),
  body('bidStrategy').optional().isIn([
    'LOWEST_COST_WITHOUT_CAP',
    'LOWEST_COST_WITH_BID_CAP',
    'COST_CAP',
    'LOWEST_COST_WITH_MIN_ROAS'
  ]),

  // Bid strategy related fields
  body('bidAmount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Bid amount must be at least $0.01'),
  body('costCap')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Cost cap must be at least $0.01'),
  body('minRoas')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Minimum ROAS must be at least 0.01'),

  // Campaign budget validations
  body('campaignBudget.dailyBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Campaign daily budget must be at least $1'),
  body('campaignBudget.lifetimeBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Campaign lifetime budget must be at least $1'),

  // Ad set level validations
  body('performanceGoal').optional(),
  body('pixel').optional(),
  body('conversionEvent').optional(),
  body('attributionSetting').optional(),
  body('attributionWindow').optional(),

  // Ad set budget & schedule validations
  body('adSetBudget.dailyBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Ad set daily budget must be at least $1'),
  body('adSetBudget.lifetimeBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Ad set lifetime budget must be at least $1'),
  body('adSetBudget.startDate').optional().isISO8601(),
  body('adSetBudget.endDate').optional().isISO8601(),
  body('adSetBudget.scheduleType').optional().isIn(['run_continuously', 'scheduled']),
  body('adSetBudget.spendingLimits.daily').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('adSetBudget.spendingLimits.lifetime').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('adSetBudget.spendingLimits.enabled').optional({ values: 'falsy' }).isBoolean(),
  body('adSetBudget.spendingLimits.valueType').optional({ values: 'falsy' }).isIn(['percentage', 'dollar']),
  body('adSetBudget.spendingLimits.dailyMin').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('adSetBudget.spendingLimits.dailyMax').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('adSetBudget.spendingLimits.lifetimeMin').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('adSetBudget.spendingLimits.lifetimeMax').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('adSetBudget.dayparting').optional().isArray(),

  // Targeting validations
  body('targeting.locations.countries').optional().isArray(),
  body('targeting.ageMin').optional().isInt({ min: 13, max: 65 }),
  body('targeting.ageMax').optional().isInt({ min: 13, max: 65 }),
  body('targeting.genders').optional().isArray(),
  body('targeting.languages').optional().isArray(),
  body('targeting.detailedTargeting').optional().isObject(),
  body('targeting.customAudiences').optional().isArray(),
  body('targeting.lookalikeAudiences').optional().isArray(),

  // Placement validations
  body('placementType').optional().isIn(['automatic', 'manual']),
  body('placements.facebook').optional().isArray(),
  body('placements.instagram').optional().isArray(),
  body('placements.messenger').optional().isArray(),
  body('placements.audienceNetwork').optional().isArray(),
  body('placements.devices').optional().isArray(),
  body('placements.platforms').optional().isArray(),

  // Ad level validations
  body('facebookPage').optional(),
  body('instagramAccount').optional(),
  body('urlType').optional().isIn([
    'website',
    'app_deeplink',
    'facebook_event',
    'messenger',
    'whatsapp',
    'lead_gen',
    'call',
    'none'
  ]),
  body('url').optional(),
  body('primaryText')
    .notEmpty()
    .withMessage('Primary text is required')
    .isLength({ max: 2200 })
    .withMessage('Primary text must be 2200 characters or less'),
  body('headline')
    .notEmpty()
    .withMessage('Headline is required')
    .isLength({ max: 255 })
    .withMessage('Headline must be 255 characters or less'),
  body('description')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Description must be 255 characters or less'),
  body('callToAction').optional(),
  body('displayLink').optional(),

  // Media specifications
  body('mediaType').optional().isIn(['single_image', 'single_video', 'carousel']),
  body('mediaSpecs').optional().isObject(),

  // Creative Library integration - editor name for ad naming
  body('editorName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Editor name must be 255 characters or less'),

  // Duplication settings for 49 ad sets
  body('duplicationSettings.defaultBudgetPerAdSet')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Default budget per ad set must be at least $1'),
  body('duplicationSettings.budgetDistributionType')
    .optional()
    .isIn(['equal', 'custom', 'weighted']),
  body('duplicationSettings.customBudgets').optional().isArray(),

  // Process control
  body('publishDirectly').optional().isBoolean()
];

// Middleware to parse JSON fields from FormData
const parseFormDataJson = (req, res, next) => {
  // Parse JSON fields that come as strings from FormData
  const parseJsonField = (field) => {
    if (!field) return undefined;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        return field; // Return as-is if not valid JSON
      }
    }
    return field;
  };

  // Parse JSON fields that were stringified in FormData
  if (req.body.specialAdCategories && typeof req.body.specialAdCategories === 'string') {
    req.body.specialAdCategories = parseJsonField(req.body.specialAdCategories);
  }
  if (req.body.adSetBudget && typeof req.body.adSetBudget === 'string') {
    req.body.adSetBudget = parseJsonField(req.body.adSetBudget);
  }
  if (req.body.targeting && typeof req.body.targeting === 'string') {
    req.body.targeting = parseJsonField(req.body.targeting);
  }
  if (req.body.placements && typeof req.body.placements === 'string') {
    req.body.placements = parseJsonField(req.body.placements);
  }
  if (req.body.duplicationSettings && typeof req.body.duplicationSettings === 'string') {
    req.body.duplicationSettings = parseJsonField(req.body.duplicationSettings);
  }
  if (req.body.campaignBudget && typeof req.body.campaignBudget === 'string') {
    req.body.campaignBudget = parseJsonField(req.body.campaignBudget);
  }
  if (req.body.customBudgets && typeof req.body.customBudgets === 'string') {
    req.body.customBudgets = parseJsonField(req.body.customBudgets);
  }
  if (req.body._multiAccountDeployment && typeof req.body._multiAccountDeployment === 'string') {
    req.body._multiAccountDeployment = parseJsonField(req.body._multiAccountDeployment);
  }
  if (req.body._multipleCampaigns && typeof req.body._multipleCampaigns === 'string') {
    req.body._multipleCampaigns = parseJsonField(req.body._multipleCampaigns);
  }

  next();
};

// Create initial campaign (1-1-1) - supports file uploads
router.post('/create', authenticate, requireFacebookAuth, refreshFacebookToken, requirePermission('campaign', 'create'), uploadSingle, parseFormDataJson, validateStrategy150, async (req, res) => {
  let selectedAdAccountId = null;  // Define at the beginning of the route handler

  try {
    console.log('📝 Strategy 1-50-1 creation request received:', {
      body: req.body,
      hasFile: !!req.file,
      user: req.user?.id
    });

    // Enhanced field-by-field logging
    console.log('🔍 Validating fields:');
    console.log('  campaignName:', req.body.campaignName, typeof req.body.campaignName);
    console.log('  objective:', req.body.objective, typeof req.body.objective);
    console.log('  primaryText:', req.body.primaryText, typeof req.body.primaryText);
    console.log('  headline:', req.body.headline, typeof req.body.headline);
    console.log('  budgetType:', req.body.budgetType, typeof req.body.budgetType);
    console.log('  dailyBudget:', req.body.dailyBudget, typeof req.body.dailyBudget);
    console.log('  lifetimeBudget:', req.body.lifetimeBudget, typeof req.body.lifetimeBudget);
    console.log('  buyingType:', req.body.buyingType, typeof req.body.buyingType);
    console.log('  mediaType:', req.body.mediaType, typeof req.body.mediaType);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation failed!');
      console.log('Number of errors:', errors.array().length);
      errors.array().forEach((err, index) => {
        console.log(`Error ${index + 1}:`, {
          field: err.path || err.param,
          message: err.msg,
          value: err.value,
          location: err.location,
          type: err.type
        });
      });
      console.log('Full error details:', JSON.stringify(errors.array(), null, 2));
      return res.status(400).json({ errors: errors.array() });
    }

    // Get user's Facebook credentials
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(400).json({
        error: 'Please authenticate with Facebook before creating campaigns'
      });
    }

    // NOTE: Don't validate selectedAdAccount/selectedPage here yet - they might come from active resource config
    // Validation will happen after checking UserResourceConfig

    // Get pixel ID - ONLY from user's selected pixel (NO auto-fetch)
    let pixelId = facebookAuth.selectedPixel?.id;
    console.log('🔍 PIXEL SELECTION DEBUG:');
    console.log('  - User selected pixel:', facebookAuth.selectedPixel?.id || 'NONE');
    console.log('  - Pixel from form:', req.body.pixel || 'NONE');
    console.log('  - Manual pixel entry:', req.body.manualPixelId || 'NONE');

    // Check if token exists and decrypt it
    if (!facebookAuth.accessToken) {
      return res.status(401).json({
        error: 'Facebook access token not found. Please reconnect your Facebook account.',
        requiresReauth: true
      });
    }

    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      decryptedToken = decryptToken(facebookAuth.accessToken);
      if (!decryptedToken) {
        return res.status(401).json({
          error: 'Failed to decrypt access token. Please reconnect your Facebook account.',
          requiresReauth: true
        });
      }
    } else {
      return res.status(401).json({
        error: 'Invalid access token. Please reconnect your Facebook account.',
        requiresReauth: true
      });
    }

    // REMOVED: Auto-fetch logic that was overriding user's pixel selection
    // Users must explicitly select a pixel via the resource selector

    // Get userId safely from multiple possible sources
    const userId = req.user?.id || req.userId || req.user;

    // Use universal ResourceHelper to get active resources
    console.log('📋 Getting active resources using ResourceHelper...');
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(userId);

    selectedAdAccountId = activeResources.selectedAdAccountId;  // No 'let' since already declared at top
    let selectedPageId = activeResources.selectedPageId;
    let selectedPixelId = activeResources.selectedPixelId;  // ONLY use user's selection, NO fallback

    console.log('  ✓ Source:', activeResources.source);
    console.log('  ✓ Ad Account:', activeResources.selectedAdAccount?.name || selectedAdAccountId);
    console.log('  ✓ Page:', activeResources.selectedPage?.name || selectedPageId);
    console.log('  ✓ Pixel:', activeResources.selectedPixel?.name || selectedPixelId || 'None');
    console.log('  🔍 Final pixel to use:', selectedPixelId || 'NONE (no conversion tracking)');

    // Override with request body if provided (for backward compatibility)
    if (req.body.selectedPageId) {
      console.log('  ⚠️ Overriding page with request body:', req.body.selectedPageId);
      selectedPageId = req.body.selectedPageId;
    }

    // Validate that we have required resources
    if (!selectedAdAccountId) {
      return res.status(400).json({
        error: 'Please select an ad account before creating campaigns'
      });
    }

    if (!selectedPageId) {
      return res.status(400).json({
        error: 'Please select a Facebook page before creating campaigns'
      });
    }

    // Create FacebookAPI instance with SELECTED resources (switched or original)
    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: (selectedAdAccountId || facebookAuth.selectedAdAccount.id).replace('act_', ''),
      pageId: selectedPageId || facebookAuth.selectedPage.id,
      pixelId: selectedPixelId  // Use ONLY user's selected pixel
    });

    // Handle media files - uploadSingle uses .any() so files are in req.files array
    // Note: JSON field parsing is now done in parseFormDataJson middleware before validation
    let mediaPath = null;
    let imagePaths = [];

    console.log('📎 Upload check:', {
      mediaType: req.body.mediaType,
      hasFile: !!req.file,
      hasFiles: !!req.files,
      fileDetails: req.file ? {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      } : null
    });

    // Handle media files - uploadSingle uses .any() so files are in req.files array
    let videoThumbnailPath = null;
    if (req.files && req.files.length > 0) {
      console.log(`📸 Files detected: ${req.files.length} file(s)`);
      console.log('📋 File details:', req.files.map(f => ({ fieldname: f.fieldname, filename: f.originalname, size: f.size })));

      if (req.body.mediaType === 'single_image') {
        mediaPath = req.files[0].path;
        console.log('✅ Single image detected:', mediaPath);

        // Process image with aspect ratio if specified
        if (req.body.aspectRatio && req.body.aspectRatio !== '1:1') {
          try {
            mediaPath = await processImageAspectRatio(mediaPath, req.body.aspectRatio);
          } catch (err) {
            console.error('⚠️ Failed to process image aspect ratio:', err);
          }
        }
      } else if (req.body.mediaType === 'carousel') {
        imagePaths = req.files.map(file => file.path);
        console.log('✅ Carousel images detected:', imagePaths.length, 'images');

        // Process carousel images with aspect ratio if specified
        if (req.body.aspectRatio) {
          try {
            imagePaths = await Promise.all(
              imagePaths.map(imgPath => processImageAspectRatio(imgPath, req.body.aspectRatio))
            );
          } catch (err) {
            console.error('⚠️ Failed to process carousel aspect ratios:', err);
          }
        }
      } else if (req.body.mediaType === 'video' || req.body.mediaType === 'single_video') {
        // Find video file (fieldname 'media')
        const videoFile = req.files.find(f => f.fieldname === 'media');
        if (videoFile) {
          mediaPath = videoFile.path;
          console.log('✅ Video detected:', mediaPath);
        } else {
          mediaPath = req.files[0].path; // Fallback to first file
          console.log('✅ Video detected (fallback):', mediaPath);
        }

        // Handle video thumbnail
        // Look for custom thumbnail upload by fieldname 'videoThumbnail'
        const thumbnailFile = req.files.find(f => f.fieldname === 'videoThumbnail');
        if (thumbnailFile) {
          videoThumbnailPath = thumbnailFile.path;
          console.log('✅ Custom video thumbnail detected:', videoThumbnailPath);

          // Process custom thumbnail with aspect ratio
          if (req.body.aspectRatio) {
            try {
              videoThumbnailPath = await processVideoThumbnail(videoThumbnailPath, req.body.aspectRatio);
            } catch (err) {
              console.error('⚠️ Failed to process video thumbnail:', err);
            }
          }
        } else if (req.body.videoThumbnailFrameIndex !== undefined) {
          // Extract thumbnail from video at specific frame
          try {
            const frameIndex = parseInt(req.body.videoThumbnailFrameIndex);
            videoThumbnailPath = await extractVideoThumbnail(mediaPath, frameIndex);
            console.log(`✅ Extracted video thumbnail from frame ${frameIndex}`);

            // Process extracted thumbnail with aspect ratio
            if (req.body.aspectRatio && videoThumbnailPath) {
              try {
                videoThumbnailPath = await processVideoThumbnail(videoThumbnailPath, req.body.aspectRatio);
              } catch (err) {
                console.error('⚠️ Failed to process extracted thumbnail:', err);
              }
            }
          } catch (err) {
            console.error('⚠️ Failed to extract video thumbnail:', err);
          }
        }

        // Process video with aspect ratio if specified
        if (req.body.aspectRatio) {
          try {
            mediaPath = await processVideoAspectRatio(mediaPath, req.body.aspectRatio);
          } catch (err) {
            console.error('⚠️ Failed to process video aspect ratio:', err);
          }
        }
      } else {
        // Default to single image if mediaType not specified but file exists
        mediaPath = req.files[0].path;
        console.log('✅ Media file detected (defaulting to image):', mediaPath);
      }
    } else {
      console.log('⚠️ No media files detected in request');
    }

    // Parse and validate budget values (keep in dollars, FacebookAPI will convert to cents)
    const parseBudget = (value) => {
      if (value === undefined || value === null) return undefined;
      // Frontend now sends values in dollars (we removed the * 100 multiplication)
      if (typeof value === 'number') {
        return value;  // Already in dollars
      }
      // Remove $ and commas, then parse to float
      const cleanValue = String(value).replace(/[$,]/g, '');
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? undefined : parsed;
    };

    // Check if we need to create multiple identical campaigns
    const numberOfCampaigns = req.body.numberOfCampaigns ? parseInt(req.body.numberOfCampaigns) : 1;
    console.log(`📊 Number of campaigns to create: ${numberOfCampaigns}`);

    // Prepare campaign data with all Meta-compliant Strategy 150 fields
    const campaignData = {
      // Campaign level fields
      campaignName: req.body.campaignName,
      buyingType: req.body.buyingType || 'AUCTION',
      objective: req.body.objective,
      budgetLevel: req.body.budgetLevel || 'campaign',  // Default to CBO
      // Properly handle special ad categories - filter out NONE and empty strings
      specialAdCategories: Array.isArray(req.body.specialAdCategories)
        ? req.body.specialAdCategories.filter(cat => cat !== 'NONE' && cat !== '')
        : [],
      campaignBudgetOptimization: req.body.budgetLevel === 'campaign' ? true : (req.body.campaignBudgetOptimization || false),
      bidStrategy: req.body.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',

      // Bid strategy related values
      bidAmount: parseBudget(req.body.bidAmount),
      costCap: parseBudget(req.body.costCap),
      minRoas: req.body.minRoas ? parseFloat(req.body.minRoas) : undefined,

      // Campaign budget (when using CBO) - set defaults if CBO is enabled
      campaignBudget: req.body.budgetLevel === 'campaign' ? {
        dailyBudget: parseBudget(req.body.campaignBudget?.dailyBudget) || 50,
        lifetimeBudget: parseBudget(req.body.campaignBudget?.lifetimeBudget)
      } : (req.body.campaignBudget || {}),
      campaignSpendingLimit: req.body.campaignSpendingLimit, // Only set if user provides it

      // Ad set level fields
      performanceGoal: req.body.performanceGoal || 'maximize_conversions',
      pixel: req.body.pixel || selectedPixelId, // Use form pixel or user's selected pixel ONLY
      manualPixelId: req.body.manualPixelId, // For manual pixel entry
      conversionEvent: req.body.conversionEvent || 'Lead',
      attributionSetting: req.body.attributionSetting || '1_day_click_1_day_view',
      attributionWindow: req.body.attributionWindow || '7_day',

      // Ad set budget & schedule
      // IMPORTANT: Always include spendingLimits even when using CBO (campaign-level budget)
      // Spending limits apply at ad set level regardless of budget level
      adSetBudget: req.body.budgetLevel === 'adset' ? {
        ...req.body.adSetBudget,
        dailyBudget: parseBudget(req.body.adSetBudget?.dailyBudget) || parseBudget(req.body.dailyBudget) || 50,
        lifetimeBudget: parseBudget(req.body.adSetBudget?.lifetimeBudget) || parseBudget(req.body.lifetimeBudget),
        // ✅ FIX: Auto-detect scheduleType from presence of dates
        scheduleType: req.body.adSetBudget?.scheduleType ||
                      req.body.scheduleType ||
                      (req.body.endDate || req.body.adSetBudget?.endDate || req.body.schedule?.endDate ? 'scheduled' : 'run_continuously'),
        startDate: req.body.adSetBudget?.startDate || req.body.startDate || req.body.schedule?.startDate,
        endDate: req.body.adSetBudget?.endDate || req.body.endDate || req.body.schedule?.endDate,
        dayparting: req.body.adSetBudget?.dayparting || req.body.dayparting || req.body.schedule?.dayparting
      } : {
        // When using CBO, still preserve spendingLimits (they apply at ad set level)
        spendingLimits: req.body.adSetBudget?.spendingLimits,
        // ✅ FIX: Auto-detect scheduleType from presence of dates
        scheduleType: req.body.adSetBudget?.scheduleType ||
                      req.body.scheduleType ||
                      (req.body.endDate || req.body.adSetBudget?.endDate || req.body.schedule?.endDate ? 'scheduled' : 'run_continuously'),
        startDate: req.body.adSetBudget?.startDate || req.body.startDate || req.body.schedule?.startDate,
        endDate: req.body.adSetBudget?.endDate || req.body.endDate || req.body.schedule?.endDate,
        dayparting: req.body.adSetBudget?.dayparting || req.body.dayparting || req.body.schedule?.dayparting
      },
      budgetType: req.body.budgetType || 'daily',

      // Also send budgets at root level for FacebookAPI compatibility
      // Use campaign budget if CBO, otherwise use ad set budget
      dailyBudget: req.body.budgetLevel === 'campaign'
        ? (parseBudget(req.body.campaignBudget?.dailyBudget) || 50)
        : (parseBudget(req.body.dailyBudget) || parseBudget(req.body.adSetBudget?.dailyBudget) || 50),
      lifetimeBudget: req.body.budgetLevel === 'campaign'
        ? parseBudget(req.body.campaignBudget?.lifetimeBudget)
        : (parseBudget(req.body.lifetimeBudget) || parseBudget(req.body.adSetBudget?.lifetimeBudget)),

      // Enhanced targeting (Meta-compliant)
      targeting: req.body.targeting || {
        locations: { countries: ['US'] },
        ageMin: 18,
        ageMax: 65,
        genders: ['all']
      },

      // Placement settings
      placementType: req.body.placementType || 'automatic',
      placements: req.body.placements || {
        facebook: ['feed', 'story'],
        instagram: ['stream', 'story'],
        audienceNetwork: ['classic'],
        messenger: [],
        devices: ['mobile', 'desktop'],
        platforms: ['all']
      },

      // Ad level fields
      facebookPage: req.body.facebookPage || selectedPageId,
      instagramAccount: req.body.instagramAccount,
      urlType: req.body.urlType || 'website',
      url: req.body.url,
      primaryText: req.body.primaryText,
      headline: req.body.headline,
      description: req.body.description,
      callToAction: req.body.callToAction || 'LEARN_MORE',
      displayLink: req.body.displayLink,

      // Media specifications
      mediaType: req.body.mediaType || 'single_image',
      mediaSpecs: req.body.mediaSpecs,
      imagePath: req.body.mediaType === 'single_image' ? mediaPath : null,
      videoPath: (req.body.mediaType === 'single_video' || req.body.mediaType === 'video') ? mediaPath : null,
      videoThumbnailPath: videoThumbnailPath,  // Processed video thumbnail
      aspectRatio: req.body.aspectRatio || '1:1',  // Selected aspect ratio
      imagePaths: req.body.mediaType === 'carousel' ? imagePaths : null,
      editorName: req.body.editorName,  // Editor name from Creative Library for ad naming

      // Duplication settings for the 49 ad sets
      duplicationSettings: req.body.duplicationSettings || {
        defaultBudgetPerAdSet: 1,
        budgetDistributionType: 'equal'
      },

      // Process control
      publishDirectly: req.body.publishDirectly || false,

      // System fields
      selectedPageId: selectedPageId,
      selectedAdAccountId: selectedAdAccountId,
      selectedPixelId: selectedPixelId || req.body.pixel,

      // Additional Meta options
      costCap: req.body.costCap,
      minRoas: req.body.minRoas,
      conversionLocation: req.body.conversionLocation || 'website'
    };

    console.log('🟢 Creating Strategy 1-50-1 campaign with data:', {
      campaignName: campaignData.campaignName,
      buyingType: campaignData.buyingType,
      objective: campaignData.objective,
      performanceGoal: campaignData.performanceGoal,
      publishDirectly: campaignData.publishDirectly,
      specialAdCategories: campaignData.specialAdCategories,
      bidStrategy: campaignData.bidStrategy
    });

    console.log('🟢 Special Ad Categories detail:', JSON.stringify(campaignData.specialAdCategories));
    console.log('🟢 Targeting detail:', JSON.stringify(campaignData.targeting));

    // DEBUG: Check spending limits data
    console.log('🔍 DEBUG - Spending Limits Data Flow:');
    console.log('  📦 req.body.adSetBudget:', JSON.stringify(req.body.adSetBudget, null, 2));
    console.log('  📦 campaignData.adSetBudget:', JSON.stringify(campaignData.adSetBudget, null, 2));
    console.log('  📦 campaignData.adSetBudget?.spendingLimits:', JSON.stringify(campaignData.adSetBudget?.spendingLimits, null, 2));
    console.log('  📦 campaignData.spendingLimits:', JSON.stringify(campaignData.spendingLimits, null, 2));

    // Log the final data being sent to Facebook API
    console.log('📤 Sending to Facebook API:');
    console.log('  Campaign Name:', campaignData.campaignName);
    console.log('  Objective:', campaignData.objective);
    console.log('  Daily Budget:', campaignData.dailyBudget, typeof campaignData.dailyBudget);
    console.log('  Page ID:', campaignData.facebookPage || selectedPageId);
    console.log('  Pixel ID:', campaignData.pixel);
    console.log('  Media Type:', campaignData.mediaType);
    console.log('  Has Image:', !!campaignData.imagePath);

    // Handle multi-account deployment if requested
    if (req.body._multiAccountDeployment) {
      const { targets, mode } = req.body._multiAccountDeployment;
      console.log(`\n🚀 MULTI-ACCOUNT DEPLOYMENT REQUESTED`);
      console.log(`  Targets: ${targets?.length || 0}`);
      console.log(`  Mode: ${mode}`);

      const CrossAccountDeploymentService = require('../services/CrossAccountDeploymentService');

      try {
        // STEP 1: Create initial 1-1-1 structure using SEQUENTIAL method
        // This is required to get the post ID for batch duplication
        console.log(`\n📝 Step 1: Creating initial 1-1-1 structure in current account (${selectedAdAccountId})...`);
        console.log(`  ℹ️  Using sequential creation to establish post ID for batch duplication`);

        // Create the initial campaign + 1 ad set + 1 ad
        const initialResult = await userFacebookApi.createStrategy150Campaign(campaignData);

        console.log(`✅ Initial 1-1-1 structure created successfully!`);
        console.log(`  Campaign ID: ${initialResult.campaign.id}`);
        console.log(`  Ad Set ID: ${initialResult.adSet.id}`);
        console.log(`  Ad ID: ${initialResult.ads[0].id}`);
        console.log(`  Post ID: ${initialResult.postId || 'Not captured'}`);

        // STEP 2: Use BATCH API to duplicate the remaining 49 ad sets + ads
        // TRY BATCH FIRST, FALL BACK TO SEQUENTIAL IF IT FAILS
        console.log(`\n📝 Step 2: Duplicating remaining 49 ad sets + ads...`);
        console.log(`  ℹ️  All duplicates will use the same post ID for 100% root effect`);

        if (!initialResult.postId) {
          throw new Error('Post ID not captured from initial ad creation. Cannot proceed with duplication.');
        }

        let batchResult = null;
        let usedBatchMethod = false;

        try {
          console.log(`  🚀 Attempting BATCH API method...`);

          // Initialize Batch Service
          const BatchDuplicationService = require('../services/batchDuplication');
          const batchService = new BatchDuplicationService(
            decryptedToken,
            selectedAdAccountId.replace('act_', ''),
            selectedPageId,
            selectedPixelId
          );

          // Execute batch duplication (49 ad sets + 49 ads)
          batchResult = await batchService.duplicateAdSetsBatch(
            initialResult.adSet.id,      // Original ad set to copy
            initialResult.campaign.id,   // Campaign to add to
            initialResult.postId,        // Post ID to reuse (KEY!)
            49,                          // Number of duplicates
            campaignData                 // Form data for naming
          );

          // Check if batch was successful enough (at least 90% success rate)
          if (batchResult.summary.successRate >= 90) {
            usedBatchMethod = true;
            console.log(`  ✅ BATCH API successful!`);
            console.log(`    Ad Sets Created: ${batchResult.adSets.length}/49`);
            console.log(`    Ads Created: ${batchResult.ads.length}/49`);
            console.log(`    API Calls Used: ${batchResult.batchesExecuted}`);
            console.log(`    API Calls Saved: ${batchResult.apiCallsSaved}`);
            console.log(`    Success Rate: ${batchResult.summary.successRate}%`);
          } else {
            throw new Error(`Batch success rate too low: ${batchResult.summary.successRate}%. Falling back to sequential.`);
          }

        } catch (batchError) {
          console.warn(`  ⚠️  BATCH API failed: ${batchError.message}`);
          console.log(`  🔄 Falling back to SEQUENTIAL method...`);

          // FALLBACK: Use sequential duplication
          const Strategy150Duplication = require('../services/strategy150Duplication');
          const duplicationService = new Strategy150Duplication(userFacebookApi);

          // Duplicate 49 ad sets sequentially
          const sequentialResults = await duplicationService.duplicateAdSetsSequential(
            initialResult.adSet.id,
            initialResult.campaign.id,
            initialResult.postId,
            49,
            campaignData
          );

          // Transform sequential results to match batch result format
          batchResult = {
            adSets: sequentialResults.adSets || [],
            ads: sequentialResults.ads || [],
            operations: 49 * 2, // 49 ad sets + 49 ads
            batchesExecuted: 49 * 2, // Each entity created separately
            apiCallsSaved: 0, // Sequential method saves nothing
            summary: {
              totalExpected: 49,
              totalSuccess: sequentialResults.adSets?.length || 0,
              totalAdSetsCreated: sequentialResults.adSets?.length || 0,
              totalAdsCreated: sequentialResults.ads?.length || 0,
              totalFailed: 49 - (sequentialResults.adSets?.length || 0),
              successRate: Math.round(((sequentialResults.adSets?.length || 0) / 49) * 100),
              hasFailures: (sequentialResults.adSets?.length || 0) < 49
            }
          };

          console.log(`  ✅ SEQUENTIAL method completed`);
          console.log(`    Ad Sets Created: ${batchResult.adSets.length}/49`);
          console.log(`    Ads Created: ${batchResult.ads.length}/49`);
          console.log(`    Success Rate: ${batchResult.summary.successRate}%`);
        }

        // Combine initial + duplicated results (1 initial + 49 duplicates = 50 total)
        initialResult.allAdSets = [initialResult.adSet.id, ...batchResult.adSets.map(as => as.id)];
        initialResult.allAds = [initialResult.ads[0].id, ...batchResult.ads.map(ad => ad.id)];
        initialResult.totalAdSets = initialResult.allAdSets.length; // Should be 50
        initialResult.totalAds = initialResult.allAds.length; // Should be 50
        initialResult.duplicationMethod = usedBatchMethod ? 'BATCH_API' : 'SEQUENTIAL';
        initialResult.batchStats = {
          method: initialResult.duplicationMethod,
          operations: batchResult.operations,
          batchesExecuted: batchResult.batchesExecuted,
          apiCallsSaved: batchResult.apiCallsSaved,
          successRate: batchResult.summary.successRate
        };

        console.log(`\n📊 CAMPAIGN TOTALS:`);
        console.log(`  ✅ Campaign: ${initialResult.campaign.id}`);
        console.log(`  ✅ Total Ad Sets: ${initialResult.totalAdSets}/50 (1 initial + ${batchResult.adSets.length} duplicates)`);
        console.log(`  ✅ Total Ads: ${initialResult.totalAds}/50 (1 initial + ${batchResult.ads.length} duplicates)`);
        console.log(`  ✅ Post ID: ${initialResult.postId} (100% root effect - all ads use same post)`);
        console.log(`  ✅ Method Used: ${initialResult.duplicationMethod}`);

        // Now deploy to other accounts
        console.log(`\n📝 Step 3: Deploying to ${targets.length} additional accounts...`);

        const sourceAccount = {
          adAccountId: selectedAdAccountId,
          pageId: selectedPageId,
          pixelId: selectedPixelId
        };

        // Pass the original campaign data so target accounts get the SAME structure
        // This includes the number of ad sets (50 for 1-50-1 strategy)
        const strategyInfo = {
          numberOfAdSets: 50, // 1-50-1 strategy always has 50 ad sets
          adSetBudget: campaignData.adSetBudget,
          customBudgets: campaignData.customBudgets,
          campaignData: campaignData // Pass full campaign data for recreation
        };

        const deploymentResult = await CrossAccountDeploymentService.deployToMultipleTargets(
          req.user.id,
          initialResult.campaignId,
          sourceAccount,
          targets,
          mode,
          strategyInfo // Pass strategy info
        );

        console.log(`\n✅ MULTI-ACCOUNT DEPLOYMENT COMPLETED!`);
        console.log(`  Total targets: ${deploymentResult.totalTargets}`);
        console.log(`  Successful: ${deploymentResult.successful}`);
        console.log(`  Failed: ${deploymentResult.failed}`);

        // Audit log for multi-account deployment
        await AuditService.log({
          userId: req.user.id,
          action: 'campaign_multi_account_deployment',
          resourceType: 'campaign',
          resourceId: initialResult.campaignId,
          details: {
            targetCount: targets.length,
            successful: deploymentResult.successful,
            failed: deploymentResult.failed,
            mode: mode
          }
        });

        return res.json({
          success: true,
          message: `Multi-account deployment completed! Campaign created in ${deploymentResult.successful + 1} accounts (including current).`,
          data: {
            ...initialResult,
            multiAccountDeployment: {
              deploymentId: deploymentResult.deploymentId,
              totalTargets: deploymentResult.totalTargets,
              successful: deploymentResult.successful,
              failed: deploymentResult.failed,
              results: deploymentResult.results
            }
          }
        });

      } catch (deploymentError) {
        console.error('❌ Multi-account deployment failed:', deploymentError);
        return res.status(500).json({
          success: false,
          error: 'Multi-account deployment failed',
          details: deploymentError.message
        });
      }
    }

    // Create multiple campaigns if requested
    const createdCampaigns = [];
    let mediaHashes = null; // Store media hashes from first campaign to reuse

    for (let campaignIndex = 0; campaignIndex < numberOfCampaigns; campaignIndex++) {
      // Modify campaign name for multiple campaigns
      const currentCampaignName = numberOfCampaigns > 1
        ? `${campaignData.campaignName} - Copy ${campaignIndex + 1}`
        : campaignData.campaignName;

      // Update campaign data with current name
      const currentCampaignData = {
        ...campaignData,
        campaignName: currentCampaignName
      };

      // Reuse media hashes from first campaign for subsequent campaigns
      if (campaignIndex > 0 && mediaHashes) {
        currentCampaignData.reusedMediaHashes = mediaHashes;
        currentCampaignData.skipMediaUpload = true;
        console.log(`♻️ Campaign ${campaignIndex + 1}: Reusing media from first campaign`);
      }

      // Add delay between campaign creations to avoid rate limits
      if (campaignIndex > 0) {
        console.log(`⏱️ Waiting 5 seconds before creating campaign ${campaignIndex + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // ============================================================================
      // BATCH CREATION MODE (NEW - 100% ROOT EFFECT)
      // ============================================================================
      // Use batch API to create full 1-50-1 structure in ONE go
      // This is 3x faster and ensures perfect consistency across all 50 ad sets
      //
      // Feature flag: useBatchCreation (default: true)
      // Set to false to use legacy sequential creation + duplication method
      // ============================================================================

      const useBatchCreation = req.body.useBatchCreation !== false; // Default to true

      let result;
      try {
        if (useBatchCreation) {
          console.log(`\n🚀 ===============================================`);
          console.log(`🚀 BATCH CREATION MODE (100% ROOT EFFECT)`);
          console.log(`🚀 ===============================================`);
          console.log(`📝 Creating campaign ${campaignIndex + 1} of ${numberOfCampaigns}: ${currentCampaignName}`);
          console.log(`📊 This will create 1 campaign + 50 ad sets + 50 ads in ~3 API calls`);

          // Step 1: Upload media FIRST (batch needs hashes/IDs, not paths)
          console.log('\n📤 Step 1: Uploading media assets...');
          let uploadedImageHash, uploadedVideoId, uploadedVideoThumbnail;

          // Reuse media from first campaign if available
          if (campaignIndex > 0 && mediaHashes) {
            console.log('♻️  Reusing media from first campaign');
            uploadedImageHash = mediaHashes.imageHash;
            uploadedVideoId = mediaHashes.videoId;
            uploadedVideoThumbnail = mediaHashes.videoThumbnail;
          } else {
            // Upload new media
            if (currentCampaignData.imagePath) {
              console.log(`📸 Uploading image: ${currentCampaignData.imagePath}`);
              uploadedImageHash = await userFacebookApi.uploadImage(currentCampaignData.imagePath);
              console.log(`✅ Image uploaded: ${uploadedImageHash}`);
            }

            if (currentCampaignData.videoPath) {
              console.log(`📹 Uploading video: ${currentCampaignData.videoPath}`);
              uploadedVideoId = await userFacebookApi.uploadVideoSmart(currentCampaignData.videoPath);
              console.log(`✅ Video uploaded: ${uploadedVideoId}`);

              // Upload custom thumbnail if provided, OR auto-extract from video
              if (currentCampaignData.videoThumbnailPath) {
                console.log(`📸 Uploading custom video thumbnail: ${currentCampaignData.videoThumbnailPath}`);
                uploadedVideoThumbnail = await userFacebookApi.uploadImage(currentCampaignData.videoThumbnailPath);
                console.log(`✅ Custom thumbnail uploaded: ${uploadedVideoThumbnail}`);
              } else {
                // AUTO-EXTRACT THUMBNAIL: Facebook requires a thumbnail for video ads
                // Extract first frame (index 0) from the video
                console.log(`📸 Auto-extracting video thumbnail (frame 0)...`);
                try {
                  const autoThumbnailPath = await extractVideoThumbnail(currentCampaignData.videoPath, 0);
                  if (autoThumbnailPath) {
                    console.log(`✅ Thumbnail extracted: ${autoThumbnailPath}`);
                    uploadedVideoThumbnail = await userFacebookApi.uploadImage(autoThumbnailPath);
                    console.log(`✅ Auto-extracted thumbnail uploaded: ${uploadedVideoThumbnail}`);
                  } else {
                    console.warn(`⚠️ Could not extract thumbnail from video`);
                  }
                } catch (thumbnailError) {
                  console.warn(`⚠️ Thumbnail extraction failed: ${thumbnailError.message}`);
                  // Continue without thumbnail - Facebook may reject the ad
                }
              }
            }

            if (currentCampaignData.imagePaths && currentCampaignData.imagePaths.length > 0) {
              console.log(`📸 Uploading ${currentCampaignData.imagePaths.length} carousel images...`);
              const carouselHashes = [];
              for (const imagePath of currentCampaignData.imagePaths) {
                const hash = await userFacebookApi.uploadImage(imagePath);
                if (hash) carouselHashes.push(hash);
              }
              console.log(`✅ ${carouselHashes.length} carousel images uploaded`);
              currentCampaignData.carouselImages = carouselHashes;
            }

            // Store for reuse
            if (campaignIndex === 0) {
              mediaHashes = {
                imageHash: uploadedImageHash,
                videoId: uploadedVideoId,
                videoThumbnail: uploadedVideoThumbnail
              };
              console.log('💾 Stored media hashes for reuse in subsequent campaigns');
            }
          }

          // Step 2: Initialize Batch Service
          console.log('\n🔧 Step 2: Initializing Batch Duplication Service...');
          const BatchDuplicationService = require('../services/batchDuplication');
          const batchService = new BatchDuplicationService(
            decryptedToken,
            selectedAdAccountId.replace('act_', ''),
            selectedPageId,
            selectedPixelId
          );
          console.log('✅ Batch service initialized');

          // Step 3: Prepare template data for batch creation
          console.log('\n📋 Step 3: Preparing template data...');
          const templateData = {
            ...currentCampaignData,
            // Replace file paths with Facebook hashes/IDs
            imageHash: uploadedImageHash,
            videoId: uploadedVideoId,
            videoThumbnail: uploadedVideoThumbnail,
            // Remove path fields to avoid confusion
            imagePath: undefined,
            videoPath: undefined,
            videoThumbnailPath: undefined
          };
          console.log('✅ Template data prepared');

          // DEBUG: Log displayLink to verify it's being passed correctly
          console.log('🔍 DEBUG - Display Link verification:');
          console.log('  📦 req.body.displayLink:', req.body.displayLink);
          console.log('  📦 currentCampaignData.displayLink:', currentCampaignData.displayLink);
          console.log('  📦 templateData.displayLink:', templateData.displayLink);

          // Step 4: Execute batch creation (1 campaign + 50 ad sets + 50 ads)
          console.log('\n🚀 Step 4: Executing batch creation...');
          const batchResult = await batchService.createFromTemplateBatch(
            templateData,
            50,  // 50 ad sets (Strategy 150)
            1    // 1 ad per ad set
          );

          // Step 5: Transform batch result to match existing response format
          console.log('\n🔄 Step 5: Transforming batch results...');
          result = transformBatchResultToStrategy150Format(batchResult, templateData, currentCampaignName);
          console.log(`✅ Batch creation complete!`);
          console.log(`   Campaign: ${result.campaign.id}`);
          console.log(`   Ad Sets: ${result.adSets ? result.adSets.length : 50}`);
          console.log(`   API calls saved: ${batchResult.apiCallsSaved}`);

        } else {
          // LEGACY MODE: Sequential creation + duplication
          console.log(`\n📝 LEGACY MODE: Creating campaign ${campaignIndex + 1} of ${numberOfCampaigns}: ${currentCampaignName}`);
          console.log(`⚠️  Using sequential creation (slower, requires frontend duplication)`);
          result = await userFacebookApi.createStrategy150Campaign(currentCampaignData);

          // Store media hashes from first campaign
          if (campaignIndex === 0 && result.mediaHashes) {
            mediaHashes = result.mediaHashes;
            console.log('💾 Stored media hashes for reuse in subsequent campaigns');
          }
        }

      } catch (error) {
        console.error(`❌ Strategy 1-50-1 Campaign ${campaignIndex + 1} Creation Error:`);
        console.error('Error message:', error.message);
        console.error('Error code:', error.fbError?.code || error.status || 'Unknown');
        if (error.fbError) {
          console.error('Facebook Error Details:', JSON.stringify(error.fbError, null, 2));
        }

        // If we've created some campaigns successfully, return those
        if (createdCampaigns.length > 0) {
          console.log(`⚠️ Created ${createdCampaigns.length} of ${numberOfCampaigns} campaigns before error`);
          break;
        }
        throw error;
      }

      // Helper function to transform batch results (defined inline for now)
      function transformBatchResultToStrategy150Format(batchResult, templateData, campaignName) {
        // Extract campaign ID from first batch result (operation 0)
        const campaignResult = batchResult.results[0];
        let campaignId = null;
        if (campaignResult && campaignResult.code === 200 && campaignResult.body) {
          const body = JSON.parse(campaignResult.body);
          campaignId = body.id;
        }

        // Extract ad set IDs (operations 1-50, even indices after campaign)
        const adSetIds = [];
        const adIds = [];

        for (let i = 1; i < batchResult.results.length; i++) {
          const result = batchResult.results[i];
          const isAdSet = (i - 1) % 2 === 0; // After campaign, pattern is: adset, ad, adset, ad...

          if (result && result.code === 200 && result.body) {
            const body = JSON.parse(result.body);
            if (body.id) {
              if (isAdSet) {
                adSetIds.push(body.id);
              } else {
                adIds.push(body.id);
              }
            }
          }
        }

        console.log(`📊 Parsed results: Campaign=${campaignId}, AdSets=${adSetIds.length}, Ads=${adIds.length}`);

        // Return format matching createStrategy150Campaign() response
        return {
          campaign: {
            id: campaignId,
            name: campaignName
          },
          adSet: {
            id: adSetIds[0], // First ad set (for compatibility)
            name: `${campaignName} - Ad Set 1`
          },
          ads: adIds.slice(0, 1).map((id, i) => ({ // Only return first ad for compatibility
            id,
            name: `${campaignName} - Ad ${i + 1}`
          })),
          allAdSets: adSetIds, // Include all ad sets for tracking
          allAds: adIds,       // Include all ads for tracking
          postId: null, // Batch doesn't create a post (ads use creative directly)
          mediaHashes: {
            imageHash: templateData.imageHash,
            videoId: templateData.videoId,
            videoThumbnail: templateData.videoThumbnail
          },
          batchStats: {
            operations: batchResult.operations,
            batchesExecuted: batchResult.batchesExecuted,
            apiCallsSaved: batchResult.apiCallsSaved,
            method: 'batch'
          }
        };
      }

      // Determine ad set count based on creation method
      const adSetCount = useBatchCreation ? 50 : 1;
      const creationMethod = useBatchCreation ? 'batch' : 'sequential';

      await AuditService.logRequest(req, 'strategy150.create', 'campaign', result.campaign?.id, 'success', null, {
        campaignId: result.campaign?.id,
        campaignName: currentCampaignName,
        campaignNumber: campaignIndex + 1,
        totalCampaigns: numberOfCampaigns,
        adAccountId: selectedAdAccountId,
        strategyType: '1-50-1',
        objective: campaignData.objective,
        budget: campaignData.dailyBudget || campaignData.lifetimeBudget,
        adSetsCreated: adSetCount,
        creationMethod: creationMethod,
        apiCallsSaved: result.batchStats?.apiCallsSaved || 0
      });

      // Store campaign in tracking table for management
      try {
        const { CampaignTracking } = require('../models');
        await CampaignTracking.create({
          campaign_id: result.campaign.id,
          campaign_name: currentCampaignName,
          user_id: userId,
          ad_account_id: facebookAuth.selectedAdAccount?.id || selectedAdAccountId,
          strategy_type: '1-50-1',
          post_id: result.postId || null,
          ad_set_count: adSetCount, // 50 if batch, 1 if sequential (will be 50 after duplication)
          status: 'ACTIVE'
        });
        console.log(`📊 Campaign ${result.campaign.id} added to tracking (${adSetCount} ad sets)`);
      } catch (trackingError) {
        console.error('Warning: Could not add campaign to tracking:', trackingError.message);
        // Don't fail the request if tracking fails
      }

      // Add campaign to results array
      createdCampaigns.push({
        campaign: result.campaign,
        adSet: result.adSet,
        ads: result.ads,
        postId: result.postId,
        campaignNumber: campaignIndex + 1,
        creationMethod: creationMethod,
        batchStats: result.batchStats
      });

      // Auto-duplicate ad sets for multiple campaigns ONLY if using legacy mode
      // (Batch mode already creates all 50 ad sets in one go)
      if (numberOfCampaigns > 1 && !useBatchCreation) {
        console.log(`\n🔄 Auto-duplicating ad sets for campaign ${campaignIndex + 1} (${currentCampaignName})...`);

        try {
          const duplicateData = {
            campaignId: result.campaign.id,
            originalAdSetId: result.adSet.id,
            postId: result.postId,
            count: 49, // Duplicate 49 times to get total of 50 (including original)
            customBudgets: Array(49).fill(1.00), // Default $1 budget for each
            userId: userId
          };

          // Trigger duplication (fire and forget - runs in background)
          userFacebookApi.duplicateAdSetsWithExistingPost(duplicateData);
          console.log(`✅ Auto-duplication started for campaign ${campaignIndex + 1}`);

          // Update tracking record to reflect upcoming 50 ad sets
          const { CampaignTracking } = require('../models');
          await CampaignTracking.update(
            { ad_set_count: 50 },
            { where: { campaign_id: result.campaign.id } }
          );
        } catch (dupError) {
          console.error(`⚠️ Auto-duplication failed for campaign ${campaignIndex + 1}:`, dupError.message);
          // Don't fail the entire request if duplication fails
          // User can manually trigger duplication from frontend
        }
      } else if (numberOfCampaigns > 1 && useBatchCreation) {
        console.log(`✅ Campaign ${campaignIndex + 1} already has all 50 ad sets (batch mode)`);
      }
    } // End of campaign creation loop

    // Prepare response based on number of campaigns created
    const responseMessage = numberOfCampaigns > 1
      ? `Successfully created ${createdCampaigns.length} identical Strategy 1-50-1 campaigns`
      : 'Strategy 1-50-1 initial campaign created successfully';

    // For single campaign, return the same format as before for backward compatibility
    if (numberOfCampaigns === 1 && createdCampaigns.length === 1) {
      const singleResult = createdCampaigns[0];
      const isBatchComplete = singleResult.creationMethod === 'batch';

      res.json({
        success: true,
        message: isBatchComplete
          ? `✅ Strategy 1-50-1 campaign created successfully with all 50 ad sets via batch API!`
          : responseMessage,
        data: {
          // If batch mode completed all 50, set phase to 'completed' so frontend skips post ID waiting
          phase: isBatchComplete ? 'completed' : 'initial',
          campaign: singleResult.campaign,
          adSet: singleResult.adSet,
          ads: singleResult.ads,
          adAccount: facebookAuth.selectedAdAccount, // Add ad account info
          page: facebookAuth.selectedPage || { id: selectedPageId, name: 'Page' }, // Add page info
          pixel: pixelId ? { id: pixelId, name: facebookAuth.selectedPixel?.name || 'Pixel' } : null, // Add pixel info if used
          postId: singleResult.postId, // Include postId from result
          // Batch completion indicators for frontend
          batchComplete: isBatchComplete,
          creationMethod: singleResult.creationMethod || 'sequential',
          allAdSetsCreated: isBatchComplete ? (singleResult.batchStats?.allAdSets?.length || 50) : 1,
          allAdsCreated: isBatchComplete ? (singleResult.batchStats?.allAds?.length || 50) : 1,
          batchStats: singleResult.batchStats || null
        }
      });
    } else {
      // For multiple campaigns, return an array
      res.json({
        success: true,
        message: responseMessage,
        data: {
          phase: 'initial',
          campaigns: createdCampaigns, // Array of all created campaigns
          totalRequested: numberOfCampaigns,
          totalCreated: createdCampaigns.length,
          adAccount: facebookAuth.selectedAdAccount, // Add ad account info
          page: facebookAuth.selectedPage || { id: selectedPageId, name: 'Page' }, // Add page info
          pixel: pixelId ? { id: pixelId, name: facebookAuth.selectedPixel?.name || 'Pixel' } : null // Add pixel info if used
        }
      });
    }
  } catch (error) {
    console.error('Strategy 1-50-1 creation error:', error);

    // Track failure in FailureTracker for the Failures box
    const userId = req.user?.id || req.userId;
    if (userId) {
      await FailureTracker.safeTrackFailedEntity({
        userId,
        campaignId: null, // Campaign may not have been created yet
        campaignName: req.body?.campaignName || 'Unknown Campaign',
        entityType: 'campaign',
        error: error,
        strategyType: 'strategy150',
        metadata: {
          adAccountId: selectedAdAccountId,
          objective: req.body?.objective,
          stage: 'campaign_creation'
        }
      });
    }

    await AuditService.logRequest(req, 'strategy150.create', null, null, 'failure', error.message, {
      adAccountId: selectedAdAccountId,
      strategyType: '1-50-1'
    });
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

// Get post ID from created ad
router.get('/post-id/:adId', authenticate, requireFacebookAuth, async (req, res) => {
  // Set response type to JSON immediately
  res.setHeader('Content-Type', 'application/json');

  try {
    const { adId } = req.params;

    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(401).json({
        error: 'Facebook authentication required',
        requiresReauth: true
      });
    }

    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      decryptedToken = decryptToken(facebookAuth.accessToken);
    } else {
      return res.status(401).json({
        error: 'Invalid access token format',
        requiresReauth: true
      });
    }

    // Use universal ResourceHelper to get active resources
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(req.user.id);

    if (!activeResources.selectedAdAccountId || !activeResources.selectedPageId) {
      return res.status(400).json({
        error: 'Please select an ad account and page before fetching post ID',
        requiresReauth: false
      });
    }

    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: activeResources.selectedAdAccountId.replace('act_', ''),
      pageId: activeResources.selectedPageId
    });

    const postId = await userFacebookApi.getPostIdFromAd(adId);

    if (postId) {
      res.json({
        success: true,
        postId: postId
      });
    } else {
      res.json({
        success: false,
        requiresManualInput: true,
        error: 'Could not automatically capture post ID'
      });
    }
  } catch (error) {
    console.error('Post ID capture error:', error);
    res.status(500).json({
      success: false,
      requiresManualInput: true,
      error: error.message
    });
  }
});

// Verify campaign for multiplication
router.get('/verify/:campaignId', authenticate, requireFacebookAuth, refreshFacebookToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { skipDetails } = req.query; // Add query param to skip fetching details

    // Use token from middleware (already validated and decrypted)
    const decryptedToken = req.facebookAuth.accessToken;
    const facebookAuth = req.facebookAuth.authRecord;

    // If skipDetails is true, return minimal info for multiplication
    if (skipDetails === 'true') {
      console.log('🚀 Skipping detailed verification for multiplication - using deep_copy');
      return res.json({
        success: true,
        campaign: {
          id: campaignId,
          name: 'Strategy 1-50-1 Campaign'
        },
        isStrategy150: true, // Assume it's Strategy 150 if called from multiplication
        adSetCount: 50, // Expected count
        postId: null // Not needed for deep_copy
      });
    }

    // Use universal ResourceHelper to get active resources
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(req.user.id);

    if (!activeResources.selectedAdAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Please select an ad account before verifying campaigns'
      });
    }

    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: activeResources.selectedAdAccountId.replace('act_', ''),
      pageId: activeResources.selectedPageId
    });

    // Fetch campaign details
    const campaignDetails = await userFacebookApi.getCampaignFullDetails(campaignId);

    if (!campaignDetails) {
      return res.json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get ad sets count
    const adSets = await userFacebookApi.getAdSetsForCampaign(campaignId);

    // Check if it's a Strategy 150 campaign (should have ~50 adsets)
    const isStrategy150 = adSets && adSets.length >= 45 && adSets.length <= 55;

    // Try to get post ID from first ad set
    let postId = null;
    if (adSets && adSets.length > 0) {
      postId = await userFacebookApi.getPostIdFromAdSet(adSets[0].id);
    }

    res.json({
      success: true,
      campaign: {
        id: campaignId,
        name: campaignDetails.name,
        status: campaignDetails.status,
        adSetCount: adSets ? adSets.length : 0,
        isStrategy150: isStrategy150
      },
      postId: postId
    });
  } catch (error) {
    console.error('Campaign verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify campaign'
    });
  }
});

// Verify post ID
router.get('/verify-post/:postId', authenticate, requireFacebookAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      decryptedToken = decryptToken(facebookAuth.accessToken);
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token format'
      });
    }

    // Verify post exists by trying to fetch it
    const axios = require('axios');
    // Use the post ID as-is with the underscore format
    try {
      await axios.get(`https://graph.facebook.com/v18.0/${postId}`, {
        params: {
          access_token: decryptedToken,
          fields: 'id,message,created_time'
        }
      });

      res.json({ success: true });
    } catch (error) {
      res.json({
        success: false,
        error: 'Post ID not found or inaccessible'
      });
    }
  } catch (error) {
    console.error('Post ID verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Duplicate ad sets (1-49-1)
router.post('/duplicate', authenticate, requireFacebookAuth, refreshFacebookToken, async (req, res) => {
  try {
    const {
      campaignId,
      originalAdSetId,
      postId,
      formData,
      count = 49,
      duplicateBudgets = [] // Array of custom budgets for each duplicate
    } = req.body;

    if (!campaignId || !originalAdSetId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID and Ad Set ID are required'
      });
    }

    // Use token from middleware (already validated and decrypted)
    const decryptedToken = req.facebookAuth.accessToken;
    const facebookAuth = req.facebookAuth.authRecord;

    // Use universal ResourceHelper to get active resources
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(req.user.id);

    if (!activeResources.selectedAdAccountId || !activeResources.selectedPageId) {
      return res.status(400).json({
        success: false,
        error: 'Please select an ad account and page before duplicating ad sets'
      });
    }

    console.log('📋 Using active resources for duplication:');
    console.log('  ✓ Ad Account:', activeResources.selectedAdAccount?.name || activeResources.selectedAdAccountId);
    console.log('  ✓ Page:', activeResources.selectedPage?.name || activeResources.selectedPageId);

    // Initialize Batch Duplication Service for optimized API calls
    const BatchDuplicationService = require('../services/batchDuplication');
    const pixelId = activeResources.selectedPixelId || facebookAuth.selectedPixel?.id || null;

    const batchService = new BatchDuplicationService(
      decryptedToken,
      activeResources.selectedAdAccountId.replace('act_', ''),
      activeResources.selectedPageId,
      pixelId
    );

    console.log('🚀 Starting BATCH duplication (optimized API calls)...');
    console.log(`  ✓ Mode: Batch API (${Math.ceil((count * 2) / 20)} API calls instead of ${count * 2})`);
    console.log(`  ✓ Count: ${count} ad sets`);

    // Note: Custom budgets will be supported in future enhancement
    // Currently batch service copies budget from original ad set
    if (duplicateBudgets && duplicateBudgets.length > 0) {
      console.log(`  ℹ️  Custom budgets provided but not yet supported in batch mode`);
      console.log(`  ℹ️  Using original ad set budget for all duplicates`);
    }

    // Execute batch duplication
    const result = await batchService.duplicateAdSetsBatch(
      originalAdSetId,
      campaignId,
      postId,
      count,
      formData
    );

    console.log('✅ Batch duplication completed successfully');
    console.log(`  ✓ Created: ${result.adSets?.length || 0} ad sets`);
    console.log(`  ✓ Success Rate: ${result.summary?.successRate || 0}%`);
    console.log(`  ✓ API Calls Used: ${result.batchesExecuted || 0}`);
    console.log(`  ✓ API Calls Saved: ${result.apiCallsSaved || 0}`);

    res.json({
      success: true,
      message: 'Duplication completed successfully using Batch API',
      data: {
        campaignId,
        count,
        status: 'completed',
        adAccount: activeResources.selectedAdAccount,
        postId: postId,
        adSets: result.adSets || [],
        summary: result.summary || {},
        apiCallsUsed: result.batchesExecuted || Math.ceil((count * 2) / 20),
        apiCallsSaved: result.apiCallsSaved || 0
      }
    });
  } catch (error) {
    console.error('Duplication start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get duplication progress
router.get('/progress/:campaignId', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;

    // This would typically fetch progress from a database or cache
    // For now, return mock progress data
    const progress = {
      completed: Math.floor(Math.random() * 50),
      total: 49,
      currentOperation: 'Creating ad set copy 23...',
      adSets: [
        { id: 'adset_1', name: 'Test AdSet - Copy 1' },
        { id: 'adset_2', name: 'Test AdSet - Copy 2' },
        // ... more ad sets
      ],
      errors: []
    };

    res.json(progress);
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// In-memory job storage (use Redis in production)
const multiplicationJobs = new Map();

// Helper to generate unique job ID
function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to update job status
function updateJobStatus(jobId, updates) {
  const job = multiplicationJobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    job.lastUpdated = Date.now();
  }
}

// Multiply Campaign endpoint - Clone entire 1-50-1 structure multiple times
router.post('/multiply', authenticate, requireFacebookAuth, refreshFacebookToken, async (req, res) => {
  try {
    const {
      sourceCampaignId,
      multiplyCount = 1,
      sourceAdSetIds = [],
      sourcePostId,
      manualInput = false
    } = req.body;

    // Validation
    if (!sourceCampaignId) {
      return res.status(400).json({
        success: false,
        error: 'Source campaign ID is required'
      });
    }

    if (multiplyCount < 1 || multiplyCount > 9) {
      return res.status(400).json({
        success: false,
        error: 'Multiply count must be between 1 and 9'
      });
    }

    // Get user's Facebook credentials
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    if (!facebookAuth || !facebookAuth.selectedAdAccount) {
      return res.status(400).json({
        success: false,
        error: 'Please select an ad account before multiplying campaigns'
      });
    }

    // Decrypt access token
    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      decryptedToken = decryptToken(facebookAuth.accessToken);
      if (!decryptedToken) {
        return res.status(401).json({
          success: false,
          error: 'Failed to decrypt access token',
          requiresReauth: true
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token format',
        requiresReauth: true
      });
    }

    // Get userId safely
    const userId = req.user?.id || req.userId || req.user;

    // Check for switched resources with proper error handling
    let selectedAdAccountId, selectedPageId;

    try {
      const { UserResourceConfig } = db;

      if (UserResourceConfig && typeof UserResourceConfig.getActiveConfig === 'function' && userId) {
        const activeConfig = await UserResourceConfig.getActiveConfig(userId).catch(err => {
          console.log('⚠️ Could not fetch active config for multiply:', err.message);
          return null;
        });

        if (activeConfig && (activeConfig.adAccountId || activeConfig.pageId)) {
          console.log('📋 Using switched resource configuration for multiply');
          selectedAdAccountId = activeConfig.adAccountId || facebookAuth.selectedAdAccount?.id;
          selectedPageId = activeConfig.pageId || facebookAuth.selectedPage?.id;
        }
      }
    } catch (error) {
      console.log('⚠️ UserResourceConfig not available for multiply, using defaults');
    }

    // Fallback to original resources if not set
    if (!selectedAdAccountId) {
      selectedAdAccountId = facebookAuth.selectedAdAccount?.id;
    }
    if (!selectedPageId) {
      selectedPageId = facebookAuth.selectedPage?.id;
    }

    // Create FacebookAPI instance with selected resources
    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: (selectedAdAccountId || facebookAuth.selectedAdAccount.id).replace('act_', ''),
      pageId: selectedPageId || facebookAuth.selectedPage?.id
    });

    // If not manual input, fetch campaign structure automatically
    let campaignStructure = {
      campaignId: sourceCampaignId,
      adSetIds: sourceAdSetIds,
      postId: sourcePostId
    };

    // OPTIMIZATION: Skip fetching for batch multiplication with deep_copy
    // The batch API with deep_copy=true automatically copies everything
    const useDeepCopy = true; // We're using batch method as primary

    if (!useDeepCopy && (!manualInput || sourceAdSetIds.length === 0)) {
      // Only fetch if NOT using deep_copy (fallback method needs this data)
      console.log('📊 Fetching campaign structure for multiplication...');

      // Get campaign details
      const campaignDetails = await userFacebookApi.getCampaignFullDetails(sourceCampaignId);

      if (!campaignDetails) {
        return res.status(404).json({
          success: false,
          error: 'Source campaign not found'
        });
      }

      // Get all adsets for the campaign
      const adSets = await userFacebookApi.getAdSetsForCampaign(sourceCampaignId);

      if (!adSets || adSets.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No ad sets found in source campaign'
        });
      }

      // Verify it's a Strategy 150 campaign (should have ~50 adsets)
      if (adSets.length < 45 || adSets.length > 55) {
        console.warn(`⚠️ Campaign has ${adSets.length} ad sets, expected ~50 for Strategy 150`);
      }

      campaignStructure.adSetIds = adSets.map(adSet => adSet.id);
      campaignStructure.campaignDetails = campaignDetails;

      // Get post ID from the first ad if not provided
      if (!sourcePostId && adSets.length > 0) {
        const firstAdSetId = adSets[0].id;
        const postId = await userFacebookApi.getPostIdFromAdSet(firstAdSetId);
        campaignStructure.postId = postId;
      }
    } else if (useDeepCopy) {
      // For deep_copy, we only need the campaign ID - it copies everything automatically
      console.log('🚀 Using batch multiplication with deep_copy - skipping pre-fetch');
      console.log('  Deep copy will automatically duplicate all 50 ad sets and ads');
      campaignStructure.campaignDetails = null; // Not needed for deep_copy
      campaignStructure.adSetIds = []; // Not needed for deep_copy
      campaignStructure.postId = null; // Not needed for deep_copy
    }

    console.log('🔄 Starting campaign multiplication process...');
    console.log(`  Source Campaign: ${sourceCampaignId}`);
    console.log(`  Ad Sets to clone: ${campaignStructure.adSetIds.length}`);
    console.log(`  Post ID: ${campaignStructure.postId}`);
    console.log(`  Multiply count: ${multiplyCount}`);

    // Create job and return immediately
    const jobId = generateJobId();
    const estimatedSeconds = multiplyCount * 132; // ~2.2 minutes per campaign

    // Initialize job
    multiplicationJobs.set(jobId, {
      id: jobId,
      status: 'started',
      progress: 0,
      total: multiplyCount,
      currentOperation: 'Initializing...',
      campaigns: [],
      errors: [],
      startTime: Date.now(),
      estimatedSeconds,
      userId: req.user.id
    });

    // Start async processing
    processMultiplicationAsync(jobId, campaignStructure, multiplyCount, userFacebookApi, req.user.id);

    // Return immediately with job ID
    res.json({
      success: true,
      jobId,
      estimatedSeconds,
      message: `Multiplication started. Estimated time: ${Math.ceil(estimatedSeconds / 60)} minutes`
    });

  } catch (error) {
    console.error('❌ Campaign multiplication error:', error);

    // Track failure in FailureTracker for the Failures box
    const userId = req.user?.id || req.userId;
    if (userId) {
      await FailureTracker.safeTrackFailedEntity({
        userId,
        campaignId: req.body?.sourceCampaignId,
        campaignName: `Multiply of ${req.body?.sourceCampaignId}`,
        entityType: 'campaign',
        error: error,
        strategyType: 'strategy150_multiply',
        metadata: {
          adAccountId: selectedAdAccountId,
          multiplyCount: req.body?.multiplyCount,
          stage: 'campaign_multiplication'
        }
      });
    }

    await AuditService.logRequest(
      req,
      'strategy150.multiply',
      'campaign',
      req.body.sourceCampaignId,
      'failure',
      error.message,
      {
        adAccountId: selectedAdAccountId,
        strategyType: '1-50-1',
        targetCopies: multiplyCount
      }
    );

    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to multiply campaign'
    });
  }
});

// Async function to process multiplication in background
async function processMultiplicationAsync(jobId, campaignStructure, multiplyCount, userFacebookApi, userId) {
  const job = multiplicationJobs.get(jobId);
  if (!job) return;

  console.log(`🚀 Starting async multiplication job ${jobId} - Using BATCH method`);

  try {
    // Update job status
    updateJobStatus(jobId, {
      status: 'processing',
      progress: 0,
      currentOperation: `Preparing batch request for ${multiplyCount} campaign copies...`
    });

    // Create progress callback
    const updateProgress = (message) => {
      updateJobStatus(jobId, {
        currentOperation: message
      });
    };

    // Use the new BATCH method for all copies at once!
    console.log(`\n📋 Job ${jobId}: Creating ${multiplyCount} copies using batch API...`);

    const batchResult = await userFacebookApi.batchMultiplyCampaigns(
      campaignStructure.campaignId,
      multiplyCount,
      updateProgress
    );

    // Process batch results
    if (batchResult.success) {
      // Update job with results
      updateJobStatus(jobId, {
        status: 'completed',
        progress: multiplyCount,
        currentOperation: `Successfully created ${batchResult.summary.successful} campaigns`,
        campaigns: batchResult.results,
        errors: batchResult.errors,
        completedAt: Date.now()
      });

      console.log(`✅ Job ${jobId} completed using batch method:`);
      console.log(`  - Successful: ${batchResult.summary.successful}`);
      console.log(`  - Failed: ${batchResult.summary.failed}`);
      console.log(`  - API calls used: ${batchResult.summary.apiCallsUsed}`);

      // Audit log for successful multiplication
      await AuditService.log({
        userId,
        action: 'strategy150.multiply',
        resource: 'campaign',
        resourceId: campaignStructure.campaign.id,
        details: {
          campaignId: campaignStructure.campaign.id,
          campaignName: campaignStructure.campaign.name,
          adAccountId: userFacebookApi.config.adAccountId,
          strategyType: '1-50-1',
          targetCopies: multiplyCount,
          successfulCopies: batchResult.summary.successful,
          failedCopies: batchResult.summary.failed,
          method: 'batch'
        },
        status: 'success'
      });
    } else {
      throw new Error('Batch multiplication failed');
    }

  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);

    // Fallback to original method if batch fails
    console.log('⚠️ Batch method failed, falling back to sequential method...');

    updateJobStatus(jobId, {
      currentOperation: 'Batch failed, using sequential method...'
    });

    // Try the original sequential approach as fallback
    try {
      const results = [];
      const errors = [];

      for (let i = 0; i < multiplyCount; i++) {
        try {
          updateJobStatus(jobId, {
            status: 'processing',
            progress: i,
            currentOperation: `Creating campaign ${i + 1} of ${multiplyCount} (sequential)...`
          });

          const updateProgress = (message) => {
            updateJobStatus(jobId, {
              currentOperation: `Campaign ${i + 1}: ${message}`
            });
          };

          // Use original method as fallback
          const multipliedCampaign = await userFacebookApi.multiplyStrategy150Campaign({
            sourceCampaignId: campaignStructure.campaignId,
            sourceAdSetIds: campaignStructure.adSetIds,
          postId: campaignStructure.postId,
          campaignDetails: campaignStructure.campaignDetails,
          copyNumber: i + 1,
          timestamp: Date.now(),
          updateProgress
        });

        results.push({
          copyNumber: i + 1,
          campaign: multipliedCampaign.campaign,
          adSetsCreated: multipliedCampaign.adSetsCreated,
          adsCreated: multipliedCampaign.adsCreated,
          status: 'success'
        });

        // Update job with successful result
        job.campaigns.push(multipliedCampaign);
        console.log(`✅ Job ${jobId}: Successfully created copy ${i + 1}`);

        // Store multiplied campaign in tracking table
        try {
          const { CampaignTracking } = require('../models');
          const facebookAuth = await FacebookAuth.findOne({
            where: { user_id: req.user?.id || req.userId },
            order: [['created_at', 'DESC']]
          });

          await CampaignTracking.create({
            campaign_id: multipliedCampaign.campaign.id,
            campaign_name: multipliedCampaign.campaign.name,
            user_id: req.user?.id || req.userId,
            ad_account_id: facebookAuth?.selectedAdAccount?.id || 'unknown',
            strategy_type: 'multiplication',
            post_id: postId || null,
            ad_set_count: multipliedCampaign.adSetsCreated || 50,
            status: 'ACTIVE'
          });
          console.log(`📊 Multiplied campaign ${multipliedCampaign.campaign.id} added to tracking`);
        } catch (trackingError) {
          console.error('Warning: Could not add multiplied campaign to tracking:', trackingError.message);
        }

      } catch (error) {
        console.error(`❌ Job ${jobId}: Failed to create copy ${i + 1}:`, error.message);

        // Check if it's a rate limit error
        if (error.message?.includes('Rate limited')) {
          // The delay has already been applied in multiplyStrategy150Campaign
          // Retry this campaign
          i--; // Decrement to retry this campaign
          updateJobStatus(jobId, {
            currentOperation: `Rate limited - will retry campaign ${i + 2} after delay...`
          });
        } else {
          // Non-rate limit error, record and continue
          errors.push({
            copyNumber: i + 1,
            error: error.message,
            status: 'failed'
          });
          job.errors.push({
            copyNumber: i + 1,
            error: error.message
          });
        }
      }
    }

    // Mark job as completed
    updateJobStatus(jobId, {
      status: 'completed',
      progress: multiplyCount,
      currentOperation: 'Multiplication completed',
      completedAt: Date.now()
    });

    console.log(`✅ Job ${jobId} completed: ${results.length} successful, ${errors.length} failed`);

    // Audit log for successful multiplication (sequential fallback)
    await AuditService.log({
      userId,
      action: 'strategy150.multiply',
      resource: 'campaign',
      resourceId: campaignStructure.campaign.id,
      details: {
        campaignId: campaignStructure.campaign.id,
        campaignName: campaignStructure.campaign.name,
        adAccountId: userFacebookApi.config.adAccountId,
        strategyType: '1-50-1',
        targetCopies: multiplyCount,
        successfulCopies: results.length,
        failedCopies: errors.length,
        method: 'sequential-fallback'
      },
      status: 'success'
    });

    } catch (fallbackError) {
      console.error(`❌ Job ${jobId} fallback also failed:`, fallbackError);
      updateJobStatus(jobId, {
        status: 'failed',
        error: fallbackError.message,
        completedAt: Date.now()
      });
    }
  }
}

// Get multiplication progress (for async operations)
router.get('/multiply/status/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get job from memory
    const job = multiplicationJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    // Calculate elapsed and remaining time
    const elapsed = Date.now() - job.startTime;
    const estimatedRemaining = Math.max(0, (job.estimatedSeconds * 1000) - elapsed);
    const percentComplete = job.total > 0 ? Math.floor((job.progress / job.total) * 100) : 0;

    res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      total: job.total,
      currentOperation: job.currentOperation,
      campaigns: job.campaigns,
      errors: job.errors,
      elapsedSeconds: Math.floor(elapsed / 1000),
      remainingSeconds: Math.floor(estimatedRemaining / 1000),
      percentComplete,
      startTime: job.startTime,
      completedAt: job.completedAt
    });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;