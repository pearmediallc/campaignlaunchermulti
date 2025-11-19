const express = require('express');
const router = express.Router();
const path = require('path');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const FacebookAPI = require('../services/facebookApi');
const ResourceHelper = require('../services/ResourceHelper');
const { authenticate, requirePermission } = require('../middleware/auth');
const { requireFacebookAuth, refreshFacebookToken } = require('../middleware/facebookAuth');
const AuditService = require('../services/AuditService');
const { uploadSingle } = require('../middleware/upload');
const db = require('../models');
const { decryptToken } = require('./facebookSDKAuth');

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

// Strategy For All validation rules - Meta compliant
const validateStrategyForAll = [
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

  // Dynamic Creative Library integration - editor name for dynamic creative ads
  body('dynamicEditorName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Dynamic editor name must be 255 characters or less'),

  // Duplication settings for dynamic ad set count (0-49)
  // 0 = Create only initial 1-1-1 structure (no duplication)
  // 1-49 = Create 1-1-1 + duplicate ad sets
  body('duplicationSettings.adSetCount')
    .optional()
    .isInt({ min: 0, max: 49 })
    .withMessage('Ad set count must be between 0 and 49'),

  // totalBudget is now optional for both ABO and CBO (backward compatibility)
  body('duplicationSettings.totalBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Total budget must be at least $1 if provided'),

  // Legacy fields (backward compatibility)
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
  if (req.body.adVariationConfig && typeof req.body.adVariationConfig === 'string') {
    req.body.adVariationConfig = parseJsonField(req.body.adVariationConfig);
  }

  next();
};

