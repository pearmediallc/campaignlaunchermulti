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

    if (!fbAuth || !fbAuth.accessToken) {
      throw new Error('No valid access token found for user');
    }

    const accessToken = fbAuth.accessToken;

    // Get campaigns for this account
    const campaigns = await this.fetchCampaigns(adAccountId, accessToken);
    console.log(`  Found ${campaigns.length} campaigns`);

    // Get ad sets for this account
    const adSets = await this.fetchAdSets(adAccountId, accessToken);
    console.log(`  Found ${adSets.length} ad sets`);

    // Calculate days to fetch
    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.ceil((endDate - startDate) / dayMs);
    let daysCompleted = 0;

    // Fetch data day by day
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      try {
        // Fetch campaign insights for this day
        for (const campaign of campaigns) {
          await this.fetchAndStoreDayInsights(
            userId,
            adAccountId,
            'campaign',
            campaign,
            dateStr,
            accessToken
          );
        }

        // Fetch ad set insights for this day
        for (const adSet of adSets) {
          await this.fetchAndStoreDayInsights(
            userId,
            adAccountId,
            'adset',
            adSet,
            dateStr,
            accessToken
          );
        }

        daysCompleted++;

        // Report progress
        if (progressCallback) {
          await progressCallback(daysCompleted, dateStr);
        }

        // Rate limiting delay (Facebook allows ~200 calls per hour per user)
        await this.delay(500); // 500ms between days

      } catch (error) {
        console.error(`  Error fetching data for ${dateStr}:`, error.message);
        // Continue to next day on error
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`✅ [Backfill] Complete for account ${adAccountId}: ${daysCompleted} days processed`);
    return { daysCompleted, totalDays };
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
