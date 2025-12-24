#!/usr/bin/env node
'use strict';

/**
 * Seed Expert Rules from Media Buyer Form Submissions
 *
 * This script parses the rules.md file and creates expert rules
 * in the intel_expert_rules table.
 *
 * Run: node scripts/seedExpertRules.js
 */

const path = require('path');
const fs = require('fs');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seedExpertRules() {
  console.log('🌱 Starting Expert Rules Seeder...\n');

  // Initialize database connection
  const { Sequelize } = require('sequelize');

  let sequelize;

  // Use DATABASE_URL if available (Render), otherwise use config
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for connection...');
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });
  } else {
    const dbConfig = require('../config/database');
    const env = process.env.NODE_ENV || 'development';
    const config = dbConfig[env];

    sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        logging: false,
        dialectOptions: config.dialectOptions
      }
    );
  }

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Read rules.md
    const rulesPath = path.join(__dirname, '..', 'rules.md');
    if (!fs.existsSync(rulesPath)) {
      console.error('❌ rules.md not found at:', rulesPath);
      process.exit(1);
    }

    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    const submissions = JSON.parse(rulesContent);
    console.log(`📄 Found ${submissions.length} expert submissions\n`);

    // Parse each submission and create rules
    const rules = [];

    for (const submission of submissions) {
      const timestamp = submission.Timestamp;
      const verticalRaw = submission["What is your primary vertical or vertical with expertise and secondary expertise vertical?"];
      const verticals = parseVerticals(verticalRaw);

      for (const vertical of verticals) {
        // Create kill threshold rule
        const killPoint = submission["What is your campaign/adset killing point ?"];
        if (killPoint && killPoint.trim()) {
          rules.push({
            vertical,
            rule_type: 'kill',
            name: `Kill Threshold - ${vertical}`,
            description: killPoint,
            conditions: parseKillConditions(killPoint),
            actions: [{ action: 'pause', target: 'adset' }],
            confidence_score: 0.8,
            expert_count: 1,
            source: 'form_submission',
            source_references: { timestamp, vertical_raw: verticalRaw },
            is_active: true
          });
        }

        // Create scale threshold rule
        const scaleParams = submission["What is the parameter which makes you think campaign scaling should be done now, list all the scenarios?"];
        if (scaleParams && scaleParams.trim()) {
          rules.push({
            vertical,
            rule_type: 'scale',
            name: `Scale Threshold - ${vertical}`,
            description: scaleParams,
            conditions: parseScaleConditions(scaleParams),
            actions: [{ action: 'increase_budget', params: { percentage: 30 } }],
            confidence_score: 0.8,
            expert_count: 1,
            source: 'form_submission',
            source_references: { timestamp, vertical_raw: verticalRaw },
            is_active: true
          });
        }

        // Create benchmark rule
        const budgetParams = submission["Campaign budget increasing parameters you follow, based on all the parameter be it ROI, CPM or anything else mention the parameter and then the criteria."];
        if (budgetParams && budgetParams.trim()) {
          rules.push({
            vertical,
            rule_type: 'benchmark',
            name: `Benchmark Metrics - ${vertical}`,
            description: budgetParams,
            thresholds: parseBenchmarks(budgetParams),
            conditions: {},
            confidence_score: 0.8,
            expert_count: 1,
            source: 'form_submission',
            source_references: { timestamp, vertical_raw: verticalRaw },
            is_active: true
          });
        }

        // Create structure rule
        const structure = submission["Number of Adset and ads strategy you use "];
        if (structure && structure.trim()) {
          rules.push({
            vertical,
            rule_type: 'structure',
            name: `Campaign Structure - ${vertical}`,
            description: structure,
            campaign_structure: parseStructure(structure),
            conditions: {},
            confidence_score: 0.8,
            expert_count: 1,
            source: 'form_submission',
            source_references: { timestamp, vertical_raw: verticalRaw },
            is_active: true
          });
        }

        // Create targeting rule with winning states
        const winningStates = submission["Most winning target states, mention which are the common in all scenarios"];
        if (winningStates && winningStates.trim()) {
          rules.push({
            vertical,
            rule_type: 'targeting',
            name: `Winning States - ${vertical}`,
            description: winningStates,
            winning_states: parseWinningStates(winningStates),
            conditions: {},
            confidence_score: 0.8,
            expert_count: 1,
            source: 'form_submission',
            source_references: { timestamp, vertical_raw: verticalRaw },
            is_active: true
          });
        }
      }
    }

    console.log(`📊 Generated ${rules.length} rules from submissions\n`);

    // Merge similar rules (same vertical + rule_type)
    const mergedRules = mergeRules(rules);
    console.log(`🔄 Merged into ${mergedRules.length} unique rules\n`);

    // Insert into database
    const insertQuery = `
      INSERT INTO intel_expert_rules
      (vertical, rule_type, name, description, conditions, actions, thresholds,
       campaign_structure, winning_states, confidence_score, expert_count,
       source, source_references, is_active, created_at, updated_at)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    let inserted = 0;
    for (const rule of mergedRules) {
      try {
        const [result] = await sequelize.query(insertQuery, {
          bind: [
            rule.vertical,
            rule.rule_type,
            rule.name,
            rule.description,
            JSON.stringify(rule.conditions || {}),
            JSON.stringify(rule.actions || []),
            JSON.stringify(rule.thresholds || null),
            rule.campaign_structure || null,
            JSON.stringify(rule.winning_states || null),
            rule.confidence_score,
            rule.expert_count,
            rule.source,
            JSON.stringify(rule.source_references || {}),
            rule.is_active
          ],
          type: Sequelize.QueryTypes.INSERT
        });
        inserted++;
        console.log(`  ✓ ${rule.rule_type}: ${rule.name}`);
      } catch (err) {
        console.error(`  ❌ Failed to insert ${rule.name}:`, err.message);
      }
    }

    console.log(`\n✅ Successfully inserted ${inserted} expert rules`);

    // Show summary
    const [summary] = await sequelize.query(`
      SELECT rule_type, COUNT(*) as count
      FROM intel_expert_rules
      GROUP BY rule_type
    `);
    console.log('\n📊 Rules by type:');
    summary.forEach(row => {
      console.log(`   ${row.rule_type}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Helper functions

