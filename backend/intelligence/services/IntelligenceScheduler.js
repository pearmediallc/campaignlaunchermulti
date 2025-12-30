'use strict';

/**
 * IntelligenceScheduler
 *
 * Orchestrates all intelligence jobs on scheduled intervals.
 * Runs hourly data collection and periodic analysis.
 *
 * ISOLATION PRINCIPLE:
 * - Only coordinates intelligence services
 * - All services read from/write to intel_* tables
 * - Never touches campaign management code
 */

const InsightsCollectorService = require('./InsightsCollectorService');
const PixelHealthService = require('./PixelHealthService');
const AutomationRulesEngine = require('./AutomationRulesEngine');
const AccountScoreService = require('./AccountScoreService');
const PatternLearningService = require('./PatternLearningService');
const NotificationService = require('./NotificationService');

class IntelligenceScheduler {
  constructor() {
    this.intervals = {};
    this.isRunning = false;
    this.lastRuns = {};
    this.enabled = process.env.ENABLE_INTELLIGENCE === 'true';
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (!this.enabled) {
      console.log('⚠️ [IntelligenceScheduler] DISABLED - set ENABLE_INTELLIGENCE=true to enable');
      return;
    }

    if (this.isRunning) {
      console.log('⚠️ [IntelligenceScheduler] Already running');
      return;
    }

    console.log('🚀 [IntelligenceScheduler] Starting intelligence jobs...');
    this.isRunning = true;

    // Schedule jobs based on environment configuration
    this.scheduleHourlyJobs();
    this.scheduleDailyJobs();

    // Auto-resume incomplete backfills after server restart
    // Delay significantly to allow server to handle initial API requests first
    setTimeout(() => {
      this.resumeIncompleteBackfills();
    }, 120000); // 2 minute delay to allow DB connections and API requests to stabilize

    // Run initial collection after a short delay
    setTimeout(() => {
      if (process.env.INTEL_RUN_ON_START === 'true') {
        this.runHourlyJobs();
      }
    }, 10000); // 10 second delay to allow server to fully start
  }

  /**
   * Auto-resume incomplete backfills on server restart
   * This ensures backfills continue even after server crashes/restarts
   */
  async resumeIncompleteBackfills() {
    try {
      const intelModels = require('../models');

      // Find all incomplete backfills
      const incompleteBackfills = await intelModels.IntelBackfillProgress.findAll({
        where: {
          status: 'in_progress'
        }
      });

      if (incompleteBackfills.length === 0) {
        console.log('🔄 [IntelligenceScheduler] No incomplete backfills to resume');
        return;
      }

      console.log(`🔄 [IntelligenceScheduler] Found ${incompleteBackfills.length} incomplete backfills to resume`);

      // Resume each backfill one at a time to avoid memory issues
      for (const record of incompleteBackfills) {
        const adAccountId = record.ad_account_id;
        const daysCompleted = record.days_completed || 0;
        const totalDays = record.total_days || 90;
        const userId = record.user_id;

        console.log(`  🔄 Resuming backfill for ${adAccountId} from day ${daysCompleted}/${totalDays}`);

        // Calculate date range from the original backfill
        const endDate = record.end_date ? new Date(record.end_date) : new Date();
        const startDate = record.start_date ? new Date(record.start_date) : new Date(endDate - totalDays * 24 * 60 * 60 * 1000);

        // Resume backfill in background with delay between accounts
        this.scheduleBackfillResume(userId, adAccountId, record, startDate, endDate, daysCompleted);

        // Wait 60 seconds between starting each backfill to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    } catch (error) {
      console.error('❌ [IntelligenceScheduler] Error resuming backfills:', error.message);
    }
  }

  /**
   * Schedule a backfill resume with memory management
   */
  scheduleBackfillResume(userId, adAccountId, record, startDate, endDate, daysCompleted) {
    setImmediate(async () => {
      try {
        const type = record.backfill_type || 'all';

        if (type === 'all' || type === 'insights') {
          await InsightsCollectorService.backfillAccount(userId, adAccountId, {
            startDate,
            endDate,
            startFromDay: daysCompleted,
            progressCallback: async (day, current) => {
              await record.updateProgress(day, current);
              // Force garbage collection periodically if available
              if (global.gc && day % 10 === 0) {
                global.gc();
              }
            }
          });
        }

        if (type === 'all' || type === 'pixel') {
          await PixelHealthService.backfillAccount(userId, adAccountId, {
            startDate,
            endDate
          });
        }

        await record.update({
          status: 'completed',
          completed_at: new Date(),
          days_completed: record.total_days
        });

        console.log(`✅ [IntelligenceScheduler] Backfill completed for ${adAccountId}`);

        // Trigger pattern learning after completion
        try {
          await PatternLearningService.learnAllPatterns();
          await AccountScoreService.calculateAllScores();
        } catch (learningError) {
          console.error('⚠️ [IntelligenceScheduler] Auto-learning after resume failed:', learningError.message);
        }
      } catch (error) {
        console.error(`❌ [IntelligenceScheduler] Resume error for ${adAccountId}:`, error.message);
        await record.markFailed(error.message);
      }
    });
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('🛑 [IntelligenceScheduler] Stopping intelligence jobs...');

    Object.values(this.intervals).forEach(interval => {
      clearInterval(interval);
    });

    this.intervals = {};
    this.isRunning = false;
  }

  /**
   * Schedule hourly jobs
   */
  scheduleHourlyJobs() {
    const intervalMs = parseInt(process.env.INTEL_COLLECTION_INTERVAL_MS) || 3600000; // 1 hour default

    console.log(`  📅 Scheduling hourly jobs every ${intervalMs / 1000 / 60} minutes`);

    this.intervals.hourly = setInterval(() => {
      this.runHourlyJobs();
    }, intervalMs);
  }

  /**
   * Schedule daily jobs
   */
  scheduleDailyJobs() {
    const intervalMs = 86400000; // 24 hours

    console.log('  📅 Scheduling daily jobs every 24 hours');

    this.intervals.daily = setInterval(() => {
      this.runDailyJobs();
    }, intervalMs);

    // Also run daily jobs at midnight
    this.scheduleAtMidnight();
  }

  /**
   * Schedule a job to run at midnight
   */
  scheduleAtMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight - now;

    setTimeout(() => {
      this.runDailyJobs();
      // Reschedule for next midnight
      this.scheduleAtMidnight();
    }, msUntilMidnight);
  }

