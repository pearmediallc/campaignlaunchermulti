'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Allow sourceCampaignId to be NULL in campaign_deployments table
    // This is needed for Strategy for Ads and Strategy for All which create fresh campaigns
    // in each target account rather than cloning from a source campaign
    await queryInterface.changeColumn('campaign_deployments', 'sourceCampaignId', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Original Facebook campaign ID that was deployed (null for fresh-campaign strategies)'
    });

    // Also allow sourceCampaignId to be NULL in deployed_campaigns table
    // for the same reason - these strategies don't have a source campaign to reference
    await queryInterface.changeColumn('deployed_campaigns', 'sourceCampaignId', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Original campaign that was cloned (null for fresh-campaign strategies)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to NOT NULL (this will fail if there are NULL values in the table)
    await queryInterface.changeColumn('campaign_deployments', 'sourceCampaignId', {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: 'Original Facebook campaign ID that was deployed'
    });

    await queryInterface.changeColumn('deployed_campaigns', 'sourceCampaignId', {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: 'Original campaign that was cloned'
    });
  }
};
