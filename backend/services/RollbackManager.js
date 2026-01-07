/**
 * Rollback Manager - Week 5 Enhancement
 *
 * Handles rollback of partially created campaigns as LAST RESORT only.
 *
 * Rollback is triggered when:
 * 1. Retry budget exhausted and still have failures
 * 2. Permanent errors that cannot be recovered (account suspended, etc.)
 * 3. User explicitly requests rollback
 *
 * Philosophy: "Rollback is admission of failure - use only when truly impossible to proceed"
 */
class RollbackManager {
  /**
   * Determine if rollback should be triggered
   *
   * @param {Object} job - CampaignCreationJob instance
   * @param {Object} error - Last error encountered
   * @returns {Promise<Object>} Rollback decision
   */
  async shouldTriggerRollback(job, error) {
    console.log(`🔍 [RollbackManager] Evaluating rollback for job ${job.id}...`);

    const decision = {
      shouldRollback: false,
      reason: null,
      severity: null
    };

    // Check 1: Retry budget exhausted?
    if (job.retryCount >= job.retryBudget) {
      console.log(`   ⚠️  Retry budget exhausted (${job.retryCount}/${job.retryBudget})`);

      decision.shouldRollback = true;
      decision.reason = 'Retry budget exhausted - unable to complete creation';
      decision.severity = 'HIGH';

      return decision;
    }

    // Check 2: Permanent error that can't be retried?
    if (error?.message?.includes('PERMANENT_ERROR')) {
      console.log(`   ⚠️  Permanent error detected: ${error.message}`);

      decision.shouldRollback = true;
      decision.reason = 'Permanent error - cannot proceed';
      decision.severity = 'CRITICAL';

      return decision;
    }

    // Check 3: Job status is 'failed'?
    if (job.status === 'failed') {
      console.log(`   ⚠️  Job marked as failed`);

      decision.shouldRollback = true;
      decision.reason = 'Job marked as failed';
      decision.severity = 'HIGH';

      return decision;
    }

    console.log(`   ✅ No rollback needed - can continue retrying`);
    return decision;
  }

