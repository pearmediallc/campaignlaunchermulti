const express = require('express');
const router = express.Router();
const db = require('../models');
const CrossAccountDeploymentService = require('../services/CrossAccountDeploymentService');
const { authenticate } = require('../middleware/auth');
const { requireFacebookAuth, refreshFacebookToken } = require('../middleware/facebookAuth');

/**
 * Get available deployment targets (accounts and pages)
 * GET /api/campaigns/deployment/targets
 */
router.get('/targets', authenticate, requireFacebookAuth, async (req, res) => {
  try {
    console.log(`\n📊 Fetching deployment targets for user ${req.user.id}`);

    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(404).json({
        success: false,
        error: 'No active Facebook authentication found'
      });
    }

    const adAccounts = facebookAuth.adAccounts || [];
    const pages = facebookAuth.pages || [];
    const pixels = facebookAuth.pixels || [];

    // Get current selection
    const currentAdAccount = facebookAuth.selectedAdAccount;
    const currentPage = facebookAuth.selectedPage;
    const currentPixel = facebookAuth.selectedPixel;

    // Generate all possible combinations
    const combinations = [];
    for (const account of adAccounts) {
      for (const page of pages) {
        // IMPORTANT: Do NOT assign pixel here!
        // Pixel will be selected by user based on target account during deployment
        // For same-account deployments, source pixel will be used
        // For cross-account deployments, user must select appropriate pixel

        combinations.push({
          adAccountId: account.id,
          adAccountName: account.name || account.id,
          pageId: page.id,
          pageName: page.name || page.id,
          pixelId: null, // User will select pixel if needed for cross-account deployment
          pixelName: null,
          isCurrent: account.id === currentAdAccount?.id && page.id === currentPage?.id,
          status: 'ready' // Can add budget checks, permission checks here
        });
      }
    }

    console.log(`✅ Found ${combinations.length} possible deployment targets`);

    res.json({
      success: true,
      adAccounts: adAccounts.map(acc => ({
        id: acc.id,
        name: acc.name || acc.id,
        currency: acc.currency,
        status: acc.account_status
      })),
      pages: pages.map(page => ({
        id: page.id,
        name: page.name || page.id,
        category: page.category
      })),
      pixels: pixels.map(pixel => ({
        id: pixel.id,
        name: pixel.name || pixel.id
      })),
      combinations,
      currentSelection: {
        adAccountId: currentAdAccount?.id,
        adAccountName: currentAdAccount?.name,
        pageId: currentPage?.id,
        pageName: currentPage?.name,
        pixelId: currentPixel?.id,
        pixelName: currentPixel?.name
      }
    });

  } catch (error) {
    console.error('❌ Error fetching deployment targets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create a new deployment
 * POST /api/campaigns/:campaignId/deploy
 */
router.post('/:campaignId/deploy', authenticate, requireFacebookAuth, refreshFacebookToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { targets, deploymentName, processingMode = 'parallel' } = req.body;

    console.log(`\n🚀 DEPLOYMENT REQUEST RECEIVED`);
    console.log(`  User: ${req.user.id}`);
    console.log(`  Campaign: ${campaignId}`);
    console.log(`  Targets: ${targets?.length || 0}`);
    console.log(`  Mode: ${processingMode}`);

    // Validation
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one target is required'
      });
    }

    if (targets.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 targets allowed per deployment'
      });
    }

    // Validate each target has required fields
    for (const target of targets) {
      if (!target.adAccountId || !target.pageId) {
        return res.status(400).json({
          success: false,
          error: 'Each target must have adAccountId and pageId'
        });
      }
    }

    // Get source account info
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(404).json({
        success: false,
        error: 'No active Facebook authentication found'
      });
    }

    const sourceAccount = {
      adAccountId: facebookAuth.selectedAdAccount?.id,
      pageId: facebookAuth.selectedPage?.id,
      pixelId: facebookAuth.selectedPixel?.id
    };

    console.log(`\n📋 Source Account:`, sourceAccount);
    console.log(`📋 Targets:`, JSON.stringify(targets, null, 2));

    // Start deployment (async)
    const result = await CrossAccountDeploymentService.deployToMultipleTargets(
      req.user.id,
      campaignId,
      sourceAccount,
      targets,
      processingMode
    );

    console.log(`\n✅ Deployment completed:`, {
      deploymentId: result.deploymentId,
      status: result.status,
      successful: result.successful,
      failed: result.failed
    });

    res.json({
      success: true,
      deployment: {
        id: result.deploymentId,
        status: result.status,
        totalTargets: result.totalTargets,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('❌ Deployment error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        type: error.type
      }
    });
  }
});

