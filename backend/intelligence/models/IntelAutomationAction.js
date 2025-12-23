'use strict';

/**
 * IntelAutomationAction Model
 *
 * Records actions that have been suggested, are pending approval,
 * or have been executed. This is the ONLY way intelligence
 * can affect campaigns - through action records.
 *
 * ISOLATION PRINCIPLE:
 * - Intelligence creates action records with status='pending_approval'
 * - User approves/rejects in dashboard
 * - Separate ActionExecutor service processes approved actions
 * - Campaign management code remains completely untouched
 */

module.exports = (sequelize, DataTypes) => {
  const IntelAutomationAction = sequelize.define('IntelAutomationAction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    rule_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Reference to rule that triggered this action (null if ML-suggested)'
    },
    ad_account_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entity_type: {
      type: DataTypes.ENUM('campaign', 'adset', 'ad'),
      allowNull: false
    },
    entity_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entity_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    action_type: {
      type: DataTypes.ENUM(
        'pause',
        'activate',
        'increase_budget',
        'decrease_budget',
        'adjust_bid',
        'notify',
        'create_report',
        'duplicate',
        'archive'
      ),
      allowNull: false
    },
    action_params: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM(
        'pending_approval',
        'approved',
        'rejected',
        'executed',
        'failed',
        'expired'
      ),
      defaultValue: 'pending_approval'
    },
    // Reasoning
    trigger_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    trigger_metrics: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // ML-specific fields
    model_confidence: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      get() {
        const value = this.getDataValue('model_confidence');
        return value ? parseFloat(value) : null;
      }
    },
    model_version: {
      type: DataTypes.STRING,
      allowNull: true
    },
    features_used: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Execution tracking
    approved_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    executed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    execution_result: {
      type: DataTypes.JSON,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'intel_automation_actions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  IntelAutomationAction.associate = function(models) {
    if (models.User) {
      IntelAutomationAction.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      IntelAutomationAction.belongsTo(models.User, {
        foreignKey: 'approved_by_user_id',
        as: 'approver'
      });
    }
    if (models.IntelAutomationRule) {
      IntelAutomationAction.belongsTo(models.IntelAutomationRule, {
        foreignKey: 'rule_id',
        as: 'rule'
      });
    }
  };

  // Instance methods

  /**
   * Approve this action
   */
  IntelAutomationAction.prototype.approve = async function(approverUserId) {
    return this.update({
      status: 'approved',
      approved_by_user_id: approverUserId,
      approved_at: new Date()
    });
  };

  /**
   * Reject this action
   */
  IntelAutomationAction.prototype.reject = async function(approverUserId, reason = null) {
    return this.update({
      status: 'rejected',
      approved_by_user_id: approverUserId,
      approved_at: new Date(),
      error_message: reason
    });
  };

  /**
   * Mark as executed
   */
  IntelAutomationAction.prototype.markExecuted = async function(result) {
    return this.update({
      status: 'executed',
      executed_at: new Date(),
      execution_result: result
    });
  };

  /**
   * Mark as failed
   */
  IntelAutomationAction.prototype.markFailed = async function(errorMessage) {
    return this.update({
      status: 'failed',
      executed_at: new Date(),
      error_message: errorMessage
    });
  };

  /**
   * Check if action is still valid (not expired)
   */
  IntelAutomationAction.prototype.isValid = function() {
    if (this.status !== 'pending_approval') return false;
    if (!this.expires_at) return true;
    return new Date() < new Date(this.expires_at);
  };

  /**
   * Generate human-readable action description
   */
  IntelAutomationAction.prototype.getDescription = function() {
    const entityLabel = `${this.entity_type} "${this.entity_name || this.entity_id}"`;

    switch (this.action_type) {
      case 'pause':
        return `Pause ${entityLabel}`;
      case 'activate':
        return `Activate ${entityLabel}`;
      case 'increase_budget':
        const increase = this.action_params?.percentage || this.action_params?.amount;
        return `Increase budget for ${entityLabel} by ${increase}${this.action_params?.percentage ? '%' : ''}`;
      case 'decrease_budget':
        const decrease = this.action_params?.percentage || this.action_params?.amount;
        return `Decrease budget for ${entityLabel} by ${decrease}${this.action_params?.percentage ? '%' : ''}`;
      case 'adjust_bid':
        return `Adjust bid for ${entityLabel}`;
      case 'notify':
        return `Send notification about ${entityLabel}`;
      case 'create_report':
        return `Create report for ${entityLabel}`;
      case 'duplicate':
        return `Duplicate ${entityLabel}`;
      case 'archive':
        return `Archive ${entityLabel}`;
      default:
        return `${this.action_type} on ${entityLabel}`;
    }
  };

  // Class methods

  /**
   * Get pending actions for a user
   */
  IntelAutomationAction.getPendingActions = async function(userId, limit = 50) {
    return this.findAll({
      where: {
        user_id: userId,
        status: 'pending_approval',
        [sequelize.Sequelize.Op.or]: [
          { expires_at: null },
          { expires_at: { [sequelize.Sequelize.Op.gt]: new Date() } }
        ]
      },
      order: [['created_at', 'DESC']],
      limit
    });
  };

  /**
   * Get approved actions ready for execution
   */
  IntelAutomationAction.getApprovedActions = async function(limit = 10) {
    return this.findAll({
      where: {
        status: 'approved'
      },
      order: [['approved_at', 'ASC']],
      limit
    });
  };

  /**
   * Expire old pending actions
   */
  IntelAutomationAction.expireOldActions = async function() {
    const [count] = await this.update(
      { status: 'expired' },
      {
        where: {
          status: 'pending_approval',
          expires_at: {
            [sequelize.Sequelize.Op.lt]: new Date()
          }
        }
      }
    );
    return count;
  };

  /**
   * Get action statistics for a user
   */
  IntelAutomationAction.getStats = async function(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const actions = await this.findAll({
      where: {
        user_id: userId,
        created_at: {
          [sequelize.Sequelize.Op.gte]: startDate
        }
      },
      attributes: ['status', 'action_type']
    });

    const stats = {
      total: actions.length,
      by_status: {},
      by_action_type: {},
      approval_rate: 0
    };

    actions.forEach(action => {
      stats.by_status[action.status] = (stats.by_status[action.status] || 0) + 1;
      stats.by_action_type[action.action_type] = (stats.by_action_type[action.action_type] || 0) + 1;
    });

    const decisions = (stats.by_status.approved || 0) + (stats.by_status.rejected || 0);
    if (decisions > 0) {
      stats.approval_rate = ((stats.by_status.approved || 0) / decisions * 100).toFixed(1);
    }

    return stats;
  };

  return IntelAutomationAction;
};
