'use strict';

/**
 * ExpertRulesService
 *
 * Manages expert rules from media buyers.
 * Parses form submissions, creates structured rules,
 * and provides them to the automation engine.
 */

const intelModels = require('../models');

class ExpertRulesService {
  constructor() {
    this.verticalMappings = {
      'home insurance': 'home_insurance',
      'auto insurance': 'auto_insurance',
      'medicare': 'medicare',
      'guns': 'guns',
      'home improvement': 'home_improvement',
      'vsl': 'vsl',
      'bizopp': 'bizopp',
      'cbd': 'cbd',
      'meta': 'general'
    };

    this.stateMappings = {
      'texas': 'TX',
      'colorado': 'CO',
      'washington': 'WA',
      'florida': 'FL',
      'illinois': 'IL',
      'california': 'CA',
      'new york': 'NY',
      'newyork': 'NY',
      'new jersey': 'NJ',
      'newjersey': 'NJ'
    };
  }

  /**
   * Parse raw form submissions and create expert rules
   */
  async parseAndSeedRules(formSubmissions) {
    console.log('🧠 [ExpertRules] Parsing form submissions...');

    const results = {
      kill_rules: 0,
      scale_rules: 0,
      benchmark_rules: 0,
      targeting_rules: 0,
      structure_rules: 0,
      errors: []
    };

    // First pass: analyze all submissions to calculate confidence
    const ruleAggregations = this.aggregateRules(formSubmissions);

    // Second pass: create rules with confidence scores
    try {
      // Create kill rules
      results.kill_rules = await this.createKillRules(ruleAggregations.killRules);

      // Create scale rules
      results.scale_rules = await this.createScaleRules(ruleAggregations.scaleRules);

      // Create benchmark rules
      results.benchmark_rules = await this.createBenchmarkRules(ruleAggregations.benchmarks);

      // Create targeting rules (winning states)
      results.targeting_rules = await this.createTargetingRules(ruleAggregations.targeting);

      // Create structure rules
      results.structure_rules = await this.createStructureRules(ruleAggregations.structures);

    } catch (error) {
      console.error('Error creating rules:', error);
      results.errors.push(error.message);
    }

    console.log('✅ [ExpertRules] Complete:', results);
    return results;
  }

  /**
   * Aggregate rules from all submissions
   */
  aggregateRules(submissions) {
    const killRules = [];
    const scaleRules = [];
    const benchmarks = {};
    const targeting = {};
    const structures = {};

    submissions.forEach((sub, idx) => {
      const vertical = this.normalizeVertical(sub['What is your primary vertical or vertical with expertise and secondary expertise vertical?']);
      const timestamp = sub.Timestamp;

      // Parse kill points
      const killPoint = sub['What is your campaign/adset killing point ?'];
      if (killPoint) {
        const parsedKill = this.parseKillPoint(killPoint, vertical);
        parsedKill.forEach(rule => {
          rule.sourceIndex = idx;
          rule.timestamp = timestamp;
          killRules.push(rule);
        });
      }

      // Parse max loss point
      const maxLoss = sub['Max loss point in % of spending we can bear before killing the campaign or adset.'];
      if (maxLoss) {
        const parsedMaxLoss = this.parseMaxLoss(maxLoss, vertical);
        parsedMaxLoss.forEach(rule => {
          rule.sourceIndex = idx;
          rule.timestamp = timestamp;
          killRules.push(rule);
        });
      }

      // Parse scaling parameters
      const scalingParams = sub['Campaign budget increasing parameters you follow, based on all the parameter be it ROI, CPM or anything else mention the parameter and then the criteria.'];
      const scalingScenarios = sub['What is the parameter which makes you think campaign scaling should be done now, list all the scenarios?'];
      const roiScaling = sub['Can you tell what parameter apart from ROI u see for scaling?'];

      [scalingParams, scalingScenarios, roiScaling].forEach(text => {
        if (text) {
          const parsedScale = this.parseScaleRules(text, vertical);
          parsedScale.forEach(rule => {
            rule.sourceIndex = idx;
            rule.timestamp = timestamp;
            scaleRules.push(rule);
          });
        }
      });

      // Parse benchmarks from scaling parameters
      if (scalingParams) {
        const parsedBenchmarks = this.parseBenchmarks(scalingParams);
        Object.entries(parsedBenchmarks).forEach(([key, value]) => {
          if (!benchmarks[key]) {
            benchmarks[key] = { values: [], vertical };
          }
          benchmarks[key].values.push(value);
        });
      }

      // Parse winning states
      const winningStates = sub['Most winning target states, mention which are the common in all scenarios'];
      if (winningStates) {
        const states = this.parseStates(winningStates);
        states.winning.forEach(state => {
          if (!targeting[state]) {
            targeting[state] = { count: 0, type: 'winning' };
          }
          targeting[state].count++;
        });
        states.excluded.forEach(state => {
          if (!targeting[state]) {
            targeting[state] = { count: 0, type: 'excluded' };
          }
          targeting[state].type = 'excluded';
          targeting[state].count++;
        });
      }

      // Parse campaign structures
      const structureText = sub['Number of Adset and ads strategy you use '];
      if (structureText) {
        const parsedStructures = this.parseStructures(structureText);
        parsedStructures.forEach(structure => {
          if (!structures[structure]) {
            structures[structure] = { count: 0, verticals: [] };
          }
          structures[structure].count++;
          if (!structures[structure].verticals.includes(vertical)) {
            structures[structure].verticals.push(vertical);
          }
        });
      }
    });

    return { killRules, scaleRules, benchmarks, targeting, structures };
  }

