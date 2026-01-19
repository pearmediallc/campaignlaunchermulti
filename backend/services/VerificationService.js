/**
 * VerificationService
 *
 * Verifies that Facebook entities were created correctly by comparing
 * the original request data with what was actually created on Facebook.
 *
 * Features:
 * - Field-by-field comparison for campaigns, ad sets, and ads
 * - Auto-correction of mismatches by updating with correct data
 * - Integration with FailureTracker for UI display
 */

const axios = require('axios');

class VerificationService {
  constructor(facebookApi) {
    this.facebookApi = facebookApi;
    this.baseURL = `https://graph.facebook.com/${process.env.FB_API_VERSION}`;
    this.accessToken = facebookApi.accessToken;
  }

  /**
   * Verify all entities created in a strategy run
   * @param {Object} params - Verification parameters
   * @param {Object} params.originalRequest - Original frontend request data
   * @param {Object} params.createdEntities - IDs of created campaign, adsets, ads
   * @param {Boolean} params.autoCorrect - Whether to auto-correct mismatches
   * @returns {Object} - Verification result with mismatches and corrections
   */
  async verifyStrategyEntities({ originalRequest, createdEntities, autoCorrect = true }) {
    console.log('\n=== VERIFICATION SERVICE START ===');
    console.log('🔍 Verifying created entities against original request...');

    const result = {
      success: true,
      totalMismatches: 0,
      corrections: {
        attempted: 0,
        successful: 0,
        failed: 0
      },
      campaign: null,
      adsets: [],
      ads: [],
      summary: []
    };

    try {
      // 1. Verify Campaign
      if (createdEntities.campaignId) {
        const campaignVerification = await this.verifyCampaign(
          createdEntities.campaignId,
          originalRequest,
          autoCorrect
        );
        result.campaign = campaignVerification;
        result.totalMismatches += campaignVerification.mismatches.length;
        result.corrections.attempted += campaignVerification.corrections?.attempted || 0;
        result.corrections.successful += campaignVerification.corrections?.successful || 0;
        result.corrections.failed += campaignVerification.corrections?.failed || 0;

        if (campaignVerification.mismatches.length > 0) {
          result.summary.push({
            entity: 'Campaign',
            entityId: createdEntities.campaignId,
            entityName: campaignVerification.actual?.name || 'Unknown',
            mismatches: campaignVerification.mismatches,
            corrected: campaignVerification.corrections?.successful > 0
          });
        }
      }

      // 2. Verify Ad Sets
      if (createdEntities.adsetIds && createdEntities.adsetIds.length > 0) {
        for (let i = 0; i < createdEntities.adsetIds.length; i++) {
          const adsetId = createdEntities.adsetIds[i];
          const adsetOriginal = originalRequest.adsets?.[i] || originalRequest;

          const adsetVerification = await this.verifyAdSet(
            adsetId,
            adsetOriginal,
            autoCorrect
          );
          result.adsets.push(adsetVerification);
          result.totalMismatches += adsetVerification.mismatches.length;
          result.corrections.attempted += adsetVerification.corrections?.attempted || 0;
          result.corrections.successful += adsetVerification.corrections?.successful || 0;
          result.corrections.failed += adsetVerification.corrections?.failed || 0;

          if (adsetVerification.mismatches.length > 0) {
            result.summary.push({
              entity: 'Ad Set',
              entityId: adsetId,
              entityName: adsetVerification.actual?.name || `Ad Set ${i + 1}`,
              mismatches: adsetVerification.mismatches,
              corrected: adsetVerification.corrections?.successful > 0
            });
          }
        }
      }

      // 3. Verify Ads
      if (createdEntities.adIds && createdEntities.adIds.length > 0) {
        for (let i = 0; i < createdEntities.adIds.length; i++) {
          const adId = createdEntities.adIds[i];
          const adOriginal = originalRequest.ads?.[i] || originalRequest;

          const adVerification = await this.verifyAd(
            adId,
            adOriginal,
            autoCorrect
          );
          result.ads.push(adVerification);
          result.totalMismatches += adVerification.mismatches.length;
          result.corrections.attempted += adVerification.corrections?.attempted || 0;
          result.corrections.successful += adVerification.corrections?.successful || 0;
          result.corrections.failed += adVerification.corrections?.failed || 0;

          if (adVerification.mismatches.length > 0) {
            result.summary.push({
              entity: 'Ad',
              entityId: adId,
              entityName: adVerification.actual?.name || `Ad ${i + 1}`,
              mismatches: adVerification.mismatches,
              corrected: adVerification.corrections?.successful > 0
            });
          }
        }
      }

      result.success = result.totalMismatches === 0 || result.corrections.failed === 0;

      console.log('\n📊 Verification Summary:');
      console.log(`   Total Mismatches Found: ${result.totalMismatches}`);
      console.log(`   Corrections Attempted: ${result.corrections.attempted}`);
      console.log(`   Corrections Successful: ${result.corrections.successful}`);
      console.log(`   Corrections Failed: ${result.corrections.failed}`);
      console.log('=== VERIFICATION SERVICE END ===\n');

      return result;

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      result.success = false;
      result.error = error.message;
      return result;
    }
  }

