'use strict';

/**
 * Migration: Create entity_creation_slots table
 *
 * Part of Week 2 Safety Enhancement: Slot-Based Entity Tracking
 *
 * Tracks individual entities (campaign, ad sets, ads) within a job.
 * Enables idempotency protection by tracking exactly which slots are filled.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('entity_creation_slots', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      job_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'campaign_creation_jobs',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Parent campaign creation job'
      },

      // Slot identification
      slot_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Slot position (1 to N)'
      },
      entity_type: {
        type: Sequelize.ENUM('campaign', 'ad_set', 'ad'),
        allowNull: false,
        comment: 'Type of entity in this slot'
      },

      // Entity details
      facebook_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Facebook entity ID once created'
      },
      entity_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Entity name in Facebook'
      },

      // Status tracking
      status: {
        type: Sequelize.ENUM('pending', 'creating', 'created', 'failed', 'rolled_back'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current slot status'
      },

      // Timing
      creation_started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When creation started for this slot'
      },
      creation_completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When creation completed for this slot'
      },

      // Error tracking
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if creation failed'
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of retries for this slot'
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

    // Add unique constraint (one slot per job/number/type combination)
    await queryInterface.addIndex('entity_creation_slots', ['job_id', 'slot_number', 'entity_type'], {
      unique: true,
      name: 'unique_slot_per_job'
    });

    // Add indexes
    await queryInterface.addIndex('entity_creation_slots', ['job_id'], {
      name: 'idx_entity_creation_slots_job_id'
    });

    await queryInterface.addIndex('entity_creation_slots', ['status'], {
      name: 'idx_entity_creation_slots_status'
    });

    await queryInterface.addIndex('entity_creation_slots', ['facebook_id'], {
      name: 'idx_entity_creation_slots_facebook_id'
    });

    await queryInterface.addIndex('entity_creation_slots', ['entity_type'], {
      name: 'idx_entity_creation_slots_entity_type'
    });

    console.log('✅ Created entity_creation_slots table with indexes');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('entity_creation_slots');
    console.log('✅ Dropped entity_creation_slots table');
  }
};
