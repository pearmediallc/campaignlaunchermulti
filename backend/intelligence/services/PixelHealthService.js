'use strict';

/**
 * PixelHealthService
 *
 * Monitors Facebook pixel health including:
 * - Event Match Quality (EMQ)
 * - Event counts and types
 * - Server-side tracking status
 * - Domain verification
 *
 * ISOLATION PRINCIPLE:
 * - READ-ONLY access to pixel data
 * - Stores data only in intel_pixel_health table
 * - Never modifies pixel configuration
 */

const axios = require('axios');
const intelModels = require('../models');

class PixelHealthService {
  constructor() {
    this.apiVersion = process.env.FB_API_VERSION || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Collect pixel health data for all tracked accounts
   */
  async collectAll() {
    console.log('🎯 [PixelHealth] Starting pixel health collection...');

    try {
      const mainDb = require('../../models');

      // Get unique accounts
      const accounts = await mainDb.CampaignTracking.findAll({
        attributes: ['ad_account_id', 'user_id'],
        group: ['ad_account_id', 'user_id'],
        raw: true
      });

      const results = { success: 0, failed: 0, pixels_found: 0 };

      for (const account of accounts) {
        try {
          const pixelCount = await this.collectForAccount(
            account.user_id,
            account.ad_account_id
          );
          results.pixels_found += pixelCount;
          results.success++;
        } catch (error) {
          console.error(`❌ Error collecting pixel health for ${account.ad_account_id}:`, error.message);
          results.failed++;
        }
      }

      console.log(`✅ [PixelHealth] Complete: ${results.success} accounts, ${results.pixels_found} pixels`);
      return results;

    } catch (error) {
      console.error('❌ [PixelHealth] Fatal error:', error);
      throw error;
    }
  }

  /**
   * Collect pixel health for a specific account
   */
  async collectForAccount(userId, adAccountId) {
    const mainDb = require('../../models');

    // Get access token
    const fbAuth = await mainDb.FacebookAuth.findOne({
      where: { user_id: userId },
      order: [['updated_at', 'DESC']]
    });

    if (!fbAuth || !fbAuth.access_token) {
      throw new Error('No valid access token found');
    }

    const accessToken = fbAuth.accessToken;
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // Fetch pixels for this account
    const pixels = await this.fetchPixels(formattedAccountId, accessToken);

    for (const pixel of pixels) {
      await this.collectPixelHealth(userId, adAccountId, pixel, accessToken);
    }

    return pixels.length;
  }

  /**
   * Fetch pixels for an ad account
   */
  async fetchPixels(adAccountId, accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/${adAccountId}/adspixels`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,is_unavailable,last_fired_time,owner_business'
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching pixels:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Collect health data for a specific pixel
   */
  async collectPixelHealth(userId, adAccountId, pixel, accessToken) {
    try {
      // Fetch pixel stats
      const stats = await this.fetchPixelStats(pixel.id, accessToken);
      const emq = await this.fetchEventMatchQuality(pixel.id, accessToken);

      const now = new Date();
      const snapshotDate = now.toISOString().split('T')[0];

      // Upsert pixel health record
      const [record, created] = await intelModels.IntelPixelHealth.upsert({
        user_id: userId,
        ad_account_id: adAccountId,
        pixel_id: pixel.id,
        pixel_name: pixel.name,
        snapshot_date: snapshotDate,
        event_match_quality: emq?.emq || null,
        last_fired_time: pixel.last_fired_time ? new Date(pixel.last_fired_time) : null,
        is_active: !pixel.is_unavailable,
        page_view_count: stats.page_view || 0,
        view_content_count: stats.view_content || 0,
        add_to_cart_count: stats.add_to_cart || 0,
        initiate_checkout_count: stats.initiate_checkout || 0,
        purchase_count: stats.purchase || 0,
        lead_count: stats.lead || 0,
        complete_registration_count: stats.complete_registration || 0,
        has_server_events: stats.has_server_events || false,
        server_event_percentage: stats.server_percentage || 0,
        domain_verified: emq?.domain_verified || false,
        domain_name: emq?.domain || null,
        raw_pixel_data: { pixel, stats, emq }
      });

      console.log(`  📍 Pixel ${pixel.name}: EMQ=${emq?.emq || 'N/A'}, Events=${stats.total || 0}`);

    } catch (error) {
      console.error(`Error collecting pixel health for ${pixel.id}:`, error.message);
    }
  }

  /**
   * Fetch pixel statistics (event counts)
   */
  async fetchPixelStats(pixelId, accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/${pixelId}/stats`, {
        params: {
          access_token: accessToken,
          aggregation: 'event',
          start_time: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
          end_time: Math.floor(Date.now() / 1000)
        }
      });

      const data = response.data.data || [];
      const stats = {
        page_view: 0,
        view_content: 0,
        add_to_cart: 0,
        initiate_checkout: 0,
        purchase: 0,
        lead: 0,
        complete_registration: 0,
        total: 0,
        has_server_events: false,
        server_percentage: 0
      };

      let browserEvents = 0;
      let serverEvents = 0;

      data.forEach(stat => {
        const event = stat.event?.toLowerCase().replace(/ /g, '_');
        const count = parseInt(stat.count || 0);

        if (stats[event] !== undefined) {
          stats[event] = count;
        }
        stats.total += count;

        // Track event source
        if (stat.source === 'browser') browserEvents += count;
        if (stat.source === 'server') {
          serverEvents += count;
          stats.has_server_events = true;
        }
      });

      const totalEvents = browserEvents + serverEvents;
      if (totalEvents > 0) {
        stats.server_percentage = (serverEvents / totalEvents * 100);
      }

      return stats;
    } catch (error) {
      // Stats might not be available
      return {
        page_view: 0,
        view_content: 0,
        add_to_cart: 0,
        initiate_checkout: 0,
        purchase: 0,
        lead: 0,
        complete_registration: 0,
        total: 0,
        has_server_events: false,
        server_percentage: 0
      };
    }
  }

  /**
   * Fetch Event Match Quality (EMQ)
   */
  async fetchEventMatchQuality(pixelId, accessToken) {
    try {
      // EMQ is available through signal_diagnostics endpoint
      const response = await axios.get(`${this.baseUrl}/${pixelId}`, {
        params: {
          access_token: accessToken,
          fields: 'event_stats,data_use_setting,first_party_cookie_status'
        }
      });

      const data = response.data;

      // Parse EMQ from event_stats if available
      let emq = null;
      if (data.event_stats) {
        // EMQ is typically returned per event type
        // We'll use the average or the purchase event EMQ
        const purchaseStats = data.event_stats.find(e => e.event === 'Purchase');
        if (purchaseStats && purchaseStats.match_quality_score) {
          emq = purchaseStats.match_quality_score;
        }
      }

      return {
        emq,
        domain_verified: data.first_party_cookie_status === 'verified',
        domain: data.data_use_setting?.domain || null
      };
    } catch (error) {
      // EMQ might require additional permissions
      return null;
    }
  }

  /**
   * Get pixel health summary for a user
   */
  async getHealthSummary(userId) {
    const latestPixels = await intelModels.IntelPixelHealth.getLatestForUser(userId);

    if (latestPixels.length === 0) {
      return { pixels: [], summary: null };
    }

    const summary = {
      total_pixels: latestPixels.length,
      active_pixels: latestPixels.filter(p => p.is_active).length,
      avg_emq: null,
      pixels_with_server_events: 0,
      total_purchases: 0,
      avg_funnel_conversion: 0
    };

    let emqSum = 0;
    let emqCount = 0;

    latestPixels.forEach(pixel => {
      if (pixel.event_match_quality) {
        emqSum += pixel.event_match_quality;
        emqCount++;
      }
      if (pixel.has_server_events) {
        summary.pixels_with_server_events++;
      }
      summary.total_purchases += pixel.purchase_count;
    });

    if (emqCount > 0) {
      summary.avg_emq = (emqSum / emqCount).toFixed(1);
    }

    return {
      pixels: latestPixels.map(p => ({
        id: p.pixel_id,
        name: p.pixel_name,
        health_score: p.calculateHealthScore(),
        emq: p.event_match_quality,
        is_active: p.is_active,
        has_server_events: p.has_server_events,
        funnel: p.getFunnelRates()
      })),
      summary
    };
  }

  /**
   * Get pixel health trends
   */
  async getPixelTrends(pixelId, days = 30) {
    const history = await intelModels.IntelPixelHealth.getPixelHistory(pixelId, days);

    if (history.length === 0) {
      return { trend: 'no_data', data: [] };
    }

    // Analyze EMQ trend
    const emqValues = history.filter(h => h.event_match_quality !== null);
    let emqTrend = 'stable';

    if (emqValues.length >= 2) {
      const firstEmq = emqValues[0].event_match_quality;
      const lastEmq = emqValues[emqValues.length - 1].event_match_quality;
      const change = lastEmq - firstEmq;

      if (change > 0.5) emqTrend = 'improving';
      else if (change < -0.5) emqTrend = 'declining';
    }

    // Analyze event volume trend
    const purchaseValues = history.map(h => h.purchase_count);
    const avgFirst = purchaseValues.slice(0, Math.ceil(purchaseValues.length / 2))
      .reduce((a, b) => a + b, 0) / Math.ceil(purchaseValues.length / 2);
    const avgLast = purchaseValues.slice(Math.ceil(purchaseValues.length / 2))
      .reduce((a, b) => a + b, 0) / Math.floor(purchaseValues.length / 2);

    let volumeTrend = 'stable';
    if (avgFirst > 0) {
      const volumeChange = ((avgLast - avgFirst) / avgFirst) * 100;
      if (volumeChange > 20) volumeTrend = 'increasing';
      else if (volumeChange < -20) volumeTrend = 'decreasing';
    }

    return {
      emq_trend: emqTrend,
      volume_trend: volumeTrend,
      data: history.map(h => ({
        date: h.snapshot_date,
        emq: h.event_match_quality,
        purchases: h.purchase_count,
        health_score: h.calculateHealthScore()
      }))
    };
  }

  /**
   * Backfill pixel health history for an account
   */
  async backfillAccount(userId, adAccountId, options = {}) {
    const {
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = options;

    console.log(`🎯 [PixelBackfill] Starting for account ${adAccountId}`);

    const mainDb = require('../../models');

    // Get access token
    const fbAuth = await mainDb.FacebookAuth.findOne({
      where: { user_id: userId },
      order: [['updated_at', 'DESC']]
    });

    if (!fbAuth || !fbAuth.access_token) {
      throw new Error('No valid access token found');
    }

    const accessToken = fbAuth.accessToken;
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // Fetch pixels for this account
    const pixels = await this.fetchPixels(formattedAccountId, accessToken);
    console.log(`  Found ${pixels.length} pixels`);

    // For each pixel, fetch historical stats
    for (const pixel of pixels) {
      await this.backfillPixelHistory(userId, adAccountId, pixel, accessToken, startDate, endDate);
    }

    console.log(`✅ [PixelBackfill] Complete for account ${adAccountId}`);
    return { pixels_processed: pixels.length };
  }

  /**
   * Backfill history for a single pixel
   */
  async backfillPixelHistory(userId, adAccountId, pixel, accessToken, startDate, endDate) {
    try {
      // Fetch historical pixel stats
      const response = await axios.get(`${this.baseUrl}/${pixel.id}/stats`, {
        params: {
          access_token: accessToken,
          aggregation: 'day',
          start_time: Math.floor(startDate.getTime() / 1000),
          end_time: Math.floor(endDate.getTime() / 1000)
        }
      });

      const dailyStats = response.data.data || [];

      // Group by date
      const dateGroups = {};
      dailyStats.forEach(stat => {
        const date = stat.timestamp ? new Date(stat.timestamp * 1000).toISOString().split('T')[0] : null;
        if (!date) return;

        if (!dateGroups[date]) {
          dateGroups[date] = {
            page_view: 0,
            view_content: 0,
            add_to_cart: 0,
            initiate_checkout: 0,
            purchase: 0,
            lead: 0,
            complete_registration: 0,
            total: 0
          };
        }

        const event = stat.event?.toLowerCase().replace(/ /g, '_');
        const count = parseInt(stat.count || 0);

        if (dateGroups[date][event] !== undefined) {
          dateGroups[date][event] = count;
        }
        dateGroups[date].total += count;
      });

      // Store each date's data
      for (const [date, stats] of Object.entries(dateGroups)) {
        // Check if already exists
        const existing = await intelModels.IntelPixelHealth.findOne({
          where: {
            pixel_id: pixel.id,
            snapshot_date: date
          }
        });

        if (existing) continue;

        await intelModels.IntelPixelHealth.create({
          user_id: userId,
          ad_account_id: adAccountId,
          pixel_id: pixel.id,
          pixel_name: pixel.name,
          snapshot_date: date,
          is_active: !pixel.is_unavailable,
          page_view_count: stats.page_view,
          view_content_count: stats.view_content,
          add_to_cart_count: stats.add_to_cart,
          initiate_checkout_count: stats.initiate_checkout,
          purchase_count: stats.purchase,
          lead_count: stats.lead,
          complete_registration_count: stats.complete_registration
        });
      }

    } catch (error) {
      console.error(`  Error backfilling pixel ${pixel.id}:`, error.message);
    }
  }

  /**
   * Get recommendations for improving pixel health
   */
  getRecommendations(pixelData) {
    const recommendations = [];

    if (!pixelData.is_active) {
      recommendations.push({
        priority: 'critical',
        category: 'activity',
        message: 'Pixel is inactive. Check pixel installation on your website.'
      });
    }

    if (pixelData.event_match_quality !== null && pixelData.event_match_quality < 6) {
      recommendations.push({
        priority: 'high',
        category: 'emq',
        message: `EMQ score is ${pixelData.event_match_quality}. Improve by implementing Conversions API (CAPI) and passing more customer information parameters.`
      });
    }

    if (!pixelData.has_server_events) {
      recommendations.push({
        priority: 'high',
        category: 'capi',
        message: 'Conversions API is not configured. Implementing server-side tracking can improve EMQ by 20-30%.'
      });
    }

    if (!pixelData.domain_verified) {
      recommendations.push({
        priority: 'medium',
        category: 'domain',
        message: 'Domain is not verified. Verify your domain in Business Manager for better attribution.'
      });
    }

    const funnel = pixelData.getFunnelRates ? pixelData.getFunnelRates() : null;
    if (funnel && funnel.checkout_to_purchase < 20) {
      recommendations.push({
        priority: 'medium',
        category: 'funnel',
        message: `Low checkout-to-purchase rate (${funnel.checkout_to_purchase}%). Investigate checkout drop-offs.`
      });
    }

    return recommendations;
  }
}

module.exports = new PixelHealthService();