  /**
   * Run hourly jobs
   */
  async runHourlyJobs() {
    if (!this.enabled) return;

    console.log('⏰ [IntelligenceScheduler] Running hourly jobs...');
    const startTime = Date.now();

    try {
      // 1. Collect performance insights
      if (process.env.INTEL_ENABLE_INSIGHTS !== 'false') {
        console.log('  📊 Collecting insights...');
        await InsightsCollectorService.collectAll();
        this.lastRuns.insights = new Date();
      }

      // 2. Collect pixel health data
      if (process.env.INTEL_ENABLE_PIXEL_HEALTH !== 'false') {
        console.log('  🎯 Collecting pixel health...');
        await PixelHealthService.collectAll();
        this.lastRuns.pixelHealth = new Date();
      }

      // 3. Evaluate automation rules
      if (process.env.INTEL_ENABLE_RULES !== 'false') {
        console.log('  ⚡ Evaluating automation rules...');
        await AutomationRulesEngine.evaluateAllRules();
        this.lastRuns.rules = new Date();
      }

      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ [IntelligenceScheduler] Hourly jobs completed in ${duration.toFixed(2)}s`);

    } catch (error) {
      console.error('❌ [IntelligenceScheduler] Error in hourly jobs:', error);
    }
  }

  /**
   * Run daily jobs
   */
  async runDailyJobs() {
    if (!this.enabled) return;

    console.log('📅 [IntelligenceScheduler] Running daily jobs...');
    const startTime = Date.now();

    try {
      // 1. Calculate account scores
      if (process.env.INTEL_ENABLE_SCORES !== 'false') {
        console.log('  📊 Calculating account scores...');
        await AccountScoreService.calculateAllScores();
        this.lastRuns.scores = new Date();
      }

      // 2. Learn patterns
      if (process.env.INTEL_ENABLE_LEARNING !== 'false') {
        console.log('  🧠 Learning patterns...');
        await PatternLearningService.learnAllPatterns();
        this.lastRuns.patterns = new Date();
      }

      // 3. Clean up old notifications
      console.log('  🧹 Cleaning up old notifications...');
      await NotificationService.cleanup();
      this.lastRuns.cleanup = new Date();

      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ [IntelligenceScheduler] Daily jobs completed in ${duration.toFixed(2)}s`);

    } catch (error) {
      console.error('❌ [IntelligenceScheduler] Error in daily jobs:', error);
    }
  }

  /**
   * Run a specific job manually
   */
  async runJob(jobName) {
    if (!this.enabled) {
      throw new Error('Intelligence module is disabled');
    }

    console.log(`🔧 [IntelligenceScheduler] Manually running job: ${jobName}`);

    switch (jobName) {
      case 'insights':
        return InsightsCollectorService.collectAll();
      case 'pixelHealth':
        return PixelHealthService.collectAll();
      case 'rules':
        return AutomationRulesEngine.evaluateAllRules();
      case 'scores':
        return AccountScoreService.calculateAllScores();
      case 'patterns':
        return PatternLearningService.learnAllPatterns();
      case 'cleanup':
        return NotificationService.cleanup();
      case 'hourly':
        return this.runHourlyJobs();
      case 'daily':
        return this.runDailyJobs();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      running: this.isRunning,
      jobs: {
        hourly: {
          interval_ms: parseInt(process.env.INTEL_COLLECTION_INTERVAL_MS) || 3600000,
          last_run: this.lastRuns.insights || null,
          services: {
            insights: process.env.INTEL_ENABLE_INSIGHTS !== 'false',
            pixel_health: process.env.INTEL_ENABLE_PIXEL_HEALTH !== 'false',
            rules: process.env.INTEL_ENABLE_RULES !== 'false'
          }
        },
        daily: {
          interval_ms: 86400000,
          last_run: this.lastRuns.scores || null,
          services: {
            scores: process.env.INTEL_ENABLE_SCORES !== 'false',
            patterns: process.env.INTEL_ENABLE_LEARNING !== 'false'
          }
        }
      },
      last_runs: this.lastRuns
    };
  }

  /**
   * Get health check
   */
  async healthCheck() {
    const intelModels = require('../models');
    const dbHealth = await intelModels.healthCheck();

    return {
      scheduler: {
        enabled: this.enabled,
        running: this.isRunning,
        last_hourly: this.lastRuns.insights || 'never',
        last_daily: this.lastRuns.scores || 'never'
      },
      database: dbHealth,
      services: {
        insights: 'available',
        pixel_health: 'available',
        rules: 'available',
        scores: 'available',
        patterns: 'available',
        notifications: 'available'
      }
    };
  }
}

// Singleton instance
const scheduler = new IntelligenceScheduler();

module.exports = scheduler;
