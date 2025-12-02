/**
 * App Rotation Administration Routes
 *
 * Provides admin dashboard for monitoring Facebook app rotation status,
 * viewing statistics, and managing rate limits.
 */

const express = require('express');
const router = express.Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const appRotationService = require('../services/AppRotationService');
const fbApiHelper = require('../utils/facebookApiHelper');

/**
 * GET /api/admin/app-rotation/status
 * Get current rotation status for all apps
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const appsStatus = appRotationService.getAppsStatus();
    const summary = appRotationService.getSummary();
    const stats = fbApiHelper.getStats();

    res.json({
      success: true,
      enabled: fbApiHelper.isRotationEnabled(),
      apps: appsStatus,
      summary: summary,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching app rotation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rotation status'
    });
  }
});

/**
 * GET /api/admin/app-rotation/summary
 * Get summary statistics only (lightweight)
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const summary = appRotationService.getSummary();

    res.json({
      success: true,
      summary: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching rotation summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rotation summary'
    });
  }
});

/**
 * GET /api/admin/app-rotation/apps
 * Get detailed status for all apps
 */
router.get('/apps', authenticate, async (req, res) => {
  try {
    const appsStatus = appRotationService.getAppsStatus();

    res.json({
      success: true,
      apps: appsStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching apps status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch apps status'
    });
  }
});

/**
 * GET /api/admin/app-rotation/stats
 * Get API call statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = fbApiHelper.getStats();

    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching API stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API statistics'
    });
  }
});

/**
 * POST /api/admin/app-rotation/reset
 * Manually reset all rate limit counters (admin only)
 */
router.post('/reset', authenticate, requirePermission('admin'), async (req, res) => {
  try {
    appRotationService.forceResetCounters();

    res.json({
      success: true,
      message: 'Rate limit counters manually reset',
      summary: appRotationService.getSummary(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting counters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset counters'
    });
  }
});

/**
 * GET /api/admin/app-rotation/app/:appId
 * Get status for a specific app
 */
router.get('/app/:appId', authenticate, async (req, res) => {
  try {
    const { appId } = req.params;
    const appsStatus = appRotationService.getAppsStatus();
    const appStatus = appsStatus.find(app => app.appId === appId);

    if (!appStatus) {
      return res.status(404).json({
        success: false,
        error: 'App not found'
      });
    }

    res.json({
      success: true,
      app: appStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching app status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch app status'
    });
  }
});

/**
 * GET /api/admin/app-rotation/health
 * Health check endpoint for monitoring
 */
router.get('/health', authenticate, async (req, res) => {
  try {
    const summary = appRotationService.getSummary();
    const appsStatus = appRotationService.getAppsStatus();

    // Check if any apps are available
    const hasAvailableApps = appsStatus.some(app =>
      app.status === 'available' || app.status === 'active'
    );

    // Determine overall health
    let health = 'healthy';
    if (!hasAvailableApps) {
      health = 'critical'; // All apps exhausted
    } else if (summary.availableApps === 1) {
      health = 'warning'; // Only one app left
    }

    res.json({
      success: true,
      health: health,
      enabled: fbApiHelper.isRotationEnabled(),
      availableApps: summary.availableApps,
      totalApps: summary.totalApps,
      usagePercentage: summary.usagePercentage,
      minutesUntilReset: summary.minutesUntilReset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking rotation health:', error);
    res.status(500).json({
      success: false,
      health: 'error',
      error: 'Failed to check health'
    });
  }
});

/**
 * GET /api/admin/app-rotation/config
 * Get rotation configuration (safe - no sensitive data)
 */
router.get('/config', authenticate, requirePermission('admin'), async (req, res) => {
  try {
    const { getBackupApps, getTotalCapacity } = require('../config/backupApps');
    const apps = getBackupApps();

    // Return config without sensitive tokens
    const safeConfig = apps.map(app => ({
      appId: app.appId,
      name: app.name,
      type: app.type,
      rateLimit: app.rateLimit,
      priority: app.priority,
      isBackup: app.isBackup,
      description: app.description,
      hasToken: !!app.accessToken
    }));

    res.json({
      success: true,
      enabled: fbApiHelper.isRotationEnabled(),
      apps: safeConfig,
      totalCapacity: getTotalCapacity(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching rotation config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration'
    });
  }
});

module.exports = router;
