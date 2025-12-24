'use strict';

/**
 * Add missing columns to intel_expert_rules table
 *
 * These columns are defined in the model but were missing from the original migration:
 * - campaign_structure
 * - thresholds
 * - source
 * - source_references
 * - winning_states
 * - creative_insights
 * - times_validated
 * - times_confirmed
 * - last_validated_at
 * - validation_accuracy
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableExists = await queryInterface.sequelize.query(
      "SELECT to_regclass('intel_expert_rules')",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!tableExists[0]?.to_regclass) {
      console.log('intel_expert_rules table does not exist, skipping column additions');
      return;
    }

    // Check each column and add if missing
    const columns = [
      { name: 'campaign_structure', type: Sequelize.STRING(50), allowNull: true },
      { name: 'thresholds', type: Sequelize.JSON, allowNull: true },
      { name: 'source_references', type: Sequelize.JSON, allowNull: true },
      { name: 'winning_states', type: Sequelize.JSON, allowNull: true },
      { name: 'creative_insights', type: Sequelize.JSON, allowNull: true },
      { name: 'times_validated', type: Sequelize.INTEGER, defaultValue: 0 },
      { name: 'times_confirmed', type: Sequelize.INTEGER, defaultValue: 0 },
      { name: 'last_validated_at', type: Sequelize.DATE, allowNull: true },
      { name: 'validation_accuracy', type: Sequelize.FLOAT, allowNull: true }
    ];

    for (const col of columns) {
      try {
        const columnExists = await queryInterface.sequelize.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'intel_expert_rules' AND column_name = '${col.name}'`,
          { type: Sequelize.QueryTypes.SELECT }
        );

        if (columnExists.length === 0) {
          await queryInterface.addColumn('intel_expert_rules', col.name, {
            type: col.type,
            allowNull: col.allowNull !== undefined ? col.allowNull : true,
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

    // Add source ENUM column
    try {
      const sourceExists = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'intel_expert_rules' AND column_name = 'source'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (sourceExists.length === 0) {
        // First create the ENUM type
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_intel_expert_rules_source') THEN
              CREATE TYPE "enum_intel_expert_rules_source" AS ENUM ('form_submission', 'manual', 'learned', 'validated');
            END IF;
          END$$;
        `);

        // Then add the column
        await queryInterface.addColumn('intel_expert_rules', 'source', {
          type: Sequelize.ENUM('form_submission', 'manual', 'learned', 'validated'),
          defaultValue: 'form_submission'
        });
        console.log('Added column: source');
      } else {
        console.log('Column source already exists, skipping');
      }
    } catch (error) {
      console.error('Error adding source column:', error.message);
    }

    // Add index on campaign_structure
    try {
      await queryInterface.addIndex('intel_expert_rules', ['campaign_structure'], {
        name: 'idx_intel_expert_campaign_structure'
      });
      console.log('Added index on campaign_structure');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    const columns = [
      'campaign_structure',
      'thresholds',
      'source',
      'source_references',
      'winning_states',
      'creative_insights',
      'times_validated',
      'times_confirmed',
      'last_validated_at',
      'validation_accuracy'
    ];

    for (const col of columns) {
      try {
        await queryInterface.removeColumn('intel_expert_rules', col);
      } catch (error) {
        console.log(`Could not remove column ${col}:`, error.message);
      }
    }

    try {
      await queryInterface.removeIndex('intel_expert_rules', 'idx_intel_expert_campaign_structure');
    } catch (error) {
      console.log('Could not remove index:', error.message);
    }
  }
};
