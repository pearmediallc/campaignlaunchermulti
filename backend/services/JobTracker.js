const db = require('../models');
const RetryManager = require('./RetryManager');
const PostCreationVerification = require('./PostCreationVerification');
const RollbackManager = require('./RollbackManager');

/**
 * Job Tracker - Week 6 Enhancement (Master Coordinator)
 *
 * Coordinates all safety enhancements:
 * - Week 1: Pre-creation verification (via SafetyChecks)
 * - Week 2: Real-time slot-based tracking
 * - Week 3: Retry logic with exponential backoff
 * - Week 4: Post-creation verification
 * - Week 5: Rollback as last resort
 * - Week 6: Idempotency protection (prevents creating more than requested)
 *
 * This service is the BRAIN of the safety system.
 */
class JobTracker {
  /**
   * Create a new campaign creation job
   *
   * @param {Object} params - Job parameters
   * @param {Number} params.userId - User ID
   * @param {String} params.adAccountId - Ad Account ID
   * @param {String} params.campaignName - Campaign name
   * @param {Number} params.requestedAdSets - Number of ad sets requested
   * @param {Number} params.requestedAds - Number of ads requested
   * @returns {Promise<Object>} Created job
   */
  async createJob(params) {
    const {
      userId,
      adAccountId,
      campaignName,
      requestedAdSets,
      requestedAds
    } = params;

    console.log(`📝 [JobTracker] Creating new job...`);
    console.log(`   User: ${userId}`);
    console.log(`   Ad Account: ${adAccountId}`);
    console.log(`   Campaign: ${campaignName}`);
    console.log(`   Requested: ${requestedAdSets} ad sets, ${requestedAds} ads`);

    const { CampaignCreationJob } = db;

    const job = await CampaignCreationJob.create({
      userId,
      adAccountId,
      campaignName,
      requestedAdSets,
      requestedAds,
      status: 'pending',
      retryBudget: 5,
      adSetsCreated: 0,
      adsCreated: 0,
      retryCount: 0
    });

    console.log(`✅ [JobTracker] Job created: ID ${job.id}`);

    return job;
  }

  /**
   * Initialize slots for a job (pre-allocate slot numbers)
   *
   * @param {Object} job - CampaignCreationJob instance
   * @returns {Promise<void>}
   */
  async initializeSlots(job) {
    console.log(`📋 [JobTracker] Initializing slots for job ${job.id}...`);

    const { EntityCreationSlot } = db;
    const slotsToCreate = [];

    // Create campaign slot (always 1)
    slotsToCreate.push({
      jobId: job.id,
      slotNumber: 1,
      entityType: 'campaign',
      status: 'pending'
    });

    // Create ad set slots (1 to N)
    for (let i = 1; i <= job.requestedAdSets; i++) {
      slotsToCreate.push({
        jobId: job.id,
        slotNumber: i,
        entityType: 'ad_set',
        status: 'pending'
      });
    }

    // Create ad slots (1 to N)
    for (let i = 1; i <= job.requestedAds; i++) {
      slotsToCreate.push({
        jobId: job.id,
        slotNumber: i,
        entityType: 'ad',
        status: 'pending'
      });
    }

    await EntityCreationSlot.bulkCreate(slotsToCreate);

    console.log(`✅ [JobTracker] Created ${slotsToCreate.length} slots`);
    console.log(`   - 1 campaign slot`);
    console.log(`   - ${job.requestedAdSets} ad set slots`);
    console.log(`   - ${job.requestedAds} ad slots`);
  }

  /**
   * Mark job as started
   *
   * @param {Object} job - CampaignCreationJob instance
   * @returns {Promise<void>}
   */
  async markJobStarted(job) {
    await job.update({
      status: 'in_progress',
      startedAt: new Date()
    });

    console.log(`▶️  [JobTracker] Job ${job.id} started`);
  }

