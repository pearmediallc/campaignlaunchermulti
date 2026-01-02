'use strict';

/**
 * Add optimized indexes for intel_performance_snapshots
 *
 * These indexes are critical for query performance on large tables (83K+ records).
 * The existing composite indexes are not being used efficiently for single-column queries.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔧 Adding performance indexes to intel_performance_snapshots...');

    // Index 1: Single-column user_id index for COUNT queries
    // This is critical for training/status endpoint
    try {
      await queryInterface.addIndex('intel_performance_snapshots', ['user_id'], {
        name: 'idx_intel_snapshots_user_id'
      });
      console.log('✅ Added idx_intel_snapshots_user_id');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⏭️ Index idx_intel_snapshots_user_id already exists');
      } else {
        console.error('⚠️ Failed to add idx_intel_snapshots_user_id:', error.message);
      }
    }

    // Index 2: user_id + snapshot_date for date range queries
    // This is critical for training/history endpoint
    try {
      await queryInterface.addIndex('intel_performance_snapshots', ['user_id', 'snapshot_date'], {
        name: 'idx_intel_snapshots_user_date'
      });
      console.log('✅ Added idx_intel_snapshots_user_date');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⏭️ Index idx_intel_snapshots_user_date already exists');
      } else {
        console.error('⚠️ Failed to add idx_intel_snapshots_user_date:', error.message);
      }
    }

    // Index 3: snapshot_date alone for global queries
    try {
      await queryInterface.addIndex('intel_performance_snapshots', ['snapshot_date'], {
        name: 'idx_intel_snapshots_date'
      });
      console.log('✅ Added idx_intel_snapshots_date');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⏭️ Index idx_intel_snapshots_date already exists');
      } else {
        console.error('⚠️ Failed to add idx_intel_snapshots_date:', error.message);
      }
    }

    // Index 4: Backfill progress user_id index
    try {
      await queryInterface.addIndex('intel_backfill_progress', ['user_id'], {
        name: 'idx_intel_backfill_user_id'
      });
      console.log('✅ Added idx_intel_backfill_user_id');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⏭️ Index idx_intel_backfill_user_id already exists');
      } else {
        console.error('⚠️ Failed to add idx_intel_backfill_user_id:', error.message);
      }
    }

    // Index 5: Backfill progress status for aggregation
    try {
      await queryInterface.addIndex('intel_backfill_progress', ['user_id', 'status'], {
        name: 'idx_intel_backfill_user_status'
      });
      console.log('✅ Added idx_intel_backfill_user_status');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('⏭️ Index idx_intel_backfill_user_status already exists');
      } else {
        console.error('⚠️ Failed to add idx_intel_backfill_user_status:', error.message);
      }
    }

    console.log('✅ Performance indexes migration complete');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔧 Removing performance indexes...');

    await queryInterface.removeIndex('intel_performance_snapshots', 'idx_intel_snapshots_user_id').catch(() => {});
    await queryInterface.removeIndex('intel_performance_snapshots', 'idx_intel_snapshots_user_date').catch(() => {});
    await queryInterface.removeIndex('intel_performance_snapshots', 'idx_intel_snapshots_date').catch(() => {});
    await queryInterface.removeIndex('intel_backfill_progress', 'idx_intel_backfill_user_id').catch(() => {});
    await queryInterface.removeIndex('intel_backfill_progress', 'idx_intel_backfill_user_status').catch(() => {});

    console.log('✅ Performance indexes removed');
  }
};
