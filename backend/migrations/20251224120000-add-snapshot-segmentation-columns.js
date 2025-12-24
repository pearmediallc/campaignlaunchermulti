'use strict';

/**
 * Migration: Add segmentation columns to intel_performance_snapshots
 *
 * Adds columns for:
 * - Geographic segmentation (region, city, country, dma)
 * - Demographic segmentation (age_range, gender)
 * - Device/placement segmentation (device_platform, publisher_platform, platform_position)
 * - Parent entity references (campaign_id, adset_id)
 * - raw_data JSON column
 * - Extended entity_type ENUM values
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // PostgreSQL doesn't allow ALTER TYPE ADD VALUE inside a transaction
    // So we do ENUM changes first, outside of transaction

    console.log('📊 Starting segmentation columns migration...');

    // 1. Add new ENUM values (must be outside transaction in PostgreSQL)
    const enumValues = ['geo', 'hourly', 'age_gender', 'device', 'placement'];

    for (const value of enumValues) {
      try {
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_intel_performance_snapshots_entity_type"
          ADD VALUE IF NOT EXISTS '${value}';
        `);
        console.log(`  ✓ Added ENUM value: ${value}`);
      } catch (error) {
        // Value might already exist, that's fine
        if (!error.message.includes('already exists')) {
          console.log(`  ⚠️ ENUM ${value}: ${error.message}`);
        } else {
          console.log(`  ✓ ENUM value already exists: ${value}`);
        }
      }
    }

    // 2. Now add columns in a transaction
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const columnsToAdd = [
        { name: 'raw_data', type: Sequelize.JSON, allowNull: true },
        { name: 'region', type: Sequelize.STRING, allowNull: true },
        { name: 'city', type: Sequelize.STRING, allowNull: true },
        { name: 'country', type: Sequelize.STRING, allowNull: true, defaultValue: 'US' },
        { name: 'dma', type: Sequelize.STRING, allowNull: true },
        { name: 'age_range', type: Sequelize.STRING, allowNull: true },
        { name: 'gender', type: Sequelize.STRING, allowNull: true },
        { name: 'device_platform', type: Sequelize.STRING, allowNull: true },
        { name: 'publisher_platform', type: Sequelize.STRING, allowNull: true },
        { name: 'platform_position', type: Sequelize.STRING, allowNull: true },
        { name: 'campaign_id', type: Sequelize.STRING, allowNull: true },
        { name: 'adset_id', type: Sequelize.STRING, allowNull: true }
      ];

      for (const column of columnsToAdd) {
        // Check if column exists first
        const [results] = await queryInterface.sequelize.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'intel_performance_snapshots' AND column_name = '${column.name}'
        `, { transaction });

        if (results.length === 0) {
          await queryInterface.addColumn('intel_performance_snapshots', column.name, {
            type: column.type,
            allowNull: column.allowNull,
            defaultValue: column.defaultValue
          }, { transaction });
          console.log(`  ✓ Added column: ${column.name}`);
        } else {
          console.log(`  ✓ Column already exists: ${column.name}`);
        }
      }

      // 3. Add indexes for efficient querying
      const indexesToAdd = [
        { name: 'idx_snapshots_region', fields: ['region'] },
        { name: 'idx_snapshots_age_gender', fields: ['age_range', 'gender'] },
        { name: 'idx_snapshots_device', fields: ['device_platform'] },
        { name: 'idx_snapshots_placement', fields: ['publisher_platform', 'platform_position'] },
        { name: 'idx_snapshots_day_of_week', fields: ['day_of_week'] },
        { name: 'idx_snapshots_campaign_ref', fields: ['campaign_id'] },
        { name: 'idx_snapshots_adset_ref', fields: ['adset_id'] }
      ];

      for (const index of indexesToAdd) {
        try {
          await queryInterface.addIndex('intel_performance_snapshots', index.fields, {
            name: index.name,
            transaction
          });
          console.log(`  ✓ Added index: ${index.name}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`  ✓ Index already exists: ${index.name}`);
          } else {
            throw error;
          }
        }
      }

      await transaction.commit();
      console.log('✅ Migration complete: Added segmentation columns to intel_performance_snapshots');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove indexes
      const indexes = [
        'idx_snapshots_region',
        'idx_snapshots_age_gender',
        'idx_snapshots_device',
        'idx_snapshots_placement',
        'idx_snapshots_day_of_week',
        'idx_snapshots_campaign_ref',
        'idx_snapshots_adset_ref'
      ];

      for (const indexName of indexes) {
        try {
          await queryInterface.removeIndex('intel_performance_snapshots', indexName, { transaction });
          console.log(`  ✓ Removed index: ${indexName}`);
        } catch (error) {
          console.log(`  ⚠️ Index not found: ${indexName}`);
        }
      }

      // Remove columns
      const columns = [
        'raw_data', 'region', 'city', 'country', 'dma',
        'age_range', 'gender', 'device_platform',
        'publisher_platform', 'platform_position',
        'campaign_id', 'adset_id'
      ];

      for (const column of columns) {
        try {
          await queryInterface.removeColumn('intel_performance_snapshots', column, { transaction });
          console.log(`  ✓ Removed column: ${column}`);
        } catch (error) {
          console.log(`  ⚠️ Column not found: ${column}`);
        }
      }

      await transaction.commit();
      console.log('✅ Rollback complete: Removed segmentation columns from intel_performance_snapshots');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
