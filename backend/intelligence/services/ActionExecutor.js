'use strict';

/**
 * ActionExecutor
 *
 * Executes approved automation actions via Facebook API.
 * This is the ONLY service that can modify campaigns based on intelligence.
 *
 * ISOLATION PRINCIPLE:
 * - ONLY executes actions with status='approved'
 * - Actions must be approved by user FIRST
 * - Uses separate execution path from campaign management
 * - All executions are logged and auditable
 *
 * SAFETY FEATURES:
 * - Dry-run mode available
 * - Execution requires explicit approval
 * - Rate limiting applied
 * - All actions logged
 */

const axios = require('axios');
const intelModels = require('../models');

class ActionExecutor {
  constructor() {
    this.apiVersion = process.env.FB_API_VERSION || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.executing = false;
    this.dryRunMode = process.env.INTEL_DRY_RUN === 'true';
  }

  /**
   * Process all approved actions
   */
  async processApprovedActions() {
    if (this.executing) {
      console.log('⏳ Action execution already in progress...');
      return;
    }

    this.executing = true;
    console.log('🔧 [ActionExecutor] Processing approved actions...');

    try {
      const approvedActions = await intelModels.IntelAutomationAction.getApprovedActions(10);

      if (approvedActions.length === 0) {
        console.log('  No approved actions to process');
        return { processed: 0, success: 0, failed: 0 };
      }

      console.log(`  Found ${approvedActions.length} approved actions`);

      const results = { processed: 0, success: 0, failed: 0 };

      for (const action of approvedActions) {
        try {
          await this.executeAction(action);
          results.success++;
        } catch (error) {
          console.error(`  ❌ Failed to execute action ${action.id}:`, error.message);
          await action.markFailed(error.message);
          results.failed++;
        }
        results.processed++;
      }

      console.log(`✅ [ActionExecutor] Complete: ${results.success} success, ${results.failed} failed`);
      return results;

    } finally {
      this.executing = false;
    }
  }

  /**
   * Execute a single action
   */
  async executeAction(action) {
    console.log(`  🔧 Executing: ${action.action_type} on ${action.entity_type} ${action.entity_id}`);

    // Get access token for the user
    const mainDb = require('../../models');
    const fbAuth = await mainDb.FacebookAuth.findOne({
      where: { user_id: action.user_id },
      order: [['updated_at', 'DESC']]
    });

    if (!fbAuth || !fbAuth.access_token) {
      throw new Error('No valid access token found');
    }

    const accessToken = fbAuth.accessToken;

    // Dry run mode - log but don't execute
    if (this.dryRunMode) {
      console.log(`    [DRY RUN] Would execute: ${action.action_type} on ${action.entity_id}`);
      await action.markExecuted({ dry_run: true, would_execute: action.action_type });
      return;
    }

    let result;

    switch (action.action_type) {
      case 'pause':
        result = await this.pauseEntity(action.entity_id, accessToken);
        break;

      case 'activate':
        result = await this.activateEntity(action.entity_id, accessToken);
        break;

      case 'increase_budget':
        result = await this.adjustBudget(action.entity_id, action.action_params, 'increase', accessToken);
        break;

      case 'decrease_budget':
        result = await this.adjustBudget(action.entity_id, action.action_params, 'decrease', accessToken);
        break;

      case 'notify':
        // Notification actions don't need FB API execution
        result = { success: true, action: 'notification_sent' };
        break;

      default:
        throw new Error(`Unsupported action type: ${action.action_type}`);
    }

    // Mark as executed
    await action.markExecuted(result);

    // Create success notification
    await intelModels.IntelNotification.create({
      user_id: action.user_id,
      type: 'action_executed',
      priority: 'low',
      title: 'Action Executed Successfully',
      message: `${action.action_type} on ${action.entity_type} "${action.entity_name || action.entity_id}" completed`,
      entity_type: action.entity_type,
      entity_id: action.entity_id,
      metadata: { action_id: action.id, result }
    });

    // Record training data for ML
    await this.recordTrainingData(action, 'executed');

    return result;
  }

  /**
   * Pause an entity (campaign, ad set, or ad)
   */
  async pauseEntity(entityId, accessToken) {
    const response = await axios.post(
      `${this.baseUrl}/${entityId}`,
      null,
      {
        params: {
          access_token: accessToken,
          status: 'PAUSED'
        }
      }
    );

    return { success: response.data.success, action: 'paused' };
  }

  /**
   * Activate an entity
   */
  async activateEntity(entityId, accessToken) {
    const response = await axios.post(
      `${this.baseUrl}/${entityId}`,
      null,
      {
        params: {
          access_token: accessToken,
          status: 'ACTIVE'
        }
      }
    );

    return { success: response.data.success, action: 'activated' };
  }

