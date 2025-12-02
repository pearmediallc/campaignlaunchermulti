const express = require('express');
const router = express.Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const SystemUserManager = require('../services/SystemUserManager');
const RateLimitService = require('../services/RateLimitService');

/**
 * Admin routes for managing rate limiting, System Users, and request queue
 * Requires admin permissions
 */

// Get all System Users status
router.get('/system-users/status', authenticate, requirePermission('manage_system'), async (req, res) => {
  try {
    const systemUsers = await SystemUserManager.getSystemUsersStatus();

    res.json({
      success: true,
      systemUsers,
      totalCapacity: systemUsers.length * 200,
      availableCapacity: systemUsers.reduce((sum, su) => sum + (200 - su.rateLimitUsed), 0)
    });
  } catch (error) {
    console.error('Error getting System Users status:', error);
    res.status(500).json({
      error: 'Failed to get System Users status',
      message: error.message
    });
  }
});

// Add a new System User
router.post('/system-users', authenticate, requirePermission('manage_system'), async (req, res) => {
  try {
    const { name, systemUserId, accessToken, businessManagerId } = req.body;

    if (!name || !systemUserId || !accessToken || !businessManagerId) {
      return res.status(400).json({
        error: 'Missing required fields: name, systemUserId, accessToken, businessManagerId'
      });
    }

    const systemUser = await SystemUserManager.addSystemUser({
      name,
      systemUserId,
      accessToken,
      businessManagerId
    });

    res.json({
      success: true,
      message: 'System User added successfully',
      systemUser: {
        id: systemUser.id,
        name: systemUser.name,
        systemUserId: systemUser.systemUserId,
        businessManagerId: systemUser.businessManagerId
      }
    });
  } catch (error) {
    console.error('Error adding System User:', error);
    res.status(500).json({
      error: 'Failed to add System User',
      message: error.message
    });
  }
});

// Add an internal ad account
router.post('/internal-accounts', authenticate, requirePermission('manage_system'), async (req, res) => {
  try {
    const { adAccountId, businessManagerId, businessManagerName } = req.body;

    if (!adAccountId || !businessManagerId) {
      return res.status(400).json({
        error: 'Missing required fields: adAccountId, businessManagerId'
      });
    }

    const account = await SystemUserManager.addInternalAccount({
      adAccountId,
      businessManagerId,
      businessManagerName
    });

    res.json({
      success: true,
      message: 'Internal account added successfully',
      account: {
        id: account.id,
        adAccountId: account.adAccountId,
        businessManagerId: account.businessManagerId,
        businessManagerName: account.businessManagerName
      }
    });
  } catch (error) {
    console.error('Error adding internal account:', error);
    res.status(500).json({
      error: 'Failed to add internal account',
      message: error.message
    });
  }
});

// Get user's queued requests
router.get('/queue/my-requests', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    const queuedRequests = await RateLimitService.getUserQueuedRequests(userId);

    res.json({
      success: true,
      requests: queuedRequests,
      count: queuedRequests.length
    });
  } catch (error) {
    console.error('Error getting queued requests:', error);
    res.status(500).json({
      error: 'Failed to get queued requests',
      message: error.message
    });
  }
});

// Get user's current rate limit status
router.get('/rate-limit/status', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { adAccountId } = req.query;

    if (!adAccountId) {
      return res.status(400).json({
        error: 'adAccountId is required'
      });
    }

    const rateLimitStatus = await RateLimitService.checkRateLimit(userId, adAccountId);

    res.json({
      success: true,
      rateLimit: rateLimitStatus
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({
      error: 'Failed to get rate limit status',
      message: error.message
    });
  }
});

// Admin: Get all queued requests (paginated)
router.get('/queue/all', authenticate, requirePermission('manage_system'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'queued' } = req.query;

    const db = require('../models');
    const offset = (page - 1) * limit;

    const { count, rows } = await db.RequestQueue.findAndCountAll({
      where: status !== 'all' ? { status } : {},
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id', 'email', 'username']
      }]
    });

    res.json({
      success: true,
      requests: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error getting all queued requests:', error);
    res.status(500).json({
      error: 'Failed to get queued requests',
      message: error.message
    });
  }
});

module.exports = router;