  /**
   * Mark entity as created in a slot
   *
   * @param {Object} job - CampaignCreationJob instance
   * @param {String} entityType - 'campaign', 'ad_set', or 'ad'
   * @param {Number} slotNumber - Slot number
   * @param {Object} entityData - Entity data from Facebook
   * @returns {Promise<Object>} Updated slot
   */
  async markEntityCreated(job, entityType, slotNumber, entityData) {
    const { EntityCreationSlot } = db;

    console.log(`✅ [JobTracker] Marking ${entityType} slot ${slotNumber} as created`);

    const slot = await EntityCreationSlot.findOne({
      where: {
        jobId: job.id,
        entityType,
        slotNumber
      }
    });

    if (!slot) {
      throw new Error(`Slot not found: job ${job.id}, type ${entityType}, slot ${slotNumber}`);
    }

    await slot.update({
      status: 'created',
      facebookId: entityData.id,
      entityName: entityData.name || `${entityType} ${slotNumber}`,
      creationCompletedAt: new Date()
    });

    // Update job progress counters
    if (entityType === 'campaign') {
      await job.update({
        facebookCampaignId: entityData.id
      });
    } else if (entityType === 'ad_set') {
      await job.increment('adSetsCreated', { by: 1 });
    } else if (entityType === 'ad') {
      await job.increment('adsCreated', { by: 1 });
    }

    return slot;
  }

  /**
   * Get idempotency check (how many more entities can be created)
   * CRITICAL for preventing creating more than requested
   *
   * @param {Object} job - CampaignCreationJob instance
   * @param {Object} facebookApi - FacebookAPI instance
   * @returns {Promise<Object>} Idempotency status
   */
  async getIdempotencyStatus(job, facebookApi) {
    console.log(`🔒 [JobTracker] Checking idempotency for job ${job.id}...`);

    const { EntityCreationSlot } = db;

    // Get slots marked as created
    const createdAdSetSlots = await EntityCreationSlot.count({
      where: {
        jobId: job.id,
        entityType: 'ad_set',
        status: 'created'
      }
    });

    const createdAdSlots = await EntityCreationSlot.count({
      where: {
        jobId: job.id,
        entityType: 'ad',
        status: 'created'
      }
    });

    console.log(`   Tracked state: ${createdAdSetSlots}/${job.requestedAdSets} ad sets, ${createdAdSlots}/${job.requestedAds} ads`);

    // CRITICAL: Reconcile with Facebook reality
    let facebookCounts = null;
    if (job.facebookCampaignId && facebookApi) {
      try {
        facebookCounts = await PostCreationVerification.getCurrentCounts(facebookApi, job.facebookCampaignId);

        console.log(`   Facebook reality: ${facebookCounts.adSetCount} ad sets, ${facebookCounts.adCount} ads`);

        // Detect discrepancy
        if (facebookCounts.adSetCount !== createdAdSetSlots) {
          console.log(`   ⚠️  DISCREPANCY: Tracked ${createdAdSetSlots} ad sets, Facebook has ${facebookCounts.adSetCount}`);
        }

        if (facebookCounts.adCount !== createdAdSlots) {
          console.log(`   ⚠️  DISCREPANCY: Tracked ${createdAdSlots} ads, Facebook has ${facebookCounts.adCount}`);
        }

      } catch (error) {
        console.log(`   ⚠️  Could not get Facebook counts: ${error.message}`);
      }
    }

    // Use Facebook reality if available (more accurate), otherwise use tracked state
    const actualAdSets = facebookCounts?.adSetCount ?? createdAdSetSlots;
    const actualAds = facebookCounts?.adCount ?? createdAdSlots;

    // Calculate how many MORE can be created (idempotency protection)
    const adSetsRemaining = Math.max(0, job.requestedAdSets - actualAdSets);
    const adsRemaining = Math.max(0, job.requestedAds - actualAds);

    const status = {
      jobId: job.id,
      requested: {
        adSets: job.requestedAdSets,
        ads: job.requestedAds
      },
      tracked: {
        adSets: createdAdSetSlots,
        ads: createdAdSlots
      },
      facebook: facebookCounts ? {
        adSets: facebookCounts.adSetCount,
        ads: facebookCounts.adCount
      } : null,
      actual: {
        adSets: actualAdSets,
        ads: actualAds
      },
      remaining: {
        adSets: adSetsRemaining,
        ads: adsRemaining
      },
      canCreateMore: adSetsRemaining > 0 || adsRemaining > 0,
      atLimit: adSetsRemaining === 0 && adsRemaining === 0,
      exceededLimit: actualAdSets > job.requestedAdSets || actualAds > job.requestedAds
    };

    if (status.exceededLimit) {
      console.log(`   🚨 EXCEEDED LIMIT! Created more than requested!`);
    } else if (status.atLimit) {
      console.log(`   ✅ At limit - no more entities should be created`);
    } else {
      console.log(`   📊 Can create ${adSetsRemaining} more ad sets, ${adsRemaining} more ads`);
    }

    return status;
  }

