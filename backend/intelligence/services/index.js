'use strict';

/**
 * Intelligence Services Index
 *
 * Central export point for all intelligence services.
 *
 * ISOLATION PRINCIPLE:
 * All services in this module operate independently from
 * campaign management code. They only read/write intel_* tables.
 */

const InsightsCollectorService = require('./InsightsCollectorService');
const PixelHealthService = require('./PixelHealthService');
const AutomationRulesEngine = require('./AutomationRulesEngine');
const AccountScoreService = require('./AccountScoreService');
const PatternLearningService = require('./PatternLearningService');
const NotificationService = require('./NotificationService');
const IntelligenceScheduler = require('./IntelligenceScheduler');
const ActionExecutor = require('./ActionExecutor');
const ExpertRulesService = require('./ExpertRulesService');

module.exports = {
  InsightsCollectorService,
  PixelHealthService,
  AutomationRulesEngine,
  AccountScoreService,
  PatternLearningService,
  NotificationService,
  IntelligenceScheduler,
  ActionExecutor,
  ExpertRulesService
};
