'use strict';

/**
 * Seed Expert Rules Script
 *
 * Parses rules.md file containing media buyer form submissions
 * and creates expert rules in the database.
 *
 * Usage: node backend/intelligence/scripts/seedExpertRules.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const ExpertRulesService = require('../services/ExpertRulesService');
const intelModels = require('../models');

async function seedExpertRules() {
  console.log('🌱 Starting Expert Rules Seeding...\n');

  try {
    // Read rules.md file
    const rulesPath = path.join(__dirname, '../../../rules.md');

    if (!fs.existsSync(rulesPath)) {
      console.error('❌ rules.md not found at:', rulesPath);
      console.log('Please ensure rules.md exists in the project root.');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(rulesPath, 'utf-8');

    // Parse JSON from the file
    let formSubmissions;
    try {
      // Try to parse as pure JSON first
      formSubmissions = JSON.parse(fileContent);
    } catch (e) {
      // Try to extract JSON from markdown
      const jsonMatch = fileContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        formSubmissions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse JSON from rules.md');
      }
    }

    console.log(`📋 Found ${formSubmissions.length} form submissions\n`);

    // Initialize models (sync if needed)
    if (process.env.INTEL_SYNC_MODELS === 'true') {
      console.log('🔄 Syncing intelligence models...');
      await intelModels.sequelize.sync({ alter: true });
      console.log('✅ Models synced\n');
    }

    // Parse and seed rules
    const results = await ExpertRulesService.parseAndSeedRules(formSubmissions);

    console.log('\n📊 Seeding Results:');
    console.log('─'.repeat(40));
    console.log(`  Kill Rules:      ${results.kill_rules}`);
    console.log(`  Scale Rules:     ${results.scale_rules}`);
    console.log(`  Benchmark Rules: ${results.benchmark_rules}`);
    console.log(`  Targeting Rules: ${results.targeting_rules}`);
    console.log(`  Structure Rules: ${results.structure_rules}`);
    console.log('─'.repeat(40));

    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      results.errors.forEach(e => console.log(`  - ${e}`));
    }

    // Show summary
    const summary = await ExpertRulesService.getRulesSummary();
    console.log('\n📈 Expert Rules Summary:');
    console.log('─'.repeat(40));
    console.log(`  Total Rules: ${summary.total}`);
    console.log(`  By Type:`, summary.by_type);
    console.log(`  By Vertical:`, summary.by_vertical);

    if (summary.top_rules.length > 0) {
      console.log('\n🏆 Top Rules by Confidence:');
      summary.top_rules.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.name} (${r.confidence}) - ${r.expert_count} expert(s)`);
      });
    }

    console.log('\n✅ Expert rules seeding complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding expert rules:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedExpertRules();
}

module.exports = seedExpertRules;
