'use strict';

/**
 * IntelAccountScore Model
 *
 * Stores daily account health scores with component breakdowns.
 * Provides a comprehensive view of account performance and health.
 *
 * ISOLATION: Read-only analysis of account data; never modifies accounts.
 */

module.exports = (sequelize, DataTypes) => {
  const IntelAccountScore = sequelize.define('IntelAccountScore', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ad_account_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    score_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // Overall score (0-100)
    overall_score: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // Component scores (0-100 each)
    performance_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    efficiency_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    pixel_health_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    learning_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    consistency_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Trends
    score_trend: {
      type: DataTypes.ENUM('improving', 'stable', 'declining'),
      defaultValue: 'stable'
    },
    trend_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      get() {
        const value = this.getDataValue('trend_percentage');
        return value ? parseFloat(value) : 0;
      }
    },
    // Details
    score_breakdown: {
      type: DataTypes.JSON,
      allowNull: true
    },
    recommendations: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'intel_account_scores',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'ad_account_id', 'score_date']
      }
    ]
  });

  // Associations
  IntelAccountScore.associate = function(models) {
    if (models.User) {
      IntelAccountScore.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  };

  // Instance methods

  /**
   * Get score grade (A-F)
   */
  IntelAccountScore.prototype.getGrade = function() {
    const score = this.overall_score;
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  /**
   * Get score status label
   */
  IntelAccountScore.prototype.getStatusLabel = function() {
    const score = this.overall_score;
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Improvement';
    return 'Critical';
  };

  /**
   * Get weakest component
   */
  IntelAccountScore.prototype.getWeakestComponent = function() {
    const components = {
      performance: this.performance_score,
      efficiency: this.efficiency_score,
      pixel_health: this.pixel_health_score,
      learning: this.learning_score,
      consistency: this.consistency_score
    };

    let weakest = { name: null, score: 101 };
    for (const [name, score] of Object.entries(components)) {
      if (score < weakest.score) {
        weakest = { name, score };
      }
    }
    return weakest;
  };

  /**
   * Get improvement priority
   */
  IntelAccountScore.prototype.getImprovementPriority = function() {
    const weakest = this.getWeakestComponent();
    const priorities = {
      performance: 'Focus on improving ROAS and reducing CPA',
      efficiency: 'Reduce wasted spend and improve targeting',
      pixel_health: 'Improve pixel event tracking and EMQ',
      learning: 'Optimize ad sets for learning phase success',
      consistency: 'Maintain consistent performance over time'
    };
    return {
      component: weakest.name,
      score: weakest.score,
      recommendation: priorities[weakest.name]
    };
  };

  // Class methods

  /**
   * Get latest score for an account
   */
  IntelAccountScore.getLatestScore = async function(userId, adAccountId) {
    return this.findOne({
      where: {
        user_id: userId,
        ad_account_id: adAccountId
      },
      order: [['score_date', 'DESC']]
    });
  };

  /**
   * Get score history for an account
   */
  IntelAccountScore.getScoreHistory = async function(userId, adAccountId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.findAll({
      where: {
        user_id: userId,
        ad_account_id: adAccountId,
        score_date: {
          [sequelize.Sequelize.Op.gte]: startDate.toISOString().split('T')[0]
        }
      },
      order: [['score_date', 'ASC']]
    });
  };

  /**
   * Get all accounts ranked by score for a user
   */
  IntelAccountScore.getAccountRankings = async function(userId) {
    const { Op } = sequelize.Sequelize;

    // Get the latest score for each account
    const latestScores = await this.findAll({
      where: { user_id: userId },
      attributes: [
        'ad_account_id',
        [sequelize.fn('MAX', sequelize.col('score_date')), 'latest_date']
      ],
      group: ['ad_account_id'],
      raw: true
    });

    if (latestScores.length === 0) return [];

    // Get the full records for those latest scores
    const rankings = await this.findAll({
      where: {
        user_id: userId,
        [Op.or]: latestScores.map(s => ({
          ad_account_id: s.ad_account_id,
          score_date: s.latest_date
        }))
      },
      order: [['overall_score', 'DESC']]
    });

    return rankings;
  };

  /**
   * Calculate and store a new score
   */
  IntelAccountScore.calculateScore = async function(data) {
    const {
      userId,
      adAccountId,
      performanceMetrics,
      pixelHealth,
      learningPhaseStats,
      historicalData
    } = data;

    // Performance score (ROAS, CPA trends)
    let performanceScore = 50;
    if (performanceMetrics) {
      if (performanceMetrics.roas > 200) performanceScore += 30;
      else if (performanceMetrics.roas > 100) performanceScore += 15;
      if (performanceMetrics.cpa_trend === 'decreasing') performanceScore += 20;
      else if (performanceMetrics.cpa_trend === 'stable') performanceScore += 10;
    }

    // Efficiency score (waste reduction)
    let efficiencyScore = 50;
    if (performanceMetrics) {
      const wastePercentage = performanceMetrics.waste_percentage || 0;
      efficiencyScore = Math.max(0, 100 - wastePercentage * 2);
    }

    // Pixel health score
    let pixelHealthScore = 50;
    if (pixelHealth) {
      pixelHealthScore = pixelHealth.calculateHealthScore
        ? pixelHealth.calculateHealthScore()
        : (pixelHealth.event_match_quality || 5) * 10;
    }

    // Learning score
    let learningScore = 50;
    if (learningPhaseStats) {
      const successRate = learningPhaseStats.success_rate || 0;
      learningScore = Math.round(successRate);
    }

    // Consistency score (performance variance)
    let consistencyScore = 50;
    if (historicalData && historicalData.length > 7) {
      const values = historicalData.map(d => d.roas || 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
      consistencyScore = Math.round(Math.max(0, 100 - cv * 100));
    }

    // Overall score (weighted average)
    const weights = {
      performance: 0.35,
      efficiency: 0.25,
      pixel_health: 0.15,
      learning: 0.15,
      consistency: 0.10
    };

    const overallScore = Math.round(
      performanceScore * weights.performance +
      efficiencyScore * weights.efficiency +
      pixelHealthScore * weights.pixel_health +
      learningScore * weights.learning +
      consistencyScore * weights.consistency
    );

    // Determine trend
    const previousScore = await this.getLatestScore(userId, adAccountId);
    let scoreTrend = 'stable';
    let trendPercentage = 0;

    if (previousScore) {
      const change = overallScore - previousScore.overall_score;
      trendPercentage = (change / previousScore.overall_score * 100).toFixed(2);
      if (change > 5) scoreTrend = 'improving';
      else if (change < -5) scoreTrend = 'declining';
    }

    // Generate recommendations
    const recommendations = [];
    if (performanceScore < 70) {
      recommendations.push('Focus on optimizing ROAS by reviewing underperforming ad sets');
    }
    if (efficiencyScore < 70) {
      recommendations.push('Reduce wasted spend by pausing low-performing entities');
    }
    if (pixelHealthScore < 70) {
      recommendations.push('Improve pixel tracking by implementing server-side events');
    }
    if (learningScore < 70) {
      recommendations.push('Optimize budget allocation to help ad sets exit learning phase');
    }
    if (consistencyScore < 70) {
      recommendations.push('Investigate causes of performance volatility');
    }

    // Create or update score
    const today = new Date().toISOString().split('T')[0];

    const [score, created] = await this.upsert({
      user_id: userId,
      ad_account_id: adAccountId,
      score_date: today,
      overall_score: overallScore,
      performance_score: performanceScore,
      efficiency_score: efficiencyScore,
      pixel_health_score: pixelHealthScore,
      learning_score: learningScore,
      consistency_score: consistencyScore,
      score_trend: scoreTrend,
      trend_percentage: trendPercentage,
      score_breakdown: {
        performance: { score: performanceScore, weight: weights.performance },
        efficiency: { score: efficiencyScore, weight: weights.efficiency },
        pixel_health: { score: pixelHealthScore, weight: weights.pixel_health },
        learning: { score: learningScore, weight: weights.learning },
        consistency: { score: consistencyScore, weight: weights.consistency }
      },
      recommendations
    });

    return score || await this.findOne({
      where: {
        user_id: userId,
        ad_account_id: adAccountId,
        score_date: today
      }
    });
  };

  return IntelAccountScore;
};
