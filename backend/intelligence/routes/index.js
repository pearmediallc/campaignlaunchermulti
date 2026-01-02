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
 * POST /api/intelligence/backfill/resume-all
 * Resume all incomplete backfills from where they left off
 */
router.post('/backfill/resume-all', async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('[Intelligence] Resume all incomplete backfills requested for user', userId);

    // Find all incomplete backfills for this user
    const incompleteBackfills = await intelModels.IntelBackfillProgress.findAll({
      where: {
        user_id: userId,
        status: 'in_progress'
      }
    });

    if (incompleteBackfills.length === 0) {
      return res.json({
        success: true,
        message: 'No incomplete backfills to resume',
        results: { resumed: 0, accounts: [] }
      });
    }

    console.log(`[Intelligence] Found ${incompleteBackfills.length} incomplete backfills to resume`);

    const results = {
      resumed: 0,
      accounts: []
    };

    // Resume each incomplete backfill
    for (const record of incompleteBackfills) {
      const adAccountId = record.ad_account_id;
      const daysCompleted = record.days_completed || 0;
      const totalDays = record.total_days || 90;
      const type = record.backfill_type || 'all';

      // Calculate date range from the original backfill
      const endDate = record.end_date ? new Date(record.end_date) : new Date();
      const startDate = record.start_date ? new Date(record.start_date) : new Date(endDate - totalDays * 24 * 60 * 60 * 1000);

      results.resumed++;
      results.accounts.push({
        ad_account_id: adAccountId,
        days_completed: daysCompleted,
        total_days: totalDays,
        resuming_from_day: daysCompleted
      });

      // Resume backfill in background
      setImmediate(async () => {
        try {
          console.log(`🔄 [Backfill] Resuming ${adAccountId} from day ${daysCompleted}/${totalDays}`);

          await record.update({ status: 'in_progress', started_at: new Date() });

          if (type === 'all' || type === 'insights') {
            await InsightsCollectorService.backfillAccount(userId, adAccountId, {
              startDate,
              endDate,
              startFromDay: daysCompleted, // Resume from where we left off
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
            days_completed: totalDays
          });

          console.log(`✅ [Backfill] Account ${adAccountId} completed (resumed)`);

          // Auto-trigger pattern learning after completion
          try {
            console.log('🧠 [Intelligence] Auto-triggering pattern learning after resumed backfill...');
            await PatternLearningService.learnAllPatterns();
            await AccountScoreService.calculateAllScores();
          } catch (learningError) {
            console.error('⚠️ [Intelligence] Auto-learning after resume failed:', learningError.message);
          }
        } catch (error) {
          console.error(`[Intelligence] Resume backfill error for account ${adAccountId}:`, error.message);
          await record.markFailed(error.message);
        }
      });
    }

    res.json({
      success: true,
      message: `Resuming ${results.resumed} incomplete backfills`,
      results
    });
  } catch (error) {
    console.error('[Intelligence] Resume all backfills error for user', req.user?.id, ':', error.message, error.stack);
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
      } catch (error) {
        results.errors.push({ ad_account_id: adAccountId, error: error.message });
      }
    }

    // Process backfills SEQUENTIALLY in background (one at a time to avoid OOM)
    // This prevents memory exhaustion from running 100+ backfills simultaneously
    if (results.started.length > 0) {
      console.log(`[Intelligence] Starting sequential backfill for ${results.started.length} accounts (one at a time to prevent memory issues)`);

      // Start the sequential processing in background
      setImmediate(async () => {
        for (const adAccountId of results.started) {
          try {
            const record = await intelModels.IntelBackfillProgress.findOne({
              where: { user_id: userId, ad_account_id: adAccountId }
            });

            if (!record || record.status === 'completed') continue;

            console.log(`📊 [Backfill] Starting account ${adAccountId} (${results.started.indexOf(adAccountId) + 1}/${results.started.length})`);
            await record.update({ status: 'in_progress', started_at: new Date() });

            if (type === 'all' || type === 'insights') {
              await InsightsCollectorService.backfillAccount(userId, adAccountId, {
                startDate,
                endDate,
                progressCallback: async (day, current) => {
                  await record.updateProgress(day, current);
                  // Force garbage collection every 10 days if available
                  if (global.gc && day % 10 === 0) {
                    global.gc();
                  }
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

            // Small delay between accounts to let memory settle
            await new Promise(resolve => setTimeout(resolve, 5000));
          } catch (error) {
            console.error(`[Intelligence] Backfill error for account ${adAccountId}:`, error.message);
            const record = await intelModels.IntelBackfillProgress.findOne({
              where: { user_id: userId, ad_account_id: adAccountId }
            });
            if (record) await record.markFailed(error.message);
          }
        }

        // Trigger pattern learning after ALL accounts complete
        try {
          console.log('🧠 [Intelligence] Auto-triggering pattern learning after batch backfill...');
          await PatternLearningService.learnAllPatterns();
          await AccountScoreService.calculateAllScores();
        } catch (learningError) {
          console.error('⚠️ [Intelligence] Auto-learning after batch failed:', learningError.message);
        }
      });
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
// Top Performers & Analytics Endpoints
// ============================================

/**
 * GET /api/intelligence/top-performers
 * Get best performing campaigns, ad sets, and ads
 * OPTIMIZED: Uses raw SQL for better performance on large datasets
 */
router.get('/top-performers', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      metric = 'roas',        // roas, cpa, ctr, conversions
      min_spend = 10,         // Minimum spend to be considered
      limit = 20,             // Number of results
      entity_type = 'all',    // all, campaign, adset, ad
      days = 30               // Time period
    } = req.query;

    console.log('[Intelligence] Top performers requested for user', userId, 'metric:', metric);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Build entity type filter
    const entityTypes = entity_type === 'all'
      ? ['campaign', 'adset', 'ad']
      : [entity_type];

    // Build order by clause based on metric
    const orderByClause = metric === 'roas' ? 'SUM(revenue) / NULLIF(SUM(spend), 0) DESC' :
      metric === 'cpa' ? 'SUM(spend) / NULLIF(SUM(conversions), 0) ASC' :
      metric === 'ctr' ? 'AVG(ctr) DESC' :
      metric === 'conversions' ? 'SUM(conversions) DESC' :
      'SUM(revenue) / NULLIF(SUM(spend), 0) DESC';

    // Use raw SQL for better performance - avoids Sequelize overhead
    const [performers] = await intelModels.sequelize.query(`
      SELECT
        ad_account_id,
        entity_type,
        entity_id,
        entity_name,
        SUM(spend) as total_spend,
        SUM(revenue) as total_revenue,
        SUM(conversions) as total_conversions,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        AVG(ctr) as avg_ctr,
        AVG(cpc) as avg_cpc,
        AVG(cpm) as avg_cpm,
        COUNT(id) as data_points
      FROM intel_performance_snapshots
      WHERE user_id = :userId
        AND entity_type IN (:entityTypes)
        AND snapshot_date >= :startDate
        AND spend > 0
      GROUP BY ad_account_id, entity_type, entity_id, entity_name
      HAVING SUM(spend) >= :minSpend
      ORDER BY ${orderByClause}
      LIMIT :limit
    `, {
      replacements: {
        userId,
        entityTypes,
        startDate: startDateStr,
        minSpend: parseFloat(min_spend),
        limit: parseInt(limit)
      },
      type: intelModels.sequelize.QueryTypes.SELECT
    });

    // Calculate derived metrics for each performer
    const results = performers.map(p => {
      const spend = parseFloat(p.total_spend) || 0;
      const revenue = parseFloat(p.total_revenue) || 0;
      const conversions = parseInt(p.total_conversions) || 0;
      const impressions = parseInt(p.total_impressions) || 0;
      const clicks = parseInt(p.total_clicks) || 0;

      return {
        ad_account_id: p.ad_account_id,
        entity_type: p.entity_type,
        entity_id: p.entity_id,
        entity_name: p.entity_name,
        metrics: {
          spend: spend.toFixed(2),
          revenue: revenue.toFixed(2),
          conversions,
          impressions,
          clicks,
          roas: spend > 0 ? (revenue / spend).toFixed(2) : '0.00',
          cpa: conversions > 0 ? (spend / conversions).toFixed(2) : 'N/A',
          ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
          cpc: clicks > 0 ? (spend / clicks).toFixed(2) : 'N/A'
        },
        data_points: parseInt(p.data_points)
      };
    });

    // Get unique campaigns for the top performers
    const topCampaigns = results.filter(r => r.entity_type === 'campaign');
    const topAdSets = results.filter(r => r.entity_type === 'adset');
    const topAds = results.filter(r => r.entity_type === 'ad');

    res.json({
      success: true,
      metric_used: metric,
      time_period_days: parseInt(days),
      min_spend: parseFloat(min_spend),
      summary: {
        total_performers: results.length,
        campaigns: topCampaigns.length,
        ad_sets: topAdSets.length,
        ads: topAds.length
      },
      top_campaigns: topCampaigns.slice(0, 10),
      top_ad_sets: topAdSets.slice(0, 10),
      top_ads: topAds.slice(0, 10),
      all_performers: results
    });
  } catch (error) {
    console.error('[Intelligence] Top performers error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/campaigns-list
 * Get list of all campaigns with their ad accounts for creative analysis
 */
router.get('/campaigns-list', async (req, res) => {
  try {
    const userId = req.user.id;
    const { min_spend = 0, days = 90 } = req.query;

    console.log('[Intelligence] Campaigns list requested for user', userId);

    const { Op, fn, col, literal } = intelModels.Sequelize;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all campaigns with aggregated metrics
    const campaigns = await intelModels.IntelPerformanceSnapshot.findAll({
      attributes: [
        'ad_account_id',
        'entity_id',
        'entity_name',
        [fn('SUM', col('spend')), 'total_spend'],
        [fn('SUM', col('revenue')), 'total_revenue'],
        [fn('SUM', col('conversions')), 'total_conversions'],
        [fn('MIN', col('snapshot_date')), 'first_seen'],
        [fn('MAX', col('snapshot_date')), 'last_seen'],
        [fn('COUNT', col('id')), 'data_points']
      ],
      where: {
        user_id: userId,
        entity_type: 'campaign',
        snapshot_date: { [Op.gte]: startDate }
      },
      group: ['ad_account_id', 'entity_id', 'entity_name'],
      having: literal(`SUM(spend) >= ${parseFloat(min_spend)}`),
      order: [[literal('SUM(spend)'), 'DESC']],
      raw: true
    });

    // Get ads for each campaign (to show creatives)
    const campaignIds = campaigns.map(c => c.entity_id);

    const ads = await intelModels.IntelPerformanceSnapshot.findAll({
      attributes: [
        'ad_account_id',
        'entity_id',
        'entity_name',
        [fn('SUM', col('spend')), 'total_spend'],
        [fn('SUM', col('revenue')), 'total_revenue'],
        [fn('SUM', col('conversions')), 'total_conversions'],
        [col('raw_data'), 'raw_data']
      ],
      where: {
        user_id: userId,
        entity_type: 'ad',
        snapshot_date: { [Op.gte]: startDate }
      },
      group: ['ad_account_id', 'entity_id', 'entity_name', 'raw_data'],
      order: [[literal('SUM(spend)'), 'DESC']],
      limit: 500,
      raw: true
    });

    // Map ads to their campaigns
    const adsByCampaign = {};
    ads.forEach(ad => {
      const rawData = typeof ad.raw_data === 'string' ? JSON.parse(ad.raw_data) : ad.raw_data;
      const campaignId = rawData?.campaign_id;
      if (campaignId) {
        if (!adsByCampaign[campaignId]) {
          adsByCampaign[campaignId] = [];
        }
        adsByCampaign[campaignId].push({
          ad_id: ad.entity_id,
          ad_name: ad.entity_name,
          spend: parseFloat(ad.total_spend) || 0,
          revenue: parseFloat(ad.total_revenue) || 0,
          conversions: parseInt(ad.total_conversions) || 0,
          roas: parseFloat(ad.total_spend) > 0
            ? (parseFloat(ad.total_revenue) / parseFloat(ad.total_spend)).toFixed(2)
            : '0.00'
        });
      }
    });

    // Format campaigns with their ads
    const formattedCampaigns = campaigns.map(c => {
      const spend = parseFloat(c.total_spend) || 0;
      const revenue = parseFloat(c.total_revenue) || 0;
      const conversions = parseInt(c.total_conversions) || 0;

      return {
        ad_account_id: c.ad_account_id,
        campaign_id: c.entity_id,
        campaign_name: c.entity_name,
        metrics: {
          spend: spend.toFixed(2),
          revenue: revenue.toFixed(2),
          conversions,
          roas: spend > 0 ? (revenue / spend).toFixed(2) : '0.00',
          cpa: conversions > 0 ? (spend / conversions).toFixed(2) : 'N/A'
        },
        date_range: {
          first_seen: c.first_seen,
          last_seen: c.last_seen
        },
        ads: adsByCampaign[c.entity_id] || [],
        ad_count: (adsByCampaign[c.entity_id] || []).length
      };
    });

    res.json({
      success: true,
      total_campaigns: formattedCampaigns.length,
      time_period_days: parseInt(days),
      campaigns: formattedCampaigns
    });
  } catch (error) {
    console.error('[Intelligence] Campaigns list error for user', req.user?.id, ':', error.message, error.stack);
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
 * OPTIMIZED: Uses raw SQL for maximum performance on large tables
 */
router.get('/training/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const startTime = Date.now();
    console.log(`[Training Status] Fetching for user ${userId}...`);

    // Run ALL queries in parallel using raw SQL for speed
    const results = await Promise.allSettled([
      // 1. Snapshot count - FAST raw SQL count
      intelModels.sequelize.query(
        `SELECT COUNT(*) as count FROM intel_performance_snapshots WHERE user_id = :userId`,
        { replacements: { userId }, type: intelModels.sequelize.QueryTypes.SELECT }
      ),

      // 2. Pattern data - small table, ORM is fine
      intelModels.IntelLearnedPattern.findAll({
        where: { is_active: true },
        attributes: ['pattern_type', 'confidence_score'],
        raw: true,
        limit: 100
      }),

      // 3. Expert rules count - small table
      intelModels.sequelize.query(
        `SELECT COUNT(*) as count FROM intel_expert_rules WHERE is_active = true`,
        { type: intelModels.sequelize.QueryTypes.SELECT }
      ),

      // 4. Backfill summary - raw SQL aggregation
      intelModels.sequelize.query(`
        SELECT status, COUNT(*) as count,
               COALESCE(SUM(total_days), 0) as total_days,
               COALESCE(SUM(days_completed), 0) as days_completed
        FROM intel_backfill_progress
        WHERE user_id = :userId
        GROUP BY status
      `, { replacements: { userId }, type: intelModels.sequelize.QueryTypes.SELECT })
    ]);

    // Extract results with defaults for failed queries
    const snapshotCount = results[0].status === 'fulfilled' ? parseInt(results[0].value[0]?.count || 0) : 0;
    const patterns = results[1].status === 'fulfilled' ? results[1].value : [];
    const expertRuleCount = results[2].status === 'fulfilled' ? parseInt(results[2].value[0]?.count || 0) : 0;
    const backfillSummary = results[3].status === 'fulfilled' ? results[3].value : [];

    // Log any query failures
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Training Status] Query ${i} failed:`, r.reason?.message);
      }
    });

    // Calculate backfill stats
    const backfillStats = {
      total_accounts: 0, completed: 0, in_progress: 0, pending: 0, failed: 0,
      overall_progress: 0, total_days: 0, days_completed: 0
    };

    backfillSummary.forEach(row => {
      const count = parseInt(row.count) || 0;
      backfillStats.total_accounts += count;
      backfillStats.total_days += parseInt(row.total_days) || 0;
      backfillStats.days_completed += parseInt(row.days_completed) || 0;
      if (row.status === 'completed') backfillStats.completed = count;
      else if (row.status === 'in_progress') backfillStats.in_progress = count;
      else if (row.status === 'pending') backfillStats.pending = count;
      else if (row.status === 'failed') backfillStats.failed = count;
    });

    backfillStats.overall_progress = backfillStats.total_days > 0
      ? Math.round((backfillStats.days_completed / backfillStats.total_days) * 100) : 0;

    // Calculate training readiness
    const minSnapshots = 100;
    const dataReadiness = Math.min(100, Math.round((snapshotCount / minSnapshots) * 100));

    const statusData = {
      data_points: snapshotCount,
      data_readiness: dataReadiness,
      min_required: minSnapshots,
      patterns_learned: patterns.length,
      expert_rules: expertRuleCount,
      expert_rules_loaded: expertRuleCount,
      pattern_breakdown: patterns.reduce((acc, p) => {
        acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1;
        return acc;
      }, {}),
      average_confidence: patterns.length > 0
        ? (patterns.reduce((sum, p) => sum + parseFloat(p.confidence_score || 0), 0) / patterns.length * 100).toFixed(1)
        : 0,
      backfill: backfillStats,
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

    console.log(`[Training Status] Completed in ${Date.now() - startTime}ms`);
    res.json({ success: true, status: statusData, training: statusData });
  } catch (error) {
    console.error('[Intelligence] Training status error for user', req.user?.id, ':', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/intelligence/training/history
 * Get learning history over time
 * OPTIMIZED: Uses raw SQL with date range limit
 */
router.get('/training/history', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user?.id;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.min(parseInt(days), 30)); // Max 30 days
    const startTime = Date.now();

    console.log(`[Training History] Fetching ${days} days for user ${userId}...`);

    // Use raw SQL for maximum performance
    const snapshots = await intelModels.sequelize.query(`
      SELECT snapshot_date, COUNT(*) as count
      FROM intel_performance_snapshots
      WHERE user_id = :userId
        AND snapshot_date >= :startDate
      GROUP BY snapshot_date
      ORDER BY snapshot_date ASC
      LIMIT 31
    `, {
      replacements: {
        userId,
        startDate: startDate.toISOString().split('T')[0]
      },
      type: intelModels.sequelize.QueryTypes.SELECT
    });

    // Calculate cumulative data points
    let cumulative = 0;
    const history = snapshots.map(s => {
      cumulative += parseInt(s.count);
      return {
        date: s.snapshot_date,
        daily_points: parseInt(s.count),
        total_points: cumulative
      };
    });

    console.log(`[Training History] Completed in ${Date.now() - startTime}ms, ${history.length} days`);
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

    // Check if user has enough data - use raw SQL for speed
    const countResult = await intelModels.sequelize.query(
      `SELECT COUNT(*) as count FROM intel_performance_snapshots WHERE user_id = :userId`,
      { replacements: { userId }, type: intelModels.sequelize.QueryTypes.SELECT }
    );
    const snapshotCount = parseInt(countResult[0]?.count || 0);

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

// ============================================
// Transparency Dashboard Endpoint
// ============================================

/**
 * GET /api/intelligence/transparency
 * OPTIMIZED: Returns summary counts and limited sample data
 * Use ?detailed=true for more data (with pagination)
 */
router.get('/transparency', async (req, res) => {
  try {
    const userId = req.user.id;
    const { fn, col } = intelModels.Sequelize;
    const detailed = req.query.detailed === 'true';
    const limit = detailed ? 50 : 10; // Limit sample data

    console.log(`[Transparency] Fetching for user ${userId}, detailed=${detailed}`);
    const startTime = Date.now();

    // Use raw SQL for counts - much faster than ORM aggregations
    const results = await Promise.allSettled([
      // 1. Get data source COUNTS only (fast)
      intelModels.sequelize.query(`
        SELECT
          COUNT(DISTINCT ad_account_id) as accounts_with_data,
          COUNT(*) as total_data_points,
          COUNT(DISTINCT entity_id) as total_entities,
          COALESCE(SUM(spend), 0) as total_spend,
          COALESCE(SUM(revenue), 0) as total_revenue
        FROM intel_performance_snapshots
        WHERE user_id = :userId
      `, {
        replacements: { userId },
        type: intelModels.sequelize.QueryTypes.SELECT
      }),

      // 2. Get top accounts by data points (limited)
      intelModels.sequelize.query(`
        SELECT
          ad_account_id,
          COUNT(*) as data_points,
          COUNT(DISTINCT entity_id) as unique_entities,
          MIN(snapshot_date) as earliest_date,
          MAX(snapshot_date) as latest_date,
          COALESCE(SUM(spend), 0) as total_spend,
          COALESCE(SUM(revenue), 0) as total_revenue
        FROM intel_performance_snapshots
        WHERE user_id = :userId
        GROUP BY ad_account_id
        ORDER BY COUNT(*) DESC
        LIMIT :limit
      `, {
        replacements: { userId, limit },
        type: intelModels.sequelize.QueryTypes.SELECT
      }),

      // 3. Get backfill COUNTS by status (fast)
      intelModels.sequelize.query(`
        SELECT
          status,
          COUNT(*) as count
        FROM intel_backfill_progress
        WHERE user_id = :userId
        GROUP BY status
      `, {
        replacements: { userId },
        type: intelModels.sequelize.QueryTypes.SELECT
      }),

      // 4. Get pattern counts and limited samples
      intelModels.IntelLearnedPattern.findAll({
        attributes: ['id', 'pattern_type', 'pattern_name', 'description', 'sample_size', 'confidence_score', 'created_at', 'valid_until'],
        where: { is_active: true },
        order: [['created_at', 'DESC']],
        raw: true,
        limit: 20
      }),

      // 5. Get pixel health count
      intelModels.sequelize.query(`
        SELECT COUNT(DISTINCT pixel_id) as unique_pixels
        FROM intel_pixel_health
        WHERE user_id = :userId
      `, {
        replacements: { userId },
        type: intelModels.sequelize.QueryTypes.SELECT
      }),

      // 6. Get account score count
      intelModels.sequelize.query(`
        SELECT COUNT(DISTINCT ad_account_id) as scored_accounts
        FROM intel_account_scores
        WHERE user_id = :userId
      `, {
        replacements: { userId },
        type: intelModels.sequelize.QueryTypes.SELECT
      }),

      // 7. Get expert rules count by type
      intelModels.IntelExpertRule.findAll({
        attributes: [
          'rule_type',
          'vertical',
          [fn('COUNT', col('id')), 'count']
        ],
        where: { is_active: true },
        group: ['rule_type', 'vertical'],
        raw: true
      })
    ]);

    console.log(`[Transparency] Queries completed in ${Date.now() - startTime}ms`);

    // Extract results, handling failures gracefully
    const [
      dataCountsResult,
      topAccountsResult,
      backfillCountsResult,
      patternsResult,
      pixelCountResult,
      scoreCountResult,
      expertRulesResult
    ] = results;

    // Parse results with defaults
    const dataCounts = dataCountsResult.status === 'fulfilled' && dataCountsResult.value[0]
      ? dataCountsResult.value[0]
      : { accounts_with_data: 0, total_data_points: 0, total_entities: 0, total_spend: 0, total_revenue: 0 };

    const topAccounts = topAccountsResult.status === 'fulfilled' ? topAccountsResult.value : [];
    const backfillCounts = backfillCountsResult.status === 'fulfilled' ? backfillCountsResult.value : [];
    const patterns = patternsResult.status === 'fulfilled' ? patternsResult.value : [];
    const pixelCount = pixelCountResult.status === 'fulfilled' && pixelCountResult.value[0]
      ? parseInt(pixelCountResult.value[0].unique_pixels) : 0;
    const scoreCount = scoreCountResult.status === 'fulfilled' && scoreCountResult.value[0]
      ? parseInt(scoreCountResult.value[0].scored_accounts) : 0;
    const expertRules = expertRulesResult.status === 'fulfilled' ? expertRulesResult.value : [];

    // Parse numeric values
    const totalDataPoints = parseInt(dataCounts.total_data_points) || 0;
    const totalEntities = parseInt(dataCounts.total_entities) || 0;
    const accountsWithData = parseInt(dataCounts.accounts_with_data) || 0;

    // Build backfill summary from counts
    const backfillSummary = {
      total: 0,
      completed: 0,
      in_progress: 0,
      failed: 0,
      pending: 0
    };
    backfillCounts.forEach(b => {
      const count = parseInt(b.count) || 0;
      backfillSummary.total += count;
      if (b.status === 'completed') backfillSummary.completed = count;
      else if (b.status === 'in_progress') backfillSummary.in_progress = count;
      else if (b.status === 'failed') backfillSummary.failed = count;
      else if (b.status === 'pending') backfillSummary.pending = count;
    });

    // Pattern analysis - simplified without heavy pattern_data parsing
    const patternDetails = patterns.map(p => ({
      id: p.id,
      type: p.pattern_type,
      name: p.pattern_name,
      description: p.description,
      sample_size: p.sample_size,
      confidence: ((p.confidence_score || 0) * 100).toFixed(0) + '%',
      created_at: p.created_at,
      valid_until: p.valid_until,
      data_source: p.pattern_type?.startsWith('expert_') ? 'Expert Rules (Static)' : 'Learned from Performance Data',
      is_expert_rule: p.pattern_type?.startsWith('expert_') || false
    }));

    // Expert rules summary
    const expertRulesSummary = expertRules.reduce((acc, r) => {
      const key = `${r.rule_type}-${r.vertical}`;
      acc[key] = parseInt(r.count);
      return acc;
    }, {});

    const response = {
      success: true,
      query_time_ms: Date.now() - startTime,
      transparency: {
        data_sources: {
          total_data_points: totalDataPoints,
          total_entities: totalEntities,
          accounts_with_data: accountsWithData,
          total_spend: parseFloat(dataCounts.total_spend || 0).toFixed(2),
          total_revenue: parseFloat(dataCounts.total_revenue || 0).toFixed(2),
          accounts: topAccounts.map(ds => ({
            ad_account_id: ds.ad_account_id,
            data_points: parseInt(ds.data_points) || 0,
            unique_entities: parseInt(ds.unique_entities) || 0,
            date_range: {
              from: ds.earliest_date,
              to: ds.latest_date
            },
            total_spend: parseFloat(ds.total_spend || 0).toFixed(2),
            total_revenue: parseFloat(ds.total_revenue || 0).toFixed(2)
          }))
        },
        backfill: {
          summary: backfillSummary,
          accounts: [] // Removed to reduce payload - available via /backfill/status endpoint
        },
        patterns: {
          total: patterns.length,
          learned_from_data: patternDetails.filter(p => !p.is_expert_rule).length,
          from_expert_rules: patternDetails.filter(p => p.is_expert_rule).length,
          details: patternDetails
        },
        account_scores: {
          total_scored: scoreCount,
          accounts: [] // Removed to reduce payload - available via /scores endpoint
        },
        pixel_health: {
          total_unique_pixels: pixelCount,
          pixels: [] // Removed to reduce payload - available via /pixels endpoint
        },
        expert_rules: {
          summary: expertRulesSummary,
          total: expertRules.reduce((sum, r) => sum + parseInt(r.count), 0)
        },
        training_readiness: {
          data_status: totalDataPoints >= 1000 ? 'ready' : totalDataPoints >= 100 ? 'learning' : 'collecting',
          min_data_for_patterns: 100,
          current_data: totalDataPoints,
          patterns_active: patterns.length,
          accounts_scored: scoreCount,
          backfill_completion: backfillSummary.total > 0
            ? Math.round((backfillSummary.completed / backfillSummary.total) * 100)
            : 0
        }
      }
    };

    console.log(`[Transparency] Response ready, total time: ${Date.now() - startTime}ms`);
    res.json(response);
  } catch (error) {
    console.error('[Intelligence] Transparency dashboard error:', error.message, error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Helper to extract key metrics from pattern data
 */
function extractKeyMetrics(patternType, data) {
  if (!data) return {};

  switch (patternType) {
    case 'time_performance':
      return {
        best_hours: data.bestHours || [],
        worst_hours: data.worstHours || [],
        overall_avg_roas: data.overallAvg?.toFixed(2)
      };
    case 'cluster':
      return {
        k: data.k,
        cluster_sizes: data.cluster_sizes,
        features: data.feature_names
      };
    case 'winner_profile':
    case 'loser_profile':
      return {
        profile_metrics: Object.keys(data.profile || {})
      };
    case 'audience_fatigue':
      return {
        fatigue_threshold: data.fatigueThreshold?.toFixed(2),
        ctr_decline_rate: data.frequencyDecay?.toFixed(4)
      };
    case 'expert_kill_threshold':
    case 'expert_scale_threshold':
      return {
        vertical: data.vertical,
        rules_count: data.rules?.length
      };
    default:
      return {};
  }
}

module.exports = router;
