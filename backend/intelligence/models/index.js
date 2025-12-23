'use strict';

/**
 * Intelligence Models Index
 *
 * This file initializes all intelligence-related Sequelize models.
 * It uses the same database connection from the main models but
 * keeps intelligence models isolated in their own namespace.
 *
 * ISOLATION PRINCIPLE:
 * - Intelligence models use separate tables (prefixed with 'intel_')
 * - Models are loaded into a separate namespace
 * - No direct interaction with campaign management models
 */

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);

// Get database connection from main models
const mainDb = require('../../models');
const sequelize = mainDb.sequelize;

const intelModels = {};

// Load all intelligence models from this directory
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    intelModels[model.name] = model;
  });

// Set up associations between intelligence models
Object.keys(intelModels).forEach(modelName => {
  if (intelModels[modelName].associate) {
    // Pass combined models (main + intel) for associations
    const combinedModels = { ...mainDb, ...intelModels };
    intelModels[modelName].associate(combinedModels);
  }
});

// Export with sequelize reference
intelModels.sequelize = sequelize;
intelModels.Sequelize = Sequelize;

/**
 * Initialize all intelligence models
 * Called when intelligence module is enabled
 */
intelModels.initialize = async function() {
  console.log('🧠 Initializing intelligence models...');

  try {
    // Sync models (in development only - use migrations in production)
    if (process.env.NODE_ENV === 'development' && process.env.INTEL_SYNC_MODELS === 'true') {
      await sequelize.sync({ alter: true });
      console.log('✅ Intelligence models synced');
    }

    // Initialize default rules model if not exists
    const IntelModelVersion = intelModels.IntelModelVersion;
    if (IntelModelVersion) {
      await IntelModelVersion.initializeRulesModel();
      console.log('✅ Default rules model initialized');
    }

    return true;
  } catch (error) {
    console.error('❌ Error initializing intelligence models:', error);
    return false;
  }
};

/**
 * Get all model names
 */
intelModels.getModelNames = function() {
  return Object.keys(intelModels).filter(
    name => name !== 'sequelize' && name !== 'Sequelize' && typeof intelModels[name] !== 'function'
  );
};

/**
 * Health check for intelligence database
 */
intelModels.healthCheck = async function() {
  try {
    // Check if tables exist
    const tableChecks = await Promise.all([
      sequelize.query("SELECT to_regclass('intel_performance_snapshots')", { type: Sequelize.QueryTypes.SELECT }),
      sequelize.query("SELECT to_regclass('intel_automation_rules')", { type: Sequelize.QueryTypes.SELECT }),
      sequelize.query("SELECT to_regclass('intel_notifications')", { type: Sequelize.QueryTypes.SELECT })
    ]);

    const allTablesExist = tableChecks.every(result =>
      result[0] && result[0].to_regclass !== null
    );

    return {
      healthy: allTablesExist,
      tables_exist: allTablesExist,
      connection: 'ok',
      models_loaded: intelModels.getModelNames().length
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

module.exports = intelModels;
