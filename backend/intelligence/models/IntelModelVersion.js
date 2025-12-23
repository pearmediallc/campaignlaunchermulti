'use strict';

/**
 * IntelModelVersion Model
 *
 * Tracks ML model versions including:
 * - Model metadata and configuration
 * - Training metrics (accuracy, precision, recall, F1)
 * - Hyperparameters used
 * - Active/production status
 *
 * ISOLATION: Model versioning is internal to intelligence module.
 */

module.exports = (sequelize, DataTypes) => {
  const IntelModelVersion = sequelize.define('IntelModelVersion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    model_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false
    },
    model_type: {
      type: DataTypes.ENUM(
        'rules',
        'kmeans',
        'classifier',
        'regressor',
        'reinforcement'
      ),
      allowNull: false
    },
    model_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Serialized model for simple models'
    },
    model_file_path: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Path to model file for larger models'
    },
    training_data_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    training_started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    training_completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    accuracy: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      get() {
        const value = this.getDataValue('accuracy');
        return value ? parseFloat(value) : null;
      }
    },
    precision_score: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      get() {
        const value = this.getDataValue('precision_score');
        return value ? parseFloat(value) : null;
      }
    },
    recall_score: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      get() {
        const value = this.getDataValue('recall_score');
        return value ? parseFloat(value) : null;
      }
    },
    f1_score: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      get() {
        const value = this.getDataValue('f1_score');
        return value ? parseFloat(value) : null;
      }
    },
    hyperparameters: {
      type: DataTypes.JSON,
      allowNull: true
    },
    feature_columns: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_production: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'intel_model_versions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Instance methods

  /**
   * Get training duration
   */
  IntelModelVersion.prototype.getTrainingDuration = function() {
    if (!this.training_started_at || !this.training_completed_at) return null;
    return (new Date(this.training_completed_at) - new Date(this.training_started_at)) / 1000;
  };

  /**
   * Get metrics summary
   */
  IntelModelVersion.prototype.getMetricsSummary = function() {
    return {
      accuracy: this.accuracy ? (this.accuracy * 100).toFixed(2) + '%' : 'N/A',
      precision: this.precision_score ? (this.precision_score * 100).toFixed(2) + '%' : 'N/A',
      recall: this.recall_score ? (this.recall_score * 100).toFixed(2) + '%' : 'N/A',
      f1: this.f1_score ? (this.f1_score * 100).toFixed(2) + '%' : 'N/A'
    };
  };

  /**
   * Activate this version (deactivate others)
   */
  IntelModelVersion.prototype.activate = async function() {
    // Deactivate other versions of same model
    await IntelModelVersion.update(
      { is_active: false },
      {
        where: {
          model_name: this.model_name,
          id: { [sequelize.Sequelize.Op.ne]: this.id }
        }
      }
    );

    return this.update({ is_active: true });
  };

  /**
   * Promote to production
   */
  IntelModelVersion.prototype.promoteToProduction = async function() {
    // Remove production flag from other versions
    await IntelModelVersion.update(
      { is_production: false },
      {
        where: {
          model_name: this.model_name,
          id: { [sequelize.Sequelize.Op.ne]: this.id }
        }
      }
    );

    return this.update({
      is_active: true,
      is_production: true
    });
  };

  /**
   * Load model data
   */
  IntelModelVersion.prototype.loadModel = function() {
    if (this.model_data) {
      return this.model_data;
    }

    if (this.model_file_path) {
      // For larger models stored as files
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.resolve(this.model_file_path);

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(content);
      }
    }

    return null;
  };

  // Class methods

  /**
   * Get active model for a specific name
   */
  IntelModelVersion.getActiveModel = async function(modelName) {
    return this.findOne({
      where: {
        model_name: modelName,
        is_active: true
      }
    });
  };

  /**
   * Get production model for a specific name
   */
  IntelModelVersion.getProductionModel = async function(modelName) {
    return this.findOne({
      where: {
        model_name: modelName,
        is_production: true
      }
    });
  };

  /**
   * Get all versions for a model
   */
  IntelModelVersion.getVersionHistory = async function(modelName) {
    return this.findAll({
      where: { model_name: modelName },
      order: [['created_at', 'DESC']]
    });
  };

  /**
   * Create new version
   */
  IntelModelVersion.createVersion = async function(data) {
    // Generate version number
    const latestVersion = await this.findOne({
      where: { model_name: data.model_name },
      order: [['created_at', 'DESC']]
    });

    let newVersion = '1.0.0';
    if (latestVersion) {
      const parts = latestVersion.version.split('.').map(Number);
      parts[2]++; // Increment patch version
      newVersion = parts.join('.');
    }

    return this.create({
      ...data,
      version: data.version || newVersion
    });
  };

  /**
   * Get model comparison
   */
  IntelModelVersion.compareModels = async function(version1Id, version2Id) {
    const v1 = await this.findByPk(version1Id);
    const v2 = await this.findByPk(version2Id);

    if (!v1 || !v2) return null;

    return {
      version1: {
        version: v1.version,
        metrics: v1.getMetricsSummary(),
        training_count: v1.training_data_count
      },
      version2: {
        version: v2.version,
        metrics: v2.getMetricsSummary(),
        training_count: v2.training_data_count
      },
      comparison: {
        accuracy_diff: v1.accuracy && v2.accuracy
          ? ((v2.accuracy - v1.accuracy) * 100).toFixed(2) + '%'
          : 'N/A',
        f1_diff: v1.f1_score && v2.f1_score
          ? ((v2.f1_score - v1.f1_score) * 100).toFixed(2) + '%'
          : 'N/A'
      }
    };
  };

  /**
   * Get all model names with their latest versions
   */
  IntelModelVersion.getAllModels = async function() {
    const { Op } = sequelize.Sequelize;

    // Get distinct model names
    const modelNames = await this.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('model_name')), 'model_name']],
      raw: true
    });

    const models = [];
    for (const { model_name } of modelNames) {
      const latest = await this.findOne({
        where: { model_name },
        order: [['created_at', 'DESC']]
      });

      const production = await this.getProductionModel(model_name);
      const versionCount = await this.count({ where: { model_name } });

      models.push({
        name: model_name,
        latest_version: latest.version,
        production_version: production ? production.version : null,
        total_versions: versionCount,
        model_type: latest.model_type,
        is_production: !!production
      });
    }

    return models;
  };

  /**
   * Initialize default rules model
   */
  IntelModelVersion.initializeRulesModel = async function() {
    const existing = await this.getActiveModel('rules_engine');
    if (existing) return existing;

    return this.create({
      model_name: 'rules_engine',
      version: '1.0.0',
      model_type: 'rules',
      model_data: {
        default_rules: [
          {
            name: 'Stop Loss - High CPA',
            conditions: [{ metric: 'spend', operator: '>=', value: 50 }, { metric: 'cpa', operator: '>', value: 100 }],
            actions: [{ action: 'pause' }, { action: 'notify' }]
          },
          {
            name: 'Scale Winners',
            conditions: [{ metric: 'roas', operator: '>', value: 200 }, { metric: 'spend', operator: '>=', value: 100 }],
            actions: [{ action: 'increase_budget', params: { percentage: 20 } }]
          }
        ]
      },
      is_active: true,
      is_production: true,
      notes: 'Initial rules-based model'
    });
  };

  return IntelModelVersion;
};