function parseVerticals(text) {
  if (!text) return ['all'];

  const verticalMap = {
    'home insurance': 'home_insurance',
    'auto insurance': 'auto_insurance',
    'medicare': 'medicare',
    'guns': 'guns',
    'home improvement': 'home_improvement',
    'vsl': 'vsl',
    'bizopp': 'bizopp',
    'cbd': 'cbd',
    'meta': 'meta'
  };

  const found = [];
  const lower = text.toLowerCase();

  for (const [key, value] of Object.entries(verticalMap)) {
    if (lower.includes(key)) {
      found.push(value);
    }
  }

  return found.length > 0 ? found : ['all'];
}

function parseKillConditions(text) {
  const conditions = [];

  // Parse dollar amounts
  const dollarMatch = text.match(/[-$]?\$?(\d+)/g);
  if (dollarMatch) {
    const amounts = dollarMatch.map(m => parseInt(m.replace(/[$-]/g, '')));
    if (amounts.length > 0) {
      conditions.push({
        metric: 'spend',
        operator: '>=',
        value: Math.min(...amounts),
        lookback_days: 3
      });
      conditions.push({
        metric: 'conversions',
        operator: '==',
        value: 0
      });
    }
  }

  // Parse ROI
  if (text.toLowerCase().includes('roi')) {
    const roiMatch = text.match(/(\d+)%?\s*roi/i) || text.match(/roi.*?(\d+)%?/i);
    if (roiMatch) {
      conditions.push({
        metric: 'roi',
        operator: '<',
        value: -parseInt(roiMatch[1])
      });
    }
  }

  return conditions.length > 0 ? conditions : [{ metric: 'roi', operator: '<', value: -50 }];
}

