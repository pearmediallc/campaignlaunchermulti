'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create system_users table for managing System User tokens
    await queryInterface.createTable('system_users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Friendly name for the System User'
      },
      system_user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Facebook System User ID'
      },
      access_token: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Encrypted System User access token'
      },
      business_manager_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Business Manager ID this System User belongs to'
      },
      rate_limit_used: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Current rate limit usage count (resets hourly)'
      },
      rate_limit_reset_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the rate limit counter will reset'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this System User is active and available'
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

    // Create rate_limit_tracker table for tracking user-specific rate limits
    await queryInterface.createTable('rate_limit_tracker', {
      id: {
        type: Sequelize.INTEGER,
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
        comment: 'User whose rate limit is being tracked'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Facebook Ad Account ID'
      },
      calls_used: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of API calls used in current window'
      },
      calls_limit: {
        type: Sequelize.INTEGER,
        defaultValue: 200,
        comment: 'Maximum calls allowed per window (usually 200/hour)'
      },
      usage_percentage: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        comment: 'Percentage of rate limit used'
      },
      window_reset_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When the rate limit window resets'
      },
      last_response_headers: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Last x-business-use-case-usage and x-app-usage headers from Facebook'
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

    // Create request_queue table for queued API requests
    await queryInterface.createTable('request_queue', {
      id: {
        type: Sequelize.INTEGER,
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
        comment: 'User who initiated the request'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Target Facebook Ad Account ID'
      },
      action_type: {
        type: Sequelize.ENUM(
          'create_campaign',
          'create_adset',
          'create_ad',
          'update_campaign',
          'update_adset',
          'update_ad',
          'duplicate_campaign',
          'batch_operation'
        ),
        allowNull: false,
        comment: 'Type of Facebook API action to perform'
      },
      request_data: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Original request payload to be processed'
      },
      access_token_encrypted: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Encrypted user access token for API call'
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
        comment: 'Queue priority (1=highest, 10=lowest)'
      },
      status: {
        type: Sequelize.ENUM('queued', 'processing', 'completed', 'failed', 'cancelled'),
        defaultValue: 'queued',
        comment: 'Current status of the queued request'
      },
      process_after: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Earliest time to process this request (after rate limit reset)'
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of processing attempts'
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
        comment: 'Maximum processing attempts before marking as failed'
      },
      result: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Result data from successful processing'
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if processing failed'
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the request was successfully processed'
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

    // Create internal_ad_accounts table to track which ad accounts belong to our 14 BMs
    await queryInterface.createTable('internal_ad_accounts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Facebook Ad Account ID (e.g., act_123456789)'
      },
      business_manager_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Business Manager ID this account belongs to'
      },
      business_manager_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Friendly name of the Business Manager'
      },
      use_system_users: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether to use System Users for this account'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this account is active'
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

    // Add indexes for performance
    await queryInterface.addIndex('rate_limit_tracker', ['user_id', 'ad_account_id'], {
      name: 'idx_rate_limit_user_account',
      unique: true
    });

    await queryInterface.addIndex('request_queue', ['status', 'process_after'], {
      name: 'idx_queue_status_time'
    });

    await queryInterface.addIndex('request_queue', ['user_id'], {
      name: 'idx_queue_user'
    });

    await queryInterface.addIndex('system_users', ['is_active', 'rate_limit_used'], {
      name: 'idx_system_users_availability'
    });

    await queryInterface.addIndex('internal_ad_accounts', ['ad_account_id'], {
      name: 'idx_internal_accounts_lookup'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('request_queue');
    await queryInterface.dropTable('rate_limit_tracker');
    await queryInterface.dropTable('internal_ad_accounts');
    await queryInterface.dropTable('system_users');
  }
};
