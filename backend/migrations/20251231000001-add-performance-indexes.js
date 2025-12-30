'use strict';

/**
 * Migration: Add critical performance indexes
 *
 * The intel_performance_snapshots table is heavily queried but was missing
 * key indexes for user_id based queries. This migration adds:
 *
 * 1. Composite index on (user_id, snapshot_date) - used by training/status, training/history
 * 2. Composite index on (user_id, entity_type, snapshot_date) - used by top-performers
 * 3. Index on snapshot_date alone for date-range queries
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if indexes already exist before creating
    const checkIndexExists = async (tableName, indexName) => {
      try {
        const [results] = await queryInterface.sequelize.query(
          `SELECT indexname FROM pg_indexes WHERE tablename = '${tableName}' AND indexname = '${indexName}'`
        );
        return results.length > 0;
      } catch (error) {
        console.log(`Could not check index existence: ${error.message}`);
        return false;
      }
    };

    // Index 1: user_id + snapshot_date (most common query pattern)
    const idx1Exists = await checkIndexExists('intel_performance_snapshots', 'idx_intel_perf_user_date');
    if (!idx1Exists) {
      console.log('Creating index: idx_intel_perf_user_date');
      await queryInterface.addIndex('intel_performance_snapshots', ['user_id', 'snapshot_date'], {
        name: 'idx_intel_perf_user_date'
      });
    }

    // Index 2: user_id + entity_type + snapshot_date (for filtered queries)
    const idx2Exists = await checkIndexExists('intel_performance_snapshots', 'idx_intel_perf_user_type_date');
    if (!idx2Exists) {
      console.log('Creating index: idx_intel_perf_user_type_date');
      await queryInterface.addIndex('intel_performance_snapshots', ['user_id', 'entity_type', 'snapshot_date'], {
        name: 'idx_intel_perf_user_type_date'
      });
    }

    // Index 3: Covering index for common aggregations
    const idx3Exists = await checkIndexExists('intel_performance_snapshots', 'idx_intel_perf_user_entity_group');
    if (!idx3Exists) {
      console.log('Creating index: idx_intel_perf_user_entity_group');
      await queryInterface.addIndex('intel_performance_snapshots',
        ['user_id', 'entity_type', 'entity_id', 'entity_name'], {
        name: 'idx_intel_perf_user_entity_group'
      });
    }

    // Index 4: backfill progress status for resume queries
    const idx4Exists = await checkIndexExists('intel_backfill_progress', 'idx_backfill_user_status');
    if (!idx4Exists) {
      console.log('Creating index: idx_backfill_user_status');
      await queryInterface.addIndex('intel_backfill_progress', ['user_id', 'status'], {
        name: 'idx_backfill_user_status'
      });
    }

    // Index 5: pixel health by user for summary queries
    const idx5Exists = await checkIndexExists('intel_pixel_health', 'idx_pixel_user_date');
    if (!idx5Exists) {
      console.log('Creating index: idx_pixel_user_date');
      await queryInterface.addIndex('intel_pixel_health', ['user_id', 'snapshot_date'], {
        name: 'idx_pixel_user_date'
      });
    }

    console.log('Performance indexes created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Drop indexes in reverse order
    const dropIndexSafe = async (tableName, indexName) => {
      try {
        await queryInterface.removeIndex(tableName, indexName);
      } catch (error) {
        console.log(`Index ${indexName} may not exist: ${error.message}`);
      }
    };

    await dropIndexSafe('intel_pixel_health', 'idx_pixel_user_date');
    await dropIndexSafe('intel_backfill_progress', 'idx_backfill_user_status');
    await dropIndexSafe('intel_performance_snapshots', 'idx_intel_perf_user_entity_group');
    await dropIndexSafe('intel_performance_snapshots', 'idx_intel_perf_user_type_date');
    await dropIndexSafe('intel_performance_snapshots', 'idx_intel_perf_user_date');
  }
};
