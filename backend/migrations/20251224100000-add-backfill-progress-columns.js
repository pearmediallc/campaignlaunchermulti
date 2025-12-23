'use strict';

/**
 * Add missing columns to intel_backfill_progress table
 *
 * These columns are defined in the model but were missing from the original migration:
 * - campaigns_fetched
 * - adsets_fetched
 * - ads_fetched
 * - snapshots_created
 * - retry_count
 * - last_fetch_at
 * - estimated_remaining_seconds
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableExists = await queryInterface.sequelize.query(
      "SELECT to_regclass('intel_backfill_progress')",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!tableExists[0]?.to_regclass) {
      console.log('intel_backfill_progress table does not exist, skipping column additions');
      return;
    }

    // Check each column and add if missing
    const columns = [
      { name: 'campaigns_fetched', type: Sequelize.INTEGER, defaultValue: 0 },
      { name: 'adsets_fetched', type: Sequelize.INTEGER, defaultValue: 0 },
      { name: 'ads_fetched', type: Sequelize.INTEGER, defaultValue: 0 },
      { name: 'snapshots_created', type: Sequelize.INTEGER, defaultValue: 0 },
      { name: 'retry_count', type: Sequelize.INTEGER, defaultValue: 0 },
      { name: 'last_fetch_at', type: Sequelize.DATE, allowNull: true },
      { name: 'estimated_remaining_seconds', type: Sequelize.INTEGER, allowNull: true }
    ];

    for (const col of columns) {
      try {
        const columnExists = await queryInterface.sequelize.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'intel_backfill_progress' AND column_name = '${col.name}'`,
          { type: Sequelize.QueryTypes.SELECT }
        );

        if (columnExists.length === 0) {
          await queryInterface.addColumn('intel_backfill_progress', col.name, {
            type: col.type,
            allowNull: col.allowNull !== undefined ? col.allowNull : false,
            defaultValue: col.defaultValue
          });
          console.log(`Added column: ${col.name}`);
        } else {
          console.log(`Column ${col.name} already exists, skipping`);
        }
      } catch (error) {
        console.error(`Error adding column ${col.name}:`, error.message);
      }
    }

    // Rename error_count to retry_count if needed
    try {
      const errorCountExists = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'intel_backfill_progress' AND column_name = 'error_count'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (errorCountExists.length > 0) {
        // Just keep both columns - error_count from migration, retry_count from model
        console.log('error_count column exists, keeping both error_count and retry_count');
      }
    } catch (error) {
      console.log('Note on error_count/retry_count:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    const columns = [
      'campaigns_fetched',
      'adsets_fetched',
      'ads_fetched',
      'snapshots_created',
      'retry_count',
      'last_fetch_at',
      'estimated_remaining_seconds'
    ];

    for (const col of columns) {
      try {
        await queryInterface.removeColumn('intel_backfill_progress', col);
      } catch (error) {
        console.log(`Could not remove column ${col}:`, error.message);
      }
    }
  }
};
