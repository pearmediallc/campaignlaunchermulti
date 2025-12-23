'use strict';

/**
 * Campaign Intelligence Engine - Expert Rules & Backfill Tables
 *
 * ISOLATION PRINCIPLE: All tables are prefixed with 'intel_' to maintain
 * complete separation from core campaign management tables.
 *
 * Tables created:
 * 1. intel_expert_rules - Expert knowledge from media buyers
 * 2. intel_backfill_progress - Historical data backfill tracking
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // =========================================
    // 1. intel_expert_rules
    // Expert knowledge from media buyer submissions
    // =========================================
    await queryInterface.createTable('intel_expert_rules', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      vertical: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Vertical this rule applies to (home_insurance, auto_insurance, etc.)'
      },
      rule_type: {
        type: Sequelize.ENUM('kill', 'scale', 'benchmark', 'targeting', 'structure'),
        allowNull: false,
        comment: 'Type of expert rule'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Human-readable rule name'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed description of the rule'
      },
      conditions: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Rule conditions (spend_threshold, roi_threshold, etc.)'
      },
      actions: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Recommended actions to take'
      },
      confidence_score: {
        type: Sequelize.DECIMAL(5, 4),
        defaultValue: 0.8,
        comment: 'Confidence score based on expert agreement (0-1)'
      },
      expert_count: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Number of experts who contributed to this rule'
      },
      source_expert: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Name/ID of the expert who submitted this rule'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata (winning states, funnel info, etc.)'
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

    // =========================================
    // 2. intel_backfill_progress
    // Tracks historical data backfill progress
    // =========================================
    await queryInterface.createTable('intel_backfill_progress', {
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
        onDelete: 'CASCADE'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Facebook Ad Account ID being backfilled'
      },
      backfill_type: {
        type: Sequelize.ENUM('all', 'insights', 'pixel'),
        defaultValue: 'all',
        comment: 'Type of data being backfilled'
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'failed', 'paused'),
        defaultValue: 'pending'
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Start of backfill date range'
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'End of backfill date range'
      },
      current_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Current date being processed'
      },
      days_completed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of days successfully backfilled'
      },
      total_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total days to backfill'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if backfill failed'
      },
      error_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of errors encountered'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When backfill started'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When backfill completed'
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

    // =========================================
    // Add new pattern types to intel_learned_patterns
    // =========================================
    try {
      // PostgreSQL allows adding values to ENUM
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_intel_learned_patterns_pattern_type"
        ADD VALUE IF NOT EXISTS 'expert_kill_threshold';
      `);
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_intel_learned_patterns_pattern_type"
        ADD VALUE IF NOT EXISTS 'expert_scale_threshold';
      `);
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_intel_learned_patterns_pattern_type"
        ADD VALUE IF NOT EXISTS 'expert_benchmark';
      `);
    } catch (error) {
      console.log('Note: ENUM values may already exist or use different syntax:', error.message);
    }

    // =========================================
    // Indexes for performance
    // =========================================

    // Expert rules indexes
    await queryInterface.addIndex('intel_expert_rules', ['vertical', 'rule_type'], {
      name: 'idx_intel_expert_vertical_type'
    });
    await queryInterface.addIndex('intel_expert_rules', ['rule_type', 'is_active'], {
      name: 'idx_intel_expert_type_active'
    });
    await queryInterface.addIndex('intel_expert_rules', ['confidence_score'], {
      name: 'idx_intel_expert_confidence'
    });

    // Backfill progress indexes
    await queryInterface.addIndex('intel_backfill_progress', ['user_id', 'ad_account_id'], {
      name: 'idx_intel_backfill_user_account',
      unique: true
    });
    await queryInterface.addIndex('intel_backfill_progress', ['status'], {
      name: 'idx_intel_backfill_status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables
    await queryInterface.dropTable('intel_backfill_progress');
    await queryInterface.dropTable('intel_expert_rules');

    // Note: ENUM values cannot be easily removed in PostgreSQL
    // They will remain but won't cause issues
  }
};
