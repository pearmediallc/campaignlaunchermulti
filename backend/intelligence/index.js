'use strict';

/**
 * Campaign Intelligence Engine - Main Entry Point
 *
 * This module provides AI-powered campaign optimization including:
 * - Performance data collection and analysis
 * - Pixel health monitoring
 * - Automation rules engine
 * - Account health scoring
 * - Pattern learning (K-means clustering, profiling)
 * - ML training data collection
 *
 * CRITICAL ISOLATION PRINCIPLE:
 * ============================
 * This entire module operates INDEPENDENTLY from the main campaign
 * management system. It NEVER directly modifies campaigns, ad sets,
 * or ads. All actions go through an approval workflow.
 *
 * Data Flow:
 *   Campaign Data → Intelligence (READ ONLY)
 *   Intelligence → intel_* tables (WRITE)
 *   Intelligence → Action Records (pending_approval)
 *   User Approval → ActionExecutor → Facebook API
 *
 * KILL SWITCH:
 * ============
 * Set ENABLE_INTELLIGENCE=false in environment to completely disable
 * this module. When disabled:
 * - No data collection occurs
 * - No rules are evaluated
 * - No actions are suggested
 * - Routes return 503 Service Unavailable
 * - Scheduler doesn't start
 */

// ============================================
// KILL SWITCH CHECK
// ============================================
const isEnabled = process.env.ENABLE_INTELLIGENCE === 'true';

if (!isEnabled) {
  console.log('⚠️  Campaign Intelligence Engine: DISABLED');
  console.log('   Set ENABLE_INTELLIGENCE=true to enable');

  // Export minimal disabled module
  module.exports = {
    enabled: false,
    routes: null,
    scheduler: null,
    models: null,
    services: null,

    // Stub methods that do nothing
    initialize: async () => {
      console.log('⚠️  Intelligence module is disabled');
      return false;
    },
    start: () => {
      console.log('⚠️  Intelligence module is disabled');
    },
    stop: () => {},
    healthCheck: async () => ({
      enabled: false,
      status: 'disabled'
    })
  };

  return;
}

// ============================================
// ENABLED - Load Full Module
// ============================================
console.log('🧠 Campaign Intelligence Engine: ENABLED');

let models, services, routes;

try {
  console.log('🧠 Loading intelligence models...');
  models = require('./models');
  console.log('🧠 Models loaded successfully');
} catch (modelError) {
  console.error('❌ Failed to load intelligence models:', modelError.message);
  console.error(modelError.stack);
}

try {
  console.log('🧠 Loading intelligence services...');
  services = require('./services');
  console.log('🧠 Services loaded successfully');
} catch (serviceError) {
  console.error('❌ Failed to load intelligence services:', serviceError.message);
  console.error(serviceError.stack);
}

try {
  console.log('🧠 Loading intelligence routes...');
  routes = require('./routes');
  console.log('🧠 Routes loaded successfully, type:', typeof routes);
} catch (routeError) {
  console.error('❌ Failed to load intelligence routes:', routeError.message);
  console.error(routeError.stack);
}

/**
 * Initialize the intelligence module
 * Called during server startup
 */
async function initialize() {
  console.log('🧠 Initializing Campaign Intelligence Engine...');

  try {
    // Initialize models
    const modelsInitialized = await models.initialize();
    if (!modelsInitialized) {
      console.error('❌ Failed to initialize intelligence models');
      return false;
    }

    // Health check
    const health = await models.healthCheck();
    if (!health.healthy) {
      console.warn('⚠️  Intelligence database health check failed:', health);
      console.warn('   Run migrations: npx sequelize-cli db:migrate');
    }

    console.log('✅ Campaign Intelligence Engine initialized');
    console.log(`   Models loaded: ${models.getModelNames().length}`);
    console.log(`   Services: ${Object.keys(services).length}`);

    return true;
  } catch (error) {
    console.error('❌ Error initializing intelligence module:', error);
    return false;
  }
}

/**
 * Start the intelligence scheduler
 * Should be called after server is fully started
 */
function start() {
  console.log('🚀 Starting Intelligence Scheduler...');
  services.IntelligenceScheduler.start();
}

/**
 * Stop the intelligence scheduler
 * Called during graceful shutdown
 */
function stop() {
  console.log('🛑 Stopping Intelligence Scheduler...');
  services.IntelligenceScheduler.stop();
}

/**
 * Get module health status
 */
async function healthCheck() {
  return services.IntelligenceScheduler.healthCheck();
}

// ============================================
// Module Exports
// ============================================
module.exports = {
  enabled: true,

  // Components
  routes,
  models,
  services,

  // Lifecycle methods
  initialize,
  start,
  stop,
  healthCheck,

  // Direct access to key services
  InsightsCollector: services.InsightsCollectorService,
  PixelHealth: services.PixelHealthService,
  RulesEngine: services.AutomationRulesEngine,
  AccountScore: services.AccountScoreService,
  PatternLearning: services.PatternLearningService,
  Notifications: services.NotificationService,
  Scheduler: services.IntelligenceScheduler,
  ActionExecutor: services.ActionExecutor
};
