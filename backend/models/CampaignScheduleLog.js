'use strict';

module.exports = (sequelize, DataTypes) => {
  const CampaignScheduleLog = sequelize.define('CampaignScheduleLog', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    campaign_schedule_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'campaign_schedule_id'
    },
    action: {
      type: DataTypes.ENUM('start', 'pause'),
      allowNull: false,
      field: 'action'
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'skipped'),
      allowNull: false,
      field: 'status'
    },
    executed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'executed_at'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    },
    fb_response: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'fb_response'
    }
  }, {
    tableName: 'campaign_schedule_logs',
    timestamps: false, // This table uses executed_at instead
    underscored: true
  });

  CampaignScheduleLog.associate = function(models) {
    // Association with CampaignSchedule model
    CampaignScheduleLog.belongsTo(models.CampaignSchedule, {
      foreignKey: 'campaign_schedule_id',
      as: 'schedule',
      onDelete: 'CASCADE'
    });
  };

  // Class methods
  CampaignScheduleLog.createLog = async function(scheduleId, action, status, errorMessage = null, fbResponse = null) {
    return this.create({
      campaign_schedule_id: scheduleId,
      action,
      status,
      error_message: errorMessage,
      fb_response: fbResponse,
      executed_at: new Date()
    });
  };

  CampaignScheduleLog.getRecentLogs = function(scheduleId, limit = 50) {
    return this.findAll({
      where: { campaign_schedule_id: scheduleId },
      order: [['executed_at', 'DESC']],
      limit
    });
  };

  CampaignScheduleLog.cleanupOldLogs = async function(daysToKeep = 90) {
    const { Op } = require('sequelize');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await this.destroy({
      where: {
        executed_at: {
          [Op.lt]: cutoffDate
        }
      }
    });

    console.log(`🗑️  [SCHEDULER] Cleaned up ${deleted} old schedule logs (older than ${daysToKeep} days)`);
    return deleted;
  };

  return CampaignScheduleLog;
};