function parseScaleConditions(text) {
  const conditions = [];

  // Parse ROI percentage
  const roiMatch = text.match(/(\d+)[-\s]*(?:\d+)?%?\s*(?:roi|%)/i);
  if (roiMatch) {
    conditions.push({
      metric: 'roi',
      operator: '>=',
      value: parseInt(roiMatch[1])
    });
  }

  // Parse conversions
  const convMatch = text.match(/(\d+)\s*conversion/i);
  if (convMatch) {
    conditions.push({
      metric: 'conversions',
      operator: '>=',
      value: parseInt(convMatch[1])
    });
  }

  // Parse days
  const daysMatch = text.match(/(\d+)\s*day/i);
  if (daysMatch && conditions.length > 0) {
    conditions.forEach(c => c.lookback_days = parseInt(daysMatch[1]));
  }

  return conditions.length > 0 ? conditions : [{ metric: 'roi', operator: '>=', value: 40 }];
}

function parseBenchmarks(text) {
  const benchmarks = {};

  // Parse CPC
  const cpcMatch = text.match(/cpc[:\s]*(?:upto|less than|<)?\s*\$?(\d+\.?\d*)/i);
  if (cpcMatch) {
    benchmarks.cpc_max = parseFloat(cpcMatch[1]);
  }

  // Parse CPM
  const cpmMatch = text.match(/cpm[:\s]*\(?(\d+)[-\s]*(\d+)?\)?/i);
  if (cpmMatch) {
    benchmarks.cpm_min = parseInt(cpmMatch[1]);
    if (cpmMatch[2]) {
      benchmarks.cpm_max = parseInt(cpmMatch[2]);
    }
  }

  // Parse ROI
  const roiMatch = text.match(/roi[:\s]*(?:upto|above|greater than|>)?\s*(\d+)%?/i);
  if (roiMatch) {
    benchmarks.roi_min = parseInt(roiMatch[1]);
  }

  return Object.keys(benchmarks).length > 0 ? benchmarks : { roi_min: 30 };
}

function parseStructure(text) {
  // Extract structure pattern like 1-3-3, 1-50-1, etc.
  const match = text.match(/(\d+)[-\s]*(\d+)[-\s]*(\d+)/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return text.substring(0, 50);
}

function parseWinningStates(text) {
  const stateMap = {
    'texas': 'TX',
    'colorado': 'CO',
    'washington': 'WA',
    'illinois': 'IL',
    'florida': 'FL',
    'california': 'CA',
    'new york': 'NY',
    'newyork': 'NY',
    'new jersey': 'NJ',
    'newjersey': 'NJ'
  };

  const winning = [];
  const excluded = [];
  const lower = text.toLowerCase();

  // Check for exclusions
  const isExclusion = lower.includes('exclud') || lower.includes('except');

  for (const [name, code] of Object.entries(stateMap)) {
    if (lower.includes(name)) {
      if (isExclusion) {
        excluded.push({ state: code });
      } else {
        winning.push({ state: code, count: 1 });
      }
    }
  }

  // Handle "usa" or "united states" as open targeting
  if (lower.includes('usa') || lower.includes('united states')) {
    return { open_targeting: true };
  }

  return { winning, excluded };
}

function mergeRules(rules) {
  const merged = {};

  for (const rule of rules) {
    const key = `${rule.vertical}:${rule.rule_type}`;

    if (!merged[key]) {
      merged[key] = { ...rule };
    } else {
      // Merge descriptions
      merged[key].description += '\n---\n' + rule.description;

      // Increase expert count
      merged[key].expert_count++;

      // Merge conditions
      if (Array.isArray(rule.conditions) && rule.conditions.length > 0) {
        if (!Array.isArray(merged[key].conditions)) {
          merged[key].conditions = [];
        }
        merged[key].conditions.push(...rule.conditions);
      }

      // Merge thresholds
      if (rule.thresholds) {
        merged[key].thresholds = { ...merged[key].thresholds, ...rule.thresholds };
      }

      // Merge winning states
      if (rule.winning_states?.winning) {
        if (!merged[key].winning_states) {
          merged[key].winning_states = { winning: [], excluded: [] };
        }
        for (const state of rule.winning_states.winning) {
          const existing = merged[key].winning_states.winning.find(s => s.state === state.state);
          if (existing) {
            existing.count++;
          } else {
            merged[key].winning_states.winning.push({ ...state });
          }
        }
      }

      // Update confidence based on expert count
      merged[key].confidence_score = Math.min(0.95, 0.6 + (merged[key].expert_count * 0.1));
    }
  }

  return Object.values(merged);
}

// Run the seeder
seedExpertRules();
