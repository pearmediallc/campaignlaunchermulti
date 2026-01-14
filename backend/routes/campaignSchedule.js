const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../models');
const schedulerService = require('../services/CampaignSchedulerService');

/**
 * POST /api/campaigns/:campaignId/schedule
 * Create or update campaign schedule
 */
router.post('/:campaignId/schedule', authenticate, async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;

  console.log(`📅 [SCHEDULE] Creating/updating schedule for campaign: ${campaignId}`);

  try {
    const {
      campaignName,
      timezone,
      startTime,
      endTime,
      daysOfWeek,
      isEnabled = true
    } = req.body;

    // Validate required fields
    if (!timezone || !startTime || !endTime || !daysOfWeek) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: timezone, startTime, endTime, daysOfWeek'
      });
    }

    // Validate days of week
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'daysOfWeek must be a non-empty array'
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time format. Use HH:MM (e.g., 09:00, 17:30)'
      });
    }

    console.log(`   ⏰ Schedule: ${startTime} - ${endTime} (${timezone})`);
    console.log(`   📆 Days: ${daysOfWeek.join(', ')}`);

    // Get user's active Facebook auth
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(401).json({
        success: false,
        error: 'Please connect your Facebook account first'
      });
    }

    // Check if schedule already exists
    let schedule = await db.CampaignSchedule.findOne({
      where: { campaign_id: campaignId, user_id: userId }
    });

    if (schedule) {
      // Update existing schedule
      console.log(`   🔄 Updating existing schedule ID: ${schedule.id}`);

      await schedule.update({
        campaign_name: campaignName || schedule.campaign_name,
        timezone,
        start_time: startTime + ':00', // Add seconds for TIME format
        end_time: endTime + ':00',
        days_of_week: daysOfWeek,
        is_enabled: isEnabled,
        // Reset error tracking on update
        consecutive_failures: 0,
        last_error: null,
        last_error_at: null
      });
    } else {
      // Create new schedule
      console.log(`   ✨ Creating new schedule`);

      schedule = await db.CampaignSchedule.create({
        campaign_id: campaignId,
        campaign_name: campaignName || `Campaign ${campaignId}`,
        user_id: userId,
        facebook_auth_id: facebookAuth.id,
        timezone,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        days_of_week: daysOfWeek,
        is_enabled: isEnabled
      });
    }

    // Calculate next execution times
    const { nextStart, nextPause } = await schedulerService.setInitialExecutionTimes(schedule);

    // Reload to get updated values
    await schedule.reload();

    console.log(`   ✅ Schedule saved successfully`);
    console.log(`   📅 Next start: ${nextStart ? nextStart.toISOString() : 'N/A'}`);
    console.log(`   📅 Next pause: ${nextPause ? nextPause.toISOString() : 'N/A'}`);

    res.json({
      success: true,
      schedule: {
        id: schedule.id,
        campaignId: schedule.campaign_id,
        campaignName: schedule.campaign_name,
        timezone: schedule.timezone,
        startTime: schedule.start_time.substring(0, 5), // Remove seconds
        endTime: schedule.end_time.substring(0, 5),
        daysOfWeek: schedule.days_of_week,
        isEnabled: schedule.is_enabled,
        nextScheduledStart: schedule.next_scheduled_start,
        nextScheduledPause: schedule.next_scheduled_pause,
        lastStartedAt: schedule.last_started_at,
        lastPausedAt: schedule.last_paused_at,
        consecutiveFailures: schedule.consecutive_failures,
        lastError: schedule.last_error,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at
      }
    });

  } catch (error) {
    console.error('❌ [SCHEDULE] Error creating/updating schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create/update schedule'
    });
  }
});

/**
 * GET /api/campaigns/:campaignId/schedule
 * Get schedule for a specific campaign
 */
router.get('/:campaignId/schedule', authenticate, async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;

  console.log(`📋 [SCHEDULE] Fetching schedule for campaign: ${campaignId}`);

  try {
    const schedule = await db.CampaignSchedule.findOne({
      where: { campaign_id: campaignId, user_id: userId }
    });

    if (!schedule) {
      return res.json({
        success: true,
        hasSchedule: false,
        schedule: null
      });
    }

    res.json({
      success: true,
      hasSchedule: true,
      schedule: {
        id: schedule.id,
        campaignId: schedule.campaign_id,
        campaignName: schedule.campaign_name,
        timezone: schedule.timezone,
        startTime: schedule.start_time.substring(0, 5),
        endTime: schedule.end_time.substring(0, 5),
        daysOfWeek: schedule.days_of_week,
        isEnabled: schedule.is_enabled,
        nextScheduledStart: schedule.next_scheduled_start,
        nextScheduledPause: schedule.next_scheduled_pause,
        lastStartedAt: schedule.last_started_at,
        lastPausedAt: schedule.last_paused_at,
        consecutiveFailures: schedule.consecutive_failures,
        lastError: schedule.last_error,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at
      }
    });

  } catch (error) {
    console.error('❌ [SCHEDULE] Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch schedule'
    });
  }
});

/**
 * PATCH /api/campaigns/:campaignId/schedule/toggle
 * Enable or disable schedule
 */
