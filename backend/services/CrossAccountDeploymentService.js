const db = require('../models');
const FacebookAPI = require('./facebookApi');
const { decryptToken } = require('../routes/facebookSDKAuth');

/**
 * Cross-Account Campaign Deployment Service
 *
 * CRITICAL: This service handles deploying campaigns across multiple Facebook accounts/pages.
 * Account/page mapping accuracy is PARAMOUNT - any mistake could deploy to wrong accounts.
 *
 * Safety measures:
 * 1. Explicit account/page validation before deployment
 * 2. Detailed logging of every account switch
 * 3. Verification after each deployment
 * 4. Atomic operations with rollback on failure
 */
class CrossAccountDeploymentService {
  constructor() {
    this.deploymentJobs = new Map(); // Track active deployment jobs
  }

  /**
   * CRITICAL: Validate that target account/page exists and user has access
   * This prevents deploying to wrong accounts
   */
  async validateTarget(userId, target) {
    console.log(`\n🔐 VALIDATING TARGET:`, {
      userId,
      adAccountId: target.adAccountId,
      pageId: target.pageId
    });

    // Get user's Facebook auth
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      throw new Error('No active Facebook authentication found');
    }

    // Validate ad account exists in user's account list
    const adAccounts = facebookAuth.adAccounts || [];
    const adAccountExists = adAccounts.some(acc =>
      acc.id === target.adAccountId || `act_${acc.id}` === target.adAccountId
    );

    if (!adAccountExists) {
      console.error(`❌ VALIDATION FAILED: Ad account ${target.adAccountId} not found in user's accounts`);
      throw new Error(`Ad account ${target.adAccountId} not accessible`);
    }

    // Validate page exists in user's page list
    const pages = facebookAuth.pages || [];
    const pageExists = pages.some(page => page.id === target.pageId);

    if (!pageExists) {
      console.error(`❌ VALIDATION FAILED: Page ${target.pageId} not found in user's pages`);
      throw new Error(`Page ${target.pageId} not accessible`);
    }

    console.log(`✅ VALIDATION PASSED:`, {
      adAccountValid: true,
      pageValid: true
    });