  /**
   * Normalize vertical name
   */
  normalizeVertical(text) {
    if (!text) return 'general';
    const lower = text.toLowerCase().trim();

    for (const [key, value] of Object.entries(this.verticalMappings)) {
      if (lower.includes(key)) {
        return value;
      }
    }

    return 'general';
  }

  /**
   * Parse kill point text
   */
  parseKillPoint(text, vertical) {
    const rules = [];
    const lower = text.toLowerCase();

    // Parse dollar amounts
    const dollarMatches = text.match(/-?\$(\d+)/g);
    if (dollarMatches) {
      dollarMatches.forEach(match => {
        const amount = parseInt(match.replace(/[^0-9-]/g, ''));
        const isNegative = match.includes('-') || lower.includes('loss');

        // Check for campaign structure context
        let structure = null;
        if (lower.includes('1-50-1')) structure = '1-50-1';
        if (lower.includes('1-3-3')) structure = '1-3-3';
        if (lower.includes('normal')) structure = 'normal';

        rules.push({
          vertical,
          structure,
          type: 'absolute_loss',
          value: isNegative ? -Math.abs(amount) : -Math.abs(amount),
          condition: 'spend',
          lookback_days: lower.includes('3 day') ? 3 : (lower.includes('same day') ? 1 : 3)
        });
      });
    }

    // Parse "X times payout" patterns
    const payoutMatch = lower.match(/(\d+)\s*(?:to\s*\d+\s*)?(?:x|times?)\s*(?:of\s*)?(?:the\s*)?payout/i);
    if (payoutMatch) {
      rules.push({
        vertical,
        type: 'payout_multiplier',
        value: parseFloat(payoutMatch[1]),
        condition: 'no_conversion'
      });
    }

    // Parse percentage patterns
    const percentMatch = lower.match(/(\d+)(?:-\d+)?%/);
    if (percentMatch && lower.includes('budget')) {
      rules.push({
        vertical,
        type: 'budget_percentage',
        value: parseInt(percentMatch[1]),
        condition: 'no_benchmark'
      });
    }

    return rules;
  }

