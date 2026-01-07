const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const FailureTracker = require('../services/FailureTracker');
const FacebookAPI = require('../services/facebookApi');
const VerificationService = require('../services/VerificationService');
const ResourceHelper = require('../services/ResourceHelper');
const db = require('../models');
const { decryptToken } = require('./facebookSDKAuth');

/**
 * GET /api/failures/campaign/:campaignId
 * Get all failures for a specific campaign
 */
router.get('/campaign/:campaignId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { campaignId } = req.params;

    // Fetch all failures for this campaign
    const failures = await FailureTracker.getCampaignFailures(userId, campaignId);

    // Get failure statistics
    const stats = await FailureTracker.getFailureStats(userId, campaignId);

    res.json({
      success: true,
      failures,
      stats
    });
  } catch (error) {
    console.error('Error fetching campaign failures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign failures',
      message: error.message
    });
  }
});

/**
 * GET /api/failures/user
 * Get all failures for the authenticated user
 */
router.get('/user', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { status, entityType, limit } = req.query;

    const options = {};
    if (status) options.status = status;
    if (entityType) options.entityType = entityType;
    if (limit) options.limit = parseInt(limit);

    const failures = await db.FailedEntity.getFailuresByUser(userId, options);

    res.json({
      success: true,
      failures
    });
  } catch (error) {
    console.error('Error fetching user failures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user failures',
      message: error.message
    });
  }
});

/**
 * GET /api/failures/pending
 * Get all pending failures for retry
 */
router.get('/pending', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { campaignId } = req.query;

    const pendingFailures = await FailureTracker.getPendingFailures(
      userId,
      campaignId || null
    );

    res.json({
      success: true,
      pendingFailures
    });
  } catch (error) {
    console.error('Error fetching pending failures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending failures',
      message: error.message
    });
  }
});

/**
 * POST /api/failures/:id/retry
 * Retry a failed entity
 */
