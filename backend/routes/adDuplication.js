const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const FacebookAPI = require('../services/facebookApi');
const ResourceHelper = require('../services/ResourceHelper');
const { authenticate } = require('../middleware/auth');
const { requireFacebookAuth } = require('../middleware/facebookAuth');
const { decryptToken } = require('./facebookSDKAuth');
const { FacebookAuth } = require('../models');

// In-memory storage for ad duplication jobs (same pattern as ad set duplication)
const adDuplicationJobs = new Map();

/**
 * @route   POST /api/campaigns/strategy-for-all/ads/duplicate
 * @desc    Duplicate ads with variations for A/B testing within ad sets
 * @access  Private
 */
router.post(
  '/duplicate',
  authenticate,
  requireFacebookAuth,
  [
    body('campaignId').notEmpty().withMessage('Campaign ID is required'),
    body('originalAdId').notEmpty().withMessage('Original Ad ID is required'),
    body('duplicationType').isIn(['quick', 'custom']).withMessage('Duplication type must be quick or custom'),
    body('adSets').isArray({ min: 1 }).withMessage('At least one ad set must be selected'),
    body('adSets.*.adSetId').notEmpty().withMessage('Ad set ID is required'),
    body('adSets.*.numberOfCopies').isInt({ min: 1, max: 6 }).withMessage('Number of copies must be between 1 and 6'),
    body('variations').optional().isArray().withMessage('Variations must be an array')
  ],
  async (req, res) => {
    try {
      // Validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const userId = req.user?.id || req.userId;
      const {
        campaignId,
        originalAdId,
        duplicationType,
        adSets,
        variations = []
      } = req.body;

      console.log('\n🎨 ========== AD DUPLICATION REQUEST ==========');
      console.log('📋 Campaign ID:', campaignId);
      console.log('📋 Original Ad ID:', originalAdId);
      console.log('📋 Duplication Type:', duplicationType);
      console.log('📋 Ad Sets:', JSON.stringify(adSets, null, 2));
      console.log('📋 Variations:', variations.length);

      // Get Facebook auth
      const facebookAuth = await FacebookAuth.findOne({
        where: { userId: userId },
        order: [['createdAt', 'DESC']]
      });

      if (!facebookAuth || !facebookAuth.accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Facebook authentication required'
        });
      }

      // Get active resources using ResourceHelper
      const resources = await ResourceHelper.getActiveResources(userId);
      console.log('📋 Using Active Resources:');
      console.log('  ✓ Ad Account:', resources.adAccountName);
      console.log('  ✓ Page:', resources.pageName);

      const accessToken = decryptToken(facebookAuth.accessToken);
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Facebook access token'
        });
      }

      // Calculate total ads to create
      const totalAdsToCreate = adSets.reduce((sum, adSet) => sum + adSet.numberOfCopies, 0);
      console.log(`📊 Total ads to create: ${totalAdsToCreate}`);

      // Generate unique job ID
      const jobId = `ad_dup_${Date.now()}_${userId}`;

      // Initialize job tracking
      adDuplicationJobs.set(jobId, {
        jobId,
        campaignId,
        userId,
        status: 'pending',
        duplicationType,
        totalAdsToCreate,
        adsCreated: 0,
        currentOperation: 'Starting ad duplication...',
        results: [],
        errors: [],
        startedAt: Date.now(),
        completedAt: null
      });

      console.log(`✅ Job created: ${jobId}`);
      console.log('==========================================\n');

      // Start duplication asynchronously
      setImmediate(async () => {
        try {
          // Update job status
          let job = adDuplicationJobs.get(jobId);
          job.status = 'in_progress';
          job.currentOperation = 'Initializing Facebook API...';

          // Initialize FacebookAPI
          const facebookAPI = new FacebookAPI(
            accessToken,
            resources.adAccountId,
            resources.pageId,
            resources.pixelId
          );

          // Progress callback
          const progressCallback = (update) => {
            const jobToUpdate = adDuplicationJobs.get(jobId);
            if (jobToUpdate) {
              Object.assign(jobToUpdate, update);
            }
          };

          // Call duplication service
          const result = await facebookAPI.duplicateAdsWithVariations({
            campaignId,
            originalAdId,
            adSets,
            variations,
            duplicationType,
            progressCallback
          });

          // Update final status
          job = adDuplicationJobs.get(jobId);
          job.status = 'completed';
          job.completedAt = Date.now();
          job.results = result.results;
          job.errors = result.errors;
          job.adsCreated = result.totalCreated;
          job.currentOperation = result.errors.length > 0
            ? `Completed with ${result.errors.length} errors`
            : '🎉 All ads created successfully!';

          console.log(`✅ Job ${jobId} completed: ${result.totalCreated}/${totalAdsToCreate} ads created`);

        } catch (error) {
          console.error(`❌ Job ${jobId} failed:`, error);
          const jobToUpdate = adDuplicationJobs.get(jobId);
          if (jobToUpdate) {
            jobToUpdate.status = 'error';
            jobToUpdate.currentOperation = `Error: ${error.message}`;
            jobToUpdate.errors.push({
              message: error.message,
              stack: error.stack
            });
          }
        }
      });

      // Return job ID immediately for progress tracking
      res.json({
        success: true,
        jobId,
        message: 'Ad duplication started. Use the jobId to track progress.',
        totalAdsToCreate
      });

    } catch (error) {
      console.error('Error starting ad duplication:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start ad duplication',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/campaigns/strategy-for-all/ads/progress/:jobId
 * @desc    Get ad duplication progress
 * @access  Private
 */
router.get('/progress/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.id || req.userId;

    const job = adDuplicationJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        status: 'not_found'
      });
    }

    // Verify job belongs to user
    if (job.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to job'
      });
    }

    // Return progress
    res.json({
      success: true,
      ...job
    });

  } catch (error) {
    console.error('Error fetching ad duplication progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/campaigns/strategy-for-all/ads/progress/:jobId
 * @desc    Clean up completed job from memory
 * @access  Private
 */
router.delete('/progress/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.id || req.userId;

    const job = adDuplicationJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Verify job belongs to user
    if (job.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to job'
      });
    }

    // Delete job
    adDuplicationJobs.delete(jobId);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete job',
      message: error.message
    });
  }
});

// Cleanup old jobs periodically (every 30 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [jobId, job] of adDuplicationJobs.entries()) {
    const age = now - job.startedAt;
    if (age > maxAge && (job.status === 'completed' || job.status === 'error')) {
      console.log(`🧹 Cleaning up old job: ${jobId}`);
      adDuplicationJobs.delete(jobId);
    }
  }
}, 30 * 60 * 1000);

module.exports = router;
