'use strict';

/**
 * AutomationRulesEngine
 *
 * Evaluates automation rules against performance data and
 * creates action records for matching rules.
 *
 * ISOLATION PRINCIPLE:
 * - NEVER directly modifies campaigns/ad sets/ads
 * - Only creates IntelAutomationAction records
 * - Actions require user approval before execution
 * - Completely separate from campaign management code
 */

const intelModels = require('../models');
const InsightsCollectorService = require('./InsightsCollectorService');

class AutomationRulesEngine {
  constructor() {
    this.evaluationInProgress = false;
  }

  /**
   * Evaluate all active rules for all users
   */
  async evaluateAllRules() {
    if (this.evaluationInProgress) {
      console.log('⏳ Rule evaluation already in progress, skipping...');
      return;
    }

    this.evaluationInProgress = true;
    console.log('⚡ [RulesEngine] Starting rule evaluation...');

    try {
      const mainDb = require('../../models');

      // Get all users with active rules
      const usersWithRules = await intelModels.IntelAutomationRule.findAll({
        where: { is_active: true },
        attributes: ['user_id'],
        group: ['user_id'],
        raw: true
      });

      console.log(`  Found ${usersWithRules.length} users with active rules`);

      const results = {
        rules_evaluated: 0,
        actions_created: 0,
        errors: []
      };

      for (const { user_id } of usersWithRules) {
        try {
          const userResults = await this.evaluateRulesForUser(user_id);
          results.rules_evaluated += userResults.rules_evaluated;
          results.actions_created += userResults.actions_created;
        } catch (error) {
          console.error(`❌ Error evaluating rules for user ${user_id}:`, error.message);
          results.errors.push({ user_id, error: error.message });
        }
      }

      console.log(`✅ [RulesEngine] Complete: ${results.rules_evaluated} rules, ${results.actions_created} actions`);
      return results;

    } finally {
      this.evaluationInProgress = false;
    }
  }

