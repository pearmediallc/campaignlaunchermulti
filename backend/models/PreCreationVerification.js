'use strict';

module.exports = (sequelize, DataTypes) => {
  const PreCreationVerification = sequelize.define('PreCreationVerification', {
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
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'job_id',
      references: {
        model: 'campaign_creation_jobs',
        key: 'id'
      }
    },
    adAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'ad_account_id'
    },
    campaignName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'campaign_name'
    },

    // Verification results
    canProceed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'can_proceed'
    },
    verificationTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'verification_time_ms'
    },

    // Individual checks
    accountAccessible: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'account_accessible'
    },
    accountSuspended: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'account_suspended'
    },
    duplicateCampaignExists: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'duplicate_campaign_exists'
    },
    atAccountLimit: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'at_account_limit'
    },
    tokenValid: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'token_valid'
    },

    // Warnings and errors
    warnings: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'warnings'
    },
    errors: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'errors'
    },

    // Snapshot of current state
    currentCampaignCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'current_campaign_count'
    },
    accountLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'account_limit'
    }
  }, {
    tableName: 'pre_creation_verifications',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['ad_account_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['job_id']
      }
    ]
  });

  PreCreationVerification.associate = function(models) {
    PreCreationVerification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // Association will be enabled when CampaignCreationJob model is created (Week 2)
    // PreCreationVerification.belongsTo(models.CampaignCreationJob, {
    //   foreignKey: 'jobId',
    //   as: 'job'
    // });
  };

  return PreCreationVerification;
};