  /**
   * Execute rollback for a job
   * Deletes all successfully created entities on Facebook
   *
   * @param {Object} job - CampaignCreationJob instance
   * @param {Object} facebookApi - FacebookAPI instance
   * @param {Object} options - Rollback options
   * @param {Boolean} options.userConfirmed - Whether user confirmed rollback
   * @param {String} options.reason - Reason for rollback
   * @returns {Promise<Object>} Rollback result
   */
  async executeRollback(job, facebookApi, options = {}) {
    const {
      userConfirmed = false,
      reason = 'Unknown'
    } = options;

    console.log(`\n🔄 [RollbackManager] ===============================================`);
    console.log(`🔄 [RollbackManager] EXECUTING ROLLBACK FOR JOB ${job.id}`);
    console.log(`🔄 [RollbackManager] Reason: ${reason}`);
    console.log(`🔄 [RollbackManager] User Confirmed: ${userConfirmed}`);
    console.log(`🔄 [RollbackManager] ===============================================\n`);

    const db = require('../models');
    const { EntityCreationSlot } = db;

    const rollbackResult = {
      jobId: job.id,
      success: false,
      entitiesDeleted: 0,
      entitiesFailed: 0,
      details: [],
      errors: []
    };

    try {
      // Get all created entities (in reverse order: ads → ad sets → campaign)
      const slots = await EntityCreationSlot.findAll({
        where: {
          jobId: job.id,
          status: 'created', // Only rollback successfully created entities
          facebookId: { [db.Sequelize.Op.ne]: null }
        },
        order: [
          // Delete in reverse order: ads first, then ad sets, then campaign
          [db.Sequelize.literal("CASE WHEN entity_type = 'ad' THEN 1 WHEN entity_type = 'ad_set' THEN 2 ELSE 3 END"), 'ASC']
        ]
      });

      console.log(`📋 [RollbackManager] Found ${slots.length} entities to rollback`);

      if (slots.length === 0) {
        console.log(`   ℹ️  No entities to rollback`);

        rollbackResult.success = true;
        return rollbackResult;
      }

      // Delete each entity
      for (const slot of slots) {
        try {
          console.log(`   🗑️  Deleting ${slot.entityType} ${slot.facebookId} (${slot.entityName})...`);

          await this.deleteEntity(facebookApi, slot.facebookId);

          // Mark slot as rolled back
          await slot.update({
            status: 'rolled_back'
          });

          rollbackResult.entitiesDeleted++;
          rollbackResult.details.push({
            slotId: slot.id,
            entityType: slot.entityType,
            facebookId: slot.facebookId,
            entityName: slot.entityName,
            status: 'deleted'
          });

          console.log(`      ✅ Deleted successfully`);

        } catch (deleteError) {
          console.error(`      ❌ Failed to delete: ${deleteError.message}`);

          rollbackResult.entitiesFailed++;
          rollbackResult.errors.push({
            slotId: slot.id,
            entityType: slot.entityType,
            facebookId: slot.facebookId,
            error: deleteError.message
          });

          rollbackResult.details.push({
            slotId: slot.id,
            entityType: slot.entityType,
            facebookId: slot.facebookId,
            entityName: slot.entityName,
            status: 'delete_failed',
            error: deleteError.message
          });
        }
      }

      // Update job status
      await job.update({
        status: 'rolled_back',
        rollbackTriggered: true,
        rollbackReason: reason,
        rollbackAt: new Date()
      });

      rollbackResult.success = rollbackResult.entitiesFailed === 0;

      console.log(`\n✅ [RollbackManager] Rollback complete:`);
      console.log(`   Entities deleted: ${rollbackResult.entitiesDeleted}`);
      console.log(`   Failed to delete: ${rollbackResult.entitiesFailed}`);

      return rollbackResult;

    } catch (error) {
      console.error(`❌ [RollbackManager] Rollback failed: ${error.message}`);

      rollbackResult.success = false;
      rollbackResult.errors.push({
        type: 'rollback_error',
        error: error.message
      });

      return rollbackResult;
    }
  }

  /**
   * Delete a single entity on Facebook
   *
   * @param {Object} facebookApi - FacebookAPI instance
   * @param {String} entityId - Facebook entity ID
   * @returns {Promise<void>}
   */
  async deleteEntity(facebookApi, entityId) {
    try {
      await facebookApi.makeRequest(entityId, 'DELETE');
      return true;
    } catch (error) {
      // Check if entity already deleted (not found)
      const alreadyDeleted = [
        'does not exist',
        'not found',
        'invalid id'
      ].some(msg => error.message?.toLowerCase().includes(msg));

      if (alreadyDeleted) {
        console.log(`      ℹ️  Entity ${entityId} already deleted or doesn't exist`);
        return true; // Treat as success
      }

      throw error;
    }
  }

  /**
   * Get rollback preview (what would be deleted)
   *
   * @param {Object} job - CampaignCreationJob instance
   * @returns {Promise<Object>} Preview of entities to be deleted
   */
  async getRollbackPreview(job) {
    const db = require('../models');
    const { EntityCreationSlot } = db;

    const slots = await EntityCreationSlot.findAll({
      where: {
        jobId: job.id,
        status: 'created',
        facebookId: { [db.Sequelize.Op.ne]: null }
      },
      order: [['entityType', 'ASC']]
    });

    const preview = {
      totalEntities: slots.length,
      byCampaign: 0,
      byAdSet: 0,
      byAd: 0,
      entities: []
    };

    for (const slot of slots) {
      preview.entities.push({
        type: slot.entityType,
        id: slot.facebookId,
        name: slot.entityName
      });

      if (slot.entityType === 'campaign') preview.byType.campaign++;
      if (slot.entityType === 'ad_set') preview.byType.adSet++;
      if (slot.entityType === 'ad') preview.byType.ad++;
    }

    return preview;
  }
}

module.exports = new RollbackManager();
