const db = require('../models');
const { RateLimitTracker, RequestQueue } = db;

/**
 * Manages rate limit tracking for user OAuth tokens
 * Monitors Facebook API rate limits and queues requests when necessary
 */
class RateLimitService {
  /**
   * Update rate limit tracking from Facebook response headers
   * @param {Number} userId - User ID
   * @param {String} adAccountId - Ad Account ID
   * @param {Object} headers - Facebook API response headers
   */
  static async updateFromHeaders(userId, adAccountId, headers) {
    try {
      const businessUseCaseUsage = headers['x-business-use-case-usage'];
      const appUsage = headers['x-app-usage'];

      if (!businessUseCaseUsage && !appUsage) {
        console.log('No rate limit headers found in response');
        return;
      }

      // Parse Facebook's rate limit headers
      let callCount = 0;
      let callLimit = 200;
      let totalTime = 3600; // 1 hour in seconds

      if (businessUseCaseUsage) {
        const usage = JSON.parse(businessUseCaseUsage);
        // Usage format: { "ad_account_id": [{ "type": "ads_management", "call_count": 50, "total_cputime": 10, "total_time": 60, "estimated_time_to_regain_access": 3540 }] }
        const accountData = Object.values(usage)[0];
        if (accountData && accountData[0]) {
          callCount = accountData[0].call_count || 0;
          totalTime = accountData[0].estimated_time_to_regain_access || 3600;
        }
      } else if (appUsage) {
        const usage = JSON.parse(appUsage);
        callCount = usage.call_count || 0;
        callLimit = usage.total_cputime ? 200 : callLimit; // Facebook default is 200/hour
      }

      const usagePercentage = (callCount / callLimit) * 100;
      const resetAt = new Date(Date.now() + (totalTime * 1000));

      // Upsert rate limit tracker
      const [tracker, created] = await RateLimitTracker.findOrCreate({
        where: { userId, adAccountId },
        defaults: {
          callsUsed: callCount,
          callsLimit: callLimit,
          usagePercentage,
          windowResetAt: resetAt,
          lastResponseHeaders: {
            businessUseCaseUsage,
            appUsage,
            timestamp: new Date()
          }
        }
      });

      if (!created) {
        await tracker.update({
          callsUsed: callCount,
          callsLimit: callLimit,
          usagePercentage,
          windowResetAt: resetAt,
          lastResponseHeaders: {
            businessUseCaseUsage,
            appUsage,
            timestamp: new Date()
          }
        });
      }

      console.log(`Rate limit for user ${userId} on account ${adAccountId}: ${callCount}/${callLimit} (${usagePercentage.toFixed(1)}%), resets at ${resetAt.toISOString()}`);

      return {
        callsUsed: callCount,
        callsLimit: callLimit,
        usagePercentage,
        resetAt,
        shouldQueue: usagePercentage >= 80  // Queue if usage >= 80%
      };
    } catch (error) {
      console.error('Error updating rate limit from headers:', error);
      return null;
    }
  }

