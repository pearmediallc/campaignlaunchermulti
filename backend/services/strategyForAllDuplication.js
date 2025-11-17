const axios = require('axios');

/**
 * Strategy For All Based Duplication Service
 *
 * This service follows the EXACT same pattern as the working for-all strategy
 * to duplicate campaigns. It uses the same creative structure and API calls
 * that are proven to work in production.
 */
class StrategyForAllDuplicationService {
  constructor(accessToken, adAccountId, pageId, pixelId) {
    console.log(`🔍 DEBUG: StrategyForAllDuplicationService constructor parameters:`);
    console.log(`  - accessToken: ${accessToken ? 'SET' : 'UNDEFINED'}`);
    console.log(`  - adAccountId: ${adAccountId || 'UNDEFINED'}`);
    console.log(`  - pageId: ${pageId || 'UNDEFINED'}`);
    console.log(`  - pixelId: ${pixelId || 'UNDEFINED'}`);

    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.pageId = pageId;
    this.pixelId = pixelId;
    this.baseURL = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Duplicate campaign using the exact same pattern as for-all strategy
   * @param {string} campaignId - Campaign ID to duplicate
   * @param {string} newName - Name for the new campaign
   * @param {number} copies - Number of copies to create
   * @param {number} adSetCount - Number of ad sets to create (1-49), default 49
   * @param {number} totalBudget - Total budget to distribute across ad sets
   */
  async duplicateCampaign(campaignId, newName, copies = 1, adSetCount = 49, totalBudget = null, editorName = null) {
    console.log(`🚀 Starting for-all based duplication for campaign ${campaignId}`);
    console.log(`📊 Creating ${copies} copies using proven working pattern`);

    const results = [];
    let campaignData = null;

    try {
      // Step 1: Get campaign data using the same approach as for-all
      campaignData = await this.getCampaignData(campaignId);

      // Step 2: Detect the ACTUAL structure of the original campaign
      const actualStructure = await this.detectCampaignStructure(campaignId);
      console.log(`📊 Detected original campaign structure:`);
      console.log(`  - Ad Sets: ${actualStructure.adSetCount}`);
      console.log(`  - Total Ads: ${actualStructure.totalAds}`);
      console.log(`  - Has Dynamic Creative: ${actualStructure.hasDynamicCreative}`);

      // Use actual ad set count if not explicitly overridden
      const finalAdSetCount = adSetCount === 49 ? actualStructure.adSetCount : adSetCount;
      console.log(`📊 Will create ${finalAdSetCount} ad sets per campaign`);
      console.log(`💵 Total budget: ${totalBudget ? `$${totalBudget}` : 'Original budget'}`);

      // Step 3: Get the post ID from the campaign using for-all pattern
      const postId = await this.getPostIdFromCampaign(campaignId);

      if (!postId) {
        throw new Error('Could not find post ID from campaign - required for for-all duplication');
      }

      console.log(`✅ Found post ID: ${postId}`);

      // Calculate budget per ad set
      const budgetPerAdSet = totalBudget ? (totalBudget / finalAdSetCount) : 1;
      console.log(`💵 Budget per ad set: $${budgetPerAdSet.toFixed(2)}`);

      // Step 4: Create copies using the exact for-all pattern
      for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
        const copyName = copies > 1
          ? `${newName} - Copy ${copyIndex + 1}`
          : newName;

        console.log(`🔄 Creating copy ${copyIndex + 1}/${copies}: "${copyName}"`);

        const copyResult = await this.createCampaignCopy(
          campaignData,
          copyName,
          postId,
          finalAdSetCount,
          budgetPerAdSet,
          editorName
        );

        // Add original campaign info to result for error reporting
        copyResult.originalCampaignId = campaignId;
        copyResult.originalCampaignName = campaignData.name;

        results.push(copyResult);

        // Delay between copies to avoid rate limits
        if (copyIndex < copies - 1) {
          await this.delay(2000);
        }
      }

      console.log(`✅ for-all based duplication complete! Created ${results.length} copies`);
      return results;

    } catch (error) {
      console.error('❌ for-all based duplication failed:', error.message);

      // Return error result with campaign info
      return [{
        originalCampaignId: campaignId,
        originalCampaignName: campaignData?.name || 'Unknown',
        campaign: null,
        adSets: [],
        ads: [],
        totalAdSets: 0,
        totalAds: 0,
        errors: [{
          stage: 'initialization',
          message: error.message,
          details: error.response?.data
        }],
        success: false,
        partialSuccess: false
      }];
    }
  }

