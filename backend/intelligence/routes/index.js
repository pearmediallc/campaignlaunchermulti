'use strict';

/**
 * Intelligence API Routes
 *
 * All routes prefixed with /api/intelligence/
 * Requires authentication for all endpoints.
 *
 * ISOLATION PRINCIPLE:
 * These routes are completely separate from campaign management routes.
 * They only interact with intel_* tables and intelligence services.
 */

const express = require('express');
const router = express.Router();

// Import services
const {
  InsightsCollectorService,
  PixelHealthService,
  AutomationRulesEngine,
  AccountScoreService,
  PatternLearningService,
  NotificationService,
  IntelligenceScheduler,
  ActionExecutor
} = require('../services');

const ExpertRulesService = require('../services/ExpertRulesService');

// Import models
const intelModels = require('../models');

// Middleware to check if intelligence is enabled
const checkEnabled = (req, res, next) => {
  if (process.env.ENABLE_INTELLIGENCE !== 'true') {
    return res.status(503).json({
      success: false,
      error: 'Intelligence module is disabled'
    });
  }
  next();
};

// Apply to all routes
router.use(checkEnabled);

// ============================================
// Health & Status Endpoints
// ============================================

/**
 * GET /api/intelligence/health
 * Health check for intelligence module
 */
router.get('/health', async (req, res) => {
  try {
    const health = await IntelligenceScheduler.healthCheck();
    res.json({ success: true, ...health });
  } catch (error) {
    console.error('[Intelligence] Health check error:', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/status
 * Get scheduler status
 */
router.get('/status', async (req, res) => {
  try {
    const status = IntelligenceScheduler.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('[Intelligence] Status check error:', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Dashboard Endpoints
// ============================================

/**
 * GET /api/intelligence/dashboard
 * Get dashboard data for the current user
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    const [scores, notifications, pendingActions, patterns] = await Promise.all([
      AccountScoreService.getDashboardData(userId),
      NotificationService.getSummary(userId),
      ActionExecutor.getPendingActions(userId),
      PatternLearningService.getPatternInsights(userId)
    ]);

    res.json({
      success: true,
      data: {
        account_scores: scores,
        notifications,
        pending_actions: pendingActions,
        patterns
      }
    });
  } catch (error) {
    console.error('[Intelligence] Dashboard fetch error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Account Scores Endpoints
// ============================================

/**
 * GET /api/intelligence/scores
 * Get account scores for user
 */
router.get('/scores', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await AccountScoreService.getDashboardData(userId);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[Intelligence] Scores fetch error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/scores/:adAccountId
 * Get detailed score for specific account
 */
router.get('/scores/:adAccountId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { adAccountId } = req.params;
    const data = await AccountScoreService.getAccountDetail(userId, adAccountId);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[Intelligence] Account score detail error for user', req.user?.id, 'account', req.params?.adAccountId, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Automation Rules Endpoints
// ============================================

/**
 * GET /api/intelligence/rules
 * Get all rules for user
 */
router.get('/rules', async (req, res) => {
  try {
    const userId = req.user.id;
    const { active_only, rule_type } = req.query;

    const rules = await AutomationRulesEngine.getRulesForUser(userId, {
      active_only: active_only === 'true',
      rule_type
    });

    res.json({ success: true, rules });
  } catch (error) {
    console.error('[Intelligence] Rules fetch error for user', req.user?.id, 'filters:', { active_only, rule_type: req.query?.rule_type }, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/rules/templates
 * Get default rule templates
 */
router.get('/rules/templates', (req, res) => {
  const templates = AutomationRulesEngine.getDefaultRuleTemplates();
  res.json({ success: true, templates });
});

/**
 * POST /api/intelligence/rules
 * Create a new rule
 */
router.post('/rules', async (req, res) => {
  try {
    const userId = req.user.id;
    const rule = await AutomationRulesEngine.createRule(userId, req.body);
    res.json({ success: true, rule });
  } catch (error) {
    console.error('[Intelligence] Rule creation error for user', req.user?.id, 'rule data:', JSON.stringify(req.body), ':', error.message, error.stack);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/intelligence/rules/:ruleId
 * Update a rule
 */
router.put('/rules/:ruleId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { ruleId } = req.params;

    const rule = await intelModels.IntelAutomationRule.findOne({
      where: { id: ruleId, user_id: userId }
    });

    if (!rule) {
      console.error('[Intelligence] Rule update error: Rule not found for user', userId, 'ruleId', ruleId);
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    await rule.update(req.body);
    res.json({ success: true, rule });
  } catch (error) {
    console.error('[Intelligence] Rule update error for user', req.user?.id, 'ruleId', req.params?.ruleId, ':', error.message, error.stack);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/intelligence/rules/:ruleId
 * Delete a rule
 */
router.delete('/rules/:ruleId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { ruleId } = req.params;

    const rule = await intelModels.IntelAutomationRule.findOne({
      where: { id: ruleId, user_id: userId }
    });

    if (!rule) {
      console.error('[Intelligence] Rule delete error: Rule not found for user', userId, 'ruleId', ruleId);
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    await rule.destroy();
    res.json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    console.error('[Intelligence] Rule delete error for user', req.user?.id, 'ruleId', req.params?.ruleId, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/rules/stats
 * Get rule statistics
 */
router.get('/rules/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await AutomationRulesEngine.getRuleStats(userId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[Intelligence] Rule stats error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Actions Endpoints
// ============================================

/**
 * GET /api/intelligence/actions/pending
 * Get pending actions for user
 */
router.get('/actions/pending', async (req, res) => {
  try {
    const userId = req.user.id;
    const actions = await ActionExecutor.getPendingActions(userId);
    res.json({ success: true, actions });
  } catch (error) {
    console.error('[Intelligence] Pending actions fetch error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/actions/history
 * Get action history for user
 */
router.get('/actions/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, status } = req.query;

    const actions = await ActionExecutor.getActionHistory(userId, {
      limit: parseInt(limit) || 50,
      status
    });

    res.json({ success: true, actions });
  } catch (error) {
    console.error('[Intelligence] Action history fetch error for user', req.user?.id, 'filters:', { limit: req.query?.limit, status: req.query?.status }, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/actions/:actionId/approve
 * Approve an action
 */
router.post('/actions/:actionId/approve', async (req, res) => {
  try {
    const userId = req.user.id;
    const { actionId } = req.params;

    const action = await ActionExecutor.approveAction(actionId, userId);
    res.json({ success: true, action, message: 'Action approved' });
  } catch (error) {
    console.error('[Intelligence] Action approve error for user', req.user?.id, 'actionId', req.params?.actionId, ':', error.message, error.stack);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/actions/:actionId/reject
 * Reject an action
 */
router.post('/actions/:actionId/reject', async (req, res) => {
  try {
    const userId = req.user.id;
    const { actionId } = req.params;
    const { reason } = req.body;

    const action = await ActionExecutor.rejectAction(actionId, userId, reason);
    res.json({ success: true, action, message: 'Action rejected' });
  } catch (error) {
    console.error('[Intelligence] Action reject error for user', req.user?.id, 'actionId', req.params?.actionId, 'reason:', req.body?.reason, ':', error.message, error.stack);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/actions/stats
 * Get action statistics
 */
router.get('/actions/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const { days } = req.query;

    const stats = await ActionExecutor.getStats(userId, parseInt(days) || 30);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[Intelligence] Action stats error for user', req.user?.id, 'days:', req.query?.days, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Notifications Endpoints
// ============================================

/**
 * GET /api/intelligence/notifications
 * Get notifications for user
 */
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, include_read } = req.query;

    const result = await NotificationService.getAll(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      includeRead: include_read !== 'false'
    });

    res.json({
      success: true,
      notifications: result.rows,
      total: result.count,
      page: parseInt(page) || 1
    });
  } catch (error) {
    console.error('[Intelligence] Notifications fetch error for user', req.user?.id, 'params:', { page: req.query?.page, limit: req.query?.limit }, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/notifications/unread
 * Get unread notifications
 */
router.get('/notifications/unread', async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await NotificationService.getUnread(userId);
    const count = await NotificationService.getUnreadCount(userId);

    res.json({ success: true, notifications, count });
  } catch (error) {
    console.error('[Intelligence] Unread notifications fetch error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/notifications/:id/read
 * Mark notification as read
 */
router.post('/notifications/:id/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await NotificationService.markRead(id, userId);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('[Intelligence] Mark notification read error for user', req.user?.id, 'notificationId', req.params?.id, ':', error.message, error.stack);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/notifications/read-all
 * Mark all notifications as read
 */
router.post('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.user.id;
    await NotificationService.markAllRead(userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[Intelligence] Mark all notifications read error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/notifications/:id/action
 * Handle notification action button
 */
router.post('/notifications/:id/action', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { action } = req.body;

    const result = await NotificationService.handleAction(id, userId, action);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Intelligence] Notification action error for user', req.user?.id, 'notificationId', req.params?.id, 'action:', req.body?.action, ':', error.message, error.stack);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// Pixel Health Endpoints
// ============================================

/**
 * GET /api/intelligence/pixels
 * Get pixel health summary for user
 */
router.get('/pixels', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await PixelHealthService.getHealthSummary(userId);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[Intelligence] Pixel health summary error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/pixels/:pixelId/trends
 * Get pixel health trends
 */
router.get('/pixels/:pixelId/trends', async (req, res) => {
  try {
    const { pixelId } = req.params;
    const { days } = req.query;

    const data = await PixelHealthService.getPixelTrends(pixelId, parseInt(days) || 30);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[Intelligence] Pixel trends error for pixelId', req.params?.pixelId, 'days:', req.query?.days, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Patterns & Insights Endpoints
// ============================================

/**
 * GET /api/intelligence/patterns
 * Get learned patterns
 */
router.get('/patterns', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await PatternLearningService.getPatternInsights(userId);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[Intelligence] Patterns fetch error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/performance/:entityType/:entityId
 * Get performance data and predictions for an entity
 */
router.get('/performance/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { days } = req.query;

    const [trend, latestSnapshot] = await Promise.all([
      InsightsCollectorService.getPerformanceTrend(entityType, entityId, parseInt(days) || 7),
      intelModels.IntelPerformanceSnapshot.getLatestSnapshot(entityType, entityId)
    ]);

    let predictions = null;
    if (latestSnapshot) {
      predictions = await PatternLearningService.predictPerformance(
        entityType,
        entityId,
        {
          cpm: latestSnapshot.cpm,
          ctr: latestSnapshot.ctr,
          cpc: latestSnapshot.cpc,
          cpa: latestSnapshot.cpa,
          roas: latestSnapshot.roas,
          frequency: latestSnapshot.frequency,
          hour: new Date().getHours()
        }
      );
    }

    res.json({
      success: true,
      trend,
      latest: latestSnapshot,
      predictions
    });
  } catch (error) {
    console.error('[Intelligence] Performance fetch error for', req.params?.entityType, req.params?.entityId, 'days:', req.query?.days, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Admin/Manual Job Endpoints
// ============================================

/**
 * POST /api/intelligence/jobs/:jobName/run
 * Manually run a job (admin only)
 */
router.post('/jobs/:jobName/run', async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles?.includes('superadmin')) {
      console.error('[Intelligence] Job run unauthorized attempt by user', req.user?.id, 'for job:', req.params?.jobName);
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { jobName } = req.params;
    const result = await IntelligenceScheduler.runJob(jobName);

    res.json({ success: true, job: jobName, result });
  } catch (error) {
    console.error('[Intelligence] Job run error for job', req.params?.jobName, 'user:', req.user?.id, ':', error.message, error.stack);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// Expert Rules Endpoints
// ============================================

/**
 * GET /api/intelligence/expert-rules
 * Get all expert rules
 */
router.get('/expert-rules', async (req, res) => {
  try {
    const { vertical, rule_type } = req.query;

    let rules;
    if (vertical) {
      rules = await intelModels.IntelExpertRule.getByVertical(vertical);
    } else if (rule_type) {
      rules = await intelModels.IntelExpertRule.findAll({
        where: { rule_type, is_active: true },
        order: [['confidence_score', 'DESC']]
      });
    } else {
      rules = await ExpertRulesService.getAllRules();
    }

    res.json({ success: true, rules });
  } catch (error) {
    console.error('[Intelligence] Expert rules fetch error, filters:', { vertical: req.query?.vertical, rule_type: req.query?.rule_type }, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/expert-rules/summary
 * Get expert rules summary for dashboard
 */
router.get('/expert-rules/summary', async (req, res) => {
  try {
    const summary = await ExpertRulesService.getRulesSummary();
    res.json({ success: true, ...summary });
  } catch (error) {
    console.error('[Intelligence] Expert rules summary error:', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/expert-rules/benchmarks
 * Get benchmark thresholds
 */
router.get('/expert-rules/benchmarks', async (req, res) => {
  try {
    const { vertical } = req.query;
    const benchmarks = await ExpertRulesService.getBenchmarks(vertical || 'all');
    res.json({ success: true, benchmarks });
  } catch (error) {
    console.error('[Intelligence] Benchmarks fetch error for vertical:', req.query?.vertical, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/expert-rules/:ruleId
 * Get specific expert rule details
 */
router.get('/expert-rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const rule = await intelModels.IntelExpertRule.findByPk(ruleId);

    if (!rule) {
      console.error('[Intelligence] Expert rule not found, ruleId:', ruleId);
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    res.json({ success: true, rule });
  } catch (error) {
    console.error('[Intelligence] Expert rule detail error for ruleId:', req.params?.ruleId, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/intelligence/expert-rules/:ruleId
 * Update an expert rule (admin only)
 */
router.put('/expert-rules/:ruleId', async (req, res) => {
  try {
    if (!req.user.roles?.includes('superadmin')) {
      console.error('[Intelligence] Expert rule update unauthorized attempt by user', req.user?.id, 'for ruleId:', req.params?.ruleId);
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { ruleId } = req.params;
    const rule = await intelModels.IntelExpertRule.findByPk(ruleId);

    if (!rule) {
      console.error('[Intelligence] Expert rule update error: Rule not found, ruleId:', ruleId);
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    await rule.update(req.body);
    res.json({ success: true, rule });
  } catch (error) {
    console.error('[Intelligence] Expert rule update error for ruleId:', req.params?.ruleId, ':', error.message, error.stack);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/expert-rules/seed
 * Seed expert rules from form data (admin only)
 */
router.post('/expert-rules/seed', async (req, res) => {
  try {
    if (!req.user.roles?.includes('superadmin')) {
      console.error('[Intelligence] Expert rules seed unauthorized attempt by user', req.user?.id);
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { formSubmissions } = req.body;

    if (!formSubmissions || !Array.isArray(formSubmissions)) {
      console.error('[Intelligence] Expert rules seed error: Invalid formSubmissions, received:', typeof req.body?.formSubmissions);
      return res.status(400).json({ success: false, error: 'formSubmissions array required' });
    }

    const results = await ExpertRulesService.parseAndSeedRules(formSubmissions);
    res.json({ success: true, results });
  } catch (error) {
    console.error('[Intelligence] Expert rules seed error:', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Backfill Endpoints
// ============================================

/**
 * GET /api/intelligence/backfill/status
 * Get backfill status for user's accounts
 */
router.get('/backfill/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await intelModels.IntelBackfillProgress.getUserStatus(userId);
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('[Intelligence] Backfill status error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/backfill/start
 * Start backfill for an account
 */
router.post('/backfill/start', async (req, res) => {
  try {
    const userId = req.user.id;
    // Support both camelCase and snake_case for adAccountId
    const adAccountId = req.body.adAccountId || req.body.ad_account_id;
    const days = req.body.days || 90;
    const type = req.body.type || req.body.backfill_type || 'all';

    console.log('[Intelligence] Backfill start requested for user', userId, 'adAccountId:', adAccountId, 'days:', days, 'type:', type);

    if (!adAccountId) {
      console.error('[Intelligence] Backfill start error: Missing adAccountId for user', userId);
      return res.status(400).json({ success: false, error: 'adAccountId required' });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Create or get progress record
    const { record, created } = await intelModels.IntelBackfillProgress.getOrCreate(
      userId,
      adAccountId,
      {
        type,
        startDate,
        endDate,
        totalDays: days
      }
    );

    if (!created && record.status === 'in_progress') {
      console.log('[Intelligence] Backfill already in progress for user', userId, 'adAccountId:', adAccountId);
      return res.status(400).json({
        success: false,
        error: 'Backfill already in progress for this account'
      });
    }

    // Reset if restarting
    if (!created) {
      await record.update({
        status: 'pending',
        days_completed: 0,
        error_message: null,
        start_date: startDate,
        end_date: endDate,
        total_days: days
      });
    }

    // Start backfill in background
    setImmediate(async () => {
      try {
        await record.update({ status: 'in_progress', started_at: new Date() });

        if (type === 'all' || type === 'insights') {
          await InsightsCollectorService.backfillAccount(userId, adAccountId, {
            startDate,
            endDate,
            progressCallback: async (day, current) => {
              await record.updateProgress(day, current);
            }
          });
        }

        if (type === 'all' || type === 'pixel') {
          await PixelHealthService.backfillAccount(userId, adAccountId, {
            startDate,
            endDate
          });
        }

        await record.update({
          status: 'completed',
          completed_at: new Date(),
          days_completed: days
        });

        // Auto-trigger pattern learning after successful backfill
        console.log('🧠 [Intelligence] Auto-triggering pattern learning after backfill completion...');
        try {
          const learningResults = await PatternLearningService.learnAllPatterns();
          console.log('✅ [PatternLearning] Auto-learning complete:', learningResults);

          // Also calculate account scores
          console.log('📊 [Intelligence] Auto-calculating account scores...');
          const scoreResults = await AccountScoreService.calculateAllScores();
          console.log('✅ [AccountScore] Auto-calculation complete:', scoreResults);
        } catch (learningError) {
          console.error('⚠️ [Intelligence] Auto-learning/scoring after backfill failed:', learningError.message);
          // Don't fail the backfill if learning fails
        }
      } catch (error) {
        console.error('[Intelligence] Backfill background task error for user', userId, 'adAccountId:', adAccountId, ':', error.message, error.stack);
        await record.markFailed(error.message);
      }
    });

    res.json({
      success: true,
      message: 'Backfill started',
      backfill: {
        ad_account_id: adAccountId,
        type,
        days,
        status: 'in_progress'
      }
    });
  } catch (error) {
    console.error('[Intelligence] Backfill start error for user', req.user?.id, 'adAccountId:', req.body?.adAccountId, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/backfill/batch
 * Start backfill for multiple accounts simultaneously
 */
router.post('/backfill/batch', async (req, res) => {
  try {
    const userId = req.user.id;
    const { adAccountIds, days = 90, type = 'all' } = req.body;

    console.log('[Intelligence] Batch backfill requested for user', userId, 'accounts:', adAccountIds?.length || 0);

    if (!adAccountIds || !Array.isArray(adAccountIds) || adAccountIds.length === 0) {
      return res.status(400).json({ success: false, error: 'adAccountIds array required' });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = {
      started: [],
      skipped: [],
      errors: []
    };

    // Create records for all accounts
    for (const adAccountId of adAccountIds) {
      try {
        const { record, created } = await intelModels.IntelBackfillProgress.getOrCreate(
          userId,
          adAccountId,
          {
            type,
            startDate,
            endDate,
            totalDays: days
          }
        );

        if (!created && record.status === 'in_progress') {
          results.skipped.push({ ad_account_id: adAccountId, reason: 'Already in progress' });
          continue;
        }

        // Reset if restarting
        if (!created) {
          await record.update({
            status: 'pending',
            days_completed: 0,
            error_message: null,
            start_date: startDate,
            end_date: endDate,
            total_days: days
          });
        }

        results.started.push(adAccountId);

        // Start backfill in background for each account
        setImmediate(async () => {
          try {
            await record.update({ status: 'in_progress', started_at: new Date() });

            if (type === 'all' || type === 'insights') {
              await InsightsCollectorService.backfillAccount(userId, adAccountId, {
                startDate,
                endDate,
                progressCallback: async (day, current) => {
                  await record.updateProgress(day, current);
                }
              });
            }

            if (type === 'all' || type === 'pixel') {
              await PixelHealthService.backfillAccount(userId, adAccountId, {
                startDate,
                endDate
              });
            }

            await record.update({
              status: 'completed',
              completed_at: new Date(),
              days_completed: days
            });

            console.log(`✅ [Backfill] Account ${adAccountId} completed`);
          } catch (error) {
            console.error(`[Intelligence] Backfill error for account ${adAccountId}:`, error.message);
            await record.markFailed(error.message);
          }
        });
      } catch (error) {
        results.errors.push({ ad_account_id: adAccountId, error: error.message });
      }
    }

    // If all accounts started, trigger learning after a delay
    if (results.started.length > 0) {
      // Schedule pattern learning after all backfills complete (estimate based on accounts)
      const estimatedMinutes = Math.max(5, results.started.length * 2);
      console.log(`[Intelligence] Scheduling pattern learning in ~${estimatedMinutes} minutes after batch backfill`);
    }

    res.json({
      success: true,
      message: `Started backfill for ${results.started.length} accounts`,
      results
    });
  } catch (error) {
    console.error('[Intelligence] Batch backfill error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/backfill/pause
 * Pause backfill for an account
 */
router.post('/backfill/pause', async (req, res) => {
  try {
    const userId = req.user.id;
    // Support both camelCase and snake_case for adAccountId
    const adAccountId = req.body.adAccountId || req.body.ad_account_id;

    const record = await intelModels.IntelBackfillProgress.findOne({
      where: { user_id: userId, ad_account_id: adAccountId }
    });

    if (!record) {
      console.error('[Intelligence] Backfill pause error: Not found for user', userId, 'adAccountId:', adAccountId);
      return res.status(404).json({ success: false, error: 'Backfill not found' });
    }

    await record.update({ status: 'paused' });
    console.log('[Intelligence] Backfill paused for user', userId, 'adAccountId:', adAccountId);
    res.json({ success: true, message: 'Backfill paused' });
  } catch (error) {
    console.error('[Intelligence] Backfill pause error for user', req.user?.id, 'adAccountId:', req.body?.adAccountId, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/intelligence/backfill/:adAccountId
 * Cancel and delete backfill progress
 */
router.delete('/backfill/:adAccountId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { adAccountId } = req.params;

    const record = await intelModels.IntelBackfillProgress.findOne({
      where: { user_id: userId, ad_account_id: adAccountId }
    });

    if (record) {
      await record.destroy();
      console.log('[Intelligence] Backfill cancelled for user', userId, 'adAccountId:', adAccountId);
    }

    res.json({ success: true, message: 'Backfill cancelled' });
  } catch (error) {
    console.error('[Intelligence] Backfill cancel error for user', req.user?.id, 'adAccountId:', req.params?.adAccountId, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Pixel Direct Fetch Endpoints
// ============================================

/**
 * POST /api/intelligence/pixel/fetch-batch
 * Fetch data for multiple pixels by ID
 */
router.post('/pixel/fetch-batch', async (req, res) => {
  try {
    const userId = req.user.id;
    const { pixelIds, days = 90 } = req.body;

    console.log('[Intelligence] Batch pixel fetch requested for user', userId, 'pixels:', pixelIds?.length || 0);

    if (!pixelIds || !Array.isArray(pixelIds) || pixelIds.length === 0) {
      return res.status(400).json({ success: false, error: 'pixelIds array required' });
    }

    const mainDb = require('../../models');

    // Get access token
    const fbAuth = await mainDb.FacebookAuth.findOne({
      where: { userId: userId },
      order: [['updated_at', 'DESC']]
    });

    if (!fbAuth || !fbAuth.accessToken) {
      return res.status(400).json({ success: false, error: 'No valid Facebook access token found' });
    }

    const accessToken = fbAuth.accessToken;
    const axios = require('axios');
    const apiVersion = process.env.FB_API_VERSION || 'v18.0';
    const baseUrl = `https://graph.facebook.com/${apiVersion}`;

    const results = {
      started: [],
      failed: []
    };

    // Process each pixel
    for (const pixelId of pixelIds) {
      try {
        // Fetch pixel info
        const pixelResponse = await axios.get(`${baseUrl}/${pixelId}`, {
          params: {
            access_token: accessToken,
            fields: 'id,name,owner_ad_account,is_unavailable,last_fired_time,creation_time'
          }
        });
        const pixelInfo = pixelResponse.data;

        // Get ad account ID from pixel owner
        let adAccountId = pixelInfo.owner_ad_account?.id;
        if (!adAccountId) {
          try {
            const ownerResponse = await axios.get(`${baseUrl}/${pixelId}`, {
              params: {
                access_token: accessToken,
                fields: 'owner_business{id,name}'
              }
            });
            if (ownerResponse.data.owner_business?.id) {
              const bizAccountsResponse = await axios.get(
                `${baseUrl}/${ownerResponse.data.owner_business.id}/owned_ad_accounts`,
                {
                  params: {
                    access_token: accessToken,
                    fields: 'id,name',
                    limit: 1
                  }
                }
              );
              if (bizAccountsResponse.data.data?.length > 0) {
                adAccountId = bizAccountsResponse.data.data[0].id;
              }
            }
          } catch (err) {
            // Ignore, use fallback
          }
        }

        const effectiveAdAccountId = adAccountId || `pixel_${pixelId}`;

        results.started.push({
          pixel_id: pixelId,
          name: pixelInfo.name,
          ad_account_id: effectiveAdAccountId
        });

        // Start pixel data fetch in background
        setImmediate(async () => {
          try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            console.log(`[Intelligence] Starting pixel ${pixelId} data fetch for ${days} days...`);

            const stats = await PixelHealthService.fetchPixelStats(pixelId, accessToken);
            const emq = await PixelHealthService.fetchEventMatchQuality(pixelId, accessToken);

            const now = new Date();
            const snapshotDate = now.toISOString().split('T')[0];

            await intelModels.IntelPixelHealth.upsert({
              user_id: userId,
              ad_account_id: effectiveAdAccountId,
              pixel_id: pixelId,
              pixel_name: pixelInfo.name || `Pixel ${pixelId}`,
              snapshot_date: snapshotDate,
              event_match_quality: emq?.emq || null,
              last_fired_time: pixelInfo.last_fired_time ? new Date(pixelInfo.last_fired_time) : null,
              is_active: !pixelInfo.is_unavailable,
              page_view_count: stats.page_view || 0,
              view_content_count: stats.view_content || 0,
              add_to_cart_count: stats.add_to_cart || 0,
              initiate_checkout_count: stats.initiate_checkout || 0,
              purchase_count: stats.purchase || 0,
              lead_count: stats.lead || 0,
              complete_registration_count: stats.complete_registration || 0,
              has_server_events: stats.has_server_events || false,
              server_event_percentage: stats.server_percentage || 0,
              domain_verified: emq?.domain_verified || false,
              domain_name: emq?.domain || null,
              raw_pixel_data: { pixelInfo, stats, emq }
            });

            // Try historical data
            try {
              const histResponse = await axios.get(`${baseUrl}/${pixelId}/stats`, {
                params: {
                  access_token: accessToken,
                  aggregation: 'day',
                  start_time: Math.floor(startDate.getTime() / 1000),
                  end_time: Math.floor(endDate.getTime() / 1000)
                }
              });

              const dailyStats = histResponse.data.data || [];
              const dateGroups = {};

              dailyStats.forEach(stat => {
                const date = stat.timestamp ? new Date(stat.timestamp * 1000).toISOString().split('T')[0] : null;
                if (!date) return;

                if (!dateGroups[date]) {
                  dateGroups[date] = {
                    page_view: 0, view_content: 0, add_to_cart: 0,
                    initiate_checkout: 0, purchase: 0, lead: 0,
                    complete_registration: 0, total: 0
                  };
                }

                const event = stat.event?.toLowerCase().replace(/ /g, '_');
                const count = parseInt(stat.count || 0);

                if (dateGroups[date][event] !== undefined) {
                  dateGroups[date][event] = count;
                }
                dateGroups[date].total += count;
              });

              for (const [date, dStats] of Object.entries(dateGroups)) {
                const existing = await intelModels.IntelPixelHealth.findOne({
                  where: { pixel_id: pixelId, snapshot_date: date }
                });
                if (existing) continue;

                await intelModels.IntelPixelHealth.create({
                  user_id: userId,
                  ad_account_id: effectiveAdAccountId,
                  pixel_id: pixelId,
                  pixel_name: pixelInfo.name || `Pixel ${pixelId}`,
                  snapshot_date: date,
                  is_active: !pixelInfo.is_unavailable,
                  page_view_count: dStats.page_view,
                  view_content_count: dStats.view_content,
                  add_to_cart_count: dStats.add_to_cart,
                  initiate_checkout_count: dStats.initiate_checkout,
                  purchase_count: dStats.purchase,
                  lead_count: dStats.lead,
                  complete_registration_count: dStats.complete_registration
                });
              }

              console.log(`✅ [Intelligence] Pixel ${pixelId} data fetch complete`);
            } catch (histError) {
              console.log(`[Intelligence] Historical pixel stats not available for ${pixelId}`);
            }
          } catch (error) {
            console.error(`[Intelligence] Pixel ${pixelId} data fetch error:`, error.message);
          }
        });
      } catch (error) {
        const errMsg = error.response?.data?.error?.message || error.message;
        console.error(`[Intelligence] Error fetching pixel ${pixelId}:`, errMsg);
        results.failed.push({
          pixel_id: pixelId,
          error: errMsg
        });
      }
    }

    res.json({
      success: true,
      message: `Started fetch for ${results.started.length} pixels`,
      results
    });
  } catch (error) {
    console.error('[Intelligence] Batch pixel fetch error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/pixel/fetch
 * Fetch data for a specific pixel by ID
 */
router.post('/pixel/fetch', async (req, res) => {
  try {
    const userId = req.user.id;
    const { pixelId, days = 90 } = req.body;

    console.log('[Intelligence] Pixel direct fetch requested for user', userId, 'pixelId:', pixelId);

    if (!pixelId) {
      return res.status(400).json({ success: false, error: 'pixelId required' });
    }

    const mainDb = require('../../models');

    // Get access token
    const fbAuth = await mainDb.FacebookAuth.findOne({
      where: { userId: userId },
      order: [['updated_at', 'DESC']]
    });

    if (!fbAuth || !fbAuth.accessToken) {
      return res.status(400).json({ success: false, error: 'No valid Facebook access token found' });
    }

    const accessToken = fbAuth.accessToken;

    // Fetch pixel info to get associated ad account
    const axios = require('axios');
    const apiVersion = process.env.FB_API_VERSION || 'v18.0';
    const baseUrl = `https://graph.facebook.com/${apiVersion}`;

    let pixelInfo;
    try {
      const pixelResponse = await axios.get(`${baseUrl}/${pixelId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,owner_ad_account,is_unavailable,last_fired_time,creation_time'
        }
      });
      pixelInfo = pixelResponse.data;
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message;
      console.error('[Intelligence] Error fetching pixel info:', errMsg);
      return res.status(400).json({
        success: false,
        error: `Cannot access pixel ${pixelId}: ${errMsg}`
      });
    }

    // Get ad account ID from pixel owner
    let adAccountId = pixelInfo.owner_ad_account?.id;
    if (!adAccountId) {
      // Try to get from owner_business -> ad_accounts
      try {
        const ownerResponse = await axios.get(`${baseUrl}/${pixelId}`, {
          params: {
            access_token: accessToken,
            fields: 'owner_business{id,name}'
          }
        });
        if (ownerResponse.data.owner_business?.id) {
          // Fetch business ad accounts
          const bizAccountsResponse = await axios.get(
            `${baseUrl}/${ownerResponse.data.owner_business.id}/owned_ad_accounts`,
            {
              params: {
                access_token: accessToken,
                fields: 'id,name',
                limit: 1
              }
            }
          );
          if (bizAccountsResponse.data.data?.length > 0) {
            adAccountId = bizAccountsResponse.data.data[0].id;
          }
        }
      } catch (err) {
        console.log('[Intelligence] Could not determine ad account from business, using pixel ID as reference');
      }
    }

    // Use pixel ID as fallback ad account reference if we couldn't get one
    const effectiveAdAccountId = adAccountId || `pixel_${pixelId}`;

    // Start pixel data fetch in background
    setImmediate(async () => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        console.log(`[Intelligence] Starting pixel ${pixelId} data fetch for ${days} days...`);

        // Fetch pixel stats directly
        const stats = await PixelHealthService.fetchPixelStats(pixelId, accessToken);
        const emq = await PixelHealthService.fetchEventMatchQuality(pixelId, accessToken);

        // Store current day's data
        const now = new Date();
        const snapshotDate = now.toISOString().split('T')[0];

        await intelModels.IntelPixelHealth.upsert({
          user_id: userId,
          ad_account_id: effectiveAdAccountId,
          pixel_id: pixelId,
          pixel_name: pixelInfo.name || `Pixel ${pixelId}`,
          snapshot_date: snapshotDate,
          event_match_quality: emq?.emq || null,
          last_fired_time: pixelInfo.last_fired_time ? new Date(pixelInfo.last_fired_time) : null,
          is_active: !pixelInfo.is_unavailable,
          page_view_count: stats.page_view || 0,
          view_content_count: stats.view_content || 0,
          add_to_cart_count: stats.add_to_cart || 0,
          initiate_checkout_count: stats.initiate_checkout || 0,
          purchase_count: stats.purchase || 0,
          lead_count: stats.lead || 0,
          complete_registration_count: stats.complete_registration || 0,
          has_server_events: stats.has_server_events || false,
          server_event_percentage: stats.server_percentage || 0,
          domain_verified: emq?.domain_verified || false,
          domain_name: emq?.domain || null,
          raw_pixel_data: { pixelInfo, stats, emq }
        });

        // Also try to fetch historical data
        try {
          const histResponse = await axios.get(`${baseUrl}/${pixelId}/stats`, {
            params: {
              access_token: accessToken,
              aggregation: 'day',
              start_time: Math.floor(startDate.getTime() / 1000),
              end_time: Math.floor(endDate.getTime() / 1000)
            }
          });

          const dailyStats = histResponse.data.data || [];
          const dateGroups = {};

          dailyStats.forEach(stat => {
            const date = stat.timestamp ? new Date(stat.timestamp * 1000).toISOString().split('T')[0] : null;
            if (!date) return;

            if (!dateGroups[date]) {
              dateGroups[date] = {
                page_view: 0, view_content: 0, add_to_cart: 0,
                initiate_checkout: 0, purchase: 0, lead: 0,
                complete_registration: 0, total: 0
              };
            }

            const event = stat.event?.toLowerCase().replace(/ /g, '_');
            const count = parseInt(stat.count || 0);

            if (dateGroups[date][event] !== undefined) {
              dateGroups[date][event] = count;
            }
            dateGroups[date].total += count;
          });

          for (const [date, dStats] of Object.entries(dateGroups)) {
            const existing = await intelModels.IntelPixelHealth.findOne({
              where: { pixel_id: pixelId, snapshot_date: date }
            });
            if (existing) continue;

            await intelModels.IntelPixelHealth.create({
              user_id: userId,
              ad_account_id: effectiveAdAccountId,
              pixel_id: pixelId,
              pixel_name: pixelInfo.name || `Pixel ${pixelId}`,
              snapshot_date: date,
              is_active: !pixelInfo.is_unavailable,
              page_view_count: dStats.page_view,
              view_content_count: dStats.view_content,
              add_to_cart_count: dStats.add_to_cart,
              initiate_checkout_count: dStats.initiate_checkout,
              purchase_count: dStats.purchase,
              lead_count: dStats.lead,
              complete_registration_count: dStats.complete_registration
            });
          }

          console.log(`✅ [Intelligence] Pixel ${pixelId} data fetch complete (${Object.keys(dateGroups).length} days)`);
        } catch (histError) {
          console.log(`[Intelligence] Historical pixel stats not available for ${pixelId}:`, histError.message);
        }
      } catch (error) {
        console.error(`[Intelligence] Pixel ${pixelId} data fetch error:`, error.message);
      }
    });

    res.json({
      success: true,
      message: 'Pixel data fetch started',
      pixel: {
        id: pixelId,
        name: pixelInfo.name,
        is_active: !pixelInfo.is_unavailable,
        ad_account_id: effectiveAdAccountId
      }
    });
  } catch (error) {
    console.error('[Intelligence] Pixel fetch error for user', req.user?.id, 'pixelId:', req.body?.pixelId, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Training Analytics Endpoints
// ============================================

/**
 * GET /api/intelligence/training/status
 * Get overall training status and progress
 */
router.get('/training/status', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get pattern counts and history
    const patterns = await intelModels.IntelLearnedPattern.findAll({
      where: { is_active: true },
      attributes: ['pattern_type', 'confidence_score', 'sample_size', 'created_at', 'last_validated']
    });

    // Get snapshot counts
    const snapshotCounts = await intelModels.IntelPerformanceSnapshot.count({
      where: { user_id: userId }
    });

    // Get expert rules count
    const expertRuleCount = await intelModels.IntelExpertRule.count({
      where: { is_active: true }
    });

    // Get backfill status
    const backfillStatus = await intelModels.IntelBackfillProgress.getUserStatus(userId);

    // Calculate training readiness
    const minSnapshots = 100;
    const dataReadiness = Math.min(100, Math.round((snapshotCounts / minSnapshots) * 100));

    // Return both 'status' (for frontend compatibility) and 'training' (legacy)
    const statusData = {
      data_points: snapshotCounts,
      data_readiness: dataReadiness,
      min_required: minSnapshots,
      patterns_learned: patterns.length,
      expert_rules: expertRuleCount,
      expert_rules_loaded: expertRuleCount, // Alias for compatibility
      pattern_breakdown: patterns.reduce((acc, p) => {
        acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1;
        return acc;
      }, {}),
      average_confidence: patterns.length > 0
        ? (patterns.reduce((sum, p) => sum + p.confidence_score, 0) / patterns.length * 100).toFixed(1)
        : 0,
      backfill: backfillStatus.summary,
      // Required by TrainingStatus type
      pixel_data_points: 0,
      readiness: {
        data: dataReadiness,
        patterns: patterns.length > 0 ? 100 : 0,
        expert: expertRuleCount > 0 ? 100 : 0,
        overall: Math.round((dataReadiness * 0.4) + (patterns.length > 0 ? 30 : 0) + (expertRuleCount > 0 ? 30 : 0))
      },
      status: dataReadiness >= 100 && patterns.length > 0 ? 'ready' : dataReadiness >= 50 ? 'learning' : 'collecting',
      last_learning_run: null
    };

    res.json({
      success: true,
      status: statusData, // For frontend TrainingAnalyticsPanel
      training: statusData // Legacy support
    });
  } catch (error) {
    console.error('[Intelligence] Training status error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/training/history
 * Get learning history over time
 */
router.get('/training/history', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get snapshot counts by date
    const snapshots = await intelModels.IntelPerformanceSnapshot.findAll({
      attributes: [
        [intelModels.sequelize.fn('DATE', intelModels.sequelize.col('snapshot_date')), 'date'],
        [intelModels.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: {
        snapshot_date: {
          [intelModels.Sequelize.Op.gte]: startDate.toISOString().split('T')[0]
        }
      },
      group: [intelModels.sequelize.fn('DATE', intelModels.sequelize.col('snapshot_date'))],
      order: [[intelModels.sequelize.fn('DATE', intelModels.sequelize.col('snapshot_date')), 'ASC']],
      raw: true
    });

    // Calculate cumulative data points
    let cumulative = 0;
    const history = snapshots.map(s => {
      cumulative += parseInt(s.count);
      return {
        date: s.date,
        daily_points: parseInt(s.count),
        total_points: cumulative
      };
    });

    res.json({ success: true, history });
  } catch (error) {
    console.error('[Intelligence] Training history error for days:', req.query?.days, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/training/clusters
 * Get cluster data for visualization
 */
router.get('/training/clusters', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get cluster pattern
    const clusterPattern = await intelModels.IntelLearnedPattern.findOne({
      where: {
        pattern_type: 'cluster',
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    if (!clusterPattern) {
      return res.json({
        success: true,
        clusters: null,
        message: 'No cluster data available yet'
      });
    }

    res.json({
      success: true,
      clusters: clusterPattern.pattern_data
    });
  } catch (error) {
    console.error('[Intelligence] Training clusters error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/training/learn
 * Manually trigger pattern learning (available to all users after backfill)
 */
router.post('/training/learn', async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has enough data
    const snapshotCount = await intelModels.IntelPerformanceSnapshot.count({
      where: { user_id: userId }
    });

    if (snapshotCount < 50) {
      return res.status(400).json({
        success: false,
        error: `Insufficient data for pattern learning. Have ${snapshotCount} snapshots, need at least 50.`
      });
    }

    console.log(`[Intelligence] Manual pattern learning triggered by user ${userId} (${snapshotCount} data points)`);

    // Run learning in background
    setImmediate(async () => {
      try {
        console.log('🧠 [PatternLearning] Starting manual pattern learning...');
        const results = await PatternLearningService.learnAllPatterns();
        console.log('✅ [PatternLearning] Manual learning complete:', results);

        // Also calculate account scores
        console.log('📊 [AccountScore] Calculating scores after learning...');
        await AccountScoreService.calculateAllScores();
        console.log('✅ [AccountScore] Score calculation complete');
      } catch (error) {
        console.error('❌ [PatternLearning] Manual learning error:', error.message, error.stack);
      }
    });

    res.json({
      success: true,
      message: 'Pattern learning started in background',
      data_points: snapshotCount
    });
  } catch (error) {
    console.error('[Intelligence] Manual learning trigger error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/intelligence/training/calculate-scores
 * Manually trigger account score calculation
 */
router.post('/training/calculate-scores', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`[Intelligence] Manual score calculation triggered by user ${userId}`);

    // Run in background
    setImmediate(async () => {
      try {
        console.log('📊 [AccountScore] Starting manual score calculation...');
        const results = await AccountScoreService.calculateAllScores();
        console.log('✅ [AccountScore] Manual calculation complete:', results);
      } catch (error) {
        console.error('❌ [AccountScore] Manual calculation error:', error.message, error.stack);
      }
    });

    res.json({
      success: true,
      message: 'Score calculation started in background'
    });
  } catch (error) {
    console.error('[Intelligence] Manual score calculation error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
