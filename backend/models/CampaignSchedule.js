'use strict';

module.exports = (sequelize, DataTypes) => {
  const CampaignSchedule = sequelize.define('CampaignSchedule', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    campaign_id: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'campaign_id'
    },
    campaign_name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'campaign_name'
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'user_id'
    },
    facebook_auth_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'facebook_auth_id'
    },

    // Schedule Configuration
    timezone: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'America/New_York',
      field: 'timezone'
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'start_time'
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'end_time'
    },
    days_of_week: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      field: 'days_of_week'
    },

    // Control
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_enabled'
    },

    // Tracking
    last_started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_started_at'
    },
    last_paused_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_paused_at'
    },
    next_scheduled_start: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_scheduled_start'
    },
    next_scheduled_pause: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_scheduled_pause'
    },

    // Error Handling
    consecutive_failures: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'consecutive_failures'
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'last_error'
    },
    last_error_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_error_at'
    }
  }, {
    tableName: 'campaign_schedules',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  CampaignSchedule.associate = function(models) {
    // Association with User model
    CampaignSchedule.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });

    // Association with FacebookAuth model
    CampaignSchedule.belongsTo(models.FacebookAuth, {
      foreignKey: 'facebook_auth_id',
      as: 'facebookAuth',
      onDelete: 'CASCADE'
    });

    // Association with CampaignScheduleLog model
    CampaignSchedule.hasMany(models.CampaignScheduleLog, {
      foreignKey: 'campaign_schedule_id',
      as: 'logs',
      onDelete: 'CASCADE'
    });
  };

  // Instance methods
  CampaignSchedule.prototype.recordSuccess = async function(action) {
    const updateData = {
      consecutive_failures: 0,
      last_error: null,
      last_error_at: null
    };

    if (action === 'start') {
      updateData.last_started_at = new Date();
    } else if (action === 'pause') {
      updateData.last_paused_at = new Date();
    }

    return this.update(updateData);
  };

  CampaignSchedule.prototype.recordFailure = async function(error) {
    const consecutiveFailures = this.consecutive_failures + 1;
    const updateData = {
      consecutive_failures: consecutiveFailures,
      last_error: error.message || String(error),
      last_error_at: new Date()
    };

    // Auto-disable after 3 consecutive failures
    if (consecutiveFailures >= 3) {
      updateData.is_enabled = false;
    }

    return this.update(updateData);
  };

  CampaignSchedule.prototype.updateNextExecutionTimes = async function(nextStart, nextPause) {
    return this.update({
      next_scheduled_start: nextStart,
      next_scheduled_pause: nextPause
    });
  };

  // Class methods
  CampaignSchedule.findByUserId = function(userId) {
    return this.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
  };

  CampaignSchedule.findByCampaignId = function(campaignId, userId) {
    return this.findOne({
      where: {
        campaign_id: campaignId,
        user_id: userId
      }
    });
  };

  CampaignSchedule.findActiveSchedules = function() {
    return this.findAll({
      where: {
        is_enabled: true
      },
      include: [{
        association: 'facebookAuth',
        required: true
      }]
    });
  };

  CampaignSchedule.findDueForExecution = function(action) {
    const { Op } = require('sequelize');
    const now = new Date();

    const whereClause = {
      is_enabled: true
    };

    if (action === 'start') {
      whereClause.next_scheduled_start = {
        [Op.and]: [
          { [Op.lte]: now },
          { [Op.ne]: null }
        ]
      };
    } else if (action === 'pause') {
      whereClause.next_scheduled_pause = {
        [Op.and]: [
          { [Op.lte]: now },
          { [Op.ne]: null }
        ]
      };
    }

    return this.findAll({
      where: whereClause,
      include: [{
        association: 'facebookAuth',
        required: true
      }]
    });
  };

  return CampaignSchedule;
};
