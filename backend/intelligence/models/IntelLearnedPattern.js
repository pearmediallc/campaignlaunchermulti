'use strict';

/**
 * IntelLearnedPattern Model
 *
 * Stores patterns discovered by ML algorithms including:
 * - Time performance patterns
 * - Budget-performance correlations
 * - Audience fatigue patterns
 * - K-means cluster assignments
 * - Winner/loser profiles
 *
 * ISOLATION: Patterns are learned from read-only data access.
 */

module.exports = (sequelize, DataTypes) => {
  const IntelLearnedPattern = sequelize.define('IntelLearnedPattern', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Null for global patterns'
    },
    ad_account_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Null for account-agnostic patterns'
    },
    pattern_type: {
      type: DataTypes.ENUM(
        'time_performance',
        'budget_correlation',
        'audience_fatigue',
        'creative_lifecycle',
        'learning_predictor',
        'winner_profile',
        'loser_profile',
        'cluster'
      ),
      allowNull: false
    },
    pattern_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pattern_data: {
      type: DataTypes.JSON,
      allowNull: false
    },
    confidence_score: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      get() {
        const value = this.getDataValue('confidence_score');
        return value ? parseFloat(value) : 0;
      }
    },
    sample_size: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    valid_from: {
      type: DataTypes.DATE,
      allowNull: true
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_validated: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'intel_learned_patterns',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  IntelLearnedPattern.associate = function(models) {
    if (models.User) {
      IntelLearnedPattern.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  };

  // Instance methods

  /**
   * Check if pattern is still valid
   */
  IntelLearnedPattern.prototype.isStillValid = function() {
    if (!this.is_active) return false;
    if (this.valid_until && new Date() > new Date(this.valid_until)) {
      return false;
    }
    return true;
  };

  /**
   * Check if pattern needs revalidation
   */
  IntelLearnedPattern.prototype.needsRevalidation = function(maxAgeDays = 7) {
    if (!this.last_validated) return true;
    const daysSinceValidation = (new Date() - new Date(this.last_validated)) / (1000 * 60 * 60 * 24);
    return daysSinceValidation > maxAgeDays;
  };

  /**
   * Apply pattern to predict outcome
   */
  IntelLearnedPattern.prototype.predict = function(inputData) {
    const { pattern_type, pattern_data } = this;

    switch (pattern_type) {
      case 'time_performance':
        return this.predictTimePerformance(inputData);
      case 'budget_correlation':
        return this.predictBudgetImpact(inputData);
      case 'audience_fatigue':
        return this.predictFatigue(inputData);
      case 'winner_profile':
      case 'loser_profile':
        return this.matchProfile(inputData);
      case 'cluster':
        return this.assignCluster(inputData);
      default:
        return { applicable: false, reason: 'Unknown pattern type' };
    }
  };

  /**
   * Predict best performing times
   */
  IntelLearnedPattern.prototype.predictTimePerformance = function(inputData) {
    const { hourlyPerformance } = this.pattern_data;
    if (!hourlyPerformance) return { applicable: false };

    const currentHour = inputData.hour || new Date().getHours();
    const expectedPerformance = hourlyPerformance[currentHour] || 'average';

    return {
      applicable: true,
      prediction: expectedPerformance,
      best_hours: Object.entries(hourlyPerformance)
        .filter(([_, perf]) => perf === 'high')
        .map(([hour, _]) => parseInt(hour)),
      confidence: this.confidence_score
    };
  };

  /**
   * Predict budget impact
   */
  IntelLearnedPattern.prototype.predictBudgetImpact = function(inputData) {
    const { budgetRanges, optimalRange } = this.pattern_data;
    if (!budgetRanges || !inputData.budget) return { applicable: false };

    const budget = inputData.budget;
    let expectedOutcome = 'average';

    for (const range of budgetRanges) {
      if (budget >= range.min && budget <= range.max) {
        expectedOutcome = range.performance;
        break;
      }
    }

    return {
      applicable: true,
      current_budget: budget,
      expected_outcome: expectedOutcome,
      optimal_range: optimalRange,
      confidence: this.confidence_score
    };
  };

  /**
   * Predict audience fatigue
   */
  IntelLearnedPattern.prototype.predictFatigue = function(inputData) {
    const { fatigueThreshold, frequencyDecay } = this.pattern_data;
    const frequency = inputData.frequency || 1;

    const fatigueLevel = frequency > fatigueThreshold ? 'high' :
      frequency > fatigueThreshold * 0.7 ? 'medium' : 'low';

    return {
      applicable: true,
      frequency,
      fatigue_level: fatigueLevel,
      threshold: fatigueThreshold,
      days_until_fatigue: fatigueLevel === 'low'
        ? Math.ceil((fatigueThreshold - frequency) / frequencyDecay)
        : 0,
      confidence: this.confidence_score
    };
  };

  /**
   * Match against winner/loser profile
   */
  IntelLearnedPattern.prototype.matchProfile = function(inputData) {
    const { profile } = this.pattern_data;
    if (!profile) return { applicable: false };

    let matchScore = 0;
    let matchedAttributes = [];
    let totalAttributes = Object.keys(profile).length;

    for (const [attr, expectedValue] of Object.entries(profile)) {
      const actualValue = inputData[attr];
      if (actualValue === undefined) continue;

      // Check if value matches or is within range
      if (typeof expectedValue === 'object' && expectedValue.min !== undefined) {
        if (actualValue >= expectedValue.min && actualValue <= expectedValue.max) {
          matchScore++;
          matchedAttributes.push(attr);
        }
      } else if (actualValue === expectedValue) {
        matchScore++;
        matchedAttributes.push(attr);
      }
    }

    const matchPercentage = totalAttributes > 0 ? (matchScore / totalAttributes * 100) : 0;

    return {
      applicable: true,
      pattern_type: this.pattern_type,
      match_percentage: matchPercentage,
      matched_attributes: matchedAttributes,
      is_match: matchPercentage >= 70,
      confidence: this.confidence_score * (matchPercentage / 100)
    };
  };

  /**
   * Assign to K-means cluster
   */
  IntelLearnedPattern.prototype.assignCluster = function(inputData) {
    const { centroids, feature_names } = this.pattern_data;
    if (!centroids || !feature_names) return { applicable: false };

    // Calculate distances to each centroid
    const distances = centroids.map((centroid, idx) => {
      let distance = 0;
      for (let i = 0; i < feature_names.length; i++) {
        const featureName = feature_names[i];
        const value = inputData[featureName] || 0;
        const centroidValue = centroid[i] || 0;
        distance += Math.pow(value - centroidValue, 2);
      }
      return { cluster: idx, distance: Math.sqrt(distance) };
    });

    distances.sort((a, b) => a.distance - b.distance);
    const assigned = distances[0];

    return {
      applicable: true,
      assigned_cluster: assigned.cluster,
      distance_to_centroid: assigned.distance,
      cluster_distances: distances,
      confidence: this.confidence_score
    };
  };

  // Class methods

  /**
   * Get active patterns for a user/account
   */
  IntelLearnedPattern.getActivePatterns = async function(userId = null, adAccountId = null) {
    const { Op } = sequelize.Sequelize;
    const where = {
      is_active: true,
      [Op.or]: [
        { valid_until: null },
        { valid_until: { [Op.gt]: new Date() } }
      ]
    };

    if (userId) {
      where[Op.and] = [
        {
          [Op.or]: [
            { user_id: null },
            { user_id: userId }
          ]
        }
      ];
    }

    if (adAccountId) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { ad_account_id: null },
          { ad_account_id: adAccountId }
        ]
      });
    }

    return this.findAll({
      where,
      order: [['confidence_score', 'DESC']]
    });
  };

  /**
   * Get patterns by type
   */
  IntelLearnedPattern.getByType = async function(patternType, userId = null, adAccountId = null) {
    const patterns = await this.getActivePatterns(userId, adAccountId);
    return patterns.filter(p => p.pattern_type === patternType);
  };

  /**
   * Deactivate stale patterns
   */
  IntelLearnedPattern.deactivateStalePatterns = async function() {
    const [count] = await this.update(
      { is_active: false },
      {
        where: {
          is_active: true,
          valid_until: {
            [sequelize.Sequelize.Op.lt]: new Date()
          }
        }
      }
    );
    return count;
  };

  return IntelLearnedPattern;
};
