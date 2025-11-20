'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('FailedEntities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      campaignId: {
        type: Sequelize.STRING,
        allowNull: true, // May be null if campaign creation itself failed
        comment: 'Facebook Campaign ID'
      },
      campaignName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'User-defined campaign name'
      },
      adsetId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Facebook Ad Set ID'
      },
      adsetName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Ad Set name'
      },
      adId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Facebook Ad ID'
      },
      adName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Ad name'
      },
      entityType: {
        type: Sequelize.ENUM('campaign', 'adset', 'ad'),
        allowNull: false,
        comment: 'Type of entity that failed'
      },
      failureReason: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Technical failure reason (stack trace, raw error)'
      },
      userFriendlyReason: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'User-friendly error message'
      },
      errorCode: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Facebook API error code'
      },
      facebookError: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Complete Facebook error response object'
      },
      retryCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of retry attempts made'
      },
      status: {
        type: Sequelize.ENUM('failed', 'retrying', 'recovered', 'permanent_failure'),
        allowNull: false,
        defaultValue: 'failed',
        comment: 'Current status of the failed entity'
      },
      strategyType: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Strategy type: strategyForAds, strategyForAll, strategy150'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata: budget, targeting, etc.'
      },
      recoveredAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when entity was successfully recovered'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for efficient querying
    await queryInterface.addIndex('FailedEntities', ['userId'], {
      name: 'idx_failed_entities_user_id'
    });

    await queryInterface.addIndex('FailedEntities', ['campaignId'], {
      name: 'idx_failed_entities_campaign_id'
    });

    await queryInterface.addIndex('FailedEntities', ['status'], {
      name: 'idx_failed_entities_status'
    });

    await queryInterface.addIndex('FailedEntities', ['entityType'], {
      name: 'idx_failed_entities_entity_type'
    });

    await queryInterface.addIndex('FailedEntities', ['userId', 'campaignId'], {
      name: 'idx_failed_entities_user_campaign'
    });

    await queryInterface.addIndex('FailedEntities', ['userId', 'status'], {
      name: 'idx_failed_entities_user_status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('FailedEntities');
  }
};
