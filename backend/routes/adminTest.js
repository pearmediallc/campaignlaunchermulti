/**
 * adminTest.js
 *
 * Admin-only routes for running campaign creation tests.
 * This file is COMPLETELY ISOLATED - it does not modify any existing routes.
 *
 * All test campaigns are created in PAUSED state.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const TestRunnerService = require('../services/TestRunnerService');
const FacebookAPI = require('../services/facebookApi');
const ResourceHelper = require('../services/ResourceHelper');
const db = require('../models');
const { decryptToken } = require('./facebookSDKAuth');

// Configure multer for test media uploads
const uploadsPath = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    // Use original filename with timestamp prefix to avoid conflicts
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `test_${timestamp}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedVideoTypes = ['.mp4', '.mov', '.avi', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();

    if ([...allowedImageTypes, ...allowedVideoTypes].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${ext}. Allowed: images (jpg, png, webp) and videos (mp4, mov)`));
    }
  }
});

/**
 * Middleware: Admin only access
 * Checks if user has 'admin' or 'super_admin' role
 */
const adminOnly = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.userId;
    const user = await db.User.findByPk(userId, {
      include: [{
        model: db.Role,
        as: 'roles',
        attributes: ['name']
      }]
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'User not found'
      });
    }

    // Check if user has admin or super_admin role
    const isAdmin = user.roles?.some(role =>
      ['admin', 'super_admin'].includes(role.name?.toLowerCase())
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'This feature is only available to administrators'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      message: error.message
    });
  }
};

/**
 * GET /api/admin/test/status
 * Get current test status including active resources and available scenarios
 */
