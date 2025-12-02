const RateLimitService = require('./RateLimitService');
const FacebookAPI = require('./facebookApi');
const db = require('../models');

/**
 * Background processor for queued Facebook API requests
 * Runs every minute to process requests whose rate limit has reset
 */
class QueueProcessor {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
  }

  /**
   * Start the queue processor
   * @param {Number} intervalMs - Processing interval in milliseconds (default: 60000 = 1 minute)
   */
  start(intervalMs = 60000) {
    if (this.processingInterval) {
      console.log('Queue processor already running');
      return;
    }

    console.log(`Starting queue processor (interval: ${intervalMs}ms)`);

    // Run immediately
    this.processQueue();

    // Then run on interval
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);
  }

  /**
   * Stop the queue processor
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Queue processor stopped');
    }
  }

  /**
   * Process queued requests that are ready
   */
  async processQueue() {
    if (this.isProcessing) {
      console.log('Queue processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      // Get requests ready to process
      const readyRequests = await RateLimitService.getReadyRequests(10);

      if (readyRequests.length === 0) {
        console.log('[Queue Processor] No requests ready to process');
        this.isProcessing = false;
        return;
      }

      console.log(`[Queue Processor] Processing ${readyRequests.length} queued requests`);

      // Process each request
      for (const request of readyRequests) {
        await this.processRequest(request);
      }

    } catch (error) {
      console.error('[Queue Processor] Error during processing:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queued request
   * @param {Object} request - Queued request from database
   */
  async processRequest(request) {
    try {
      console.log(`[Queue Processor] Processing request ${request.id}: ${request.actionType}`);

      // Mark as processing
      await RateLimitService.markProcessing(request.id);

      // Check rate limit again before processing
      const rateLimitStatus = await RateLimitService.checkRateLimit(request.userId, request.adAccountId);

      if (!rateLimitStatus.canProceed) {
        console.log(`[Queue Processor] Request ${request.id} still rate limited, rescheduling`);

        // Reschedule for later
        await db.RequestQueue.update(
          {
            status: 'queued',
            processAfter: rateLimitStatus.resetAt
          },
          {
            where: { id: request.id }
          }
        );
        return;
      }

      // Get decrypted access token
      const accessToken = request.accessTokenEncrypted; // Getter will decrypt

      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Process based on action type
      const result = await this.executeAction(request, accessToken);

      // Mark as completed
      await RateLimitService.markCompleted(request.id, result);

      // TODO: Send notification to user
      await this.notifyUser(request.userId, {
        type: 'success',
        requestId: request.id,
        actionType: request.actionType,
        result
      });

      console.log(`[Queue Processor] Request ${request.id} completed successfully`);

    } catch (error) {
      console.error(`[Queue Processor] Error processing request ${request.id}:`, error);

      // Mark as failed (will retry if attempts < maxAttempts)
      await RateLimitService.markFailed(request.id, error.message);

      // TODO: Send error notification to user if permanently failed
      const updatedRequest = await db.RequestQueue.findByPk(request.id);
      if (updatedRequest && updatedRequest.status === 'failed') {
        await this.notifyUser(request.userId, {
          type: 'error',
          requestId: request.id,
          actionType: request.actionType,
          error: error.message
        });
      }
    }
  }

  /**
   * Execute the queued action via Facebook API
   * @param {Object} request - Queued request
   * @param {String} accessToken - User access token
   * @returns {Promise<Object>}
   */
  async executeAction(request, accessToken) {
    const { actionType, requestData, adAccountId } = request;

    // Initialize Facebook API with user credentials
    const facebookApi = new FacebookAPI({
      accessToken,
      adAccountId,
      pageId: requestData.body?.pageId,
      pixelId: requestData.body?.pixelId
    });

    switch (actionType) {
      case 'create_campaign':
        return await this.createCampaign(facebookApi, requestData);

      case 'duplicate_campaign':
        return await this.duplicateCampaign(facebookApi, requestData);

      case 'create_adset':
        return await this.createAdSet(facebookApi, requestData);

      case 'create_ad':
        return await this.createAd(facebookApi, requestData);

      case 'update_campaign':
      case 'update_adset':
      case 'update_ad':
        return await this.updateEntity(facebookApi, requestData);

      case 'batch_operation':
        return await this.batchOperation(facebookApi, requestData);

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Create a campaign
   */
  async createCampaign(facebookApi, requestData) {
    const campaignData = requestData.body;
    // Use the same logic as the original endpoint
    return await facebookApi.createCampaign(campaignData);
  }

  /**
   * Duplicate a campaign (Strategy 1-50-1)
   */
  async duplicateCampaign(facebookApi, requestData) {
    const { originalAdSetId, numberOfDuplicates, schedule } = requestData.body;

    // Use existing duplication service
    const Strategy150DuplicationService = require('./strategy150Duplication');

    return await Strategy150DuplicationService.duplicateAdSet(
      originalAdSetId,
      numberOfDuplicates,
      facebookApi.accessToken,
      schedule
    );
  }

  /**
   * Create an ad set
   */
  async createAdSet(facebookApi, requestData) {
    const adSetData = requestData.body;
    return await facebookApi.createAdSet(adSetData);
  }

  /**
   * Create an ad
   */
  async createAd(facebookApi, requestData) {
    const adData = requestData.body;
    return await facebookApi.createAd(adData);
  }

  /**
   * Update an entity (campaign, ad set, or ad)
   */
  async updateEntity(facebookApi, requestData) {
    const { entityId, updates } = requestData.body;
    // Implement update logic based on entity type
    return { success: true, entityId, updates };
  }

  /**
   * Batch operation
   */
  async batchOperation(facebookApi, requestData) {
    const { operations } = requestData.body;
    // Implement batch processing
    return { success: true, operations: operations.length };
  }

  /**
   * Notify user of queue processing result
   * @param {Number} userId - User ID
   * @param {Object} notification - Notification data
   */
  async notifyUser(userId, notification) {
    try {
      // TODO: Implement notification system (WebSocket, email, etc.)
      // For now, just log
      console.log(`[Notification] User ${userId}:`, notification);

      // Could save to a notifications table for user to check later
      // await db.Notification.create({
      //   userId,
      //   type: notification.type,
      //   message: this.formatNotificationMessage(notification),
      //   data: notification,
      //   isRead: false
      // });

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Format notification message
   */
  formatNotificationMessage(notification) {
    const { type, actionType, result, error } = notification;

    if (type === 'success') {
      return `Your ${actionType.replace(/_/g, ' ')} has been completed successfully!`;
    } else {
      return `Your ${actionType.replace(/_/g, ' ')} failed: ${error}`;
    }
  }
}

// Create singleton instance
const queueProcessor = new QueueProcessor();

module.exports = queueProcessor;
