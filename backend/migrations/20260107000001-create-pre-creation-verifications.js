'use strict';

/**
 * Migration: Create pre_creation_verifications table
 *
 * Part of Week 1 Safety Enhancement: Pre-Creation Verification
 *
 * This table stores verification results from SafetyChecks.verifyPreCreationState()
 * before any campaign creation begins. It provides an audit trail of:
 * - Ad account accessibility checks
 * - Duplicate campaign name detection
 * - Account limit verification
 * - Token validity confirmation
 *
 * This is READ-ONLY verification data - does not affect existing functionality.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pre_creation_verifications', {
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
        comment: 'User who initiated the campaign creation request'
      },
      job_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Reference to campaign_creation_jobs (Week 2 enhancement, NULL for now)'
      },
      ad_account_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Facebook Ad Account ID (without act_ prefix)'
      },
      campaign_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Requested campaign name'
      },

      // Verification results
      can_proceed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        comment: 'Overall result: true = safe to proceed, false = block creation'
      },
      verification_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Time taken to complete verification (milliseconds)'
      },

      // Individual check results
      account_accessible: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'Check 1: Ad account is accessible via API (true/false/null if check failed)'
      },
      account_suspended: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'Check 1b: Ad account is suspended/disabled (true/false/null)'
      },
      duplicate_campaign_exists: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'Check 2: Campaign with same name already exists (true/false/null)'
      },
      at_account_limit: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'Check 3: Ad account is at Facebook campaign limit (true/false/null)'
      },
      token_valid: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'Check 4: Access token is valid and not expired (true/false/null)'
      },

      // Warnings and errors (stored as JSON arrays)
      warnings: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Non-blocking warnings (e.g., duplicate names, approaching limits)'
      },
      errors: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Blocking errors (reasons why can_proceed = false)'
      },

      // Current state snapshot
      current_campaign_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of campaigns currently in ad account'
      },
      account_limit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Estimated Facebook campaign limit for this account'
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

    // Add indexes for common queries
    await queryInterface.addIndex('pre_creation_verifications', ['user_id'], {
      name: 'idx_pre_creation_verifications_user_id'
    });

    await queryInterface.addIndex('pre_creation_verifications', ['ad_account_id'], {
      name: 'idx_pre_creation_verifications_ad_account_id'
    });

    await queryInterface.addIndex('pre_creation_verifications', ['created_at'], {
      name: 'idx_pre_creation_verifications_created_at'
    });

    await queryInterface.addIndex('pre_creation_verifications', ['job_id'], {
      name: 'idx_pre_creation_verifications_job_id'
    });

    console.log('✅ Created pre_creation_verifications table with indexes');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pre_creation_verifications');
    console.log('✅ Dropped pre_creation_verifications table');
  }
};
