'use strict';

/**
 * IntelAutomationRule Model
 *
 * Stores user-defined automation rules for campaign optimization.
 * Rules can be for loss prevention, scaling, learning protection, etc.
 *
 * ISOLATION: Rules only CREATE action records; they never directly
 * call Facebook API to modify campaigns.
 */

module.exports = (sequelize, DataTypes) => {
  const IntelAutomationRule = sequelize.define('IntelAutomationRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ad_account_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'If null, applies to all accounts'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rule_type: {
      type: DataTypes.ENUM(
        'loss_prevention',
        'scaling',
        'learning_protection',
        'fatigue_detection',
        'schedule',
        'custom'
      ),
      allowNull: false
    },
    entity_type: {
      type: DataTypes.ENUM('campaign', 'adset', 'ad', 'all'),
      defaultValue: 'adset'
    },
    conditions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    condition_logic: {
      type: DataTypes.ENUM('AND', 'OR'),
      defaultValue: 'AND'
    },
    actions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    requires_approval: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    cooldown_hours: {
      type: DataTypes.INTEGER,
      defaultValue: 24
    },
    evaluation_window_hours: {
      type: DataTypes.INTEGER,
      defaultValue: 24
    },
    times_triggered: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_triggered_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'intel_automation_rules',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  IntelAutomationRule.associate = function(models) {
    if (models.User) {
      IntelAutomationRule.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
    if (models.IntelAutomationAction) {
      IntelAutomationRule.hasMany(models.IntelAutomationAction, {
        foreignKey: 'rule_id',
        as: 'actions_taken'
      });
    }
  };

  // Instance methods

  /**
   * Evaluate conditions against metrics data
   * @param {Object} metrics - Current metrics for the entity
   * @returns {Object} - { passes: boolean, triggeredConditions: [] }
   */
  IntelAutomationRule.prototype.evaluateConditions = function(metrics) {
    const triggeredConditions = [];

    for (const condition of this.conditions) {
      const { metric, operator, value } = condition;
      const actualValue = metrics[metric];

      if (actualValue === undefined) continue;

      let passes = false;
      switch (operator) {
        case '>':
          passes = actualValue > value;
          break;
        case '>=':
          passes = actualValue >= value;
          break;
        case '<':
          passes = actualValue < value;
          break;
        case '<=':
          passes = actualValue <= value;
          break;
        case '==':
        case '=':
          passes = actualValue == value;
          break;
        case '!=':
          passes = actualValue != value;
          break;
        case 'between':
          passes = actualValue >= value[0] && actualValue <= value[1];
          break;
        default:
          passes = false;
      }

      if (passes) {
        triggeredConditions.push({
          ...condition,
          actual_value: actualValue
        });
      }
    }

    const allPass = this.condition_logic === 'AND'
      ? triggeredConditions.length === this.conditions.length
      : triggeredConditions.length > 0;

    return {
      passes: allPass,
      triggeredConditions
    };
  };

  /**
   * Check if rule is on cooldown for an entity
   */
  IntelAutomationRule.prototype.isOnCooldown = async function(entityId, IntelAutomationAction) {
    if (!this.cooldown_hours) return false;

    const cooldownStart = new Date();
    cooldownStart.setHours(cooldownStart.getHours() - this.cooldown_hours);

    const recentAction = await IntelAutomationAction.findOne({
      where: {
        rule_id: this.id,
        entity_id: entityId,
        created_at: {
          [sequelize.Sequelize.Op.gte]: cooldownStart
        }
      }
    });

    return !!recentAction;
  };

  /**
   * Increment trigger count
   */
  IntelAutomationRule.prototype.recordTrigger = async function() {
    await this.update({
      times_triggered: this.times_triggered + 1,
      last_triggered_at: new Date()
    });
  };

  // Class methods

  /**
   * Get all active rules for a user/account
   */
  IntelAutomationRule.getActiveRules = async function(userId, adAccountId = null) {
    const where = {
      user_id: userId,
      is_active: true
    };

    if (adAccountId) {
      where[sequelize.Sequelize.Op.or] = [
        { ad_account_id: null },
        { ad_account_id: adAccountId }
      ];
    }

    return this.findAll({
      where,
      order: [['rule_type', 'ASC'], ['created_at', 'ASC']]
    });
  };

  /**
   * Get default rules for a rule type
   */
  IntelAutomationRule.getDefaultRules = function(ruleType) {
    const defaults = {
      loss_prevention: {
        name: 'Stop Loss - High CPA',
        description: 'Pause ad sets spending over $50 with CPA > 2x target',
        conditions: [
          { metric: 'spend', operator: '>=', value: 50 },
          { metric: 'cpa', operator: '>', value: 100 }
        ],
        actions: [{ action: 'pause' }, { action: 'notify' }]
      },
      scaling: {
        name: 'Scale Winners',
        description: 'Increase budget on ad sets with ROAS > 200% and sufficient spend',
        conditions: [
          { metric: 'roas', operator: '>', value: 200 },
          { metric: 'spend', operator: '>=', value: 100 }
        ],
        actions: [{ action: 'increase_budget', params: { percentage: 20 } }]
      },
      learning_protection: {
        name: 'Protect Learning Phase',
        description: 'Alert when ad set risks exiting learning with limited status',
        conditions: [
          { metric: 'learning_phase', operator: '==', value: 'LEARNING_LIMITED' }
        ],
        actions: [{ action: 'notify' }]
      },
      fatigue_detection: {
        name: 'Creative Fatigue Alert',
        description: 'Alert when frequency is high and CTR is declining',
        conditions: [
          { metric: 'frequency', operator: '>', value: 3 },
          { metric: 'ctr', operator: '<', value: 1 }
        ],
        actions: [{ action: 'notify' }]
      }
    };

    return defaults[ruleType] || null;
  };

  return IntelAutomationRule;
};