  /**
   * Handle job failure (decides whether to retry or rollback)
   *
   * @param {Object} job - CampaignCreationJob instance
   * @param {Error} error - Error that caused failure
   * @param {Object} facebookApi - FacebookAPI instance
   * @returns {Promise<Object>} Action decision
   */
  async handleJobFailure(job, error, facebookApi) {
    console.log(`❌ [JobTracker] Handling failure for job ${job.id}...`);
    console.log(`   Error: ${error.message}`);

    // Increment retry count
    await job.update({
      retryCount: job.retryCount + 1,
      lastError: error.message,
      lastRetryAt: new Date(),
      errorHistory: db.Sequelize.fn(
        'JSON_ARRAY_APPEND',
        db.Sequelize.col('error_history'),
        '$',
        JSON.stringify({
          timestamp: new Date(),
          error: error.message,
          attempt: job.retryCount + 1
        })
      )
    });

    // Refresh job to get updated retry count
    await job.reload();

    // Check if rollback should be triggered
    const rollbackDecision = await RollbackManager.shouldTriggerRollback(job, error);

    if (rollbackDecision.shouldRollback) {
      console.log(`🔄 [JobTracker] Rollback triggered: ${rollbackDecision.reason}`);

      return {
        action: 'rollback',
        reason: rollbackDecision.reason,
        severity: rollbackDecision.severity
      };
    }

    // Check if we can retry
    if (job.retryCount < job.retryBudget) {
      console.log(`🔄 [JobTracker] Will retry (attempt ${job.retryCount + 1}/${job.retryBudget})`);

      return {
        action: 'retry',
        attempt: job.retryCount + 1,
        remaining: job.retryBudget - job.retryCount
      };
    }

    // Retry budget exhausted
    console.log(`🚫 [JobTracker] Retry budget exhausted - will rollback`);

    return {
      action: 'rollback',
      reason: 'Retry budget exhausted',
      severity: 'HIGH'
    };
  }

  /**
   * Mark job as completed
   *
   * @param {Object} job - CampaignCreationJob instance
   * @returns {Promise<void>}
   */
  async markJobCompleted(job) {
    await job.update({
      status: 'completed',
      completedAt: new Date()
    });

    console.log(`✅ [JobTracker] Job ${job.id} completed successfully`);
  }

  /**
   * Mark job as failed
   *
   * @param {Object} job - CampaignCreationJob instance
   * @param {String} reason - Failure reason
   * @returns {Promise<void>}
   */
  async markJobFailed(job, reason) {
    await job.update({
      status: 'failed',
      lastError: reason,
      completedAt: new Date()
    });

    console.log(`❌ [JobTracker] Job ${job.id} marked as failed: ${reason}`);
  }

  /**
   * Get job progress summary
   *
   * @param {Object} job - CampaignCreationJob instance
   * @returns {Promise<Object>} Progress summary
   */
  async getJobProgress(job) {
    const { EntityCreationSlot } = db;

    const slotCounts = await EntityCreationSlot.findAll({
      where: { jobId: job.id },
      attributes: [
        'entityType',
        'status',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: ['entityType', 'status'],
      raw: true
    });

    const progress = {
      jobId: job.id,
      status: job.status,
      adSets: {
        requested: job.requestedAdSets,
        created: job.adSetsCreated,
        pending: 0,
        failed: 0
      },
      ads: {
        requested: job.requestedAds,
        created: job.adsCreated,
        pending: 0,
        failed: 0
      },
      retries: {
        count: job.retryCount,
        budget: job.retryBudget,
        remaining: job.retryBudget - job.retryCount
      }
    };

    // Fill in slot status counts
    slotCounts.forEach(row => {
      if (row.entityType === 'ad_set') {
        if (row.status === 'pending') progress.adSets.pending = row.count;
        if (row.status === 'failed') progress.adSets.failed = row.count;
      } else if (row.entityType === 'ad') {
        if (row.status === 'pending') progress.ads.pending = row.count;
        if (row.status === 'failed') progress.ads.failed = row.count;
      }
    });

    return progress;
  }
}

module.exports = new JobTracker();