  /**
   * Detect the actual structure of the campaign
   * @param {string} campaignId - Campaign ID to analyze
   * @returns {object} Structure info including ad set count, total ads, and dynamic creative status
   */
  async detectCampaignStructure(campaignId) {
    console.log(`🔍 Detecting actual campaign structure...`);

    try {
      // Get all ad sets in the campaign
      const adSetsResponse = await axios.get(
        `${this.baseURL}/${campaignId}/adsets`,
        {
          params: {
            fields: 'id,name,is_dynamic_creative',
            access_token: this.accessToken,
            limit: 100
          }
        }
      );

      const adSets = adSetsResponse.data?.data || [];
      console.log(`  Found ${adSets.length} ad sets`);

      // Check if any ad sets have dynamic creative
      const hasDynamicCreative = adSets.some(adSet => adSet.is_dynamic_creative);

      // Get total ad count
      let totalAds = 0;
      for (const adSet of adSets) {
        const adsResponse = await axios.get(
          `${this.baseURL}/${adSet.id}/ads`,
          {
            params: {
              fields: 'id',
              access_token: this.accessToken,
              limit: 100
            }
          }
        );
        const adCount = adsResponse.data?.data?.length || 0;
        totalAds += adCount;
        console.log(`  Ad Set ${adSet.name}: ${adCount} ads`);
      }

      return {
        adSetCount: adSets.length,
        totalAds: totalAds,
        hasDynamicCreative: hasDynamicCreative,
        adSets: adSets
      };

    } catch (error) {
      console.error('Failed to detect campaign structure:', error.message);
      // Default to single ad set if detection fails
      return {
        adSetCount: 1,
        totalAds: 1,
        hasDynamicCreative: false,
        adSets: []
      };
    }
  }

