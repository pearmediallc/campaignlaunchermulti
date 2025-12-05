'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create campaign_deployments table
    await queryInterface.createTable('campaign_deployments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      sourceCampaignId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original Facebook campaign ID that was deployed'
      },
      sourceAdAccountId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original ad account ID where source campaign exists'
      },
      sourcePageId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original page ID where source campaign was created'
      },
      deploymentName: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'User-friendly name for this deployment'
      },
      targets: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Array of target account/page combinations: [{ adAccountId, pageId, pixelId }]'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'partial', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      results: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of deployment results: [{ adAccountId, pageId, campaignId, status, error }]'
      },
      totalTargets: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      successfulDeployments: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      failedDeployments: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      processingMode: {
        type: Sequelize.ENUM('sequential', 'parallel'),
        allowNull: false,
        defaultValue: 'parallel'
      },
      errorDetails: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Detailed error information if deployment failed'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create deployed_campaigns table
    await queryInterface.createTable('deployed_campaigns', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      deploymentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'campaign_deployments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      sourceCampaignId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original campaign that was cloned'
      },
      targetCampaignId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'New Facebook campaign ID created in target account'
      },
      targetCampaignName: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      targetAdAccountId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Target ad account where campaign was deployed'
      },
      targetPageId: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Target page used for the deployed campaign'
      },
      targetPixelId: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Target pixel used for the deployed campaign'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending'
      },
      adSetsCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      adsCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      errorDetails: {
        type: Sequelize.JSON,
        allowNull: true
      },
      deployedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('campaign_deployments', ['userId'], {
      name: 'campaign_deployments_userId_idx'
    });

    await queryInterface.addIndex('campaign_deployments', ['sourceCampaignId'], {
      name: 'campaign_deployments_sourceCampaignId_idx'
    });

    await queryInterface.addIndex('campaign_deployments', ['status'], {
      name: 'campaign_deployments_status_idx'
    });

    await queryInterface.addIndex('deployed_campaigns', ['deploymentId'], {
      name: 'deployed_campaigns_deploymentId_idx'
    });

    await queryInterface.addIndex('deployed_campaigns', ['userId'], {
      name: 'deployed_campaigns_userId_idx'
    });

    await queryInterface.addIndex('deployed_campaigns', ['targetCampaignId'], {
      name: 'deployed_campaigns_targetCampaignId_idx'
    });

    await queryInterface.addIndex('deployed_campaigns', ['targetAdAccountId'], {
      name: 'deployed_campaigns_targetAdAccountId_idx'
    });

    await queryInterface.addIndex('deployed_campaigns', ['status'], {
      name: 'deployed_campaigns_status_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order (child first, then parent)
    await queryInterface.dropTable('deployed_campaigns');
    await queryInterface.dropTable('campaign_deployments');
  }
};
