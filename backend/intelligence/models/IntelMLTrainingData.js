'use strict';

/**
 * IntelMLTrainingData Model
 *
 * Stores training data for ML models including:
 * - User action feedback (approved/rejected)
 * - Performance outcomes
 * - Manual actions taken by users
 * - Success/failure cases
 *
 * ISOLATION: Training data is collected passively from user behavior.
 */

module.exports = (sequelize, DataTypes) => {
  const IntelMLTrainingData = sequelize.define('IntelMLTrainingData', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Null for anonymized global training data'
    },
    data_type: {
      type: DataTypes.ENUM(
        'action_feedback',
        'performance_outcome',
        'manual_action',
        'success_case',
        'failure_case'
      ),
      allowNull: false
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Feature vector for training'
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Classification label or action taken'
    },
    label_value: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      get() {
        const value = this.getDataValue('label_value');
        return value ? parseFloat(value) : null;
      }
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    entity_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    action_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    outcome_measured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    outcome_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    outcome_measured_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    used_in_training: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    model_version_used_in: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'intel_ml_training_data',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  IntelMLTrainingData.associate = function(models) {
    if (models.User) {
      IntelMLTrainingData.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
    if (models.IntelAutomationAction) {
      IntelMLTrainingData.belongsTo(models.IntelAutomationAction, {
        foreignKey: 'action_id',
        as: 'action'
      });
    }
  };

  // Class methods

  /**
   * Record action feedback (approved/rejected)
   */
  IntelMLTrainingData.recordActionFeedback = async function(action, feedback) {
    return this.create({
      user_id: action.user_id,
      data_type: 'action_feedback',
      features: {
        entity_type: action.entity_type,
        action_type: action.action_type,
        trigger_metrics: action.trigger_metrics,
        model_confidence: action.model_confidence,
        features_used: action.features_used
      },
      label: feedback, // 'approved' or 'rejected'
      entity_type: action.entity_type,
      entity_id: action.entity_id,
      action_id: action.id
    });
  };

  /**
   * Record performance outcome (delayed feedback)
   */
  IntelMLTrainingData.recordPerformanceOutcome = async function(entityType, entityId, beforeMetrics, afterMetrics, actionTaken) {
    const improvement = this.calculateImprovement(beforeMetrics, afterMetrics);

    return this.create({
      data_type: 'performance_outcome',
      features: {
        before: beforeMetrics,
        action: actionTaken
      },
      label: improvement.category, // 'improved', 'stable', 'declined'
      label_value: improvement.percentage,
      entity_type: entityType,
      entity_id: entityId,
      outcome_measured: true,
      outcome_data: {
        before: beforeMetrics,
        after: afterMetrics,
        improvement
      },
      outcome_measured_at: new Date()
    });
  };

  /**
   * Record manual user action for learning
   */
  IntelMLTrainingData.recordManualAction = async function(userId, entityType, entityId, action, metrics) {
    return this.create({
      user_id: userId,
      data_type: 'manual_action',
      features: metrics,
      label: action, // e.g., 'pause', 'increase_budget', etc.
      entity_type: entityType,
      entity_id: entityId
    });
  };

  /**
   * Record success case
   */
  IntelMLTrainingData.recordSuccessCase = async function(entityType, entityId, features) {
    return this.create({
      data_type: 'success_case',
      features,
      label: 'success',
      label_value: 1,
      entity_type: entityType,
      entity_id: entityId
    });
  };

  /**
   * Record failure case
   */
  IntelMLTrainingData.recordFailureCase = async function(entityType, entityId, features) {
    return this.create({
      data_type: 'failure_case',
      features,
      label: 'failure',
      label_value: 0,
      entity_type: entityType,
      entity_id: entityId
    });
  };

  /**
   * Calculate improvement between before and after metrics
   */
  IntelMLTrainingData.calculateImprovement = function(before, after) {
    // Primary metric to track (can be customized)
    const primaryMetric = 'roas';
    const beforeValue = before[primaryMetric] || 0;
    const afterValue = after[primaryMetric] || 0;

    let percentage = 0;
    let category = 'stable';

    if (beforeValue > 0) {
      percentage = ((afterValue - beforeValue) / beforeValue) * 100;
    } else if (afterValue > 0) {
      percentage = 100; // Went from 0 to something
    }

    if (percentage > 10) category = 'improved';
    else if (percentage < -10) category = 'declined';

    return { percentage, category };
  };

  /**
   * Get training data for a specific label/data type
   */
  IntelMLTrainingData.getTrainingData = async function(options = {}) {
    const {
      dataType = null,
      label = null,
      limit = 10000,
      unused = true, // Only get data not yet used in training
      minSamples = 100
    } = options;

    const where = {};
    if (dataType) where.data_type = dataType;
    if (label) where.label = label;
    if (unused) where.used_in_training = false;

    const data = await this.findAll({
      where,
      limit,
      order: [['created_at', 'DESC']]
    });

    if (data.length < minSamples) {
      console.log(`⚠️ Insufficient training data: ${data.length} < ${minSamples}`);
    }

    return data;
  };

  /**
   * Get feature matrix for training
   */
  IntelMLTrainingData.getFeatureMatrix = async function(options = {}) {
    const data = await this.getTrainingData(options);

    const features = [];
    const labels = [];

    data.forEach(item => {
      features.push(item.features);
      labels.push(item.label_value !== null ? item.label_value : item.label);
    });

    return { features, labels, count: data.length };
  };

  /**
   * Mark data as used in training
   */
  IntelMLTrainingData.markAsUsed = async function(ids, modelVersion) {
    return this.update(
      {
        used_in_training: true,
        model_version_used_in: modelVersion
      },
      {
        where: {
          id: ids
        }
      }
    );
  };

  /**
   * Get training data statistics
   */
  IntelMLTrainingData.getStats = async function() {
    const stats = {};

    // Count by data type
    const byType = await this.findAll({
      attributes: [
        'data_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['data_type'],
      raw: true
    });
    stats.by_type = Object.fromEntries(byType.map(r => [r.data_type, parseInt(r.count)]));

    // Count by label for action feedback
    const byLabel = await this.findAll({
      where: { data_type: 'action_feedback' },
      attributes: [
        'label',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['label'],
      raw: true
    });
    stats.action_feedback_labels = Object.fromEntries(byLabel.map(r => [r.label, parseInt(r.count)]));

    // Unused data count
    const unusedCount = await this.count({
      where: { used_in_training: false }
    });
    stats.unused_count = unusedCount;

    // Total count
    stats.total = await this.count();

    return stats;
  };

  /**
   * Cleanup old used training data
   */
  IntelMLTrainingData.cleanupOld = async function(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return this.destroy({
      where: {
        used_in_training: true,
        created_at: {
          [sequelize.Sequelize.Op.lt]: cutoffDate
        }
      }
    });
  };

  return IntelMLTrainingData;
};