router.post('/:id/retry', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { id } = req.params;

    // Fetch the failed entity
    const failedEntity = await db.FailedEntity.findOne({
      where: { id, userId }
    });

    if (!failedEntity) {
      return res.status(404).json({
        success: false,
        error: 'Failed entity not found'
      });
    }

    // Get user's Facebook auth
    const { FacebookAuth } = db;
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(400).json({
        success: false,
        error: 'Facebook authentication required'
      });
    }

    // SAFEGUARD 1: Check if already retrying
    if (failedEntity.status === 'retrying') {
      return res.status(409).json({
        success: false,
        error: 'This entity is already being retried. Please wait for the current retry to complete.',
        currentStatus: 'retrying'
      });
    }

    // SAFEGUARD 2: Check if already resolved
    if (failedEntity.status === 'resolved') {
      return res.status(409).json({
        success: false,
        error: 'This entity has already been successfully resolved.',
        currentStatus: 'resolved'
      });
    }

    // SAFEGUARD 3: Limit retry attempts
    if (failedEntity.retryCount >= 3) {
      // Mark as permanent failure after 3 attempts
      await failedEntity.update({
        status: 'permanent_failure',
        lastError: 'Maximum retry attempts (3) exceeded'
      });

      return res.status(400).json({
        success: false,
        error: 'Maximum retry attempts (3) exceeded. This has been marked as a permanent failure.',
        retryCount: failedEntity.retryCount
      });
    }

    // FIX: Decrypt access token (field is 'accessToken', not 'encryptedAccessToken')
    const decryptedToken = decryptToken(facebookAuth.accessToken);

    if (!decryptedToken) {
      return res.status(401).json({
        success: false,
        error: 'Failed to decrypt Facebook access token. Please reconnect your Facebook account.',
        requiresReauth: true
      });
    }

    // Get active resources using ResourceHelper
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(userId);

    if (!activeResources.selectedAdAccountId || !activeResources.selectedPageId) {
      return res.status(400).json({
        success: false,
        error: 'Please select an ad account and page before retrying'
      });
    }

    // FIX: Initialize Facebook API with correct parameter format (object, not positional params)
    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: activeResources.selectedAdAccountId.replace('act_', ''),
      pageId: activeResources.selectedPageId
    });

    // SAFEGUARD 4: Mark as retrying BEFORE attempting retry (prevents concurrent retries)
    await failedEntity.update({
      status: 'retrying',
      retryCount: failedEntity.retryCount + 1,
      lastAttemptAt: new Date()
    });

    // Define retry function based on entity type
    const retryFunction = async (entity) => {
      if (entity.entityType === 'adset') {
        // Retry ad set creation
        const adSetParams = {
          ...entity.metadata,
          campaignId: entity.campaignId,
          name: entity.adsetName
        };

        const newAdSet = await userFacebookApi.createAdSet(adSetParams);

        // If ad set created, try to create the ad
        if (newAdSet && entity.metadata.adParams) {
          try {
            const adParams = {
              ...entity.metadata.adParams,
              adsetId: newAdSet.id
            };

            const newAd = await userFacebookApi.createAd(adParams);

            return {
              adsetId: newAdSet.id,
              adId: newAd?.id
            };
          } catch (adError) {
            // Ad creation failed, but adset succeeded
            console.error(`⚠️ Adset ${newAdSet.id} created but ad creation failed:`, adError.message);

            // Track ad failure separately (don't fail the whole retry)
            await FailureTracker.safeTrackFailedEntity({
              userId: entity.userId,
              campaignId: entity.campaignId,
              campaignName: entity.campaignName || `Campaign ${entity.campaignId}`,
              entityType: 'ad',
              adsetId: newAdSet.id,
              adName: entity.metadata.adParams.name,
              error: adError,
              strategyType: entity.strategyType,
              metadata: {
                ...entity.metadata.adParams,
                adsetId: newAdSet.id
              }
            });

            return {
              adsetId: newAdSet.id,
              adId: null,
              warning: 'Adset created successfully, but ad creation failed. A new failure entry has been created for the ad.'
            };
          }
        }

        return {
          adsetId: newAdSet.id
        };
      } else if (entity.entityType === 'ad') {
        // Retry ad creation
        const adParams = {
          ...entity.metadata,
          adsetId: entity.adsetId,
          name: entity.adName
        };

        const newAd = await userFacebookApi.createAd(adParams);

        return {
          adId: newAd.id
        };
      }

      throw new Error('Unsupported entity type for retry');
    };

    // Attempt retry
    const retryResult = await FailureTracker.retryFailedEntity(id, retryFunction);

    if (retryResult.success) {
      res.json({
        success: true,
        message: 'Entity successfully recovered',
        result: retryResult.result
      });
    } else {
      // Retry failed - status already updated by FailureTracker
      res.status(500).json({
        success: false,
        error: 'Retry failed: ' + (retryResult.error?.message || retryResult.error || 'Unknown error'),
        retryCount: failedEntity.retryCount,
        canRetryAgain: failedEntity.retryCount < 3,
        permanentFailure: retryResult.permanentFailure || false
      });
    }
  } catch (error) {
    console.error('Error retrying failed entity:', error);

    // Revert status back to 'failed' if retry errored
    if (failedEntity) {
      try {
        await failedEntity.update({
          status: 'failed',
          lastError: error.message
        });
      } catch (updateError) {
        console.error('Failed to revert status:', updateError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Retry operation failed: ' + error.message
    });
  }
});

