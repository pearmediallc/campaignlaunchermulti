/**
 * FailureTracker Service
 * Tracks, manages, and recovers failed campaign entities
 */

const db = require('../models');
const ErrorTranslator = require('./ErrorTranslator');

class FailureTracker {
  /**
   * Track a failed entity
   * @param {Object} params - Failure tracking parameters
   * @returns {Promise<Object>} - Created FailedEntity record
   */
  static async trackFailedEntity({
    userId,
    campaignId = null,
    campaignName,
    adsetId = null,
    adsetName = null,
    adId = null,
    adName = null,
    entityType, // 'campaign', 'adset', 'ad'
    error,
    strategyType = null,
    metadata = {}
  }) {
    try {
      // Translate error to user-friendly message
      const translated = ErrorTranslator.translateFacebookError(error);
      const errorDetails = ErrorTranslator.extractErrorDetails(error);

      // Create failed entity record
      const failedEntity = await db.FailedEntity.create({
        userId,
        campaignId,
        campaignName,
        adsetId,
        adsetName,
        adId,
        adName,
        entityType,
        failureReason: errorDetails.fullError || error.message,
        userFriendlyReason: translated.userFriendlyMessage,
        errorCode: translated.errorCode,
        facebookError: errorDetails,
        retryCount: 0,
        status: 'failed',
        strategyType,
        metadata
      });

      console.log(`📝 Tracked failed ${entityType}: ${adsetName || adName || campaignName}`);
      console.log(`   Error: ${translated.userFriendlyMessage}`);

      return failedEntity;
    } catch (trackingError) {
      console.error('❌ Error tracking failure:', trackingError);
      // Don't throw - tracking failures shouldn't break the main flow
      return null;
    }
  }

  /**
   * Mark entity as recovered
   * @param {Number} failedEntityId - ID of the FailedEntity record
   * @param {String} recoveredAdsetId - Facebook Ad Set ID (if applicable)
   * @param {String} recoveredAdId - Facebook Ad ID (if applicable)
   * @returns {Promise<Object>} - Updated FailedEntity record
   */
  static async markAsRecovered(failedEntityId, recoveredAdsetId = null, recoveredAdId = null) {
    try {
      const failedEntity = await db.FailedEntity.findByPk(failedEntityId);

      if (!failedEntity) {
        console.warn(`⚠️  FailedEntity ${failedEntityId} not found`);
        return null;
      }

      // Update with recovered IDs
      if (recoveredAdsetId) {
        failedEntity.adsetId = recoveredAdsetId;
      }
      if (recoveredAdId) {
        failedEntity.adId = recoveredAdId;
      }

      await failedEntity.markAsRecovered();

      console.log(`✅ Marked ${failedEntity.entityType} as recovered: ${failedEntity.adsetName || failedEntity.adName}`);

      return failedEntity;
    } catch (error) {
      console.error('❌ Error marking as recovered:', error);
      return null;
    }
  }

  /**
   * Update retry count
   * @param {Number} failedEntityId - ID of the FailedEntity record
   * @returns {Promise<Object>} - Updated FailedEntity record
   */
  static async incrementRetryCount(failedEntityId) {
    try {
      const failedEntity = await db.FailedEntity.findByPk(failedEntityId);

      if (!failedEntity) {
        return null;
      }

      await failedEntity.markAsRetrying();

      console.log(`🔄 Retry attempt ${failedEntity.retryCount} for ${failedEntity.entityType}: ${failedEntity.adsetName || failedEntity.adName}`);

      return failedEntity;
    } catch (error) {
      console.error('❌ Error incrementing retry count:', error);
      return null;
    }
  }

  /**
   * Mark entity as permanent failure (after max retries)
   * @param {Number} failedEntityId - ID of the FailedEntity record
   * @returns {Promise<Object>} - Updated FailedEntity record
   */
  static async markAsPermanentFailure(failedEntityId) {
    try {
      const failedEntity = await db.FailedEntity.findByPk(failedEntityId);

      if (!failedEntity) {
        return null;
      }

      await failedEntity.markAsPermanentFailure();

      console.log(`⛔ Marked as permanent failure: ${failedEntity.entityType} - ${failedEntity.adsetName || failedEntity.adName}`);

      return failedEntity;
    } catch (error) {
      console.error('❌ Error marking as permanent failure:', error);
      return null;
    }
  }