router.get('/status', authenticate, adminOnly, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    // Get user's active resources
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(userId);

    // Get Facebook auth
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    // Get available scenarios
    const scenarios = TestRunnerService.getScenariosByCategory();

    // Get available media
    const media = TestRunnerService.getAvailableMedia();

    // Get active tests
    const activeTests = TestRunnerService.getActiveTests();

    // Get recent results
    const recentResults = TestRunnerService.getAllResults().slice(-10);

    res.json({
      success: true,
      data: {
        hasAuth: !!facebookAuth,
        tokenValid: facebookAuth ? new Date(facebookAuth.tokenExpiresAt) > new Date() : false,
        resources: {
          adAccountId: activeResources.selectedAdAccountId,
          adAccountName: activeResources.selectedAdAccount?.name || activeResources.selectedAdAccountId,
          pageId: activeResources.selectedPageId,
          pageName: activeResources.selectedPage?.name || 'Unknown Page',
          pixelId: activeResources.selectedPixelId,
          pixelName: activeResources.selectedPixel?.name || 'Unknown Pixel'
        },
        allAdAccounts: facebookAuth?.adAccounts || [],
        allPages: facebookAuth?.pages || [],
        allPixels: facebookAuth?.pixels || [],
        scenarios,
        media: {
          images: media.images.length,
          videos: media.videos.length,
          imageFiles: media.images,
          videoFiles: media.videos
        },
        activeTests,
        recentResults
      }
    });
  } catch (error) {
    console.error('Error getting test status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test status',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/test/scenarios
 * Get all available test scenarios
 */
router.get('/scenarios', authenticate, adminOnly, async (req, res) => {
  try {
    const scenarios = TestRunnerService.getScenarios();
    const byCategory = TestRunnerService.getScenariosByCategory();

    res.json({
      success: true,
      data: {
        scenarios,
        byCategory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get scenarios',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/test/run
 * Run a single test scenario
 */
router.post('/run', authenticate, adminOnly, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { scenarioId, resources: customResources } = req.body;

    if (!scenarioId) {
      return res.status(400).json({
        success: false,
        error: 'scenarioId is required'
      });
    }

    // Get Facebook auth
    const facebookAuth = await db.FacebookAuth.findOne({
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
        error: 'Failed to decrypt access token'
      });
    }

    // Get resources (use custom if provided, otherwise use active)
    let resources;
    if (customResources && customResources.adAccountId) {
      resources = {
        adAccountId: customResources.adAccountId,
        pageId: customResources.pageId,
        pixelId: customResources.pixelId
      };
    } else {
      const activeResources = await ResourceHelper.getActiveResourcesWithFallback(userId);
      resources = {
        adAccountId: activeResources.selectedAdAccountId,
        pageId: activeResources.selectedPageId,
        pixelId: activeResources.selectedPixelId
      };
    }

    if (!resources.adAccountId || !resources.pageId) {
      return res.status(400).json({
        success: false,
        error: 'Ad Account and Page are required. Please configure your resources.'
      });
    }

    // Initialize Facebook API with pixelId included
    const facebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: resources.adAccountId.replace('act_', ''),
      pageId: resources.pageId,
      pixelId: resources.pixelId // Include pixel ID for tracking
    });

    console.log(`[AdminTest] FacebookAPI initialized with pixelId: ${resources.pixelId || 'not set'}`);

    // Run test (async - returns immediately with testId)
    const testId = `${scenarioId}-${Date.now()}`;

    // Start test in background
    TestRunnerService.runTest(scenarioId, resources, facebookApi, userId)
      .then(result => {
        console.log(`Test ${testId} completed:`, result.status);
      })
      .catch(error => {
        console.error(`Test ${testId} failed:`, error);
      });

    // Return immediately with testId for polling
    res.json({
      success: true,
      message: 'Test started',
      testId,
      scenarioId
    });

  } catch (error) {
    console.error('Error starting test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start test',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/test/run-multiple
 * Run multiple test scenarios (sequentially or on different accounts)
 */
router.post('/run-multiple', authenticate, adminOnly, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { scenarioIds, accountConfigs, runMode = 'sequential' } = req.body;

    if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'scenarioIds array is required'
      });
    }

    // Get Facebook auth
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(400).json({
        success: false,
        error: 'Facebook authentication required'
      });
    }

    const decryptedToken = decryptToken(facebookAuth.accessToken);
    if (!decryptedToken) {
      return res.status(401).json({
        success: false,
        error: 'Failed to decrypt access token'
      });
    }

    const batchId = `batch-${Date.now()}`;
    const testIds = [];

    // If account configs provided, run on multiple accounts
    if (accountConfigs && Array.isArray(accountConfigs) && accountConfigs.length > 0) {
      // Run each scenario on each account
      for (const config of accountConfigs) {
        const resources = {
          adAccountId: config.adAccountId,
          pageId: config.pageId,
          pixelId: config.pixelId
        };

        const facebookApi = new FacebookAPI({
          accessToken: decryptedToken,
          adAccountId: resources.adAccountId.replace('act_', ''),
          pageId: resources.pageId,
          pixelId: resources.pixelId // Include pixel ID for tracking
        });

        console.log(`[AdminTest] Multi-account run with pixelId: ${resources.pixelId || 'not set'}`);

        for (const scenarioId of scenarioIds) {
          const testId = `${scenarioId}-${config.adAccountId}-${Date.now()}`;
          testIds.push(testId);

          // Run sequentially to avoid rate limits
          if (runMode === 'sequential') {
            TestRunnerService.runTest(scenarioId, resources, facebookApi, userId);
          } else {
            // Parallel - fire and forget
            TestRunnerService.runTest(scenarioId, resources, facebookApi, userId);
          }
        }
      }
    } else {
      // Run on default active resources
      const activeResources = await ResourceHelper.getActiveResourcesWithFallback(userId);
      const resources = {
        adAccountId: activeResources.selectedAdAccountId,
        pageId: activeResources.selectedPageId,
        pixelId: activeResources.selectedPixelId
      };

      const facebookApi = new FacebookAPI({
        accessToken: decryptedToken,
        adAccountId: resources.adAccountId.replace('act_', ''),
        pageId: resources.pageId,
        pixelId: resources.pixelId // Include pixel ID for tracking
      });

      console.log(`[AdminTest] Default account run with pixelId: ${resources.pixelId || 'not set'}`);

      for (const scenarioId of scenarioIds) {
        const testId = `${scenarioId}-${Date.now()}`;
        testIds.push(testId);
        TestRunnerService.runTest(scenarioId, resources, facebookApi, userId);
      }
    }

    res.json({
      success: true,
      message: `Started ${testIds.length} tests`,
      batchId,
      testIds
    });

  } catch (error) {
    console.error('Error starting multiple tests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start tests',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/test/progress/:testId
 * Get progress of a running test
 */
router.get('/progress/:testId', authenticate, adminOnly, async (req, res) => {
  try {
    const { testId } = req.params;

    // Check active tests first
    const activeTest = TestRunnerService.getTestProgress(testId);
    if (activeTest) {
      return res.json({
        success: true,
        data: {
          testId,
          status: 'running',
          progress: activeTest.progress,
          progressMessage: activeTest.progressMessage,
          logs: activeTest.logs
        }
      });
    }

    // Check completed results
    const result = TestRunnerService.getTestResult(testId);
    if (result) {
      return res.json({
        success: true,
        data: {
          testId,
          status: result.status,
          progress: 100,
          result
        }
      });
    }

    res.status(404).json({
      success: false,
      error: 'Test not found'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get test progress',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/test/results
 * Get all test results
 */
router.get('/results', authenticate, adminOnly, async (req, res) => {
  try {
    const results = TestRunnerService.getAllResults();
    const activeTests = TestRunnerService.getActiveTests();

    res.json({
      success: true,
      data: {
        results,
        activeTests,
        summary: {
          total: results.length,
          passed: results.filter(r => r.status === 'passed').length,
          failed: results.filter(r => r.status === 'failed').length,
          errors: results.filter(r => r.status === 'error').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get results',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/test/cleanup
 * Delete test campaigns from Facebook
 */
router.post('/cleanup', authenticate, adminOnly, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { campaignIds } = req.body;

    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'campaignIds array is required'
      });
    }

    // Get Facebook auth
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(400).json({
        success: false,
        error: 'Facebook authentication required'
      });
    }

    const decryptedToken = decryptToken(facebookAuth.accessToken);
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(userId);

    const facebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: activeResources.selectedAdAccountId.replace('act_', ''),
      pageId: activeResources.selectedPageId
    });

    const results = await TestRunnerService.cleanupTestCampaigns(campaignIds, facebookApi);

    res.json({
      success: true,
      message: `Processed ${results.length} campaigns`,
      results
    });

  } catch (error) {
    console.error('Error cleaning up campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup campaigns',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/test/clear-results
 * Clear all test results from memory
 */
router.post('/clear-results', authenticate, adminOnly, async (req, res) => {
  try {
    TestRunnerService.clearResults();

    res.json({
      success: true,
      message: 'Test results cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear results',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/test/media
 * Get available media files for testing
 */
router.get('/media', authenticate, adminOnly, async (req, res) => {
  try {
    const media = TestRunnerService.getAvailableMedia();

    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get media',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/test/media/upload
 * Upload test media files (images and videos)
 */
router.post('/media/upload', authenticate, adminOnly, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => {
      const ext = path.extname(file.originalname).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

      return {
        name: file.filename,
        originalName: file.originalname,
        type: isImage ? 'image' : 'video',
        size: file.size,
        path: file.path
      };
    });

    // Get updated media counts
    const media = TestRunnerService.getAvailableMedia();

    res.json({
      success: true,
      message: `Uploaded ${uploadedFiles.length} file(s)`,
      data: {
        uploadedFiles,
        totalImages: media.images.length,
        totalVideos: media.videos.length
      }
    });
  } catch (error) {
    console.error('Error uploading test media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload media',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/test/media/:filename
 * Delete a test media file
 */
router.delete('/media/:filename', authenticate, adminOnly, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsPath, filename);

    // Security check - ensure file is in uploads directory
    if (!filePath.startsWith(uploadsPath)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    fs.unlinkSync(filePath);

    // Get updated media counts
    const media = TestRunnerService.getAvailableMedia();

    res.json({
      success: true,
      message: `Deleted ${filename}`,
      data: {
        totalImages: media.images.length,
        totalVideos: media.videos.length
      }
    });
  } catch (error) {
    console.error('Error deleting test media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete media',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/test/media
 * Delete all test media files
 */
router.delete('/media', authenticate, adminOnly, async (req, res) => {
  try {
    const files = fs.readdirSync(uploadsPath);
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(uploadsPath, file);
      const ext = path.extname(file).toLowerCase();

      // Only delete image and video files
      if (['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    res.json({
      success: true,
      message: `Deleted ${deletedCount} media file(s)`,
      data: {
        totalImages: 0,
        totalVideos: 0
      }
    });
  } catch (error) {
    console.error('Error deleting all test media:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete media',
      message: error.message
    });
  }
});

module.exports = router;