/**
 * Get deployment status
 * GET /api/campaigns/deployment/:deploymentId/status
 */
router.get('/deployment/:deploymentId/status', authenticate, async (req, res) => {
  try {
    const { deploymentId } = req.params;

    console.log(`\n📊 Fetching deployment status: ${deploymentId}`);

    const deployment = await db.CampaignDeployment.findOne({
      where: {
        id: deploymentId,
        userId: req.user.id
      },
      include: [
        {
          model: db.DeployedCampaign,
          as: 'deployedCampaigns'
        }
      ]
    });

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    res.json({
      success: true,
      deployment: {
        id: deployment.id,
        sourceCampaignId: deployment.sourceCampaignId,
        sourceAdAccountId: deployment.sourceAdAccountId,
        sourcePageId: deployment.sourcePageId,
        deploymentName: deployment.deploymentName,
        status: deployment.status,
        totalTargets: deployment.totalTargets,
        successfulDeployments: deployment.successfulDeployments,
        failedDeployments: deployment.failedDeployments,
        processingMode: deployment.processingMode,
        createdAt: deployment.createdAt,
        completedAt: deployment.completedAt,
        deployedCampaigns: deployment.deployedCampaigns.map(dc => ({
          id: dc.id,
          targetCampaignId: dc.targetCampaignId,
          targetCampaignName: dc.targetCampaignName,
          targetAdAccountId: dc.targetAdAccountId,
          targetPageId: dc.targetPageId,
          status: dc.status,
          adSetsCount: dc.adSetsCount,
          adsCount: dc.adsCount,
          errorMessage: dc.errorMessage,
          deployedAt: dc.deployedAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching deployment status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pixels accessible by a specific ad account
 * GET /api/campaigns/deployment/pixels?adAccountId=act_xxx
 */
router.get('/pixels', authenticate, requireFacebookAuth, async (req, res) => {
  try {
    const { adAccountId } = req.query;

    console.log(`\n🎨 Fetching pixels for ad account: ${adAccountId}`);

    if (!adAccountId) {
      return res.status(400).json({
        success: false,
        error: 'adAccountId query parameter is required'
      });
    }

    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(404).json({
        success: false,
        error: 'No active Facebook authentication found'
      });
    }

    // Get all pixels from user's Facebook auth
    const allPixels = facebookAuth.pixels || [];

    // In a real implementation, we would query Facebook API to get pixels specifically accessible by this account
    // For now, we return all user's pixels (Facebook allows sharing pixels across accounts in Business Manager)
    const accountPixels = allPixels.map(pixel => ({
      id: pixel.id,
      name: pixel.name || `Pixel ${pixel.id}`
    }));

    console.log(`✅ Found ${accountPixels.length} pixels accessible by account ${adAccountId}`);

    res.json({
      success: true,
      adAccountId,
      pixels: accountPixels
    });

  } catch (error) {
    console.error('❌ Error fetching account pixels:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all deployments for user
 * GET /api/campaigns/deployment/history
 */
router.get('/deployment/history', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    console.log(`\n📊 Fetching deployment history for user ${req.user.id}`);

    const deployments = await db.CampaignDeployment.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: db.DeployedCampaign,
          as: 'deployedCampaigns'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await db.CampaignDeployment.count({
      where: { userId: req.user.id }
    });

    res.json({
      success: true,
      deployments: deployments.map(d => ({
        id: d.id,
        sourceCampaignId: d.sourceCampaignId,
        deploymentName: d.deploymentName,
        status: d.status,
        totalTargets: d.totalTargets,
        successfulDeployments: d.successfulDeployments,
        failedDeployments: d.failedDeployments,
        createdAt: d.createdAt,
        completedAt: d.completedAt,
        deployedCampaigns: d.deployedCampaigns.length
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + deployments.length < total
      }
    });

  } catch (error) {
    console.error('❌ Error fetching deployment history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