  /**
   * Evaluate rules for a specific user
   */
  async evaluateRulesForUser(userId) {
    const rules = await intelModels.IntelAutomationRule.findAll({
      where: {
        user_id: userId,
        is_active: true
      }
    });

    const results = {
      rules_evaluated: rules.length,
      actions_created: 0
    };

    for (const rule of rules) {
      try {
        const actionsCreated = await this.evaluateRule(rule);
        results.actions_created += actionsCreated;
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule against all applicable entities
   */
  async evaluateRule(rule) {
    let actionsCreated = 0;

    // Get entities to evaluate based on rule's ad_account_id
    const whereClause = {
      user_id: rule.user_id
    };

    if (rule.ad_account_id) {
      whereClause.ad_account_id = rule.ad_account_id;
    }

    if (rule.entity_type !== 'all') {
      whereClause.entity_type = rule.entity_type;
    }

    // Get recent snapshots for evaluation
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - rule.evaluation_window_hours);

    const snapshots = await intelModels.IntelPerformanceSnapshot.findAll({
      where: {
        ...whereClause,
        created_at: {
          [intelModels.Sequelize.Op.gte]: hoursAgo
        }
      },
      order: [['snapshot_date', 'DESC'], ['snapshot_hour', 'DESC']]
    });

    // Group by entity and get latest for each
    const latestByEntity = new Map();
    snapshots.forEach(snapshot => {
      const key = `${snapshot.entity_type}:${snapshot.entity_id}`;
      if (!latestByEntity.has(key)) {
        latestByEntity.set(key, snapshot);
      }
    });

    // Evaluate each entity against the rule
    for (const [key, snapshot] of latestByEntity) {
      try {
        const metrics = this.extractMetrics(snapshot);
        const evaluation = rule.evaluateConditions(metrics);

        if (evaluation.passes) {
          // Check cooldown
          const onCooldown = await rule.isOnCooldown(
            snapshot.entity_id,
            intelModels.IntelAutomationAction
          );

          if (!onCooldown) {
            await this.createActionsFromRule(rule, snapshot, evaluation);
            actionsCreated++;
          }
        }
      } catch (error) {
        console.error(`Error evaluating entity ${key}:`, error.message);
      }
    }

    if (actionsCreated > 0) {
      await rule.recordTrigger();
    }

    return actionsCreated;
  }

  /**
   * Extract metrics from a snapshot for rule evaluation
   */
  extractMetrics(snapshot) {
    return {
      spend: snapshot.spend,
      impressions: snapshot.impressions,
      clicks: snapshot.clicks,
      reach: snapshot.reach,
      conversions: snapshot.conversions,
      revenue: snapshot.revenue,
      cpm: snapshot.cpm,
      ctr: snapshot.ctr,
      cpc: snapshot.cpc,
      cpa: snapshot.cpa,
      roas: snapshot.roas,
      frequency: snapshot.frequency,
      learning_phase: snapshot.learning_phase,
      effective_status: snapshot.effective_status,
      days_since_creation: snapshot.days_since_creation
    };
  }

  /**
   * Create action records from a triggered rule
   * THIS IS THE ONLY WAY RULES AFFECT CAMPAIGNS - BY CREATING ACTION RECORDS
   */
  async createActionsFromRule(rule, snapshot, evaluation) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Actions expire in 24 hours

    for (const actionConfig of rule.actions) {
      // Skip notify actions - handle separately
      if (actionConfig.action === 'notify') {
        await this.createNotification(rule, snapshot, evaluation);
        continue;
      }

      // Create the action record
      const action = await intelModels.IntelAutomationAction.create({
        user_id: rule.user_id,
        rule_id: rule.id,
        ad_account_id: snapshot.ad_account_id,
        entity_type: snapshot.entity_type,
        entity_id: snapshot.entity_id,
        entity_name: snapshot.entity_name,
        action_type: actionConfig.action,
        action_params: actionConfig.params || null,
        status: rule.requires_approval ? 'pending_approval' : 'approved',
        trigger_reason: this.generateTriggerReason(rule, evaluation),
        trigger_metrics: evaluation.triggeredConditions,
        expires_at: rule.requires_approval ? expiresAt : null
      });

      // Create notification for pending approval
      if (rule.requires_approval) {
        await intelModels.IntelNotification.createActionPending(rule.user_id, action);
      }

      console.log(`  ⚡ Created action: ${actionConfig.action} on ${snapshot.entity_type} ${snapshot.entity_id}`);
    }
  }

  /**
   * Create notification without action
   */
  async createNotification(rule, snapshot, evaluation) {
    await intelModels.IntelNotification.create({
      user_id: rule.user_id,
      type: 'rule_triggered',
      priority: 'medium',
      title: `Rule Triggered: ${rule.name}`,
      message: this.generateTriggerReason(rule, evaluation),
      entity_type: snapshot.entity_type,
      entity_id: snapshot.entity_id,
      metadata: {
        rule_id: rule.id,
        rule_name: rule.name,
        metrics: evaluation.triggeredConditions
      }
    });
  }

  /**
   * Generate human-readable trigger reason
   */
  generateTriggerReason(rule, evaluation) {
    const conditions = evaluation.triggeredConditions.map(c => {
      const value = typeof c.actual_value === 'number'
        ? c.actual_value.toFixed(2)
        : c.actual_value;
      return `${c.metric} ${c.operator} ${c.value} (actual: ${value})`;
    });

    return `Rule "${rule.name}" triggered: ${conditions.join(', ')}`;
  }

  /**
   * Create a new rule
   */
  async createRule(userId, ruleData) {
    // Validate conditions
    if (!ruleData.conditions || ruleData.conditions.length === 0) {
      throw new Error('At least one condition is required');
    }

    // Validate actions
    if (!ruleData.actions || ruleData.actions.length === 0) {
      throw new Error('At least one action is required');
    }

    // Validate condition format
    for (const condition of ruleData.conditions) {
      if (!condition.metric || !condition.operator || condition.value === undefined) {
        throw new Error('Invalid condition format. Required: metric, operator, value');
      }
    }

    return intelModels.IntelAutomationRule.create({
      user_id: userId,
      ...ruleData
    });
  }

  /**
   * Get default rules templates
   */
  getDefaultRuleTemplates() {
    return [
      {
        name: 'Stop Loss - High CPA',
        description: 'Pause ad sets spending over $50 with CPA above target',
        rule_type: 'loss_prevention',
        entity_type: 'adset',
        conditions: [
          { metric: 'spend', operator: '>=', value: 50 },
          { metric: 'cpa', operator: '>', value: 100 }
        ],
        condition_logic: 'AND',
        actions: [
          { action: 'pause' },
          { action: 'notify' }
        ],
        requires_approval: true,
        cooldown_hours: 24,
        evaluation_window_hours: 24
      },
      {
        name: 'Scale Winners - High ROAS',
        description: 'Increase budget on ad sets with ROAS > 200%',
        rule_type: 'scaling',
        entity_type: 'adset',
        conditions: [
          { metric: 'roas', operator: '>', value: 200 },
          { metric: 'spend', operator: '>=', value: 100 }
        ],
        condition_logic: 'AND',
        actions: [
          { action: 'increase_budget', params: { percentage: 20 } }
        ],
        requires_approval: true,
        cooldown_hours: 48,
        evaluation_window_hours: 72
      },
      {
        name: 'Learning Phase Alert',
        description: 'Alert when ad set enters learning limited',
        rule_type: 'learning_protection',
        entity_type: 'adset',
        conditions: [
          { metric: 'learning_phase', operator: '==', value: 'LEARNING_LIMITED' }
        ],
        condition_logic: 'AND',
        actions: [
          { action: 'notify' }
        ],
        requires_approval: false,
        cooldown_hours: 24,
        evaluation_window_hours: 1
      },
      {
        name: 'Creative Fatigue Detection',
        description: 'Alert when frequency is high and CTR dropping',
        rule_type: 'fatigue_detection',
        entity_type: 'ad',
        conditions: [
          { metric: 'frequency', operator: '>', value: 3 },
          { metric: 'ctr', operator: '<', value: 1 }
        ],
        condition_logic: 'AND',
        actions: [
          { action: 'notify' }
        ],
        requires_approval: false,
        cooldown_hours: 48,
        evaluation_window_hours: 168 // 7 days
      },
      {
        name: 'Zero Conversion Alert',
        description: 'Alert on high spend with zero conversions',
        rule_type: 'loss_prevention',
        entity_type: 'adset',
        conditions: [
          { metric: 'spend', operator: '>=', value: 100 },
          { metric: 'conversions', operator: '==', value: 0 }
        ],
        condition_logic: 'AND',
        actions: [
          { action: 'pause' },
          { action: 'notify' }
        ],
        requires_approval: true,
        cooldown_hours: 24,
        evaluation_window_hours: 24
      }
    ];
  }

  /**
   * Get rules for a user
   */
  async getRulesForUser(userId, options = {}) {
    const { active_only = false, rule_type = null } = options;

    const where = { user_id: userId };
    if (active_only) where.is_active = true;
    if (rule_type) where.rule_type = rule_type;

    return intelModels.IntelAutomationRule.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Get rule statistics
   */
  async getRuleStats(userId) {
    const rules = await intelModels.IntelAutomationRule.findAll({
      where: { user_id: userId }
    });

    const stats = {
      total_rules: rules.length,
      active_rules: rules.filter(r => r.is_active).length,
      by_type: {},
      total_triggers: 0
    };

    rules.forEach(rule => {
      stats.by_type[rule.rule_type] = (stats.by_type[rule.rule_type] || 0) + 1;
      stats.total_triggers += rule.times_triggered;
    });

    return stats;
  }
}

module.exports = new AutomationRulesEngine();
