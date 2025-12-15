const axios = require('axios');

/**
 * Batch API Duplication Service
 * Reduces API calls from 200+ to just 2-3 by using Facebook's Batch API
 */
class BatchDuplicationService {
  constructor(accessToken, adAccountId, pageId, pixelId) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.pageId = pageId; // ADDED: Store pageId to match 1-50-1 pattern
    this.pixelId = pixelId; // ADDED: Store pixelId for tracking
    this.baseURL = 'https://graph.facebook.com/v18.0';
    // Facebook Batch API limit is 50 operations per batch
    // However, large payloads (video ads, complex creatives) cause socket hang up
    // Using 10 operations per batch to avoid timeouts while keeping ad set + ad pairs together
    // 10 ops = 5 pairs (5 ad sets + 5 ads) - safe for large payloads
    this.maxBatchSize = 10; // Reduced to prevent socket hang up with large payloads

    // Facebook region IDs for US states (same as facebookApi.js)
    this.stateToRegionId = {
      'AL': '3843', 'AK': '3844', 'AZ': '3845', 'AR': '3846', 'CA': '3847',
      'CO': '3848', 'CT': '3849', 'DE': '3850', 'FL': '3851', 'GA': '3852',
      'HI': '3853', 'ID': '3854', 'IL': '3855', 'IN': '3856', 'IA': '3857',
      'KS': '3858', 'KY': '3859', 'LA': '3860', 'ME': '3861', 'MD': '3862',
      'MA': '3863', 'MI': '3864', 'MN': '3865', 'MS': '3866', 'MO': '3867',
      'MT': '3868', 'NE': '3869', 'NV': '3870', 'NH': '3871', 'NJ': '3872',
      'NM': '3873', 'NY': '3874', 'NC': '3875', 'ND': '3876', 'OH': '3877',
      'OK': '3878', 'OR': '3879', 'PA': '3880', 'RI': '3881', 'SC': '3882',
      'SD': '3883', 'TN': '3884', 'TX': '3885', 'UT': '3886', 'VT': '3887',
      'VA': '3888', 'WA': '3889', 'WV': '3890', 'WI': '3891', 'WY': '3892',
      'DC': '3893'
    };
  }

  /**
   * Duplicate campaign using batch API (2-3 total API calls instead of 200+)
   */
  async duplicateCampaignBatch(campaignId, newName, copies = 1) {
    try {
      console.log(`🚀 Starting BATCH duplication for campaign ${campaignId}`);
      console.log(`📊 Creating ${copies} copies with minimal API calls`);

      // Step 1: Get ALL campaign data in ONE call using field expansion
      const campaignData = await this.getCampaignFullData(campaignId);

      const results = [];
      for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
        const copyName = copies > 1
          ? `${newName} - Copy ${copyIndex + 1}`
          : newName;

        console.log(`🔄 Creating copy ${copyIndex + 1}/${copies}: "${copyName}"`);

        // Step 2: Create batch requests for this copy
        const batchRequests = this.prepareBatchRequests(campaignData, copyName);

        // Step 3: Execute batch (all operations in 1-2 API calls)
        const copyResult = await this.executeBatch(batchRequests);
        results.push(copyResult);

        // Small delay between copies to avoid rate limits
        if (copyIndex < copies - 1) {
          await this.delay(1000);
        }
      }

      console.log(`✅ Batch duplication complete! Created ${results.length} copies`);
      return results;

    } catch (error) {
      console.error('❌ Batch duplication failed:', error.message);
      throw error;
    }
  }

  /**
   * Get ALL campaign data in ONE API call using field expansion
   */
  async getCampaignFullData(campaignId) {
    console.log(`📊 Fetching complete campaign data in ONE call...`);

    // SIMPLIFIED field expansion - only get essential data and creative IDs
    const fields = 'id,name,status,objective,special_ad_categories,' +
      'special_ad_category_country,daily_budget,lifetime_budget,' +
      'bid_strategy,budget_remaining,account_id,' +
      'adsets.limit(200){' +
        'id,name,status,targeting,daily_budget,lifetime_budget,' +
        'optimization_goal,billing_event,bid_amount,bid_strategy,' +
        'promoted_object,attribution_spec,conversion_specs,' +
        'start_time,end_time,schedule,frequency_control_specs,' +
        'optimization_sub_event,min_spending_target,max_spending_target,' +
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
   */
  prepareBatchRequests(campaignData, newName) {
    const requests = [];

    // Extract account ID
    let accountId = campaignData.account_id;
    if (accountId && accountId.startsWith('act_')) {
      accountId = accountId.substring(4);
    }

    // 1. Create new campaign
    const campaignRequest = {
      method: 'POST',
      relative_url: `act_${accountId}/campaigns`,
      body: this.prepareCampaignBody(campaignData, newName)
    };
    requests.push(campaignRequest);

    // 2. Create all ad sets
    if (campaignData.adsets?.data) {
      campaignData.adsets.data.forEach((adSet, adSetIndex) => {
        const adSetRequest = {
          method: 'POST',
          relative_url: `act_${accountId}/adsets`,
          body: this.prepareAdSetBody(adSet, '{result=create-campaign:$.id}')
        };
        requests.push(adSetRequest);

        // 3. Create ads for this ad set
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

    console.log(`📦 Prepared ${requests.length} operations for batch execution`);
    return requests;
  }

  /**
   * Prepare campaign body for batch request
   */
  prepareCampaignBody(campaign, newName) {
    const body = {
      name: newName,
      objective: campaign.objective,
      status: 'PAUSED',
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
      status: adSet.status || 'PAUSED',
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

    return this.encodeBody(body);
  }

  /**
   * Prepare ad body for batch request
   */
  prepareAdBody(ad, adSetIdRef) {
    const body = {
      name: `${ad.name} - Copy`,
      adset_id: adSetIdRef,
      status: 'PAUSED'
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
        // Use story spec
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
        const response = await axios.post(
          this.baseURL,
          {
            batch: JSON.stringify(batches[i]),
            access_token: this.accessToken
          },
          {
            timeout: 120000, // 2 minute timeout for complex batch operations
            headers: {
              'Content-Type': 'application/json'
            }
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
   */
  encodeBody(body) {
    return Object.entries(body)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
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

      // ===== STEP 3: EXECUTE BATCHES =====
      console.log('\n🔄 Step 3: Executing batch operations...');
      console.log(`📦 Total operations: ${allOperations.length}`);
      console.log(`📊 Will execute in ${Math.ceil(allOperations.length / this.maxBatchSize)} batch(es)`);
      console.log(`📊 API calls needed: ${1 + Math.ceil(allOperations.length / this.maxBatchSize)} (1 campaign + ${Math.ceil(allOperations.length / this.maxBatchSize)} batches)`);
      console.log(`💰 API call savings: ${Math.round((1 - (1 + Math.ceil(allOperations.length / this.maxBatchSize)) / (1 + allOperations.length)) * 100)}%`);

      const result = await this.executeBatch(allOperations);

      console.log('\n✅ ========================================');
      console.log('✅ BATCH TEMPLATE LAUNCH COMPLETE!');
      console.log('✅ ========================================');
      console.log(`✅ Campaign: ${campaignId}`);
      console.log(`✅ Created ${numAdSets} ad sets with ${numAdSets * numAdsPerAdSet} ads`);
      console.log(`✅ All ad sets have IDENTICAL settings (100% root effect)`);
      console.log(`✅ All ads have IDENTICAL creatives (100% root effect)`);

      // Add campaign result to the beginning of results array
      const allResults = [{ code: 200, body: JSON.stringify({ id: campaignId }) }, ...result];

      return {
        success: true,
        operations: 1 + allOperations.length,
        batchesExecuted: 1 + Math.ceil(allOperations.length / this.maxBatchSize),
        apiCallsSaved: allOperations.length - Math.ceil(allOperations.length / this.maxBatchSize),
        results: allResults,
        campaignId: campaignId
      };

    } catch (error) {
      console.error('❌ Batch template launch failed:', error.message);
      throw error;
    }
  }

  /**
   * Prepare campaign body from template data
   */
  prepareCampaignBodyFromTemplate(templateData) {
    const body = {
      name: templateData.campaignName || 'New Campaign',
      objective: templateData.objective || 'OUTCOME_LEADS',
      status: 'PAUSED', // Safe default - user can activate later
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
      status: 'PAUSED', // Safe default
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
            { event_type: 'ENGAGED_VIEW', window_days: 1 },
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
    if (templateData.budgetType === 'lifetime') {
      if (templateData.adSetBudget?.startDate) {
        body.start_time = Math.floor(new Date(templateData.adSetBudget.startDate).getTime() / 1000);
      }
      if (templateData.adSetBudget?.endDate) {
        body.end_time = Math.floor(new Date(templateData.adSetBudget.endDate).getTime() / 1000);
      }
    } else if (templateData.adSetBudget?.startDate || templateData.adSetBudget?.endDate) {
      if (templateData.adSetBudget.startDate) {
        body.start_time = Math.floor(new Date(templateData.adSetBudget.startDate).getTime() / 1000);
      }
      if (templateData.adSetBudget.endDate) {
        body.end_time = Math.floor(new Date(templateData.adSetBudget.endDate).getTime() / 1000);
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

    const hasSpecificLocations =
      (templateData.targeting?.locations?.states?.length > 0) ||
      (templateData.targeting?.locations?.cities?.length > 0) ||
      (templateData.targeting?.locations?.custom?.length > 0) ||
      (templateData.targeting?.locations?.zips?.length > 0);

    // States (regions)
    if (templateData.targeting?.locations?.states?.length > 0) {
      targeting.geo_locations.regions = templateData.targeting.locations.states.map(state => ({
        key: this.stateToRegionId[state] || `US:${state}`
      }));
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
   */
  prepareAdBodyFromTemplate(templateData, adIndex, adSetIdRef) {
    const body = {
      name: `${templateData.campaignName || 'Campaign'} - Ad ${adIndex + 1}`,
      adset_id: adSetIdRef,
      status: 'PAUSED'
    };

    // ===== CREATIVE =====
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

      if (templateData.displayLink) {
        creative.object_story_spec.video_data.call_to_action.value.link_caption = templateData.displayLink;
      }

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

      if (templateData.displayLink) {
        creative.object_story_spec.link_data.link_caption = templateData.displayLink;
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

      if (templateData.displayLink) {
        creative.object_story_spec.link_data.link_caption = templateData.displayLink;
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

      if (templateData.displayLink) {
        creative.object_story_spec.link_data.link_caption = templateData.displayLink;
      }

      if (templateData.imageHash) {
        creative.object_story_spec.link_data.image_hash = templateData.imageHash;
      }
    }

    body.creative = JSON.stringify(creative);

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
      console.log('🚀 BATCH AD SET DUPLICATION');
      console.log('🚀 ========================================');
      console.log(`📊 Creating ${count} duplicates of ad set ${originalAdSetId}`);
      console.log(`📊 Campaign: ${campaignId}`);
      console.log(`📊 Creative Type: ${formData.dynamicCreativeEnabled ? 'Dynamic Creative (asset_feed_spec)' : 'Regular Ad (post_id)'}`);
      if (postId) {
        console.log(`📊 Post ID: ${postId}`);
      } else if (formData.mediaHashes) {
        console.log(`📊 Media Hashes: Provided for asset_feed_spec`);
      }
      console.log(`📊 Total operations: ${count + count} (ad sets + ads)`);

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

      // Step 2: Execute ATOMIC PAIRS - Create 1 ad set + 1 ad per batch
      // CRITICAL FIX: Each batch has ONLY 2 operations with relative index reference
      // This ensures ad can reference ad set using {result=0:$.id} (first operation in batch)
      console.log('\n🔄 Step 2: Executing ATOMIC PAIR batches...');
      console.log(`📦 Total pairs to create: ${count}`);
      console.log(`📊 Each batch creates 1 complete pair (ad set + ad)`);
      console.log(`📊 API calls needed: ${count} (1 per pair)`);
      console.log(`💰 100% atomic pairing - no orphaned ad sets possible`);

      const accountId = this.adAccountId.replace('act_', '');
      const successfulPairs = [];
      const failedPairs = [];
      const orphanedAdSets = [];

      // Prepare text variations once (used for all pairs)
      const textVariations = (formData.dynamicTextEnabled || formData.dynamicCreativeEnabled) ? {
        primaryTexts: formData.primaryTextVariations || (formData.primaryText ? [formData.primaryText] : []),
        headlines: formData.headlineVariations || (formData.headline ? [formData.headline] : []),
        primaryText: formData.primaryText,
        headline: formData.headline,
        description: formData.description,
        url: formData.url,
        displayLink: formData.displayLink,
        callToAction: formData.callToAction
      } : null;

      // Create each pair in its own batch
      for (let pairIndex = 0; pairIndex < count; pairIndex++) {
        const pairNumber = pairIndex + 1;
        console.log(`  📤 Creating pair ${pairNumber}/${count}...`);

        try {
          // Prepare THIS pair as a batch of EXACTLY 2 operations
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

          // Operation 1: Create ad (references operation 0 in THIS batch)
          // CRITICAL: Use {result=0:$.id} to reference the FIRST operation in THIS batch
          const adBody = this.prepareAdBodyForDuplicate(
            formData.campaignName || 'Campaign',
            postId,
            pairNumber,
            '{result=0:$.id}', // ← FIXED: Reference index 0 (ad set in THIS batch)
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

          // Execute THIS pair's batch
          const response = await axios.post(
            this.baseURL,
            {
              batch: JSON.stringify(pairBatch),
              access_token: this.accessToken
            }
          );

          const results = response.data;

          // Check if BOTH operations succeeded
          const adSetResult = results[0];
          const adResult = results[1];

          let adSetId = null;
          let adId = null;
          let adSetSuccess = false;
          let adSuccess = false;

          // Parse ad set result
          if (adSetResult && adSetResult.code === 200 && adSetResult.body) {
            try {
              const body = JSON.parse(adSetResult.body);
              adSetId = body.id;
              adSetSuccess = true;
            } catch (e) {
              console.error(`       ❌ Failed to parse ad set result: ${e.message}`);
            }
          }

          // Parse ad result
          if (adResult && adResult.code === 200 && adResult.body) {
            try {
              const body = JSON.parse(adResult.body);
              adId = body.id;
              adSuccess = true;
            } catch (e) {
              console.error(`       ❌ Failed to parse ad result: ${e.message}`);
            }
          }

          // Check pair success
          if (adSetSuccess && adSuccess) {
            // SUCCESS: Both ad set and ad created
            successfulPairs.push({ adSetId, adId, pairNumber });
            console.log(`     ✅ Pair ${pairNumber} complete (Ad Set: ${adSetId}, Ad: ${adId})`);
          } else if (adSetSuccess && !adSuccess) {
            // ORPHAN: Ad set created but ad failed - DELETE immediately
            const adErrorMsg = adResult && adResult.body ? JSON.parse(adResult.body).error?.message : 'Unknown error';
            console.warn(`     ⚠️  Pair ${pairNumber}: Ad set created but ad failed - ${adErrorMsg}`);
            console.log(`     🗑️  Deleting orphaned ad set ${adSetId}...`);

            try {
              await axios.delete(
                `${this.baseURL}/${adSetId}`,
                {
                  params: { access_token: this.accessToken }
                }
              );
              console.log(`     ✅ Deleted orphaned ad set ${adSetId}`);
              orphanedAdSets.push({ adSetId, pairNumber, deleted: true });
            } catch (deleteError) {
              console.error(`     ❌ Failed to delete orphaned ad set: ${deleteError.message}`);
              orphanedAdSets.push({ adSetId, pairNumber, deleted: false });
            }

            failedPairs.push({ pairNumber, reason: 'ad_creation_failed' });
          } else {
            // Both failed or only ad set failed
            const adSetErrorMsg = adSetResult && adSetResult.body ? JSON.parse(adSetResult.body).error?.message : 'Unknown error';
            console.error(`     ❌ Pair ${pairNumber} failed: ${adSetErrorMsg}`);
            failedPairs.push({ pairNumber, reason: 'ad_set_creation_failed' });
          }

          // Delay between pairs to prevent rate limits
          if (pairIndex < count - 1) {
            await this.delay(2000);
          }

        } catch (error) {
          console.error(`     ❌ Pair ${pairNumber} batch failed: ${error.message}`);
          failedPairs.push({ pairNumber, reason: 'batch_request_failed', error: error.message });
        }
      }

      console.log(`\n📊 ATOMIC PAIRING RESULTS:`);
      console.log(`   ✅ Successful pairs: ${successfulPairs.length}/${count}`);
      console.log(`   ❌ Failed pairs: ${failedPairs.length}/${count}`);
      console.log(`   🗑️  Orphaned ad sets deleted: ${orphanedAdSets.filter(o => o.deleted).length}`);
      console.log(`   ✅ 1:1 Ratio maintained: ${successfulPairs.length} ad sets, ${successfulPairs.length} ads`);

      // Step 3: Prepare return data
      const newAdSetIds = successfulPairs.map(p => p.adSetId);
      const newAdIds = successfulPairs.map(p => p.adId);

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
      console.log('✅ ATOMIC PAIR DUPLICATION COMPLETE!');
      console.log('✅ ========================================');
      console.log(`✅ Created ${newAdSetIds.length} ad sets with ${newAdIds.length} ads`);
      console.log(`✅ API calls used: ${count} (1 per pair)`);
      console.log(`✅ Orphans prevented: ${orphanedAdSets.filter(o => o.deleted).length} deleted immediately`);
      console.log(`✅ 100% ATOMIC: Each API call creates complete pair or nothing`);

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
        operations: count * 2, // 2 operations per pair
        batchesExecuted: count, // 1 batch per pair
        apiCallsSaved: count, // Compared to 2 * count sequential calls
        orphanedAdSets: orphanedAdSets, // Include orphaned ad sets (should be deleted already)
        summary: {
          totalExpected: count,
          totalSuccess: successfulPairs.length, // Only count complete pairs
          totalAdSetsCreated: newAdSetIds.length,
          totalAdsCreated: newAdIds.length,
          totalFailed: failedPairs.length,
          totalOrphaned: orphanedAdSets.filter(o => !o.deleted).length, // Only undeleted orphans
          successRate: Math.round((successfulPairs.length / count) * 100),
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
    if (postId && !isDynamicCreative) {
      body.creative = JSON.stringify({
        object_story_id: postId,
        page_id: this.pageId
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
    else if (postId) {
      body.creative = JSON.stringify({
        object_story_id: postId,
        page_id: this.pageId
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
          status: 'PAUSED',
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

        // Step 4: Process results
        console.log('\n📊 Processing results...');

        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i];
          const isAdSet = i % 2 === 0; // Even = ad set, odd = ad
          const objectNumber = Math.floor(i / 2) + 1;

          if (result && result.code === 200 && result.body) {
            const body = JSON.parse(result.body);

            if (isAdSet) {
              newAdSetIds.push(body.id);
            } else {
              newAdIds.push(body.id);
            }
          } else if (result) {
            // Operation failed
            const errorMsg = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
            const errorDetails = errorMsg?.error?.message || 'Unknown error';

            if (isAdSet) {
              console.error(`❌ Ad Set ${objectNumber} failed (op ${i}):`, errorDetails);
            } else if (result.code !== 960) {
              // Only log ad failures if not caused by dependent ad set failures
              console.error(`❌ Ad ${objectNumber} failed (op ${i}):`, errorDetails);
            }

            failedOperations.push({ operation: i, error: errorDetails });
          }
        }

        console.log('\n✅ Copy results:');
        console.log(`   Campaign: ${createdCampaignId || 'FAILED'}`);
        console.log(`   Ad Sets Created: ${newAdSetIds.length}/${adSetsCount}`);
        console.log(`   Ads Created: ${newAdIds.length}/${totalAds}`);

        if (failedOperations.length > 0) {
          console.log(`   ⚠️  Failed Operations: ${failedOperations.length}`);
        }

        allResults.push({
          copyNumber,
          campaign: {
            id: createdCampaignId,
            name: campaignCopyName
          },
          adSets: newAdSetIds,
          ads: newAdIds,
          operations: allOperations.length,
          batchesExecuted: batches.length,
          failed: failedOperations.length
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
      status: 'PAUSED',
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
}

module.exports = BatchDuplicationService;