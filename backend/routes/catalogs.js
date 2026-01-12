const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const FacebookAuth = require('../models/FacebookAuth');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ [CATALOG] Created uploads directory');
}

// Configure multer for image uploads
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB limit (Facebook's limit)
  },
  fileFilter: (req, file, cb) => {
    console.log(`📸 [CATALOG] Validating uploaded file: ${file.originalname}, type: ${file.mimetype}`);
    // Facebook accepts: JPG, PNG, GIF, BMP
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log(`❌ [CATALOG] Invalid file type: ${file.mimetype}`);
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, BMP allowed.'));
    }
  }
});

const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

/**
 * GET /api/catalogs/list
 * Fetch all product catalogs for the user's business
 */
router.get('/list', authenticate, async (req, res) => {
  console.log('📋 [CATALOG] Fetching user catalogs...');
  console.log(`   User ID: ${req.user.id}`);

  try {
    const userId = req.user.id;

    // Get user's Facebook auth
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      console.log('❌ [CATALOG] No active Facebook authentication found');
      return res.status(401).json({
        success: false,
        error: 'Please connect your Facebook account first'
      });
    }

    const accessToken = facebookAuth.accessToken;
    const adAccountId = facebookAuth.adAccountId;
    console.log(`🔍 [CATALOG] Fetching business ID for ad account: ${adAccountId}`);

    // Get business ID from ad account
    const accountResponse = await axios.get(
      `${FACEBOOK_BASE_URL}/${adAccountId}`,
      {
        params: {
          fields: 'business',
          access_token: accessToken
        }
      }
    );

    const businessId = accountResponse.data.business?.id;

    if (!businessId) {
      console.log('⚠️ [CATALOG] No business account associated with ad account');
      return res.json({
        success: true,
        catalogs: [],
        message: 'No business account found. Catalogs require a Business Manager account.'
      });
    }

    console.log(`✅ [CATALOG] Found business ID: ${businessId}`);

    // Fetch all catalogs for this business
    const catalogsResponse = await axios.get(
      `${FACEBOOK_BASE_URL}/${businessId}/owned_product_catalogs`,
      {
        params: {
          fields: 'id,name,product_count,vertical,flight_catalog_settings,da_display_settings',
          access_token: accessToken
        }
      }
    );

    const catalogs = catalogsResponse.data.data || [];
    console.log(`✅ [CATALOG] Found ${catalogs.length} catalogs`);

    res.json({
      success: true,
      catalogs: catalogs.map(cat => ({
        id: cat.id,
        name: cat.name,
        productCount: cat.product_count || 0,
        vertical: cat.vertical || 'commerce'
      }))
    });

  } catch (error) {
    console.error('❌ [CATALOG] Error fetching catalogs:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || 'Failed to fetch catalogs'
    });
  }
});

/**
 * POST /api/catalogs/create
 * Create a new product catalog
 *
 * Facebook Catalog Verticals (matching Facebook UI):
 * - commerce: E-commerce products
 * - destinations: Travel destinations
 * - flights: Flight bookings
 * - home_listings: Real estate
 * - hotels: Hotel bookings
 * - vehicles: Automotive
 * - media_titles: Movies, TV shows, books
 */
