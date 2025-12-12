'use strict';

module.exports = (sequelize, DataTypes) => {
  const DeployedCampaign = sequelize.define('DeployedCampaign', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    deploymentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'campaign_deployments',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sourceCampaignId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Original campaign that was cloned (null for fresh-campaign strategies)'
    },
    targetCampaignId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'New Facebook campaign ID created in target account'
    },
    targetCampaignName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    targetAdAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Target ad account where campaign was deployed'
    },
    targetPageId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Target page used for the deployed campaign'
    },
    targetPixelId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Target pixel used for the deployed campaign'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    adSetsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    adsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    errorDetails: {
      type: DataTypes.JSON,
      allowNull: true
    },
    deployedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'deployed_campaigns',
    timestamps: true,
    underscored: false
  });

  DeployedCampaign.associate = function(models) {
    DeployedCampaign.belongsTo(models.CampaignDeployment, {
      foreignKey: 'deploymentId',
      as: 'deployment'
    });

    DeployedCampaign.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return DeployedCampaign;
};
