'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create campaign_schedules table
    await queryInterface.createTable('campaign_schedules', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      campaign_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Facebook Campaign ID'
      },
      campaign_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Campaign name for easy reference'
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      facebook_auth_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'facebook_auths',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to Facebook Auth for access token'
      },

      // Schedule Configuration
      timezone: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'America/New_York',
        comment: 'IANA timezone identifier (e.g., America/New_York)'
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Time to start campaign (HH:MM:SS format)'
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Time to pause campaign (HH:MM:SS format)'
      },
      days_of_week: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]',
        comment: 'Array of day names when schedule is active'
      },

      // Control
      is_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether schedule is currently active'
      },

      // Tracking
      last_started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time campaign was started by scheduler'
      },
      last_paused_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time campaign was paused by scheduler'
      },
      next_scheduled_start: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Next scheduled start time (UTC)'
      },
      next_scheduled_pause: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Next scheduled pause time (UTC)'
      },

      // Error Handling
      consecutive_failures: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of consecutive failures (auto-disable at 3)'
      },
      last_error: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Last error message'
      },
      last_error_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When last error occurred'
      },

      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for efficient querying
    await queryInterface.addIndex('campaign_schedules', ['user_id', 'campaign_id'], {
      name: 'idx_user_campaign',
      unique: true
    });

    await queryInterface.addIndex('campaign_schedules', ['next_scheduled_start', 'is_enabled'], {
      name: 'idx_next_start'
    });

    await queryInterface.addIndex('campaign_schedules', ['next_scheduled_pause', 'is_enabled'], {
      name: 'idx_next_pause'
    });

    await queryInterface.addIndex('campaign_schedules', ['is_enabled'], {
      name: 'idx_is_enabled'
    });

    // Create campaign_schedule_logs table
    await queryInterface.createTable('campaign_schedule_logs', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      campaign_schedule_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'campaign_schedules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.ENUM('start', 'pause'),
        allowNull: false,
        comment: 'Action taken (start or pause campaign)'
      },
      status: {
        type: Sequelize.ENUM('success', 'failed', 'skipped'),
        allowNull: false,
        comment: 'Execution result'
      },
      executed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When action was executed'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if failed'
      },
      fb_response: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Facebook API response'
      }
    });

    // Index for logs query performance
    await queryInterface.addIndex('campaign_schedule_logs', ['campaign_schedule_id', 'executed_at'], {
      name: 'idx_schedule_date'
    });

    await queryInterface.addIndex('campaign_schedule_logs', ['executed_at'], {
      name: 'idx_executed_at'
    });

    console.log('✅ Campaign scheduling tables created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order (logs first, then schedules)
    await queryInterface.dropTable('campaign_schedule_logs');
    await queryInterface.dropTable('campaign_schedules');

    console.log('✅ Campaign scheduling tables dropped successfully');
  }
};