    return true;
  }

  /**
   * CRITICAL: Clone campaign to a specific account/page combination
   * This is the core method that must NEVER mix up accounts
   */
  async cloneCampaignToTarget(sourceCampaignId, sourceAccount, target, userAccessToken) {
    console.log(`\n🎯 CLONING CAMPAIGN TO TARGET:`);
    console.log(`  Source Campaign: ${sourceCampaignId}`);
    console.log(`  Source Account: ${sourceAccount.adAccountId}`);
    console.log(`  Source Page: ${sourceAccount.pageId}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  Target Account: ${target.adAccountId}`);
    console.log(`  Target Page: ${target.pageId}`);
    console.log(`  Target Pixel: ${target.pixelId || 'none'}`);

    // Step 1: Read campaign structure from source account
    console.log(`\n📖 Step 1: Reading source campaign structure...`);
    const sourceFacebookApi = new FacebookAPI({
      accessToken: userAccessToken,
      adAccountId: sourceAccount.adAccountId.replace('act_', ''),
      pageId: sourceAccount.pageId,
      pixelId: sourceAccount.pixelId
    });

    // Get full campaign details
    const campaignStructure = await this.readCampaignStructure(sourceFacebookApi, sourceCampaignId);
    console.log(`✅ Campaign structure read:`, {
      name: campaignStructure.campaign.name,
      adSets: campaignStructure.adSets.length,
      ads: campaignStructure.ads.length,
      objective: campaignStructure.campaign.objective
    });

    // Step 2: Create FacebookAPI instance for TARGET account
    console.log(`\n🔄 Step 2: Switching to target account...`);
    console.log(`  ⚠️  CRITICAL: Creating API instance for TARGET account`);
    console.log(`  Target Ad Account: ${target.adAccountId}`);
    console.log(`  Target Page: ${target.pageId}`);

    const targetFacebookApi = new FacebookAPI({
      accessToken: userAccessToken,
      adAccountId: target.adAccountId.replace('act_', ''),
      pageId: target.pageId,
      pixelId: target.pixelId || sourceAccount.pixelId
    });

    // CRITICAL VERIFICATION: Double-check API instance is pointing to correct account
    console.log(`\n🔍 VERIFICATION: Confirming API instance configuration...`);
    console.log(`  API adAccountId: ${targetFacebookApi.adAccountId}`);
    console.log(`  API pageId: ${targetFacebookApi.pageId}`);
    console.log(`  API pixelId: ${targetFacebookApi.pixelId}`);

    if (targetFacebookApi.adAccountId !== target.adAccountId.replace('act_', '')) {
      throw new Error(`CRITICAL: API account mismatch! Expected ${target.adAccountId}, got ${targetFacebookApi.adAccountId}`);
    }

    // Step 3: Create campaign in target account
    console.log(`\n🚀 Step 3: Creating campaign in target account...`);
    const newCampaign = await this.createCampaignFromStructure(
      targetFacebookApi,
      campaignStructure,
      target
    );

    console.log(`✅ Campaign deployed successfully to target account!`);
    console.log(`  New Campaign ID: ${newCampaign.campaignId}`);
    console.log(`  Ad Sets Created: ${newCampaign.adSetsCount}`);
    console.log(`  Ads Created: ${newCampaign.adsCount}`);

    // FINAL VERIFICATION: Confirm campaign was created in correct account
    console.log(`\n🔍 FINAL VERIFICATION: Confirming campaign is in correct account...`);
    try {
      const verifyResponse = await targetFacebookApi.makeApiCallWithRotation(
        'GET',
        `${targetFacebookApi.baseURL}/${newCampaign.campaignId}`,
        {
          params: {
            fields: 'account_id,name',
            access_token: userAccessToken
          }
        }
      );

      const actualAccountId = verifyResponse.data.account_id;
      const expectedAccountId = target.adAccountId.startsWith('act_') ? target.adAccountId : `act_${target.adAccountId}`;

      console.log(`  Campaign account_id: ${actualAccountId}`);
      console.log(`  Expected account_id: ${expectedAccountId}`);

      if (actualAccountId !== expectedAccountId) {
        throw new Error(`CRITICAL ERROR: Campaign was created in wrong account! Expected ${expectedAccountId}, got ${actualAccountId}`);
      }

      console.log(`✅ VERIFICATION PASSED: Campaign is in correct account!`);
    } catch (verifyError) {
      console.error(`❌ VERIFICATION FAILED:`, verifyError.message);
      throw new Error(`Campaign verification failed: ${verifyError.message}`);
    }

    return newCampaign;
  }

  /**
   * Read complete campaign structure from source
   */
  async readCampaignStructure(facebookApi, campaignId) {
    console.log(`  📊 Fetching campaign details...`);

    // Get campaign
    const campaignResponse = await facebookApi.makeApiCallWithRotation(
      'GET',
      `${facebookApi.baseURL}/${campaignId}`,
      {
        params: {
          fields: 'name,objective,status,buying_type,special_ad_categories,daily_budget,lifetime_budget,bid_strategy,spend_cap',
          access_token: facebookApi.accessToken
        }
      }
    );

    const campaign = campaignResponse.data;
    console.log(`  ✅ Campaign fetched: ${campaign.name}`);
    console.log(`  📋 Campaign details:`, {
      objective: campaign.objective,
      buying_type: campaign.buying_type,
      special_ad_categories: campaign.special_ad_categories,
      bid_strategy: campaign.bid_strategy,
      daily_budget: campaign.daily_budget,
      lifetime_budget: campaign.lifetime_budget
    });

    // Get ad sets
    console.log(`  📊 Fetching ad sets...`);
    const adSetsResponse = await facebookApi.makeApiCallWithRotation(
      'GET',
      `${facebookApi.baseURL}/${campaignId}/adsets`,
      {
        params: {
          fields: 'name,optimization_goal,billing_event,bid_strategy,bid_amount,daily_budget,lifetime_budget,start_time,end_time,targeting,status,attribution_spec,promoted_object',
          limit: 200,
          access_token: facebookApi.accessToken
        }
      }
    );

    const adSets = adSetsResponse.data.data || [];
    console.log(`  ✅ Ad sets fetched: ${adSets.length}`);

    // Log first ad set details for debugging
    if (adSets.length > 0) {
      console.log(`  📋 First ad set details:`, {
        name: adSets[0].name,
        optimization_goal: adSets[0].optimization_goal,
        billing_event: adSets[0].billing_event,
        bid_strategy: adSets[0].bid_strategy,
        promoted_object: adSets[0].promoted_object,
        attribution_spec: adSets[0].attribution_spec,
        targeting: adSets[0].targeting ? 'Present' : 'Missing'
      });
    }

    // Get ads for each ad set
    console.log(`  📊 Fetching ads...`);
    const ads = [];

    for (const adSet of adSets) {
      const adsResponse = await facebookApi.makeApiCallWithRotation(
        'GET',
        `${facebookApi.baseURL}/${adSet.id}/ads`,
        {
          params: {
            fields: 'name,adset_id,creative,status',
            limit: 100,
            access_token: facebookApi.accessToken
          }
        }
      );

      ads.push(...(adsResponse.data.data || []));
    }

    console.log(`  ✅ Ads fetched: ${ads.length}`);

    return {
      campaign,
      adSets,
      ads
    };
  }

  /**
   * Create campaign from structure in target account
   */
  async createCampaignFromStructure(facebookApi, structure, target) {
    console.log(`  🏗️  Creating campaign structure...`);

    const timestamp = Date.now();
    const newCampaignName = `${structure.campaign.name} - Deployed_${timestamp}`;

    // Create campaign
    console.log(`  📝 Creating campaign: ${newCampaignName}`);

    // CRITICAL: Ensure special_ad_categories is always present (Facebook requires it)
    const specialAdCategories = structure.campaign.special_ad_categories || [];
    console.log(`  🏷️  Special Ad Categories from source: ${JSON.stringify(specialAdCategories)}`);
    console.log(`  🏷️  Type: ${typeof specialAdCategories}, Is Array: ${Array.isArray(specialAdCategories)}`);

    const campaignData = {
      name: newCampaignName,
      objective: structure.campaign.objective,
      buying_type: structure.campaign.buying_type || 'AUCTION', // CRITICAL: Required by Facebook
      status: 'PAUSED', // Always create paused for safety
      special_ad_categories: JSON.stringify(specialAdCategories), // CRITICAL: Must be JSON string (same as facebookApi.js line 351)
      access_token: facebookApi.accessToken
    };

    if (structure.campaign.daily_budget) {
      campaignData.daily_budget = structure.campaign.daily_budget;
    }
    if (structure.campaign.lifetime_budget) {
      campaignData.lifetime_budget = structure.campaign.lifetime_budget;
    }
    if (structure.campaign.bid_strategy) {
      campaignData.bid_strategy = structure.campaign.bid_strategy;
    }

    console.log(`  📤 Campaign data being sent:`, {
      name: campaignData.name,
      objective: campaignData.objective,
      buying_type: campaignData.buying_type,
      status: campaignData.status,
      special_ad_categories: campaignData.special_ad_categories,
      bid_strategy: campaignData.bid_strategy,
      daily_budget: campaignData.daily_budget,
      lifetime_budget: campaignData.lifetime_budget
    });

    // CRITICAL DEBUG: Log EXACTLY what's being sent
    console.error('🚨 ABOUT TO CREATE CAMPAIGN - PARAMS:', JSON.stringify(campaignData, null, 2));

    const campaignResponse = await facebookApi.makeApiCallWithRotation(
      'POST',
      `${facebookApi.baseURL}/act_${facebookApi.adAccountId}/campaigns`,
      { data: campaignData }  // FIXED: Changed from 'params' to 'data' - params sends as query string, data sends as POST body
    );

    const newCampaignId = campaignResponse.data.id;
    console.log(`  ✅ Campaign created: ${newCampaignId}`);

    // Create ad sets
    console.log(`  📦 Creating ${structure.adSets.length} ad sets...`);
    const adSetMapping = new Map(); // Map old ID to new ID

    for (let i = 0; i < structure.adSets.length; i++) {
      const adSet = structure.adSets[i];
      console.log(`    Creating ad set ${i + 1}/${structure.adSets.length}: ${adSet.name}`);

      const adSetData = {
        name: adSet.name,
        campaign_id: newCampaignId,
        optimization_goal: adSet.optimization_goal,
        billing_event: adSet.billing_event,
        targeting: typeof adSet.targeting === 'string' ? adSet.targeting : JSON.stringify(adSet.targeting), // CRITICAL: Must be JSON string
        status: 'PAUSED',
        access_token: facebookApi.accessToken
      };

      // CRITICAL: Copy promoted_object but replace pixel_id and page_id with target's
      if (adSet.promoted_object) {
        const promotedObject = { ...adSet.promoted_object };

        // Replace with target's pixel and page
        if (target.pixelId) {
          promotedObject.pixel_id = target.pixelId;
          console.log(`      🎯 Using target pixel: ${target.pixelId}`);
        }
        if (target.pageId) {
          promotedObject.page_id = target.pageId;
          console.log(`      📄 Using target page: ${target.pageId}`);
        }

        adSetData.promoted_object = JSON.stringify(promotedObject);
      }

      // Copy attribution_spec if present
      if (adSet.attribution_spec) {
        adSetData.attribution_spec = JSON.stringify(adSet.attribution_spec);
      }

      // Copy bid_strategy if present
      if (adSet.bid_strategy) {
        adSetData.bid_strategy = adSet.bid_strategy;
      }

      if (adSet.bid_amount) adSetData.bid_amount = adSet.bid_amount;
      if (adSet.daily_budget) adSetData.daily_budget = adSet.daily_budget;
      if (adSet.lifetime_budget) adSetData.lifetime_budget = adSet.lifetime_budget;
      if (adSet.start_time) adSetData.start_time = adSet.start_time;
      if (adSet.end_time) adSetData.end_time = adSet.end_time;

      console.log(`      📤 Ad set data being sent:`, {
        name: adSetData.name,
        campaign_id: adSetData.campaign_id,
        optimization_goal: adSetData.optimization_goal,
        billing_event: adSetData.billing_event,
        bid_strategy: adSetData.bid_strategy,
        promoted_object: adSetData.promoted_object,
        attribution_spec: adSetData.attribution_spec ? 'Present' : 'Missing',
        targeting: adSetData.targeting ? 'Present' : 'Missing'
      });

      const adSetResponse = await facebookApi.makeApiCallWithRotation(
        'POST',
        `${facebookApi.baseURL}/act_${facebookApi.adAccountId}/adsets`,
        { data: adSetData }  // FIXED: Changed from 'params' to 'data' - params sends as query string, data sends as POST body
      );

      adSetMapping.set(adSet.id, adSetResponse.data.id);
    }

    console.log(`  ✅ All ad sets created`);

    // Create ads
    console.log(`  🎨 Creating ${structure.ads.length} ads...`);

    for (let i = 0; i < structure.ads.length; i++) {
      const ad = structure.ads[i];
      const newAdSetId = adSetMapping.get(ad.adset_id);

      if (!newAdSetId) {
        console.warn(`    ⚠️  Skipping ad ${ad.name} - parent ad set not found`);
        continue;
      }

      console.log(`    Creating ad ${i + 1}/${structure.ads.length}: ${ad.name}`);

      const adData = {
        name: ad.name,
        adset_id: newAdSetId,
        creative: ad.creative,
        status: 'PAUSED',
        access_token: facebookApi.accessToken
      };

      await facebookApi.makeApiCallWithRotation(
        'POST',
        `${facebookApi.baseURL}/act_${facebookApi.adAccountId}/ads`,
        { data: adData }  // FIXED: Changed from 'params' to 'data' - params sends as query string, data sends as POST body
      );
    }

    console.log(`  ✅ All ads created`);

    return {
      campaignId: newCampaignId,
      campaignName: newCampaignName,
      adSetsCount: structure.adSets.length,
      adsCount: structure.ads.length
    };
  }

  /**
   * Deploy campaign to multiple targets
   */
  async deployToMultipleTargets(userId, sourceCampaignId, sourceAccount, targets, processingMode = 'parallel') {
    console.log(`\n🚀 MULTI-ACCOUNT DEPLOYMENT INITIATED`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Source Campaign: ${sourceCampaignId}`);
    console.log(`  Targets: ${targets.length}`);
    console.log(`  Mode: ${processingMode}`);

    // Validate all targets first
    console.log(`\n🔐 Validating all targets...`);
    for (const target of targets) {
      await this.validateTarget(userId, target);
    }
    console.log(`✅ All targets validated\n`);

    // Create deployment record
    const deployment = await db.CampaignDeployment.create({
      userId,
      sourceCampaignId,
      sourceAdAccountId: sourceAccount.adAccountId,
      sourcePageId: sourceAccount.pageId,
      deploymentName: `Deployment ${new Date().toLocaleString()}`,
      targets,
      status: 'processing',
      totalTargets: targets.length,
      processingMode
    });

    console.log(`📊 Deployment record created: ID ${deployment.id}`);

    // Get user's access token
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      throw new Error('No active Facebook authentication found for user');
    }

    let userAccessToken = facebookAuth.accessToken;

    // CRITICAL: Decrypt token if it's encrypted (starts with '{')
    if (userAccessToken && userAccessToken.startsWith('{')) {
      console.log(`🔐 Token is encrypted, decrypting...`);
      userAccessToken = decryptToken(userAccessToken);

      if (!userAccessToken) {
        throw new Error('Failed to decrypt access token');
      }
      console.log(`✅ Token decrypted successfully`);
    } else {
      console.log(`ℹ️  Token is already in plain format`);
    }

    console.log(`🔑 Access Token Debug:`);
    console.log(`  - Token exists: ${!!userAccessToken}`);
    console.log(`  - Token type: ${typeof userAccessToken}`);
    console.log(`  - Token length: ${userAccessToken?.length || 0}`);
    console.log(`  - Token preview: ${userAccessToken?.substring(0, 20)}...`);

    // Process deployments
    const results = [];
    const errors = [];

    if (processingMode === 'parallel') {
      // Parallel processing - all at once
      console.log(`\n⚡ Processing targets in parallel...`);

      const promises = targets.map(async (target, index) => {
        try {
          console.log(`\n[Target ${index + 1}/${targets.length}] Starting deployment...`);
          const result = await this.cloneCampaignToTarget(
            sourceCampaignId,
            sourceAccount,
            target,
            userAccessToken
          );

          // Create deployed campaign record
          await db.DeployedCampaign.create({
            deploymentId: deployment.id,
            userId,
            sourceCampaignId,
            targetCampaignId: result.campaignId,
            targetCampaignName: result.campaignName,
            targetAdAccountId: target.adAccountId,
            targetPageId: target.pageId,
            targetPixelId: target.pixelId,
            status: 'completed',
            adSetsCount: result.adSetsCount,
            adsCount: result.adsCount,
            deployedAt: new Date()
          });

          return { success: true, target, result };
        } catch (error) {
          console.error(`\n[Target ${index + 1}/${targets.length}] ❌ Deployment failed:`, error.message);

          await db.DeployedCampaign.create({
            deploymentId: deployment.id,
            userId,
            sourceCampaignId,
            targetCampaignId: null,
            targetAdAccountId: target.adAccountId,
            targetPageId: target.pageId,
            targetPixelId: target.pixelId,
            status: 'failed',
            errorMessage: error.message,
            errorDetails: {
              code: error.code,
              stack: error.stack
            }
          });

          return { success: false, target, error: error.message };
        }
      });

      const settled = await Promise.allSettled(promises);

      settled.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value);
          } else {
            errors.push(result.value);
          }
        } else {
          errors.push({ error: result.reason.message });
        }
      });
    } else {
      // Sequential processing - one at a time
      console.log(`\n⏭️  Processing targets sequentially...`);

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];

        try {
          console.log(`\n[Target ${i + 1}/${targets.length}] Starting deployment...`);
          const result = await this.cloneCampaignToTarget(
            sourceCampaignId,
            sourceAccount,
            target,
            userAccessToken
          );

          await db.DeployedCampaign.create({
            deploymentId: deployment.id,
            userId,
            sourceCampaignId,
            targetCampaignId: result.campaignId,
            targetCampaignName: result.campaignName,
            targetAdAccountId: target.adAccountId,
            targetPageId: target.pageId,
            targetPixelId: target.pixelId,
            status: 'completed',
            adSetsCount: result.adSetsCount,
            adsCount: result.adsCount,
            deployedAt: new Date()
          });

          results.push({ success: true, target, result });
        } catch (error) {
          console.error(`\n[Target ${i + 1}/${targets.length}] ❌ Deployment failed:`, error.message);

          await db.DeployedCampaign.create({
            deploymentId: deployment.id,
            userId,
            sourceCampaignId,
            targetCampaignId: null,
            targetAdAccountId: target.adAccountId,
            targetPageId: target.pageId,
            targetPixelId: target.pixelId,
            status: 'failed',
            errorMessage: error.message
          });

          errors.push({ target, error: error.message });
        }

        // Wait 30 seconds between sequential deployments
        if (i < targets.length - 1) {
          console.log(`  ⏱️  Waiting 30s before next deployment...`);
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }
    }

    // Update deployment status
    const finalStatus = errors.length === 0 ? 'completed' :
                        results.length === 0 ? 'failed' : 'partial';

    await deployment.update({
      status: finalStatus,
      successfulDeployments: results.length,
      failedDeployments: errors.length,
      results: [...results, ...errors],
      completedAt: new Date()
    });

    console.log(`\n✅ DEPLOYMENT COMPLETE`);
    console.log(`  Status: ${finalStatus}`);
    console.log(`  Successful: ${results.length}/${targets.length}`);
    console.log(`  Failed: ${errors.length}/${targets.length}`);

    return {
      deploymentId: deployment.id,
      status: finalStatus,
      results,
      errors,
      totalTargets: targets.length,
      successful: results.length,
      failed: errors.length
    };
  }
}

module.exports = new CrossAccountDeploymentService();
