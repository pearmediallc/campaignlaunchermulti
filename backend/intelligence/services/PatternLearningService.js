'use strict';

/**
 * PatternLearningService
 *
 * Learns patterns from performance data using:
 * - Statistical analysis for time patterns
 * - K-means clustering for entity classification
 * - Profile matching for winner/loser identification
 * - Expert rules as baseline/seed data
 *
 * ISOLATION PRINCIPLE:
 * - Reads data from intel_* tables only
 * - Stores patterns in intel_learned_patterns
 * - Never modifies campaign data
 */

const intelModels = require('../models');
const ExpertRulesService = require('./ExpertRulesService');

class PatternLearningService {
  constructor() {
    this.learningInProgress = false;
    // Feature names for clustering
    this.clusterFeatures = ['cpm', 'ctr', 'cpc', 'cpa', 'roas', 'frequency'];
    // Cache for expert rules
    this.expertRulesCache = null;
    this.expertRulesCacheTime = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get expert rules with caching
   */
  async getExpertRules() {
    const now = Date.now();
    if (this.expertRulesCache && this.expertRulesCacheTime && (now - this.expertRulesCacheTime) < this.CACHE_TTL) {
      return this.expertRulesCache;
    }

    try {
      const summary = await ExpertRulesService.getRulesSummary();
      this.expertRulesCache = summary;
      this.expertRulesCacheTime = now;
      return summary;
    } catch (error) {
      console.error('Error fetching expert rules:', error.message);
      return null;
    }
  }

  /**
   * Run all pattern learning jobs
   */
  async learnAllPatterns() {
    if (this.learningInProgress) {
      console.log('⏳ Pattern learning already in progress, skipping...');
      return;
    }

    this.learningInProgress = true;
    console.log('🧠 [PatternLearning] Starting pattern learning...');

    try {
      const results = {
        time_patterns: 0,
        winner_profiles: 0,
        loser_profiles: 0,
        clusters: 0,
        fatigue_patterns: 0,
        expert_baseline: 0
      };

      // First, seed expert rules as baseline patterns
      results.expert_baseline = await this.seedExpertBaseline();

      // Learn time performance patterns
      results.time_patterns = await this.learnTimePatterns();

      // Learn winner/loser profiles (enhanced with expert thresholds)
      const profiles = await this.learnPerformanceProfiles();
      results.winner_profiles = profiles.winners;
      results.loser_profiles = profiles.losers;

      // Run K-means clustering
      results.clusters = await this.runClustering();

      // Learn fatigue patterns
      results.fatigue_patterns = await this.learnFatiguePatterns();

      console.log('✅ [PatternLearning] Complete:', results);
      return results;

    } finally {
      this.learningInProgress = false;
    }
  }

  /**
   * Seed expert rules as baseline patterns
   * This provides initial thresholds from expert knowledge before
   * the system has accumulated enough data for ML-based learning
   */
  async seedExpertBaseline() {
    console.log('  📚 Seeding expert baseline patterns...');

    try {
      const expertRules = await this.getExpertRules();
      if (!expertRules || expertRules.total === 0) {
        console.log('    No expert rules found');
        return 0;
      }

      let patternsCreated = 0;

      // Get kill thresholds by vertical
      const verticals = ['home_insurance', 'auto_insurance', 'medicare', 'aca', 'final_expense', 'solar', 'roofing'];

      for (const vertical of verticals) {
        const killRules = await ExpertRulesService.getKillThresholds(vertical);
        const scaleRules = await ExpertRulesService.getScaleThresholds(vertical);
        const benchmarks = await ExpertRulesService.getBenchmarks(vertical);

        // Create kill threshold pattern
        if (killRules.length > 0) {
          const avgMultiplier = killRules.reduce((sum, r) => {
            const match = r.conditions?.spend_threshold?.match(/(\d+\.?\d*)x/);
            return sum + (match ? parseFloat(match[1]) : 1);
          }, 0) / killRules.length;

          await this.storePattern({
            pattern_type: 'expert_kill_threshold',
            pattern_name: `Kill Threshold - ${vertical}`,
            description: `Expert-defined kill threshold for ${vertical} vertical`,
            pattern_data: {
              vertical,
              avg_payout_multiplier: avgMultiplier,
              rules: killRules.map(r => ({
                name: r.name,
                conditions: r.conditions,
                confidence: r.confidence_score
              }))
            },
            confidence_score: 0.9, // Expert knowledge = high confidence
            sample_size: killRules.length
          });
          patternsCreated++;
        }

        // Create scale threshold pattern
        if (scaleRules.length > 0) {
          const avgRoiTarget = scaleRules.reduce((sum, r) => {
            return sum + (r.conditions?.roi_threshold || 100);
          }, 0) / scaleRules.length;

          await this.storePattern({
            pattern_type: 'expert_scale_threshold',
            pattern_name: `Scale Threshold - ${vertical}`,
            description: `Expert-defined scale threshold for ${vertical} vertical`,
            pattern_data: {
              vertical,
              avg_roi_target: avgRoiTarget,
              rules: scaleRules.map(r => ({
                name: r.name,
                conditions: r.conditions,
                confidence: r.confidence_score
              }))
            },
            confidence_score: 0.9,
            sample_size: scaleRules.length
          });
          patternsCreated++;
        }

        // Create benchmark pattern
        if (benchmarks.length > 0) {
          const avgBenchmarks = benchmarks.reduce((acc, b) => {
            if (b.conditions?.cpc_max) acc.cpc_max += b.conditions.cpc_max;
            if (b.conditions?.cpm_min) acc.cpm_min += b.conditions.cpm_min;
            if (b.conditions?.cpm_max) acc.cpm_max += b.conditions.cpm_max;
            if (b.conditions?.roi_target) acc.roi_target += b.conditions.roi_target;
            acc.count++;
            return acc;
          }, { cpc_max: 0, cpm_min: 0, cpm_max: 0, roi_target: 0, count: 0 });

          if (avgBenchmarks.count > 0) {
            await this.storePattern({
              pattern_type: 'expert_benchmark',
              pattern_name: `Benchmarks - ${vertical}`,
              description: `Expert-defined performance benchmarks for ${vertical} vertical`,
              pattern_data: {
                vertical,
                cpc_max: avgBenchmarks.cpc_max / avgBenchmarks.count,
                cpm_range: {
                  min: avgBenchmarks.cpm_min / avgBenchmarks.count,
                  max: avgBenchmarks.cpm_max / avgBenchmarks.count
                },
                roi_target: avgBenchmarks.roi_target / avgBenchmarks.count,
                expert_count: avgBenchmarks.count
              },
              confidence_score: 0.85,
              sample_size: avgBenchmarks.count
            });
            patternsCreated++;
          }
        }
      }

      console.log(`    Created ${patternsCreated} expert baseline patterns`);
      return patternsCreated;

    } catch (error) {
      console.error('Error seeding expert baseline:', error.message);
      return 0;
    }
  }

  /**
   * Learn best performing times
   */
  async learnTimePatterns() {
    console.log('  📊 Learning time patterns...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all snapshots grouped by hour
    const snapshots = await intelModels.IntelPerformanceSnapshot.findAll({
      where: {
        entity_type: 'adset',
        snapshot_date: {
          [intelModels.Sequelize.Op.gte]: thirtyDaysAgo.toISOString().split('T')[0]
        },
        spend: {
          [intelModels.Sequelize.Op.gt]: 0
        }
      },
      raw: true
    });

    if (snapshots.length < 100) {
      console.log('    Insufficient data for time patterns');
      return 0;
    }

    // Group by hour and calculate average ROAS
    const hourlyPerformance = {};
    const hourlyCount = {};

    for (let h = 0; h < 24; h++) {
      hourlyPerformance[h] = { total_roas: 0, count: 0 };
    }

    snapshots.forEach(s => {
      const hour = s.hour_of_day;
      if (hour !== null && s.spend > 0) {
        const roas = s.revenue > 0 ? (s.revenue / s.spend * 100) : 0;
        hourlyPerformance[hour].total_roas += roas;
        hourlyPerformance[hour].count++;
      }
    });

    // Calculate averages and classify hours
    const avgRoasByHour = {};
    let totalAvgRoas = 0;
    let validHours = 0;

    for (let h = 0; h < 24; h++) {
      if (hourlyPerformance[h].count > 0) {
        avgRoasByHour[h] = hourlyPerformance[h].total_roas / hourlyPerformance[h].count;
        totalAvgRoas += avgRoasByHour[h];
        validHours++;
      }
    }

    const overallAvg = validHours > 0 ? totalAvgRoas / validHours : 0;
    const hourlyClassification = {};

    for (let h = 0; h < 24; h++) {
      if (avgRoasByHour[h] !== undefined) {
        if (avgRoasByHour[h] > overallAvg * 1.2) {
          hourlyClassification[h] = 'high';
        } else if (avgRoasByHour[h] < overallAvg * 0.8) {
          hourlyClassification[h] = 'low';
        } else {
          hourlyClassification[h] = 'average';
        }
      }
    }

    // Store the pattern
    await this.storePattern({
      pattern_type: 'time_performance',
      pattern_name: 'Hourly Performance Pattern (Global)',
      description: 'Best and worst performing hours based on ROAS',
      pattern_data: {
        hourlyPerformance: hourlyClassification,
        avgRoasByHour,
        overallAvg,
        bestHours: Object.entries(hourlyClassification)
          .filter(([_, v]) => v === 'high')
          .map(([h, _]) => parseInt(h)),
        worstHours: Object.entries(hourlyClassification)
          .filter(([_, v]) => v === 'low')
          .map(([h, _]) => parseInt(h))
      },
      confidence_score: Math.min(0.9, snapshots.length / 1000),
      sample_size: snapshots.length
    });

    return 1;
  }

  /**
   * Learn winner and loser profiles
   */
  async learnPerformanceProfiles() {
    console.log('  📊 Learning performance profiles...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get aggregated performance by entity
    const snapshots = await intelModels.IntelPerformanceSnapshot.findAll({
      where: {
        entity_type: 'adset',
        snapshot_date: {
          [intelModels.Sequelize.Op.gte]: sevenDaysAgo.toISOString().split('T')[0]
        },
        spend: {
          [intelModels.Sequelize.Op.gt]: 10 // Minimum spend threshold
        }
      },
      raw: true
    });

    if (snapshots.length < 50) {
      console.log('    Insufficient data for profiles');
      return { winners: 0, losers: 0 };
    }

    // Aggregate by entity
    const entityMetrics = {};

    snapshots.forEach(s => {
      const key = s.entity_id;
      if (!entityMetrics[key]) {
        entityMetrics[key] = {
          total_spend: 0,
          total_revenue: 0,
          total_conversions: 0,
          total_impressions: 0,
          total_clicks: 0,
          count: 0,
          cpm_sum: 0,
          ctr_sum: 0,
          frequency_sum: 0,
          days_since_creation: s.days_since_creation
        };
      }

      entityMetrics[key].total_spend += s.spend;
      entityMetrics[key].total_revenue += s.revenue;
      entityMetrics[key].total_conversions += s.conversions;
      entityMetrics[key].total_impressions += s.impressions;
      entityMetrics[key].total_clicks += s.clicks;
      entityMetrics[key].cpm_sum += s.cpm;
      entityMetrics[key].ctr_sum += s.ctr;
      entityMetrics[key].frequency_sum += s.frequency;
      entityMetrics[key].count++;
    });

    // Calculate final metrics and classify
    const entities = Object.entries(entityMetrics).map(([id, m]) => ({
      id,
      spend: m.total_spend,
      roas: m.total_spend > 0 ? (m.total_revenue / m.total_spend * 100) : 0,
      cpa: m.total_conversions > 0 ? (m.total_spend / m.total_conversions) : null,
      cpm: m.cpm_sum / m.count,
      ctr: m.ctr_sum / m.count,
      frequency: m.frequency_sum / m.count,
      days_since_creation: m.days_since_creation
    }));

    // Classify winners (ROAS > 150%) and losers (ROAS < 50%)
    const winners = entities.filter(e => e.roas > 150 && e.spend >= 50);
    const losers = entities.filter(e => e.roas < 50 && e.spend >= 50);

    let patternsCreated = 0;

    // Create winner profile
    if (winners.length >= 10) {
      const winnerProfile = this.calculateProfile(winners);
      await this.storePattern({
        pattern_type: 'winner_profile',
        pattern_name: 'High ROAS Ad Set Profile',
        description: 'Common characteristics of ad sets with ROAS > 150%',
        pattern_data: { profile: winnerProfile },
        confidence_score: Math.min(0.85, winners.length / 100),
        sample_size: winners.length
      });
      patternsCreated++;
    }

    // Create loser profile
    if (losers.length >= 10) {
      const loserProfile = this.calculateProfile(losers);
      await this.storePattern({
        pattern_type: 'loser_profile',
        pattern_name: 'Low ROAS Ad Set Profile',
        description: 'Common characteristics of ad sets with ROAS < 50%',
        pattern_data: { profile: loserProfile },
        confidence_score: Math.min(0.85, losers.length / 100),
        sample_size: losers.length
      });
      patternsCreated++;
    }

    return { winners: winners.length >= 10 ? 1 : 0, losers: losers.length >= 10 ? 1 : 0 };
  }

  /**
   * Calculate profile from a set of entities
   */
  calculateProfile(entities) {
    const metrics = ['cpm', 'ctr', 'frequency', 'days_since_creation'];
    const profile = {};

    metrics.forEach(metric => {
      const values = entities.map(e => e[metric]).filter(v => v !== null);
      if (values.length > 0) {
        values.sort((a, b) => a - b);
        const min = values[Math.floor(values.length * 0.25)]; // 25th percentile
        const max = values[Math.floor(values.length * 0.75)]; // 75th percentile
        profile[metric] = { min, max };
      }
    });

    return profile;
  }

  /**
   * Run K-means clustering on ad set data
   */
  async runClustering() {
    console.log('  📊 Running K-means clustering...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get data for clustering
    const snapshots = await intelModels.IntelPerformanceSnapshot.findAll({
      where: {
        entity_type: 'adset',
        snapshot_date: {
          [intelModels.Sequelize.Op.gte]: sevenDaysAgo.toISOString().split('T')[0]
        },
        spend: {
          [intelModels.Sequelize.Op.gt]: 10
        }
      },
      raw: true
    });

    if (snapshots.length < 50) {
      console.log('    Insufficient data for clustering');
      return 0;
    }

    // Prepare data points
    const dataPoints = snapshots.map(s => ({
      id: s.entity_id,
      features: this.clusterFeatures.map(f => s[f] || 0)
    }));

    // Normalize features
    const normalizedData = this.normalizeData(dataPoints);

    // Run K-means with k=4 (4 performance clusters)
    const k = 4;
    const { centroids, assignments } = this.kMeans(normalizedData, k);

    // Store cluster pattern
    await this.storePattern({
      pattern_type: 'cluster',
      pattern_name: 'Performance Clusters (K=4)',
      description: 'K-means clustering of ad sets by performance metrics',
      pattern_data: {
        centroids,
        feature_names: this.clusterFeatures,
        k,
        cluster_sizes: this.getClusterSizes(assignments, k),
        cluster_descriptions: this.describeCluster(centroids)
      },
      confidence_score: 0.75,
      sample_size: dataPoints.length
    });

    return 1;
  }

  /**
   * Normalize data for clustering
   */
  normalizeData(dataPoints) {
    const numFeatures = dataPoints[0].features.length;
    const mins = new Array(numFeatures).fill(Infinity);
    const maxs = new Array(numFeatures).fill(-Infinity);

    // Find min/max for each feature
    dataPoints.forEach(dp => {
      dp.features.forEach((val, i) => {
        mins[i] = Math.min(mins[i], val);
        maxs[i] = Math.max(maxs[i], val);
      });
    });

    // Normalize
    return dataPoints.map(dp => ({
      id: dp.id,
      features: dp.features.map((val, i) =>
        maxs[i] - mins[i] > 0 ? (val - mins[i]) / (maxs[i] - mins[i]) : 0
      )
    }));
  }

  /**
   * Simple K-means implementation
   */
  kMeans(data, k, maxIterations = 100) {
    const numFeatures = data[0].features.length;

    // Initialize centroids randomly
    let centroids = [];
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    for (let i = 0; i < k; i++) {
      centroids.push([...shuffled[i].features]);
    }

    let assignments = new Array(data.length).fill(0);
    let changed = true;
    let iterations = 0;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Assign points to nearest centroid
      data.forEach((point, idx) => {
        let minDist = Infinity;
        let nearestCluster = 0;

        centroids.forEach((centroid, cidx) => {
          const dist = this.euclideanDistance(point.features, centroid);
          if (dist < minDist) {
            minDist = dist;
            nearestCluster = cidx;
          }
        });

        if (assignments[idx] !== nearestCluster) {
          assignments[idx] = nearestCluster;
          changed = true;
        }
      });

      // Update centroids
      const newCentroids = centroids.map(() => new Array(numFeatures).fill(0));
      const counts = new Array(k).fill(0);

      data.forEach((point, idx) => {
        const cluster = assignments[idx];
        counts[cluster]++;
        point.features.forEach((val, fidx) => {
          newCentroids[cluster][fidx] += val;
        });
      });

      centroids = newCentroids.map((centroid, cidx) =>
        counts[cidx] > 0
          ? centroid.map(val => val / counts[cidx])
          : centroid
      );
    }

    return { centroids, assignments };
  }

  /**
   * Calculate Euclidean distance
   */
  euclideanDistance(a, b) {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    );
  }

  /**
   * Get cluster sizes
   */
  getClusterSizes(assignments, k) {
    const sizes = new Array(k).fill(0);
    assignments.forEach(cluster => sizes[cluster]++);
    return sizes;
  }

  /**
   * Describe clusters based on centroids
   */
  describeCluster(centroids) {
    return centroids.map((centroid, idx) => {
      const avgValue = centroid.reduce((a, b) => a + b, 0) / centroid.length;

      if (avgValue > 0.7) return `Cluster ${idx + 1}: High performers`;
      if (avgValue > 0.5) return `Cluster ${idx + 1}: Above average`;
      if (avgValue > 0.3) return `Cluster ${idx + 1}: Below average`;
      return `Cluster ${idx + 1}: Low performers`;
    });
  }

  /**
   * Learn audience fatigue patterns
   */
  async learnFatiguePatterns() {
    console.log('  📊 Learning fatigue patterns...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get entities with high frequency
    const snapshots = await intelModels.IntelPerformanceSnapshot.findAll({
      where: {
        entity_type: 'adset',
        snapshot_date: {
          [intelModels.Sequelize.Op.gte]: thirtyDaysAgo.toISOString().split('T')[0]
        },
        frequency: {
          [intelModels.Sequelize.Op.gt]: 1
        }
      },
      order: [['entity_id', 'ASC'], ['snapshot_date', 'ASC']],
      raw: true
    });

    if (snapshots.length < 100) {
      console.log('    Insufficient data for fatigue patterns');
      return 0;
    }

    // Analyze CTR decline with frequency increase
    const fatiguePoints = [];
    let prevEntityId = null;
    let prevCTR = null;

    snapshots.forEach(s => {
      if (s.entity_id === prevEntityId && prevCTR !== null) {
        const ctrChange = s.ctr - prevCTR;
        if (ctrChange < 0 && s.frequency > 2) {
          fatiguePoints.push({
            frequency: s.frequency,
            ctr_decline: Math.abs(ctrChange)
          });
        }
      }
      prevEntityId = s.entity_id;
      prevCTR = s.ctr;
    });

    if (fatiguePoints.length < 20) {
      return 0;
    }

    // Calculate average fatigue threshold
    const avgFatigueFrequency = fatiguePoints.reduce((sum, p) => sum + p.frequency, 0) / fatiguePoints.length;

    // Estimate frequency decay rate
    const avgCTRDecline = fatiguePoints.reduce((sum, p) => sum + p.ctr_decline, 0) / fatiguePoints.length;

    await this.storePattern({
      pattern_type: 'audience_fatigue',
      pattern_name: 'Audience Fatigue Pattern',
      description: 'Frequency threshold at which CTR typically declines',
      pattern_data: {
        fatigueThreshold: avgFatigueFrequency,
        frequencyDecay: avgCTRDecline,
        dataPoints: fatiguePoints.length
      },
      confidence_score: Math.min(0.8, fatiguePoints.length / 100),
      sample_size: fatiguePoints.length
    });

    return 1;
  }

  /**
   * Store a learned pattern
   */
  async storePattern(patternData) {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7); // Patterns valid for 7 days

    // Check if similar pattern exists
    const existing = await intelModels.IntelLearnedPattern.findOne({
      where: {
        pattern_type: patternData.pattern_type,
        pattern_name: patternData.pattern_name,
        user_id: patternData.user_id || null,
        ad_account_id: patternData.ad_account_id || null
      }
    });

    if (existing) {
      // Update existing pattern
      await existing.update({
        pattern_data: patternData.pattern_data,
        confidence_score: patternData.confidence_score,
        sample_size: patternData.sample_size,
        valid_until: validUntil,
        last_validated: new Date()
      });
      return existing;
    }

    // Create new pattern
    return intelModels.IntelLearnedPattern.create({
      ...patternData,
      is_active: true,
      valid_from: new Date(),
      valid_until: validUntil,
      last_validated: new Date()
    });
  }

  /**
   * Apply patterns to predict entity performance
   */
  async predictPerformance(entityType, entityId, currentMetrics) {
    const patterns = await intelModels.IntelLearnedPattern.getActivePatterns();

    const predictions = {
      winner_match: null,
      loser_match: null,
      fatigue_risk: null,
      cluster: null,
      best_times: []
    };

    for (const pattern of patterns) {
      const result = pattern.predict(currentMetrics);
      if (!result.applicable) continue;

      switch (pattern.pattern_type) {
        case 'winner_profile':
          predictions.winner_match = result;
          break;
        case 'loser_profile':
          predictions.loser_match = result;
          break;
        case 'audience_fatigue':
          predictions.fatigue_risk = result;
          break;
        case 'cluster':
          predictions.cluster = result;
          break;
        case 'time_performance':
          predictions.best_times = result.best_hours || [];
          break;
      }
    }

    return predictions;
  }

  /**
   * Get pattern insights for dashboard
   */
  async getPatternInsights(userId = null, adAccountId = null) {
    const patterns = await intelModels.IntelLearnedPattern.getActivePatterns(userId, adAccountId);

    return {
      total_patterns: patterns.length,
      by_type: this.groupPatternsByType(patterns),
      insights: patterns.map(p => ({
        type: p.pattern_type,
        name: p.pattern_name,
        description: p.description,
        confidence: (p.confidence_score * 100).toFixed(0) + '%',
        sample_size: p.sample_size,
        valid_until: p.valid_until
      }))
    };
  }

  /**
   * Group patterns by type
   */
  groupPatternsByType(patterns) {
    const grouped = {};
    patterns.forEach(p => {
      grouped[p.pattern_type] = (grouped[p.pattern_type] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Get training status for analytics dashboard
   */
  async getTrainingStatus(userId = null) {
    try {
      // Get data point counts
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [snapshotCount, patternCount, pixelCount] = await Promise.all([
        intelModels.IntelPerformanceSnapshot.count({
          where: userId ? { user_id: userId } : {},
        }),
        intelModels.IntelLearnedPattern.count({
          where: { is_active: true }
        }),
        intelModels.IntelPixelHealth ? intelModels.IntelPixelHealth.count({
          where: userId ? { user_id: userId } : {}
        }) : 0
      ]);

      // Get expert rules count
      const expertRules = await this.getExpertRules();
      const expertRulesCount = expertRules?.total || 0;

      // Calculate training readiness
      const minDataPoints = 100;
      const minPatterns = 3;
      const dataReadiness = Math.min(100, (snapshotCount / minDataPoints) * 100);
      const patternReadiness = Math.min(100, (patternCount / minPatterns) * 100);
      const expertReadiness = expertRulesCount > 0 ? 100 : 0;
      const overallReadiness = (dataReadiness * 0.4 + patternReadiness * 0.3 + expertReadiness * 0.3);

      return {
        data_points: snapshotCount,
        patterns_learned: patternCount,
        pixel_data_points: pixelCount,
        expert_rules_loaded: expertRulesCount,
        readiness: {
          data: Math.round(dataReadiness),
          patterns: Math.round(patternReadiness),
          expert: Math.round(expertReadiness),
          overall: Math.round(overallReadiness)
        },
        status: overallReadiness >= 80 ? 'ready' : overallReadiness >= 50 ? 'learning' : 'collecting',
        last_learning_run: this.lastLearningRun || null
      };
    } catch (error) {
      console.error('Error getting training status:', error);
      return {
        data_points: 0,
        patterns_learned: 0,
        pixel_data_points: 0,
        expert_rules_loaded: 0,
        readiness: { data: 0, patterns: 0, expert: 0, overall: 0 },
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get training history for charts
   */
  async getTrainingHistory(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get daily snapshot counts
      const snapshots = await intelModels.IntelPerformanceSnapshot.findAll({
        attributes: [
          'snapshot_date',
          [intelModels.Sequelize.fn('COUNT', intelModels.Sequelize.col('id')), 'count']
        ],
        where: {
          snapshot_date: {
            [intelModels.Sequelize.Op.gte]: startDate.toISOString().split('T')[0]
          }
        },
        group: ['snapshot_date'],
        order: [['snapshot_date', 'ASC']],
        raw: true
      });

      // Get pattern creation history
      const patterns = await intelModels.IntelLearnedPattern.findAll({
        attributes: [
          [intelModels.Sequelize.fn('DATE', intelModels.Sequelize.col('created_at')), 'date'],
          'pattern_type',
          [intelModels.Sequelize.fn('COUNT', intelModels.Sequelize.col('id')), 'count']
        ],
        where: {
          created_at: {
            [intelModels.Sequelize.Op.gte]: startDate
          }
        },
        group: [intelModels.Sequelize.fn('DATE', intelModels.Sequelize.col('created_at')), 'pattern_type'],
        order: [[intelModels.Sequelize.fn('DATE', intelModels.Sequelize.col('created_at')), 'ASC']],
        raw: true
      });

      return {
        data_collection: snapshots.map(s => ({
          date: s.snapshot_date,
          count: parseInt(s.count)
        })),
        pattern_creation: patterns.map(p => ({
          date: p.date,
          type: p.pattern_type,
          count: parseInt(p.count)
        }))
      };
    } catch (error) {
      console.error('Error getting training history:', error);
      return { data_collection: [], pattern_creation: [] };
    }
  }

  /**
   * Get cluster data for visualization
   */
  async getClusterVisualization() {
    try {
      // Get the latest cluster pattern
      const clusterPattern = await intelModels.IntelLearnedPattern.findOne({
        where: {
          pattern_type: 'cluster',
          is_active: true
        },
        order: [['created_at', 'DESC']]
      });

      if (!clusterPattern) {
        return { clusters: [], centroids: [], feature_names: [] };
      }

      const patternData = clusterPattern.pattern_data;

      return {
        centroids: patternData.centroids || [],
        feature_names: patternData.feature_names || this.clusterFeatures,
        cluster_sizes: patternData.cluster_sizes || [],
        cluster_descriptions: patternData.cluster_descriptions || [],
        k: patternData.k || 4,
        sample_size: clusterPattern.sample_size,
        confidence: clusterPattern.confidence_score
      };
    } catch (error) {
      console.error('Error getting cluster visualization:', error);
      return { clusters: [], centroids: [], feature_names: [] };
    }
  }
}

module.exports = new PatternLearningService();
