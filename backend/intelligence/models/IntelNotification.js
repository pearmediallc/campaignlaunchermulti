'use strict';

/**
 * IntelNotification Model
 *
 * In-app notifications for intelligence events including:
 * - Pending action alerts
 * - Rule triggers
 * - Performance insights
 * - Score changes
 *
 * ISOLATION: Notifications are informational only.
 */

module.exports = (sequelize, DataTypes) => {
  const IntelNotification = sequelize.define('IntelNotification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM(
        'action_pending',
        'action_executed',
        'action_failed',
        'rule_triggered',
        'alert',
        'insight',
        'recommendation',
        'score_change'
      ),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    entity_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    action_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_dismissed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    action_buttons: {
      type: DataTypes.JSON,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'intel_notifications',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  IntelNotification.associate = function(models) {
    if (models.User) {
      IntelNotification.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
    if (models.IntelAutomationAction) {
      IntelNotification.belongsTo(models.IntelAutomationAction, {
        foreignKey: 'action_id',
        as: 'action'
      });
    }
  };

  // Instance methods

  /**
   * Mark notification as read
   */
  IntelNotification.prototype.markAsRead = async function() {
    if (this.is_read) return this;
    return this.update({
      is_read: true,
      read_at: new Date()
    });
  };

  /**
   * Dismiss notification
   */
  IntelNotification.prototype.dismiss = async function() {
    return this.update({
      is_dismissed: true,
      is_read: true,
      read_at: this.read_at || new Date()
    });
  };

  /**
   * Get icon based on type
   */
  IntelNotification.prototype.getIcon = function() {
    const icons = {
      action_pending: '⏳',
      action_executed: '✅',
      action_failed: '❌',
      rule_triggered: '⚡',
      alert: '⚠️',
      insight: '💡',
      recommendation: '🎯',
      score_change: '📊'
    };
    return icons[this.type] || '📢';
  };

  /**
   * Get color based on priority
   */
  IntelNotification.prototype.getColor = function() {
    const colors = {
      low: '#6B7280',      // gray
      medium: '#3B82F6',   // blue
      high: '#F59E0B',     // amber
      critical: '#EF4444'  // red
    };
    return colors[this.priority] || colors.medium;
  };

  // Class methods

  /**
   * Get unread notifications for a user
   */
  IntelNotification.getUnread = async function(userId, limit = 50) {
    const { Op } = sequelize.Sequelize;
    return this.findAll({
      where: {
        user_id: userId,
        is_read: false,
        is_dismissed: false,
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } }
        ]
      },
      order: [
        ['priority', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit
    });
  };

  /**
   * Get unread count for a user
   */
  IntelNotification.getUnreadCount = async function(userId) {
    const { Op } = sequelize.Sequelize;
    return this.count({
      where: {
        user_id: userId,
        is_read: false,
        is_dismissed: false,
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } }
        ]
      }
    });
  };

  /**
   * Get all notifications for a user (paginated)
   */
  IntelNotification.getForUser = async function(userId, options = {}) {
    const { page = 1, limit = 20, includeRead = true, includeDismissed = false } = options;

    const where = { user_id: userId };
    if (!includeRead) where.is_read = false;
    if (!includeDismissed) where.is_dismissed = false;

    return this.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });
  };

  /**
   * Mark all as read for a user
   */
  IntelNotification.markAllRead = async function(userId) {
    return this.update(
      {
        is_read: true,
        read_at: new Date()
      },
      {
        where: {
          user_id: userId,
          is_read: false
        }
      }
    );
  };

  /**
   * Create action pending notification
   */
  IntelNotification.createActionPending = async function(userId, action) {
    return this.create({
      user_id: userId,
      type: 'action_pending',
      priority: 'high',
      title: 'Action Requires Approval',
      message: action.getDescription ? action.getDescription() : `${action.action_type} on ${action.entity_name || action.entity_id}`,
      entity_type: action.entity_type,
      entity_id: action.entity_id,
      action_id: action.id,
      action_buttons: [
        { label: 'Approve', action: 'approve', style: 'primary' },
        { label: 'Reject', action: 'reject', style: 'secondary' }
      ],
      metadata: {
        trigger_reason: action.trigger_reason,
        model_confidence: action.model_confidence
      },
      expires_at: action.expires_at
    });
  };

  /**
   * Create insight notification
   */
  IntelNotification.createInsight = async function(userId, insight) {
    return this.create({
      user_id: userId,
      type: 'insight',
      priority: insight.priority || 'medium',
      title: insight.title,
      message: insight.message,
      entity_type: insight.entity_type,
      entity_id: insight.entity_id,
      metadata: insight.data
    });
  };

  /**
   * Create score change notification
   */
  IntelNotification.createScoreChange = async function(userId, scoreData) {
    const { adAccountId, previousScore, newScore, trend } = scoreData;
    const change = newScore - previousScore;
    const priority = Math.abs(change) > 10 ? 'high' : 'medium';

    return this.create({
      user_id: userId,
      type: 'score_change',
      priority,
      title: `Account Score ${trend === 'improving' ? 'Improved' : 'Declined'}`,
      message: `Your account health score changed from ${previousScore} to ${newScore} (${change > 0 ? '+' : ''}${change})`,
      entity_type: 'account',
      entity_id: adAccountId,
      metadata: {
        previous_score: previousScore,
        new_score: newScore,
        change,
        trend
      }
    });
  };

  /**
   * Clean up expired notifications
   */
  IntelNotification.cleanupExpired = async function() {
    return this.destroy({
      where: {
        expires_at: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  /**
   * Clean up old read notifications
   */
  IntelNotification.cleanupOld = async function(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return this.destroy({
      where: {
        is_read: true,
        created_at: {
          [sequelize.Sequelize.Op.lt]: cutoffDate
        }
      }
    });
  };

  return IntelNotification;
};