  /**
   * Parse max loss point
   */
  parseMaxLoss(text, vertical) {
    const rules = [];
    const lower = text.toLowerCase();

    // Parse percentage of budget
    const percentMatch = lower.match(/(\d+)(?:\s*-\s*(\d+))?%/);
    if (percentMatch) {
      const minPercent = parseInt(percentMatch[1]);
      const maxPercent = percentMatch[2] ? parseInt(percentMatch[2]) : minPercent;

      rules.push({
        vertical,
        type: 'max_loss_percentage',
        value: (minPercent + maxPercent) / 2,
        range: [minPercent, maxPercent]
      });
    }

    // Parse payout multiplier
    const payoutMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:x|times?)\s*(?:of\s*)?(?:the\s*)?payout/i);
    if (payoutMatch) {
      rules.push({
        vertical,
        type: 'payout_multiplier',
        value: parseFloat(payoutMatch[1])
      });
    }

    // Parse absolute dollar amounts
    const dollarMatch = text.match(/-?\$?(\d+)/);
    if (dollarMatch && !percentMatch && !payoutMatch) {
      rules.push({
        vertical,
        type: 'absolute_loss',
        value: -Math.abs(parseInt(dollarMatch[1]))
      });
    }

    // Check for structure-specific rules
    if (lower.includes('broad') || lower.includes('board')) {
      rules.forEach(r => r.targeting = 'broad');
    }
    if (lower.includes('state')) {
      rules.forEach(r => r.targeting = 'state');
    }

    return rules;
  }

  /**
   * Parse scale rules from text
   */
  parseScaleRules(text, vertical) {
    const rules = [];
    const lower = text.toLowerCase();

    // Parse ROI thresholds
    const roiMatches = lower.matchAll(/roi\s*(?:is\s*)?(?:greater\s*than\s*|above\s*|>\s*)?(\d+)(?:\s*-\s*(\d+))?%/gi);
    for (const match of roiMatches) {
      const minRoi = parseInt(match[1]);
      const maxRoi = match[2] ? parseInt(match[2]) : null;

      // Check for budget increase percentage in context
      const contextStart = Math.max(0, match.index - 100);
      const context = lower.substring(contextStart, match.index + 100);

      let budgetIncrease = 30; // Default
      const increaseMatch = context.match(/increase\s*(?:the\s*)?(?:budget\s*)?(\d+)%/i);
      if (increaseMatch) {
        budgetIncrease = parseInt(increaseMatch[1]);
      }

      rules.push({
        vertical,
        type: 'roi_threshold',
        roi_min: minRoi,
        roi_max: maxRoi,
        budget_increase: budgetIncrease,
        lookback_days: lower.includes('3 day') ? 3 : (lower.includes('same day') ? 1 : 1)
      });
    }

    // Parse conversion count thresholds
    const convMatch = lower.match(/(\d+)\s*conversions?/i);
    if (convMatch) {
      rules.push({
        vertical,
        type: 'conversion_threshold',
        min_conversions: parseInt(convMatch[1]),
        lookback_days: 3
      });
    }

    // Parse stability patterns
    if (lower.includes('stable') && (lower.includes('cpc') || lower.includes('cpm'))) {
      rules.push({
        vertical,
        type: 'stability_check',
        metrics: ['cpc', 'cpm'],
        lookback_days: 3
      });
    }

    return rules;
  }

  /**
   * Parse benchmark thresholds
   */
  parseBenchmarks(text) {
    const benchmarks = {};
    const lower = text.toLowerCase();

    // CPC thresholds
    const cpcMatch = lower.match(/cpc\s*(?:upto\s*|less\s*than\s*|<\s*)?(?:\$)?(\d+(?:\.\d+)?)/i);
    if (cpcMatch) {
      benchmarks.cpc_max = parseFloat(cpcMatch[1]);
    }

    // CPM thresholds
    const cpmMatch = lower.match(/cpm\s*(?:\()?(\d+)(?:\s*-\s*(\d+))?/i);
    if (cpmMatch) {
      benchmarks.cpm_min = parseInt(cpmMatch[1]);
      benchmarks.cpm_max = cpmMatch[2] ? parseInt(cpmMatch[2]) : benchmarks.cpm_min * 1.5;
    }

    // ROI thresholds
    const roiMatch = lower.match(/roi\s*(?:\()?(?:upto\s*)?(\d+)%?/i);
    if (roiMatch) {
      benchmarks.roi_target = parseInt(roiMatch[1]);
    }

    return benchmarks;
  }

  /**
   * Parse states from text
   */
  parseStates(text) {
    const lower = text.toLowerCase();
    const winning = [];
    const excluded = [];

    // Check for exclusion pattern
    const isExclusion = lower.includes('exclud') || lower.includes('except');

    // Parse state names
    for (const [name, abbrev] of Object.entries(this.stateMappings)) {
      if (lower.includes(name)) {
        if (isExclusion) {
          excluded.push(abbrev);
        } else {
          winning.push(abbrev);
        }
      }
    }

    // Also check for state abbreviations
    const abbrevMatches = text.match(/\b([A-Z]{2})\b/g);
    if (abbrevMatches) {
      abbrevMatches.forEach(abbrev => {
        if (!winning.includes(abbrev) && !excluded.includes(abbrev)) {
          if (isExclusion) {
            excluded.push(abbrev);
          } else {
            winning.push(abbrev);
          }
        }
      });
    }

    return { winning, excluded };
  }

  /**
   * Parse campaign structures
   */
  parseStructures(text) {
    const structures = [];
    const matches = text.match(/\d+-\d+-\d+/g);

    if (matches) {
      matches.forEach(match => structures.push(match));
    }

    // Also look for descriptive patterns
    if (text.toLowerCase().includes('abo')) structures.push('ABO');
    if (text.toLowerCase().includes('cbo')) structures.push('CBO');

    return structures;
  }

  /**
   * Create kill rules in database
   */
  async createKillRules(killRules) {
    // Group similar rules and calculate confidence
    const grouped = this.groupSimilarRules(killRules, 'type');
    let created = 0;

    for (const [key, group] of Object.entries(grouped)) {
      const expertCount = new Set(group.map(r => r.sourceIndex)).size;
      const confidence = Math.min(0.9, 0.3 + (expertCount * 0.15));

      // Calculate average values
      const avgValue = group.reduce((sum, r) => sum + r.value, 0) / group.length;

      const vertical = group[0].vertical;
      const structure = group[0].structure;

      try {
        await intelModels.IntelExpertRule.upsert({
          name: `Kill Rule: ${vertical} ${structure || 'standard'}`,
          description: `Kill when loss exceeds threshold for ${vertical} campaigns`,
          vertical: vertical,
          rule_type: 'kill',
          campaign_structure: structure,
          conditions: [{
            metric: group[0].type === 'absolute_loss' ? 'profit' : 'roi',
            operator: '<',
            value: avgValue,
            lookback_days: group[0].lookback_days || 3
          }],
          actions: [{ action: 'pause', target: 'entity' }],
          confidence_score: confidence,
          expert_count: expertCount,
          source: 'form_submission',
          source_references: group.map(r => r.timestamp)
        });
        created++;
      } catch (error) {
        console.error('Error creating kill rule:', error.message);
      }
    }

    return created;
  }

  /**
   * Create scale rules in database
   */
  async createScaleRules(scaleRules) {
    const grouped = this.groupSimilarRules(scaleRules, 'type');
    let created = 0;

    for (const [key, group] of Object.entries(grouped)) {
      const expertCount = new Set(group.map(r => r.sourceIndex)).size;
      const confidence = Math.min(0.9, 0.3 + (expertCount * 0.15));

      // Get the rule type specifics
      const ruleType = group[0].type;
      let conditions = [];
      let actions = [];

      if (ruleType === 'roi_threshold') {
        const avgRoi = group.reduce((sum, r) => sum + r.roi_min, 0) / group.length;
        const avgIncrease = group.reduce((sum, r) => sum + (r.budget_increase || 30), 0) / group.length;

        conditions = [{
          metric: 'roi',
          operator: '>',
          value: avgRoi,
          lookback_days: group[0].lookback_days || 1
        }];
        actions = [{
          action: 'increase_budget',
          parameters: { percentage: Math.round(avgIncrease) }
        }];
      } else if (ruleType === 'conversion_threshold') {
        const avgConv = group.reduce((sum, r) => sum + r.min_conversions, 0) / group.length;

        conditions = [{
          metric: 'conversions',
          operator: '>=',
          value: Math.round(avgConv),
          lookback_days: 3
        }];
        actions = [{ action: 'flag_for_scaling' }];
      }

      if (conditions.length === 0) continue;

      try {
        await intelModels.IntelExpertRule.upsert({
          name: `Scale Rule: ${ruleType.replace(/_/g, ' ')}`,
          description: `Scale based on ${ruleType} criteria`,
          vertical: group[0].vertical,
          rule_type: 'scale',
          conditions,
          actions,
          confidence_score: confidence,
          expert_count: expertCount,
          source: 'form_submission',
          source_references: group.map(r => r.timestamp)
        });
        created++;
      } catch (error) {
        console.error('Error creating scale rule:', error.message);
      }
    }

    return created;
  }

  /**
   * Create benchmark rules
   */
  async createBenchmarkRules(benchmarks) {
    const thresholds = {};

    // Aggregate benchmarks
    for (const [metric, data] of Object.entries(benchmarks)) {
      if (data.values.length > 0) {
        // Use median value
        const sorted = [...data.values].sort((a, b) => a - b);
        thresholds[metric] = sorted[Math.floor(sorted.length / 2)];
      }
    }

    if (Object.keys(thresholds).length === 0) return 0;

    try {
      await intelModels.IntelExpertRule.upsert({
        name: 'Performance Benchmarks',
        description: 'Aggregated performance benchmarks from media buyers',
        vertical: 'all',
        rule_type: 'benchmark',
        conditions: [],
        thresholds,
        actions: [],
        confidence_score: 0.7,
        expert_count: Object.keys(benchmarks).length,
        source: 'form_submission'
      });
      return 1;
    } catch (error) {
      console.error('Error creating benchmark rule:', error.message);
      return 0;
    }
  }

  /**
   * Create targeting rules (winning states)
   */
  async createTargetingRules(targeting) {
    const winningStates = [];
    const excludedStates = [];

    for (const [state, data] of Object.entries(targeting)) {
      if (data.type === 'winning' && data.count >= 2) {
        winningStates.push({ state, count: data.count });
      } else if (data.type === 'excluded') {
        excludedStates.push({ state, count: data.count });
      }
    }

    if (winningStates.length === 0) return 0;

    try {
      await intelModels.IntelExpertRule.upsert({
        name: 'Winning States Pattern',
        description: 'States with highest success rate according to media buyers',
        vertical: 'all',
        rule_type: 'targeting',
        conditions: [],
        winning_states: {
          winning: winningStates.sort((a, b) => b.count - a.count),
          excluded: excludedStates
        },
        actions: [],
        confidence_score: Math.min(0.85, 0.4 + (winningStates.length * 0.1)),
        expert_count: winningStates.reduce((sum, s) => sum + s.count, 0),
        source: 'form_submission'
      });
      return 1;
    } catch (error) {
      console.error('Error creating targeting rule:', error.message);
      return 0;
    }
  }

  /**
   * Create structure rules
   */
  async createStructureRules(structures) {
    let created = 0;

    for (const [structure, data] of Object.entries(structures)) {
      if (data.count < 2) continue;

      try {
        await intelModels.IntelExpertRule.upsert({
          name: `Campaign Structure: ${structure}`,
          description: `${structure} structure used by ${data.count} media buyers`,
          vertical: data.verticals.length === 1 ? data.verticals[0] : 'all',
          rule_type: 'structure',
          campaign_structure: structure,
          conditions: [],
          actions: [],
          confidence_score: Math.min(0.8, 0.3 + (data.count * 0.15)),
          expert_count: data.count,
          source: 'form_submission'
        });
        created++;
      } catch (error) {
        console.error('Error creating structure rule:', error.message);
      }
    }

    return created;
  }

  /**
   * Group similar rules together
   */
  groupSimilarRules(rules, keyField) {
    const grouped = {};

    rules.forEach(rule => {
      const key = `${rule.vertical}_${rule[keyField]}_${rule.structure || 'any'}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(rule);
    });

    return grouped;
  }

  /**
   * Get all expert rules
   */
  async getAllRules() {
    return intelModels.IntelExpertRule.findAll({
      where: { is_active: true },
      order: [['confidence_score', 'DESC']]
    });
  }

  /**
   * Get rules summary for dashboard
   */
  async getRulesSummary() {
    const rules = await this.getAllRules();

    const summary = {
      total: rules.length,
      by_type: {},
      by_vertical: {},
      top_rules: []
    };

    rules.forEach(rule => {
      summary.by_type[rule.rule_type] = (summary.by_type[rule.rule_type] || 0) + 1;
      summary.by_vertical[rule.vertical] = (summary.by_vertical[rule.vertical] || 0) + 1;
    });

    // Top 5 rules by confidence
    summary.top_rules = rules.slice(0, 5).map(r => ({
      id: r.id,
      name: r.name,
      type: r.rule_type,
      vertical: r.vertical,
      confidence: (r.confidence_score * 100).toFixed(0) + '%',
      expert_count: r.expert_count
    }));

    return summary;
  }

  /**
   * Get benchmarks for a specific vertical
   */
  async getBenchmarks(vertical = 'all') {
    return intelModels.IntelExpertRule.getBenchmarks(vertical);
  }

  /**
   * Get kill thresholds for a specific vertical
   * Used by PatternLearningService for expert baseline seeding
   */
  async getKillThresholds(vertical) {
    try {
      const rules = await intelModels.IntelExpertRule.findAll({
        where: {
          rule_type: 'kill',
          is_active: true,
          ...(vertical && vertical !== 'all' ? { vertical } : {})
        }
      });
      return rules.map(r => ({
        name: r.name,
        conditions: r.conditions,
        confidence_score: r.confidence_score
      }));
    } catch (error) {
      console.error('Error getting kill thresholds:', error.message);
      return [];
    }
  }

  /**
   * Get scale thresholds for a specific vertical
   * Used by PatternLearningService for expert baseline seeding
   */
  async getScaleThresholds(vertical) {
    try {
      const rules = await intelModels.IntelExpertRule.findAll({
        where: {
          rule_type: 'scale',
          is_active: true,
          ...(vertical && vertical !== 'all' ? { vertical } : {})
        }
      });
      return rules.map(r => ({
        name: r.name,
        conditions: r.conditions,
        confidence_score: r.confidence_score
      }));
    } catch (error) {
      console.error('Error getting scale thresholds:', error.message);
      return [];
    }
  }

  /**
   * Validate a rule against actual performance data
   */
  async validateRule(ruleId, performanceData) {
    const rule = await intelModels.IntelExpertRule.findByPk(ruleId);
    if (!rule) return null;

    // Check if rule conditions would have triggered correctly
    let matches = 0;
    let total = 0;

    performanceData.forEach(data => {
      const triggered = this.evaluateConditions(rule.conditions, data.metrics);
      const actualResult = data.outcome; // 'win' or 'loss'

      if (rule.rule_type === 'kill' && triggered && actualResult === 'loss') {
        matches++;
      } else if (rule.rule_type === 'scale' && triggered && actualResult === 'win') {
        matches++;
      }
      total++;
    });

    const accuracy = total > 0 ? matches / total : 0;

    // Update rule validation stats
    await rule.update({
      times_validated: rule.times_validated + total,
      times_confirmed: rule.times_confirmed + matches,
      validation_accuracy: accuracy,
      last_validated_at: new Date()
    });

    return { accuracy, matches, total };
  }

  /**
   * Evaluate conditions against metrics
   */
  evaluateConditions(conditions, metrics) {
    if (!conditions || conditions.length === 0) return false;

    return conditions.every(condition => {
      const value = metrics[condition.metric];
      if (value === undefined) return false;

      switch (condition.operator) {
        case '<': return value < condition.value;
        case '<=': return value <= condition.value;
        case '>': return value > condition.value;
        case '>=': return value >= condition.value;
        case '==': return value === condition.value;
        default: return false;
      }
    });
  }
}

module.exports = new ExpertRulesService();