// Create initial campaign (1-1-1) - supports file uploads
router.post('/create', authenticate, requireFacebookAuth, refreshFacebookToken, requirePermission('campaign', 'create'), uploadSingle, parseFormDataJson, validateStrategyForAll, async (req, res) => {
  // Declare variables outside try block for error handler access
  let selectedAdAccountId;
  let selectedPageId;
  let selectedPixelId;

  try {
    console.log('📝 Strategy for-all creation request received:', {
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
    console.log('  📝 editorName:', req.body.editorName, typeof req.body.editorName, req.body.editorName ? '✅ PRESENT' : '❌ MISSING');

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

    // Get pixel ID - prioritize form submission, then selected pixel, then fetch from ad account
    let pixelId = req.body.pixel || facebookAuth.selectedPixel?.id;
    console.log('🔍 Pixel selection:', {
      fromForm: req.body.pixel || 'Not provided',
      fromAuth: facebookAuth.selectedPixel?.id || 'Not set',
      usingPixel: pixelId || 'Will fetch from ad account'
    });

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

    // If no pixel selected, fetch the ad account's pixels
    if (!pixelId && req.body.conversionLocation === 'website') {
      try {
        const axios = require('axios');
        const pixelsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${facebookAuth.selectedAdAccount.id}/adspixels`,
          {
            params: {
              access_token: decryptedToken,
              fields: 'id,name,code,is_created_by_business'
            }
          }
        );

        if (pixelsResponse.data.data && pixelsResponse.data.data.length > 0) {
          pixelId = pixelsResponse.data.data[0].id;
          console.log(`Using ad account's pixel: ${pixelsResponse.data.data[0].name} (${pixelId})`);
        }
      } catch (error) {
        console.log('Could not fetch pixels for ad account:', error.message);
      }
    }

    // Get userId safely from multiple possible sources
    const userId = req.user?.id || req.userId || req.user;

    // Use universal ResourceHelper to get active resources
    console.log('📋 Getting active resources using ResourceHelper...');
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(userId);

    selectedAdAccountId = activeResources.selectedAdAccountId;
    selectedPageId = activeResources.selectedPageId;
    selectedPixelId = activeResources.selectedPixelId || pixelId;

    console.log('  ✓ Source:', activeResources.source);
    console.log('  ✓ Ad Account:', activeResources.selectedAdAccount?.name || selectedAdAccountId);
    console.log('  ✓ Page:', activeResources.selectedPage?.name || selectedPageId);
    console.log('  ✓ Pixel:', activeResources.selectedPixel?.name || selectedPixelId || 'None');

    // Override with request body if provided (for backward compatibility)
    if (req.body.selectedPageId) {
      console.log('  ⚠️ Overriding page with request body:', req.body.selectedPageId);
      selectedPageId = req.body.selectedPageId;
    }

    // Override pixel with form submission if provided (user's explicit choice takes priority)
    if (req.body.pixel) {
      console.log('  ✅ Using pixel from form submission:', req.body.pixel);
      selectedPixelId = req.body.pixel;
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
      pixelId: selectedPixelId  // Use selectedPixelId which includes form override
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
    let dynamicCreativeMediaPaths = [];

    if (req.files && req.files.length > 0) {
      console.log(`📸 Files detected: ${req.files.length} file(s)`);

      // Check if Dynamic Creative is enabled (multiple media)
      const isDynamicCreative = req.body.dynamicCreativeEnabled === 'true' || req.body.dynamicCreativeEnabled === true;

      if (isDynamicCreative && req.files.length > 0) {
        // Dynamic Creative with multiple media files
        dynamicCreativeMediaPaths = req.files.map(file => file.path);
        console.log('🎨 Dynamic Creative media detected:', dynamicCreativeMediaPaths.length, 'files');
        console.log('  Files:', dynamicCreativeMediaPaths.map(p => path.basename(p)).join(', '));
        // Set the first file as mediaPath for fallback
        mediaPath = req.files[0].path;
      } else if (req.body.mediaType === 'single_image') {
        mediaPath = req.files[0].path;
        console.log('✅ Single image detected:', mediaPath);
      } else if (req.body.mediaType === 'carousel') {
        imagePaths = req.files.map(file => file.path);
        console.log('✅ Carousel images detected:', imagePaths.length, 'images');
      } else if (req.body.mediaType === 'video' || req.body.mediaType === 'single_video') {
        mediaPath = req.files[0].path;
        console.log('✅ Video detected:', mediaPath);
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

    // Prepare campaign data with all Meta-compliant Strategy For All fields
    // NOTE: NO DEFAULT VALUES - All fields must be provided by user or validation will fail
    const campaignData = {
      // Campaign level fields
      campaignName: req.body.campaignName,
      buyingType: req.body.buyingType,  // Required - user must select
      objective: req.body.objective,  // Required - user must select
      budgetLevel: req.body.budgetLevel,  // Required - user must select
      // Properly handle special ad categories - filter out NONE and empty strings
      specialAdCategories: Array.isArray(req.body.specialAdCategories)
        ? req.body.specialAdCategories.filter(cat => cat !== 'NONE' && cat !== '')
        : [],
      campaignBudgetOptimization: req.body.budgetLevel === 'campaign' ? true : (req.body.campaignBudgetOptimization || false),
      bidStrategy: req.body.bidStrategy,  // Required - user must select

      // Bid strategy related values
      bidAmount: parseBudget(req.body.bidAmount),
      costCap: parseBudget(req.body.costCap),
      minRoas: req.body.minRoas ? parseFloat(req.body.minRoas) : undefined,

      // Campaign budget (when using CBO)
      campaignBudget: req.body.budgetLevel === 'campaign' ? {
        dailyBudget: parseBudget(req.body.campaignBudget?.dailyBudget),
        lifetimeBudget: parseBudget(req.body.campaignBudget?.lifetimeBudget)
      } : (req.body.campaignBudget || {}),
      campaignSpendingLimit: req.body.campaignSpendingLimit,

      // Ad set level fields - user must provide all values
      performanceGoal: req.body.performanceGoal,  // Required - user must select
      pixel: req.body.pixel || pixelId, // Use provided pixel or fallback to selected
      manualPixelId: req.body.manualPixelId,
      conversionEvent: req.body.conversionEvent,  // Required - user must select
      attributionSetting: req.body.attributionSetting,  // Required - user must select
      attributionWindow: req.body.attributionWindow,  // Required - user must select

      // Ad set budget & schedule
      adSetBudget: req.body.budgetLevel === 'adset' ? {
        ...req.body.adSetBudget,
        dailyBudget: parseBudget(req.body.adSetBudget?.dailyBudget) ?? parseBudget(req.body.dailyBudget),
        lifetimeBudget: parseBudget(req.body.adSetBudget?.lifetimeBudget) ?? parseBudget(req.body.lifetimeBudget),
        scheduleType: req.body.adSetBudget?.scheduleType  // Required - user must select
      } : {
        // When using CBO, still preserve spendingLimits AND dailyBudget (they apply at ad set level)
        // dailyBudget is needed for spending limits calculation even though campaign uses CBO
        dailyBudget: parseBudget(req.body.adSetBudget?.dailyBudget) ?? parseBudget(req.body.dailyBudget),
        spendingLimits: req.body.adSetBudget?.spendingLimits,
        scheduleType: req.body.adSetBudget?.scheduleType  // Required - user must select
      },
      budgetType: req.body.budgetType,  // Required - user must select

      // Also send budgets at root level for FacebookAPI compatibility
      dailyBudget: req.body.budgetLevel === 'campaign'
        ? parseBudget(req.body.campaignBudget?.dailyBudget)
        : (parseBudget(req.body.dailyBudget) ?? parseBudget(req.body.adSetBudget?.dailyBudget)),
      lifetimeBudget: req.body.budgetLevel === 'campaign'
        ? parseBudget(req.body.campaignBudget?.lifetimeBudget)
        : (parseBudget(req.body.lifetimeBudget) ?? parseBudget(req.body.adSetBudget?.lifetimeBudget)),

      // Enhanced targeting - user must provide
      targeting: req.body.targeting,  // Required - user must select

      // Placement settings - user must provide
      placementType: req.body.placementType,  // Required - user must select
      placements: req.body.placements,  // Required if placementType is 'manual'

      // Ad level fields
      facebookPage: req.body.facebookPage || selectedPageId,
      instagramAccount: req.body.instagramAccount,
      urlType: req.body.urlType,  // Required - user must select
      url: req.body.url,
      primaryText: req.body.primaryText,
      headline: req.body.headline,
      description: req.body.description,
      callToAction: req.body.callToAction,  // Required - user must select
      displayLink: req.body.displayLink,

      // Dynamic Text Variations (Facebook's Multiple Text Options)
      dynamicTextEnabled: req.body.dynamicTextEnabled === 'true' || req.body.dynamicTextEnabled === true,
      primaryTextVariations: typeof req.body.primaryTextVariations === 'string'
        ? JSON.parse(req.body.primaryTextVariations)
        : (req.body.primaryTextVariations || []),
      headlineVariations: typeof req.body.headlineVariations === 'string'
        ? JSON.parse(req.body.headlineVariations)
        : (req.body.headlineVariations || []),

      // Dynamic Creative (Multiple Media)
      dynamicCreativeEnabled: req.body.dynamicCreativeEnabled === 'true' || req.body.dynamicCreativeEnabled === true,
      dynamicCreativeMediaPaths: dynamicCreativeMediaPaths.length > 0 ? dynamicCreativeMediaPaths : null,

      // Media specifications
      mediaType: req.body.mediaType,  // Required - user must select
      mediaSpecs: req.body.mediaSpecs,
      imagePath: req.body.mediaType === 'single_image' && !dynamicCreativeMediaPaths.length ? mediaPath : null,
      videoPath: (req.body.mediaType === 'single_video' || req.body.mediaType === 'video') && !dynamicCreativeMediaPaths.length ? mediaPath : null,
      imagePaths: req.body.mediaType === 'carousel' ? imagePaths : null,
      editorName: req.body.editorName,  // Editor name from Creative Library for ad naming
      dynamicEditorName: req.body.dynamicEditorName,  // Editor name for Dynamic Creative from Creative Library

      // Duplication settings - user must provide count and budget
      duplicationSettings: {
        adSetCount: req.body.duplicationSettings?.adSetCount ?? 49,  // Defaults to 49 only if undefined/null
        totalBudget: req.body.duplicationSettings?.totalBudget,  // User must provide OR will use calculated budget
        budgetPerAdSet: req.body.duplicationSettings?.totalBudget && req.body.duplicationSettings?.adSetCount
          ? (req.body.duplicationSettings.totalBudget / req.body.duplicationSettings.adSetCount)
          : undefined,
        budgetDistributionType: req.body.duplicationSettings?.budgetDistributionType ?? 'equal'  // Defaults to equal if not provided
      },

      // Ad Variation Config (NEW for Strategy for Ads)
      adVariationConfig: req.body.adVariationConfig ? {
        selectedAdSetIndices: req.body.adVariationConfig.selectedAdSetIndices || [],
        adsPerAdSet: req.body.adVariationConfig.adsPerAdSet || 3,
        variations: req.body.adVariationConfig.variations || []
      } : undefined,

      // Process control
      publishDirectly: req.body.publishDirectly !== undefined ? req.body.publishDirectly : false,

      // System fields
      selectedPageId: selectedPageId,
      selectedAdAccountId: selectedAdAccountId,
      selectedPixelId: selectedPixelId || req.body.pixel,

      // Additional Meta options
      costCap: req.body.costCap,
      minRoas: req.body.minRoas,
      conversionLocation: req.body.conversionLocation,  // Required - user must select

      // Budget fields for createCampaignStructure (pass through both formats for compatibility)
      dailyBudget: req.body.budgetLevel === 'campaign'
        ? (req.body.campaignBudget?.dailyBudget || req.body.dailyBudget)
        : (req.body.adSetBudget?.dailyBudget || req.body.dailyBudget),
      lifetimeBudget: req.body.budgetLevel === 'campaign'
        ? (req.body.campaignBudget?.lifetimeBudget || req.body.lifetimeBudget)
        : (req.body.adSetBudget?.lifetimeBudget || req.body.lifetimeBudget)
    };

    console.log('🟢 Creating Strategy for Ads campaign with data:', {
      campaignName: campaignData.campaignName,
      buyingType: campaignData.buyingType,
      objective: campaignData.objective,
      performanceGoal: campaignData.performanceGoal,
      publishDirectly: campaignData.publishDirectly,
      specialAdCategories: campaignData.specialAdCategories,
      bidStrategy: campaignData.bidStrategy,
      hasAdVariations: !!campaignData.adVariationConfig
    });

    console.log('🟢 Special Ad Categories detail:', JSON.stringify(campaignData.specialAdCategories));
    console.log('🟢 Targeting detail:', JSON.stringify(campaignData.targeting));
    console.log('🎨 Ad Variation Config:', JSON.stringify(campaignData.adVariationConfig, null, 2));
    console.log('🎨 Dynamic Features:');
    console.log('  - Dynamic Text Enabled:', campaignData.dynamicTextEnabled);
    console.log('  - Dynamic Creative Enabled:', campaignData.dynamicCreativeEnabled);
    console.log('  - Primary Text Variations:', campaignData.primaryTextVariations?.length || 0);
    console.log('  - Headline Variations:', campaignData.headlineVariations?.length || 0);
    if (campaignData.dynamicTextEnabled) {
      console.log('  - Primary Texts:', campaignData.primaryTextVariations);
      console.log('  - Headlines:', campaignData.headlineVariations);
    }
    if (campaignData.dynamicCreativeEnabled) {
      console.log('  - Dynamic Creative is ENABLED - will use multiple media');
    }

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
    console.log('  Budget Level:', campaignData.budgetLevel);
    console.log('  Daily Budget:', campaignData.dailyBudget, typeof campaignData.dailyBudget);
    console.log('  Page ID:', campaignData.facebookPage || selectedPageId);
    console.log('  Pixel ID:', campaignData.pixel);
    console.log('  Media Type:', campaignData.mediaType);
    console.log('  Has Image:', !!campaignData.imagePath);
    console.log('  Has Video:', !!campaignData.videoPath);
    console.log('  Has Dynamic Creative Media:', !!campaignData.dynamicCreativeMediaPaths);
    console.log('  Dynamic Creative Media Paths:', campaignData.dynamicCreativeMediaPaths || 'Not set');
    console.log('  Video Path:', campaignData.videoPath || 'Not set');
    console.log('  Attribution Setting:', campaignData.attributionSetting || 'Not set');
    console.log('  Attribution Window:', JSON.stringify(campaignData.attributionWindow) || 'Not set');
    console.log('  Conversion Event:', campaignData.conversionEvent);
    console.log('  Ad Set Count:', campaignData.duplicationSettings?.adSetCount || 'Not set');

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

      // FIX: Reuse media hashes to ensure ALL campaigns have identical media
      // First campaign waits up to 30s for videos to be ready
      // Subsequent campaigns reuse the same media for consistency
      if (campaignIndex > 0 && mediaHashes) {
        currentCampaignData.reusedMediaHashes = mediaHashes;
        currentCampaignData.skipMediaUpload = true;
        console.log(`♻️ Campaign ${campaignIndex + 1}: Reusing media from first campaign for consistency`);
        console.log(`   - Images: ${mediaHashes.dynamicImages?.length || 0}`);
        console.log(`   - Videos: ${mediaHashes.dynamicVideos?.length || 0}`);
      }

      // Add delay between campaign creations to avoid rate limits
      if (campaignIndex > 0) {
        console.log(`⏱️ Waiting 5 seconds before creating campaign ${campaignIndex + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Create initial 1-1-1 campaign structure
      // Ad variations will be applied during Phase 3 duplication
      let result;
      try {
        console.log(`\n📝 Creating campaign ${campaignIndex + 1} of ${numberOfCampaigns}: ${currentCampaignName}`);
        console.log('🎨 Ad variation config will be used during duplication phase');
        result = await userFacebookApi.createCampaignStructure(currentCampaignData);

        // Store media hashes from first campaign
        if (campaignIndex === 0 && result.mediaHashes) {
          mediaHashes = result.mediaHashes;
          console.log('💾 Stored media hashes for reuse in subsequent campaigns');
        }
      } catch (error) {
        console.error(`❌ Strategy for Ads Campaign ${campaignIndex + 1} Creation Error:`);
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

      await AuditService.logRequest(req, 'strategyForAll.create', 'campaign', result.campaign?.id, 'success', null, {
        campaignId: result.campaign?.id,
        campaignName: currentCampaignName,
        adAccountId: selectedAdAccountId,
        strategyType: 'for-all',
        objective: campaignData.objective,
        budget: campaignData.dailyBudget || campaignData.lifetimeBudget,
        adSetsCreated: 1,
        campaignNumber: campaignIndex + 1,
        totalCampaigns: numberOfCampaigns
      });

      // Check if we need to duplicate ad sets based on duplicationSettings
      const targetAdSetCount = currentCampaignData.duplicationSettings?.adSetCount || 1;
      let finalAdSetCount = 1; // Start with the initial ad set created

      if (targetAdSetCount > 1) {
      console.log(`📋 Duplicating ad sets to reach target count: ${targetAdSetCount}`);

      try {
        // FIXED: Initial creation always creates 1 ad set
        // We need targetAdSetCount - 1 additional ad sets
        const existingAdSetCount = 1; // Initial creation always creates 1
        const adSetsToCreate = Math.max(0, targetAdSetCount - existingAdSetCount);

        console.log(`📊 Existing ad sets: ${existingAdSetCount}, Target: ${targetAdSetCount}`);
        console.log(`🔄 Creating ${adSetsToCreate} additional ad sets...`);

        // Use Facebook API directly to duplicate the ad sets
        const duplicatedAdSets = [];
        const failedCreations = []; // Track failed creations for recovery

        for (let i = 0; i < adSetsToCreate; i++) {
          try {
            // Prepare ad set parameters based on budget level
            const adSetParams = {
              ...campaignData,
              campaignId: result.campaign.id,
              adSetName: `${result.adSet.name} - Copy ${i + 2}`,
            };

            // CRITICAL FIX: Only set ad set budget if NOT using Campaign Budget Optimization
            if (campaignData.budgetLevel === 'adset') {
              // ABO: Set budget at ad set level
              adSetParams.dailyBudget = campaignData.dailyBudget;
              adSetParams.lifetimeBudget = campaignData.lifetimeBudget;
            } else {
              // CBO: Do NOT set budget at ad set level, it's already set at campaign level
              delete adSetParams.dailyBudget;
              delete adSetParams.lifetimeBudget;
              delete adSetParams.adSetBudget;
              console.log(`  📊 Using CBO - no ad set budget needed for ad set ${i + 2}`);
            }

            // Create the ad set
            const newAdSet = await userFacebookApi.createAdSet(adSetParams);

            if (newAdSet) {
              // CRITICAL FIX: Ensure all fields including media are passed for ad creation
              const adParams = {
                ...campaignData,
                adsetId: newAdSet.id,  // Note: lowercase 's' in adsetId to match Facebook API expectation
                adName: `${campaignData.campaignName} - Ad ${i + 2}`,
                postId: result.postId,
                // Explicitly ensure these creative fields are passed
                displayLink: campaignData.displayLink,
                url: campaignData.url,
                headline: campaignData.headline,
                primaryText: campaignData.primaryText,
                description: campaignData.description,
                callToAction: campaignData.callToAction,
                // CRITICAL: Pass through dynamic creative media paths if they exist
                dynamicCreativeMediaPaths: campaignData.dynamicCreativeMediaPaths,
                // Pass the media hashes from the initial campaign creation
                // All ad sets in the SAME campaign should share media
                dynamicImages: result.mediaHashes?.dynamicImages,
                dynamicVideos: result.mediaHashes?.dynamicVideos,
                imageHash: result.mediaHashes?.imageHash,
                videoId: result.mediaHashes?.videoId,
                carouselCards: result.mediaHashes?.carouselCards,
                // For Dynamic Creative, pass the full media assets object
                mediaAssets: result.mediaHashes,
                // Pass through image/video paths
                imagePath: campaignData.imagePath,
                videoPath: campaignData.videoPath,
                imagePaths: campaignData.imagePaths,
                // Pass through media type and dynamic flags
                mediaType: campaignData.mediaType,
                dynamicCreativeEnabled: campaignData.dynamicCreativeEnabled,
                dynamicTextEnabled: campaignData.dynamicTextEnabled,
                primaryTextVariations: campaignData.primaryTextVariations,
                headlineVariations: campaignData.headlineVariations
              };

              console.log(`  🔗 Creating ad with display link: ${adParams.displayLink}`);
              console.log(`  📸 Dynamic media: ${adParams.dynamicCreativeMediaPaths?.length || 0} files`);

              // Create ads for this ad set using the same creative
              const newAd = await userFacebookApi.createAd(adParams);

              duplicatedAdSets.push({ adSet: newAdSet, ad: newAd });
              console.log(`  ✅ Created ad set ${i + 2} of ${targetAdSetCount} with display link and media`);
            }

          } catch (adSetError) {
            console.error(`  ❌ Failed to create ad set ${i + 2}:`, adSetError.message);
            if (adSetError.response?.data?.error) {
              console.error(`  📛 Facebook error:`, adSetError.response.data.error);
            }

            // Track failed creation for retry
            failedCreations.push({
              index: i + 2,
              type: 'adset',
              params: adSetParams,
              error: adSetError
            });

            // Continue with next ad set
          }
        }

        // RECOVERY: Retry failed creations with exponential backoff
        if (failedCreations.length > 0) {
          console.log(`\n🔄 Attempting recovery for ${failedCreations.length} failed creations...`);

          for (const failed of failedCreations) {
            try {
              console.log(`  🔄 Retrying ad set ${failed.index}...`);

              // Check if error was transient (code 2)
              const isTransient = failed.error.fbError?.code === 2 ||
                                 failed.error.fbError?.is_transient;

              if (isTransient) {
                // Wait a bit before retry for transient errors
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Retry with the retry mechanism
                const newAdSet = await userFacebookApi.retryWithBackoff(
                  userFacebookApi.createAdSet,
                  failed.params,
                  2 // Max 2 retries in recovery
                );

                if (newAdSet) {
                  // Try to create the ad for this recovered ad set
                  const adParams = {
                    ...campaignData,
                    adsetId: newAdSet.id,
                    adName: `${campaignData.campaignName} - Ad ${failed.index}`,
                    postId: result.postId,
                    displayLink: campaignData.displayLink,
                    url: campaignData.url,
                    headline: campaignData.headline,
                    primaryText: campaignData.primaryText,
                    description: campaignData.description,
                    callToAction: campaignData.callToAction,
                    dynamicCreativeMediaPaths: campaignData.dynamicCreativeMediaPaths,
                    dynamicImages: result.mediaHashes?.dynamicImages,
                    dynamicVideos: result.mediaHashes?.dynamicVideos,
                    imageHash: result.mediaHashes?.imageHash,
                    videoId: result.mediaHashes?.videoId,
                    carouselCards: result.mediaHashes?.carouselCards,
                    mediaAssets: result.mediaHashes,
                    imagePath: campaignData.imagePath,
                    videoPath: campaignData.videoPath,
                    imagePaths: campaignData.imagePaths,
                    mediaType: campaignData.mediaType,
                    dynamicCreativeEnabled: campaignData.dynamicCreativeEnabled,
                    dynamicTextEnabled: campaignData.dynamicTextEnabled,
                    primaryTextVariations: campaignData.primaryTextVariations,
                    headlineVariations: campaignData.headlineVariations
                  };

                  const newAd = await userFacebookApi.createAd(adParams);
                  duplicatedAdSets.push({ adSet: newAdSet, ad: newAd });
                  console.log(`  ✅ Successfully recovered ad set ${failed.index}`);
                }
              } else {
                console.log(`  ⚠️ Skipping non-transient error for ad set ${failed.index}`);
              }
            } catch (recoveryError) {
              console.error(`  ❌ Recovery failed for ad set ${failed.index}:`, recoveryError.message);
              // Continue with other recoveries
            }
          }
        }

        if (duplicatedAdSets.length > 0) {
          finalAdSetCount = 1 + duplicatedAdSets.length;
          console.log(`✅ Successfully created ${duplicatedAdSets.length} additional ad sets`);
          console.log(`📊 Total ad sets in campaign: ${finalAdSetCount}`);

          // Add the duplicated ad sets to the result
          result.duplicatedAdSets = duplicatedAdSets;
        } else {
          console.log(`⚠️ No additional ad sets were created`);
        }

      } catch (duplicationError) {
        console.error('⚠️ Ad set duplication failed:', duplicationError.message);
        console.error('Continuing with initial 1-1-1 structure only');
        // Don't fail the entire campaign creation if duplication fails
        // The user still has the initial campaign structure
      }
    }

      // Store campaign in tracking table for management with correct ad set count
      try {
        const { CampaignTracking } = require('../models');
        await CampaignTracking.create({
          campaign_id: result.campaign.id,
          campaign_name: currentCampaignName,
          user_id: userId,
          ad_account_id: facebookAuth.selectedAdAccount?.id || selectedAdAccountId,
          strategy_type: 'for-all',
          post_id: result.postId || null,
          ad_set_count: finalAdSetCount, // Use the actual final count
          status: 'ACTIVE'
        });
        console.log(`📊 Campaign ${result.campaign.id} added to tracking with ${finalAdSetCount} ad sets`);
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
        duplicatedAdSets: result.duplicatedAdSets || [],
        adSetCount: finalAdSetCount,
        campaignNumber: campaignIndex + 1
      });
    } // End of campaign creation loop

    // Build Facebook payload summary for user verification
    const facebookPayload = {
      campaign: {
        name: campaignData.campaignName,
        objective: campaignData.objective,
        buyingType: campaignData.buyingType || 'AUCTION',
        specialAdCategories: campaignData.specialAdCategories || [],
        status: 'ACTIVE',
        budgetLevel: campaignData.budgetLevel,
        ...(campaignData.budgetLevel === 'campaign' && campaignData.campaignBudget?.dailyBudget && {
          dailyBudget: `$${Number(campaignData.campaignBudget.dailyBudget).toFixed(2)}`
        })
      },
      adSet: {
        name: `${campaignData.campaignName} - AdSet`,
        targeting: {
          locations: campaignData.targeting?.locations || {},
          ageMin: campaignData.targeting?.ageMin || 18,
          ageMax: campaignData.targeting?.ageMax || 65,
          genders: campaignData.targeting?.genders || ['all']
        },
        ...(campaignData.budgetLevel === 'adset' && {
          dailyBudget: `$${Number(campaignData.dailyBudget || campaignData.adSetBudget?.dailyBudget || 0).toFixed(2)}`
        }),
        optimizationGoal: campaignData.performanceGoal || 'OFFSITE_CONVERSIONS',
        bidStrategy: campaignData.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
        conversionEvent: campaignData.conversionEvent,
        attributionSetting: campaignData.attributionSetting || '7_day_click_1_day_view',
        placementType: campaignData.placementType || 'automatic'
      },
      ad: {
        name: `${campaignData.campaignName} - Ad`,
        format: campaignData.mediaType,
        primaryText: campaignData.primaryText,
        headline: campaignData.headline,
        description: campaignData.description || '',
        callToAction: campaignData.callToAction || 'LEARN_MORE',
        websiteUrl: campaignData.url,
        displayLink: campaignData.displayLink || ''
      }
    };

    // Prepare response based on number of campaigns created
    const responseMessage = numberOfCampaigns > 1
      ? `Successfully created ${createdCampaigns.length} identical campaigns`
      : 'Strategy for-all initial campaign created successfully';

    // For single campaign, return the same format as before for backward compatibility
    if (numberOfCampaigns === 1 && createdCampaigns.length === 1) {
      const singleResult = createdCampaigns[0];
      res.json({
        success: true,
        message: responseMessage,
        data: {
          phase: 'initial',
          campaign: singleResult.campaign,
          adSet: singleResult.adSet,
          ads: singleResult.ads,
          adAccount: facebookAuth.selectedAdAccount, // Add ad account info
          page: facebookAuth.selectedPage || { id: selectedPageId, name: 'Page' }, // Add page info
          pixel: pixelId ? { id: pixelId, name: facebookAuth.selectedPixel?.name || 'Pixel' } : null, // Add pixel info if used
          postId: singleResult.postId, // Include postId from result
          duplicationSettings: campaignData.duplicationSettings, // Include duplication settings for frontend
          facebookPayload // Include what was sent to Facebook for verification
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
          pixel: pixelId ? { id: pixelId, name: facebookAuth.selectedPixel?.name || 'Pixel' } : null, // Add pixel info if used
          duplicationSettings: campaignData.duplicationSettings, // Include duplication settings for frontend
          facebookPayload // Include what was sent to Facebook for verification
        }
      });
    }
  } catch (error) {
    console.error('Strategy for-all creation error:', error);
    await AuditService.logRequest(req, 'strategyForAll.create', null, null, 'failure', error.message, {
      adAccountId: selectedAdAccountId,
      strategyType: 'for-all'
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
          name: 'Strategy for-all Campaign'
        },
        isStrategyForAll: true, // Assume it's Strategy For All if called from multiplication
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

    // Check if it's a Strategy For All campaign (should have ~50 adsets)
    const isStrategyForAll = adSets && adSets.length >= 45 && adSets.length <= 55;

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
        isStrategyForAll: isStrategyForAll
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

    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: activeResources.selectedAdAccountId.replace('act_', ''),
      pageId: activeResources.selectedPageId
    });

    // Start the duplication process with custom budgets
    // Keep the post ID in original Facebook format with underscore
    const duplicateData = {
      campaignId,
      originalAdSetId,
      postId: postId,
      count,
      formData,
      userId: req.user.id
    };

    // If custom budgets provided, use them; otherwise default to $1 for each
    if (duplicateBudgets && duplicateBudgets.length > 0) {
      duplicateData.customBudgets = duplicateBudgets;
    } else {
      // Default to $1 for each duplicated ad set
      duplicateData.customBudgets = Array(count).fill(1.00);
    }

    // Store job info for progress tracking
    duplicationJobs.set(campaignId, {
      campaignId,
      count,
      completed: 0,
      total: count,
      status: 'in_progress',
      currentOperation: 'Starting duplication...',
      adSets: [],
      errors: [],
      startedAt: Date.now()
    });

    // Pass progress update callback to duplication function
    duplicateData.progressCallback = (update) => {
      const job = duplicationJobs.get(campaignId);
      if (job) {
        Object.assign(job, update);
      }
    };

    userFacebookApi.duplicateAdSetsWithExistingPost(duplicateData);

    res.json({
      success: true,
      message: 'Duplication process started',
      data: {
        campaignId,
        count,
        status: 'in_progress',
        adAccount: activeResources.selectedAdAccount, // Add ad account info from active resources
        postId: postId || 'Will be fetched from original ad' // Include postId status
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

    // Get actual progress from duplication jobs storage
    const progress = duplicationJobs.get(campaignId);

    if (progress) {
      // Return actual progress from stored job
      res.json(progress);
    } else {
      // No job found - either completed long ago or never started
      // Return completed status with unknown count
      res.json({
        completed: 0,
        total: 0,
        status: 'not_found',
        currentOperation: 'No active duplication found',
        adSets: [],
        errors: []
      });
    }
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
const duplicationJobs = new Map(); // Store duplication progress by campaignId

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

// Multiply Campaign endpoint - Clone entire for-all structure multiple times
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

      // Verify it's a Strategy For All campaign (should have ~50 adsets)
      if (adSets.length < 45 || adSets.length > 55) {
        console.warn(`⚠️ Campaign has ${adSets.length} ad sets, expected ~50 for Strategy For All`);
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
    await AuditService.logRequest(
      req,
      'strategyForAll.multiply',
      'campaign',
      req.body.sourceCampaignId,
      'failure',
      error.message,
      {
        adAccountId: selectedAdAccountId,
        strategyType: 'for-all',
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
        action: 'strategyForAll.multiply',
        resource: 'campaign',
        resourceId: campaignStructure.campaign.id,
        details: {
          campaignId: campaignStructure.campaign.id,
          campaignName: campaignStructure.campaign.name,
          adAccountId: userFacebookApi.config.adAccountId,
          strategyType: 'for-all',
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

          // Use original method as fallback - for StrategyForAds, we use manual duplication
          const duplicatedCampaignId = await userFacebookApi.duplicateCampaignDeepCopy(
            campaignStructure.campaignId,
            `Copy ${i + 1} - ${new Date().toISOString().split('T')[0]}`
          );

          // Fetch the duplicated campaign details
          const duplicatedCampaign = await userFacebookApi.getCampaignFullDetails(duplicatedCampaignId);

          // Count ad sets and ads
          const adSets = await userFacebookApi.getAdSetsForCampaign(duplicatedCampaignId);
          let totalAds = 0;
          for (const adSet of adSets) {
            try {
              const adsResponse = await axios.get(
                `${userFacebookApi.baseURL}/${adSet.id}/ads`,
                {
                  params: {
                    fields: 'id',
                    limit: 100,
                    access_token: userFacebookApi.accessToken
                  }
                }
              );
              totalAds += (adsResponse.data.data || []).length;
            } catch (e) {
              console.log(`Warning: Could not count ads for ad set ${adSet.id}`);
            }
          }

          const multipliedCampaign = {
            campaign: duplicatedCampaign,
            adSetsCreated: adSets.length,
            adsCreated: totalAds
          };

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
          // The delay has already been applied in multiplyStrategyForAllCampaign
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
      action: 'strategyForAll.multiply',
      resource: 'campaign',
      resourceId: campaignStructure.campaign.id,
      details: {
        campaignId: campaignStructure.campaign.id,
        campaignName: campaignStructure.campaign.name,
        adAccountId: userFacebookApi.config.adAccountId,
        strategyType: 'for-all',
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