  /**
   * Get all failures for a campaign
   * @param {Number} userId - User ID
   * @param {String} campaignId - Facebook Campaign ID
   * @returns {Promise<Array>} - Array of FailedEntity records
   */
  static async getCampaignFailures(userId, campaignId) {
    try {
      const failures = await db.FailedEntity.getFailuresByCampaign(userId, campaignId);
      return failures || [];
    } catch (error) {
      console.error('❌ Error fetching campaign failures:', error);
      return [];
    }
  }

  /**
   * Get pending failures for retry
   * @param {Number} userId - User ID
   * @param {String} campaignId - Optional campaign ID filter
   * @returns {Promise<Array>} - Array of pending FailedEntity records
   */
  static async getPendingFailures(userId, campaignId = null) {
    try {
      const failures = await db.FailedEntity.getPendingFailures(userId, campaignId);
      return failures || [];
    } catch (error) {
      console.error('❌ Error fetching pending failures:', error);
      return [];
    }
  }

  /**
   * Get failure statistics for a campaign
   * @param {Number} userId - User ID
   * @param {String} campaignId - Facebook Campaign ID
   * @returns {Promise<Object>} - Failure statistics
   */
  static async getFailureStats(userId, campaignId) {
    try {
      const failures = await this.getCampaignFailures(userId, campaignId);

      const stats = {
        total: failures.length,
        byType: {
          campaign: failures.filter(f => f.entityType === 'campaign').length,
          adset: failures.filter(f => f.entityType === 'adset').length,
          ad: failures.filter(f => f.entityType === 'ad').length
        },
        byStatus: {
          failed: failures.filter(f => f.status === 'failed').length,
          retrying: failures.filter(f => f.status === 'retrying').length,
          recovered: failures.filter(f => f.status === 'recovered').length,
          permanent_failure: failures.filter(f => f.status === 'permanent_failure').length
        },
        recoveryRate: failures.length > 0
          ? ((failures.filter(f => f.status === 'recovered').length / failures.length) * 100).toFixed(2)
          : 0
      };

      return stats;
    } catch (error) {
      console.error('❌ Error calculating failure stats:', error);
      return null;
    }
  }

  /**
   * Clean up old recovered failures (optional housekeeping)
   * @param {Number} daysOld - Delete recovered failures older than X days
   * @returns {Promise<Number>} - Number of deleted records
   */
  static async cleanupOldFailures(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await db.FailedEntity.destroy({
        where: {
          status: 'recovered',
          recoveredAt: {
            [db.Sequelize.Op.lt]: cutoffDate
          }
        }
      });

      console.log(`🧹 Cleaned up ${deleted} old recovered failures`);
      return deleted;
    } catch (error) {
      console.error('❌ Error cleaning up old failures:', error);
      return 0;
    }
  }

  /**
   * Retry a failed entity
   * @param {Number} failedEntityId - ID of the FailedEntity record
   * @param {Function} retryFunction - Async function to retry the operation
   * @returns {Promise<Object>} - { success: boolean, result: any, error: any }
   */
  static async retryFailedEntity(failedEntityId, retryFunction) {
    try {
      const failedEntity = await db.FailedEntity.findByPk(failedEntityId);

      if (!failedEntity) {
        return { success: false, error: 'Failed entity not found' };
      }

      // Check if already recovered
      if (failedEntity.status === 'recovered') {
        return { success: true, result: 'Already recovered' };
      }

      // Increment retry count
      await this.incrementRetryCount(failedEntityId);

      try {
        // Execute retry function
        const result = await retryFunction(failedEntity);

        // Mark as recovered
        await this.markAsRecovered(
          failedEntityId,
          result.adsetId || failedEntity.adsetId,
          result.adId || failedEntity.adId
        );

        return { success: true, result };
      } catch (retryError) {
        // Check if we've exceeded max retries
        if (failedEntity.retryCount >= 3) {
          await this.markAsPermanentFailure(failedEntityId);
          return { success: false, error: 'Max retries exceeded', permanentFailure: true };
        }

        return { success: false, error: retryError };
      }
    } catch (error) {
      console.error('❌ Error in retryFailedEntity:', error);
      return { success: false, error };
    }
  }
}

module.exports = FailureTracker;