  /**
   * Check current rate limit status for a user/account
   * @param {Number} userId - User ID
   * @param {String} adAccountId - Ad Account ID
   * @returns {Promise<Object>}
   */
  static async checkRateLimit(userId, adAccountId) {
    try {
      const tracker = await RateLimitTracker.findOne({
        where: { userId, adAccountId }
      });

      if (!tracker) {
        // No tracking data yet - assume OK
        return {
          canProceed: true,
          usagePercentage: 0,
          callsUsed: 0,
          callsLimit: 200,
          resetAt: null
        };
      }

      const now = new Date();

      // Check if rate limit window has reset
      if (tracker.windowResetAt && tracker.windowResetAt <= now) {
        // Reset the tracker
        await tracker.update({
          callsUsed: 0,
          usagePercentage: 0,
          windowResetAt: new Date(now.getTime() + 3600000) // +1 hour
        });

        return {
          canProceed: true,
          usagePercentage: 0,
          callsUsed: 0,
          callsLimit: tracker.callsLimit,
          resetAt: tracker.windowResetAt
        };
      }

      // Check if we're approaching the limit (80% threshold)
      const shouldQueue = tracker.usagePercentage >= 80;

      return {
        canProceed: !shouldQueue,
        usagePercentage: tracker.usagePercentage,
        callsUsed: tracker.callsUsed,
        callsLimit: tracker.callsLimit,
        resetAt: tracker.windowResetAt,
        shouldQueue
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // On error, allow the request to proceed
      return {
        canProceed: true,
        error: error.message
      };
    }
  }

  /**
   * Queue a request for later processing
   * @param {Object} requestData - Request data
   * @returns {Promise<Object>}
   */
  static async queueRequest(requestData) {
    const {
      userId,
      adAccountId,
      actionType,
      requestData: data,
      accessToken,
      processAfter,
      priority = 5
    } = requestData;

    try {
      const queuedRequest = await RequestQueue.create({
        userId,
        adAccountId,
        actionType,
        requestData: data,
        accessTokenEncrypted: accessToken,  // Will be encrypted by setter
        priority,
        status: 'queued',
        processAfter: processAfter || new Date(Date.now() + 3600000), // Default: +1 hour
        attempts: 0,
        maxAttempts: 3
      });

      console.log(`Queued request ${queuedRequest.id} for user ${userId}: ${actionType}`);

      return {
        queueId: queuedRequest.id,
        status: 'queued',
        processAfter: queuedRequest.processAfter,
        estimatedWaitMinutes: Math.ceil((queuedRequest.processAfter - new Date()) / 60000)
      };
    } catch (error) {
      console.error('Error queueing request:', error);
      throw error;
    }
  }

  /**
   * Get queued requests ready for processing
   * @param {Number} limit - Max number to fetch
   * @returns {Promise<Array>}
   */
  static async getReadyRequests(limit = 10) {
    try {
      const now = new Date();

      const requests = await RequestQueue.findAll({
        where: {
          status: 'queued',
          processAfter: {
            [db.Sequelize.Op.lte]: now
          },
          attempts: {
            [db.Sequelize.Op.lt]: db.Sequelize.col('max_attempts')
          }
        },
        order: [
          ['priority', 'ASC'],  // Higher priority first
          ['created_at', 'ASC']  // Older requests first
        ],
        limit
      });

      return requests;
    } catch (error) {
      console.error('Error getting ready requests:', error);
      return [];
    }
  }

  /**
   * Get user's queued requests
   * @param {Number} userId - User ID
   * @returns {Promise<Array>}
   */
  static async getUserQueuedRequests(userId) {
    try {
      const requests = await RequestQueue.findAll({
        where: {
          userId,
          status: {
            [db.Sequelize.Op.in]: ['queued', 'processing']
          }
        },
        order: [['created_at', 'DESC']],
        attributes: ['id', 'actionType', 'status', 'processAfter', 'attempts', 'createdAt']
      });

      return requests.map(req => ({
        id: req.id,
        actionType: req.actionType,
        status: req.status,
        processAfter: req.processAfter,
        estimatedWaitMinutes: Math.max(0, Math.ceil((req.processAfter - new Date()) / 60000)),
        attempts: req.attempts,
        createdAt: req.createdAt
      }));
    } catch (error) {
      console.error('Error getting user queued requests:', error);
      return [];
    }
  }

  /**
   * Mark request as processing
   * @param {Number} queueId - Queue ID
   */
  static async markProcessing(queueId) {
    try {
      await RequestQueue.update(
        {
          status: 'processing',
          attempts: db.Sequelize.literal('attempts + 1')
        },
        {
          where: { id: queueId }
        }
      );
    } catch (error) {
      console.error('Error marking request as processing:', error);
    }
  }

  /**
   * Mark request as completed
   * @param {Number} queueId - Queue ID
   * @param {Object} result - Processing result
   */
  static async markCompleted(queueId, result) {
    try {
      await RequestQueue.update(
        {
          status: 'completed',
          result,
          processedAt: new Date()
        },
        {
          where: { id: queueId }
        }
      );

      console.log(`Request ${queueId} completed successfully`);
    } catch (error) {
      console.error('Error marking request as completed:', error);
    }
  }

  /**
   * Mark request as failed
   * @param {Number} queueId - Queue ID
   * @param {String} errorMessage - Error message
   */
  static async markFailed(queueId, errorMessage) {
    try {
      const request = await RequestQueue.findByPk(queueId);
      if (!request) return;

      const shouldRetry = request.attempts < request.maxAttempts;

      if (shouldRetry) {
        // Reschedule for retry (exponential backoff)
        const retryDelay = Math.pow(2, request.attempts) * 15 * 60 * 1000; // 15min, 30min, 60min
        await request.update({
          status: 'queued',
          error: errorMessage,
          processAfter: new Date(Date.now() + retryDelay)
        });

        console.log(`Request ${queueId} failed, retrying in ${retryDelay / 60000} minutes`);
      } else {
        // Max attempts reached, mark as failed
        await request.update({
          status: 'failed',
          error: errorMessage
        });

        console.log(`Request ${queueId} failed permanently after ${request.attempts} attempts`);
      }
    } catch (error) {
      console.error('Error marking request as failed:', error);
    }
  }
}

module.exports = RateLimitService;