router.post('/create', authenticate, async (req, res) => {
  console.log('🆕 [CATALOG] Creating new catalog...');

  try {
    const userId = req.user.id;
    const {
      name,
      vertical = 'commerce', // Default to e-commerce
      flightCatalogSettings, // For flights vertical
      daDisplaySettings // Dynamic ads display settings
    } = req.body;

    if (!name) {
      console.log('❌ [CATALOG] Catalog name is required');
      return res.status(400).json({
        success: false,
        error: 'Catalog name is required'
      });
    }

    console.log(`📝 [CATALOG] Name: "${name}", Vertical: "${vertical}"`);

    // Get user's Facebook auth
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      console.log('❌ [CATALOG] No active Facebook authentication');
      return res.status(401).json({
        success: false,
        error: 'Please connect your Facebook account first'
      });
    }

    const accessToken = facebookAuth.accessToken;
    const adAccountId = facebookAuth.adAccountId;

    // Get business ID
    const accountResponse = await axios.get(
      `${FACEBOOK_BASE_URL}/${adAccountId}`,
      {
        params: {
          fields: 'business',
          access_token: accessToken
        }
      }
    );

    const businessId = accountResponse.data.business?.id;

    if (!businessId) {
      console.log('❌ [CATALOG] No Business Manager account found');
      return res.status(400).json({
        success: false,
        error: 'Business Manager account required to create catalogs'
      });
    }

    console.log(`✅ [CATALOG] Using business ID: ${businessId}`);

    // Prepare catalog creation payload
    const catalogData = {
      name,
      vertical
    };

    // Add optional settings based on vertical
    if (vertical === 'flights' && flightCatalogSettings) {
      catalogData.flight_catalog_settings = JSON.stringify(flightCatalogSettings);
      console.log('   Added flight_catalog_settings');
    }

    if (daDisplaySettings) {
      catalogData.da_display_settings = JSON.stringify(daDisplaySettings);
      console.log('   Added da_display_settings');
    }

    console.log(`📤 [CATALOG] Creating catalog with data:`, catalogData);

    // Create catalog
    const createResponse = await axios.post(
      `${FACEBOOK_BASE_URL}/${businessId}/owned_product_catalogs`,
      catalogData,
      {
        params: {
          access_token: accessToken
        }
      }
    );

    const catalogId = createResponse.data.id;
    console.log(`✅ [CATALOG] Successfully created catalog ID: ${catalogId}`);

    res.json({
      success: true,
      catalog: {
        id: catalogId,
        name,
        vertical,
        productCount: 0
      }
    });

  } catch (error) {
    console.error('❌ [CATALOG] Error creating catalog:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || 'Failed to create catalog'
    });
  }
});

/**
 * GET /api/catalogs/:catalogId/product-sets
 * Get all product sets for a catalog
 */
router.get('/:catalogId/product-sets', authenticate, async (req, res) => {
  const { catalogId } = req.params;
  console.log(`📋 [CATALOG] Fetching product sets for catalog: ${catalogId}`);

  try {
    const userId = req.user.id;

    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      console.log('❌ [CATALOG] No active Facebook authentication');
      return res.status(401).json({
        success: false,
        error: 'Please connect your Facebook account first'
      });
    }

    const accessToken = facebookAuth.accessToken;

    // Fetch product sets
    const response = await axios.get(
      `${FACEBOOK_BASE_URL}/${catalogId}/product_sets`,
      {
        params: {
          fields: 'id,name,product_count,filter',
          access_token: accessToken
        }
      }
    );

    const productSets = response.data.data || [];
    console.log(`✅ [CATALOG] Found ${productSets.length} product sets`);

    res.json({
      success: true,
      productSets: productSets.map(ps => ({
        id: ps.id,
        name: ps.name,
        productCount: ps.product_count || 0,
        filter: ps.filter
      }))
    });

  } catch (error) {
    console.error('❌ [CATALOG] Error fetching product sets:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || 'Failed to fetch product sets'
    });
  }
});

/**
 * POST /api/catalogs/:catalogId/products
 * Add products to catalog
 *
 * Supports BOTH:
 * 1. Single product upload with image
 * 2. Bulk product upload via feed URL
 */
