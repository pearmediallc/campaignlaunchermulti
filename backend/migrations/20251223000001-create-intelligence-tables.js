'use strict';

/**
 * Campaign Intelligence Engine - Database Tables
 *
 * ISOLATION PRINCIPLE: All tables are prefixed with 'intel_' to maintain
 * complete separation from core campaign management tables.
 *
 * Tables created:
 * 1. intel_performance_snapshots - Hourly performance data
 * 2. intel_pixel_health - Pixel health tracking
 * 3. intel_automation_rules - User-defined automation rules
 * 4. intel_automation_actions - Actions taken/pending
 * 5. intel_account_scores - Account health scores
 * 6. intel_learned_patterns - ML learned patterns
 * 7. intel_notifications - In-app notifications
 * 8. intel_ml_training_data - Training data for ML models
 * 9. intel_model_versions - ML model version tracking
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // =========================================
    // 1. intel_performance_snapshots
    // Stores hourly performance data for analysis
    // =========================================
    await queryInterface.createTable('intel_performance_snapshots', {
      id: {
        type: Sequelize.INTEGER,
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
        comment: 'User who owns this data'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Facebook Ad Account ID'
      },
      entity_type: {
        type: Sequelize.ENUM('campaign', 'adset', 'ad'),
        allowNull: false,
        comment: 'Type of entity this snapshot is for'
      },
      entity_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Facebook entity ID (campaign, adset, or ad ID)'
      },
      entity_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Name of the entity at snapshot time'
      },
      snapshot_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date of this snapshot'
      },
      snapshot_hour: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Hour of this snapshot (0-23)'
      },
      // Core metrics
      spend: {
        type: Sequelize.DECIMAL(12, 4),
        defaultValue: 0,
        comment: 'Amount spent'
      },
      impressions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of impressions'
      },
      clicks: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of clicks'
      },
      reach: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Unique people reached'
      },
      conversions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of conversions'
      },
      revenue: {
        type: Sequelize.DECIMAL(12, 4),
        defaultValue: 0,
        comment: 'Revenue generated (purchase value)'
      },
      // Calculated metrics (stored for fast access)
      cpm: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
        comment: 'Cost per 1000 impressions'
      },
      ctr: {
        type: Sequelize.DECIMAL(8, 4),
        defaultValue: 0,
        comment: 'Click-through rate (%)'
      },
      cpc: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
        comment: 'Cost per click'
      },
      cpa: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
        comment: 'Cost per acquisition/conversion'
      },
      roas: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
        comment: 'Return on ad spend (%)'
      },
      frequency: {
        type: Sequelize.DECIMAL(8, 4),
        defaultValue: 0,
        comment: 'Average times ad shown per person'
      },
      // Status tracking
      effective_status: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Entity status at snapshot time'
      },
      learning_phase: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Learning phase status (LEARNING, LEARNING_LIMITED, etc.)'
      },
      // ML-ready features
      hour_of_day: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Hour when data was collected (for time patterns)'
      },
      day_of_week: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Day of week (0=Sunday, 6=Saturday)'
      },
      days_since_creation: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Days since entity was created'
      },
      // Raw data backup
      raw_insights: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Complete raw insights response from Facebook'
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

    // =========================================
    // 2. intel_pixel_health
    // Tracks pixel health and event data
    // =========================================
    await queryInterface.createTable('intel_pixel_health', {
      id: {
        type: Sequelize.INTEGER,
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
        onDelete: 'CASCADE'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      pixel_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Facebook Pixel ID'
      },
      pixel_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      // Health metrics
      event_match_quality: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'EMQ score (0-10)'
      },
      last_fired_time: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time pixel fired an event'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether pixel is actively receiving events'
      },
      // Event counts (24 hour window)
      page_view_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      view_content_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      add_to_cart_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      initiate_checkout_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      purchase_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      lead_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      complete_registration_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      // Server-side tracking
      has_server_events: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether CAPI is configured'
      },
      server_event_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Percentage of events from server'
      },
      // Domain verification
      domain_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      domain_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      // Raw data
      raw_pixel_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      snapshot_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
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

    // =========================================
    // 3. intel_automation_rules
    // User-defined automation rules
    // =========================================
    await queryInterface.createTable('intel_automation_rules', {
      id: {
        type: Sequelize.INTEGER,
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
        onDelete: 'CASCADE'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'If null, applies to all accounts'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Human-readable rule name'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      rule_type: {
        type: Sequelize.ENUM(
          'loss_prevention',      // Stop bleeding money
          'scaling',              // Increase budget on winners
          'learning_protection',  // Protect learning phase
          'fatigue_detection',    // Detect creative fatigue
          'schedule',             // Time-based rules
          'custom'                // User-defined
        ),
        allowNull: false
      },
      entity_type: {
        type: Sequelize.ENUM('campaign', 'adset', 'ad', 'all'),
        defaultValue: 'adset',
        comment: 'What entity type this rule applies to'
      },
      // Conditions (JSON array of condition objects)
      conditions: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Array of {metric, operator, value} conditions'
        // Example: [{"metric": "cpa", "operator": ">", "value": 50}]
      },
      // Logical operator for multiple conditions
      condition_logic: {
        type: Sequelize.ENUM('AND', 'OR'),
        defaultValue: 'AND'
      },
      // Actions to take
      actions: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Array of {action, params} objects'
        // Example: [{"action": "pause"}, {"action": "notify"}]
      },
      // Execution settings
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      requires_approval: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether action requires user approval'
      },
      cooldown_hours: {
        type: Sequelize.INTEGER,
        defaultValue: 24,
        comment: 'Hours to wait before re-triggering on same entity'
      },
      evaluation_window_hours: {
        type: Sequelize.INTEGER,
        defaultValue: 24,
        comment: 'Hours of data to consider for evaluation'
      },
      // Stats
      times_triggered: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      last_triggered_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    // =========================================
    // 4. intel_automation_actions
    // Actions taken or pending approval
    // =========================================
    await queryInterface.createTable('intel_automation_actions', {
      id: {
        type: Sequelize.INTEGER,
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
        onDelete: 'CASCADE'
      },
      rule_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'If triggered by a rule, reference to the rule'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      entity_type: {
        type: Sequelize.ENUM('campaign', 'adset', 'ad'),
        allowNull: false
      },
      entity_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      entity_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      action_type: {
        type: Sequelize.ENUM(
          'pause',
          'activate',
          'increase_budget',
          'decrease_budget',
          'adjust_bid',
          'notify',
          'create_report',
          'duplicate',
          'archive'
        ),
        allowNull: false
      },
      action_params: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Parameters for the action (e.g., budget amount)'
      },
      status: {
        type: Sequelize.ENUM(
          'pending_approval',
          'approved',
          'rejected',
          'executed',
          'failed',
          'expired'
        ),
        defaultValue: 'pending_approval'
      },
      // Reasoning
      trigger_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Human-readable explanation of why action was triggered'
      },
      trigger_metrics: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Metrics that triggered this action'
      },
      // ML-specific fields
      model_confidence: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        comment: 'ML model confidence score (0-1)'
      },
      model_version: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Version of ML model that suggested this'
      },
      features_used: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Features the model used for this decision'
      },
      // Execution tracking
      approved_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      executed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      execution_result: {
        type: Sequelize.JSON,
        allowNull: true
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // Expiry (actions expire if not acted upon)
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this pending action expires'
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

    // =========================================
    // 5. intel_account_scores
    // Daily account health scores
    // =========================================
    await queryInterface.createTable('intel_account_scores', {
      id: {
        type: Sequelize.INTEGER,
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
        onDelete: 'CASCADE'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      score_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      // Overall score (0-100)
      overall_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Overall account health score (0-100)'
      },
      // Component scores (0-100 each)
      performance_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Based on ROAS, CPA, CTR trends'
      },
      efficiency_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Based on spend efficiency, waste reduction'
      },
      pixel_health_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Based on pixel event quality'
      },
      learning_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Based on learning phase success rate'
      },
      consistency_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Based on performance consistency over time'
      },
      // Trends
      score_trend: {
        type: Sequelize.ENUM('improving', 'stable', 'declining'),
        defaultValue: 'stable'
      },
      trend_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Percentage change from previous day'
      },
      // Details
      score_breakdown: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Detailed breakdown of score calculation'
      },
      recommendations: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of recommendations to improve score'
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

    // =========================================
    // 6. intel_learned_patterns
    // Patterns discovered by ML
    // =========================================
    await queryInterface.createTable('intel_learned_patterns', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Null for global patterns, set for user-specific'
      },
      ad_account_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Null for account-agnostic patterns'
      },
      pattern_type: {
        type: Sequelize.ENUM(
          'time_performance',     // Best performing times
          'budget_correlation',   // Budget-performance relationship
          'audience_fatigue',     // Audience exhaustion patterns
          'creative_lifecycle',   // Creative performance over time
          'learning_predictor',   // Predict learning phase success
          'winner_profile',       // Profile of winning adsets
          'loser_profile',        // Profile of losing adsets
          'cluster'               // K-means cluster assignment
        ),
        allowNull: false
      },
      pattern_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // Pattern data
      pattern_data: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'The actual learned pattern data'
      },
      // Confidence and validity
      confidence_score: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        comment: 'How confident we are in this pattern (0-1)'
      },
      sample_size: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of data points used to learn this pattern'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      // Temporal validity
      valid_from: {
        type: Sequelize.DATE,
        allowNull: true
      },
      valid_until: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Patterns may become stale'
      },
      last_validated: {
        type: Sequelize.DATE,
        allowNull: true
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

    // =========================================
    // 7. intel_notifications
    // In-app notifications for intelligence events
    // =========================================
    await queryInterface.createTable('intel_notifications', {
      id: {
        type: Sequelize.INTEGER,
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
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM(
          'action_pending',      // Action waiting for approval
          'action_executed',     // Action was executed
          'action_failed',       // Action execution failed
          'rule_triggered',      // Rule was triggered
          'alert',               // General alert
          'insight',             // Performance insight
          'recommendation',      // Optimization recommendation
          'score_change'         // Account score changed significantly
        ),
        allowNull: false
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      // Related entities
      entity_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      entity_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      action_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Reference to intel_automation_actions if applicable'
      },
      // Status
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_dismissed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      // Action buttons
      action_buttons: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of {label, action} for notification buttons'
      },
      // Metadata
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    // =========================================
    // 8. intel_ml_training_data
    // Training data for ML models
    // =========================================
    await queryInterface.createTable('intel_ml_training_data', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Null for anonymized global training data'
      },
      data_type: {
        type: Sequelize.ENUM(
          'action_feedback',     // User approved/rejected action
          'performance_outcome', // Performance after X days
          'manual_action',       // User manually took an action
          'success_case',        // Successful campaign pattern
          'failure_case'         // Failed campaign pattern
        ),
        allowNull: false
      },
      // Features (input to model)
      features: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Feature vector for training'
      },
      // Label (what we want to predict)
      label: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Classification label or action taken'
      },
      label_value: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true,
        comment: 'Numeric value for regression tasks'
      },
      // Context
      entity_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      entity_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      action_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Reference to the action if applicable'
      },
      // Outcome tracking (for delayed feedback)
      outcome_measured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      outcome_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Performance outcome after action'
      },
      outcome_measured_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      // Training usage
      used_in_training: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      model_version_used_in: {
        type: Sequelize.STRING,
        allowNull: true
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

    // =========================================
    // 9. intel_model_versions
    // ML model version tracking
    // =========================================
    await queryInterface.createTable('intel_model_versions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      model_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Name of the model (e.g., action_classifier, cluster_model)'
      },
      version: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Semantic version (e.g., 1.0.0)'
      },
      model_type: {
        type: Sequelize.ENUM(
          'rules',           // Pure rules-based
          'kmeans',          // K-means clustering
          'classifier',      // Classification model
          'regressor',       // Regression model
          'reinforcement'    // RL model
        ),
        allowNull: false
      },
      // Model storage
      model_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Serialized model data (for simple models)'
      },
      model_file_path: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Path to model file (for larger models)'
      },
      // Training info
      training_data_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      training_started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      training_completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      // Metrics
      accuracy: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true
      },
      precision_score: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true
      },
      recall_score: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true
      },
      f1_score: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true
      },
      // Configuration
      hyperparameters: {
        type: Sequelize.JSON,
        allowNull: true
      },
      feature_columns: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'List of features this model uses'
      },
      // Status
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this is the active version'
      },
      is_production: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this is deployed to production'
      },
      // Notes
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // =========================================
    // Indexes for performance
    // =========================================

    // Performance snapshots indexes
    await queryInterface.addIndex('intel_performance_snapshots', ['user_id', 'ad_account_id'], {
      name: 'idx_intel_perf_user_account'
    });
    await queryInterface.addIndex('intel_performance_snapshots', ['entity_type', 'entity_id'], {
      name: 'idx_intel_perf_entity'
    });
    await queryInterface.addIndex('intel_performance_snapshots', ['snapshot_date', 'snapshot_hour'], {
      name: 'idx_intel_perf_datetime'
    });
    await queryInterface.addIndex('intel_performance_snapshots', ['ad_account_id', 'snapshot_date'], {
      name: 'idx_intel_perf_account_date'
    });

    // Pixel health indexes
    await queryInterface.addIndex('intel_pixel_health', ['user_id', 'pixel_id'], {
      name: 'idx_intel_pixel_user'
    });
    await queryInterface.addIndex('intel_pixel_health', ['snapshot_date'], {
      name: 'idx_intel_pixel_date'
    });

    // Automation rules indexes
    await queryInterface.addIndex('intel_automation_rules', ['user_id', 'is_active'], {
      name: 'idx_intel_rules_user_active'
    });
    await queryInterface.addIndex('intel_automation_rules', ['rule_type'], {
      name: 'idx_intel_rules_type'
    });

    // Automation actions indexes
    await queryInterface.addIndex('intel_automation_actions', ['user_id', 'status'], {
      name: 'idx_intel_actions_user_status'
    });
    await queryInterface.addIndex('intel_automation_actions', ['entity_type', 'entity_id'], {
      name: 'idx_intel_actions_entity'
    });
    await queryInterface.addIndex('intel_automation_actions', ['status', 'created_at'], {
      name: 'idx_intel_actions_pending'
    });

    // Account scores indexes
    await queryInterface.addIndex('intel_account_scores', ['user_id', 'ad_account_id', 'score_date'], {
      name: 'idx_intel_scores_user_account_date',
      unique: true
    });

    // Learned patterns indexes
    await queryInterface.addIndex('intel_learned_patterns', ['pattern_type', 'is_active'], {
      name: 'idx_intel_patterns_type_active'
    });
    await queryInterface.addIndex('intel_learned_patterns', ['user_id', 'ad_account_id'], {
      name: 'idx_intel_patterns_user_account'
    });

    // Notifications indexes
    await queryInterface.addIndex('intel_notifications', ['user_id', 'is_read'], {
      name: 'idx_intel_notif_user_unread'
    });
    await queryInterface.addIndex('intel_notifications', ['user_id', 'created_at'], {
      name: 'idx_intel_notif_user_date'
    });

    // ML training data indexes
    await queryInterface.addIndex('intel_ml_training_data', ['data_type', 'used_in_training'], {
      name: 'idx_intel_ml_type_unused'
    });
    await queryInterface.addIndex('intel_ml_training_data', ['label'], {
      name: 'idx_intel_ml_label'
    });

    // Model versions indexes
    await queryInterface.addIndex('intel_model_versions', ['model_name', 'is_active'], {
      name: 'idx_intel_models_name_active'
    });
    await queryInterface.addIndex('intel_model_versions', ['model_name', 'version'], {
      name: 'idx_intel_models_name_version',
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order due to potential dependencies
    await queryInterface.dropTable('intel_model_versions');
    await queryInterface.dropTable('intel_ml_training_data');
    await queryInterface.dropTable('intel_notifications');
    await queryInterface.dropTable('intel_learned_patterns');
    await queryInterface.dropTable('intel_account_scores');
    await queryInterface.dropTable('intel_automation_actions');
    await queryInterface.dropTable('intel_automation_rules');
    await queryInterface.dropTable('intel_pixel_health');
    await queryInterface.dropTable('intel_performance_snapshots');
  }
};
