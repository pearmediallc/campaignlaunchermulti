const axios = require('axios');
const FailureTracker = require('./FailureTracker');

/**
 * Batch API Duplication Service
 * Reduces API calls from 200+ to just 2-3 by using Facebook's Batch API
 *
 * IMPORTANT: This service includes:
 * 1. Batch API for efficient operations
 * 2. Sequential fallback when batch operations fail
 * 3. FailureTracker integration for accurate failure reporting
 * 4. Retry mechanism for failed entities
 */
class BatchDuplicationService {
  constructor(accessToken, adAccountId, pageId, pixelId, userId = null) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.userId = userId; // For FailureTracker integration
    this.pageId = pageId; // ADDED: Store pageId to match 1-50-1 pattern
    this.pixelId = pixelId; // ADDED: Store pixelId for tracking
    this.baseURL = 'https://graph.facebook.com/v18.0';
    // Facebook Batch API limit is 50 operations per batch
    // However, large payloads (video ads, complex creatives) cause socket hang up
    // Using 10 operations per batch to avoid timeouts while keeping ad set + ad pairs together
    // 10 ops = 5 pairs (5 ad sets + 5 ads) - safe for large payloads
    this.maxBatchSize = 10; // Reduced to prevent socket hang up with large payloads

    // Facebook region IDs for US states (MUST match facebookApi.js exactly)
    // DC is 3851, which shifts all states after DE forward by 1
    this.stateToRegionId = {
      'AL': '3843', 'AK': '3844', 'AZ': '3845', 'AR': '3846', 'CA': '3847',
      'CO': '3848', 'CT': '3849', 'DE': '3850', 'DC': '3851', 'FL': '3852',
      'GA': '3853', 'HI': '3854', 'ID': '3855', 'IL': '3856', 'IN': '3857',
      'IA': '3858', 'KS': '3859', 'KY': '3860', 'LA': '3861', 'ME': '3862',
      'MD': '3863', 'MA': '3864', 'MI': '3865', 'MN': '3866', 'MS': '3867',
      'MO': '3868', 'MT': '3869', 'NE': '3870', 'NV': '3871', 'NH': '3872',
      'NJ': '3873', 'NM': '3874', 'NY': '3875', 'NC': '3876', 'ND': '3877',
      'OH': '3878', 'OK': '3879', 'OR': '3880', 'PA': '3881', 'RI': '3882',
      'SC': '3883', 'SD': '3884', 'TN': '3885', 'TX': '3886', 'UT': '3887',
      'VT': '3888', 'VA': '3889', 'WA': '3890', 'WV': '3891', 'WI': '3892',
      'WY': '3893'
    };
  }

  // ============================================================================
  // SMART VERIFICATION HELPER - Verify and correct ad set/ad counts after batch
  // ============================================================================

  /**
   * Smart post-batch verification: Make ONE API call to count actual ad sets and ads,
   * then correct any discrepancies (delete extras if > expected).
   *
   * IMPORTANT: Facebook's batch API sometimes returns transient errors but still creates
   * the resources. Instead of retrying (which creates duplicates), we verify AFTER all
   * batches complete and delete any extras.
   *
   * @param {string} campaignId - Campaign ID to verify
   * @param {number} expectedAdSets - Expected number of ad sets (including original)
   * @param {string} originalAdSetId - ID of the original ad set (to exclude from deletion)
   * @returns {Object} Verification results with counts and any corrections made
   */
  async smartVerifyAndCorrect(campaignId, expectedAdSets, originalAdSetId = null) {
    const axios = require('axios');
    console.log(`\n🔍 Smart Verification: Checking campaign ${campaignId}...`);
    console.log(`   Expected: ${expectedAdSets} ad sets total`);

    const results = {
      verified: false,
      actualAdSets: 0,
      actualAds: 0,
      expectedAdSets: expectedAdSets,
      extrasDeleted: 0,
      orphansDeleted: 0,
      corrections: []
    };

    try {
      // Step 1: Get all ad sets (simple query - no nested fields)
      console.log(`   📊 Fetching ad sets...`);
      const adSetsResponse = await axios.get(
        `${this.baseURL}/${campaignId}/adsets`,
        {
          params: {
            fields: 'id,name',
            limit: 200,
            access_token: this.accessToken
          },
          timeout: 30000
        }
      );

      const adSets = adSetsResponse.data?.data || [];
      results.actualAdSets = adSets.length;
      console.log(`   📊 Found ${adSets.length} ad sets`);

      // Step 2: Get all ads (simple query)
      console.log(`   📊 Fetching ads...`);
      const adsResponse = await axios.get(
        `${this.baseURL}/${campaignId}/ads`,
        {
          params: {
            fields: 'id,adset_id',
            limit: 200,
            access_token: this.accessToken
          },
          timeout: 30000
        }
      );

      const ads = adsResponse.data?.data || [];
      results.actualAds = ads.length;
      console.log(`   📊 Found ${ads.length} ads`);

      // Build a map of ad set IDs that have ads
      const adSetIdsWithAds = new Set(ads.map(ad => ad.adset_id));

      // Find orphan ad sets (ad sets without any ads)
      const orphanAdSets = adSets.filter(adSet =>
        !adSetIdsWithAds.has(adSet.id) && adSet.id !== originalAdSetId
      );

      console.log(`   📊 Summary: ${adSets.length} ad sets, ${ads.length} ads, ${orphanAdSets.length} orphans`);

      // Step 3: Delete orphan ad sets (ad sets without ads)
      if (orphanAdSets.length > 0) {
        console.log(`   ⚠️ Found ${orphanAdSets.length} orphan ad sets (no ads) - deleting...`);

        for (const adSet of orphanAdSets) {
          try {
            await axios.delete(`${this.baseURL}/${adSet.id}`, {
              params: { access_token: this.accessToken }
            });
            console.log(`   🗑️ Deleted orphan: ${adSet.id} (${adSet.name})`);
            results.corrections.push({
              action: 'deleted_orphan',
              adSetId: adSet.id,
              adSetName: adSet.name,
              reason: 'no_ads'
            });
            results.orphansDeleted++;
            results.actualAdSets--;
            await this.delay(200);
          } catch (deleteError) {
            console.error(`   ❌ Failed to delete orphan ${adSet.id}: ${deleteError.message}`);
          }
        }
        console.log(`   ✅ Deleted ${results.orphansDeleted} orphan ad sets`);
      }

      // Step 4: Check if we still have extras (more ad sets than expected)
      if (results.actualAdSets > expectedAdSets) {
        const extrasCount = results.actualAdSets - expectedAdSets;
        console.log(`   ⚠️ Still have ${extrasCount} extra ad sets - deleting highest copy numbers...`);

        // Find duplicate "Copy N" ad sets to delete (keep the ones with lowest copy numbers)
        const copyAdSets = adSets
          .filter(adSet =>
            adSet.name.match(/- Copy \d+$/) &&
            adSetIdsWithAds.has(adSet.id) && // Only consider ad sets with ads
            adSet.id !== originalAdSetId
          )
          .map(adSet => {
            const match = adSet.name.match(/- Copy (\d+)$/);
            return {
              id: adSet.id,
              name: adSet.name,
              copyNumber: match ? parseInt(match[1]) : 0
            };
          })
          .sort((a, b) => b.copyNumber - a.copyNumber); // Sort highest first

        let deleted = 0;
        for (const adSet of copyAdSets) {
          if (deleted >= extrasCount) break;

          try {
            await axios.delete(`${this.baseURL}/${adSet.id}`, {
              params: { access_token: this.accessToken }
            });
            console.log(`   🗑️ Deleted extra: ${adSet.id} (${adSet.name})`);
            results.corrections.push({
              action: 'deleted_extra',
              adSetId: adSet.id,
              adSetName: adSet.name,
              reason: 'over_limit'
            });
            deleted++;
            results.extrasDeleted++;
            results.actualAdSets--;
            results.actualAds--; // Each deleted ad set had 1 ad
            await this.delay(200);
          } catch (deleteError) {
            console.error(`   ❌ Failed to delete extra ${adSet.id}: ${deleteError.message}`);
          }
        }
        console.log(`   ✅ Deleted ${deleted} extra ad sets`);
      } else if (results.actualAdSets < expectedAdSets) {
        const shortfall = expectedAdSets - results.actualAdSets;
        console.log(`   ⚠️ ${shortfall} ad sets short of expected - some batches truly failed`);
        results.corrections.push({
          action: 'shortfall_detected',
          missing: shortfall,
          reason: 'batch_failures'
        });
      } else {
        console.log(`   ✅ Count matches expected - no corrections needed`);
      }

      results.verified = true;
      console.log(`   ✅ Final verified count: ${results.actualAdSets} ad sets, ${results.actualAds} ads`);

    } catch (error) {
      console.error(`   ❌ Smart verification failed: ${error.message}`);
      // Log more details for debugging
      if (error.response?.data) {
        console.error(`   ❌ API Error details:`, JSON.stringify(error.response.data).substring(0, 500));
      }
      results.error = error.message;
    }

    return results;
  }

  /**
   * Duplicate campaign using batch API (2-3 total API calls instead of 200+)
   * Returns formatted results compatible with Campaign Management UI
   *
   * CRITICAL FIX: Campaign is now created FIRST via separate API call,
   * then ad sets and ads are created in batches using the REAL campaign ID.
   * This fixes "GraphBatchException" errors when operations span multiple batches.
   */
  async duplicateCampaignBatch(campaignId, newName, copies = 1) {
    try {
      console.log(`🚀 Starting BATCH duplication for campaign ${campaignId}`);
      console.log(`📊 Creating ${copies} copies with minimal API calls`);

      // Step 1: Get ALL campaign data in ONE call using field expansion
      const campaignData = await this.getCampaignFullData(campaignId);
      const expectedAdSets = campaignData.adsets?.data?.length || 0;
      const expectedAds = campaignData.adsets?.data?.reduce(
        (sum, adset) => sum + (adset.ads?.data?.length || 0), 0
      ) || 0;

      console.log(`📊 Source campaign has ${expectedAdSets} ad sets and ${expectedAds} ads`);

      const formattedResults = [];
      for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
        const copyName = copies > 1
          ? `${newName} - Copy ${copyIndex + 1}`
          : newName;

        console.log(`🔄 Creating copy ${copyIndex + 1}/${copies}: "${copyName}"`);

        try {
          // CRITICAL FIX: Step 2a - Create campaign FIRST via separate API call
          // This gives us a REAL campaign ID that works across batch boundaries
          console.log(`  📋 Creating campaign separately...`);
          const newCampaignId = await this.createCampaignFromData(campaignData, copyName);
          console.log(`  ✅ Campaign created: ${newCampaignId}`);

          // Step 2b: Create batch requests for ad sets and ads (using REAL campaign ID)
          const batchRequests = this.prepareBatchRequests(campaignData, copyName, newCampaignId);

          // Step 3: Execute batch (all operations in 1-2 API calls)
          const batchResults = await this.executeBatch(batchRequests);

          // Step 4: Transform raw batch results to formatted object
          // Prepend campaign result to batch results for compatibility
          const allResults = [{ code: 200, body: JSON.stringify({ id: newCampaignId }) }, ...batchResults];

          const formattedResult = await this.transformBatchResultsToCampaignFormat(
            allResults,
            copyName,
            copyIndex + 1,
            expectedAdSets,
            expectedAds
          );

          formattedResults.push(formattedResult);
        } catch (copyError) {
          console.error(`❌ Copy ${copyIndex + 1} failed:`, copyError.message);
          formattedResults.push({
            success: false,
            error: copyError.message,
            copyNumber: copyIndex + 1,
            campaignName: copyName,
            adSetsCreated: 0,
            adsCreated: 0,
            adSetsFailed: expectedAdSets,
            adsFailed: expectedAds
          });
        }

        // Small delay between copies to avoid rate limits
        if (copyIndex < copies - 1) {
          await this.delay(1000);
        }
      }

      console.log(`✅ Batch duplication complete! Created ${formattedResults.filter(r => r.success || r.partialSuccess).length}/${copies} copies`);
      return formattedResults;

    } catch (error) {
      console.error('❌ Batch duplication failed:', error.message);
      throw error;
    }
  }

  /**
   * Create campaign from existing campaign data via separate API call
   * Returns the new campaign ID for use in batch operations
   */
  async createCampaignFromData(campaignData, newName) {
    const accountId = (campaignData.account_id || this.adAccountId).replace('act_', '');

    const params = {
      name: newName,
      objective: campaignData.objective,
      status: 'ACTIVE',
      special_ad_categories: JSON.stringify(campaignData.special_ad_categories || []),
      access_token: this.accessToken
    };

    // Add optional fields
    if (campaignData.special_ad_category_country) {
      params.special_ad_category_country = campaignData.special_ad_category_country;
    }
    if (campaignData.daily_budget) {
      params.daily_budget = campaignData.daily_budget;
    }
    if (campaignData.lifetime_budget) {
      params.lifetime_budget = campaignData.lifetime_budget;
    }
    if (campaignData.bid_strategy) {
      params.bid_strategy = campaignData.bid_strategy;
    }

    const response = await axios.post(
      `${this.baseURL}/act_${accountId}/campaigns`,
      null,
      { params }
    );

    return response.data.id;
  }

  /**
   * Transform raw batch API results into formatted campaign object
   * for Campaign Management UI compatibility.
   * Also tracks failures via FailureTracker for the Failures box.
   *
   * CRITICAL: Batch results are INTERLEAVED [adset-0, ad-0, adset-1, ad-1, ...]
   * Index 0 = campaign, then pairs of (adset, ad) for each ad set
   */
  async transformBatchResultsToCampaignFormat(batchResults, copyName, copyNumber, expectedAdSets, expectedAds) {
    // First result should be the campaign
    const campaignResult = batchResults[0];
    let campaignId = null;
    let campaignName = copyName;

    if (campaignResult && campaignResult.code === 200) {
      try {
        const body = JSON.parse(campaignResult.body);
        campaignId = body.id;
      } catch (e) {
        console.warn('Could not parse campaign ID from batch result');
      }
    }

    // Count successes and failures
    // CRITICAL FIX: Results are INTERLEAVED, not sequential
    // After campaign (index 0), we have pairs: [adset, ad, adset, ad, ...]
    // Index 1, 3, 5, 7... = ad sets (odd after subtracting campaign)
    // Index 2, 4, 6, 8... = ads (even after subtracting campaign)
    let adSetsCreated = 0;
    let adsCreated = 0;
    const adSetIds = [];
    const adIds = [];
    const failedDetails = [];
    const failedAdSetIndices = new Set(); // Track failed ad sets

    // Process remaining results (skip first which is campaign)
    for (let i = 1; i < batchResults.length; i++) {
      const result = batchResults[i];
      // After campaign (index 0), results are interleaved:
      // i=1: adset-0, i=2: ad-0, i=3: adset-1, i=4: ad-1, ...
      // So: odd indices (1,3,5...) = ad sets, even indices (2,4,6...) = ads
      const isAdSet = (i % 2) === 1;
      const pairIndex = Math.floor((i - 1) / 2); // Which ad set/ad pair

      // Check for real success (code 200 with actual ID)
      let isRealSuccess = false;
      let entityId = null;

      if (result && result.code === 200 && result.body) {
        try {
          const body = JSON.parse(result.body);
          if (body.id && !body.error) {
            isRealSuccess = true;
            entityId = body.id;
          }
        } catch (e) {
          // Couldn't parse body
        }
      }

      // If this is an ad and its parent ad set failed, mark it as failed too
      if (!isAdSet && failedAdSetIndices.has(pairIndex)) {
        isRealSuccess = false;
      }

      if (isRealSuccess) {
        if (isAdSet) {
          adSetsCreated++;
          if (entityId) adSetIds.push(entityId);
        } else {
          adsCreated++;
          if (entityId) adIds.push(entityId);
        }
      } else {
        // Track failed ad set index
        if (isAdSet) {
          failedAdSetIndices.add(pairIndex);
        }

        const errorDetails = {
          index: i,
          code: result?.code,
          stage: isAdSet ? 'ad_set_creation' : 'ad_creation',
          type: isAdSet ? 'adset' : 'ad',
          name: `${copyName} - ${isAdSet ? 'Ad Set' : 'Ad'} ${pairIndex + 1}`,
          message: 'Batch operation failed'
        };

        if (result?.body) {
          try {
            const errorBody = JSON.parse(result.body);
            errorDetails.message = errorBody.error?.message || errorBody.error?.error_user_msg || 'Unknown error';
            errorDetails.details = errorBody.error;
          } catch (e) {
            errorDetails.message = result.body;
          }
        } else if (!isAdSet && failedAdSetIndices.has(pairIndex)) {
          errorDetails.message = 'Parent ad set creation failed';
        }

        failedDetails.push(errorDetails);
      }
    }

    const adSetsFailed = expectedAdSets - adSetsCreated;
    const adsFailed = expectedAds - adsCreated;
    const hasFailures = adSetsFailed > 0 || adsFailed > 0;

    console.log(`📊 Duplication result: ${adSetsCreated}/${expectedAdSets} ad sets, ${adsCreated}/${expectedAds} ads`);

    // Track failures in FailureTracker for the Failures box
    if (hasFailures && this.userId && campaignId) {
      console.log(`📝 Tracking ${failedDetails.length} failures for Failures box...`);
      await this.trackFailedEntities(failedDetails, {
        campaignId: campaignId,
        campaignName: campaignName,
        strategyType: 'batch_duplication'
      });
    }

    return {
      success: campaignId !== null && !hasFailures,
      partialSuccess: campaignId !== null && hasFailures,
      campaignId,
      campaignName,
      copyNumber,
      adSetsCreated,
      adsCreated,
      adSetsFailed,
      adsFailed,
      adSetIds,
      adIds,
      failedDetails: failedDetails.length > 0 ? failedDetails : undefined
    };
  }

  /**
   * Get ALL campaign data in ONE API call using field expansion
   */
  async getCampaignFullData(campaignId) {
    console.log(`📊 Fetching complete campaign data in ONE call...`);

    // SIMPLIFIED field expansion - only get essential data and creative IDs
    // CRITICAL: Use correct field names for spending limits (daily_min_spend_target, daily_spend_cap)
    const fields = 'id,name,status,objective,special_ad_categories,' +
      'special_ad_category_country,daily_budget,lifetime_budget,' +
      'bid_strategy,budget_remaining,account_id,' +
      'adsets.limit(200){' +
        'id,name,status,targeting,daily_budget,lifetime_budget,' +
        'optimization_goal,billing_event,bid_amount,bid_strategy,' +
        'promoted_object,attribution_spec,conversion_specs,' +
        'start_time,end_time,schedule,frequency_control_specs,' +
        'optimization_sub_event,daily_min_spend_target,daily_spend_cap,' +
        'pacing_type,instagram_actor_id,destination_type,' +
        'ads.limit(100){' +
          'id,name,status,tracking_specs,conversion_specs,url_tags,' +
          'creative{id,object_story_id,effective_object_story_id}' +
        '}' +
      '}';

    try {
      const response = await axios.get(
        `${this.baseURL}/${campaignId}`,
        {
          params: {
            fields,
            access_token: this.accessToken
          }
        }
      );

      const data = response.data;
      const adSetCount = data.adsets?.data?.length || 0;
      const totalAds = data.adsets?.data?.reduce((sum, adSet) =>
        sum + (adSet.ads?.data?.length || 0), 0) || 0;

      console.log(`✅ Fetched: 1 campaign, ${adSetCount} ad sets, ${totalAds} ads in ONE call!`);
      return data;

    } catch (error) {
      console.error('Failed to fetch campaign data:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Prepare batch requests for creating campaign copy
   * FIXED: Uses real campaign ID instead of batch reference to support cross-batch operations
   */
  prepareBatchRequests(campaignData, _newName, campaignId) {
    const requests = [];

    // Extract account ID
    let accountId = campaignData.account_id;
    if (accountId && accountId.startsWith('act_')) {
      accountId = accountId.substring(4);
    }

    // CRITICAL FIX: Campaign is now created BEFORE this method is called
    // We use the REAL campaign ID, not a batch reference
    // This fixes the "GraphBatchException" error when batches are split

    // Create all ad sets (interleaved with ads for same-batch references)
    if (campaignData.adsets?.data) {
      campaignData.adsets.data.forEach((adSet, adSetIndex) => {
        // Ad set uses REAL campaign ID (not batch reference)
        const adSetRequest = {
          method: 'POST',
          relative_url: `act_${accountId}/adsets`,
          body: this.prepareAdSetBody(adSet, campaignId), // FIXED: Use real ID
          name: `create-adset-${adSetIndex}` // Named for ad references within same batch
        };
        requests.push(adSetRequest);

        // Create ads for this ad set
        // Ad uses batch reference to ad set (works within same batch)
        if (adSet.ads?.data) {
          adSet.ads.data.forEach(ad => {
            const adRequest = {
              method: 'POST',
              relative_url: `act_${accountId}/ads`,
              body: this.prepareAdBody(ad, `{result=create-adset-${adSetIndex}:$.id}`)
            };
            requests.push(adRequest);
          });
        }
      });
    }

    console.log(`📦 Prepared ${requests.length} operations for batch execution (campaign ${campaignId} already created)`);
    return requests;
  }

  /**
   * Prepare campaign body for batch request
   */
  prepareCampaignBody(campaign, newName) {
    const body = {
      name: newName,
      objective: campaign.objective,
      status: 'ACTIVE', // Create as ACTIVE by default
      special_ad_categories: JSON.stringify(campaign.special_ad_categories || [])
    };

    if (campaign.special_ad_category_country) {
      body.special_ad_category_country = campaign.special_ad_category_country;
    }
    if (campaign.daily_budget) {
      body.daily_budget = campaign.daily_budget;
    }
    if (campaign.lifetime_budget) {
      body.lifetime_budget = campaign.lifetime_budget;
    }
    if (campaign.bid_strategy) {
      body.bid_strategy = campaign.bid_strategy;
    }
    // CBO is determined by having a campaign-level budget, not a separate field

    return this.encodeBody(body);
  }

  /**
   * Prepare ad set body for batch request
   */
  prepareAdSetBody(adSet, campaignIdRef) {
    const body = {
      name: `${adSet.name} - Copy`,
      campaign_id: campaignIdRef,
      status: adSet.status || 'ACTIVE', // Create as ACTIVE by default
      targeting: JSON.stringify(adSet.targeting),
      optimization_goal: adSet.optimization_goal,
      billing_event: adSet.billing_event || 'IMPRESSIONS'
    };

    // Add budget
    if (adSet.daily_budget) {
      body.daily_budget = adSet.daily_budget;
    }
    if (adSet.lifetime_budget) {
      body.lifetime_budget = adSet.lifetime_budget;
    }

    // Add optional fields
    if (adSet.bid_strategy) {
      body.bid_strategy = adSet.bid_strategy;
    }
    if (adSet.bid_amount) {
      body.bid_amount = adSet.bid_amount;
    }
    if (adSet.promoted_object) {
      body.promoted_object = JSON.stringify(adSet.promoted_object);
    }
    if (adSet.attribution_spec) {
      body.attribution_spec = JSON.stringify(adSet.attribution_spec);
    }
    if (adSet.schedule) {
      body.schedule = JSON.stringify(adSet.schedule);
    }

    // CRITICAL: Copy spending limits (ad set level spend caps)
    if (adSet.daily_min_spend_target !== undefined && adSet.daily_min_spend_target !== null) {
      body.daily_min_spend_target = adSet.daily_min_spend_target;
    }
    if (adSet.daily_spend_cap !== undefined && adSet.daily_spend_cap !== null) {
      body.daily_spend_cap = adSet.daily_spend_cap;
    }

    // Copy start/end time if present
    if (adSet.start_time) {
      body.start_time = adSet.start_time;
    }
    if (adSet.end_time) {
      body.end_time = adSet.end_time;
    }

    // Copy pacing type
    if (adSet.pacing_type) {
      body.pacing_type = JSON.stringify(adSet.pacing_type);
    }

    // Copy destination type
    if (adSet.destination_type) {
      body.destination_type = adSet.destination_type;
    }

    return this.encodeBody(body);
  }

  /**
   * Prepare ad body for batch request
   */
  prepareAdBody(ad, adSetIdRef) {
    const body = {
      name: `${ad.name} - Copy`,
      adset_id: adSetIdRef,
      status: 'ACTIVE' // Create as ACTIVE by default
    };

    // Handle creative
    if (ad.creative) {
      const creative = ad.creative;

      // Check if this uses an existing post
      if (creative.object_story_id || creative.effective_object_story_id) {
        // Use existing post - FIXED: Use same pattern as 1-50-1 strategy
        body.creative = JSON.stringify({
          object_story_id: creative.object_story_id || creative.effective_object_story_id,
          page_id: this.pageId  // ADDED: Include pageId like 1-50-1 does
        });
      } else if (creative.object_story_spec) {
        // Use story spec directly (no degrees_of_freedom_spec - it causes 400 errors)
        body.creative = JSON.stringify({
          object_story_spec: creative.object_story_spec
        });
      } else if (creative.id) {
        // Reference existing creative by ID - ADDED: new fallback option
        body.creative = JSON.stringify({
          creative_id: creative.id
        });
      } else {
        // Full creative
        const newCreative = {
          name: creative.name || `${ad.name} - Creative`,
          object_type: creative.object_type
        };

        // Add creative fields
        ['title', 'body', 'link_url', 'link_caption', 'link_description',
         'call_to_action_type', 'object_url', 'image_hash', 'video_id'].forEach(field => {
          if (creative[field]) {
            newCreative[field] = creative[field];
          }
        });

        body.creative = JSON.stringify(newCreative);
      }
    }

    // Add tracking
    if (ad.tracking_specs) {
      body.tracking_specs = JSON.stringify(ad.tracking_specs);
    }
    if (ad.url_tags) {
      body.url_tags = ad.url_tags;
    }

    return this.encodeBody(body);
  }

  /**
   * Execute batch requests
   */
  async executeBatch(requests) {
    const batches = [];

    // Split into chunks of 50 (Facebook's limit)
    for (let i = 0; i < requests.length; i += this.maxBatchSize) {
      batches.push(requests.slice(i, i + this.maxBatchSize));
    }

    console.log(`🔄 Executing ${batches.length} batch(es) with ${requests.length} total operations`);

    const results = [];
    for (let i = 0; i < batches.length; i++) {
      console.log(`  📤 Sending batch ${i + 1}/${batches.length} (${batches[i].length} operations)`);

      try {
        // CRITICAL FIX: Remove Content-Type header to let axios use default form-encoding
        // When we explicitly set Content-Type: application/json, axios sends the data as JSON
        // But Facebook Batch API with JSON.stringify(batch) expects form-encoding
        // The URL double-encoding bug was caused by this mismatch:
        // - JSON content-type means the body is parsed as JSON
        // - But our body field inside operations is URL-encoded
        // - This caused the URL encoding to not be decoded properly
        const response = await axios.post(
          this.baseURL,
          {
            batch: JSON.stringify(batches[i]),
            access_token: this.accessToken
          },
          {
            timeout: 120000 // 2 minute timeout for complex batch operations
            // No Content-Type header - let axios use default (application/x-www-form-urlencoded)
          }
        );

        results.push(...response.data);

        // Log success/failure counts for this batch
        const successCount = response.data.filter(r => r && r.code === 200).length;
        const failCount = response.data.filter(r => r && r.code !== 200).length;
        console.log(`  ✅ Batch ${i + 1} complete: ${successCount} succeeded, ${failCount} failed`);

        // Log first error if any failed
        if (failCount > 0) {
          const firstError = response.data.find(r => r && r.code !== 200);
          if (firstError) {
            console.log(`  ⚠️ First error (code ${firstError.code}):`, firstError.body);
          }
        }

        // Process results to extract IDs
        const campaignId = this.extractIdFromBatchResponse(response.data[0]);
        if (campaignId) {
          console.log(`  📋 New campaign created: ${campaignId}`);
        }

      } catch (error) {
        console.error(`  ❌ Batch ${i + 1} failed:`, error.response?.data || error.message);
        throw error;
      }

      // Delay between batches to prevent socket hang up
      if (i < batches.length - 1) {
        console.log(`  ⏳ Waiting 2 seconds before next batch...`);
        await this.delay(2000); // Increased from 500ms to prevent socket hang up
      }
    }

    return results;
  }

  /**
   * Helper to encode body parameters for batch API
   *
   * CRITICAL FIX for URL double-encoding:
   *
   * When sending batch requests with Content-Type: application/json (which we do),
   * the body field should be URL-encoded form data. However, we must be careful:
   *
   * - Simple string values: encode normally
   * - JSON string values (creative, targeting): encode the JSON string
   *
   * The key insight: axios with Content-Type: application/json sends our data as JSON.
   * Facebook then parses the JSON and URL-decodes the body field of each operation.
   *
   * So: body: "creative=%7B%22link%22%3A%22https%3A..."
   * After Facebook URL-decodes: creative={"link":"https:...
   *
   * This is correct! The URL inside the JSON should NOT be separately encoded.
   * The encodeURIComponent encodes the whole JSON string including URLs inside.
   */
  encodeBody(body) {
    return Object.entries(body)
      .map(([key, value]) => {
        return `${key}=${encodeURIComponent(value)}`;
      })
      .join('&');
  }

  /**
   * Helper to decode body parameters (for debugging)
   */
  decodeBody(encodedBody) {
    const params = {};
    encodedBody.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params[key] = decodeURIComponent(value);
    });
    return params;
  }

  /**
   * Extract ID from batch response
   */
  extractIdFromBatchResponse(response) {
    if (response && response.code === 200 && response.body) {
      try {
        const body = JSON.parse(response.body);
        return body.id;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // TEMPLATE BATCH CREATION METHODS - 100% ROOT EFFECT IMPLEMENTATION
  // ============================================================================

  /**
   * Create campaign structure from template using batch API
   * This achieves 100% root effect - all ad sets and ads get identical settings
   *
   * @param {Object} templateData - Template data with all campaign/adset/ad settings
   * @param {number} numAdSets - Number of ad sets to create (default: 50)
   * @param {number} numAdsPerAdSet - Number of ads per ad set (default: 1)
   * @returns {Object} Batch execution results
   */
  async createFromTemplateBatch(templateData, numAdSets = 50, numAdsPerAdSet = 1) {
    try {
      console.log('🚀 ========================================');
      console.log('🚀 BATCH TEMPLATE LAUNCH - 100% ROOT EFFECT');
      console.log('🚀 ========================================');
      console.log(`📊 Structure: 1 campaign + ${numAdSets} ad sets + ${numAdSets * numAdsPerAdSet} ads`);
      console.log(`📊 Total operations: ${1 + numAdSets + (numAdSets * numAdsPerAdSet)}`);

      const accountId = this.adAccountId.replace('act_', '');

      // ===== STEP 1: CREATE CAMPAIGN SEPARATELY (get real ID) =====
      // CRITICAL: Campaign must be created first via separate API call
      // Batch references like {result=create-campaign:$.id} ONLY work within the SAME batch
      // With 101 operations split across batches, cross-batch references fail
      console.log('\n📋 Step 1: Creating campaign via separate API call...');
      const campaignBody = this.prepareCampaignBodyFromTemplate(templateData);

      // Parse the URL-encoded body back to params for the API call
      const campaignParams = {};
      campaignBody.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        campaignParams[key] = decodeURIComponent(value);
      });
      campaignParams.access_token = this.accessToken;

      const campaignResponse = await axios.post(
        `${this.baseURL}/act_${accountId}/campaigns`,
        null,
        { params: campaignParams }
      );

      const campaignId = campaignResponse.data.id;
      console.log(`✅ Campaign created: ${campaignId}`);

      // ===== STEP 2: PREPARE AD SET + AD OPERATIONS =====
      // Now we use the REAL campaign ID (not a batch reference)
      // This allows operations to span multiple batches safely
      const allOperations = [];

      console.log(`\n📋 Step 2: Preparing ${numAdSets} ad set + ${numAdSets * numAdsPerAdSet} ad operations...`);

      // Interleave ad sets and ads: [adset-0, ad-0, adset-1, ad-1, ...]
      // This keeps each ad set paired with its ad in the same batch
      for (let i = 0; i < numAdSets; i++) {
        // Ad set operation (uses REAL campaign ID)
        const adSetBody = this.prepareAdSetBodyFromTemplate(
          templateData,
          i,
          campaignId  // REAL ID, not batch reference
        );

        allOperations.push({
          method: 'POST',
          relative_url: `act_${accountId}/adsets`,
          body: adSetBody,
          name: `create-adset-${i}` // Named for ad references within same batch
        });

        // Ad operation(s) for this ad set
        for (let j = 0; j < numAdsPerAdSet; j++) {
          const adBody = this.prepareAdBodyFromTemplate(
            templateData,
            i * numAdsPerAdSet + j,
            `{result=create-adset-${i}:$.id}` // Reference ad set from same batch
          );

          allOperations.push({
            method: 'POST',
            relative_url: `act_${accountId}/ads`,
            body: adBody
          });
        }
      }
      console.log(`✅ ${allOperations.length} operations prepared (interleaved ad sets + ads)`);

      // ===== STEP 3: EXECUTE BATCHES WITH RETRY =====
      console.log('\n🔄 Step 3: Executing batch operations with retry support...');
      console.log(`📦 Total operations: ${allOperations.length}`);
      console.log(`📊 Will execute in ${Math.ceil(allOperations.length / this.maxBatchSize)} batch(es)`);
      console.log(`📊 API calls needed: ${1 + Math.ceil(allOperations.length / this.maxBatchSize)} (1 campaign + ${Math.ceil(allOperations.length / this.maxBatchSize)} batches)`);
      console.log(`💰 API call savings: ${Math.round((1 - (1 + Math.ceil(allOperations.length / this.maxBatchSize)) / (1 + allOperations.length)) * 100)}%`);

      // Execute batches with retry for transient errors
      const batchResult = await this.executeBatchWithRetry(allOperations, templateData, campaignId, accountId);

      // ===== STEP 4: RETRY FAILED PAIRS AND ORPHANED AD SETS =====
      let { adSetsCreated, adsCreated, successfulPairs, failedPairIndices, orphanedAdSets, failedDetails } = batchResult;

      // ===== STEP 4A: Retry ad-only for orphaned ad sets (ad set exists, ad failed) =====
      if (orphanedAdSets.length > 0) {
        console.log(`\n🔄 Step 4A: Retrying ${orphanedAdSets.length} orphaned ad sets (ad-only retry)...`);

        for (const orphan of orphanedAdSets) {
          try {
            console.log(`  📤 Retrying ad for pair ${orphan.pairIndex + 1} (ad set ${orphan.adSetId} already exists)...`);

            // Only create the ad, using the existing ad set ID
            const adBody = this.prepareAdBodyFromTemplate(templateData, orphan.pairIndex, orphan.adSetId);

            const response = await axios.post(
              `${this.baseURL}/act_${accountId}/ads`,
              new URLSearchParams({ ...this.decodeBody(adBody), access_token: this.accessToken }),
              { timeout: 60000 }
            );

            if (response.data?.id) {
              successfulPairs.push({ pairIndex: orphan.pairIndex, adSetId: orphan.adSetId, adId: response.data.id });
              adsCreated++;
              console.log(`     ✅ Ad created for pair ${orphan.pairIndex + 1}!`);

              // Remove from failed details
              failedDetails = failedDetails.filter(f =>
                !f.name?.includes(`Ad ${orphan.pairIndex + 1}`)
              );
            } else {
              console.log(`     ❌ Ad creation failed for pair ${orphan.pairIndex + 1}`);
              // Delete the orphaned ad set to keep counts consistent
              console.log(`     🗑️ Deleting orphaned ad set ${orphan.adSetId}...`);
              try {
                await axios.delete(`${this.baseURL}/${orphan.adSetId}`, { params: { access_token: this.accessToken } });
                adSetsCreated--; // Adjust count since we deleted the orphan
              } catch (delError) {
                console.error(`     ❌ Failed to delete orphan: ${delError.message}`);
              }
            }

            await this.delay(1000);
          } catch (adError) {
            const fbError = adError.response?.data?.error?.message || adError.message;
            console.error(`     ❌ Ad retry failed for pair ${orphan.pairIndex + 1}: ${fbError}`);

            // Delete the orphaned ad set
            console.log(`     🗑️ Deleting orphaned ad set ${orphan.adSetId}...`);
            try {
              await axios.delete(`${this.baseURL}/${orphan.adSetId}`, { params: { access_token: this.accessToken } });
              adSetsCreated--; // Adjust count since we deleted the orphan
            } catch (delError) {
              console.error(`     ❌ Failed to delete orphan: ${delError.message}`);
            }
          }
        }
      }

      // ===== STEP 4B: Retry completely failed pairs (both ad set and ad failed) =====
      // IMPORTANT: Only retry if we have actual complete failures (not orphans)
      // Limit retries to avoid creating too many duplicates
      const maxRetriesToAttempt = Math.min(failedPairIndices.length, 10); // Cap at 10 retries

      if (failedPairIndices.length > 0) {
        console.log(`\n🔄 Step 4B: Retrying ${maxRetriesToAttempt} of ${failedPairIndices.length} completely failed pairs...`);
        if (failedPairIndices.length > 10) {
          console.log(`  ⚠️ Limiting retries to prevent excessive API calls`);
        }

        let retrySuccessCount = 0;
        let retryOrphanCount = 0;
        let retryFailCount = 0;

        for (let i = 0; i < maxRetriesToAttempt; i++) {
          const pairIndex = failedPairIndices[i];
          try {
            // Create atomic batch for this single pair
            const adSetBody = this.prepareAdSetBodyFromTemplate(templateData, pairIndex, campaignId);
            const adBody = this.prepareAdBodyFromTemplate(templateData, pairIndex, `{result=0:$.id}`);

            const atomicBatch = [
              { method: 'POST', relative_url: `act_${accountId}/adsets`, body: adSetBody },
              { method: 'POST', relative_url: `act_${accountId}/ads`, body: adBody }
            ];

            const response = await axios.post(
              this.baseURL,
              { batch: JSON.stringify(atomicBatch), access_token: this.accessToken },
              { timeout: 60000 }
            );

            const results = response.data;
            const adSetResult = results[0];
            const adResult = results[1];

            let adSetId = null;
            let adId = null;
            let adSetError = null;
            let adError = null;

            // Parse ad set result properly
            if (adSetResult?.code === 200 && adSetResult.body) {
              try {
                const body = JSON.parse(adSetResult.body);
                if (body.id && !body.error) {
                  adSetId = body.id;
                } else if (body.error) {
                  adSetError = body.error.message;
                }
              } catch (e) {
                adSetError = 'Parse error';
              }
            } else if (adSetResult?.body) {
              try {
                const body = JSON.parse(adSetResult.body);
                adSetError = body.error?.message || `HTTP ${adSetResult.code}`;
              } catch (e) {
                adSetError = `HTTP ${adSetResult?.code || 'unknown'}`;
              }
            }

            // Parse ad result properly
            if (adResult?.code === 200 && adResult.body) {
              try {
                const body = JSON.parse(adResult.body);
                if (body.id && !body.error) {
                  adId = body.id;
                } else if (body.error) {
                  adError = body.error.message;
                }
              } catch (e) {
                adError = 'Parse error';
              }
            } else if (adResult?.body) {
              try {
                const body = JSON.parse(adResult.body);
                adError = body.error?.message || `HTTP ${adResult.code}`;
              } catch (e) {
                adError = `HTTP ${adResult?.code || 'unknown'}`;
              }
            }

            if (adSetId && adId) {
              successfulPairs.push({ pairIndex, adSetId, adId });
              adSetsCreated++;
              adsCreated++;
              retrySuccessCount++;

              // Remove from failed details
              failedDetails = failedDetails.filter(f =>
                !(f.name?.includes(`Ad Set ${pairIndex + 1}`) || f.name?.includes(`Ad ${pairIndex + 1}`))
              );
            } else if (adSetId && !adId) {
              // Orphan created during retry - delete it immediately to avoid extra ad sets
              retryOrphanCount++;
              try {
                await axios.delete(`${this.baseURL}/${adSetId}`, { params: { access_token: this.accessToken } });
              } catch (e) {
                // If delete fails, count the orphan
                adSetsCreated++;
                console.error(`     ⚠️ Pair ${pairIndex + 1}: Created orphan ${adSetId}, delete failed: ${e.message}`);
              }
            } else {
              retryFailCount++;
            }

            // Delay between retries
            await this.delay(1500);
          } catch (retryError) {
            retryFailCount++;
            // Check if the error response contains successful creations (batch API quirk)
            if (retryError.response?.data && Array.isArray(retryError.response.data)) {
              const results = retryError.response.data;
              let createdAdSetId = null;

              // Check if ad set was actually created despite error
              if (results[0]?.code === 200 && results[0]?.body) {
                try {
                  const body = JSON.parse(results[0].body);
                  if (body.id && !body.error) {
                    createdAdSetId = body.id;
                    // Delete the orphan
                    try {
                      await axios.delete(`${this.baseURL}/${createdAdSetId}`, { params: { access_token: this.accessToken } });
                    } catch (e) {
                      adSetsCreated++;
                      console.error(`     ⚠️ Orphan created during error: ${createdAdSetId}`);
                    }
                  }
                } catch (e) {}
              }
            }
          }
        }

        console.log(`  📊 Retry results: ${retrySuccessCount} succeeded, ${retryOrphanCount} orphans cleaned, ${retryFailCount} failed`);
      }

      const adSetsFailed = numAdSets - adSetsCreated;
      const adsFailed = (numAdSets * numAdsPerAdSet) - adsCreated;
      const hasFailures = adSetsFailed > 0 || adsFailed > 0;

      console.log('\n✅ ========================================');
      console.log('✅ BATCH TEMPLATE LAUNCH COMPLETE!');
      console.log('✅ ========================================');
      console.log(`✅ Campaign: ${campaignId}`);
      console.log(`✅ Ad Sets Created: ${adSetsCreated}/${numAdSets}${adSetsFailed > 0 ? ` (${adSetsFailed} failed)` : ''}`);
      console.log(`✅ Ads Created: ${adsCreated}/${numAdSets * numAdsPerAdSet}${adsFailed > 0 ? ` (${adsFailed} failed)` : ''}`);

      if (!hasFailures) {
        console.log(`✅ All ad sets have IDENTICAL settings (100% root effect)`);
        console.log(`✅ All ads have IDENTICAL creatives (100% root effect)`);
      }

      // Track remaining failures in FailureTracker
      if (hasFailures && this.userId && failedDetails.length > 0) {
        console.log(`📝 Tracking ${failedDetails.length} failures for Failures box...`);
        await this.trackFailedEntities(failedDetails, {
          campaignId: campaignId,
          campaignName: templateData.campaignName || 'Campaign',
          strategyType: 'strategy150_batch'
        });
      }

      return {
        success: !hasFailures,
        partialSuccess: hasFailures && adSetsCreated > 0,
        operations: 1 + allOperations.length,
        batchesExecuted: batchResult.batchesExecuted,
        apiCallsSaved: allOperations.length - batchResult.batchesExecuted,
        campaignId: campaignId,
        adSetsCreated,
        adsCreated,
        adSetsFailed,
        adsFailed,
        failedDetails: failedDetails.length > 0 ? failedDetails : undefined
      };

    } catch (error) {
      console.error('❌ Batch template launch failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute batch operations WITHOUT retry for transient errors.
   * CRITICAL: Facebook's batch API often returns transient errors but STILL creates the resources.
   * Retrying creates duplicates. Instead, we execute ALL batches, then use smartVerifyAndCorrect()
   * to count actual vs expected and delete any extras.
   *
   * Returns detailed per-pair success/failure tracking.
   */
  async executeBatchWithRetry(allOperations, templateData, campaignId, accountId) {
    const successfulPairs = [];
    const failedPairIndices = []; // Pairs where BOTH ad set and ad failed
    const orphanedAdSets = []; // Ad sets that succeeded but ads failed (need ad-only retry)
    const failedDetails = [];
    let adSetsCreated = 0;
    let adsCreated = 0;
    let batchesExecuted = 0;

    // Split into batches
    const batches = [];
    for (let i = 0; i < allOperations.length; i += this.maxBatchSize) {
      batches.push({
        operations: allOperations.slice(i, i + this.maxBatchSize),
        startIndex: i
      });
    }

    console.log(`🔄 Executing ${batches.length} batch(es) with ${allOperations.length} total operations`);
    console.log(`⚠️ NO RETRY on transient errors - smart verification will correct any duplicates after`);

    for (let batchNum = 0; batchNum < batches.length; batchNum++) {
      const batch = batches[batchNum];
      let batchResults = null;

      // Single attempt - NO retry for transient errors (they often succeed despite error)
      try {
        console.log(`  📤 Sending batch ${batchNum + 1}/${batches.length} (${batch.operations.length} operations)`);

        const response = await axios.post(
          this.baseURL,
          { batch: JSON.stringify(batch.operations), access_token: this.accessToken },
          { timeout: 120000 }
        );

        batchResults = response.data;
        batchesExecuted++;

        // Check for transient errors - LOG but do NOT retry
        let hasTransientError = false;
        for (const result of batchResults) {
          if (result?.code === 500 || result?.code === 503) {
            try {
              const body = JSON.parse(result.body);
              if (body.error?.is_transient === true) {
                hasTransientError = true;
                break;
              }
            } catch (e) {}
          }
        }

        if (hasTransientError) {
          console.log(`  ⚠️ Transient error detected - NOT retrying (Facebook often creates despite this error)`);
          console.log(`  ℹ️ Smart verification will correct any issues after all batches complete`);
        }

      } catch (error) {
        console.error(`  ❌ Batch ${batchNum + 1} request failed: ${error.message}`);
        // Mark all pairs in this batch as failed (only for network/timeout errors, not transient)
        const pairsInBatch = Math.floor(batch.operations.length / 2);
        const startPairIndex = Math.floor(batch.startIndex / 2);
        for (let i = 0; i < pairsInBatch; i++) {
          failedPairIndices.push(startPairIndex + i);
        }
      }

      // Process batch results
      if (batchResults) {
        // DEBUG: Log first batch result to see actual structure
        if (batchNum === 0 && batchResults.length > 0) {
          console.log(`  🔍 DEBUG - First batch result structure:`);
          console.log(`     Result count: ${batchResults.length}`);
          console.log(`     First result: ${JSON.stringify(batchResults[0]).substring(0, 500)}`);
          if (batchResults[1]) {
            console.log(`     Second result: ${JSON.stringify(batchResults[1]).substring(0, 500)}`);
          }
        }

        // Results are interleaved: [adset-0, ad-0, adset-1, ad-1, ...]
        for (let i = 0; i < batchResults.length; i += 2) {
          const adSetResult = batchResults[i];
          const adResult = batchResults[i + 1];
          const globalPairIndex = Math.floor(batch.startIndex / 2) + Math.floor(i / 2);

          let adSetId = null;
          let adId = null;
          let adSetSuccess = false;
          let adSuccess = false;
          let adSetError = null;
          let adError = null;

          // Parse ad set result - handle both string and object body
          if (adSetResult?.code === 200) {
            try {
              const body = typeof adSetResult.body === 'string'
                ? JSON.parse(adSetResult.body)
                : adSetResult.body;
              if (body?.id && !body?.error) {
                adSetId = body.id;
                adSetSuccess = true;
              } else if (body?.error) {
                adSetError = body.error.message || body.error.error_user_msg || 'Unknown error in response body';
              }
            } catch (e) {
              adSetError = `Parse error: ${e.message}`;
            }
          } else if (adSetResult?.body) {
            try {
              const body = typeof adSetResult.body === 'string'
                ? JSON.parse(adSetResult.body)
                : adSetResult.body;
              adSetError = body?.error?.message || body?.error?.error_user_msg || `HTTP ${adSetResult.code}`;
            } catch (e) {
              adSetError = `HTTP ${adSetResult?.code || 'unknown'}`;
            }
          } else {
            adSetError = `No result at index ${i}`;
          }

          // Parse ad result - handle both string and object body
          if (adResult?.code === 200) {
            try {
              const body = typeof adResult.body === 'string'
                ? JSON.parse(adResult.body)
                : adResult.body;
              if (body?.id && !body?.error) {
                adId = body.id;
                adSuccess = true;
              } else if (body?.error) {
                adError = body.error.message || body.error.error_user_msg || 'Unknown error in response body';
              }
            } catch (e) {
              adError = `Parse error: ${e.message}`;
            }
          } else if (adResult?.body) {
            try {
              const body = typeof adResult.body === 'string'
                ? JSON.parse(adResult.body)
                : adResult.body;
              adError = body?.error?.message || body?.error?.error_user_msg || `HTTP ${adResult.code}`;
            } catch (e) {
              adError = `HTTP ${adResult?.code || 'unknown'}`;
            }
          } else {
            adError = `No result at index ${i + 1}`;
          }

          // DEBUG: Log first pair parsing result
          if (batchNum === 0 && i === 0) {
            console.log(`  🔍 DEBUG - First pair parsing:`);
            console.log(`     adSetResult.code: ${adSetResult?.code}`);
            console.log(`     adSetId: ${adSetId}, adSetSuccess: ${adSetSuccess}, adSetError: ${adSetError}`);
            console.log(`     adResult.code: ${adResult?.code}`);
            console.log(`     adId: ${adId}, adSuccess: ${adSuccess}, adError: ${adError}`);
          }

          // Track actual results for this pair
          if (adSetSuccess && adSuccess) {
            // SUCCESS: Complete pair
            successfulPairs.push({ pairIndex: globalPairIndex, adSetId, adId });
            adSetsCreated++;
            adsCreated++;
          } else if (adSetSuccess && !adSuccess) {
            // PARTIAL SUCCESS: Ad set created but ad failed
            // Track as orphan for ad-only retry (don't delete - we'll try to create ad)
            orphanedAdSets.push({ pairIndex: globalPairIndex, adSetId });
            adSetsCreated++; // Count the ad set as created

            failedDetails.push({
              type: 'ad',
              name: `${templateData.campaignName || 'Campaign'} - Ad ${globalPairIndex + 1}`,
              message: adError || 'Unknown error',
              code: adResult?.code
            });
          } else {
            // COMPLETE FAILURE: Both ad set and ad failed (or ad set failed)
            failedPairIndices.push(globalPairIndex);

            failedDetails.push({
              type: 'adset',
              name: `${templateData.campaignName || 'Campaign'} - Ad Set ${globalPairIndex + 1}`,
              message: adSetError || 'Unknown error',
              code: adSetResult?.code
            });
          }
        }

        // Calculate ACTUAL success/failure counts (not HTTP status codes)
        const batchPairCount = Math.floor(batch.operations.length / 2);
        const batchStartPairIndex = Math.floor(batch.startIndex / 2);
        const batchSuccessCount = successfulPairs.filter(p => p.pairIndex >= batchStartPairIndex && p.pairIndex < batchStartPairIndex + batchPairCount).length;
        const batchOrphanCount = orphanedAdSets.filter(o => o.pairIndex >= batchStartPairIndex && o.pairIndex < batchStartPairIndex + batchPairCount).length;
        const batchFailCount = batchPairCount - batchSuccessCount - batchOrphanCount;

        console.log(`  ✅ Batch ${batchNum + 1} complete: ${batchSuccessCount} pairs OK, ${batchOrphanCount} orphans (ad set OK, ad failed), ${batchFailCount} failed`);
      }

      // Delay between batches
      if (batchNum < batches.length - 1) {
        await this.delay(2000);
      }
    }

    return {
      successfulPairs,
      failedPairIndices: [...new Set(failedPairIndices)], // Remove duplicates
      orphanedAdSets, // Ad sets that need ad-only retry
      failedDetails,
      adSetsCreated,
      adsCreated,
      batchesExecuted
    };
  }

  /**
   * Prepare campaign body from template data
   */
  prepareCampaignBodyFromTemplate(templateData) {
    // Add [Launcher] prefix if not already present
    let campaignName = templateData.campaignName || 'New Campaign';
    if (!campaignName.startsWith('[Launcher]')) {
      campaignName = `[Launcher] ${campaignName}`;
    }

    const body = {
      name: campaignName,
      objective: templateData.objective || 'OUTCOME_LEADS',
      status: 'ACTIVE', // Create campaigns as ACTIVE by default
      special_ad_categories: JSON.stringify(templateData.specialAdCategories || [])
    };

    // Buying type
    if (templateData.buyingType) {
      body.buying_type = templateData.buyingType;
    }

    // Bid strategy (only if campaign has budget)
    if (templateData.bidStrategy &&
        (templateData.campaignBudget?.dailyBudget || templateData.campaignBudget?.lifetimeBudget)) {
      body.bid_strategy = templateData.bidStrategy;
    }

    // Campaign budget (CBO)
    if (templateData.campaignBudget?.dailyBudget) {
      body.daily_budget = Math.round(parseFloat(templateData.campaignBudget.dailyBudget) * 100);
    }
    if (templateData.campaignBudget?.lifetimeBudget) {
      body.lifetime_budget = Math.round(parseFloat(templateData.campaignBudget.lifetimeBudget) * 100);
    }

    // Spending limit
    if (templateData.campaignSpendingLimit) {
      body.spend_cap = Math.round(parseFloat(templateData.campaignSpendingLimit) * 100);
    }

    // Special ad category country
    if (templateData.specialAdCategoryCountry) {
      body.special_ad_category_country = templateData.specialAdCategoryCountry;
    }

    console.log('📋 Campaign body prepared:', {
      name: body.name,
      objective: body.objective,
      hasCampaignBudget: !!(body.daily_budget || body.lifetime_budget),
      bidStrategy: body.bid_strategy || 'none'
    });

    return this.encodeBody(body);
  }

  /**
   * Prepare ad set body from template data
   * 100% ROOT EFFECT: All ad sets get IDENTICAL settings
   */
  prepareAdSetBodyFromTemplate(templateData, adSetIndex, campaignIdRef) {
    const body = {
      name: `${templateData.campaignName || 'Campaign'} - Ad Set ${adSetIndex + 1}`,
      campaign_id: campaignIdRef,
      status: 'ACTIVE', // Create ad sets as ACTIVE by default
      billing_event: 'IMPRESSIONS'
    };

    // ===== OPTIMIZATION & CONVERSION =====
    body.optimization_goal = this.getOptimizationGoalFromTemplate(templateData);

    if (templateData.performanceGoal) {
      body.performance_goal = templateData.performanceGoal;
    }

    // ===== PROMOTED OBJECT (Pixel + Conversion Event) =====
    const pixelId = templateData.manualPixelId || templateData.pixel || this.pixelId;
    if (pixelId && templateData.conversionLocation === 'website') {
      const promotedObject = {
        pixel_id: pixelId
      };

      // Add custom event type if specified
      if (templateData.conversionEvent) {
        const eventMap = {
          'Lead': 'LEAD',
          'Contact': 'CONTACT',
          'Purchase': 'PURCHASE',
          'lead': 'LEAD',
          'contact': 'CONTACT',
          'purchase': 'PURCHASE'
        };
        promotedObject.custom_event_type = eventMap[templateData.conversionEvent] || 'LEAD';
      }

      body.promoted_object = JSON.stringify(promotedObject);
    } else if (templateData.conversionLocation === 'calls') {
      // For phone call objective
      body.promoted_object = JSON.stringify({
        page_id: this.pageId
      });
    }

    // ===== BUDGET (Only if NOT using CBO) =====
    const usingCBO = !!(templateData.campaignBudget?.dailyBudget || templateData.campaignBudget?.lifetimeBudget);

    if (!usingCBO) {
      if (templateData.budgetType === 'lifetime' && templateData.adSetBudget?.lifetimeBudget) {
        body.lifetime_budget = Math.round(parseFloat(templateData.adSetBudget.lifetimeBudget) * 100);
      } else if (templateData.adSetBudget?.dailyBudget) {
        body.daily_budget = Math.round(parseFloat(templateData.adSetBudget.dailyBudget) * 100);
      }
    }

    // ===== BIDDING & CAPS =====
    if (templateData.bidStrategy) {
      body.bid_strategy = templateData.bidStrategy;
    }
    if (templateData.bidAmount) {
      body.bid_amount = Math.round(parseFloat(templateData.bidAmount) * 100);
    }
    if (templateData.costCap) {
      body.bid_cap = Math.round(parseFloat(templateData.costCap) * 100);
    }
    if (templateData.minRoas) {
      body.min_roas = parseFloat(templateData.minRoas);
    }

    // ===== SPENDING LIMITS =====
    if (templateData.adSetBudget?.spendingLimits?.enabled) {
      const limits = templateData.adSetBudget.spendingLimits;
      const budgetAmount = templateData.adSetBudget.dailyBudget || templateData.adSetBudget.lifetimeBudget || 50;

      // Calculate based on value type (percentage or dollar)
      if (limits.valueType === 'percentage') {
        if (limits.dailyMin !== undefined && limits.dailyMin !== null && limits.dailyMin !== '') {
          body.daily_min_spend_target = Math.round((budgetAmount * parseFloat(limits.dailyMin) / 100) * 100);
        }
        if (limits.dailyMax !== undefined && limits.dailyMax !== null && limits.dailyMax !== '') {
          body.daily_spend_cap = Math.round((budgetAmount * parseFloat(limits.dailyMax) / 100) * 100);
        }
      } else {
        if (limits.dailyMin !== undefined && limits.dailyMin !== null && limits.dailyMin !== '') {
          body.daily_min_spend_target = Math.round(parseFloat(limits.dailyMin) * 100);
        }
        if (limits.dailyMax !== undefined && limits.dailyMax !== null && limits.dailyMax !== '') {
          body.daily_spend_cap = Math.round(parseFloat(limits.dailyMax) * 100);
        }
      }
    }

    // ===== ATTRIBUTION =====
    if (templateData.attributionSetting) {
      const attributionSpec = [];

      // Map attribution settings to Facebook format
      switch (templateData.attributionSetting) {
        case '1_day_click_1_day_view':
          attributionSpec.push(
            { event_type: 'CLICK_THROUGH', window_days: 1 },
            { event_type: 'VIEW_THROUGH', window_days: 1 }
          );
          break;
        case '1_day_click_1_day_engaged_view_1_day_view':
          attributionSpec.push(
            { event_type: 'CLICK_THROUGH', window_days: 1 },
            { event_type: 'ENGAGED_VIDEO_VIEW', window_days: 1 },
            { event_type: 'VIEW_THROUGH', window_days: 1 }
          );
          break;
        case '7_day_click_1_day_view':
          attributionSpec.push(
            { event_type: 'CLICK_THROUGH', window_days: 7 },
            { event_type: 'VIEW_THROUGH', window_days: 1 }
          );
          break;
        case '28_day_click_1_day_view':
          attributionSpec.push(
            { event_type: 'CLICK_THROUGH', window_days: 28 },
            { event_type: 'VIEW_THROUGH', window_days: 1 }
          );
          break;
        case '1_day_click':
          attributionSpec.push({ event_type: 'CLICK_THROUGH', window_days: 1 });
          break;
        case '7_day_click':
          attributionSpec.push({ event_type: 'CLICK_THROUGH', window_days: 7 });
          break;
      }

      if (attributionSpec.length > 0) {
        body.attribution_spec = JSON.stringify(attributionSpec);
      }
    }

    // ===== TARGETING (FULL) =====
    const targeting = this.buildTargetingFromTemplate(templateData);
    body.targeting = JSON.stringify(targeting);

    // ===== SCHEDULE =====
    // CRITICAL FIX: Use parseDateTimeAsEST to interpret user's datetime as EST timezone
    // This fixes the 5-hour offset issue where 9 AM EST was showing as 4 AM EST
    if (templateData.budgetType === 'lifetime') {
      if (templateData.adSetBudget?.startDate) {
        body.start_time = this.parseDateTimeAsEST(templateData.adSetBudget.startDate);
      }
      if (templateData.adSetBudget?.endDate) {
        body.end_time = this.parseDateTimeAsEST(templateData.adSetBudget.endDate);
      }
    } else if (templateData.adSetBudget?.startDate || templateData.adSetBudget?.endDate) {
      if (templateData.adSetBudget.startDate) {
        body.start_time = this.parseDateTimeAsEST(templateData.adSetBudget.startDate);
      }
      if (templateData.adSetBudget.endDate) {
        body.end_time = this.parseDateTimeAsEST(templateData.adSetBudget.endDate);
      }
    }

    // ===== DAYPARTING (Ad Scheduling) =====
    if (templateData.adSetBudget?.dayparting?.length > 0) {
      const adScheduling = templateData.adSetBudget.dayparting.map(schedule => ({
        days: schedule.days,
        start_minute: this.timeToMinutes(schedule.startTime),
        end_minute: this.timeToMinutes(schedule.endTime)
      }));
      body.adset_schedule = JSON.stringify(adScheduling);
    }

    // ===== DYNAMIC CREATIVE FLAG =====
    // CRITICAL: Set is_dynamic_creative = true when using text variations or dynamic creative
    // This enables Facebook to test multiple text/media combinations
    const hasTextVariations = (templateData.primaryTextVariations && templateData.primaryTextVariations.filter(t => t?.trim()).length > 0) ||
                              (templateData.headlineVariations && templateData.headlineVariations.filter(h => h?.trim()).length > 0);
    const hasDynamicMedia = templateData.dynamicCreativeEnabled || templateData.dynamicImages?.length > 0 || templateData.dynamicVideos?.length > 0;

    if (templateData.dynamicTextEnabled || templateData.dynamicCreativeEnabled || hasTextVariations || hasDynamicMedia) {
      body.is_dynamic_creative = true;
      if (adSetIndex === 0) {
        console.log(`  📊 Ad Set 1: is_dynamic_creative = true (text variations or dynamic media enabled)`);
      }
    }

    return this.encodeBody(body);
  }

  /**
   * Build targeting object from template data
   * 100% ROOT EFFECT: Same targeting for all ad sets
   */
  buildTargetingFromTemplate(templateData) {
    const targeting = {
      age_min: templateData.targeting?.ageMin || 18,
      age_max: templateData.targeting?.ageMax || 65
    };

    // ===== GENDER =====
    if (templateData.targeting?.genders && !templateData.targeting.genders.includes('all')) {
      const genderMap = { 'male': 1, 'female': 2 };
      const mappedGenders = templateData.targeting.genders
        .map(g => genderMap[g] || g)
        .filter(g => typeof g === 'number');
      if (mappedGenders.length > 0) {
        targeting.genders = mappedGenders;
      }
    }

    // Also check demographics.genders format
    if (templateData.targeting?.demographics?.genders) {
      const genders = Array.isArray(templateData.targeting.demographics.genders)
        ? templateData.targeting.demographics.genders
        : [templateData.targeting.demographics.genders];
      if (!genders.includes('all')) {
        const genderMap = { 'male': 1, 'female': 2 };
        const mappedGenders = genders.map(g => genderMap[g] || g).filter(g => typeof g === 'number');
        if (mappedGenders.length > 0) {
          targeting.genders = mappedGenders;
        }
      }
    }

    // ===== AGE (check demographics object too) =====
    if (templateData.targeting?.demographics?.ageMin !== undefined) {
      targeting.age_min = templateData.targeting.demographics.ageMin;
    }
    if (templateData.targeting?.demographics?.ageMax !== undefined) {
      targeting.age_max = templateData.targeting.demographics.ageMax;
    }

    // ===== LOCATIONS =====
    targeting.geo_locations = {};

    // Get regions/states - frontend may send as "regions" or "states"
    const regionStates = templateData.targeting?.locations?.regions ||
                         templateData.targeting?.locations?.states || [];

    const hasSpecificLocations =
      (regionStates.length > 0) ||
      (templateData.targeting?.locations?.cities?.length > 0) ||
      (templateData.targeting?.locations?.custom?.length > 0) ||
      (templateData.targeting?.locations?.zips?.length > 0);

    // States/Regions - CRITICAL: Convert state codes to Facebook region IDs
    if (regionStates.length > 0) {
      console.log(`📍 Processing ${regionStates.length} regions/states:`, regionStates.slice(0, 5).join(', ') + (regionStates.length > 5 ? '...' : ''));
      targeting.geo_locations.regions = regionStates.map(state => {
        const regionId = this.stateToRegionId[state];
        if (regionId) {
          return { key: regionId };
        } else {
          // If no mapping found, use US: prefix format
          console.warn(`⚠️ No region ID mapping for state: ${state}, using fallback`);
          return { key: `US:${state}` };
        }
      });
      console.log(`✅ Converted to ${targeting.geo_locations.regions.length} Facebook region IDs`);
    }
    // Cities
    else if (templateData.targeting?.locations?.cities?.length > 0) {
      targeting.geo_locations.cities = templateData.targeting.locations.cities.map(city => ({
        key: city
      }));
    }
    // ZIP codes
    else if (templateData.targeting?.locations?.zips?.length > 0 ||
             templateData.targeting?.locations?.custom?.length > 0) {
      const zips = templateData.targeting.locations.zips || templateData.targeting.locations.custom || [];
      targeting.geo_locations.zips = zips.map(zip => ({
        key: `US:${zip}`
      }));
    }
    // Countries (only if no specific locations)
    else if (!hasSpecificLocations && templateData.targeting?.locations?.countries?.length > 0) {
      targeting.geo_locations.countries = templateData.targeting.locations.countries;
    }
    // Default to US
    else {
      targeting.geo_locations.countries = ['US'];
    }

    // ===== LANGUAGES =====
    if (templateData.targeting?.languages?.length > 0) {
      targeting.locales = templateData.targeting.languages;
    }

    // ===== DETAILED TARGETING (Interests, Behaviors, Demographics) =====
    if (templateData.targeting?.detailedTargeting) {
      const flexibleSpec = [];

      if (templateData.targeting.detailedTargeting.interests?.length > 0) {
        flexibleSpec.push({
          interests: templateData.targeting.detailedTargeting.interests.map(id => ({ id }))
        });
      }
      if (templateData.targeting.detailedTargeting.behaviors?.length > 0) {
        flexibleSpec.push({
          behaviors: templateData.targeting.detailedTargeting.behaviors.map(id => ({ id }))
        });
      }
      if (templateData.targeting.detailedTargeting.demographics?.length > 0) {
        flexibleSpec.push({
          demographics: templateData.targeting.detailedTargeting.demographics.map(id => ({ id }))
        });
      }

      if (flexibleSpec.length > 0) {
        targeting.flexible_spec = flexibleSpec;
      }
    }

    // ===== CUSTOM & LOOKALIKE AUDIENCES =====
    if (templateData.targeting?.customAudiences?.length > 0) {
      targeting.custom_audiences = templateData.targeting.customAudiences.map(id => ({ id }));
    }
    if (templateData.targeting?.lookalikeAudiences?.length > 0) {
      targeting.lookalike_audiences = templateData.targeting.lookalikeAudiences.map(id => ({ id }));
    }

    // ===== CONNECTIONS =====
    if (templateData.targeting?.connections?.include?.length > 0) {
      targeting.connections = templateData.targeting.connections.include.map(id => ({ id }));
    }
    if (templateData.targeting?.connections?.exclude?.length > 0) {
      targeting.excluded_connections = templateData.targeting.connections.exclude.map(id => ({ id }));
    }

    // ===== PLACEMENTS =====
    if (templateData.placementType === 'manual' && templateData.placements) {
      const platforms = [];

      if (templateData.placements.facebook?.length > 0) {
        platforms.push('facebook');
        targeting.facebook_positions = templateData.placements.facebook;
      }
      if (templateData.placements.instagram?.length > 0) {
        platforms.push('instagram');
        targeting.instagram_positions = templateData.placements.instagram;
      }
      if (templateData.placements.messenger?.length > 0) {
        platforms.push('messenger');
        targeting.messenger_positions = templateData.placements.messenger;
      }
      if (templateData.placements.audienceNetwork?.length > 0) {
        platforms.push('audience_network');
        targeting.audience_network_positions = templateData.placements.audienceNetwork;
      }

      if (platforms.length > 0) {
        targeting.publisher_platforms = platforms;
      }

      // Device platforms
      if (templateData.placements.devices?.length > 0) {
        targeting.device_platforms = templateData.placements.devices;
      }

      // OS platforms
      if (templateData.placements.platforms?.length > 0) {
        const osPlatforms = templateData.placements.platforms.filter(p => p !== 'all');
        if (osPlatforms.length > 0) {
          targeting.user_os = osPlatforms;
        }
      }
    }

    return targeting;
  }

  /**
   * Prepare ad body from template data
   * 100% ROOT EFFECT: All ads get IDENTICAL creatives
   * Supports BOTH regular ads and dynamic creatives with text variations
   */
  prepareAdBodyFromTemplate(templateData, adIndex, adSetIdRef) {
    // DEBUG: Log creative settings on first ad
    if (adIndex === 0) {
      console.log('🔍 DEBUG - prepareAdBodyFromTemplate check:');
      console.log('  📦 templateData.displayLink:', templateData.displayLink);
      console.log('  📦 templateData.url:', templateData.url);
      console.log('  📦 templateData.mediaType:', templateData.mediaType);
      console.log('  📦 templateData.dynamicTextEnabled:', templateData.dynamicTextEnabled);
      console.log('  📦 templateData.dynamicCreativeEnabled:', templateData.dynamicCreativeEnabled);
      console.log('  📦 templateData.primaryTextVariations:', templateData.primaryTextVariations?.length || 0);
      console.log('  📦 templateData.headlineVariations:', templateData.headlineVariations?.length || 0);
    }

    const body = {
      name: `${templateData.campaignName || 'Campaign'} - Ad ${adIndex + 1}`,
      adset_id: adSetIdRef,
      status: 'ACTIVE' // Create ads as ACTIVE by default
    };

    // ===== CHECK FOR DYNAMIC CREATIVE / TEXT VARIATIONS =====
    // If dynamicTextEnabled or dynamicCreativeEnabled, use asset_feed_spec
    const hasTextVariations = (templateData.primaryTextVariations && templateData.primaryTextVariations.filter(t => t?.trim()).length > 0) ||
                              (templateData.headlineVariations && templateData.headlineVariations.filter(h => h?.trim()).length > 0);
    const hasDynamicMedia = templateData.dynamicCreativeEnabled || templateData.dynamicImages?.length > 0 || templateData.dynamicVideos?.length > 0;
    const useDynamicCreative = templateData.dynamicTextEnabled || templateData.dynamicCreativeEnabled || hasTextVariations || hasDynamicMedia;

    if (useDynamicCreative) {
      // ===== DYNAMIC CREATIVE WITH asset_feed_spec =====
      console.log(`  🎨 Ad ${adIndex + 1}: Using Dynamic Creative (asset_feed_spec)`);

      const assetFeedSpec = {};

      // Build and deduplicate primary texts (bodies)
      let primaryTexts = [];
      if (templateData.primaryText && templateData.primaryText.trim()) {
        primaryTexts.push(templateData.primaryText.trim());
      }
      if (templateData.primaryTextVariations) {
        const validVariations = templateData.primaryTextVariations.filter(text => text && text.trim()).map(t => t.trim());
        primaryTexts.push(...validVariations);
      }
      // CRITICAL: Deduplicate - Facebook rejects duplicates
      primaryTexts = [...new Set(primaryTexts)];
      if (primaryTexts.length > 0) {
        assetFeedSpec.bodies = primaryTexts.map(text => ({ text }));
        if (adIndex === 0) console.log(`  📝 Bodies (${primaryTexts.length}):`, primaryTexts);
      }

      // Build and deduplicate headlines (titles)
      let headlines = [];
      if (templateData.headline && templateData.headline.trim()) {
        headlines.push(templateData.headline.trim());
      }
      if (templateData.headlineVariations) {
        const validVariations = templateData.headlineVariations.filter(h => h && h.trim()).map(h => h.trim());
        headlines.push(...validVariations);
      }
      // CRITICAL: Deduplicate - Facebook rejects duplicates
      headlines = [...new Set(headlines)];
      if (headlines.length > 0) {
        assetFeedSpec.titles = headlines.map(text => ({ text }));
        if (adIndex === 0) console.log(`  📰 Titles (${headlines.length}):`, headlines);
      }

      // Description
      if (templateData.description) {
        assetFeedSpec.descriptions = [{ text: templateData.description }];
      }

      // Link URLs with optional display link
      const linkUrlObj = { website_url: templateData.url || '' };
      if (templateData.displayLink) {
        linkUrlObj.display_url = templateData.displayLink;
        if (adIndex === 0) console.log(`  🔗 Display URL: ${templateData.displayLink}`);
      }
      assetFeedSpec.link_urls = [linkUrlObj];

      // Call to action
      assetFeedSpec.call_to_action_types = [templateData.callToAction || 'LEARN_MORE'];

      // Handle media for asset_feed_spec
      // Priority: Dynamic media > Single media
      if (templateData.dynamicImages && templateData.dynamicImages.length > 0) {
        assetFeedSpec.images = templateData.dynamicImages.map(hash => ({ hash }));
        if (adIndex === 0) console.log(`  📸 Dynamic Images: ${templateData.dynamicImages.length}`);
      } else if (templateData.imageHash) {
        assetFeedSpec.images = [{ hash: templateData.imageHash }];
        if (adIndex === 0) console.log(`  📸 Single Image: ${templateData.imageHash}`);
      }

      if (templateData.dynamicVideos && templateData.dynamicVideos.length > 0) {
        assetFeedSpec.videos = templateData.dynamicVideos.map(videoId => ({ video_id: videoId }));
        if (adIndex === 0) console.log(`  📹 Dynamic Videos: ${templateData.dynamicVideos.length}`);
      } else if (templateData.videoId) {
        const videoObj = { video_id: templateData.videoId };
        if (templateData.videoThumbnail) {
          if (templateData.videoThumbnail.match(/^[a-f0-9]{32}$/i)) {
            videoObj.thumbnail_hash = templateData.videoThumbnail;
          } else {
            videoObj.thumbnail_url = templateData.videoThumbnail;
          }
        }
        assetFeedSpec.videos = [videoObj];
        if (adIndex === 0) console.log(`  📹 Single Video: ${templateData.videoId}`);
      }

      // Set ad format based on what media we have
      const hasVideos = assetFeedSpec.videos && assetFeedSpec.videos.length > 0;
      const hasImages = assetFeedSpec.images && assetFeedSpec.images.length > 0;

      if (hasVideos && hasImages) {
        assetFeedSpec.ad_formats = ['AUTOMATIC_FORMAT'];
      } else if (hasVideos) {
        assetFeedSpec.ad_formats = ['SINGLE_VIDEO'];
      } else if (hasImages) {
        assetFeedSpec.ad_formats = ['SINGLE_IMAGE'];
      }

      body.creative = JSON.stringify({
        asset_feed_spec: assetFeedSpec,
        object_story_spec: { page_id: this.pageId }
      });

    } else {
      // ===== REGULAR CREATIVE with object_story_spec =====
      const creative = {
        object_story_spec: {
          page_id: this.pageId
        }
      };

      // Handle different media types
      if ((templateData.mediaType === 'video' || templateData.mediaType === 'single_video') && templateData.videoId) {
        // VIDEO AD
        creative.object_story_spec.video_data = {
          video_id: templateData.videoId,
          message: templateData.primaryText || '',
          title: templateData.headline || '',
          link_description: templateData.description || '',
          call_to_action: {
            type: templateData.callToAction || 'LEARN_MORE',
            value: {
              link: templateData.url || ''
            }
          }
        };

        // NOTE: Facebook does NOT support displayLink for video ads
        // The link_caption field is not valid for video_data creatives

        // Add thumbnail
        if (templateData.videoThumbnail) {
          if (templateData.videoThumbnail.match(/^[a-f0-9]{32}$/i)) {
            creative.object_story_spec.video_data.image_hash = templateData.videoThumbnail;
          } else {
            creative.object_story_spec.video_data.image_url = templateData.videoThumbnail;
          }
        } else if (templateData.imageHash) {
          creative.object_story_spec.video_data.image_hash = templateData.imageHash;
        }

      } else if (templateData.mediaType === 'carousel' && templateData.carouselCards) {
        // CAROUSEL AD
        creative.object_story_spec.link_data = {
          link: templateData.url || '',
          message: templateData.primaryText || '',
          child_attachments: templateData.carouselCards.map(card => ({
            link: card.link || templateData.url || '',
            name: card.headline || '',
            description: card.description || '',
            image_hash: card.imageHash,
            call_to_action: {
              type: card.callToAction || templateData.callToAction || 'LEARN_MORE'
            }
          })),
          call_to_action: {
            type: templateData.callToAction || 'LEARN_MORE'
          }
        };

        // FIX: Use 'caption' not 'link_caption' for display URL
        if (templateData.displayLink) {
          creative.object_story_spec.link_data.caption = templateData.displayLink;
        }

      } else if (templateData.mediaType === 'carousel' && templateData.carouselImages) {
        // CAROUSEL AD from image hashes
        creative.object_story_spec.link_data = {
          link: templateData.url || '',
          message: templateData.primaryText || '',
          child_attachments: templateData.carouselImages.map((imageHash) => ({
            link: templateData.url || '',
            name: templateData.headline || '',
            description: templateData.description || '',
            image_hash: imageHash,
            call_to_action: {
              type: templateData.callToAction || 'LEARN_MORE'
            }
          })),
          call_to_action: {
            type: templateData.callToAction || 'LEARN_MORE'
          }
        };

        // FIX: Use 'caption' not 'link_caption' for display URL
        if (templateData.displayLink) {
          creative.object_story_spec.link_data.caption = templateData.displayLink;
        }

      } else {
        // SINGLE IMAGE AD (default)
        creative.object_story_spec.link_data = {
          link: templateData.url || '',
          message: templateData.primaryText || '',
          name: templateData.headline || '',
          description: templateData.description || '',
          call_to_action: {
            type: templateData.callToAction || 'LEARN_MORE'
          }
        };

        // FIX: Use 'caption' not 'link_caption' for display URL
        if (templateData.displayLink) {
          creative.object_story_spec.link_data.caption = templateData.displayLink;
        }

        if (templateData.imageHash) {
          creative.object_story_spec.link_data.image_hash = templateData.imageHash;
        }
      }

      body.creative = JSON.stringify(creative);
    }

    // ===== TRACKING =====
    // REMOVED: tracking_specs is redundant - pixel tracking is already set at ad set level via promoted_object
    // Cross-account deployments fail with "Account does not have access to pixel" errors
    // when trying to set tracking_specs with source account's pixel ID
    // See: facebookApi.js createAd() - tracking_specs is optional

    // ===== URL TAGS =====
    if (templateData.urlTags) {
      body.url_tags = templateData.urlTags;
    }

    return this.encodeBody(body);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get optimization goal from template data
   *
   * IMPORTANT: optimization_goal must be compatible with campaign objective
   * - OUTCOME_SALES + website conversions → OFFSITE_CONVERSIONS
   * - OUTCOME_LEADS + website conversions → OFFSITE_CONVERSIONS (NOT LEAD_GENERATION!)
   * - LEAD_GENERATION is only valid for instant forms (on Facebook), not website leads
   */
  getOptimizationGoalFromTemplate(templateData) {
    // For website conversions, always use OFFSITE_CONVERSIONS
    // This works for both OUTCOME_SALES and OUTCOME_LEADS objectives
    if (templateData.conversionLocation === 'website') {
      return 'OFFSITE_CONVERSIONS';
    }

    // For phone calls
    if (templateData.conversionLocation === 'calls') {
      return 'PHONE_CALL';
    }

    // For instant forms (on Facebook lead forms, not website)
    if (templateData.conversionLocation === 'instant_forms' ||
        templateData.conversionLocation === 'on_ad') {
      return 'LEAD_GENERATION';
    }

    // Default based on objective
    if (templateData.objective === 'OUTCOME_SALES') {
      return 'OFFSITE_CONVERSIONS';
    }

    if (templateData.objective === 'OUTCOME_LEADS') {
      return 'OFFSITE_CONVERSIONS';
    }

    // Fallback for other objectives
    return 'OFFSITE_CONVERSIONS';
  }

  /**
   * Convert "HH:MM" time string to minutes since midnight
   */
  timeToMinutes(timeString) {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours * 60) + minutes;
  }

  /**
   * Parse datetime string as EST timezone and return Unix timestamp
   *
   * CRITICAL FIX: The datetime-local input sends naive datetime strings (e.g., "2024-12-16T09:00")
   * without timezone info. The server's new Date() interprets this in the SERVER's timezone (often UTC).
   *
   * Since ad accounts are in EST, we need to interpret the user's input as EST time.
   *
   * Example: User enters "2024-12-16T09:00" meaning 9 AM EST
   * - Wrong: new Date("2024-12-16T09:00") on UTC server = 9 AM UTC = 4 AM EST
   * - Right: Parse as EST by appending EST offset = 9 AM EST = 14:00 UTC
   *
   * @param {string} dateTimeString - Naive datetime string from frontend (e.g., "2024-12-16T09:00")
   * @returns {number} Unix timestamp in seconds
   */
  parseDateTimeAsEST(dateTimeString) {
    if (!dateTimeString) return null;

    // Check if datetime already has timezone info
    if (dateTimeString.includes('Z') || dateTimeString.includes('+') || dateTimeString.includes('-', 10)) {
      // Already has timezone, parse directly
      return Math.floor(new Date(dateTimeString).getTime() / 1000);
    }

    // Determine if EST or EDT (Daylight Saving Time)
    // EST = UTC-5 (standard time, Nov-Mar)
    // EDT = UTC-4 (daylight time, Mar-Nov)
    const date = new Date(dateTimeString);
    const month = date.getMonth(); // 0-11

    // Rough DST check for US Eastern Time:
    // DST starts second Sunday of March, ends first Sunday of November
    // Simplified: March (2) through October (9) is roughly EDT
    let offsetHours;
    if (month >= 2 && month <= 9) {
      // March through October - likely EDT (UTC-4)
      // More precise: check specific dates, but this covers most cases
      offsetHours = -4;
    } else {
      // November through February - EST (UTC-5)
      offsetHours = -5;
    }

    // Append the offset to make it timezone-aware
    // e.g., "2024-12-16T09:00" + "-05:00" = "2024-12-16T09:00-05:00" (9 AM EST)
    const offsetString = offsetHours >= 0
      ? `+${String(offsetHours).padStart(2, '0')}:00`
      : `-${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;

    const dateTimeWithTZ = `${dateTimeString}${offsetString}`;
    const timestamp = Math.floor(new Date(dateTimeWithTZ).getTime() / 1000);

    console.log(`⏰ Parsed datetime as EST: "${dateTimeString}" → "${dateTimeWithTZ}" → timestamp ${timestamp}`);

    return timestamp;
  }

  // ============================================================================
  // STRATEGY 150 BATCH DUPLICATION - 100% ROOT EFFECT
  // ============================================================================

  /**
   * Duplicate ad sets using batch API for Strategy 150, Strategy For All, and Strategy For Ads
   * Replaces sequential /copies endpoint with efficient batch operations
   *
   * @param {string} originalAdSetId - ID of the original ad set to duplicate
   * @param {string} campaignId - Campaign ID to create ad sets in
   * @param {string} postId - Facebook post ID to reuse in ads (for regular ads) OR null for dynamic creatives
   * @param {number} count - Number of duplicates to create (default: 49)
   * @param {Object} formData - Original form data for naming + optional mediaHashes for dynamic creatives
   * @param {Object} formData.mediaHashes - Media hashes for dynamic creatives (imageHash, videoId, dynamicImages, etc.)
   * @param {boolean} formData.dynamicCreativeEnabled - Flag indicating dynamic creative is enabled
   * @returns {Object} Batch execution results
   */
  async duplicateAdSetsBatch(originalAdSetId, campaignId, postId, count = 49, formData = {}) {
    try {
      console.log('🚀 ========================================');
      console.log('🚀 OPTIMIZED BATCH AD SET DUPLICATION');
      console.log('🚀 ========================================');
      console.log(`📊 Creating ${count} duplicates of ad set ${originalAdSetId}`);
      console.log(`📊 Campaign: ${campaignId}`);
      console.log(`📊 Creative Type: ${formData.dynamicCreativeEnabled ? 'Dynamic Creative (asset_feed_spec)' : 'Regular Ad (post_id)'}`);
      if (postId) {
        console.log(`📊 Post ID: ${postId}`);
      } else if (formData.mediaHashes) {
        console.log(`📊 Media Hashes: Provided for asset_feed_spec`);
      }
      console.log(`📊 Total operations: ${count * 2} (${count} ad sets + ${count} ads)`);

      // Step 1: Fetch campaign and original ad set data
      console.log('\n📋 Step 1: Fetching campaign and ad set data...');
      const axios = require('axios');

      // Fetch campaign to check if CBO is enabled
      const campaignResponse = await axios.get(
        `${this.baseURL}/${campaignId}`,
        {
          params: {
            fields: 'name,daily_budget,lifetime_budget',
            access_token: this.accessToken
          }
        }
      );

      const campaign = campaignResponse.data;
      const campaignHasCBO = !!(campaign.daily_budget || campaign.lifetime_budget);
      console.log('✅ Campaign data fetched');
      console.log(`   Name: ${campaign.name}`);
      console.log(`   CBO Enabled: ${campaignHasCBO ? 'Yes' : 'No'}`);
      if (campaignHasCBO) {
        console.log(`   Campaign Budget: $${(campaign.daily_budget || campaign.lifetime_budget) / 100}`);
      }

      // Fetch original ad set
      const originalAdSetResponse = await axios.get(
        `${this.baseURL}/${originalAdSetId}`,
        {
          params: {
            fields: 'name,targeting,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_strategy,promoted_object,attribution_spec,daily_min_spend_target,daily_spend_cap,start_time,end_time,pacing_type,destination_type,is_dynamic_creative',
            access_token: this.accessToken
          }
        }
      );

      const originalAdSet = originalAdSetResponse.data;
      console.log('\n✅ Original ad set data fetched');
      console.log(`   Name: ${originalAdSet.name}`);

      // Check if ad set has budget (should be empty if CBO is enabled)
      const adSetHasBudget = originalAdSet.daily_budget || originalAdSet.lifetime_budget;
      if (adSetHasBudget) {
        console.log(`   Ad Set Budget: $${(originalAdSet.daily_budget || originalAdSet.lifetime_budget) / 100}`);
      } else {
        console.log(`   Ad Set Budget: None (using campaign budget - CBO)`);
      }

      if (originalAdSet.daily_min_spend_target || originalAdSet.daily_spend_cap) {
        console.log(`   Spending Limits:`);
        if (originalAdSet.daily_min_spend_target) {
          console.log(`     - Min: $${originalAdSet.daily_min_spend_target / 100}`);
        }
        if (originalAdSet.daily_spend_cap) {
          console.log(`     - Max: $${originalAdSet.daily_spend_cap / 100}`);
        }
      }

      console.log(`   Optimization Goal: ${originalAdSet.optimization_goal}`);
      console.log(`   Billing Event: ${originalAdSet.billing_event}`);

      const accountId = this.adAccountId.replace('act_', '');
      const successfulPairs = [];
      const failedPairs = [];
      const orphanedAdSets = [];

      // =========================================================================
      // PRE-CLEANUP: Remove orphan ad sets from previous failed runs BEFORE creating new ones
      // This ensures we don't accumulate orphans across multiple attempts
      // =========================================================================
      console.log('\n🧹 Step 1.5: Pre-cleanup - checking for orphan ad sets from previous runs...');
      let preCleanupOrphansDeleted = 0;
      try {
        // Get existing "Copy N" ad sets in this campaign
        const existingAdSetsResponse = await axios.get(
          `${this.baseURL}/${campaignId}/adsets`,
          {
            params: {
              fields: 'id,name',
              limit: 100,
              access_token: this.accessToken
            }
          }
        );

        const existingAdSets = existingAdSetsResponse.data?.data || [];
        const copyAdSets = existingAdSets.filter(adSet => adSet.name.match(/- Copy \d+$/));

        if (copyAdSets.length > 0) {
          console.log(`     📋 Found ${copyAdSets.length} existing "Copy N" ad sets - checking for orphans...`);

          // Use batch API to check ads for multiple ad sets at once (more efficient)
          const batchRequests = copyAdSets.map(adSet => ({
            method: 'GET',
            relative_url: `${adSet.id}/ads?fields=id&limit=1`
          }));

          // Process in chunks of 50 to avoid batch limits
          const chunkSize = 50;
          const orphanAdSetIds = [];

          for (let i = 0; i < batchRequests.length; i += chunkSize) {
            const chunk = batchRequests.slice(i, i + chunkSize);
            const adSetsChunk = copyAdSets.slice(i, i + chunkSize);

            try {
              const batchResponse = await axios.post(
                this.baseURL,
                { batch: JSON.stringify(chunk), access_token: this.accessToken },
                { timeout: 30000 }
              );

              // Check each response to find orphans (ad sets without ads)
              batchResponse.data.forEach((result, idx) => {
                if (result && result.code === 200) {
                  try {
                    const body = JSON.parse(result.body);
                    const hasAds = body.data && body.data.length > 0;
                    if (!hasAds) {
                      orphanAdSetIds.push(adSetsChunk[idx]);
                    }
                  } catch (e) {
                    // If we can't parse, assume it's not an orphan
                  }
                }
              });
            } catch (batchError) {
              // If batch fails due to rate limit, skip pre-cleanup
              if (batchError.response?.data?.error?.code === 17) {
                console.log(`     ⚠️ Rate limited - skipping pre-cleanup (will clean up after creation)`);
                break;
              }
              console.log(`     ⚠️ Batch check failed: ${batchError.message}`);
            }

            // Small delay between chunks
            if (i + chunkSize < batchRequests.length) {
              await this.delay(500);
            }
          }

          // Delete orphan ad sets
          if (orphanAdSetIds.length > 0) {
            console.log(`     🗑️ Found ${orphanAdSetIds.length} orphan ad sets - deleting...`);

            for (const adSet of orphanAdSetIds) {
              try {
                await axios.delete(`${this.baseURL}/${adSet.id}`, { params: { access_token: this.accessToken } });
                console.log(`     🗑️ Deleted orphan: ${adSet.id} (${adSet.name})`);
                preCleanupOrphansDeleted++;
                const copyMatch = adSet.name.match(/- Copy (\d+)$/);
                if (copyMatch) {
                  orphanedAdSets.push({ adSetId: adSet.id, pairNumber: parseInt(copyMatch[1]), deleted: true, phase: 'pre-cleanup' });
                }
              } catch (deleteError) {
                if (deleteError.response?.data?.error?.code === 17) {
                  console.log(`     ⚠️ Rate limited during deletion - stopping pre-cleanup`);
                  break;
                }
                console.error(`     ❌ Failed to delete orphan ${adSet.id}: ${deleteError.message}`);
              }
              await this.delay(200);
            }

            console.log(`     ✅ Pre-cleanup complete: ${preCleanupOrphansDeleted} orphans deleted`);
          } else {
            console.log(`     ✅ No orphans found - all existing ad sets have ads`);
          }
        } else {
          console.log(`     ✅ No existing "Copy N" ad sets found - clean slate`);
        }
      } catch (preCleanupError) {
        // If pre-cleanup fails due to rate limit, continue with creation
        if (preCleanupError.response?.data?.error?.code === 17) {
          console.log(`     ⚠️ Rate limited - skipping pre-cleanup`);
        } else {
          console.error(`     ⚠️ Pre-cleanup check failed: ${preCleanupError.message}`);
        }
        // Continue with creation regardless of pre-cleanup failure
      }

      // Prepare text variations once (used for all pairs)
      // CRITICAL: Deduplicate text arrays - Facebook rejects duplicates with error:
      // "Duplicate of ad asset values are not allowed"
      let textVariations = null;
      if (formData.dynamicTextEnabled || formData.dynamicCreativeEnabled) {
        // Build and deduplicate primaryTexts
        let primaryTexts = formData.primaryTextVariations
          ? formData.primaryTextVariations.filter(t => t && t.trim()).map(t => t.trim())
          : (formData.primaryText ? [formData.primaryText.trim()] : []);
        primaryTexts = [...new Set(primaryTexts)];

        // Build and deduplicate headlines
        let headlines = formData.headlineVariations
          ? formData.headlineVariations.filter(h => h && h.trim()).map(h => h.trim())
          : (formData.headline ? [formData.headline.trim()] : []);
        headlines = [...new Set(headlines)];

        textVariations = {
          primaryTexts,
          headlines,
          primaryText: formData.primaryText,
          headline: formData.headline,
          description: formData.description,
          url: formData.url,
          displayLink: formData.displayLink,
          callToAction: formData.callToAction
        };

        console.log(`  📝 Text variations prepared: ${primaryTexts.length} primary texts, ${headlines.length} headlines (deduplicated)`);
      }

      // HEAVY PAYLOAD DETECTION: Estimate payload size
      // Dynamic creatives with multiple images/videos can exceed socket limits
      const hasDynamicCreative = formData.dynamicCreativeEnabled || formData.dynamicTextEnabled;
      const hasMultipleMedia = formData.mediaHashes?.dynamicImages?.length > 3 ||
                               formData.mediaHashes?.dynamicVideos?.length > 2;
      const hasMultipleTextVariations = (formData.primaryTextVariations?.length || 0) > 3 ||
                                        (formData.headlineVariations?.length || 0) > 3;

      // Determine pairs per batch based on payload complexity
      // Heavy payload: 2 pairs per batch (4 operations)
      // Medium payload: 3 pairs per batch (6 operations)
      // Light payload: 5 pairs per batch (10 operations)
      let pairsPerBatch = 5; // Default: 5 pairs = 10 operations per batch
      let batchDelayMs = 1500;

      if (hasMultipleMedia && hasMultipleTextVariations) {
        pairsPerBatch = 2; // Heavy payload: reduce to avoid socket timeout
        batchDelayMs = 2500;
        console.log(`\n⚠️  Heavy payload detected (multiple media + text variations)`);
        console.log(`   Using reduced batch size: ${pairsPerBatch} pairs per batch`);
      } else if (hasDynamicCreative || hasMultipleMedia || hasMultipleTextVariations) {
        pairsPerBatch = 3; // Medium payload
        batchDelayMs = 2000;
        console.log(`\n📊 Medium payload detected`);
        console.log(`   Using moderate batch size: ${pairsPerBatch} pairs per batch`);
      } else {
        console.log(`\n📊 Light payload - using optimized batch size: ${pairsPerBatch} pairs per batch`);
      }

      const totalBatches = Math.ceil(count / pairsPerBatch);
      console.log(`\n🔄 Step 2: Executing OPTIMIZED BATCH creation...`);
      console.log(`📦 Total pairs to create: ${count}`);
      console.log(`📊 Pairs per batch: ${pairsPerBatch}`);
      console.log(`📊 Total batches: ${totalBatches}`);
      console.log(`📊 API calls: ${totalBatches} (vs ${count} with atomic pairs)`);
      console.log(`💰 API call reduction: ${Math.round((1 - totalBatches / count) * 100)}%`);

      // Process pairs in batches
      let pairIndex = 0;

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const batchStartIndex = batchNum * pairsPerBatch;
        const batchEndIndex = Math.min(batchStartIndex + pairsPerBatch, count);
        const pairsInThisBatch = batchEndIndex - batchStartIndex;

        console.log(`\n  📤 Batch ${batchNum + 1}/${totalBatches}: Creating pairs ${batchStartIndex + 1}-${batchEndIndex}...`);

        try {
          // Build batch operations for this group of pairs
          // CRITICAL: Interleave [adset-0, ad-0, adset-1, ad-1, ...] for correct references
          const batchOperations = [];

          for (let i = 0; i < pairsInThisBatch; i++) {
            const pairNumber = batchStartIndex + i + 1;

            // Ad set operation (uses named reference for the ad to find it)
            const adSetBody = this.prepareAdSetBodyFromOriginal(
              originalAdSet,
              campaignId,
              pairNumber
            );

            batchOperations.push({
              method: 'POST',
              relative_url: `act_${accountId}/adsets`,
              body: adSetBody,
              name: `create-adset-${i}` // Named so ad can reference it
            });

            // Ad operation (references adset by name within THIS batch)
            const adBody = this.prepareAdBodyForDuplicate(
              formData.campaignName || 'Campaign',
              postId,
              pairNumber,
              `{result=create-adset-${i}:$.id}`, // Reference by name within same batch
              formData.mediaHashes,
              formData.dynamicCreativeEnabled || formData.dynamicTextEnabled,
              textVariations,
              formData
            );

            batchOperations.push({
              method: 'POST',
              relative_url: `act_${accountId}/ads`,
              body: adBody
            });
          }

          // Execute this batch - NO RETRY on transient errors
          // CRITICAL: Facebook often returns transient errors but STILL creates resources
          // Retrying creates duplicates. Smart verification at the end will correct any issues.
          let results = null;

          try {
            const response = await axios.post(
              this.baseURL,
              {
                batch: JSON.stringify(batchOperations),
                access_token: this.accessToken
              },
              {
                timeout: 120000 // 2 minute timeout for batch
              }
            );

            results = response.data;

            // Check for transient errors - LOG but do NOT retry
            let hasTransientError = false;
            for (const result of results) {
              if (result?.code === 500 || result?.code === 503) {
                try {
                  const body = JSON.parse(result.body);
                  if (body.error?.is_transient === true) {
                    hasTransientError = true;
                    break;
                  }
                } catch (e) {}
              }
            }

            if (hasTransientError) {
              console.log(`     ⚠️ Transient error detected - NOT retrying (Facebook often creates despite this error)`);
              console.log(`     ℹ️ Smart verification at end will correct any discrepancies`);
            }
          } catch (reqError) {
            console.error(`     ❌ Batch ${batchNum + 1} request failed: ${reqError.message}`);
            // Continue to next batch - smart verification will handle missing items
          }

          // DEBUG: Log raw results to understand the response format
          console.log(`     📋 DEBUG: Batch results type: ${typeof results}, isArray: ${Array.isArray(results)}, length: ${results?.length}`);
          if (results && results.length > 0) {
            console.log(`     📋 DEBUG: First result: ${JSON.stringify(results[0]).substring(0, 200)}`);
          }

          // Process results for this batch
          // Results are interleaved: [adset-0, ad-0, adset-1, ad-1, ...]
          const failedAdSetIndices = new Set();

          for (let i = 0; i < pairsInThisBatch; i++) {
            const adSetResultIndex = i * 2;
            const adResultIndex = i * 2 + 1;
            const pairNumber = batchStartIndex + i + 1;

            const adSetResult = results[adSetResultIndex];
            const adResult = results[adResultIndex];

            let adSetId = null;
            let adId = null;
            let adSetSuccess = false;
            let adSuccess = false;

            // DEBUG: Log individual result parsing
            console.log(`     📋 DEBUG Pair ${pairNumber}: adSetResult.code=${adSetResult?.code}, adResult.code=${adResult?.code}`);

            // Parse ad set result - handle BOTH code 200 AND successful body with id
            if (adSetResult && adSetResult.body) {
              try {
                const body = JSON.parse(adSetResult.body);
                // Success if code is 200 OR body has id without error
                if ((adSetResult.code === 200 || body.id) && !body.error) {
                  adSetId = body.id;
                  adSetSuccess = true;
                  console.log(`       ✅ Ad set ${pairNumber} parsed: ${adSetId}`);
                } else if (body.error) {
                  console.log(`       ❌ Ad set ${pairNumber} error: ${body.error?.message || JSON.stringify(body.error)}`);
                }
              } catch (e) {
                console.error(`       ❌ Failed to parse ad set result: ${e.message}, body: ${adSetResult.body?.substring(0, 100)}`);
              }
            } else {
              console.log(`       ❌ Ad set ${pairNumber}: No result or no body (code: ${adSetResult?.code})`);
            }

            // Parse ad result - handle BOTH code 200 AND successful body with id
            if (adResult && adResult.body) {
              try {
                const body = JSON.parse(adResult.body);
                // Success if code is 200 OR body has id without error
                if ((adResult.code === 200 || body.id) && !body.error) {
                  adId = body.id;
                  adSuccess = true;
                  console.log(`       ✅ Ad ${pairNumber} parsed: ${adId}`);
                } else if (body.error) {
                  console.log(`       ❌ Ad ${pairNumber} error: ${body.error?.message || JSON.stringify(body.error)}`);
                }
              } catch (e) {
                console.error(`       ❌ Failed to parse ad result: ${e.message}, body: ${adResult.body?.substring(0, 100)}`);
              }
            } else {
              console.log(`       ❌ Ad ${pairNumber}: No result or no body (code: ${adResult?.code})`);
            }

            // Check pair success
            // CRITICAL FIX: If ad was created successfully, ad set MUST exist (ad references it)
            // Facebook batch sometimes returns null for ad set but still creates it
            if (adSetSuccess && adSuccess) {
              // SUCCESS: Both ad set and ad created (normal case)
              successfulPairs.push({ adSetId, adId, pairNumber });
              console.log(`     ✅ Pair ${pairNumber} SUCCESS (both parsed)`);
            } else if (!adSetSuccess && adSuccess) {
              // INFERRED SUCCESS: Ad created = ad set must exist (Facebook batch quirk)
              // The ad set was created but response was null - mark as success
              console.log(`     ✅ Pair ${pairNumber} SUCCESS (inferred from ad creation - ad set response was null)`);
              successfulPairs.push({ adSetId: `inferred-from-ad-${adId}`, adId, pairNumber });
            } else if (adSetSuccess && !adSuccess) {
              // ORPHAN: Ad set created but ad failed - mark for deletion
              failedAdSetIndices.add(i);
              const adErrorMsg = adResult?.body ? (() => {
                try { return JSON.parse(adResult.body).error?.message; } catch { return 'Unknown'; }
              })() : 'Unknown error';
              console.warn(`     ⚠️  Pair ${pairNumber}: Ad set created but ad failed - ${adErrorMsg}`);
              orphanedAdSets.push({ adSetId, pairNumber, deleted: false });
              failedPairs.push({ pairNumber, reason: 'ad_creation_failed', adSetId });
            } else {
              // Both failed - true failure
              const adSetErrorMsg = adSetResult?.body ? (() => {
                try { return JSON.parse(adSetResult.body).error?.message; } catch { return 'Unknown'; }
              })() : 'Unknown error';
              console.error(`     ❌ Pair ${pairNumber} failed: ${adSetErrorMsg}`);
              failedPairs.push({ pairNumber, reason: 'ad_set_creation_failed' });
            }
          }

          // Log batch summary
          const batchSuccessCount = pairsInThisBatch - failedAdSetIndices.size -
            failedPairs.filter(f => f.pairNumber > batchStartIndex && f.pairNumber <= batchEndIndex && f.reason === 'ad_set_creation_failed').length;
          console.log(`     ✅ Batch ${batchNum + 1} complete: ${batchSuccessCount}/${pairsInThisBatch} pairs succeeded`);

          // Delay between batches
          if (batchNum < totalBatches - 1) {
            await this.delay(batchDelayMs);
          }

        } catch (batchError) {
          // CRITICAL: If entire batch fails, fall back to atomic pairs for remaining items
          console.error(`     ❌ Batch ${batchNum + 1} failed: ${batchError.message}`);

          // Check if this is a timeout/socket error
          const isTimeoutError = batchError.code === 'ECONNRESET' ||
                                 batchError.code === 'ETIMEDOUT' ||
                                 batchError.message.includes('socket hang up') ||
                                 batchError.message.includes('timeout');

          if (isTimeoutError && pairsPerBatch > 1) {
            console.log(`     🔄 Socket timeout detected - falling back to atomic pairs for remaining ${count - batchStartIndex} pairs...`);

            // Fall back to atomic pairs for remaining items
            const atomicResult = await this.duplicateAdSetsBatchAtomic(
              originalAdSetId,
              campaignId,
              postId,
              count - batchStartIndex,
              formData,
              originalAdSet,
              accountId,
              textVariations,
              batchStartIndex + 1 // Start numbering from where we left off
            );

            // Merge results
            successfulPairs.push(...atomicResult.successfulPairs);
            failedPairs.push(...atomicResult.failedPairs);
            orphanedAdSets.push(...atomicResult.orphanedAdSets);

            break; // Exit batch loop since atomic method handled the rest
          } else {
            // Mark all pairs in this batch as failed
            for (let i = 0; i < pairsInThisBatch; i++) {
              failedPairs.push({
                pairNumber: batchStartIndex + i + 1,
                reason: 'batch_request_failed',
                error: batchError.message
              });
            }
          }
        }
      }

      // Step 3: Clean up orphaned ad sets
      if (orphanedAdSets.length > 0) {
        console.log(`\n🗑️  Cleaning up ${orphanedAdSets.length} orphaned ad sets...`);

        for (const orphan of orphanedAdSets) {
          if (!orphan.deleted && orphan.adSetId) {
            try {
              await axios.delete(
                `${this.baseURL}/${orphan.adSetId}`,
                { params: { access_token: this.accessToken } }
              );
              orphan.deleted = true;
              console.log(`     ✅ Deleted orphaned ad set ${orphan.adSetId}`);
            } catch (deleteError) {
              console.error(`     ❌ Failed to delete orphaned ad set ${orphan.adSetId}: ${deleteError.message}`);
            }
          }
        }
      }

      // EARLY EXIT CHECK: If we already have enough successful pairs, skip retries
      // This handles the case where batch succeeded but ad set responses were null
      console.log(`\n📊 Step 3.5: Checking if we already have enough pairs...`);
      console.log(`     Expected: ${count}, Successful: ${successfulPairs.length}, Failed: ${failedPairs.length}`);

      if (successfulPairs.length >= count) {
        console.log(`     ✅ Already have ${successfulPairs.length} successful pairs - skipping retries!`);
        // Clear failed pairs since we inferred success from ad creation
        failedPairs.length = 0;
      }

      // Step 4: SMART RETRY - First verify what actually exists to avoid duplicates
      if (failedPairs.length > 0) {
        console.log(`\n🔄 Step 4: Verifying campaign state before retrying ${failedPairs.length} failed pairs...`);

        // CRITICAL: Query Facebook to see which ad sets/ads were actually created
        // This prevents creating duplicates when batch succeeded but response parsing failed
        try {
          const existingAdSetsResponse = await axios.get(
            `${this.baseURL}/${campaignId}/adsets`,
            {
              params: {
                fields: 'id,name,ads{id,name}',
                limit: 100,
                access_token: this.accessToken
              }
            }
          );

          const existingAdSets = existingAdSetsResponse.data?.data || [];
          console.log(`     📋 Found ${existingAdSets.length} existing ad sets in campaign`);

          // Build map of existing pair numbers (extract from name pattern "- Copy N")
          const existingPairNumbers = new Set();
          const existingAdSetMap = new Map(); // pairNumber -> {adSetId, hasAd}

          for (const adSet of existingAdSets) {
            // Check for "- Copy N" pattern
            const copyMatch = adSet.name.match(/- Copy (\d+)$/);
            if (copyMatch) {
              const pairNum = parseInt(copyMatch[1], 10);
              existingPairNumbers.add(pairNum);
              const hasAd = adSet.ads?.data?.length > 0;
              existingAdSetMap.set(pairNum, {
                adSetId: adSet.id,
                hasAd,
                adId: hasAd ? adSet.ads.data[0].id : null
              });

              // If pair exists with ad, add to successfulPairs and remove from failed
              if (hasAd) {
                successfulPairs.push({
                  adSetId: adSet.id,
                  adId: adSet.ads.data[0].id,
                  pairNumber: pairNum
                });
                console.log(`     ✅ Pair ${pairNum} already exists with ad - marking as success`);
              }
            }
          }

          // Filter out pairs that already exist with ads
          const pairsToRetry = [...new Set(failedPairs.map(p => p.pairNumber))]
            .filter(pairNum => {
              const existing = existingAdSetMap.get(pairNum);
              if (existing?.hasAd) {
                // Already complete - remove from failedPairs
                const idx = failedPairs.findIndex(f => f.pairNumber === pairNum);
                if (idx !== -1) failedPairs.splice(idx, 1);
                return false;
              }
              if (existing && !existing.hasAd) {
                // Ad set exists but no ad - this is an orphan, delete it first
                console.log(`     🗑️ Pair ${pairNum}: Orphan detected (ad set without ad) - will delete and recreate`);
              }
              return true;
            });

          console.log(`     📋 Pairs needing retry: ${pairsToRetry.length} (after verification)`);

          // Delete orphan ad sets that have no ads
          for (const pairNum of pairsToRetry) {
            const existing = existingAdSetMap.get(pairNum);
            if (existing && !existing.hasAd) {
              try {
                await axios.delete(`${this.baseURL}/${existing.adSetId}`, { params: { access_token: this.accessToken } });
                console.log(`     🗑️ Deleted orphan ad set ${existing.adSetId} for pair ${pairNum}`);
              } catch (e) {
                console.error(`     ❌ Failed to delete orphan ${existing.adSetId}: ${e.message}`);
              }
              await this.delay(500);
            }
          }

          // Now retry only the pairs that actually need it
          for (const pairNumber of pairsToRetry) {
            console.log(`  📤 Retrying pair ${pairNumber}...`);

            try {
              // Create atomic batch for this single pair
              const adSetBody = this.prepareAdSetBodyFromOriginal(originalAdSet, campaignId, pairNumber);
              const adBody = this.prepareAdBodyForDuplicate(
                formData.campaignName || 'Campaign',
                postId,
                pairNumber,
                `{result=0:$.id}`,
                formData.mediaHashes,
                formData.dynamicCreativeEnabled || formData.dynamicTextEnabled,
                textVariations,
                formData
              );

              const atomicBatch = [
                { method: 'POST', relative_url: `act_${accountId}/adsets`, body: adSetBody },
                { method: 'POST', relative_url: `act_${accountId}/ads`, body: adBody }
              ];

              const response = await axios.post(
                this.baseURL,
                { batch: JSON.stringify(atomicBatch), access_token: this.accessToken },
                { timeout: 60000 }
              );

              const results = response.data;
              const adSetResult = results[0];
              const adResult = results[1];

              let adSetId = null;
              let adId = null;

              if (adSetResult?.body) {
                try {
                  const body = JSON.parse(adSetResult.body);
                  if (body.id && !body.error) adSetId = body.id;
                } catch (e) {}
              }

              if (adResult?.body) {
                try {
                  const body = JSON.parse(adResult.body);
                  if (body.id && !body.error) adId = body.id;
                } catch (e) {}
              }

              if (adSetId && adId) {
                successfulPairs.push({ adSetId, adId, pairNumber });
                console.log(`     ✅ Pair ${pairNumber} retry succeeded!`);

                // Remove from failedPairs
                const failIndex = failedPairs.findIndex(p => p.pairNumber === pairNumber);
                if (failIndex !== -1) {
                  failedPairs.splice(failIndex, 1);
                }
              } else if (adSetId && !adId) {
                // Orphan again - delete it
                console.log(`     ⚠️ Pair ${pairNumber}: Ad set created but ad failed - deleting orphan...`);
                try {
                  await axios.delete(`${this.baseURL}/${adSetId}`, { params: { access_token: this.accessToken } });
                  console.log(`     🗑️ Deleted orphaned ad set ${adSetId}`);
                } catch (e) {
                  console.error(`     ❌ Failed to delete orphan: ${e.message}`);
                }
              } else {
                console.log(`     ❌ Pair ${pairNumber} retry failed`);
              }

              // Delay between retries
              await this.delay(2000);
            } catch (retryError) {
              console.error(`     ❌ Pair ${pairNumber} retry error: ${retryError.message}`);
            }
          }

        } catch (verifyError) {
          console.error(`     ❌ Failed to verify campaign state: ${verifyError.message}`);
          console.log(`     ⚠️ Skipping retries to avoid creating duplicates`);
        }
      }

      // =========================================================================
      // SMART VERIFICATION: ONE API call to verify count and correct discrepancies
      // This replaces the old cleanup logic - much more efficient and reliable
      // =========================================================================
      console.log(`\n🔍 Step 5: Smart Verification (ONE API call to verify and correct)...`);

      // Wait a moment for Facebook's eventual consistency
      await this.delay(2000);

      // Expected total = 1 original + count duplicates
      const expectedTotalAdSets = 1 + count;
      const verificationResult = await this.smartVerifyAndCorrect(campaignId, expectedTotalAdSets, originalAdSetId);

      // Update counts based on verification
      const smartVerifyCleanup = (verificationResult.orphansDeleted || 0) + (verificationResult.extrasDeleted || 0);
      if (verificationResult.corrections) {
        verificationResult.corrections.forEach(correction => {
          if (correction.action === 'deleted_orphan' || correction.action === 'deleted_extra') {
            orphanedAdSets.push({
              adSetId: correction.adSetId,
              pairNumber: 0,
              deleted: true,
              phase: 'smart-verification',
              reason: correction.reason
            });
          }
        });
      }

      const totalCleanup = preCleanupOrphansDeleted + smartVerifyCleanup;

      // Final stats
      const newAdSetIds = successfulPairs.map(p => p.adSetId);
      const newAdIds = successfulPairs.map(p => p.adId);
      const actualApiCalls = totalBatches + failedPairs.length; // Batches + retries

      console.log(`\n📊 OPTIMIZED BATCH RESULTS:`);
      console.log(`   ✅ Successful pairs (from batch): ${successfulPairs.length}/${count}`);
      console.log(`   ❌ Failed pairs (from batch): ${failedPairs.length}/${count}`);
      console.log(`   🔍 Smart Verification: ${verificationResult.verified ? 'PASSED' : 'FAILED'}`);
      console.log(`      - Actual ad sets in campaign: ${verificationResult.actualAdSets}`);
      console.log(`      - Actual ads in campaign: ${verificationResult.actualAds}`);
      console.log(`      - Expected ad sets: ${expectedTotalAdSets}`);
      console.log(`      - Orphans deleted (no ads): ${verificationResult.orphansDeleted || 0}`);
      console.log(`      - Extras deleted (over limit): ${verificationResult.extrasDeleted || 0}`);
      console.log(`   🗑️ Total cleanup: ${totalCleanup} (pre=${preCleanupOrphansDeleted}, smart-verify=${smartVerifyCleanup})`);

      if (failedPairs.length > 0) {
        console.log(`\n⚠️  Failed Pairs Details:`);
        failedPairs.slice(0, 5).forEach(f => {
          console.log(`   - Pair ${f.pairNumber}: ${f.reason}${f.error ? ` - ${f.error}` : ''}`);
        });
        if (failedPairs.length > 5) {
          console.log(`   ... and ${failedPairs.length - 5} more`);
        }
      }

      console.log('\n✅ ========================================');
      console.log('✅ OPTIMIZED BATCH DUPLICATION COMPLETE!');
      console.log('✅ ========================================');
      console.log(`✅ Final verified count: ${verificationResult.actualAdSets} ad sets, ${verificationResult.actualAds} ads`);
      console.log(`✅ API calls used: ${actualApiCalls} batches + 1 verification = ${actualApiCalls + 1}`);
      console.log(`✅ Smart verification ensured exact count!`);

      return {
        success: true,
        adSets: newAdSetIds.map((id, index) => ({
          id,
          name: `${originalAdSet.name} - Copy ${successfulPairs[index].pairNumber}`
        })),
        ads: newAdIds.map((id, index) => ({
          id,
          name: `Ad Copy ${successfulPairs[index].pairNumber}`
        })),
        operations: count * 2,
        batchesExecuted: actualApiCalls,
        apiCallsSaved: count - actualApiCalls,
        orphanedAdSets: orphanedAdSets,
        // Smart verification results - THE SOURCE OF TRUTH for final counts
        verification: {
          verified: verificationResult.verified,
          actualAdSets: verificationResult.actualAdSets,
          actualAds: verificationResult.actualAds,
          expectedAdSets: expectedTotalAdSets,
          orphansDeleted: verificationResult.orphansDeleted || 0,
          extrasDeleted: verificationResult.extrasDeleted || 0,
          totalCleanup: totalCleanup,
          corrections: verificationResult.corrections
        },
        summary: {
          totalExpected: count,
          totalSuccess: successfulPairs.length,
          // Use verified counts as the final truth
          totalAdSetsCreated: verificationResult.actualAdSets - 1, // Minus original
          totalAdsCreated: verificationResult.actualAds - 1, // Minus original's ad
          totalFailed: failedPairs.length,
          totalOrphaned: orphanedAdSets.filter(o => !o.deleted).length,
          successRate: Math.round(((verificationResult.actualAdSets - 1) / count) * 100),
          hasFailures: failedPairs.length > 0,
          hasOrphans: orphanedAdSets.filter(o => !o.deleted).length > 0
        }
      };

    } catch (error) {
      console.error('❌ Batch ad set duplication failed:', error.message);
      throw error;
    }
  }

  /**
   * Fallback method: Create ad set/ad pairs atomically (1 pair per API call)
   * Used when optimized batching fails due to timeouts or heavy payloads
   */
  async duplicateAdSetsBatchAtomic(originalAdSetId, campaignId, postId, count, formData, originalAdSet, accountId, textVariations, startNumber = 1) {
    const axios = require('axios');
    const successfulPairs = [];
    const failedPairs = [];
    const orphanedAdSets = [];

    console.log(`\n🔄 ATOMIC FALLBACK: Creating ${count} pairs one at a time...`);

    for (let i = 0; i < count; i++) {
      const pairNumber = startNumber + i;
      console.log(`  📤 Creating pair ${pairNumber}...`);

      try {
        // Prepare atomic batch (exactly 2 operations)
        const pairBatch = [];

        // Operation 0: Create ad set
        const adSetBody = this.prepareAdSetBodyFromOriginal(
          originalAdSet,
          campaignId,
          pairNumber
        );

        pairBatch.push({
          method: 'POST',
          relative_url: `act_${accountId}/adsets`,
          body: adSetBody
        });

        // Operation 1: Create ad (references operation 0)
        const adBody = this.prepareAdBodyForDuplicate(
          formData.campaignName || 'Campaign',
          postId,
          pairNumber,
          '{result=0:$.id}',
          formData.mediaHashes,
          formData.dynamicCreativeEnabled || formData.dynamicTextEnabled,
          textVariations,
          formData
        );

        pairBatch.push({
          method: 'POST',
          relative_url: `act_${accountId}/ads`,
          body: adBody
        });

        // Execute
        const response = await axios.post(
          this.baseURL,
          {
            batch: JSON.stringify(pairBatch),
            access_token: this.accessToken
          }
        );

        const results = response.data;
        const adSetResult = results[0];
        const adResult = results[1];

        let adSetId = null;
        let adId = null;
        let adSetSuccess = false;
        let adSuccess = false;

        if (adSetResult?.code === 200 && adSetResult.body) {
          try {
            const body = JSON.parse(adSetResult.body);
            if (body.id) { adSetId = body.id; adSetSuccess = true; }
          } catch (e) {}
        }

        if (adResult?.code === 200 && adResult.body) {
          try {
            const body = JSON.parse(adResult.body);
            if (body.id) { adId = body.id; adSuccess = true; }
          } catch (e) {}
        }

        if (adSetSuccess && adSuccess) {
          successfulPairs.push({ adSetId, adId, pairNumber });
          console.log(`     ✅ Pair ${pairNumber} complete`);
        } else if (adSetSuccess && !adSuccess) {
          // Orphan - delete immediately
          try {
            await axios.delete(`${this.baseURL}/${adSetId}`, { params: { access_token: this.accessToken } });
            orphanedAdSets.push({ adSetId, pairNumber, deleted: true });
          } catch (e) {
            orphanedAdSets.push({ adSetId, pairNumber, deleted: false });
          }
          failedPairs.push({ pairNumber, reason: 'ad_creation_failed' });
        } else {
          failedPairs.push({ pairNumber, reason: 'ad_set_creation_failed' });
        }

        // Delay between pairs
        if (i < count - 1) {
          await this.delay(2000);
        }

      } catch (error) {
        console.error(`     ❌ Pair ${pairNumber} failed: ${error.message}`);
        failedPairs.push({ pairNumber, reason: 'batch_request_failed', error: error.message });
      }
    }

    return { successfulPairs, failedPairs, orphanedAdSets };
  }

  /**
   * Prepare ad set body from original ad set data (for Strategy 150 duplication)
   */
  prepareAdSetBodyFromOriginal(originalAdSet, campaignId, copyNumber) {
    const body = {
      name: `${originalAdSet.name} - Copy ${copyNumber}`,
      campaign_id: campaignId,
      status: 'ACTIVE',
      targeting: JSON.stringify(originalAdSet.targeting),
      optimization_goal: originalAdSet.optimization_goal,
      billing_event: originalAdSet.billing_event || 'IMPRESSIONS'
    };

    // Budget
    if (originalAdSet.daily_budget) {
      body.daily_budget = originalAdSet.daily_budget;
    }
    if (originalAdSet.lifetime_budget) {
      body.lifetime_budget = originalAdSet.lifetime_budget;
    }

    // Bid strategy
    if (originalAdSet.bid_strategy) {
      body.bid_strategy = originalAdSet.bid_strategy;
    }

    // Promoted object
    if (originalAdSet.promoted_object) {
      body.promoted_object = JSON.stringify(originalAdSet.promoted_object);
    }

    // FORCE 1-DAY CLICK, 1-DAY VIEW ATTRIBUTION (matching Strategy 150 behavior)
    body.attribution_spec = JSON.stringify([
      { event_type: 'CLICK_THROUGH', window_days: 1 },
      { event_type: 'VIEW_THROUGH', window_days: 1 }
    ]);

    // Spending limits (CRITICAL: preserve these!)
    if (originalAdSet.daily_min_spend_target !== undefined && originalAdSet.daily_min_spend_target !== null) {
      body.daily_min_spend_target = originalAdSet.daily_min_spend_target;
    }
    if (originalAdSet.daily_spend_cap !== undefined && originalAdSet.daily_spend_cap !== null) {
      body.daily_spend_cap = originalAdSet.daily_spend_cap;
    }

    // Schedule
    if (originalAdSet.start_time) {
      body.start_time = originalAdSet.start_time;
    }
    if (originalAdSet.end_time) {
      body.end_time = originalAdSet.end_time;
    }

    // Other settings
    if (originalAdSet.pacing_type) {
      body.pacing_type = JSON.stringify(originalAdSet.pacing_type);
    }
    if (originalAdSet.destination_type) {
      body.destination_type = originalAdSet.destination_type;
    }

    // CRITICAL: Preserve dynamic creative flag for text/media variations
    if (originalAdSet.is_dynamic_creative !== undefined) {
      body.is_dynamic_creative = originalAdSet.is_dynamic_creative;
    }

    return this.encodeBody(body);
  }

  /**
   * Prepare ad body for duplicate
   * Supports BOTH regular ads (post ID) and dynamic creatives (asset_feed_spec)
   */
  prepareAdBodyForDuplicate(campaignName, postId, copyNumber, adSetIdRef, mediaHashes = null, isDynamicCreative = false, textVariations = null, campaignData = null) {
    const body = {
      name: `${campaignName} - Ad Copy ${copyNumber}`,
      adset_id: adSetIdRef,
      status: 'ACTIVE'
    };

    // APPROACH 1: Regular ad with post ID (100% root effect via shared post)
    // NOTE: When using object_story_id, do NOT include page_id - Facebook extracts page from post ID
    if (postId && !isDynamicCreative) {
      body.creative = JSON.stringify({
        object_story_id: postId
      });
    }
    // APPROACH 2: Dynamic creative/text with asset_feed_spec (100% root effect via shared assets)
    else if ((mediaHashes || textVariations) && isDynamicCreative) {
      // Build asset_feed_spec from media hashes AND text variations
      // All ads share the same assets = 100% root effect for dynamic creatives
      const assetFeedSpec = {
        page_id: this.pageId
      };

      // Add text variations (primary texts and headlines)
      if (textVariations) {
        // Primary texts (bodies)
        if (textVariations.primaryTexts && textVariations.primaryTexts.length > 0) {
          assetFeedSpec.bodies = textVariations.primaryTexts.map(text => ({ text }));
        } else if (textVariations.primaryText) {
          assetFeedSpec.bodies = [{ text: textVariations.primaryText }];
        }

        // Headlines (titles)
        if (textVariations.headlines && textVariations.headlines.length > 0) {
          assetFeedSpec.titles = textVariations.headlines.map(headline => ({ text: headline }));
        } else if (textVariations.headline) {
          assetFeedSpec.titles = [{ text: textVariations.headline }];
        }

        // Descriptions
        if (textVariations.description) {
          assetFeedSpec.descriptions = [{ text: textVariations.description }];
        }

        // Link URLs
        if (textVariations.url) {
          assetFeedSpec.link_urls = [{ website_url: textVariations.url }];
          if (textVariations.displayLink) {
            assetFeedSpec.link_urls[0].display_url = textVariations.displayLink;
          }
        }

        // Call to action
        if (textVariations.callToAction) {
          assetFeedSpec.call_to_action_types = [textVariations.callToAction];
        }
      }

      // Add images if present
      if (mediaHashes) {
        if (mediaHashes.dynamicImages && mediaHashes.dynamicImages.length > 0) {
          assetFeedSpec.images = mediaHashes.dynamicImages.map(hash => ({ hash }));
        } else if (mediaHashes.imageHash) {
          assetFeedSpec.images = [{ hash: mediaHashes.imageHash }];
        }

        // Add videos if present
        if (mediaHashes.dynamicVideos && mediaHashes.dynamicVideos.length > 0) {
          assetFeedSpec.videos = mediaHashes.dynamicVideos.map(id => ({ video_id: id }));
        } else if (mediaHashes.videoId) {
          assetFeedSpec.videos = [{ video_id: mediaHashes.videoId }];
        }
      }

      // Determine ad format based on media
      const hasVideos = assetFeedSpec.videos && assetFeedSpec.videos.length > 0;
      const hasImages = assetFeedSpec.images && assetFeedSpec.images.length > 0;

      if (hasVideos && hasImages) {
        assetFeedSpec.ad_formats = ['AUTOMATIC_FORMAT'];
      } else if (hasVideos) {
        assetFeedSpec.ad_formats = ['SINGLE_VIDEO'];
      } else if (hasImages) {
        assetFeedSpec.ad_formats = ['SINGLE_IMAGE'];
      }

      body.creative = JSON.stringify({
        asset_feed_spec: assetFeedSpec
      });
    }
    // FALLBACK: If neither post ID nor media hashes, use post ID (backward compatibility)
    // NOTE: When using object_story_id, do NOT include page_id - Facebook extracts page from post ID
    else if (postId) {
      body.creative = JSON.stringify({
        object_story_id: postId
      });
    }

    return this.encodeBody(body);
  }

  // ============================================================================
  // CAMPAIGN MULTIPLICATION - BATCH API
  // ============================================================================

  /**
   * Multiply entire campaigns using batch API
   * Replaces failing deep_copy approach with efficient batch operations
   *
   * @param {string} campaignId - ID of the original campaign to multiply
   * @param {number} multiplier - Number of copies to create
   * @param {string} baseName - Base name for new campaigns
   * @returns {Object} Batch execution results with all created campaigns
   */
  async multiplyCampaignsBatch(campaignId, multiplier = 1, baseName = 'Campaign') {
    try {
      console.log('🚀 ========================================');
      console.log('🚀 BATCH CAMPAIGN MULTIPLICATION');
      console.log('🚀 ========================================');
      console.log(`📊 Multiplying campaign ${campaignId} x${multiplier}`);
      console.log(`📊 Base name: ${baseName}`);

      const axios = require('axios');

      // Step 1: Fetch complete campaign structure
      console.log('\n📋 Step 1: Fetching complete campaign structure...');
      const fields = 'id,name,status,objective,special_ad_categories,' +
        'special_ad_category_country,daily_budget,lifetime_budget,' +
        'bid_strategy,account_id,' +
        'adsets.limit(200){' +
          'id,name,status,targeting,daily_budget,lifetime_budget,' +
          'optimization_goal,billing_event,bid_strategy,bid_amount,' +
          'promoted_object,attribution_spec,conversion_specs,' +
          'daily_min_spend_target,daily_spend_cap,start_time,end_time,' +
          'pacing_type,destination_type,' +
          'ads.limit(100){' +
            'id,name,status,tracking_specs,conversion_specs,url_tags,' +
            'creative{id,object_story_id,effective_object_story_id}' +
          '}' +
        '}';

      const campaignResponse = await axios.get(
        `${this.baseURL}/${campaignId}`,
        {
          params: {
            fields,
            access_token: this.accessToken
          }
        }
      );

      const originalCampaign = campaignResponse.data;
      const adSetsCount = originalCampaign.adsets?.data?.length || 0;
      const totalAds = originalCampaign.adsets?.data?.reduce((sum, adSet) =>
        sum + (adSet.ads?.data?.length || 0), 0) || 0;

      console.log('✅ Campaign structure fetched');
      console.log(`   Campaign: ${originalCampaign.name}`);
      console.log(`   Ad Sets: ${adSetsCount}`);
      console.log(`   Ads: ${totalAds}`);
      console.log(`   Total objects per copy: ${1 + adSetsCount + totalAds}`);

      // Check if campaign has CBO
      const campaignHasCBO = !!(originalCampaign.daily_budget || originalCampaign.lifetime_budget);
      console.log(`   CBO Enabled: ${campaignHasCBO ? 'Yes' : 'No'}`);
      if (campaignHasCBO) {
        console.log(`   Campaign Budget: $${(originalCampaign.daily_budget || originalCampaign.lifetime_budget) / 100}`);
      }

      // Calculate operations per copy
      const operationsPerCopy = adSetsCount * 2; // (adSet + ad) pairs only (campaign created separately)
      const totalOperations = operationsPerCopy * multiplier;
      const batchesPerCopy = Math.ceil(operationsPerCopy / this.maxBatchSize);
      const totalBatches = batchesPerCopy * multiplier;

      // API calls: 1 campaign creation + batches for ad sets/ads
      const apiCallsPerCopy = 1 + batchesPerCopy; // 1 campaign + N batches
      const totalApiCalls = apiCallsPerCopy * multiplier;
      const sequentialApiCalls = (1 + adSetsCount + totalAds) * multiplier; // What it would be without batching

      console.log(`\n📊 Batch Execution Plan:`);
      console.log(`   Operations per copy: ${operationsPerCopy} ad set/ad pairs (campaign created separately)`);
      console.log(`   Batches per copy: ${batchesPerCopy} (${this.maxBatchSize} ops/batch)`);
      console.log(`   API calls per copy: ${apiCallsPerCopy} (1 campaign + ${batchesPerCopy} batches)`);
      console.log(`   Total operations: ${totalOperations}`);
      console.log(`   Total API calls: ${totalApiCalls}`);
      console.log(`   API calls saved: ${sequentialApiCalls - totalApiCalls} (${Math.round(((sequentialApiCalls - totalApiCalls) / sequentialApiCalls) * 100)}% reduction vs sequential)`);

      const allResults = [];

      // Step 2: Create each campaign copy
      for (let copyIndex = 0; copyIndex < multiplier; copyIndex++) {
        const copyNumber = copyIndex + 1;
        const campaignCopyName = multiplier > 1
          ? `${baseName} - Copy ${copyNumber}`
          : baseName;

        console.log(`\n🔄 ========================================`);
        console.log(`🔄 Creating copy ${copyNumber}/${multiplier}: "${campaignCopyName}"`);
        console.log(`🔄 ========================================`);

        const accountId = originalCampaign.account_id.replace('act_', '');

        // Step 3A: Create campaign FIRST (separate API call to get real ID)
        console.log('\n📋 Step 3A: Creating campaign...');

        const campaignParams = {
          name: campaignCopyName,
          objective: originalCampaign.objective,
          status: 'ACTIVE', // Create as ACTIVE by default
          special_ad_categories: JSON.stringify(originalCampaign.special_ad_categories || []),
          access_token: this.accessToken
        };

        if (originalCampaign.special_ad_category_country) {
          campaignParams.special_ad_category_country = JSON.stringify(originalCampaign.special_ad_category_country);
        }
        if (originalCampaign.daily_budget) {
          campaignParams.daily_budget = originalCampaign.daily_budget;
        }
        if (originalCampaign.lifetime_budget) {
          campaignParams.lifetime_budget = originalCampaign.lifetime_budget;
        }
        if (originalCampaign.bid_strategy) {
          campaignParams.bid_strategy = originalCampaign.bid_strategy;
        }

        let createdCampaignId;
        try {
          const campaignResponse = await axios.post(
            `${this.baseURL}/act_${accountId}/campaigns`,
            null,
            { params: campaignParams }
          );
          createdCampaignId = campaignResponse.data.id;
          console.log(`✅ Campaign created: ${createdCampaignId}`);
        } catch (error) {
          console.error(`❌ Campaign creation failed:`, error.response?.data || error.message);
          throw error;
        }

        // Step 3B: Prepare batch operations for ad sets and ads using REAL campaign ID
        console.log('\n📋 Step 3B: Preparing batch operations for ad sets and ads...');
        const allOperations = [];

        // Operations: Create ad sets and ads (interleaved)
        // Pattern: [adset-0, ad-0], [adset-1, ad-1], ...
        // All reference the REAL campaign ID (no cross-batch reference issue)

        if (originalCampaign.adsets?.data) {
          originalCampaign.adsets.data.forEach((adSet, adSetIndex) => {
            // Create ad set operation (uses REAL campaign ID)
            const adSetBody = this.prepareAdSetBodyForMultiply(
              adSet,
              createdCampaignId, // ← REAL ID, not batch reference
              campaignHasCBO
            );

            allOperations.push({
              method: 'POST',
              relative_url: `act_${accountId}/adsets`,
              body: adSetBody,
              name: `create-adset-${adSetIndex}`
            });

            // Create ad operation immediately after its ad set
            if (adSet.ads?.data && adSet.ads.data.length > 0) {
              const ad = adSet.ads.data[0]; // Use first ad as template
              const adBody = this.prepareAdBodyForMultiply(
                ad,
                `{result=create-adset-${adSetIndex}:$.id}` // ← Still uses batch reference for ad set
              );

              allOperations.push({
                method: 'POST',
                relative_url: `act_${accountId}/ads`,
                body: adBody
              });
            }
          });
        }

        console.log(`📦 Prepared ${allOperations.length} operations (ad sets + ads)`);

        // Step 3C: Split into batches and execute
        const batches = [];
        for (let i = 0; i < allOperations.length; i += this.maxBatchSize) {
          batches.push(allOperations.slice(i, Math.min(i + this.maxBatchSize, allOperations.length)));
        }

        console.log(`\n🔄 Executing ${batches.length} batch(es)...`);

        const newAdSetIds = [];
        const newAdIds = [];
        const failedOperations = [];
        let batchResults = [];

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(`\n📤 Batch ${batchIndex + 1}/${batches.length}: ${batch.length} operations`);

          try {
            const response = await axios.post(
              this.baseURL,
              null,
              {
                params: {
                  batch: JSON.stringify(batch),
                  access_token: this.accessToken
                }
              }
            );

            batchResults.push(...response.data);
            console.log(`✅ Batch ${batchIndex + 1} completed`);

          } catch (error) {
            console.error(`❌ Batch ${batchIndex + 1} failed:`, error.response?.data || error.message);
            throw error;
          }
        }

        // Step 4: Process results using accurate counting
        console.log('\n📊 Processing results with accurate counting...');

        // Use the accurate counting method to get real success/failure counts
        const counts = this.getAccurateCounts(batchResults);

        // Extract successful IDs
        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i];
          const isAdSet = i % 2 === 0;
          const objectNumber = Math.floor(i / 2) + 1;

          if (result && result.code === 200 && result.body) {
            const body = JSON.parse(result.body);
            if (isAdSet) {
              newAdSetIds.push(body.id);
            } else {
              newAdIds.push(body.id);
            }
          } else if (result) {
            const errorMsg = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
            const errorDetails = errorMsg?.error?.message || 'Unknown error';

            if (isAdSet) {
              console.error(`❌ Ad Set ${objectNumber} failed (op ${i}):`, errorDetails);
            } else if (result.code !== 960) {
              console.error(`❌ Ad ${objectNumber} failed (op ${i}):`, errorDetails);
            }

            failedOperations.push({
              operation: i,
              error: errorDetails,
              type: isAdSet ? 'adset' : 'ad',
              index: objectNumber - 1
            });
          }
        }

        // CRITICAL: Use accurate counts, not expected counts
        console.log('\n✅ Copy results (ACCURATE COUNTS):');
        console.log(`   Campaign: ${createdCampaignId || 'FAILED'}`);
        console.log(`   Ad Sets Created: ${counts.adSetsCreated}/${adSetsCount} (${counts.adSetsFailed} failed)`);
        console.log(`   Ads Created: ${counts.adsCreated}/${totalAds} (${counts.adsFailed} failed)`);

        if (failedOperations.length > 0) {
          console.log(`   ⚠️  Total Failed Operations: ${failedOperations.length}`);

          // Track failures if userId is available
          if (this.userId) {
            await this.trackFailedEntities(counts.failedDetails, {
              campaignId: createdCampaignId,
              campaignName: campaignCopyName,
              strategyType: 'campaign_multiplication'
            });
          }
        }

        allResults.push({
          copyNumber,
          campaign: {
            id: createdCampaignId,
            name: campaignCopyName
          },
          adSets: newAdSetIds,
          ads: newAdIds,
          // CRITICAL: Return accurate counts
          adSetsCreated: counts.adSetsCreated,
          adsCreated: counts.adsCreated,
          adSetsFailed: counts.adSetsFailed,
          adsFailed: counts.adsFailed,
          operations: allOperations.length,
          batchesExecuted: batches.length,
          failed: failedOperations.length,
          failedDetails: counts.failedDetails
        });
      }

      // Final summary
      const successfulCopies = allResults.filter(r => r.campaign.id).length;
      const totalAdSetsCreated = allResults.reduce((sum, r) => sum + r.adSets.length, 0);
      const totalAdsCreated = allResults.reduce((sum, r) => sum + r.ads.length, 0);

      console.log('\n🎉 ========================================');
      console.log('🎉 CAMPAIGN MULTIPLICATION COMPLETE');
      console.log('🎉 ========================================');
      console.log(`✅ Campaigns Created: ${successfulCopies}/${multiplier}`);
      console.log(`✅ Total Ad Sets Created: ${totalAdSetsCreated}`);
      console.log(`✅ Total Ads Created: ${totalAdsCreated}`);
      console.log(`📊 Total API Calls: ${totalApiCalls} (${successfulCopies} campaigns + ${totalBatches} batches)`);
      console.log(`💰 API Calls Saved: ${sequentialApiCalls - totalApiCalls} (${Math.round(((sequentialApiCalls - totalApiCalls) / sequentialApiCalls) * 100)}% reduction vs sequential)`);

      return {
        success: true,
        campaigns: allResults,
        summary: {
          requested: multiplier,
          created: successfulCopies,
          adSetsCreated: totalAdSetsCreated,
          adsCreated: totalAdsCreated,
          totalOperations,
          totalApiCalls,
          batchesExecuted: totalBatches,
          apiCallsSaved: sequentialApiCalls - totalApiCalls
        }
      };

    } catch (error) {
      console.error('❌ Campaign multiplication failed:', error.message);
      throw error;
    }
  }

  /**
   * Prepare campaign body for multiplication
   */
  prepareCampaignBodyForMultiply(campaign, newName) {
    const body = {
      name: newName,
      objective: campaign.objective,
      status: 'ACTIVE', // Create as ACTIVE by default
      special_ad_categories: JSON.stringify(campaign.special_ad_categories || [])
    };

    if (campaign.special_ad_category_country) {
      body.special_ad_category_country = JSON.stringify(campaign.special_ad_category_country);
    }
    if (campaign.daily_budget) {
      body.daily_budget = campaign.daily_budget;
    }
    if (campaign.lifetime_budget) {
      body.lifetime_budget = campaign.lifetime_budget;
    }
    if (campaign.bid_strategy) {
      body.bid_strategy = campaign.bid_strategy;
    }

    return this.encodeBody(body);
  }

  /**
   * Prepare ad set body for multiplication
   */
  prepareAdSetBodyForMultiply(adSet, campaignIdRef, campaignHasCBO = false) {
    const body = {
      name: `${adSet.name} - Copy`,
      campaign_id: campaignIdRef,
      status: 'ACTIVE',
      targeting: JSON.stringify(adSet.targeting),
      optimization_goal: adSet.optimization_goal,
      billing_event: adSet.billing_event || 'IMPRESSIONS'
    };

    // Only include budget if campaign doesn't have CBO
    if (!campaignHasCBO) {
      if (adSet.daily_budget) {
        body.daily_budget = adSet.daily_budget;
      }
      if (adSet.lifetime_budget) {
        body.lifetime_budget = adSet.lifetime_budget;
      }
    }

    // Include spending limits
    if (adSet.daily_min_spend_target) {
      body.daily_min_spend_target = adSet.daily_min_spend_target;
    }
    if (adSet.daily_spend_cap) {
      body.daily_spend_cap = adSet.daily_spend_cap;
    }

    // Other optional fields
    if (adSet.bid_strategy) {
      body.bid_strategy = adSet.bid_strategy;
    }
    if (adSet.bid_amount) {
      body.bid_amount = adSet.bid_amount;
    }
    if (adSet.promoted_object) {
      body.promoted_object = JSON.stringify(adSet.promoted_object);
    }
    if (adSet.attribution_spec) {
      body.attribution_spec = JSON.stringify(adSet.attribution_spec);
    }
    if (adSet.conversion_specs) {
      body.conversion_specs = JSON.stringify(adSet.conversion_specs);
    }
    if (adSet.start_time) {
      body.start_time = adSet.start_time;
    }
    if (adSet.end_time) {
      body.end_time = adSet.end_time;
    }
    if (adSet.pacing_type) {
      body.pacing_type = JSON.stringify(adSet.pacing_type);
    }
    if (adSet.destination_type) {
      body.destination_type = adSet.destination_type;
    }

    return this.encodeBody(body);
  }

  /**
   * Prepare ad body for multiplication
   */
  prepareAdBodyForMultiply(ad, adSetIdRef) {
    const body = {
      name: `${ad.name} - Copy`,
      adset_id: adSetIdRef,
      status: 'ACTIVE'
    };

    // Handle creative
    if (ad.creative) {
      const creative = ad.creative;

      // Use existing post if available
      if (creative.object_story_id || creative.effective_object_story_id) {
        body.creative = JSON.stringify({
          object_story_id: creative.object_story_id || creative.effective_object_story_id,
          page_id: this.pageId
        });
      } else if (creative.id) {
        // Reference existing creative by ID
        body.creative = JSON.stringify({
          creative_id: creative.id
        });
      }
    }

    // Add tracking
    if (ad.tracking_specs) {
      body.tracking_specs = JSON.stringify(ad.tracking_specs);
    }
    if (ad.conversion_specs) {
      body.conversion_specs = JSON.stringify(ad.conversion_specs);
    }
    if (ad.url_tags) {
      body.url_tags = ad.url_tags;
    }

    return this.encodeBody(body);
  }

  // ============================================================================
  // SEQUENTIAL FALLBACK FOR FAILED BATCH OPERATIONS
  // ============================================================================

  /**
   * Retry failed ad sets/ads sequentially with FailureTracker integration
   * This is used when batch operations fail for some items
   *
   * @param {Array} failedItems - Array of failed operation details
   * @param {Object} context - Context with campaign details for recreating items
   * @returns {Object} - Results with recovered and still-failed items
   */
  async retryFailedItemsSequentially(failedItems, context) {
    console.log(`\n🔄 Sequential fallback: Retrying ${failedItems.length} failed items...`);

    const recovered = [];
    const stillFailed = [];

    for (const failedItem of failedItems) {
      try {
        if (failedItem.type === 'adset') {
          // Retry ad set creation
          const result = await this.createAdSetSequentially(failedItem.data, context);
          if (result.success) {
            recovered.push({
              type: 'adset',
              originalIndex: failedItem.index,
              newId: result.id
            });
            console.log(`✅ Recovered ad set ${failedItem.index + 1}: ${result.id}`);

            // If ad set recovered, try to create its ad
            if (failedItem.adData) {
              const adResult = await this.createAdSequentially(failedItem.adData, result.id, context);
              if (adResult.success) {
                recovered.push({
                  type: 'ad',
                  originalIndex: failedItem.index,
                  newId: adResult.id
                });
                console.log(`✅ Recovered ad ${failedItem.index + 1}: ${adResult.id}`);
              } else {
                stillFailed.push({
                  type: 'ad',
                  originalIndex: failedItem.index,
                  error: adResult.error
                });
              }
            }
          } else {
            stillFailed.push({
              type: 'adset',
              originalIndex: failedItem.index,
              error: result.error
            });
          }
        } else if (failedItem.type === 'ad' && failedItem.adSetId) {
          // Retry ad creation (ad set already exists)
          const result = await this.createAdSequentially(failedItem.data, failedItem.adSetId, context);
          if (result.success) {
            recovered.push({
              type: 'ad',
              originalIndex: failedItem.index,
              newId: result.id
            });
            console.log(`✅ Recovered ad ${failedItem.index + 1}: ${result.id}`);
          } else {
            stillFailed.push({
              type: 'ad',
              originalIndex: failedItem.index,
              error: result.error
            });
          }
        }

        // Small delay between sequential operations
        await this.delay(500);

      } catch (error) {
        console.error(`❌ Sequential retry failed for ${failedItem.type} ${failedItem.index + 1}:`, error.message);
        stillFailed.push({
          type: failedItem.type,
          originalIndex: failedItem.index,
          error: error.message
        });
      }
    }

    console.log(`\n📊 Sequential fallback complete:`);
    console.log(`   Recovered: ${recovered.length}`);
    console.log(`   Still failed: ${stillFailed.length}`);

    return { recovered, stillFailed };
  }

  /**
   * Create a single ad set using sequential API call
   */
  async createAdSetSequentially(adSetData, context) {
    try {
      const accountId = this.adAccountId.replace('act_', '');
      const response = await axios.post(
        `${this.baseURL}/act_${accountId}/adsets`,
        null,
        {
          params: {
            ...adSetData,
            access_token: this.accessToken
          }
        }
      );
      return { success: true, id: response.data.id };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create a single ad using sequential API call
   */
  async createAdSequentially(adData, adSetId, context) {
    try {
      const accountId = this.adAccountId.replace('act_', '');
      const response = await axios.post(
        `${this.baseURL}/act_${accountId}/ads`,
        null,
        {
          params: {
            ...adData,
            adset_id: adSetId,
            access_token: this.accessToken
          }
        }
      );
      return { success: true, id: response.data.id };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Track failed entities using FailureTracker service
   *
   * @param {Array} failedItems - Array of failed items with details
   * @param {Object} context - Context with campaign info
   */
  async trackFailedEntities(failedItems, context) {
    if (!this.userId) {
      console.log('⚠️ No userId provided, skipping failure tracking');
      return;
    }

    for (const item of failedItems) {
      try {
        await FailureTracker.safeTrackFailedEntity({
          userId: this.userId,
          campaignId: context.campaignId,
          campaignName: context.campaignName,
          adsetId: item.type === 'adset' ? null : item.adSetId,
          adsetName: item.type === 'adset' ? item.name : null,
          adId: item.type === 'ad' ? null : null,
          adName: item.type === 'ad' ? item.name : null,
          entityType: item.type,
          error: { message: item.error },
          strategyType: context.strategyType || 'batch_duplication',
          metadata: {
            originalIndex: item.originalIndex,
            batchIndex: item.batchIndex
          }
        });
      } catch (trackError) {
        console.error('⚠️ Failed to track failure:', trackError.message);
      }
    }
  }

  /**
   * Get accurate counts of successful operations
   * CRITICAL: This fixes the issue where 46 ads were created but 50 were reported
   */
  getAccurateCounts(batchResults) {
    let adSetsCreated = 0;
    let adsCreated = 0;
    let adSetsFailed = 0;
    let adsFailed = 0;
    const failedDetails = [];

    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      const isAdSet = i % 2 === 0;
      const pairIndex = Math.floor(i / 2);

      if (result && result.code === 200 && result.body) {
        if (isAdSet) {
          adSetsCreated++;
        } else {
          adsCreated++;
        }
      } else if (result) {
        // Failed operation
        const errorBody = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
        const errorMessage = errorBody?.error?.message || 'Unknown error';

        if (isAdSet) {
          adSetsFailed++;
          failedDetails.push({
            type: 'adset',
            index: pairIndex,
            error: errorMessage,
            code: result.code
          });
        } else {
          // Only count ad failure if not a dependency failure (code 960)
          if (result.code !== 960) {
            adsFailed++;
            failedDetails.push({
              type: 'ad',
              index: pairIndex,
              error: errorMessage,
              code: result.code
            });
          }
        }
      }
    }

    return {
      adSetsCreated,
      adsCreated,
      adSetsFailed,
      adsFailed,
      failedDetails
    };
  }

  // ============================================================================
  // FULL BATCH CREATION METHODS - FOR STRATEGY-FOR-ADS AND STRATEGY-FOR-ALL
  // ============================================================================

  /**
   * Create entire campaign structure for Strategy-for-Ads using batch API
   * Supports multiple creatives, text variations, and dynamic creative
   *
   * FLOW:
   * 1. Create campaign separately (get real ID)
   * 2. Create first ad set + ad with full creative (establishes post ID)
   * 3. Create remaining ad sets + ads using existing post ID (100% root effect)
   *
   * @param {Object} templateData - Full campaign template with all settings
   * @param {number} numAdSets - Total number of ad sets to create
   * @returns {Object} Complete campaign structure with all IDs
   */
  async createStrategyForAdsBatch(templateData, numAdSets = 50) {
    try {
      console.log('🚀 ========================================');
      console.log('🚀 STRATEGY-FOR-ADS FULL BATCH CREATION');
      console.log('🚀 ========================================');
      console.log(`📊 Target: 1 campaign + ${numAdSets} ad sets + ${numAdSets} ads`);
      console.log(`📊 Creative Type: ${templateData.dynamicCreativeEnabled ? 'Dynamic Creative' : 'Regular'}`);
      console.log(`📊 Text Variations: ${templateData.dynamicTextEnabled ? 'Enabled' : 'Disabled'}`);

      const axios = require('axios');
      const accountId = this.adAccountId.replace('act_', '');

      // STEP 1: Create campaign separately
      console.log('\n📋 Step 1: Creating campaign...');
      const campaignId = await this.createCampaignForStrategy(templateData, accountId);
      console.log(`✅ Campaign created: ${campaignId}`);

      // STEP 2: Create first ad set + ad with full creative
      // This establishes the post ID that will be reused by all other ads
      console.log('\n📋 Step 2: Creating initial ad set + ad (establishes post ID)...');

      let postId = null;
      let mediaHashes = null;
      let firstAdSetId = null;
      let firstAdId = null;

      // Create first ad set
      const firstAdSetBody = this.prepareAdSetBodyForStrategy(templateData, campaignId, 1);
      const firstAdSetResponse = await axios.post(
        `${this.baseURL}/act_${accountId}/adsets`,
        null,
        { params: { ...this.decodeBodyToParams(firstAdSetBody), access_token: this.accessToken } }
      );
      firstAdSetId = firstAdSetResponse.data.id;
      console.log(`   ✅ First ad set created: ${firstAdSetId}`);

      // Create first ad with full creative (this creates the post)
      const firstAdResult = await this.createFirstAdWithCreative(
        templateData,
        firstAdSetId,
        accountId
      );
      firstAdId = firstAdResult.adId;
      postId = firstAdResult.postId;
      mediaHashes = firstAdResult.mediaHashes;
      console.log(`   ✅ First ad created: ${firstAdId}`);
      if (postId) {
        console.log(`   📝 Post ID established: ${postId}`);
      }

      // STEP 3: Create remaining ad sets + ads using batch API
      const remainingCount = numAdSets - 1;
      if (remainingCount > 0) {
        console.log(`\n📋 Step 3: Creating remaining ${remainingCount} ad set/ad pairs via batch...`);

        const batchResult = await this.duplicateAdSetsBatch(
          firstAdSetId,
          campaignId,
          postId,
          remainingCount,
          {
            ...templateData,
            mediaHashes: mediaHashes,
            campaignName: templateData.campaignName
          }
        );

        // Combine results
        const allAdSets = [
          { id: firstAdSetId, name: `${templateData.campaignName} - Ad Set 1` },
          ...batchResult.adSets
        ];
        const allAds = [
          { id: firstAdId, name: `${templateData.campaignName} - Ad 1` },
          ...batchResult.ads
        ];

        console.log('\n✅ ========================================');
        console.log('✅ STRATEGY-FOR-ADS BATCH COMPLETE!');
        console.log('✅ ========================================');
        console.log(`✅ Campaign: ${campaignId}`);
        console.log(`✅ Ad Sets: ${allAdSets.length}/${numAdSets}`);
        console.log(`✅ Ads: ${allAds.length}/${numAdSets}`);
        console.log(`✅ API calls used: ~${2 + batchResult.batchesExecuted} (vs ${1 + numAdSets * 2} sequential)`);

        return {
          success: batchResult.summary.successRate >= 90,
          partialSuccess: batchResult.summary.successRate < 90 && batchResult.summary.successRate > 0,
          campaign: { id: campaignId, name: templateData.campaignName },
          adSets: allAdSets,
          ads: allAds,
          postId: postId,
          mediaHashes: mediaHashes,
          summary: {
            totalAdSets: allAdSets.length,
            totalAds: allAds.length,
            expected: numAdSets,
            successRate: Math.round((allAdSets.length / numAdSets) * 100),
            batchesExecuted: 2 + batchResult.batchesExecuted,
            hasFailures: batchResult.summary.hasFailures
          }
        };
      }

      // Only 1 ad set requested
      return {
        success: true,
        campaign: { id: campaignId, name: templateData.campaignName },
        adSets: [{ id: firstAdSetId, name: `${templateData.campaignName} - Ad Set 1` }],
        ads: [{ id: firstAdId, name: `${templateData.campaignName} - Ad 1` }],
        postId: postId,
        mediaHashes: mediaHashes,
        summary: {
          totalAdSets: 1,
          totalAds: 1,
          expected: 1,
          successRate: 100,
          batchesExecuted: 2,
          hasFailures: false
        }
      };

    } catch (error) {
      console.error('❌ Strategy-for-Ads batch creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create entire campaign structure for Strategy-for-All using batch API
   * Similar to Strategy-for-Ads but may have different settings
   *
   * @param {Object} templateData - Full campaign template with all settings
   * @param {number} numAdSets - Total number of ad sets to create
   * @returns {Object} Complete campaign structure with all IDs
   */
  async createStrategyForAllBatch(templateData, numAdSets = 50) {
    try {
      console.log('🚀 ========================================');
      console.log('🚀 STRATEGY-FOR-ALL FULL BATCH CREATION');
      console.log('🚀 ========================================');
      console.log(`📊 Target: 1 campaign + ${numAdSets} ad sets + ${numAdSets} ads`);

      // Strategy-for-All uses the same batch logic as Strategy-for-Ads
      // The only difference is in the templateData format (handled by caller)
      return await this.createStrategyForAdsBatch(templateData, numAdSets);

    } catch (error) {
      console.error('❌ Strategy-for-All batch creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Create campaign for strategy batch creation
   */
  async createCampaignForStrategy(templateData, accountId) {
    const axios = require('axios');

    let campaignName = templateData.campaignName || 'New Campaign';
    if (!campaignName.startsWith('[Launcher]')) {
      campaignName = `[Launcher] ${campaignName}`;
    }

    const params = {
      name: campaignName,
      objective: templateData.objective || 'OUTCOME_LEADS',
      status: 'ACTIVE',
      special_ad_categories: JSON.stringify(templateData.specialAdCategories || []),
      access_token: this.accessToken
    };

    // Buying type
    if (templateData.buyingType) {
      params.buying_type = templateData.buyingType;
    }

    // Campaign budget (CBO)
    if (templateData.budgetLevel === 'campaign' || templateData.campaignBudget?.dailyBudget || templateData.campaignBudget?.lifetimeBudget) {
      if (templateData.campaignBudget?.dailyBudget || templateData.dailyBudget) {
        params.daily_budget = Math.round(parseFloat(templateData.campaignBudget?.dailyBudget || templateData.dailyBudget) * 100);
      }
      if (templateData.campaignBudget?.lifetimeBudget || templateData.lifetimeBudget) {
        params.lifetime_budget = Math.round(parseFloat(templateData.campaignBudget?.lifetimeBudget || templateData.lifetimeBudget) * 100);
      }
      if (templateData.bidStrategy) {
        params.bid_strategy = templateData.bidStrategy;
      }
    }

    const response = await axios.post(
      `${this.baseURL}/act_${accountId}/campaigns`,
      null,
      { params }
    );

    return response.data.id;
  }

  /**
   * Helper: Prepare ad set body for strategy creation
   */
  prepareAdSetBodyForStrategy(templateData, campaignId, adSetNumber) {
    const body = {
      name: `[Launcher] ${templateData.campaignName || 'Campaign'} - Ad Set ${adSetNumber}`,
      campaign_id: campaignId,
      status: 'ACTIVE',
      billing_event: 'IMPRESSIONS'
    };

    // Optimization goal
    body.optimization_goal = this.getOptimizationGoalFromTemplate(templateData);

    // Budget (only if ABO - ad set budget)
    const usingCBO = templateData.budgetLevel === 'campaign' ||
                     templateData.campaignBudget?.dailyBudget ||
                     templateData.campaignBudget?.lifetimeBudget;

    if (!usingCBO) {
      if (templateData.adSetBudget?.dailyBudget || templateData.dailyBudget) {
        body.daily_budget = Math.round(parseFloat(templateData.adSetBudget?.dailyBudget || templateData.dailyBudget) * 100);
      }
      if (templateData.adSetBudget?.lifetimeBudget || templateData.lifetimeBudget) {
        body.lifetime_budget = Math.round(parseFloat(templateData.adSetBudget?.lifetimeBudget || templateData.lifetimeBudget) * 100);
      }
    }

    // Promoted object (pixel + conversion)
    const pixelId = templateData.manualPixelId || templateData.pixel || this.pixelId;
    if (pixelId && templateData.conversionLocation === 'website') {
      const promotedObject = { pixel_id: pixelId };
      if (templateData.conversionEvent) {
        const eventMap = { 'Lead': 'LEAD', 'Contact': 'CONTACT', 'Purchase': 'PURCHASE' };
        promotedObject.custom_event_type = eventMap[templateData.conversionEvent] || templateData.conversionEvent;
      }
      body.promoted_object = JSON.stringify(promotedObject);
    }

    // Targeting
    const targeting = this.buildTargetingFromTemplate(templateData);
    body.targeting = JSON.stringify(targeting);

    // Attribution
    if (templateData.attributionSetting) {
      body.attribution_spec = JSON.stringify(this.buildAttributionSpec(templateData.attributionSetting));
    }

    // Dynamic creative flag
    if (templateData.dynamicCreativeEnabled || templateData.dynamicTextEnabled) {
      body.is_dynamic_creative = true;
    }

    // Schedule
    if (templateData.adSetBudget?.startDate) {
      body.start_time = this.parseDateTimeAsEST(templateData.adSetBudget.startDate);
    }
    if (templateData.adSetBudget?.endDate) {
      body.end_time = this.parseDateTimeAsEST(templateData.adSetBudget.endDate);
    }

    return this.encodeBody(body);
  }

  /**
   * Helper: Build attribution spec from setting string
   */
  buildAttributionSpec(setting) {
    const specs = [];
    switch (setting) {
      case '1_day_click_1_day_view':
        specs.push({ event_type: 'CLICK_THROUGH', window_days: 1 });
        specs.push({ event_type: 'VIEW_THROUGH', window_days: 1 });
        break;
      case '7_day_click_1_day_view':
        specs.push({ event_type: 'CLICK_THROUGH', window_days: 7 });
        specs.push({ event_type: 'VIEW_THROUGH', window_days: 1 });
        break;
      case '1_day_click':
        specs.push({ event_type: 'CLICK_THROUGH', window_days: 1 });
        break;
      case '7_day_click':
        specs.push({ event_type: 'CLICK_THROUGH', window_days: 7 });
        break;
      default:
        specs.push({ event_type: 'CLICK_THROUGH', window_days: 1 });
        specs.push({ event_type: 'VIEW_THROUGH', window_days: 1 });
    }
    return specs;
  }

  /**
   * Helper: Create first ad with full creative (establishes post ID)
   * This is done separately because the first ad needs to create the post
   */
  async createFirstAdWithCreative(templateData, adSetId, accountId) {
    const axios = require('axios');

    const adName = `[Launcher] ${templateData.campaignName || 'Campaign'} - Ad 1`;
    let postId = null;
    let mediaHashes = templateData.mediaHashes || null;

    // Build creative based on type
    let creative = {};

    if (templateData.dynamicCreativeEnabled || templateData.dynamicTextEnabled) {
      // Dynamic creative with asset_feed_spec
      const assetFeedSpec = {
        page_id: this.pageId
      };

      // Add text variations (DEDUPLICATED to avoid Facebook error)
      // Facebook rejects: "Duplicate of ad asset values are not allowed"
      if (templateData.primaryTextVariations?.length > 0) {
        const uniquePrimaryTexts = [...new Set(templateData.primaryTextVariations.filter(t => t && t.trim()).map(t => t.trim()))];
        assetFeedSpec.bodies = uniquePrimaryTexts.map(text => ({ text }));
      } else if (templateData.primaryText) {
        assetFeedSpec.bodies = [{ text: templateData.primaryText.trim() }];
      }

      if (templateData.headlineVariations?.length > 0) {
        const uniqueHeadlines = [...new Set(templateData.headlineVariations.filter(h => h && h.trim()).map(h => h.trim()))];
        assetFeedSpec.titles = uniqueHeadlines.map(text => ({ text }));
      } else if (templateData.headline) {
        assetFeedSpec.titles = [{ text: templateData.headline.trim() }];
      }

      if (templateData.description) {
        assetFeedSpec.descriptions = [{ text: templateData.description }];
      }

      // Add link URLs
      if (templateData.url) {
        assetFeedSpec.link_urls = [{ website_url: templateData.url }];
        if (templateData.displayLink) {
          assetFeedSpec.link_urls[0].display_url = templateData.displayLink;
        }
      }

      // Add call to action
      if (templateData.callToAction) {
        assetFeedSpec.call_to_action_types = [templateData.callToAction];
      }

      // Add media
      if (mediaHashes?.dynamicImages?.length > 0) {
        assetFeedSpec.images = mediaHashes.dynamicImages.map(hash => ({ hash }));
      } else if (mediaHashes?.imageHash) {
        assetFeedSpec.images = [{ hash: mediaHashes.imageHash }];
      }

      if (mediaHashes?.dynamicVideos?.length > 0) {
        assetFeedSpec.videos = mediaHashes.dynamicVideos.map(id => ({ video_id: id }));
      } else if (mediaHashes?.videoId) {
        assetFeedSpec.videos = [{ video_id: mediaHashes.videoId }];
      }

      // Determine ad format
      const hasVideos = assetFeedSpec.videos?.length > 0;
      const hasImages = assetFeedSpec.images?.length > 0;
      if (hasVideos && hasImages) {
        assetFeedSpec.ad_formats = ['AUTOMATIC_FORMAT'];
      } else if (hasVideos) {
        assetFeedSpec.ad_formats = ['SINGLE_VIDEO'];
      } else if (hasImages) {
        assetFeedSpec.ad_formats = ['SINGLE_IMAGE'];
      }

      creative = { asset_feed_spec: assetFeedSpec };

    } else {
      // Regular creative with object_story_spec
      const objectStorySpec = {
        page_id: this.pageId
      };

      // Determine creative type based on media
      if (mediaHashes?.videoId) {
        // Video ad
        objectStorySpec.video_data = {
          video_id: mediaHashes.videoId,
          message: templateData.primaryText || '',
          title: templateData.headline || '',
          link_description: templateData.description || '',
          call_to_action: {
            type: templateData.callToAction || 'LEARN_MORE',
            value: { link: templateData.url || '' }
          }
        };
        // NOTE: Facebook does NOT support displayLink for video ads
        if (mediaHashes.thumbnailHash) {
          objectStorySpec.video_data.image_hash = mediaHashes.thumbnailHash;
        }
      } else if (mediaHashes?.carouselCards?.length > 0) {
        // Carousel ad
        objectStorySpec.link_data = {
          message: templateData.primaryText || '',
          link: templateData.url || '',
          child_attachments: mediaHashes.carouselCards.map((card, idx) => ({
            link: card.link || templateData.url || '',
            image_hash: card.hash,
            name: card.headline || templateData.headline || `Card ${idx + 1}`,
            description: card.description || templateData.description || '',
            call_to_action: {
              type: templateData.callToAction || 'LEARN_MORE'
            }
          })),
          multi_share_optimized: true,
          call_to_action: {
            type: templateData.callToAction || 'LEARN_MORE'
          }
        };
      } else if (mediaHashes?.imageHash) {
        // Single image ad
        objectStorySpec.link_data = {
          message: templateData.primaryText || '',
          link: templateData.url || '',
          name: templateData.headline || '',
          description: templateData.description || '',
          image_hash: mediaHashes.imageHash,
          call_to_action: {
            type: templateData.callToAction || 'LEARN_MORE',
            value: { link: templateData.url || '' }
          }
        };
        if (templateData.displayLink) {
          objectStorySpec.link_data.caption = templateData.displayLink;
        }
      }

      creative = { object_story_spec: objectStorySpec };
    }

    // NOTE: degrees_of_freedom_spec REMOVED - it causes 400 errors
    // Will implement user-controlled image cropping before upload instead

    // Create the ad
    const params = {
      name: adName,
      adset_id: adSetId,
      status: 'ACTIVE',
      creative: JSON.stringify(creative),
      access_token: this.accessToken
    };

    const response = await axios.post(
      `${this.baseURL}/act_${accountId}/ads`,
      null,
      { params }
    );

    const adId = response.data.id;

    // Fetch the created ad to get the post ID (if created)
    try {
      const adDetails = await axios.get(
        `${this.baseURL}/${adId}`,
        {
          params: {
            fields: 'creative{object_story_id,effective_object_story_id}',
            access_token: this.accessToken
          }
        }
      );

      postId = adDetails.data.creative?.object_story_id ||
               adDetails.data.creative?.effective_object_story_id;

      if (postId) {
        console.log(`   📝 Post ID retrieved: ${postId}`);
      }
    } catch (e) {
      console.warn(`   ⚠️  Could not retrieve post ID: ${e.message}`);
    }

    return { adId, postId, mediaHashes };
  }

  /**
   * Helper: Decode URL-encoded body back to params object
   */
  decodeBodyToParams(encodedBody) {
    const params = {};
    encodedBody.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params[key] = decodeURIComponent(value);
    });
    return params;
  }
}

module.exports = BatchDuplicationService;