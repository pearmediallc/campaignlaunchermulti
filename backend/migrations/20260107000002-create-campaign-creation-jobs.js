'use strict';

/**
 * Migration: Create campaign_creation_jobs table
 *
 * Part of Week 2 Safety Enhancement: Real-time Tracking System
 *
 * This table tracks the overall state of campaign creation requests.
 * Provides job-level isolation for concurrent users and enables
 * retry logic, progress tracking, and rollback capabilities.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('campaign_creation_jobs', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'User who created this campaign request'
      },
      ad_account_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Facebook Ad Account ID'
      },

      // Request metadata
      campaign_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Requested campaign name'
      },
      requested_ad_sets: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total number of ad sets requested (e.g., 50)'
      },
      requested_ads: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total number of ads requested (e.g., 50)'
      },

      // Status tracking
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'failed', 'rolled_back'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current job status'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When job execution started'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When job completed or failed'
      },

      // Progress tracking
      ad_sets_created: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Current count of ad sets created'
      },
      ads_created: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Current count of ads created'
      },

      // Retry tracking
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of retry attempts'
      },
      retry_budget: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
        comment: 'Maximum retry attempts allowed'
      },
      last_retry_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last retry attempt timestamp'
      },

      // Error tracking
      last_error: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Most recent error message'
      },
      error_history: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of all errors encountered'
      },

      // Rollback tracking
      rollback_triggered: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether rollback was triggered'
      },
      rollback_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for rollback'
      },
      rollback_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When rollback was executed'
      },

      // Facebook campaign ID
      facebook_campaign_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Facebook campaign ID once created'
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('campaign_creation_jobs', ['user_id'], {
      name: 'idx_campaign_creation_jobs_user_id'
    });

    await queryInterface.addIndex('campaign_creation_jobs', ['status'], {
      name: 'idx_campaign_creation_jobs_status'
    });

    await queryInterface.addIndex('campaign_creation_jobs', ['created_at'], {
      name: 'idx_campaign_creation_jobs_created_at'
    });

    await queryInterface.addIndex('campaign_creation_jobs', ['facebook_campaign_id'], {
      name: 'idx_campaign_creation_jobs_facebook_campaign_id'
    });

    console.log('✅ Created campaign_creation_jobs table with indexes');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('campaign_creation_jobs');
    console.log('✅ Dropped campaign_creation_jobs table');
  }
};