  /**
   * Get campaign data using the same fields as for-all strategy
   */
  async getCampaignData(campaignId) {
    console.log(`📊 Fetching campaign data using for-all pattern...`);

    try {
      const response = await axios.get(
        `${this.baseURL}/${campaignId}`,
        {
          params: {
            fields: 'id,name,status,objective,special_ad_categories,special_ad_category_country,daily_budget,lifetime_budget,bid_strategy,account_id,adsets.limit(1){promoted_object,optimization_goal,billing_event}',
            access_token: this.accessToken
          }
        }
      );

      console.log(`✅ Fetched campaign data successfully`);
      return response.data;

    } catch (error) {
      console.error('Failed to fetch campaign data:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get post ID from campaign using the exact same method as for-all
   */
  async getPostIdFromCampaign(campaignId) {
    console.log(`🔍 Getting post ID from campaign using for-all method...`);

    try {
      // Get first ad set from campaign
      const adSetsResponse = await axios.get(
        `${this.baseURL}/${campaignId}/adsets`,
        {
          params: {
            fields: 'id',
            access_token: this.accessToken,
            limit: 1
          }
        }
      );

      if (!adSetsResponse.data?.data?.[0]) {
        throw new Error('No ad sets found in campaign');
      }

      const firstAdSetId = adSetsResponse.data.data[0].id;

      // Get post ID from first ad using for-all pattern
      const adsResponse = await axios.get(
        `${this.baseURL}/${firstAdSetId}/ads`,
        {
          params: {
            fields: 'creative{effective_object_story_id,object_story_id}',
            access_token: this.accessToken,
            limit: 1
          }
        }
      );

      if (!adsResponse.data?.data?.[0]?.creative) {
        throw new Error('No creative found in first ad');
      }

      const creative = adsResponse.data.data[0].creative;
      const postId = creative.effective_object_story_id || creative.object_story_id;

      if (!postId) {
        throw new Error('No post ID found in creative');
      }

      return postId;

    } catch (error) {
      console.error('Failed to get post ID from campaign:', error.message);
      throw error;
    }
  }

  /**
   * Create campaign copy using the exact same structure as for-all
   * @param {object} originalCampaign - Original campaign data
   * @param {string} newName - Name for the new campaign
   * @param {string} postId - Post ID to use for ads
   * @param {number} adSetCount - Number of ad sets to create (1-49)
   * @param {number} budgetPerAdSet - Budget per ad set in dollars
   * @param {string} editorName - Optional editor name for ad naming convention
   */
  async createCampaignCopy(originalCampaign, newName, postId, adSetCount = 49, budgetPerAdSet = 1, editorName = null) {
    console.log(`📋 Creating campaign copy using for-all structure...`);
    console.log(`📊 Creating ${adSetCount} ad sets with $${budgetPerAdSet.toFixed(2)} budget each`);

    const errors = [];
    let newCampaign = null;
    let adSets = [];
    let ads = [];

    try {
      // Step 1: Create campaign using for-all pattern
      newCampaign = await this.createCampaign(originalCampaign, newName);

      // Step 2: Get original ad set configuration - FETCH COMPLETE CONFIG FROM FACEBOOK
      console.log(`🔍 Fetching EXACT configuration from original ad set...`);
      const originalAdSetConfig = await this.getOriginalAdSetFullConfig(originalCampaign);

      // Step 3: Check if campaign uses CBO (Campaign Budget Optimization)
      const usesCBO = !!(originalCampaign.daily_budget || originalCampaign.lifetime_budget);
      console.log(`📊 Campaign uses CBO: ${usesCBO}`);

      // Step 4: Create ad sets using EXACT copy of original configuration
      const adSetResult = await this.create50AdSets(
        newCampaign.id,
        postId,
        originalAdSetConfig,
        usesCBO,
        adSetCount,
        budgetPerAdSet
      );
      adSets = adSetResult.adSets;
      if (adSetResult.errors && adSetResult.errors.length > 0) {
        errors.push(...adSetResult.errors);
      }

      // Step 5: Create ads in each ad set using for-all pattern
      const adsResult = await this.createAdsInAdSets(adSets, postId, newName, editorName);
      ads = adsResult.ads;
      if (adsResult.errors && adsResult.errors.length > 0) {
        errors.push(...adsResult.errors);
      }

      // Step 6: Verify all ad sets and ads were created
      console.log(`\n📊 Creation Summary:`);
      console.log(`  ✓ Target ad sets: ${adSetCount}`);
      console.log(`  ✓ Created ad sets: ${adSets.length}`);
      console.log(`  ✓ Target ads: ${adSets.length}`);
      console.log(`  ✓ Created ads: ${ads.length}`);

      if (adSets.length < adSetCount) {
        console.warn(`  ⚠️ Missing ${adSetCount - adSets.length} ad sets`);
      }
      if (ads.length < adSets.length) {
        console.warn(`  ⚠️ Missing ${adSets.length - ads.length} ads`);
      }

    } catch (error) {
      console.error('Failed to create campaign copy:', error.message);
      errors.push({
        stage: 'campaign_creation',
        message: error.message,
        details: error.response?.data
      });
    }

    return {
      campaign: newCampaign,
      adSets: adSets,
      ads: ads,
      totalAdSets: adSets.length,
      totalAds: ads.length,
      targetAdSets: adSetCount,
      targetAds: adSetCount,
      errors: errors,
      success: errors.length === 0 && adSets.length === adSetCount && ads.length === adSetCount,
      partialSuccess: errors.length > 0 && (adSets.length > 0 || ads.length > 0)
    };
  }

  /**
   * Get EXACT original ad set configuration from Facebook API
   * This ensures we copy ALL fields including attribution, targeting, etc.
   */
  async getOriginalAdSetFullConfig(originalCampaign) {
    try {
      // Get the first ad set ID from the campaign
      const firstAdSetId = originalCampaign.adsets?.data?.[0]?.id;

      if (!firstAdSetId) {
        console.warn('⚠️ No ad set found in original campaign, using basic config');
        return originalCampaign.adsets?.data?.[0] || {};
      }

      console.log(`🔍 Fetching full config for ad set: ${firstAdSetId}`);

      // Fetch COMPLETE ad set configuration from Facebook
      const response = await axios.get(
        `${this.baseURL}/${firstAdSetId}`,
        {
          params: {
            fields: 'id,name,billing_event,optimization_goal,bid_strategy,promoted_object,targeting,attribution_spec,performance_goal,daily_budget,lifetime_budget,status',
            access_token: this.accessToken
          }
        }
      );

      console.log(`✅ Fetched EXACT configuration with all fields`);
      return response.data;

    } catch (error) {
      console.error('Failed to fetch original ad set config:', error.message);
      // Fallback to the basic config from campaign data
      return originalCampaign.adsets?.data?.[0] || {};
    }
  }

  /**
   * Create campaign using the exact same parameters as for-all
   */
  async createCampaign(originalCampaign, newName) {
    console.log(`📋 Creating campaign: ${newName}`);

    const campaignData = {
      name: newName,
      objective: originalCampaign.objective,
      status: 'PAUSED', // Start paused like for-all
      access_token: this.accessToken
    };

    // Add optional fields if they exist (same as for-all)
    if (originalCampaign.special_ad_categories) {
      campaignData.special_ad_categories = JSON.stringify(originalCampaign.special_ad_categories);
    }
    if (originalCampaign.special_ad_category_country) {
      campaignData.special_ad_category_country = originalCampaign.special_ad_category_country;
    }
    if (originalCampaign.daily_budget) {
      campaignData.daily_budget = originalCampaign.daily_budget;
    }
    if (originalCampaign.lifetime_budget) {
      campaignData.lifetime_budget = originalCampaign.lifetime_budget;
    }
    if (originalCampaign.bid_strategy) {
      campaignData.bid_strategy = originalCampaign.bid_strategy;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/act_${this.adAccountId}/campaigns`,
        null,
        { params: campaignData }
      );

      console.log(`✅ Campaign created: ${response.data.id}`);
      return response.data;

    } catch (error) {
      console.error('Failed to create campaign:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create ad sets using sequential API calls with EXACT copy of 1st ad set
   * @param {string} campaignId - Campaign ID to create ad sets in
   * @param {string} postId - Post ID for ads
   * @param {object} originalAdSetConfig - EXACT configuration from 1st ad set (NO modifications)
   * @param {boolean} usesCBO - Whether campaign uses CBO
   * @param {number} adSetCount - Number of ad sets to create (1-49)
   * @param {number} budgetPerAdSet - Budget per ad set in dollars
   */
  async create50AdSets(campaignId, postId, originalAdSetConfig, usesCBO, adSetCount = 49, budgetPerAdSet = 1) {
    console.log(`📋 Creating ${adSetCount} ad sets using sequential API calls...`);
    console.log(`💰 Budget configuration: ${usesCBO ? 'Campaign-level (CBO)' : 'Ad Set-level'}`);
    console.log(`💵 Budget per ad set: $${budgetPerAdSet}`);

    const adSets = [];
    const errors = [];
    const failedIndices = [];  // Track which indices failed for retry

    // Create ad sets sequentially with delays to avoid rate limits
    for (let i = 1; i <= adSetCount; i++) {
      // EXACT COPY - Use original values without forcing defaults
      const adSetData = {
        name: `AdSet ${i}`,
        campaign_id: campaignId,
        status: 'ACTIVE',
        access_token: this.accessToken
      };

      // Copy EXACT values from original ad set (NO forced defaults!)
      if (originalAdSetConfig?.billing_event) {
        adSetData.billing_event = originalAdSetConfig.billing_event;
      }
      if (originalAdSetConfig?.optimization_goal) {
        adSetData.optimization_goal = originalAdSetConfig.optimization_goal;
      }

      // Copy targeting EXACTLY as it was in 1st ad set
      if (originalAdSetConfig?.targeting) {
        adSetData.targeting = typeof originalAdSetConfig.targeting === 'string'
          ? originalAdSetConfig.targeting
          : JSON.stringify(originalAdSetConfig.targeting);
      }

      // Copy attribution spec EXACTLY (no forced 1_day_click_1_day_view)
      if (originalAdSetConfig?.attribution_spec) {
        adSetData.attribution_spec = typeof originalAdSetConfig.attribution_spec === 'string'
          ? originalAdSetConfig.attribution_spec
          : JSON.stringify(originalAdSetConfig.attribution_spec);
      }

      // Copy bid strategy EXACTLY
      if (originalAdSetConfig?.bid_strategy) {
        adSetData.bid_strategy = originalAdSetConfig.bid_strategy;
      }

      // Copy performance goal EXACTLY
      if (originalAdSetConfig?.performance_goal) {
        adSetData.performance_goal = originalAdSetConfig.performance_goal;
      }

      // Only set ad set budget if campaign doesn't use CBO
      if (!usesCBO && budgetPerAdSet) {
        adSetData.daily_budget = Math.round(budgetPerAdSet * 100);  // Convert dollars to cents
      }

      // Copy promoted_object EXACTLY from original ad set
      if (originalAdSetConfig?.promoted_object) {
        adSetData.promoted_object = typeof originalAdSetConfig.promoted_object === 'string'
          ? originalAdSetConfig.promoted_object
          : JSON.stringify(originalAdSetConfig.promoted_object);
      }

      // Create single ad set with retry logic
      let success = false;
      let retryCount = 0;
      const maxRetries = 2;

      while (!success && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`🔄 Retry ${retryCount}/${maxRetries} for AdSet ${i}/${adSetCount}...`);
          } else {
            console.log(`⏳ Creating AdSet ${i}/${adSetCount}...`);
          }

          const response = await axios.post(
            `${this.baseURL}/act_${this.adAccountId}/adsets`,
            null,
            { params: adSetData }
          );

          adSets.push(response.data);
          console.log(`✅ AdSet ${i} created: ${response.data.id}`);
          success = true;

          // Add delay to avoid rate limits (500ms between ad sets)
          if (i < adSetCount) {
            await this.delay(500);
          }

        } catch (error) {
          const errorMessage = error.response?.data?.error?.message || error.message;
          retryCount++;

          if (retryCount > maxRetries) {
            console.error(`❌ Failed to create AdSet ${i} after ${maxRetries} retries:`, errorMessage);
            errors.push({
              stage: 'ad_set_creation',
              index: i,
              name: `AdSet ${i}`,
              message: errorMessage,
              details: error.response?.data?.error,
              retries: retryCount - 1
            });
            failedIndices.push(i);
          } else {
            console.warn(`⚠️ AdSet ${i} failed, will retry:`, errorMessage);
            // Wait longer before retry
            await this.delay(2000);
          }
        }
      }
    }

    console.log(`✅ Created ${adSets.length}/${adSetCount} ad sets successfully`);
    if (errors.length > 0) {
      console.log(`⚠️ Failed to create ${errors.length} ad sets: ${failedIndices.join(', ')}`);
    }

    return { adSets, errors, failedIndices };
  }

  /**
   * Create ads in ad sets using sequential API calls with retry logic
   * @param {array} adSets - Array of ad sets to create ads in
   * @param {string} postId - Post ID to use for creative
   * @param {string} campaignName - Campaign name for ad naming convention
   * @param {string} editorName - Optional editor name for ad naming convention
   */
  async createAdsInAdSets(adSets, postId, campaignName, editorName = null) {
    console.log(`📋 Creating ads using sequential API calls...`);
    console.log(`📍 Using existing post ID: ${postId}`);
    console.log(`📝 Editor name: ${editorName || 'none (local upload)'}`);

    const ads = [];
    const errors = [];
    const failedIndices = [];  // Track which ads failed for retry

    // Generate date string for ad naming
    const now = new Date();
    const dateStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;

    // Create one ad per ad set sequentially
    for (let i = 0; i < adSets.length; i++) {
      const adSet = adSets[i];

      // Generate ad name with proper naming convention matching Strategy for Ads
      let adName;
      if (editorName) {
        adName = `[Launcher] ${campaignName} - Ad ${i + 1} - ${dateStr} - ${editorName.toUpperCase()}`;
      } else {
        adName = `[Launcher] ${campaignName} - Ad ${i + 1} - ${dateStr}`;
      }

      const adData = {
        name: adName,
        adset_id: adSet.id,
        // Use existing post (same as for-all working pattern)
        creative: JSON.stringify({
          object_story_id: postId,
          page_id: this.pageId
        }),
        status: 'ACTIVE',
        access_token: this.accessToken
      };

      let success = false;
      let retryCount = 0;
      const maxRetries = 2;

      while (!success && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`🔄 Retry ${retryCount}/${maxRetries} for Ad ${i + 1}/${adSets.length}...`);
          } else {
            console.log(`⏳ Creating Ad ${i + 1}/${adSets.length} for AdSet ${adSet.id}...`);
          }

          const response = await axios.post(
            `${this.baseURL}/act_${this.adAccountId}/ads`,
            null,
            { params: adData }
          );

          ads.push(response.data);
          console.log(`✅ Ad ${i + 1} created: ${response.data.id}`);
          success = true;

          // Add small delay to avoid rate limits (300ms between ads)
          if (i < adSets.length - 1) {
            await this.delay(300);
          }

        } catch (error) {
          const errorMessage = error.response?.data?.error?.message || error.message;
          retryCount++;

          if (retryCount > maxRetries) {
            console.error(`❌ Failed to create Ad ${i + 1} after ${maxRetries} retries:`, errorMessage);
            errors.push({
              stage: 'ad_creation',
              index: i + 1,
              name: `Ad ${i + 1}`,
              adSetId: adSet.id,
              message: errorMessage,
              details: error.response?.data?.error,
              retries: retryCount - 1
            });
            failedIndices.push(i + 1);
          } else {
            console.warn(`⚠️ Ad ${i + 1} failed, will retry:`, errorMessage);
            // Wait longer before retry
            await this.delay(2000);
          }
        }
      }
    }

    console.log(`✅ Created ${ads.length}/${adSets.length} ads successfully`);
    if (errors.length > 0) {
      console.log(`⚠️ Failed to create ${errors.length} ads: ${failedIndices.join(', ')}`);
    }

    return { ads, errors, failedIndices };
  }

  /**
   * Encode body parameters for batch API (same as existing batch service)
   */
  encodeBody(body) {
    return Object.entries(body)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = StrategyForAllDuplicationService;
