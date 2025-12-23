'use strict';

/**
 * NotificationService
 *
 * Manages in-app notifications for intelligence events.
 * Handles creation, retrieval, and status updates for notifications.
 *
 * ISOLATION PRINCIPLE:
 * - Only interacts with intel_notifications table
 * - Notifications are informational only
 */

const intelModels = require('../models');

class NotificationService {
  /**
   * Get unread notifications for a user
   */
  async getUnread(userId, limit = 50) {
    return intelModels.IntelNotification.getUnread(userId, limit);
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId) {
    return intelModels.IntelNotification.getUnreadCount(userId);
  }

  /**
   * Get all notifications for a user (paginated)
   */
  async getAll(userId, options = {}) {
    return intelModels.IntelNotification.getForUser(userId, options);
  }

  /**
   * Mark a notification as read
   */
  async markRead(notificationId, userId) {
    const notification = await intelModels.IntelNotification.findOne({
      where: { id: notificationId, user_id: userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification.markAsRead();
  }

  /**
   * Mark all notifications as read
   */
  async markAllRead(userId) {
    return intelModels.IntelNotification.markAllRead(userId);
  }

  /**
   * Dismiss a notification
   */
  async dismiss(notificationId, userId) {
    const notification = await intelModels.IntelNotification.findOne({
      where: { id: notificationId, user_id: userId }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification.dismiss();
  }

  /**
   * Create a custom notification
   */
  async create(userId, data) {
    return intelModels.IntelNotification.create({
      user_id: userId,
      type: data.type || 'alert',
      priority: data.priority || 'medium',
      title: data.title,
      message: data.message,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      action_buttons: data.action_buttons,
      metadata: data.metadata,
      expires_at: data.expires_at
    });
  }

  /**
   * Create an insight notification
   */
  async createInsight(userId, insight) {
    return intelModels.IntelNotification.createInsight(userId, insight);
  }

  /**
   * Create a performance alert
   */
  async createPerformanceAlert(userId, data) {
    const { entityType, entityId, entityName, metric, value, threshold, direction } = data;

    const title = `Performance ${direction === 'above' ? 'Improved' : 'Declined'}`;
    const message = `${entityType} "${entityName}" ${metric} is ${direction} threshold: ${value} (threshold: ${threshold})`;

    return this.create(userId, {
      type: 'alert',
      priority: direction === 'below' ? 'high' : 'medium',
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      metadata: { metric, value, threshold, direction }
    });
  }

  /**
   * Create a recommendation notification
   */
  async createRecommendation(userId, recommendation) {
    return this.create(userId, {
      type: 'recommendation',
      priority: recommendation.priority || 'medium',
      title: recommendation.title,
      message: recommendation.message,
      entity_type: recommendation.entity_type,
      entity_id: recommendation.entity_id,
      action_buttons: recommendation.action_buttons,
      metadata: recommendation.data
    });
  }

  /**
   * Get notification summary for dashboard
   */
  async getSummary(userId) {
    const unreadCount = await this.getUnreadCount(userId);
    const recentNotifications = await this.getUnread(userId, 5);

    // Count by type
    const { Op } = intelModels.Sequelize;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const byType = await intelModels.IntelNotification.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        'type',
        [intelModels.sequelize.fn('COUNT', intelModels.sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Count by priority for unread
    const byPriority = await intelModels.IntelNotification.findAll({
      where: {
        user_id: userId,
        is_read: false
      },
      attributes: [
        'priority',
        [intelModels.sequelize.fn('COUNT', intelModels.sequelize.col('id')), 'count']
      ],
      group: ['priority'],
      raw: true
    });

    return {
      unread_count: unreadCount,
      recent: recentNotifications.map(n => ({
        id: n.id,
        type: n.type,
        priority: n.priority,
        title: n.title,
        message: n.message,
        icon: n.getIcon(),
        color: n.getColor(),
        created_at: n.created_at,
        action_buttons: n.action_buttons
      })),
      by_type: Object.fromEntries(byType.map(t => [t.type, parseInt(t.count)])),
      by_priority: Object.fromEntries(byPriority.map(p => [p.priority, parseInt(p.count)])),
      has_critical: byPriority.some(p => p.priority === 'critical' && parseInt(p.count) > 0)
    };
  }

  /**
   * Send batch notifications
   */
  async sendBatch(notifications) {
    const results = [];

    for (const notif of notifications) {
      try {
        const created = await this.create(notif.user_id, notif);
        results.push({ success: true, id: created.id });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return {
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Clean up old notifications
   */
  async cleanup() {
    const expired = await intelModels.IntelNotification.cleanupExpired();
    const old = await intelModels.IntelNotification.cleanupOld(30);

    return {
      expired_removed: expired,
      old_removed: old
    };
  }

  /**
   * Get notification by ID
   */
  async getById(notificationId, userId) {
    return intelModels.IntelNotification.findOne({
      where: {
        id: notificationId,
        user_id: userId
      }
    });
  }

  /**
   * Handle notification action button click
   */
  async handleAction(notificationId, userId, action) {
    const notification = await this.getById(notificationId, userId);

    if (!notification) {
      throw new Error('Notification not found');
    }

    // Mark as read
    await notification.markAsRead();

    // Handle specific actions
    switch (action) {
      case 'approve':
        if (notification.action_id) {
          const automationAction = await intelModels.IntelAutomationAction.findByPk(notification.action_id);
          if (automationAction) {
            await automationAction.approve(userId);
            return { action: 'approved', action_id: notification.action_id };
          }
        }
        break;

      case 'reject':
        if (notification.action_id) {
          const automationAction = await intelModels.IntelAutomationAction.findByPk(notification.action_id);
          if (automationAction) {
            await automationAction.reject(userId);
            return { action: 'rejected', action_id: notification.action_id };
          }
        }
        break;

      case 'dismiss':
        await notification.dismiss();
        return { action: 'dismissed' };

      default:
        return { action: 'unknown', received: action };
    }

    return { action: 'processed' };
  }
}

module.exports = new NotificationService();
