'use strict';

/**
 * Campaign Creation Job Model
 *
 * Tracks the overall state of a campaign creation request from start to finish.
 * Provides job-level isolation to prevent concurrent requests from interfering.
 *
 * Status flow:
 * pending → in_progress → completed
 *                      ↓
 *                   failed (if retry exhausted)
 *                      ↓
 *                   rolled_back (if user confirms rollback)
 */

module.exports = (sequelize, DataTypes) => {
  const CampaignCreationJob = sequelize.define('CampaignCreationJob', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    },
    adAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'ad_account_id'
    },

    // Request metadata
    campaignName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'campaign_name'
    },
    requestedAdSets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'requested_ad_sets',
      comment: 'Total number of ad sets requested by user (e.g., 50)'
    },
    requestedAds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'requested_ads',
      comment: 'Total number of ads requested by user (e.g., 50)'
    },

    // Status tracking
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed', 'rolled_back'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'status'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'started_at'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },

    // Progress tracking (real-time counts)
    adSetsCreated: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'ad_sets_created',
      comment: 'Current count of ad sets successfully created'
    },
    adsCreated: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'ads_created',
      comment: 'Current count of ads successfully created'
    },

    // Retry tracking
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'retry_count',
      comment: 'Number of retry attempts made'
    },
    retryBudget: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: 'retry_budget',
      comment: 'Maximum retry attempts allowed (default: 5)'
    },
    lastRetryAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_retry_at'
    },

    // Error tracking
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'last_error',
      comment: 'Most recent error message'
    },
    errorHistory: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'error_history',
      comment: 'Array of all errors encountered during job execution'
    },

    // Rollback tracking
    rollbackTriggered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'rollback_triggered'
    },
    rollbackReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rollback_reason'
    },
    rollbackAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'rollback_at'
    },

    // Facebook campaign ID (once created)
    facebookCampaignId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'facebook_campaign_id'
    }
  }, {
    tableName: 'campaign_creation_jobs',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['facebook_campaign_id']
      }
    ]
  });

  CampaignCreationJob.associate = function(models) {
    CampaignCreationJob.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    CampaignCreationJob.hasMany(models.EntityCreationSlot, {
      foreignKey: 'jobId',
      as: 'slots'
    });

    CampaignCreationJob.hasMany(models.PreCreationVerification, {
      foreignKey: 'jobId',
      as: 'verifications'
    });
  };

  return CampaignCreationJob;
};
