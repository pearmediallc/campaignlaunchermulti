/**
 * Post-Creation Verification Service - Week 4 Enhancement
 *
 * Verifies entities actually exist on Facebook after creation API calls.
 * Detects silent failures and reconciles tracked state with Facebook reality.
 *
 * Different from VerificationService.js (which verifies field values match).
 * This service verifies EXISTENCE, not field accuracy.
 */
class PostCreationVerification {
  /**
   * Verify a single entity exists on Facebook
   *
   * @param {Object} facebookApi - FacebookAPI instance
   * @param {String} entityId - Facebook entity ID
   * @param {String} entityType - Type: 'campaign', 'ad_set', or 'ad'
   * @returns {Promise<Object>} Verification result
   */
  async verifyEntityExists(facebookApi, entityId, entityType) {
    try {
      console.log(`🔍 [PostVerification] Checking ${entityType} ${entityId} exists...`);

      // Minimal fields to confirm existence
      const fields = 'id,name,status';

      // Fetch entity from Facebook
      const entity = await facebookApi.makeRequest(
        entityId,
        'GET',
        { fields }
      );

      if (entity && entity.id) {
        console.log(`   ✅ ${entityType} ${entityId} EXISTS on Facebook`);

        return {
          exists: true,
          entityId: entity.id,
          entityName: entity.name,
          status: entity.status
        };
      } else {
        console.log(`   ❌ ${entityType} ${entityId} NOT FOUND`);

        return {
          exists: false,
          entityId
        };
      }

    } catch (error) {
      // Check if error indicates entity doesn't exist
      const notFoundErrors = [
        'does not exist',
        'not found',
        'invalid id',
        'unsupported get request'
      ];

      const isNotFound = notFoundErrors.some(msg =>
        error.message?.toLowerCase().includes(msg)
      );

      if (isNotFound) {
        console.log(`   ❌ ${entityType} ${entityId} does NOT exist (confirmed)`);

        return {
          exists: false,
          entityId,
          error: error.message
        };
      }

      // Other errors - can't confirm
      console.log(`   ⚠️  Could not verify ${entityType} ${entityId}: ${error.message}`);

      return {
        exists: null, // Unknown
        entityId,
        error: error.message,
        cannotVerify: true
      };
    }
  }

  /**
   * Verify batch of entities
   *
   * @param {Object} facebookApi - FacebookAPI instance
   * @param {Array} entities - Array of {id, type}
   * @returns {Promise<Object>} Batch results
   */
  async verifyBatch(facebookApi, entities) {
    console.log(`🔍 [PostVerification] Verifying ${entities.length} entities...`);

    const results = {
      total: entities.length,
      verified: 0,
      missing: 0,
      unknown: 0,
      details: []
    };

    for (const entity of entities) {
      const verification = await this.verifyEntityExists(facebookApi, entity.id, entity.type);

      if (verification.exists === true) {
        results.verified++;
      } else if (verification.exists === false) {
        results.missing++;
      } else {
        results.unknown++;
      }

      results.details.push({
        ...entity,
        verification
      });
    }

    console.log(`✅ [PostVerification] Results: ${results.verified}/${results.total} verified, ${results.missing} missing`);

    return results;
  }

  /**
   * Reconcile job slots with Facebook reality
   *
   * @param {Object} job - CampaignCreationJob instance
   * @param {Object} facebookApi - FacebookAPI instance
   * @returns {Promise<Object>} Reconciliation result
   */
  async reconcileJobWithFacebook(job, facebookApi) {
    console.log(`🔄 [PostVerification] Reconciling job ${job.id}...`);

    const db = require('../models');
    const { EntityCreationSlot } = db;

    const slots = await EntityCreationSlot.findAll({
      where: {
        jobId: job.id,
        status: 'created'
      }
    });

    const reconciliation = {
      totalSlots: slots.length,
      verified: 0,
      missing: 0,
      discrepancies: []
    };

    for (const slot of slots) {
      if (!slot.facebookId) {
        reconciliation.discrepancies.push({
          slotId: slot.id,
          issue: 'No Facebook ID despite created status'
        });
        continue;
      }

      const verification = await this.verifyEntityExists(facebookApi, slot.facebookId, slot.entityType);

      if (verification.exists === true) {
        reconciliation.verified++;
      } else if (verification.exists === false) {
        reconciliation.missing++;

        // Update slot to failed
        await slot.update({
          status: 'failed',
          errorMessage: 'Entity not found on Facebook'
        });

        reconciliation.discrepancies.push({
          slotId: slot.id,
          facebookId: slot.facebookId,
          issue: 'Slot marked created but entity missing on Facebook'
        });
      }
    }

    return reconciliation;
  }

  /**
   * Get current entity counts from Facebook (for idempotency)
   *
   * @param {Object} facebookApi - FacebookAPI instance
   * @param {String} campaignId - Facebook campaign ID
   * @returns {Promise<Object>} Current counts
   */
  async getCurrentCounts(facebookApi, campaignId) {
    try {
      console.log(`🔍 [PostVerification] Getting current counts for campaign ${campaignId}...`);

      const adSetsResponse = await facebookApi.makeRequest(
        `${campaignId}/adsets`,
        'GET',
        { fields: 'id,name', limit: 1000 }
      );

      const adSets = adSetsResponse.data || [];
      const adSetCount = adSets.length;

      let totalAds = 0;
      for (const adSet of adSets) {
        const adsResponse = await facebookApi.makeRequest(
          `${adSet.id}/ads`,
          'GET',
          { fields: 'id', limit: 1000 }
        );

        totalAds += (adsResponse.data || []).length;
      }

      console.log(`   Found ${adSetCount} ad sets, ${totalAds} ads`);

      return {
        campaignId,
        adSetCount,
        adCount: totalAds,
        adSets
      };

    } catch (error) {
      console.error(`❌ [PostVerification] Failed to get counts: ${error.message}`);

      return {
        campaignId,
        adSetCount: 0,
        adCount: 0,
        error: error.message
      };
    }
  }
}

module.exports = new PostCreationVerification();