router.patch('/:campaignId/schedule/toggle', authenticate, async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;
  const { isEnabled } = req.body;

  console.log(`🔄 [SCHEDULE] Toggling schedule for campaign: ${campaignId} to ${isEnabled ? 'ENABLED' : 'DISABLED'}`);

  try {
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isEnabled must be a boolean'
      });
    }

    const schedule = await db.CampaignSchedule.findOne({
      where: { campaign_id: campaignId, user_id: userId }
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    await schedule.update({ is_enabled: isEnabled });

    console.log(`   ✅ Schedule ${isEnabled ? 'enabled' : 'disabled'}`);

    res.json({
      success: true,
      schedule: {
        id: schedule.id,
        campaignId: schedule.campaign_id,
        isEnabled: schedule.is_enabled,
        nextScheduledStart: schedule.next_scheduled_start,
        nextScheduledPause: schedule.next_scheduled_pause
      }
    });

  } catch (error) {
    console.error('❌ [SCHEDULE] Error toggling schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle schedule'
    });
  }
});

/**
 * DELETE /api/campaigns/:campaignId/schedule
 * Delete schedule permanently
 */
router.delete('/:campaignId/schedule', authenticate, async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;

  console.log(`🗑️  [SCHEDULE] Deleting schedule for campaign: ${campaignId}`);

  try {
    const schedule = await db.CampaignSchedule.findOne({
      where: { campaign_id: campaignId, user_id: userId }
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    await schedule.destroy();

    console.log(`   ✅ Schedule deleted successfully`);

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    console.error('❌ [SCHEDULE] Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete schedule'
    });
  }
});

/**
 * GET /api/campaigns/schedule/upcoming
 * Get all upcoming scheduled actions for user
 */
router.get('/schedule/upcoming', authenticate, async (req, res) => {
  const userId = req.user.id;

  console.log(`📅 [SCHEDULE] Fetching upcoming schedules for user: ${userId}`);

  try {
    const schedules = await db.CampaignSchedule.findAll({
      where: { user_id: userId, is_enabled: true },
      order: [['next_scheduled_start', 'ASC']]
    });

    const upcomingActions = [];

    for (const schedule of schedules) {
      if (schedule.next_scheduled_start) {
        upcomingActions.push({
          campaignId: schedule.campaign_id,
          campaignName: schedule.campaign_name,
          action: 'start',
          scheduledAt: schedule.next_scheduled_start,
          timezone: schedule.timezone
        });
      }

      if (schedule.next_scheduled_pause) {
        upcomingActions.push({
          campaignId: schedule.campaign_id,
          campaignName: schedule.campaign_name,
          action: 'pause',
          scheduledAt: schedule.next_scheduled_pause,
          timezone: schedule.timezone
        });
      }
    }

    // Sort by scheduled time
    upcomingActions.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    console.log(`   ✅ Found ${upcomingActions.length} upcoming actions`);

    res.json({
      success: true,
      upcomingActions
    });

  } catch (error) {
    console.error('❌ [SCHEDULE] Error fetching upcoming schedules:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch upcoming schedules'
    });
  }
});

/**
 * GET /api/campaigns/:campaignId/schedule/logs
 * Get execution history for a campaign schedule
 */
router.get('/:campaignId/schedule/logs', authenticate, async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;

  console.log(`📜 [SCHEDULE] Fetching logs for campaign: ${campaignId}`);

  try {
    const schedule = await db.CampaignSchedule.findOne({
      where: { campaign_id: campaignId, user_id: userId }
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    const logs = await db.CampaignScheduleLog.findAll({
      where: { campaign_schedule_id: schedule.id },
      order: [['executed_at', 'DESC']],
      limit
    });

    console.log(`   ✅ Found ${logs.length} log entries`);

    res.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        status: log.status,
        executedAt: log.executed_at,
        errorMessage: log.error_message,
        fbResponse: log.fb_response
      }))
    });

  } catch (error) {
    console.error('❌ [SCHEDULE] Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch logs'
    });
  }
});

/**
 * GET /api/campaigns/schedule/all
 * Get all schedules for user (for management dashboard)
 */
router.get('/schedule/all', authenticate, async (req, res) => {
  const userId = req.user.id;

  console.log(`📋 [SCHEDULE] Fetching all schedules for user: ${userId}`);

  try {
    const schedules = await db.CampaignSchedule.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    console.log(`   ✅ Found ${schedules.length} schedules`);

    res.json({
      success: true,
      schedules: schedules.map(schedule => ({
        id: schedule.id,
        campaignId: schedule.campaign_id,
        campaignName: schedule.campaign_name,
        timezone: schedule.timezone,
        startTime: schedule.start_time.substring(0, 5),
        endTime: schedule.end_time.substring(0, 5),
        daysOfWeek: schedule.days_of_week,
        isEnabled: schedule.is_enabled,
        nextScheduledStart: schedule.next_scheduled_start,
        nextScheduledPause: schedule.next_scheduled_pause,
        lastStartedAt: schedule.last_started_at,
        lastPausedAt: schedule.last_paused_at,
        consecutiveFailures: schedule.consecutive_failures,
        lastError: schedule.last_error,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at
      }))
    });

  } catch (error) {
    console.error('❌ [SCHEDULE] Error fetching all schedules:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch schedules'
    });
  }
});

module.exports = router;