  /**
   * Verify a campaign against original request
   */
  async verifyCampaign(campaignId, originalRequest, autoCorrect = true) {
    console.log(`\n🔍 Verifying Campaign: ${campaignId}`);

    const result = {
      entityId: campaignId,
      entityType: 'campaign',
      mismatches: [],
      actual: null,
      corrections: { attempted: 0, successful: 0, failed: 0 }
    };

    try {
      // Fetch actual campaign data from Facebook
      const actual = await this.fetchCampaignDetails(campaignId);
      result.actual = actual;

      // Define fields to compare
      const fieldsToCompare = [
        {
          fieldName: 'name',
          expected: originalRequest.campaignName || originalRequest.name,
          actual: actual.name,
          fbField: 'name'
        },
        {
          fieldName: 'objective',
          expected: originalRequest.objective,
          actual: actual.objective,
          fbField: 'objective'
        },
        {
          fieldName: 'status',
          expected: originalRequest.status || 'PAUSED',
          actual: actual.status,
          fbField: 'status'
        },
        {
          fieldName: 'daily_budget',
          expected: originalRequest.budgetLevel === 'campaign' && originalRequest.budgetType !== 'lifetime'
            ? this.parseBudgetToCents(originalRequest.dailyBudget)
            : null,
          actual: actual.daily_budget ? parseInt(actual.daily_budget) : null,
          fbField: 'daily_budget',
          skipIfNull: true
        },
        {
          fieldName: 'lifetime_budget',
          expected: originalRequest.budgetLevel === 'campaign' && originalRequest.budgetType === 'lifetime'
            ? this.parseBudgetToCents(originalRequest.lifetimeBudget)
            : null,
          actual: actual.lifetime_budget ? parseInt(actual.lifetime_budget) : null,
          fbField: 'lifetime_budget',
          skipIfNull: true
        },
        {
          fieldName: 'bid_strategy',
          expected: originalRequest.bidStrategy,
          actual: actual.bid_strategy,
          fbField: 'bid_strategy'
        },
        {
          fieldName: 'special_ad_categories',
          expected: originalRequest.specialAdCategories || originalRequest.special_ad_categories,
          actual: actual.special_ad_categories,
          fbField: 'special_ad_categories',
          isArray: true
        }
      ];

      // Compare fields
      for (const field of fieldsToCompare) {
        if (field.skipIfNull && field.expected === null) continue;

        const mismatch = this.compareField(field);
        if (mismatch) {
          result.mismatches.push(mismatch);
          console.log(`   ⚠️  Mismatch: ${field.fieldName}`);
          console.log(`      Expected: ${JSON.stringify(field.expected)}`);
          console.log(`      Actual: ${JSON.stringify(field.actual)}`);
        }
      }

      // Auto-correct mismatches
      if (autoCorrect && result.mismatches.length > 0) {
        const correction = await this.correctCampaign(campaignId, result.mismatches);
        result.corrections = correction;
      }

      return result;

    } catch (error) {
      console.error(`   ❌ Failed to verify campaign ${campaignId}:`, error.message);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Verify an ad set against original request
   */
  async verifyAdSet(adsetId, originalRequest, autoCorrect = true) {
    console.log(`\n🔍 Verifying Ad Set: ${adsetId}`);

    const result = {
      entityId: adsetId,
      entityType: 'adset',
      mismatches: [],
      actual: null,
      corrections: { attempted: 0, successful: 0, failed: 0 }
    };

    try {
      // Fetch actual ad set data from Facebook
      const actual = await this.fetchAdSetDetails(adsetId);
      result.actual = actual;

      // Define fields to compare
      const fieldsToCompare = [
        {
          fieldName: 'name',
          expected: originalRequest.adSetName || originalRequest.name,
          actual: actual.name,
          fbField: 'name'
        },
        {
          fieldName: 'status',
          expected: originalRequest.status || 'ACTIVE',
          actual: actual.status,
          fbField: 'status'
        },
        {
          fieldName: 'daily_budget',
          expected: originalRequest.budgetLevel !== 'campaign' && originalRequest.budgetType !== 'lifetime'
            ? this.parseBudgetToCents(originalRequest.dailyBudget)
            : null,
          actual: actual.daily_budget ? parseInt(actual.daily_budget) : null,
          fbField: 'daily_budget',
          skipIfNull: true
        },
        {
          fieldName: 'lifetime_budget',
          expected: originalRequest.budgetLevel !== 'campaign' && originalRequest.budgetType === 'lifetime'
            ? this.parseBudgetToCents(originalRequest.lifetimeBudget)
            : null,
          actual: actual.lifetime_budget ? parseInt(actual.lifetime_budget) : null,
          fbField: 'lifetime_budget',
          skipIfNull: true
        },
        {
          fieldName: 'optimization_goal',
          expected: originalRequest.optimizationGoal,
          actual: actual.optimization_goal,
          fbField: 'optimization_goal'
        },
        {
          fieldName: 'bid_strategy',
          expected: originalRequest.bidStrategy,
          actual: actual.bid_strategy,
          fbField: 'bid_strategy'
        },
        {
          fieldName: 'billing_event',
          expected: originalRequest.billingEvent || 'IMPRESSIONS',
          actual: actual.billing_event,
          fbField: 'billing_event'
        }
      ];

      // Add targeting verification
      if (originalRequest.targeting) {
        const expectedTargeting = originalRequest.targeting;
        const actualTargeting = actual.targeting || {};

        // Age targeting
        if (expectedTargeting.ageMin || expectedTargeting.age_min) {
          fieldsToCompare.push({
            fieldName: 'targeting.age_min',
            expected: expectedTargeting.ageMin || expectedTargeting.age_min,
            actual: actualTargeting.age_min,
            fbField: 'targeting.age_min'
          });
        }
        if (expectedTargeting.ageMax || expectedTargeting.age_max) {
          fieldsToCompare.push({
            fieldName: 'targeting.age_max',
            expected: expectedTargeting.ageMax || expectedTargeting.age_max,
            actual: actualTargeting.age_max,
            fbField: 'targeting.age_max'
          });
        }
      }

      // Compare fields
      for (const field of fieldsToCompare) {
        if (field.skipIfNull && field.expected === null) continue;

        const mismatch = this.compareField(field);
        if (mismatch) {
          result.mismatches.push(mismatch);
          console.log(`   ⚠️  Mismatch: ${field.fieldName}`);
          console.log(`      Expected: ${JSON.stringify(field.expected)}`);
          console.log(`      Actual: ${JSON.stringify(field.actual)}`);
        }
      }

      // Auto-correct mismatches
      if (autoCorrect && result.mismatches.length > 0) {
        const correction = await this.correctAdSet(adsetId, result.mismatches);
        result.corrections = correction;
      }

      return result;

    } catch (error) {
      console.error(`   ❌ Failed to verify ad set ${adsetId}:`, error.message);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Verify an ad against original request
   */
  async verifyAd(adId, originalRequest, autoCorrect = true) {
    console.log(`\n🔍 Verifying Ad: ${adId}`);

    const result = {
      entityId: adId,
      entityType: 'ad',
      mismatches: [],
      actual: null,
      corrections: { attempted: 0, successful: 0, failed: 0 }
    };

    try {
      // Fetch actual ad data from Facebook (including creative)
      const actual = await this.fetchAdDetails(adId);
      result.actual = actual;

      // Define fields to compare
      const fieldsToCompare = [
        {
          fieldName: 'name',
          expected: originalRequest.adName || originalRequest.name,
          actual: actual.name,
          fbField: 'name'
        },
        {
          fieldName: 'status',
          expected: originalRequest.status || 'ACTIVE',
          actual: actual.status,
          fbField: 'status'
        }
      ];

      // Verify creative fields if creative data is available
      if (actual.creative && originalRequest.creative) {
        const actualCreative = actual.creative;
        const expectedCreative = originalRequest.creative;

        // Primary text (message/body)
        if (expectedCreative.primaryText || expectedCreative.message || expectedCreative.body) {
          fieldsToCompare.push({
            fieldName: 'creative.primary_text',
            expected: expectedCreative.primaryText || expectedCreative.message || expectedCreative.body,
            actual: actualCreative.body || actualCreative.object_story_spec?.link_data?.message,
            fbField: 'creative.body'
          });
        }

        // Headline
        if (expectedCreative.headline) {
          fieldsToCompare.push({
            fieldName: 'creative.headline',
            expected: expectedCreative.headline,
            actual: actualCreative.object_story_spec?.link_data?.name,
            fbField: 'creative.headline'
          });
        }

        // Description
        if (expectedCreative.description) {
          fieldsToCompare.push({
            fieldName: 'creative.description',
            expected: expectedCreative.description,
            actual: actualCreative.object_story_spec?.link_data?.description,
            fbField: 'creative.description'
          });
        }

        // Call to Action
        if (expectedCreative.callToAction) {
          fieldsToCompare.push({
            fieldName: 'creative.call_to_action',
            expected: expectedCreative.callToAction,
            actual: actualCreative.object_story_spec?.link_data?.call_to_action?.type,
            fbField: 'creative.call_to_action'
          });
        }

        // Website URL
        if (expectedCreative.websiteUrl || expectedCreative.link) {
          fieldsToCompare.push({
            fieldName: 'creative.link',
            expected: expectedCreative.websiteUrl || expectedCreative.link,
            actual: actualCreative.object_story_spec?.link_data?.link,
            fbField: 'creative.link'
          });
        }
      }

      // Compare fields
      for (const field of fieldsToCompare) {
        if (field.skipIfNull && field.expected === null) continue;

        const mismatch = this.compareField(field);
        if (mismatch) {
          result.mismatches.push(mismatch);
          console.log(`   ⚠️  Mismatch: ${field.fieldName}`);
          console.log(`      Expected: ${JSON.stringify(field.expected)}`);
          console.log(`      Actual: ${JSON.stringify(field.actual)}`);
        }
      }

      // Auto-correct mismatches (limited for ads - name/status only)
      if (autoCorrect && result.mismatches.length > 0) {
        const correction = await this.correctAd(adId, result.mismatches);
        result.corrections = correction;
      }

      return result;

    } catch (error) {
      console.error(`   ❌ Failed to verify ad ${adId}:`, error.message);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Fetch campaign details from Facebook
   */
  async fetchCampaignDetails(campaignId) {
    const url = `${this.baseURL}/${campaignId}`;
    const params = {
      access_token: this.accessToken,
      fields: 'name,objective,status,daily_budget,lifetime_budget,bid_strategy,spend_cap,special_ad_categories,buying_type'
    };

    const response = await axios.get(url, { params, timeout: 30000 });
    return response.data;
  }

  /**
   * Fetch ad set details from Facebook
   */
  async fetchAdSetDetails(adsetId) {
    const url = `${this.baseURL}/${adsetId}`;
    const params = {
      access_token: this.accessToken,
      fields: 'name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,bid_strategy,attribution_spec,promoted_object,is_dynamic_creative'
    };

    const response = await axios.get(url, { params, timeout: 30000 });
    return response.data;
  }

  /**
   * Fetch ad details from Facebook (including creative)
   */
  async fetchAdDetails(adId) {
    const url = `${this.baseURL}/${adId}`;
    const params = {
      access_token: this.accessToken,
      fields: 'name,status,creative{id,name,body,title,object_story_spec,asset_feed_spec,effective_object_story_id}'
    };

    const response = await axios.get(url, { params, timeout: 30000 });
    return response.data;
  }

  /**
   * Compare a field and return mismatch info if different
   */
  compareField(field) {
    const { fieldName, expected, actual, fbField, isArray } = field;

    // Skip if expected is undefined or null
    if (expected === undefined || expected === null) {
      return null;
    }

    // Handle array comparison
    if (isArray) {
      const expectedArr = Array.isArray(expected) ? expected : [expected];
      const actualArr = Array.isArray(actual) ? actual : [];

      // Sort and compare arrays
      const expectedSorted = [...expectedArr].sort();
      const actualSorted = [...actualArr].sort();

      if (JSON.stringify(expectedSorted) !== JSON.stringify(actualSorted)) {
        return {
          field: fieldName,
          fbField,
          expected: expectedArr,
          actual: actualArr,
          type: 'array_mismatch'
        };
      }
      return null;
    }

    // Handle string/number comparison
    const expectedStr = String(expected).toLowerCase().trim();
    const actualStr = String(actual || '').toLowerCase().trim();

    if (expectedStr !== actualStr) {
      return {
        field: fieldName,
        fbField,
        expected,
        actual,
        type: 'value_mismatch'
      };
    }

    return null;
  }

  /**
   * Correct campaign mismatches
   */
  async correctCampaign(campaignId, mismatches) {
    const corrections = { attempted: 0, successful: 0, failed: 0 };

    // Build update params from mismatches
    const updateParams = {};

    for (const mismatch of mismatches) {
      // Only correct certain fields (not all fields can be updated after creation)
      const correctableFields = ['name', 'status', 'daily_budget', 'lifetime_budget'];

      if (correctableFields.includes(mismatch.field)) {
        // Use the fbField for the actual Facebook parameter name
        const paramName = mismatch.field.replace('targeting.', '');
        updateParams[paramName] = mismatch.expected;
        corrections.attempted++;
      }
    }

    if (Object.keys(updateParams).length === 0) {
      console.log(`   ℹ️  No correctable fields for campaign ${campaignId}`);
      return corrections;
    }

    try {
      console.log(`   🔧 Correcting campaign ${campaignId}...`);
      console.log(`      Updates: ${JSON.stringify(updateParams)}`);

      const url = `${this.baseURL}/${campaignId}`;
      await axios.post(url, null, {
        params: {
          ...updateParams,
          access_token: this.accessToken
        },
        timeout: 30000
      });

      corrections.successful = corrections.attempted;
      console.log(`   ✅ Campaign corrections applied successfully`);

    } catch (error) {
      console.error(`   ❌ Failed to correct campaign:`, error.response?.data?.error?.message || error.message);
      corrections.failed = corrections.attempted;
    }

    return corrections;
  }

  /**
   * Correct ad set mismatches
   */
  async correctAdSet(adsetId, mismatches) {
    const corrections = { attempted: 0, successful: 0, failed: 0 };

    // Build update params from mismatches
    const updateParams = {};

    for (const mismatch of mismatches) {
      // Only correct certain fields
      const correctableFields = ['name', 'status', 'daily_budget', 'lifetime_budget', 'bid_amount'];

      if (correctableFields.includes(mismatch.field)) {
        updateParams[mismatch.field] = mismatch.expected;
        corrections.attempted++;
      }
    }

    if (Object.keys(updateParams).length === 0) {
      console.log(`   ℹ️  No correctable fields for ad set ${adsetId}`);
      return corrections;
    }

    try {
      console.log(`   🔧 Correcting ad set ${adsetId}...`);
      console.log(`      Updates: ${JSON.stringify(updateParams)}`);

      const url = `${this.baseURL}/${adsetId}`;
      await axios.post(url, null, {
        params: {
          ...updateParams,
          access_token: this.accessToken
        },
        timeout: 30000
      });

      corrections.successful = corrections.attempted;
      console.log(`   ✅ Ad set corrections applied successfully`);

    } catch (error) {
      console.error(`   ❌ Failed to correct ad set:`, error.response?.data?.error?.message || error.message);
      corrections.failed = corrections.attempted;
    }

    return corrections;
  }

  /**
   * Correct ad mismatches
   */
  async correctAd(adId, mismatches) {
    const corrections = { attempted: 0, successful: 0, failed: 0 };

    // Build update params from mismatches
    const updateParams = {};

    for (const mismatch of mismatches) {
      // Only name and status can be corrected for ads
      const correctableFields = ['name', 'status'];

      if (correctableFields.includes(mismatch.field)) {
        updateParams[mismatch.field] = mismatch.expected;
        corrections.attempted++;
      }
    }

    if (Object.keys(updateParams).length === 0) {
      console.log(`   ℹ️  No correctable fields for ad ${adId} (creative fields require new creative)`);
      return corrections;
    }

    try {
      console.log(`   🔧 Correcting ad ${adId}...`);
      console.log(`      Updates: ${JSON.stringify(updateParams)}`);

      const url = `${this.baseURL}/${adId}`;
      await axios.post(url, null, {
        params: {
          ...updateParams,
          access_token: this.accessToken
        },
        timeout: 30000
      });

      corrections.successful = corrections.attempted;
      console.log(`   ✅ Ad corrections applied successfully`);

    } catch (error) {
      console.error(`   ❌ Failed to correct ad:`, error.response?.data?.error?.message || error.message);
      corrections.failed = corrections.attempted;
    }

    return corrections;
  }

  /**
   * Parse budget value to cents
   */
  parseBudgetToCents(value) {
    if (value === undefined || value === null) return null;

    // If already in cents (large number), return as is
    if (typeof value === 'number' && value > 1000) return value;

    // Parse string values
    const numValue = typeof value === 'string'
      ? parseFloat(value.replace(/[$,]/g, ''))
      : parseFloat(value);

    if (isNaN(numValue)) return null;

    // Convert dollars to cents
    return Math.round(numValue * 100);
  }

  /**
   * Format verification result for failure tracking display
   */
  formatForFailureDisplay(verificationResult, strategyType = 'unknown') {
    const displayItems = [];

    for (const item of verificationResult.summary) {
      const mismatchDetails = item.mismatches.map(m =>
        `${m.field}: expected "${m.expected}", got "${m.actual}"`
      ).join('; ');

      // Fix: Database enum expects 'adset' not 'ad set'
      const normalizedEntityType = item.entity.toLowerCase().replace(/\s+/g, ''); // Remove all spaces

      displayItems.push({
        entityType: normalizedEntityType,
        entityId: item.entityId,
        entityName: item.entityName,
        failureReason: `Verification mismatch: ${mismatchDetails}`,
        userFriendlyReason: item.corrected
          ? `Mismatches auto-corrected: ${item.mismatches.length} field(s)`
          : `${item.mismatches.length} field(s) didn't match: ${item.mismatches.map(m => m.field).join(', ')}`,
        status: item.corrected ? 'corrected' : 'mismatch',
        strategyType,
        metadata: {
          mismatches: item.mismatches,
          corrected: item.corrected
        }
      });
    }

    return displayItems;
  }
}

module.exports = VerificationService;
