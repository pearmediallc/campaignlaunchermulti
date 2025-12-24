'use strict';

/**
 * InsightsCollectorService
 *
 * Collects performance insights from Facebook Marketing API.
 * Runs hourly to gather campaign, ad set, and ad performance data.
 *
 * ISOLATION PRINCIPLE:
 * - READ-ONLY access to Facebook API
 * - Stores data only in intel_* tables
 * - Never calls mutation endpoints
 */

const axios = require('axios');
const intelModels = require('../models');
const MetricsCalculator = require('../../services/metricsCalculator');

class InsightsCollectorService {
  constructor() {
    this.apiVersion = process.env.FB_API_VERSION || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Collect insights for all tracked accounts
   * @param {Object} options - Collection options
   */
  async collectAll(options = {}) {
    const { forceRefresh = false } = options;

    console.log('🧠 [InsightsCollector] Starting data collection...');

    try {
      // Get all unique ad accounts from existing tracking data
      const mainDb = require('../../models');
      const trackedCampaigns = await mainDb.CampaignTracking.findAll({
        attributes: ['ad_account_id', 'user_id'],
        group: ['ad_account_id', 'user_id'],
        raw: true
      });

      console.log(`📊 Found ${trackedCampaigns.length} unique accounts to collect data from`);

      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const tracking of trackedCampaigns) {
        try {
          await this.collectForAccount(
            tracking.user_id,
            tracking.ad_account_id,
            forceRefresh
          );
          results.success++;
        } catch (error) {
          console.error(`❌ Error collecting for account ${tracking.ad_account_id}:`, error.message);
          results.failed++;
          results.errors.push({
            ad_account_id: tracking.ad_account_id,
            error: error.message
          });
        }
      }

      console.log(`✅ [InsightsCollector] Complete: ${results.success} success, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error('❌ [InsightsCollector] Fatal error:', error);
      throw error;
    }
  }

  /**
   * Collect insights for a specific account
   */
  async collectForAccount(userId, adAccountId, forceRefresh = false) {
    console.log(`📊 Collecting insights for account ${adAccountId}...`);

    // Get user's access token
    const mainDb = require('../../models');
    const fbAuth = await mainDb.FacebookAuth.findOne({
      where: { userId: userId },
      order: [['updated_at', 'DESC']]
    });

    if (!fbAuth || !fbAuth.accessToken) {
      throw new Error('No valid access token found for user');
    }

    const accessToken = fbAuth.accessToken; // Getter decrypts

    // Get campaigns for this account
    const campaigns = await this.fetchCampaigns(adAccountId, accessToken);
    console.log(`  Found ${campaigns.length} campaigns`);

    // Collect insights for each campaign
    for (const campaign of campaigns) {
      await this.collectCampaignInsights(userId, adAccountId, campaign, accessToken);
    }

    // Collect ad set level insights
    const adSets = await this.fetchAdSets(adAccountId, accessToken);
    console.log(`  Found ${adSets.length} ad sets`);

    for (const adSet of adSets) {
      await this.collectAdSetInsights(userId, adAccountId, adSet, accessToken);
    }
  }

  /**
   * Fetch campaigns for an account
   */
  async fetchCampaigns(adAccountId, accessToken) {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    try {
      const response = await axios.get(`${this.baseUrl}/${formattedAccountId}/campaigns`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,effective_status,objective,created_time,updated_time',
          limit: 500
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetch ad sets for an account
   */
  async fetchAdSets(adAccountId, accessToken) {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    try {
      const response = await axios.get(`${this.baseUrl}/${formattedAccountId}/adsets`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,created_time,learning_stage_info',
          limit: 500
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching ad sets:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetch insights for an entity
   */
  async fetchInsights(entityId, accessToken, dateRange = 'today') {
    try {
      const response = await axios.get(`${this.baseUrl}/${entityId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'spend,impressions,clicks,reach,actions,action_values,cpm,cpc,ctr,frequency',
          date_preset: dateRange,
          level: 'account'
        }
      });

      return response.data.data?.[0] || null;
    } catch (error) {
      // Insights might not be available for all entities
      if (error.response?.data?.error?.code === 190) {
        throw error; // Token error - rethrow
      }
      return null;
    }
  }

  /**
   * Collect and store campaign insights
   */
  async collectCampaignInsights(userId, adAccountId, campaign, accessToken) {
    const insights = await this.fetchInsights(campaign.id, accessToken);

    if (!insights) return;

    const now = new Date();
    const metrics = this.parseInsights(insights);

    await intelModels.IntelPerformanceSnapshot.create({
      user_id: userId,
      ad_account_id: adAccountId,
      entity_type: 'campaign',
      entity_id: campaign.id,
      entity_name: campaign.name,
      snapshot_date: now.toISOString().split('T')[0],
      snapshot_hour: now.getHours(),
      ...metrics,
      effective_status: campaign.effective_status,
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      days_since_creation: this.daysSince(campaign.created_time),
      raw_insights: insights
    });
  }

  /**
   * Collect and store ad set insights
   */
  async collectAdSetInsights(userId, adAccountId, adSet, accessToken) {
    const insights = await this.fetchInsights(adSet.id, accessToken);

    if (!insights) return;

    const now = new Date();
    const metrics = this.parseInsights(insights);

    // Determine learning phase
    let learningPhase = null;
    if (adSet.learning_stage_info) {
      learningPhase = adSet.learning_stage_info.stage || 'UNKNOWN';
    }

    await intelModels.IntelPerformanceSnapshot.create({
      user_id: userId,
      ad_account_id: adAccountId,
      entity_type: 'adset',
      entity_id: adSet.id,
      entity_name: adSet.name,
      snapshot_date: now.toISOString().split('T')[0],
      snapshot_hour: now.getHours(),
      ...metrics,
      effective_status: adSet.effective_status,
      learning_phase: learningPhase,
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      days_since_creation: this.daysSince(adSet.created_time),
      raw_insights: insights
    });
  }

  /**
   * Parse insights response into metrics
   */
  parseInsights(insights) {
    const spend = parseFloat(insights.spend || 0);
    const impressions = parseInt(insights.impressions || 0);
    const clicks = parseInt(insights.clicks || 0);
    const reach = parseInt(insights.reach || 0);

    // Extract conversions from actions
    let conversions = 0;
    let revenue = 0;

    if (insights.actions) {
      const purchaseAction = insights.actions.find(a =>
        a.action_type === 'purchase' || a.action_type === 'omni_purchase'
      );
      if (purchaseAction) {
        conversions = parseInt(purchaseAction.value || 0);
      }

      const leadAction = insights.actions.find(a => a.action_type === 'lead');
      if (leadAction && conversions === 0) {
        conversions = parseInt(leadAction.value || 0);
      }
    }

    if (insights.action_values) {
      const purchaseValue = insights.action_values.find(a =>
        a.action_type === 'purchase' || a.action_type === 'omni_purchase'
      );
      if (purchaseValue) {
        revenue = parseFloat(purchaseValue.value || 0);
      }
    }

    // Calculate derived metrics
    const calculated = MetricsCalculator.calculateAllMetrics({
      spend,
      impressions,
      clicks,
      reach,
      results: conversions,
      revenue
    });

    return {
      spend,
      impressions,
      clicks,
      reach,
      conversions,
      revenue,
      cpm: calculated.cpm,
      ctr: calculated.ctr,
      cpc: calculated.cpc,
      cpa: calculated.cost_per_result,
      roas: calculated.roas,
      frequency: calculated.frequency
    };
  }

  /**
   * Calculate days since a date
   */
  daysSince(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get historical data for an entity
   */
  async getHistoricalData(entityType, entityId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return intelModels.IntelPerformanceSnapshot.getEntitySnapshots(
      entityType,
      entityId,
      startDate.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    );
  }

  /**
   * Backfill historical data for an account
   * @param {number} userId - User ID
   * @param {string} adAccountId - Ad account ID
   * @param {Object} options - Backfill options
   */
  async backfillAccount(userId, adAccountId, options = {}) {
    const {
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      progressCallback = null
    } = options;

    console.log(`📊 [Backfill] Starting for account ${adAccountId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Get user's access token
    const mainDb = require('../../models');
    const fbAuth = await mainDb.FacebookAuth.findOne({
      where: { userId: userId },
      order: [['updated_at', 'DESC']]
    });

    console.log(`[Backfill Debug] fbAuth found: ${!!fbAuth}, userId: ${userId}`);

    if (!fbAuth) {
      throw new Error('No Facebook auth record found for user');
    }

    // Debug: Check raw value vs getter value
    const rawToken = fbAuth.getDataValue('accessToken');
    const decryptedToken = fbAuth.accessToken;

    console.log(`[Backfill Debug] Raw token type: ${typeof rawToken}, length: ${rawToken?.length || 0}`);
    console.log(`[Backfill Debug] Raw token starts with: ${rawToken?.substring(0, 50)}...`);
    console.log(`[Backfill Debug] Decrypted token: ${decryptedToken ? 'exists' : 'null'}, length: ${decryptedToken?.length || 0}`);
    console.log(`[Backfill Debug] Decrypted token starts with: ${decryptedToken?.substring(0, 10)}...`);

    if (!decryptedToken) {
      console.error('[Backfill Debug] Token decryption failed! Check ENCRYPTION_KEY env var');
      throw new Error('Access token decryption failed - check ENCRYPTION_KEY');
    }

    // Validate token format (Facebook tokens start with EAA)
    if (!decryptedToken.startsWith('EAA')) {
      console.error(`[Backfill Debug] Invalid token format - starts with: ${decryptedToken.substring(0, 10)}`);
      throw new Error('Invalid access token format - does not start with EAA');
    }

    const accessToken = decryptedToken;
    console.log(`[Backfill Debug] Using valid token starting with: ${accessToken.substring(0, 10)}...`);

    // Calculate days to fetch
    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.ceil((endDate - startDate) / dayMs);
    let daysCompleted = 0;
    let totalInsightsSaved = 0;

    console.log(`  📊 Optimized backfill: ${totalDays} days using account-level insights with breakdowns`);
    console.log(`  📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // OPTIMIZED APPROACH: Use account-level insights with level=campaign and level=adset
    // This is MUCH more efficient than fetching each entity individually
    // Instead of thousands of API calls, we make ~3-4 calls per day

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      try {
        // 1. Fetch campaign-level insights (ALL campaigns including paused)
        const campaignData = await this.fetchAccountLevelInsights(adAccountId, dateStr, accessToken, 'campaign');
        for (const insight of campaignData) {
          await this.storePerformanceSnapshot(userId, adAccountId, 'campaign', insight, dateStr);
          totalInsightsSaved++;
        }

        // 2. Fetch adset-level insights (ALL adsets including paused)
        const adsetData = await this.fetchAccountLevelInsights(adAccountId, dateStr, accessToken, 'adset');
        for (const insight of adsetData) {
          await this.storePerformanceSnapshot(userId, adAccountId, 'adset', insight, dateStr);
          totalInsightsSaved++;
        }

        // 3. Fetch geographic breakdown (by region/DMA for location analysis)
        const geoData = await this.fetchInsightsWithBreakdown(adAccountId, dateStr, accessToken, ['region']);
        for (const insight of geoData) {
          await this.storeGeoSnapshot(userId, adAccountId, insight, dateStr);
          totalInsightsSaved++;
        }

        // 4. Fetch day-of-week and hourly patterns (for time analysis)
        const hourlyData = await this.fetchInsightsWithBreakdown(adAccountId, dateStr, accessToken, ['hourly_stats_aggregated_by_advertiser_time_zone']);
        for (const insight of hourlyData) {
          await this.storeTimeSnapshot(userId, adAccountId, insight, dateStr);
          totalInsightsSaved++;
        }

        // 5. Fetch age and gender breakdown (for demographic analysis)
        const ageGenderData = await this.fetchInsightsWithBreakdown(adAccountId, dateStr, accessToken, ['age', 'gender']);
        for (const insight of ageGenderData) {
          await this.storeDemographicSnapshot(userId, adAccountId, insight, dateStr);
          totalInsightsSaved++;
        }

        // 6. Fetch device platform breakdown (mobile vs desktop performance)
        const deviceData = await this.fetchInsightsWithBreakdown(adAccountId, dateStr, accessToken, ['device_platform']);
        for (const insight of deviceData) {
          await this.storeDeviceSnapshot(userId, adAccountId, insight, dateStr);
          totalInsightsSaved++;
        }

        // 7. Fetch publisher platform breakdown (facebook, instagram, messenger, audience network)
        const platformData = await this.fetchInsightsWithBreakdown(adAccountId, dateStr, accessToken, ['publisher_platform', 'platform_position']);
        for (const insight of platformData) {
          await this.storePlacementSnapshot(userId, adAccountId, insight, dateStr);
          totalInsightsSaved++;
        }

        // 8. Fetch ad-level insights for creative performance analysis
        const adData = await this.fetchAccountLevelInsights(adAccountId, dateStr, accessToken, 'ad');
        for (const insight of adData) {
          await this.storeAdSnapshot(userId, adAccountId, insight, dateStr);
          totalInsightsSaved++;
        }

        daysCompleted++;

        // Log progress every 5 days
        if (daysCompleted % 5 === 0 || daysCompleted === totalDays) {
          const pct = Math.round(daysCompleted / totalDays * 100);
          console.log(`  📈 Progress: ${daysCompleted}/${totalDays} days (${pct}%), ${totalInsightsSaved} records saved`);
        }

        // Report progress to UI
        if (progressCallback) {
          await progressCallback(daysCompleted, dateStr);
        }

        // Rate limiting: ~8 API calls per day now with all breakdowns
        // 500ms between days = ~2 calls/second, well under Facebook's limits
        await this.delay(500);

      } catch (error) {
        // Check if it's a database schema error (migration not run)
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.error(`  ❌ DATABASE ERROR: ${error.message}`);
          console.error(`  💡 FIX: Run migrations with 'npx sequelize-cli db:migrate'`);
          throw error; // Stop the backfill - this won't fix itself
        }
        // Check if it's an API rate limit error
        if (error.response?.status === 429 || error.message.includes('rate limit')) {
          console.error(`  ⏳ Rate limited on ${dateStr}, waiting 60s...`);
          await this.delay(60000);
          // Don't increment date, retry this day
          continue;
        }
        // Check if it's a token error
        if (error.response?.status === 190 || error.message.includes('access token')) {
          console.error(`  ❌ TOKEN ERROR on ${dateStr}: ${error.message}`);
          throw error; // Stop - token issues won't fix themselves
        }
        // Other errors - log and continue
        console.error(`  ⚠️ Error on ${dateStr}:`, error.message);
        // Continue - don't stop the whole backfill for one bad day
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Final summary
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║  ✅ BACKFILL COMPLETE                                        ║`);
    console.log(`╠══════════════════════════════════════════════════════════════╣`);
    console.log(`║  Account:     ${adAccountId.padEnd(45)}║`);
    console.log(`║  Days:        ${daysCompleted}/${totalDays} (${Math.round(daysCompleted/totalDays*100)}%)`.padEnd(63) + `║`);
    console.log(`║  Records:     ${totalInsightsSaved.toLocaleString()} insights saved`.padEnd(63) + `║`);
    console.log(`║  Date Range:  ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`.padEnd(63) + `║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

    return { daysCompleted, totalDays, totalInsightsSaved };
  }

  /**
   * Fetch account-level insights broken down by campaign, adset, or ad
   * This gets ALL campaigns/adsets/ads in ONE API call per day
   */
  async fetchAccountLevelInsights(adAccountId, dateStr, accessToken, level) {
    try {
      const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      // Include ad_id and ad_name for ad-level insights
      const fields = level === 'ad'
        ? 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,actions,action_values,cpm,cpc,ctr,frequency,cost_per_action_type'
        : 'campaign_id,campaign_name,adset_id,adset_name,spend,impressions,clicks,reach,actions,action_values,cpm,cpc,ctr,frequency,cost_per_action_type';

      const response = await axios.get(`${this.baseUrl}/${formattedId}/insights`, {
        params: {
          access_token: accessToken,
          fields: fields,
          time_range: JSON.stringify({ since: dateStr, until: dateStr }),
          level: level,
          limit: 500 // Get all campaigns/adsets/ads
        }
      });

      return response.data.data || [];
    } catch (error) {
      if (error.response?.status !== 400) {
        console.error(`  Error fetching ${level} insights:`, error.message);
      }
      return [];
    }
  }

  /**
   * Fetch insights with demographic/geographic breakdown
   */
  async fetchInsightsWithBreakdown(adAccountId, dateStr, accessToken, breakdowns) {
    try {
      const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const response = await axios.get(`${this.baseUrl}/${formattedId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'spend,impressions,clicks,reach,actions,cpm,cpc,ctr',
          time_range: JSON.stringify({ since: dateStr, until: dateStr }),
          breakdowns: breakdowns.join(','),
          limit: 500
        }
      });

      return response.data.data || [];
    } catch (error) {
      // Geographic breakdowns may not be available for all accounts
      return [];
    }
  }

  /**
   * Store a performance snapshot
   */
  async storePerformanceSnapshot(userId, adAccountId, entityType, insight, dateStr) {
    const entityId = entityType === 'campaign' ? insight.campaign_id : insight.adset_id;
    const entityName = entityType === 'campaign' ? insight.campaign_name : insight.adset_name;

    if (!entityId || parseFloat(insight.spend || 0) === 0) return;

    const metrics = this.parseInsights(insight);
    const date = new Date(dateStr);

    await intelModels.IntelPerformanceSnapshot.upsert({
      user_id: userId,
      ad_account_id: adAccountId,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      snapshot_date: date,
      snapshot_hour: 23,
      day_of_week: date.getDay(),
      ...metrics,
      raw_data: insight
    });
  }

  /**
   * Store geographic performance data
   */
  async storeGeoSnapshot(userId, adAccountId, insight, dateStr) {
    if (parseFloat(insight.spend || 0) === 0) return;

    const metrics = this.parseInsights(insight);
    const date = new Date(dateStr);

    await intelModels.IntelPerformanceSnapshot.upsert({
      user_id: userId,
      ad_account_id: adAccountId,
      entity_type: 'geo',
      entity_id: insight.region || 'unknown',
      entity_name: insight.region || 'Unknown Region',
      snapshot_date: date,
      snapshot_hour: 23,
      day_of_week: date.getDay(),
      ...metrics,
      raw_data: insight
    });
  }

  /**
   * Store time-based performance data
   */
  async storeTimeSnapshot(userId, adAccountId, insight, dateStr) {
    if (parseFloat(insight.spend || 0) === 0) return;

    const metrics = this.parseInsights(insight);
    const date = new Date(dateStr);
    const hour = parseInt(insight.hourly_stats_aggregated_by_advertiser_time_zone || 0);

    await intelModels.IntelPerformanceSnapshot.upsert({
      user_id: userId,
      ad_account_id: adAccountId,
      entity_type: 'hourly',
      entity_id: `hour_${hour}`,
      entity_name: `Hour ${hour}:00`,
      snapshot_date: date,
      snapshot_hour: hour,
      day_of_week: date.getDay(),
      ...metrics,
      raw_data: insight
    });
  }

  /**
   * Store demographic (age/gender) performance data
   */
  async storeDemographicSnapshot(userId, adAccountId, insight, dateStr) {
    if (parseFloat(insight.spend || 0) === 0) return;

    const metrics = this.parseInsights(insight);
    const date = new Date(dateStr);
    const age = insight.age || 'unknown';
    const gender = insight.gender || 'unknown';
    const entityId = `${age}_${gender}`;

    await intelModels.IntelPerformanceSnapshot.upsert({
      user_id: userId,
      ad_account_id: adAccountId,
      entity_type: 'age_gender',
      entity_id: entityId,
      entity_name: `${age} ${gender}`,
      snapshot_date: date,
      snapshot_hour: 23,
      day_of_week: date.getDay(),
      age_range: age,
      gender: gender,
      ...metrics,
      raw_data: insight
    });
  }

  /**
   * Store device platform performance data
   */
  async storeDeviceSnapshot(userId, adAccountId, insight, dateStr) {
    if (parseFloat(insight.spend || 0) === 0) return;

    const metrics = this.parseInsights(insight);
    const date = new Date(dateStr);
    const device = insight.device_platform || 'unknown';

    await intelModels.IntelPerformanceSnapshot.upsert({
      user_id: userId,
      ad_account_id: adAccountId,
      entity_type: 'device',
      entity_id: device,
      entity_name: device.charAt(0).toUpperCase() + device.slice(1),
      snapshot_date: date,
      snapshot_hour: 23,
      day_of_week: date.getDay(),
      device_platform: device,
      ...metrics,
      raw_data: insight
    });
  }

  /**
   * Store placement (publisher platform + position) performance data
   */
  async storePlacementSnapshot(userId, adAccountId, insight, dateStr) {
    if (parseFloat(insight.spend || 0) === 0) return;

    const metrics = this.parseInsights(insight);
    const date = new Date(dateStr);
    const platform = insight.publisher_platform || 'unknown';
    const position = insight.platform_position || 'unknown';
    const entityId = `${platform}_${position}`;

    await intelModels.IntelPerformanceSnapshot.upsert({
      user_id: userId,
      ad_account_id: adAccountId,
      entity_type: 'placement',
      entity_id: entityId,
      entity_name: `${platform} - ${position}`,
      snapshot_date: date,
      snapshot_hour: 23,
      day_of_week: date.getDay(),
      publisher_platform: platform,
      platform_position: position,
      ...metrics,
      raw_data: insight
    });
  }

  /**
   * Store ad-level performance snapshot
   */
  async storeAdSnapshot(userId, adAccountId, insight, dateStr) {
    const adId = insight.ad_id;
    const adName = insight.ad_name;

    if (!adId || parseFloat(insight.spend || 0) === 0) return;

    const metrics = this.parseInsights(insight);
    const date = new Date(dateStr);

    await intelModels.IntelPerformanceSnapshot.upsert({
      user_id: userId,
      ad_account_id: adAccountId,
      entity_type: 'ad',
      entity_id: adId,
      entity_name: adName,
      snapshot_date: date,
      snapshot_hour: 23,
      day_of_week: date.getDay(),
      campaign_id: insight.campaign_id,
      adset_id: insight.adset_id,
      ...metrics,
      raw_data: insight
    });
  }

  /**
   * Fetch and store insights for a specific day
   */
  async fetchAndStoreDayInsights(userId, adAccountId, entityType, entity, dateStr, accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/${entity.id}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'spend,impressions,clicks,reach,actions,action_values,cpm,cpc,ctr,frequency',
          time_range: JSON.stringify({
            since: dateStr,
            until: dateStr
          }),
          level: 'account'
        }
      });

      const insights = response.data.data?.[0];
      if (!insights || parseFloat(insights.spend || 0) === 0) {
        return; // No data or no spend for this day
      }

      const metrics = this.parseInsights(insights);
      const date = new Date(dateStr);

      // Check if snapshot already exists
      const existing = await intelModels.IntelPerformanceSnapshot.findOne({
        where: {
          entity_type: entityType,
          entity_id: entity.id,
          snapshot_date: dateStr
        }
      });

      if (existing) {
        return; // Already have data for this day
      }

      await intelModels.IntelPerformanceSnapshot.create({
        user_id: userId,
        ad_account_id: adAccountId,
        entity_type: entityType,
        entity_id: entity.id,
        entity_name: entity.name,
        snapshot_date: dateStr,
        snapshot_hour: 12, // Use noon for daily aggregates
        ...metrics,
        effective_status: entity.effective_status,
        learning_phase: entity.learning_stage_info?.stage || null,
        hour_of_day: 12,
        day_of_week: date.getDay(),
        days_since_creation: this.daysSince(entity.created_time),
        raw_insights: insights
      });

    } catch (error) {
      // Insights might not be available for all entities/dates
      if (error.response?.data?.error?.code === 190) {
        throw error; // Token error - rethrow
      }
      // Otherwise silently skip this entity/date
    }
  }

  /**
   * Helper delay function for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get performance trend for an entity
   */
  async getPerformanceTrend(entityType, entityId, days = 7) {
    const data = await this.getHistoricalData(entityType, entityId, days);

    if (data.length < 2) {
      return { trend: 'insufficient_data', data: [] };
    }

    // Calculate daily aggregates
    const dailyData = {};
    data.forEach(snapshot => {
      const date = snapshot.snapshot_date;
      if (!dailyData[date]) {
        dailyData[date] = {
          spend: 0,
          conversions: 0,
          revenue: 0,
          impressions: 0,
          count: 0
        };
      }
      dailyData[date].spend += snapshot.spend;
      dailyData[date].conversions += snapshot.conversions;
      dailyData[date].revenue += snapshot.revenue;
      dailyData[date].impressions += snapshot.impressions;
      dailyData[date].count++;
    });

    // Calculate trend
    const dates = Object.keys(dailyData).sort();
    const firstDay = dailyData[dates[0]];
    const lastDay = dailyData[dates[dates.length - 1]];

    const spendChange = firstDay.spend > 0
      ? ((lastDay.spend - firstDay.spend) / firstDay.spend * 100)
      : 0;

    const roasFirst = firstDay.spend > 0 ? (firstDay.revenue / firstDay.spend * 100) : 0;
    const roasLast = lastDay.spend > 0 ? (lastDay.revenue / lastDay.spend * 100) : 0;
    const roasChange = roasLast - roasFirst;

    let trend = 'stable';
    if (roasChange > 10) trend = 'improving';
    else if (roasChange < -10) trend = 'declining';

    return {
      trend,
      spend_change: spendChange.toFixed(2),
      roas_change: roasChange.toFixed(2),
      data: dates.map(date => ({
        date,
        ...dailyData[date],
        roas: dailyData[date].spend > 0
          ? (dailyData[date].revenue / dailyData[date].spend * 100).toFixed(2)
          : 0
      }))
    };
  }
}

module.exports = new InsightsCollectorService();