router.post('/:catalogId/products', authenticate, upload.single('image'), async (req, res) => {
  const { catalogId } = req.params;
  console.log(`🆕 [CATALOG] Adding products to catalog: ${catalogId}`);

  try {
    const userId = req.user.id;

    // Get product data from request body
    const {
      retailer_id,
      name,
      description,
      availability,
      condition,
      price,
      link,
      image_url,
      brand,
      category,
      additional_image_urls,
      // Bulk upload option
      feedUrl,
      feedSchedule
    } = req.body;

    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      console.log('❌ [CATALOG] No active Facebook authentication');
      return res.status(401).json({
        success: false,
        error: 'Please connect your Facebook account first'
      });
    }

    const accessToken = facebookAuth.accessToken;

    // OPTION 1: Bulk upload via feed URL
    if (feedUrl) {
      console.log(`📥 [CATALOG] Creating product feed from URL: ${feedUrl}`);

      const feedData = {
        name: name || 'Product Feed',
        schedule: feedSchedule || JSON.stringify({
          interval: 'DAILY',
          url: feedUrl,
          hour: 0
        })
      };

      const feedResponse = await axios.post(
        `${FACEBOOK_BASE_URL}/${catalogId}/product_feeds`,
        feedData,
        {
          params: {
            access_token: accessToken
          }
        }
      );

      console.log(`✅ [CATALOG] Product feed created: ${feedResponse.data.id}`);

      return res.json({
        success: true,
        feedId: feedResponse.data.id,
        message: 'Product feed created successfully'
      });
    }

    // OPTION 2: Single product upload
    if (!retailer_id || !name || !availability || !condition || !price || !link) {
      console.log('❌ [CATALOG] Missing required fields for product');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: retailer_id, name, availability, condition, price, link'
      });
    }

    console.log(`📝 [CATALOG] Adding single product: ${name} (SKU: ${retailer_id})`);

    let finalImageUrl = image_url;

    // If image file uploaded, upload to Facebook first
    if (req.file) {
      console.log(`📸 [CATALOG] Uploading product image: ${req.file.originalname}`);
      console.log(`   File path: ${req.file.path}`);
      console.log(`   File size: ${req.file.size} bytes`);

      try {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path));
        formData.append('access_token', accessToken);

        const imageUploadResponse = await axios.post(
          `${FACEBOOK_BASE_URL}/${catalogId}/images`,
          formData,
          {
            headers: formData.getHeaders(),
            maxBodyLength: Infinity,
            maxContentLength: Infinity
          }
        );

        finalImageUrl = imageUploadResponse.data.url;
        console.log(`✅ [CATALOG] Image uploaded: ${finalImageUrl}`);
      } catch (uploadError) {
        console.error('❌ [CATALOG] Image upload failed:', uploadError.response?.data || uploadError.message);
        // Continue without image
      }

      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
        console.log(`🗑️ [CATALOG] Cleaned up temporary file: ${req.file.path}`);
      } catch (cleanupError) {
        console.error('⚠️ [CATALOG] Failed to cleanup file:', cleanupError.message);
      }
    }

    // Create product
    const productData = {
      retailer_id,
      name,
      description: description || '',
      availability, // "in stock" | "out of stock" | "preorder" | "available for order" | "discontinued"
      condition, // "new" | "refurbished" | "used" | "used_like_new" | "used_good" | "used_fair" | "cpo"
      price, // Format: "19.99 USD"
      link,
      image_url: finalImageUrl
    };

    if (brand) productData.brand = brand;
    if (category) productData.google_product_category = category;
    if (additional_image_urls) productData.additional_image_urls = additional_image_urls;

    console.log(`📤 [CATALOG] Creating product:`, { ...productData, image_url: finalImageUrl ? '(set)' : '(not set)' });

    const productResponse = await axios.post(
      `${FACEBOOK_BASE_URL}/${catalogId}/products`,
      productData,
      {
        params: {
          access_token: accessToken
        }
      }
    );

    console.log(`✅ [CATALOG] Product created: ${productResponse.data.id}`);

    res.json({
      success: true,
      product: {
        id: productResponse.data.id,
        retailer_id,
        name
      }
    });

  } catch (error) {
    console.error('❌ [CATALOG] Error adding products:', error.response?.data || error.message);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(`🗑️ [CATALOG] Cleaned up temporary file after error: ${req.file.path}`);
      } catch (cleanupError) {
        console.error('⚠️ [CATALOG] Failed to cleanup file:', cleanupError.message);
      }
    }

    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || 'Failed to add products'
    });
  }
});

module.exports = router;
