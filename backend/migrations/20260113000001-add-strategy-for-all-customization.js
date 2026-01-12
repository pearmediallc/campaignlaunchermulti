'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🚀 [MIGRATION] Adding Strategy-For-All customization features...');

    // Add prefix customization columns to Campaigns table
    await queryInterface.addColumn('Campaigns', 'prefixOption', {
      type: Sequelize.ENUM('launcher', 'none', 'custom'),
      defaultValue: 'launcher',
      allowNull: true,
      comment: 'Campaign name prefix option for Strategy-For-All'
    });
    console.log('✅ [MIGRATION] Added prefixOption column');

    await queryInterface.addColumn('Campaigns', 'customPrefix', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Custom prefix text if prefixOption is "custom"'
    });
    console.log('✅ [MIGRATION] Added customPrefix column');

    await queryInterface.addColumn('Campaigns', 'catalogId', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Facebook Product Catalog ID for dynamic product ads'
    });
    console.log('✅ [MIGRATION] Added catalogId column');

    await queryInterface.addColumn('Campaigns', 'productSetId', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Facebook Product Set ID for specific product targeting'
    });
    console.log('✅ [MIGRATION] Added productSetId column');

    // Create table for per-account campaign names (multi-account deployment)
    await queryInterface.createTable('MultiAccountCampaignNames', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      deploymentId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Unique ID for this multi-account deployment batch'
      },
      campaignId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Facebook campaign ID (filled after creation)'
      },
      accountId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Facebook Ad Account ID'
      },
      pageId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Facebook Page ID'
      },
      pixelId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Facebook Pixel ID'
      },
      customCampaignName: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Custom campaign name for this account'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
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
    console.log('✅ [MIGRATION] Created MultiAccountCampaignNames table');

    // Add indexes for performance
    await queryInterface.addIndex('MultiAccountCampaignNames', ['deploymentId'], {
      name: 'idx_multi_account_deployment_id'
    });
    console.log('✅ [MIGRATION] Added index on deploymentId');

    await queryInterface.addIndex('MultiAccountCampaignNames', ['userId'], {
      name: 'idx_multi_account_user_id'
    });
    console.log('✅ [MIGRATION] Added index on userId');

    await queryInterface.addIndex('MultiAccountCampaignNames', ['campaignId'], {
      name: 'idx_multi_account_campaign_id'
    });
    console.log('✅ [MIGRATION] Added index on campaignId');

    console.log('🎉 [MIGRATION] Strategy-For-All customization migration completed successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 [MIGRATION] Rolling back Strategy-For-All customization...');

    // Remove indexes first
    await queryInterface.removeIndex('MultiAccountCampaignNames', 'idx_multi_account_deployment_id');
    await queryInterface.removeIndex('MultiAccountCampaignNames', 'idx_multi_account_user_id');
    await queryInterface.removeIndex('MultiAccountCampaignNames', 'idx_multi_account_campaign_id');

    // Drop table
    await queryInterface.dropTable('MultiAccountCampaignNames');
    console.log('✅ [MIGRATION] Dropped MultiAccountCampaignNames table');

    // Remove columns
    await queryInterface.removeColumn('Campaigns', 'productSetId');
    await queryInterface.removeColumn('Campaigns', 'catalogId');
    await queryInterface.removeColumn('Campaigns', 'customPrefix');
    await queryInterface.removeColumn('Campaigns', 'prefixOption');
    console.log('✅ [MIGRATION] Removed customization columns');

    console.log('🎉 [MIGRATION] Rollback completed successfully!');
  }
};