/**
 * DELETE /api/failures/:id
 * Delete a failed entity record (for cleanup)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { id } = req.params;

    const failedEntity = await db.FailedEntity.findOne({
      where: { id, userId }
    });

    if (!failedEntity) {
      return res.status(404).json({
        success: false,
        error: 'Failed entity not found'
      });
    }

    await failedEntity.destroy();

    res.json({
      success: true,
      message: 'Failed entity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting failed entity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete entity',
      message: error.message
    });
  }
});

/**
 * GET /api/failures/stats
 * Get overall failure statistics for the user
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    const allFailures = await db.FailedEntity.findAll({
      where: { userId },
      attributes: ['status', 'entityType', 'strategyType', 'createdAt']
    });

    const stats = {
      total: allFailures.length,
      byStatus: {
        failed: allFailures.filter(f => f.status === 'failed').length,
        retrying: allFailures.filter(f => f.status === 'retrying').length,
        recovered: allFailures.filter(f => f.status === 'recovered').length,
        permanent_failure: allFailures.filter(f => f.status === 'permanent_failure').length
      },
      byEntityType: {
        campaign: allFailures.filter(f => f.entityType === 'campaign').length,
        adset: allFailures.filter(f => f.entityType === 'adset').length,
        ad: allFailures.filter(f => f.entityType === 'ad').length
      },
      byStrategy: {
        strategyForAds: allFailures.filter(f => f.strategyType === 'strategyForAds').length,
        strategyForAll: allFailures.filter(f => f.strategyType === 'strategyForAll').length,
        strategy150: allFailures.filter(f => f.strategyType === 'strategy150').length
      },
      recoveryRate: allFailures.length > 0
        ? ((allFailures.filter(f => f.status === 'recovered').length / allFailures.length) * 100).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching failure stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/failures/verify
 * Verify created entities against original request data
 * This is called AFTER strategy completion to check if entities were created correctly
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const {
      originalRequest,    // Original form data from frontend
      createdEntities,    // { campaignId, adsetIds: [], adIds: [] }
      autoCorrect = true, // Whether to auto-fix mismatches
      strategyType = 'unknown'
    } = req.body;

    // Validate required fields
    if (!originalRequest || !createdEntities) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: originalRequest and createdEntities'
      });
    }

    if (!createdEntities.campaignId && (!createdEntities.adsetIds || createdEntities.adsetIds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'No entities to verify. Provide campaignId or adsetIds.'
      });
    }

    // Get user's Facebook auth
    const { FacebookAuth } = db;
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(400).json({
        success: false,
        error: 'Facebook authentication required for verification'
      });
    }

    // Decrypt access token
    const decryptedToken = decryptToken(facebookAuth.accessToken);
    if (!decryptedToken) {
      return res.status(401).json({
        success: false,
        error: 'Failed to decrypt Facebook access token'
      });
    }

    // Get active resources
    const activeResources = await ResourceHelper.getActiveResourcesWithFallback(userId);

    // Initialize Facebook API
    const facebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: activeResources.selectedAdAccountId?.replace('act_', ''),
      pageId: activeResources.selectedPageId,
      pixelId: activeResources.selectedPixelId
    });

    // Initialize Verification Service
    const verificationService = new VerificationService(facebookApi);

    // Run verification
    console.log(`\n🔍 Starting verification for ${strategyType}...`);
    const verificationResult = await verificationService.verifyStrategyEntities({
      originalRequest,
      createdEntities,
      autoCorrect
    });

    // If there are mismatches, track them as verification failures
    if (verificationResult.totalMismatches > 0) {
      const displayItems = verificationService.formatForFailureDisplay(verificationResult, strategyType);

      // Track each mismatch as a failure for UI display
      for (const item of displayItems) {
        // Only track if not auto-corrected
        if (item.status !== 'corrected') {
          await FailureTracker.safeTrackFailedEntity({
            userId,
            campaignId: createdEntities.campaignId,
            campaignName: originalRequest.campaignName || 'Unknown Campaign',
            entityType: item.entityType,
            adsetId: item.entityType === 'adset' ? item.entityId : null,
            adsetName: item.entityType === 'adset' ? item.entityName : null,
            adId: item.entityType === 'ad' ? item.entityId : null,
            adName: item.entityType === 'ad' ? item.entityName : null,
            error: new Error(item.failureReason),
            strategyType,
            metadata: {
              type: 'verification_mismatch',
              mismatches: item.metadata.mismatches,
              autoCorrectAttempted: autoCorrect
            }
          });
        }
      }
    }

    res.json({
      success: true,
      verification: {
        passed: verificationResult.totalMismatches === 0 ||
                (autoCorrect && verificationResult.corrections.failed === 0),
        totalMismatches: verificationResult.totalMismatches,
        corrections: verificationResult.corrections,
        summary: verificationResult.summary
      }
    });

  } catch (error) {
    console.error('Error during verification:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
});

/**
 * GET /api/failures/verification/:campaignId
 * Get verification results for a specific campaign
 */
router.get('/verification/:campaignId', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { campaignId } = req.params;

    // Fetch verification-related failures (type: verification_mismatch)
    const verificationFailures = await db.FailedEntity.findAll({
      where: {
        userId,
        campaignId,
        // Look for verification mismatches in metadata
      },
      order: [['createdAt', 'DESC']]
    });

    // Filter to only verification mismatches
    const mismatches = verificationFailures.filter(f =>
      f.metadata?.type === 'verification_mismatch'
    );

    res.json({
      success: true,
      campaignId,
      verificationMismatches: mismatches.map(m => ({
        id: m.id,
        entityType: m.entityType,
        entityId: m.adsetId || m.adId,
        entityName: m.adsetName || m.adName,
        reason: m.userFriendlyReason,
        mismatches: m.metadata?.mismatches || [],
        status: m.status,
        createdAt: m.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching verification results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification results',
      message: error.message
    });
  }
});

module.exports = router;
