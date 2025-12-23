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

    // Run initial collection after a short delay
    setTimeout(() => {
      if (process.env.INTEL_RUN_ON_START === 'true') {
        this.runHourlyJobs();
      }
    }, 10000); // 10 second delay to allow server to fully start
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
