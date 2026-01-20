const cron = require('node-cron');
const { DateTime } = require('luxon');
const db = require('../models');
const FacebookAPI = require('./facebookApi');

class CampaignSchedulerService {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
    this.isInitialized = false;
    // ⚡ OPTIMIZATION: Campaign status cache to reduce redundant API calls
    // Cache structure: { campaignId: { status: 'ACTIVE'|'PAUSED', timestamp: Date } }
    this.statusCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache TTL
  }

  /**
   * Initialize the scheduler and start cron job
   * Called once when server starts
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️  [SCHEDULER] Already initialized, skipping');
      return;
    }

    console.log('🚀 [SCHEDULER] Initializing campaign scheduler...');

    try {
      // Debug: Check database state at startup
      const allSchedules = await db.CampaignSchedule.findAll({
        attributes: ['id', 'campaign_id', 'campaign_name', 'is_enabled', 'user_id', 'facebook_auth_id']
      });
      console.log(`   🔍 STARTUP DEBUG: Found ${allSchedules.length} schedules in database (enabled + disabled)`);
      allSchedules.forEach(s => {
        console.log(`      - ID:${s.id}, Campaign:${s.campaign_name}, Enabled:${s.is_enabled}, User:${s.user_id}, FBAuth:${s.facebook_auth_id}`);
      });

      // Recover any missed schedules from server downtime
      await this.recoverMissedSchedules();

      // Start cron job that runs every minute
      this.cronJob = cron.schedule('* * * * *', async () => {
        await this.checkSchedules();
      });

      // Also run cleanup job once per day at 2 AM
      cron.schedule('0 2 * * *', async () => {
        await this.cleanupOldLogs();
      });

      this.isInitialized = true;
      console.log('✅ [SCHEDULER] Campaign scheduler initialized successfully');
      console.log('   ⏰ Cron job running every minute');
      console.log('   🗑️  Log cleanup running daily at 2 AM');
    } catch (error) {
      console.error('❌ [SCHEDULER] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Main cron callback - checks and executes due schedules
   */
  async checkSchedules() {
    if (this.isRunning) {
      console.log('⏭️  [SCHEDULER] Previous check still running, skipping this minute');
      return;
    }

    this.isRunning = true;

    try {
      const now = DateTime.utc();
      console.log(`⏰ [SCHEDULER] Checking schedules at ${now.toISO()}`);

      // Find schedules due for START action
      const schedulesToStart = await this.findDueSchedules('start');
      console.log(`   📊 Found ${schedulesToStart.length} campaigns to START`);

      // Find schedules due for PAUSE action
      const schedulesToPause = await this.findDueSchedules('pause');
      console.log(`   📊 Found ${schedulesToPause.length} campaigns to PAUSE`);

      // Execute start actions
      for (const schedule of schedulesToStart) {
        await this.executeScheduledAction(schedule, 'start');
      }

      // Execute pause actions
      for (const schedule of schedulesToPause) {
        await this.executeScheduledAction(schedule, 'pause');
      }

      console.log(`✅ [SCHEDULER] Check complete`);
    } catch (error) {
      console.error('❌ [SCHEDULER] Error during schedule check:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Find schedules that are due for execution
   *
   * OPTIMIZATION: Only returns schedules within a 5-minute window to avoid
   * unnecessary processing of schedules that aren't due yet.
   */
  async findDueSchedules(action) {
    const { Op } = require('sequelize');
    const now = new Date();

    // ⚡ OPTIMIZATION: 5-minute window to reduce unnecessary queries
    // Only process schedules due within current minute ± 5min buffer
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 min ago
    const windowEnd = new Date(now.getTime() + 1 * 60 * 1000);   // 1 min future

    const whereClause = {
      is_enabled: true
    };

    if (action === 'start') {
      whereClause.next_scheduled_start = {
        [Op.and]: [
          { [Op.gte]: windowStart },  // Not older than 5 min ago
          { [Op.lte]: windowEnd },     // Not more than 1 min in future
          { [Op.ne]: null }
        ]
      };
    } else if (action === 'pause') {
      whereClause.next_scheduled_pause = {
        [Op.and]: [
          { [Op.gte]: windowStart },  // Not older than 5 min ago
          { [Op.lte]: windowEnd },     // Not more than 1 min in future
          { [Op.ne]: null }
        ]
      };
    }

    const results = await db.CampaignSchedule.findAll({
      where: whereClause,
      include: [{
        model: db.FacebookAuth,
        as: 'facebookAuth',
        required: true
      }]
    });

    // Minimal debug logging (only when schedules found)
    if (results.length > 0) {
      console.log(`   ✅ Found ${results.length} schedules due for ${action} (window: ${windowStart.toISOString()} to ${windowEnd.toISOString()})`);
    }

    return results;
  }

  /**
   * Execute a scheduled action (start or pause campaign)
   * Force rebuild: 2026-01-14
   *
   * OPTIMIZATION: Uses status cache to skip API calls if campaign is already in target state
   */
  async executeScheduledAction(schedule, action) {
    console.log(`🎬 [SCHEDULER] Executing ${action.toUpperCase()} for campaign: ${schedule.campaign_name} (${schedule.campaign_id})`);

    try {
      const accessToken = schedule.facebookAuth.accessToken;
      const targetStatus = action === 'start' ? 'ACTIVE' : 'PAUSED';

      // ⚡ OPTIMIZATION: Check cache first to avoid unnecessary API calls
      const cached = this.statusCache.get(schedule.campaign_id);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < this.cacheTTL) {
        // Cache is valid
        if (cached.status === targetStatus) {
          console.log(`   ⚡ CACHE HIT: Campaign already ${targetStatus} (cached ${Math.floor((now - cached.timestamp) / 1000)}s ago) - skipping API call`);
          await db.CampaignScheduleLog.createLog(
            schedule.id,
            action,
            'skipped',
            `Campaign already ${targetStatus} (cached)`,
            null
          );
          await this.updateNextExecutionTimes(schedule);
          return;
        } else {
          console.log(`   ⚡ CACHE HIT: Status changed from ${cached.status} to ${targetStatus} - updating via API`);
        }
      } else if (cached) {
        console.log(`   ⏰ Cache expired (${Math.floor((now - cached.timestamp) / 1000)}s old) - refreshing`);
      }

      // Create FacebookAPI instance with access token
      const facebookApi = new FacebookAPI({ accessToken });

      // Execute the action via Facebook API
      console.log(`   📤 API CALL: Calling facebookApi.updateCampaignStatus with status=${targetStatus}`);
      const result = await facebookApi.updateCampaignStatus(
        schedule.campaign_id,
        targetStatus,
        accessToken
      );
      console.log(`   📥 API RESPONSE: Result received:`, JSON.stringify(result));

      if (result.skipped) {
        // Campaign already in target state
        console.log(`   ⏭️  Skipped: ${result.reason}`);
        await db.CampaignScheduleLog.createLog(
          schedule.id,
          action,
          'skipped',
          result.reason,
          null
        );
        // Update cache with current status
        this.statusCache.set(schedule.campaign_id, {
          status: targetStatus,
          timestamp: Date.now()
        });
      } else {
        // Success
        console.log(`   ✅ Successfully ${action === 'start' ? 'started' : 'paused'} campaign`);
        await schedule.recordSuccess(action);
        await db.CampaignScheduleLog.createLog(
          schedule.id,
          action,
          'success',
          null,
          result.data
        );
        // Update cache with new status
        this.statusCache.set(schedule.campaign_id, {
          status: targetStatus,
          timestamp: Date.now()
        });
        console.log(`   💾 Cache updated: ${schedule.campaign_id} → ${targetStatus}`);
      }

      // Calculate and update next execution times
      await this.updateNextExecutionTimes(schedule);

    } catch (error) {
      console.error(`   ❌ Failed to ${action} campaign:`, error.message);

      // Record failure
      await schedule.recordFailure(error);
      await db.CampaignScheduleLog.createLog(
        schedule.id,
        action,
        'failed',
        error.message,
        error.response?.data || null
      );

      // Check if schedule was auto-disabled due to failures
      await schedule.reload();
      if (!schedule.is_enabled) {
        console.log(`   🚨 Schedule auto-disabled after 3 consecutive failures`);
        // TODO: Send email notification to user
      }
    }
  }

  /**
   * Calculate next execution times based on schedule configuration
   */
  async updateNextExecutionTimes(schedule) {
    try {
      const nextStart = this.calculateNextOccurrence(
        schedule.start_time,
        schedule.timezone,
        schedule.days_of_week
      );

      const nextPause = this.calculateNextOccurrence(
        schedule.end_time,
        schedule.timezone,
        schedule.days_of_week
      );

      await schedule.updateNextExecutionTimes(nextStart, nextPause);

      console.log(`   📅 Next start: ${nextStart ? DateTime.fromJSDate(nextStart).toISO() : 'N/A'}`);
      console.log(`   📅 Next pause: ${nextPause ? DateTime.fromJSDate(nextPause).toISO() : 'N/A'}`);
    } catch (error) {
      console.error(`   ❌ Failed to calculate next execution times:`, error.message);
    }
  }

  /**
   * Calculate next occurrence of a time in the schedule
   */
  calculateNextOccurrence(timeString, timezone, daysOfWeek) {
    try {
      // Parse time (HH:MM:SS format from database)
      const [hours, minutes, seconds] = timeString.split(':').map(Number);

      // Start from current time in user's timezone
      let next = DateTime.now().setZone(timezone);

      // Set to the target time today
      next = next.set({ hour: hours, minute: minutes, second: seconds || 0, millisecond: 0 });

      // If this time has already passed today, start from tomorrow
      if (next < DateTime.now().setZone(timezone)) {
        next = next.plus({ days: 1 });
      }

      // Find next valid day of week
      let attempts = 0;
      const maxAttempts = 14; // Search up to 2 weeks ahead

      while (attempts < maxAttempts) {
        const dayName = next.weekdayLong.toLowerCase();

        if (daysOfWeek.includes(dayName)) {
          // Found a valid day, return as UTC Date object
          return next.toUTC().toJSDate();
        }

        // Move to next day
        next = next.plus({ days: 1 });
        attempts++;
      }

      // No valid day found (shouldn't happen unless daysOfWeek is empty)
      console.warn(`⚠️  [SCHEDULER] No valid day found for schedule in next ${maxAttempts} days`);
      return null;
    } catch (error) {
      console.error('❌ [SCHEDULER] Error calculating next occurrence:', error);
      return null;
    }
  }

  /**
   * Recover schedules that should have executed during server downtime
   */
  async recoverMissedSchedules() {
    console.log('🔄 [SCHEDULER] Checking for missed schedules during downtime...');

    try {
      const { Op } = require('sequelize');
      const now = new Date();

      // Find enabled schedules with past due times
      const missedSchedules = await db.CampaignSchedule.findAll({
        where: {
          is_enabled: true,
          [Op.or]: [
            {
              next_scheduled_start: {
                [Op.and]: [
                  { [Op.lt]: now },
                  { [Op.ne]: null }
                ]
              }
            },
            {
              next_scheduled_pause: {
                [Op.and]: [
                  { [Op.lt]: now },
                  { [Op.ne]: null }
                ]
              }
            }
          ]
        },
        include: [{
          model: db.FacebookAuth,
          as: 'facebookAuth',
          required: true
        }]
      });

      if (missedSchedules.length === 0) {
        console.log('   ✅ No missed schedules found');
        return;
      }

      console.log(`   📊 Found ${missedSchedules.length} missed schedules, recovering...`);

      for (const schedule of missedSchedules) {
        // Determine which action was missed
        const missedStart = schedule.next_scheduled_start && schedule.next_scheduled_start < now;
        const missedPause = schedule.next_scheduled_pause && schedule.next_scheduled_pause < now;

        if (missedStart) {
          console.log(`   🔄 Recovering missed START for: ${schedule.campaign_name}`);
          await this.executeScheduledAction(schedule, 'start');
        }

        if (missedPause) {
          console.log(`   🔄 Recovering missed PAUSE for: ${schedule.campaign_name}`);
          await this.executeScheduledAction(schedule, 'pause');
        }
      }

      console.log('✅ [SCHEDULER] Recovery complete');
    } catch (error) {
      console.error('❌ [SCHEDULER] Error during recovery:', error);
    }
  }

  /**
   * Cleanup old logs (keeps last 90 days)
   */
  async cleanupOldLogs() {
    console.log('🗑️  [SCHEDULER] Running log cleanup...');
    try {
      await db.CampaignScheduleLog.cleanupOldLogs(90);
    } catch (error) {
      console.error('❌ [SCHEDULER] Error during log cleanup:', error);
    }
  }

  /**
   * Stop the scheduler (for graceful shutdown)
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 [SCHEDULER] Campaign scheduler stopped');
    }
  }

  /**
   * Calculate and set next execution times for a schedule
   * Used when creating or updating a schedule
   */
  async setInitialExecutionTimes(schedule) {
    const nextStart = this.calculateNextOccurrence(
      schedule.start_time,
      schedule.timezone,
      schedule.days_of_week
    );

    const nextPause = this.calculateNextOccurrence(
      schedule.end_time,
      schedule.timezone,
      schedule.days_of_week
    );

    await schedule.updateNextExecutionTimes(nextStart, nextPause);

    return { nextStart, nextPause };
  }
}

// Export singleton instance
module.exports = new CampaignSchedulerService();
