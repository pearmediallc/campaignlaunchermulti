'use strict';

module.exports = (sequelize, DataTypes) => {
  const CampaignDeployment = sequelize.define('CampaignDeployment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
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
      comment: 'Original Facebook campaign ID that was deployed (null for fresh-campaign strategies)'
    },
    sourceAdAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original ad account ID where source campaign exists'
    },
    sourcePageId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original page ID where source campaign was created'
    },
    deploymentName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'User-friendly name for this deployment'
    },
    targets: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of target account/page combinations'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'partial', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    results: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of deployment results'
    },
    totalTargets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    successfulDeployments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    failedDeployments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    processingMode: {
      type: DataTypes.ENUM('sequential', 'parallel'),
      allowNull: false,
      defaultValue: 'parallel'
    },
    errorDetails: {
      type: DataTypes.JSON,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'campaign_deployments',
    timestamps: true,
    underscored: false
  });

  CampaignDeployment.associate = function(models) {
    CampaignDeployment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    CampaignDeployment.hasMany(models.DeployedCampaign, {
      foreignKey: 'deploymentId',
      as: 'deployedCampaigns'
    });
  };

  return CampaignDeployment;
};