  /**
   * Adjust budget for an entity
   */
  async adjustBudget(entityId, params, direction, accessToken) {
    // First, get current budget
    const entityResponse = await axios.get(
      `${this.baseUrl}/${entityId}`,
      {
        params: {
          access_token: accessToken,
          fields: 'daily_budget,lifetime_budget'
        }
      }
    );

    const entity = entityResponse.data;
    const currentBudget = parseInt(entity.daily_budget || entity.lifetime_budget || 0);

    if (currentBudget === 0) {
      throw new Error('Cannot adjust budget: no current budget set');
    }

    // Calculate new budget
    let newBudget;
    if (params.percentage) {
      const multiplier = direction === 'increase'
        ? 1 + (params.percentage / 100)
        : 1 - (params.percentage / 100);
      newBudget = Math.round(currentBudget * multiplier);
    } else if (params.amount) {
      newBudget = direction === 'increase'
        ? currentBudget + (params.amount * 100) // Convert to cents
        : currentBudget - (params.amount * 100);
    } else {
      throw new Error('Budget adjustment requires percentage or amount');
    }

    // Apply min/max limits
    if (params.min_budget) {
      newBudget = Math.max(newBudget, params.min_budget * 100);
    }
    if (params.max_budget) {
      newBudget = Math.min(newBudget, params.max_budget * 100);
    }

    // Ensure positive budget
    newBudget = Math.max(100, newBudget); // Minimum $1

    // Update the budget
    const budgetField = entity.daily_budget ? 'daily_budget' : 'lifetime_budget';
    const response = await axios.post(
      `${this.baseUrl}/${entityId}`,
      null,
      {
        params: {
          access_token: accessToken,
          [budgetField]: newBudget.toString()
        }
      }
    );

    return {
      success: response.data.success,
      action: 'budget_adjusted',
      previous_budget: currentBudget / 100,
      new_budget: newBudget / 100,
      change: (newBudget - currentBudget) / 100
    };
  }

  /**
   * Record training data for ML model improvement
   */
  async recordTrainingData(action, outcome) {
    try {
      await intelModels.IntelMLTrainingData.create({
        user_id: action.user_id,
        data_type: 'action_feedback',
        features: {
          entity_type: action.entity_type,
          action_type: action.action_type,
          trigger_metrics: action.trigger_metrics,
          model_confidence: action.model_confidence
        },
        label: outcome, // 'executed', 'approved', 'rejected'
        entity_type: action.entity_type,
        entity_id: action.entity_id,
        action_id: action.id
      });
    } catch (error) {
      console.error('Error recording training data:', error.message);
    }
  }

  /**
   * Approve an action
   */
  async approveAction(actionId, userId) {
    const action = await intelModels.IntelAutomationAction.findOne({
      where: { id: actionId, user_id: userId }
    });

    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'pending_approval') {
      throw new Error(`Cannot approve action with status: ${action.status}`);
    }

    await action.approve(userId);

    // Record approval for training
    await this.recordTrainingData(action, 'approved');

    return action;
  }

  /**
   * Reject an action
   */
  async rejectAction(actionId, userId, reason = null) {
    const action = await intelModels.IntelAutomationAction.findOne({
      where: { id: actionId, user_id: userId }
    });

    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'pending_approval') {
      throw new Error(`Cannot reject action with status: ${action.status}`);
    }

    await action.reject(userId, reason);

    // Record rejection for training
    await this.recordTrainingData(action, 'rejected');

    return action;
  }

  /**
   * Get pending actions for a user
   */
  async getPendingActions(userId) {
    const actions = await intelModels.IntelAutomationAction.getPendingActions(userId);

    return actions.map(action => ({
      id: action.id,
      entity_type: action.entity_type,
      entity_id: action.entity_id,
      entity_name: action.entity_name,
      action_type: action.action_type,
      action_params: action.action_params,
      description: action.getDescription(),
      trigger_reason: action.trigger_reason,
      trigger_metrics: action.trigger_metrics,
      model_confidence: action.model_confidence,
      expires_at: action.expires_at,
      created_at: action.created_at
    }));
  }

  /**
   * Get action history for a user
   */
  async getActionHistory(userId, options = {}) {
    const { limit = 50, status = null } = options;

    const where = { user_id: userId };
    if (status) where.status = status;

    const actions = await intelModels.IntelAutomationAction.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit
    });

    return actions.map(action => ({
      id: action.id,
      entity_type: action.entity_type,
      entity_id: action.entity_id,
      entity_name: action.entity_name,
      action_type: action.action_type,
      status: action.status,
      description: action.getDescription(),
      trigger_reason: action.trigger_reason,
      execution_result: action.execution_result,
      error_message: action.error_message,
      created_at: action.created_at,
      executed_at: action.executed_at
    }));
  }

  /**
   * Get action statistics
   */
  async getStats(userId, days = 30) {
    return intelModels.IntelAutomationAction.getStats(userId, days);
  }
}

module.exports = new ActionExecutor();
