'use strict';

/**
 * IntelExpertRule Model
 *
 * Stores expert rules from media buyers that serve as baseline knowledge
 * for the intelligence engine. These rules are used to:
 * - Seed initial automation rules
 * - Validate learned patterns
 * - Provide vertical-specific thresholds
 */

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class IntelExpertRule extends Model {
    /**
     * Get rules for a specific vertical
     */
    static async getByVertical(vertical) {
      return this.findAll({
        where: {
          vertical: vertical,
          is_active: true
        },
        order: [['confidence_score', 'DESC']]
      });
    }

    /**
     * Get all active rules grouped by type
     */
    static async getGroupedByType() {
      const rules = await this.findAll({
        where: { is_active: true },
        order: [['rule_type', 'ASC'], ['confidence_score', 'DESC']]
      });

      const grouped = {};
      rules.forEach(rule => {
        if (!grouped[rule.rule_type]) {
          grouped[rule.rule_type] = [];
        }
        grouped[rule.rule_type].push(rule);
      });

      return grouped;
    }

    /**
     * Get kill thresholds for a vertical
     */
    static async getKillThresholds(vertical = 'all') {
      return this.findAll({
        where: {
          rule_type: 'kill',
          is_active: true,
          [sequelize.Sequelize.Op.or]: [
            { vertical: vertical },
            { vertical: 'all' }
          ]
        },
        order: [
          [sequelize.Sequelize.literal(`CASE WHEN vertical = '${vertical}' THEN 0 ELSE 1 END`), 'ASC'],
          ['confidence_score', 'DESC']
        ]
      });
    }

    /**
     * Get scale thresholds for a vertical
     */
    static async getScaleThresholds(vertical = 'all') {
      return this.findAll({
        where: {
          rule_type: 'scale',
          is_active: true,
          [sequelize.Sequelize.Op.or]: [
            { vertical: vertical },
            { vertical: 'all' }
          ]
        },
        order: [['confidence_score', 'DESC']]
      });
    }

    /**
     * Get benchmark metrics for a vertical
     */
    static async getBenchmarks(vertical = 'all') {
      const rules = await this.findAll({
        where: {
          rule_type: 'benchmark',
          is_active: true,
          [sequelize.Sequelize.Op.or]: [
            { vertical: vertical },
            { vertical: 'all' }
          ]
        }
      });

      // Merge benchmarks into single object
      const benchmarks = {};
      rules.forEach(rule => {
        Object.assign(benchmarks, rule.thresholds);
      });

      return benchmarks;
    }
  }

  IntelExpertRule.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Rule identification
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Categorization
    vertical: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'all',
      comment: 'Target vertical: home_insurance, auto_insurance, medicare, all, etc.'
    },
    rule_type: {
      type: DataTypes.ENUM('kill', 'scale', 'budget_increase', 'benchmark', 'structure', 'targeting'),
      allowNull: false
    },
    // Campaign structure this applies to
    campaign_structure: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Campaign structure: 1-50-1, 1-3-3, 1-1-3, etc.'
    },
    // Conditions that trigger this rule
    conditions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of conditions: [{metric, operator, value, lookback_days}]'
    },
    // Thresholds for benchmarks
    thresholds: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Key-value thresholds: {cpc_max: 2.0, cpm_range: [45, 75]}'
    },
    // Actions to take when rule triggers
    actions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of actions: [{action, parameters}]'
    },
    // Confidence based on how many experts agree
    confidence_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.5,
      validate: {
        min: 0,
        max: 1
      }
    },
    // Number of experts who contributed to this rule
    expert_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    // Source of the rule
    source: {
      type: DataTypes.ENUM('form_submission', 'manual', 'learned', 'validated'),
      allowNull: false,
      defaultValue: 'form_submission'
    },
    // Source references (expert IDs or timestamps)
    source_references: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'References to source data: timestamps, expert IDs, etc.'
    },
    // Winning states for targeting rules
    winning_states: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Array of winning states with mention counts'
    },
    // Creative insights
    creative_insights: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Insights about winning creatives: {images: [], videos: []}'
    },
    // Status
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Validation tracking
    times_validated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    times_confirmed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    last_validated_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    validation_accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'How often the rule matches actual performance'
    }
  }, {
    sequelize,
    modelName: 'IntelExpertRule',
    tableName: 'intel_expert_rules',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['vertical'] },
      { fields: ['rule_type'] },
      { fields: ['is_active'] },
      { fields: ['confidence_score'] },
      { fields: ['vertical', 'rule_type'] }
    ]
  });

  return IntelExpertRule;
};
