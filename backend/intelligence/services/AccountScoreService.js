'use strict';

/**
 * AccountScoreService
 *
 * Calculates and tracks account health scores with component breakdowns.
 * Provides insights into overall account performance and optimization opportunities.
 *
 * ISOLATION PRINCIPLE:
 * - Reads performance data from intel_* tables
 * - Stores scores in intel_account_scores
 * - Never modifies account configuration
 */

const intelModels = require('../models');
const InsightsCollectorService = require('./InsightsCollectorService');
const PixelHealthService = require('./PixelHealthService');

class AccountScoreService {
  constructor() {
    this.calculationInProgress = false;
  }

  /**
   * Calculate scores for all tracked accounts
   * Uses accounts from completed backfills + performance snapshots
   * OPTIMIZED: Uses batch processing to prevent connection exhaustion
   */
  async calculateAllScores() {
    if (this.calculationInProgress) {
      console.log('⏳ Score calculation already in progress, skipping...');
      return { success: 0, failed: 0, skipped: true };
    }

    this.calculationInProgress = true;
    console.log('📊 [AccountScore] Starting score calculation...');

    try {
      // Get unique user-account combinations using efficient raw SQL
      // This avoids loading full records into memory
      const accountsQuery = await intelModels.sequelize.query(`
        SELECT DISTINCT user_id, ad_account_id
        FROM (
          SELECT user_id, ad_account_id FROM intel_backfill_progress WHERE status = 'completed'
          UNION
          SELECT user_id, ad_account_id FROM intel_performance_snapshots
        ) AS combined_accounts
        ORDER BY user_id, ad_account_id
      `, {
        type: intelModels.sequelize.QueryTypes.SELECT
      });

      const accounts = accountsQuery;
      console.log(`  Total unique accounts to score: ${accounts.length}`);

      if (accounts.length === 0) {
        console.log('  No accounts found to score');
        return { success: 0, failed: 0 };
      }

      const results = { success: 0, failed: 0, total: accounts.length };
      const BATCH_SIZE = 25; // Process 25 accounts at a time to prevent connection exhaustion
      const BATCH_DELAY = 2000; // 2 second delay between batches

      // Process in batches
      for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
        const batch = accounts.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(accounts.length / BATCH_SIZE);

        console.log(`  📊 Processing batch ${batchNum}/${totalBatches} (${batch.length} accounts)`);

        // Process batch with Promise.allSettled to handle individual failures gracefully
        const batchResults = await Promise.allSettled(
          batch.map(account =>
            this.calculateScoreForAccount(account.user_id, account.ad_account_id)
              .catch(err => {
                // Re-throw with account info for better error reporting
                throw new Error(`${account.ad_account_id}: ${err.message}`);
              })
          )
        );

        // Count results
        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            results.success++;
          } else {
            results.failed++;
            console.error(`  ❌ ${batch[idx].ad_account_id}: ${result.reason?.message || 'Unknown error'}`);
          }
        });

        // Progress log
        console.log(`  📊 Progress: ${results.success + results.failed}/${accounts.length} (${results.success} success, ${results.failed} failed)`);

        // Delay between batches to let connections return to pool
        if (i + BATCH_SIZE < accounts.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      console.log(`✅ [AccountScore] Complete: ${results.success} success, ${results.failed} failed out of ${results.total}`);
      return results;

    } finally {
      this.calculationInProgress = false;
    }
  }

  /**
   * Calculate score for a specific account
   */
  async calculateScoreForAccount(userId, adAccountId) {
    // Gather all data needed for scoring
    const [performanceData, pixelHealth, learningStats, historicalData] = await Promise.all([
      this.getPerformanceMetrics(userId, adAccountId),
      this.getPixelHealthData(userId, adAccountId),
      this.getLearningPhaseStats(userId, adAccountId),
      this.getHistoricalData(userId, adAccountId)
    ]);

    // Calculate the score
    const score = await intelModels.IntelAccountScore.calculateScore({
      userId,
      adAccountId,
      performanceMetrics: performanceData,
      pixelHealth,
      learningPhaseStats: learningStats,
      historicalData
    });

    // Check for significant score changes
    const previousScore = await this.getPreviousScore(userId, adAccountId);
    if (previousScore && Math.abs(score.overall_score - previousScore.overall_score) > 10) {
      await this.notifyScoreChange(userId, adAccountId, previousScore.overall_score, score);
    }

    return score;
  }

  /**
   * Get performance metrics for scoring
   */
  async getPerformanceMetrics(userId, adAccountId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshots = await intelModels.IntelPerformanceSnapshot.findAll({
      where: {
        user_id: userId,
        ad_account_id: adAccountId,
        entity_type: 'adset',
        snapshot_date: {
          [intelModels.Sequelize.Op.gte]: thirtyDaysAgo.toISOString().split('T')[0]
        }
      }
    });

    if (snapshots.length === 0) {
      return null;
    }

    // Aggregate metrics
    let totalSpend = 0;
    let totalRevenue = 0;
    let totalConversions = 0;
    let wastedSpend = 0; // Spend with no conversions

    const daily = {};

    snapshots.forEach(s => {
      totalSpend += s.spend;
      totalRevenue += s.revenue;
      totalConversions += s.conversions;

      if (s.conversions === 0 && s.spend > 0) {
        wastedSpend += s.spend;
      }

      // Daily aggregation for trend analysis
      if (!daily[s.snapshot_date]) {
        daily[s.snapshot_date] = { spend: 0, revenue: 0, conversions: 0 };
      }
      daily[s.snapshot_date].spend += s.spend;
      daily[s.snapshot_date].revenue += s.revenue;
      daily[s.snapshot_date].conversions += s.conversions;
    });

    // Calculate CPA trend
    const dates = Object.keys(daily).sort();
    let cpaTrend = 'stable';

    if (dates.length >= 7) {
      const firstWeekCPA = this.calculatePeriodCPA(daily, dates.slice(0, 7));
      const lastWeekCPA = this.calculatePeriodCPA(daily, dates.slice(-7));

      if (firstWeekCPA > 0 && lastWeekCPA > 0) {
        const change = ((lastWeekCPA - firstWeekCPA) / firstWeekCPA) * 100;
        if (change < -10) cpaTrend = 'decreasing';
        else if (change > 10) cpaTrend = 'increasing';
      }
    }

    return {
      total_spend: totalSpend,
      total_revenue: totalRevenue,
      total_conversions: totalConversions,
      roas: totalSpend > 0 ? (totalRevenue / totalSpend * 100) : 0,
      cpa: totalConversions > 0 ? (totalSpend / totalConversions) : 0,
      waste_percentage: totalSpend > 0 ? (wastedSpend / totalSpend * 100) : 0,
      cpa_trend: cpaTrend
    };
  }

  /**
   * Calculate CPA for a period
   */
  calculatePeriodCPA(daily, dates) {
    let spend = 0;
    let conversions = 0;

    dates.forEach(date => {
      if (daily[date]) {
        spend += daily[date].spend;
        conversions += daily[date].conversions;
      }
    });

    return conversions > 0 ? (spend / conversions) : 0;
  }

  /**
   * Get pixel health data for scoring
   */
  async getPixelHealthData(userId, adAccountId) {
    const latestPixel = await intelModels.IntelPixelHealth.findOne({
      where: {
        user_id: userId,
        ad_account_id: adAccountId
      },
      order: [['snapshot_date', 'DESC']]
    });

    return latestPixel;
  }

  /**
   * Get learning phase statistics
   */
  async getLearningPhaseStats(userId, adAccountId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshots = await intelModels.IntelPerformanceSnapshot.findAll({
      where: {
        user_id: userId,
        ad_account_id: adAccountId,
        entity_type: 'adset',
        snapshot_date: {
          [intelModels.Sequelize.Op.gte]: sevenDaysAgo.toISOString().split('T')[0]
        }
      },
      attributes: ['entity_id', 'learning_phase'],
      group: ['entity_id', 'learning_phase'],
      raw: true
    });

    // Count learning phase statuses
    const statusCounts = {
      LEARNING: 0,
      LEARNING_LIMITED: 0,
      SUCCESS: 0,
      UNKNOWN: 0
    };

    const uniqueAdSets = new Set();
    snapshots.forEach(s => {
      uniqueAdSets.add(s.entity_id);
      const status = s.learning_phase || 'UNKNOWN';
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    const total = uniqueAdSets.size;
    const successRate = total > 0 ? (statusCounts.SUCCESS / total * 100) : 50;

    return {
      total_adsets: total,
      learning: statusCounts.LEARNING,
      learning_limited: statusCounts.LEARNING_LIMITED,
      success: statusCounts.SUCCESS,
      success_rate: successRate
    };
  }

  /**
   * Get historical data for consistency scoring
   */
  async getHistoricalData(userId, adAccountId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyData = await intelModels.IntelPerformanceSnapshot.findAll({
      where: {
        user_id: userId,
        ad_account_id: adAccountId,
        entity_type: 'adset',
        snapshot_date: {
          [intelModels.Sequelize.Op.gte]: thirtyDaysAgo.toISOString().split('T')[0]
        }
      },
      attributes: [
        'snapshot_date',
        [intelModels.sequelize.fn('SUM', intelModels.sequelize.col('spend')), 'total_spend'],
        [intelModels.sequelize.fn('SUM', intelModels.sequelize.col('revenue')), 'total_revenue']
      ],
      group: ['snapshot_date'],
      order: [['snapshot_date', 'ASC']],
      raw: true
    });

    return dailyData.map(d => ({
      date: d.snapshot_date,
      spend: parseFloat(d.total_spend) || 0,
      revenue: parseFloat(d.total_revenue) || 0,
      roas: parseFloat(d.total_spend) > 0
        ? (parseFloat(d.total_revenue) / parseFloat(d.total_spend) * 100)
        : 0
    }));
  }

  /**
   * Get previous day's score
   */
  async getPreviousScore(userId, adAccountId) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return intelModels.IntelAccountScore.findOne({
      where: {
        user_id: userId,
        ad_account_id: adAccountId,
        score_date: yesterday.toISOString().split('T')[0]
      }
    });
  }

  /**
   * Notify user of significant score change
   */
  async notifyScoreChange(userId, adAccountId, previousScore, newScore) {
    await intelModels.IntelNotification.createScoreChange(userId, {
      adAccountId,
      previousScore,
      newScore: newScore.overall_score,
      trend: newScore.score_trend
    });
  }

  /**
   * Get score dashboard data for a user
   * OPTIMIZED: Limits account data and defers trend loading
   */
  async getDashboardData(userId) {
    // Get account scores with pagination (limit to top 50 for dashboard)
    const rankings = await intelModels.IntelAccountScore.getAccountRankings(userId);

    if (rankings.length === 0) {
      return {
        hasData: false,
        message: 'No account scores calculated yet. Scores are updated daily.'
      };
    }

    // Calculate aggregate statistics
    const totalScore = rankings.reduce((sum, r) => sum + r.overall_score, 0);
    const avgScore = Math.round(totalScore / rankings.length);

    // Get trend data only for top 10 accounts (to reduce DB load)
    // Full trends available via getAccountDetail endpoint
    const topAccounts = rankings.slice(0, 10);
    const trendData = {};

    // Fetch trends in parallel for efficiency
    const trendPromises = topAccounts.map(async (account) => {
      try {
        const history = await intelModels.IntelAccountScore.getScoreHistory(
          userId,
          account.ad_account_id,
          7 // 1 week of data (reduced from 14)
        );
        return {
          accountId: account.ad_account_id,
          history: history.map(h => ({
            date: h.score_date,
            score: h.overall_score
          }))
        };
      } catch (err) {
        console.error(`Failed to get trend for ${account.ad_account_id}:`, err.message);
        return { accountId: account.ad_account_id, history: [] };
      }
    });

    const trendResults = await Promise.all(trendPromises);
    trendResults.forEach(r => {
      trendData[r.accountId] = r.history;
    });

    // Limit accounts returned to 50 for dashboard view
    const accountsToReturn = rankings.slice(0, 50);

    return {
      hasData: true,
      summary: {
        total_accounts: rankings.length,
        average_score: avgScore,
        best_account: rankings[0] ? {
          id: rankings[0].ad_account_id,
          score: rankings[0].overall_score,
          grade: rankings[0].getGrade()
        } : null,
        worst_account: rankings[rankings.length - 1] ? {
          id: rankings[rankings.length - 1].ad_account_id,
          score: rankings[rankings.length - 1].overall_score,
          grade: rankings[rankings.length - 1].getGrade()
        } : null
      },
      accounts: accountsToReturn.map(r => ({
        ad_account_id: r.ad_account_id,
        overall_score: r.overall_score,
        grade: r.getGrade(),
        status: r.getStatusLabel(),
        trend: r.score_trend,
        trend_percentage: r.trend_percentage,
        components: {
          performance: r.performance_score,
          efficiency: r.efficiency_score,
          pixel_health: r.pixel_health_score,
          learning: r.learning_score,
          consistency: r.consistency_score
        },
        improvement_priority: r.getImprovementPriority(),
        recommendations: r.recommendations
      })),
      trends: trendData,
      total_available: rankings.length,
      showing: accountsToReturn.length
    };
  }

  /**
   * Get detailed score breakdown for an account
   */
  async getAccountDetail(userId, adAccountId) {
    const score = await intelModels.IntelAccountScore.getLatestScore(userId, adAccountId);

    if (!score) {
      return { hasData: false };
    }

    const history = await intelModels.IntelAccountScore.getScoreHistory(userId, adAccountId, 30);

    return {
      hasData: true,
      current: {
        date: score.score_date,
        overall_score: score.overall_score,
        grade: score.getGrade(),
        status: score.getStatusLabel(),
        trend: score.score_trend,
        trend_percentage: score.trend_percentage,
        components: {
          performance: {
            score: score.performance_score,
            weight: '35%',
            description: 'Based on ROAS, CPA trends'
          },
          efficiency: {
            score: score.efficiency_score,
            weight: '25%',
            description: 'Based on spend efficiency, waste reduction'
          },
          pixel_health: {
            score: score.pixel_health_score,
            weight: '15%',
            description: 'Based on pixel event quality'
          },
          learning: {
            score: score.learning_score,
            weight: '15%',
            description: 'Based on learning phase success rate'
          },
          consistency: {
            score: score.consistency_score,
            weight: '10%',
            description: 'Based on performance consistency over time'
          }
        },
        recommendations: score.recommendations
      },
      history: history.map(h => ({
        date: h.score_date,
        score: h.overall_score,
        trend: h.score_trend
      }))
    };
  }
}

module.exports = new AccountScoreService();
