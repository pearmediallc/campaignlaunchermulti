/**
 * TestRunnerService.js
 *
 * Isolated test service for running campaign creation tests.
 * This service DOES NOT modify any existing code - it only USES existing services.
 * All test campaigns are created in PAUSED state.
 */

const path = require('path');
const fs = require('fs');

// Test scenarios configuration
const TEST_SCENARIOS = [
  // Strategy 150 Tests
  {
    id: 's150-image-50',
    name: '1-50-1 Single Image',
    description: 'Strategy 150 with single image, 50 ad sets',
    strategy: 'strategy150',
    adSetCount: 50,
    mediaType: 'single_image',
    category: 'Strategy 150'
  },
  {
    id: 's150-video-50',
    name: '1-50-1 Single Video',
    description: 'Strategy 150 with single video, 50 ad sets',
    strategy: 'strategy150',
    adSetCount: 50,
    mediaType: 'video',
    category: 'Strategy 150'
  },
  {
    id: 's150-dc-3img',
    name: '1-50-1 DC (3 images)',
    description: 'Strategy 150 with Dynamic Creative, 3 images',
    strategy: 'strategy150',
    adSetCount: 50,
    mediaType: 'dynamic',
    dynamicConfig: { images: 3, videos: 0 },
    category: 'Strategy 150'
  },
  {
    id: 's150-dc-3vid',
    name: '1-50-1 DC (3 videos)',
    description: 'Strategy 150 with Dynamic Creative, 3 videos',
    strategy: 'strategy150',
    adSetCount: 50,
    mediaType: 'dynamic',
    dynamicConfig: { images: 0, videos: 3 },
    category: 'Strategy 150'
  },
  {
    id: 's150-dc-mixed',
    name: '1-50-1 DC (2 img + 2 vid)',
    description: 'Strategy 150 with Dynamic Creative, mixed media',
    strategy: 'strategy150',
    adSetCount: 50,
    mediaType: 'dynamic',
    dynamicConfig: { images: 2, videos: 2 },
    category: 'Strategy 150'
  },

  // StrategyForAds Tests
  {
    id: 'sfa-image-10',
    name: '1-10-1 Single Image',
    description: 'StrategyForAds with single image, 10 ad sets',
    strategy: 'strategyForAds',
    adSetCount: 10,
    mediaType: 'single_image',
    category: 'Strategy For Ads'
  },
  {
    id: 'sfa-image-25',
    name: '1-25-1 Single Image',
    description: 'StrategyForAds with single image, 25 ad sets',
    strategy: 'strategyForAds',
    adSetCount: 25,
    mediaType: 'single_image',
    category: 'Strategy For Ads'
  },
  {
    id: 'sfa-video-25',
    name: '1-25-1 Single Video',
    description: 'StrategyForAds with single video, 25 ad sets',
    strategy: 'strategyForAds',
    adSetCount: 25,
    mediaType: 'video',
    category: 'Strategy For Ads'
  },
  {
    id: 'sfa-dc-50',
    name: '1-50-1 DC (3 img + 2 vid)',
    description: 'StrategyForAds with Dynamic Creative, 50 ad sets',
    strategy: 'strategyForAds',
    adSetCount: 50,
    mediaType: 'dynamic',
    dynamicConfig: { images: 3, videos: 2 },
    category: 'Strategy For Ads'
  },
  {
    id: 'sfa-image-100',
    name: '1-100-1 Single Image',
    description: 'StrategyForAds with single image, 100 ad sets (stress test)',
    strategy: 'strategyForAds',
    adSetCount: 100,
    mediaType: 'single_image',
    category: 'Strategy For Ads'
  },

  // StrategyForAll Tests
  {
    id: 'sfall-3camp-10adset',
    name: '3 Campaigns × 10 AdSets',
    description: 'StrategyForAll with 3 campaigns, 10 ad sets each',
    strategy: 'strategyForAll',
    campaigns: 3,
    adSetCount: 10,
    mediaType: 'single_image',
    category: 'Strategy For All'
  },
  {
    id: 'sfall-2camp-dc',
    name: '2 Campaigns DC',
    description: 'StrategyForAll with 2 campaigns, Dynamic Creative',
    strategy: 'strategyForAll',
    campaigns: 2,
    adSetCount: 25,
    mediaType: 'dynamic',
    dynamicConfig: { images: 2, videos: 1 },
    category: 'Strategy For All'
  },

  // Edge Cases
  {
    id: 'edge-minimum',
    name: 'Minimum 1-1-1',
    description: 'Minimum campaign structure',
    strategy: 'strategyForAds',
    adSetCount: 1,
    mediaType: 'single_image',
    category: 'Edge Cases'
  },
  {
    id: 'edge-spending-limits',
    name: 'With Spending Limits',
    description: 'Campaign with min/max spending limits (CBO)',
    strategy: 'strategyForAds',
    adSetCount: 10,
    mediaType: 'single_image',
    spendingLimits: { dailyMin: 100, dailyMax: 500 }, // In cents
    budgetLevel: 'campaign',
    category: 'Edge Cases'
  },
  {
    id: 'edge-text-variations',
    name: 'With Text Variations',
    description: 'Campaign with primary text and headline variations',
    strategy: 'strategyForAds',
    adSetCount: 10,
    mediaType: 'single_image',
    textVariations: {
      primaryTexts: ['Primary Text 1', 'Primary Text 2', 'Primary Text 3'],
      headlines: ['Headline 1', 'Headline 2', 'Headline 3']
    },
    category: 'Edge Cases'
  }
];

class TestRunnerService {
  constructor() {
    this.activeTests = new Map(); // Track running tests
    this.testResults = new Map(); // Store test results
    this.uploadsPath = path.join(__dirname, '..', 'uploads');
  }

  /**
   * Get all available test scenarios
   */
  getScenarios() {
    return TEST_SCENARIOS;
  }

  /**
   * Get scenarios grouped by category
   */
  getScenariosByCategory() {
    const grouped = {};
    TEST_SCENARIOS.forEach(scenario => {
      if (!grouped[scenario.category]) {
        grouped[scenario.category] = [];
      }
      grouped[scenario.category].push(scenario);
    });
    return grouped;
  }

  /**
   * Get available test media files from uploads folder
   */
  getAvailableMedia() {
    const media = { images: [], videos: [] };

    try {
      const files = fs.readdirSync(this.uploadsPath);

      files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        const filePath = path.join(this.uploadsPath, file);
        const stats = fs.statSync(filePath);

        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
          media.images.push({
            name: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size)
          });
        } else if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
          media.videos.push({
            name: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size)
          });
        }
      });
    } catch (error) {
      console.error('Error reading uploads folder:', error);
    }

    return media;
  }

  /**
   * Format file size to human readable
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Build campaign data for a test scenario
   */
  buildCampaignData(scenario, resources, media) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const baseName = `[TEST] ${scenario.name} - ${timestamp}`;

    const campaignData = {
      // Campaign basics
      campaignName: baseName,
      objective: 'OUTCOME_SALES',

      // CRITICAL: All test campaigns are PAUSED
      status: 'PAUSED',

      // Budget - using campaign level (CBO) with $50 budget
      // NOTE: createCampaign multiplies by 100 to convert dollars to cents
      budgetLevel: scenario.budgetLevel || 'campaign',
      dailyBudget: 50, // $50.00 in dollars (will be converted to cents by createCampaign)

      // Ad Set settings
      adSetCount: scenario.adSetCount || 1,
      conversionLocation: 'website',
      conversionEvent: 'Purchase',
      performanceGoal: 'OFFSITE_CONVERSIONS',
      billingEvent: 'IMPRESSIONS',
      bidStrategy: 'LOWEST_COST_WITHOUT_CAP',

      // Attribution
      attributionSetting: '7d_click_1d_view',
      attributionWindow: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],

      // Targeting - broad targeting for test
      targeting: {
        geo_locations: {
          countries: ['US']
        },
        age_min: 18,
        age_max: 65,
        publisher_platforms: ['facebook', 'instagram'],
        facebook_positions: ['feed'],
        instagram_positions: ['stream']
      },

      // Creative content
      primaryText: 'This is a test campaign created by Admin Test Dashboard. This campaign is PAUSED and will not spend any budget.',
      headline: 'Test Campaign - Do Not Activate',
      description: 'Automated test campaign',
      url: 'https://example.com',
      displayLink: 'example.com',
      callToAction: 'LEARN_MORE',

      // Media type
      mediaType: scenario.mediaType,

      // Resources
      selectedPageId: resources.pageId,
      selectedAdAccountId: resources.adAccountId,
      selectedPixelId: resources.pixelId,
      pixelId: resources.pixelId, // Also set pixelId directly for compatibility

      // Duplication settings
      duplicationSettings: {
        adSetCount: scenario.adSetCount || 1
      },

      // Default spending limits for ALL test scenarios - $1 max to minimize risk
      // NOTE: Values are in dollars, will be converted to cents by createAdSet
      // Only set maximum, not minimum (Facebook may reject min spend on some accounts)
      spendingLimits: {
        enabled: true,
        dailyMax: 1   // $1.00 maximum - safety limit
      },
      adSetBudget: {
        spendingLimits: {
          enabled: true,
          dailyMax: 1
        }
      }
    };

    // Override with scenario-specific spending limits if provided
    if (scenario.spendingLimits) {
      campaignData.spendingLimits = {
        enabled: true,
        dailyMin: scenario.spendingLimits.dailyMin,
        dailyMax: scenario.spendingLimits.dailyMax
      };
      campaignData.adSetBudget = {
        spendingLimits: campaignData.spendingLimits
      };
    }

    // Handle text variations
    if (scenario.textVariations) {
      campaignData.dynamicTextEnabled = true;
      campaignData.primaryTextVariations = scenario.textVariations.primaryTexts;
      campaignData.headlineVariations = scenario.textVariations.headlines;
    }

    // Handle media based on type
    if (scenario.mediaType === 'single_image') {
      if (media.images.length > 0) {
        campaignData.imagePath = media.images[0].path;
      }
    } else if (scenario.mediaType === 'video') {
      if (media.videos.length > 0) {
        campaignData.videoPath = media.videos[0].path;
      }
    } else if (scenario.mediaType === 'dynamic') {
      campaignData.dynamicCreativeEnabled = true;

      // Use ALL available media for Dynamic Creative (like a real user would)
      // Facebook allows up to 10 images or 10 videos in a single DC ad
      const dynamicMediaPaths = [];

      // Add ALL available images (up to 10)
      const maxImages = Math.min(media.images.length, 10);
      for (let i = 0; i < maxImages; i++) {
        dynamicMediaPaths.push(media.images[i].path);
      }

      // Add ALL available videos (up to 10 total media)
      const remainingSlots = 10 - dynamicMediaPaths.length;
      const maxVideos = Math.min(media.videos.length, remainingSlots);
      for (let i = 0; i < maxVideos; i++) {
        dynamicMediaPaths.push(media.videos[i].path);
      }

      campaignData.dynamicCreativeMediaPaths = dynamicMediaPaths;

      // Log what we're using
      console.log(`[TestRunner] Dynamic Creative will use ${maxImages} images and ${maxVideos} videos (total: ${dynamicMediaPaths.length} media files)`);
    }

    // Handle multiple campaigns for strategyForAll
    if (scenario.campaigns) {
      campaignData.numberOfCampaigns = scenario.campaigns;
    }

    return campaignData;
  }

  /**
   * Run a single test scenario
   * @param {string} scenarioId - The scenario ID to run
   * @param {object} resources - Facebook resources (adAccountId, pageId, pixelId)
   * @param {object} facebookApi - Initialized FacebookAPI instance
   * @param {string} userId - User ID
   * @param {object} customOverrides - Optional custom overrides { adSetCount, adCount, campaignCopies }
   */
  async runTest(scenarioId, resources, facebookApi, userId, customOverrides = {}) {
    let scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    // Apply custom overrides to scenario (create a copy to avoid mutating original)
    if (Object.keys(customOverrides).length > 0) {
      scenario = {
        ...scenario,
        adSetCount: customOverrides.adSetCount || scenario.adSetCount,
        adCount: customOverrides.adCount || scenario.adCount || scenario.adSetCount,
        campaigns: customOverrides.campaignCopies || scenario.campaigns || 1
      };
      console.log(`[TestRunner] Applied custom overrides:`, customOverrides);
      console.log(`[TestRunner] Effective scenario: ${scenario.adSetCount} ad sets, ${scenario.adCount} ads, ${scenario.campaigns} campaign(s)`);
    }

    const testId = `${scenarioId}-${Date.now()}`;
    const startTime = Date.now();

    // Initialize test tracking
    this.activeTests.set(testId, {
      scenarioId,
      scenario,
      status: 'running',
      progress: 0,
      startTime,
      logs: []
    });

    const addLog = (message) => {
      const test = this.activeTests.get(testId);
      if (test) {
        test.logs.push({ time: new Date().toISOString(), message });
        console.log(`[TEST ${testId}] ${message}`);
      }
    };

    try {
      addLog(`Starting test: ${scenario.name}`);
      if (Object.keys(customOverrides).length > 0) {
        addLog(`Custom overrides: ${scenario.adSetCount} ad sets, ${scenario.campaigns || 1} campaign(s)`);
      }

      // Get available media
      const media = this.getAvailableMedia();
      addLog(`Available media: ${media.images.length} images, ${media.videos.length} videos`);

      // Validate media availability
      if (scenario.mediaType === 'single_image' && media.images.length === 0) {
        throw new Error('No images available for single image test');
      }
      if (scenario.mediaType === 'video' && media.videos.length === 0) {
        throw new Error('No videos available for video test');
      }
      if (scenario.mediaType === 'dynamic') {
        const config = scenario.dynamicConfig || { images: 2, videos: 0 };
        if (config.images > 0 && media.images.length < config.images) {
          addLog(`Warning: Only ${media.images.length} images available, need ${config.images}`);
        }
        if (config.videos > 0 && media.videos.length < config.videos) {
          addLog(`Warning: Only ${media.videos.length} videos available, need ${config.videos}`);
        }
      }

      // Build campaign data
      const campaignData = this.buildCampaignData(scenario, resources, media);
      addLog(`Campaign data built: ${campaignData.campaignName}`);
      addLog(`Ad Set Count: ${campaignData.adSetCount || 1}`);
      addLog(`Media Type: ${campaignData.mediaType}`);

      // Update progress
      this.updateTestProgress(testId, 10, 'Creating campaign structure...');

      let result;

      // Execute based on strategy
      if (scenario.strategy === 'strategy150' || scenario.strategy === 'strategyForAds') {
        // Use createCampaignStructure for initial 1-1-1
        addLog('Creating initial 1-1-1 structure...');
        result = await facebookApi.createCampaignStructure(campaignData);

        this.updateTestProgress(testId, 30, 'Initial structure created');
        addLog(`Campaign created: ${result.campaign?.id}`);
        addLog(`Initial Ad Set: ${result.adSet?.id}`);
        addLog(`Initial Ad: ${result.ads?.[0]?.id || result.ad?.id || 'N/A'}`);

        // If more ad sets needed, duplicate
        if (scenario.adSetCount > 1) {
          const adSetsToCreate = scenario.adSetCount - 1;
          addLog(`Duplicating ${adSetsToCreate} additional ad sets...`);

          this.updateTestProgress(testId, 40, `Duplicating ${adSetsToCreate} ad sets...`);

          // CRITICAL: Ensure we have postId before duplication (for non-dynamic-creative scenarios)
          // For dynamic creative, we use asset_feed_spec instead of postId
          const isDynamicCreative = campaignData.dynamicCreativeEnabled || campaignData.dynamicTextEnabled;
          let postId = result.postId;

          if (isDynamicCreative) {
            addLog(`Creative Strategy: Dynamic Creative (using asset_feed_spec)`);
            addLog(`Media hashes available: ${result.mediaHashes ? 'Yes' : 'No'}`);
          } else {
            addLog(`Creative Strategy: PostId (using object_story_id for 100% root effect)`);

            // Try to get postId with retries if not already available
            if (!postId && result.ads?.[0]?.id) {
              addLog('Fetching post ID from created ad (with retries)...');
              const maxRetries = 5;
              const retryDelays = [2000, 3000, 5000, 8000, 12000]; // Progressive delays

              for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                  postId = await facebookApi.getPostIdFromAd(result.ads[0].id);
                  if (postId) {
                    addLog(`Post ID fetched on attempt ${attempt}: ${postId}`);
                    break;
                  }

                  if (attempt < maxRetries) {
                    const delay = retryDelays[attempt - 1];
                    addLog(`Attempt ${attempt}/${maxRetries} returned null, waiting ${delay/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }
                } catch (err) {
                  if (attempt < maxRetries) {
                    const delay = retryDelays[attempt - 1];
                    addLog(`Attempt ${attempt}/${maxRetries} error: ${err.message}, waiting ${delay/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  } else {
                    addLog(`CRITICAL ERROR: All ${maxRetries} attempts to fetch postId failed: ${err.message}`);
                  }
                }
              }

              // FAIL EARLY: If we still don't have postId for non-DC scenario, throw error
              // This prevents creating 49 orphan ad sets with no ads
              if (!postId) {
                throw new Error('CRITICAL: Cannot proceed with duplication - postId not available for non-dynamic-creative scenario. All duplicated ads would fail with "creative is required" error.');
              }
            } else if (postId) {
              addLog(`Post ID already available: ${postId}`);
            } else {
              // No ads were created and no postId - this shouldn't happen
              throw new Error('CRITICAL: No ads created and no postId available. Cannot proceed with duplication.');
            }
          }

          // Use batch duplication service
          const BatchDuplicationService = require('./batchDuplication');
          const batchService = new BatchDuplicationService(
            facebookApi.accessToken,
            resources.adAccountId.replace('act_', ''),
            resources.pageId,
            resources.pixelId
          );

          const batchResult = await batchService.duplicateAdSetsBatch(
            result.adSet.id,
            result.campaign.id,
            postId || null,
            adSetsToCreate,
            {
              ...campaignData,
              mediaHashes: result.mediaHashes,
              dynamicCreativeEnabled: campaignData.dynamicCreativeEnabled,
              dynamicTextEnabled: campaignData.dynamicTextEnabled,
              primaryTextVariations: campaignData.primaryTextVariations,
              headlineVariations: campaignData.headlineVariations,
              primaryText: campaignData.primaryText,
              headline: campaignData.headline,
              description: campaignData.description,
              url: campaignData.url,
              displayLink: campaignData.displayLink,
              callToAction: campaignData.callToAction
            }
          );

          addLog(`Batch duplication complete: ${batchResult.adSets.length} ad sets, ${batchResult.ads.length} ads`);
          addLog(`Success rate: ${batchResult.summary.successRate}%`);

          result.duplicatedAdSets = batchResult.adSets;
          result.duplicatedAds = batchResult.ads;
          result.batchSummary = batchResult.summary;
        }

        // Handle campaign copies (duplicate entire campaign structure)
        // This uses the same duplicateCampaignBatch method as campaign-management
        if (scenario.campaigns && scenario.campaigns > 1) {
          const copiesToCreate = scenario.campaigns - 1; // Already have 1 campaign
          addLog(`\n🔄 CAMPAIGN COPIES: Creating ${copiesToCreate} additional campaign copies...`);
          this.updateTestProgress(testId, 60, `Duplicating ${copiesToCreate} campaign copies...`);

          const BatchDuplicationService = require('./batchDuplication');
          const batchService = new BatchDuplicationService(
            facebookApi.accessToken,
            resources.adAccountId.replace('act_', ''),
            resources.pageId,
            resources.pixelId
          );

          // Use the same duplicateCampaignBatch method as campaign-management
          const copyResults = await batchService.duplicateCampaignBatch(
            result.campaign.id,
            campaignData.campaignName,
            copiesToCreate
          );

          addLog(`Campaign duplication complete: ${copyResults.filter(r => r.success || r.partialSuccess).length}/${copiesToCreate} copies created`);

          // Store copy results
          result.campaignCopies = copyResults;
          result.totalCampaigns = 1 + copyResults.filter(r => r.success || r.partialSuccess).length;

          // Log details for each copy
          copyResults.forEach((copy, idx) => {
            if (copy.success || copy.partialSuccess) {
              addLog(`  Copy ${idx + 1}: ${copy.id} - ${copy.adSetsCreated} ad sets, ${copy.adsCreated} ads`);
            } else {
              addLog(`  Copy ${idx + 1}: FAILED - ${copy.error}`);
            }
          });
        }

      } else if (scenario.strategy === 'strategyForAll') {
        // Multiple campaigns
        addLog(`Creating ${scenario.campaigns} campaigns...`);
        result = { campaigns: [], totalAdSets: 0, totalAds: 0 };

        for (let i = 0; i < scenario.campaigns; i++) {
          const campaignDataCopy = {
            ...campaignData,
            campaignName: `${campaignData.campaignName} - Campaign ${i + 1}`
          };

          addLog(`Creating campaign ${i + 1}/${scenario.campaigns}...`);
          this.updateTestProgress(testId, 30 + (i / scenario.campaigns) * 50, `Creating campaign ${i + 1}...`);

          const campResult = await facebookApi.createCampaignStructure(campaignDataCopy);
          result.campaigns.push(campResult);
          result.totalAdSets++;
          result.totalAds++;

          // Duplicate ad sets if needed
          if (scenario.adSetCount > 1) {
            const adSetsToCreate = scenario.adSetCount - 1;
            addLog(`Duplicating ${adSetsToCreate} ad sets for campaign ${i + 1}...`);

            // CRITICAL: Ensure we have postId before duplication (for non-dynamic-creative scenarios)
            const isDynamicCreative = campaignDataCopy.dynamicCreativeEnabled || campaignDataCopy.dynamicTextEnabled;
            let postId = campResult.postId;

            if (isDynamicCreative) {
              addLog(`Creative Strategy: Dynamic Creative (using asset_feed_spec)`);
            } else {
              addLog(`Creative Strategy: PostId (using object_story_id for 100% root effect)`);

              // Try to get postId with retries if not already available
              if (!postId && campResult.ads?.[0]?.id) {
                addLog('Fetching post ID from created ad (with retries)...');
                const maxRetries = 5;
                const retryDelays = [2000, 3000, 5000, 8000, 12000];

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                  try {
                    postId = await facebookApi.getPostIdFromAd(campResult.ads[0].id);
                    if (postId) {
                      addLog(`Post ID fetched on attempt ${attempt}: ${postId}`);
                      break;
                    }

                    if (attempt < maxRetries) {
                      const delay = retryDelays[attempt - 1];
                      addLog(`Attempt ${attempt}/${maxRetries} returned null, waiting ${delay/1000}s...`);
                      await new Promise(resolve => setTimeout(resolve, delay));
                    }
                  } catch (err) {
                    if (attempt < maxRetries) {
                      const delay = retryDelays[attempt - 1];
                      addLog(`Attempt ${attempt}/${maxRetries} error: ${err.message}, waiting ${delay/1000}s...`);
                      await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                      addLog(`CRITICAL ERROR: All ${maxRetries} attempts to fetch postId failed: ${err.message}`);
                    }
                  }
                }

                // FAIL EARLY: If we still don't have postId for non-DC scenario, throw error
                if (!postId) {
                  throw new Error(`CRITICAL: Cannot proceed with duplication for campaign ${i + 1} - postId not available.`);
                }
              } else if (postId) {
                addLog(`Post ID already available: ${postId}`);
              } else {
                throw new Error(`CRITICAL: No ads created for campaign ${i + 1} and no postId available.`);
              }
            }

            const BatchDuplicationService = require('./batchDuplication');
            const batchService = new BatchDuplicationService(
              facebookApi.accessToken,
              resources.adAccountId.replace('act_', ''),
              resources.pageId,
              resources.pixelId
            );

            const batchResult = await batchService.duplicateAdSetsBatch(
              campResult.adSet.id,
              campResult.campaign.id,
              postId || null,
              adSetsToCreate,
              {
                ...campaignDataCopy,
                mediaHashes: campResult.mediaHashes,
                // CRITICAL: Pass all fields needed for both postId and dynamic creative scenarios
                dynamicCreativeEnabled: campaignDataCopy.dynamicCreativeEnabled,
                dynamicTextEnabled: campaignDataCopy.dynamicTextEnabled,
                primaryTextVariations: campaignDataCopy.primaryTextVariations,
                headlineVariations: campaignDataCopy.headlineVariations,
                primaryText: campaignDataCopy.primaryText,
                headline: campaignDataCopy.headline,
                description: campaignDataCopy.description,
                url: campaignDataCopy.url,
                displayLink: campaignDataCopy.displayLink,
                callToAction: campaignDataCopy.callToAction
              }
            );

            result.totalAdSets += batchResult.adSets.length;
            result.totalAds += batchResult.ads.length;
          }

          // Delay between campaigns to avoid rate limits
          if (i < scenario.campaigns - 1) {
            addLog('Waiting 5 seconds before next campaign...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }

      this.updateTestProgress(testId, 90, 'Verifying results...');

      // Verify the results
      const verificationResult = await this.verifyTestResults(result, scenario, facebookApi, addLog);

      // Calculate final results
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Extract campaign info for UI
      const campaignIds = this.extractCampaignIds(result);
      const numCampaigns = scenario.campaigns || 1;
      // Expected ad sets/ads = (ad sets per campaign) * (number of campaigns)
      const expectedAdSets = (scenario.adSetCount || 1) * numCampaigns;
      const expectedAds = (scenario.adSetCount || 1) * numCampaigns;
      const actualAdSets = verificationResult.actual.adSets;
      const actualAds = verificationResult.actual.ads;

      const finalResult = {
        testId,
        scenarioId,
        scenarioName: scenario.name,
        status: verificationResult.passed ? 'passed' : 'failed',
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: duration * 1000, // Frontend expects milliseconds
        durationFormatted: `${duration.toFixed(1)}s`,
        expected: {
          campaigns: scenario.campaigns || 1,
          adSets: expectedAdSets,
          ads: expectedAds
        },
        actual: verificationResult.actual,
        // Frontend-compatible verification format
        verification: {
          expectedAdSets,
          actualAdSets,
          expectedAds,
          actualAds,
          adSetsMatch: actualAdSets === expectedAdSets,
          adsMatch: actualAds === expectedAds,
          passed: verificationResult.passed,
          issues: verificationResult.issues
        },
        // Frontend expects createdCampaign object
        createdCampaign: campaignIds.length > 0 ? {
          campaignId: campaignIds[0],
          campaignName: result.campaign?.name || result.campaigns?.[0]?.name || `Campaign ${campaignIds[0]}`,
          adSetCount: actualAdSets,
          adCount: actualAds
        } : null,
        campaignIds,
        result,
        logs: this.activeTests.get(testId)?.logs || []
      };

      this.updateTestProgress(testId, 100, 'Test complete');
      this.testResults.set(testId, finalResult);
      this.activeTests.delete(testId);

      addLog(`Test ${verificationResult.passed ? 'PASSED' : 'FAILED'}: ${campaignIds.length}/${numCampaigns} campaigns, ${actualAdSets}/${expectedAdSets} ad sets, ${actualAds}/${expectedAds} ads`);

      return finalResult;

    } catch (error) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      addLog(`Test FAILED with error: ${error.message}`);

      const errorResult = {
        testId,
        scenarioId,
        scenarioName: scenario.name,
        status: 'error',
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: duration * 1000, // Frontend expects milliseconds
        durationFormatted: `${duration.toFixed(1)}s`,
        error: error.message,
        verification: null,
        createdCampaign: null,
        logs: this.activeTests.get(testId)?.logs || []
      };

      this.testResults.set(testId, errorResult);
      this.activeTests.delete(testId);

      return errorResult;
    }
  }

  /**
   * Update test progress
   */
  updateTestProgress(testId, progress, message) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = progress;
      test.progressMessage = message;
    }
  }

  /**
   * Verify test results by checking actual campaign structure
   */
  async verifyTestResults(result, scenario, facebookApi, addLog) {
    const verification = {
      passed: true,
      actual: { campaigns: 0, adSets: 0, ads: 0 },
      issues: [],
      fieldsChecked: []
    };

    try {
      // Get campaign IDs to verify
      const campaignIds = this.extractCampaignIds(result);
      verification.actual.campaigns = campaignIds.length;

      addLog(`Verifying ${campaignIds.length} campaign(s)...`);

      for (const campaignId of campaignIds) {
        // Fetch campaign structure from Facebook
        const campaignData = await facebookApi.getCampaignStructure(campaignId);

        if (campaignData.adsets) {
          verification.actual.adSets += campaignData.adsets.length;
          verification.actual.ads += campaignData.adsets.reduce((sum, adset) =>
            sum + (adset.ads?.data?.length || 0), 0);
        }
      }

      // Check expected vs actual
      const expectedAdSets = (scenario.campaigns || 1) * (scenario.adSetCount || 1);
      const expectedAds = expectedAdSets;

      if (verification.actual.adSets !== expectedAdSets) {
        verification.passed = false;
        verification.issues.push({
          type: 'count_mismatch',
          entity: 'adSets',
          expected: expectedAdSets,
          actual: verification.actual.adSets
        });
      }

      if (verification.actual.ads !== expectedAds) {
        verification.passed = false;
        verification.issues.push({
          type: 'count_mismatch',
          entity: 'ads',
          expected: expectedAds,
          actual: verification.actual.ads
        });
      }

      addLog(`Verification: ${verification.actual.adSets}/${expectedAdSets} ad sets, ${verification.actual.ads}/${expectedAds} ads`);

    } catch (error) {
      addLog(`Verification error: ${error.message}`);
      verification.issues.push({
        type: 'verification_error',
        message: error.message
      });
    }

    return verification;
  }

  /**
   * Extract campaign IDs from result
   */
  extractCampaignIds(result) {
    const ids = [];

    if (result.campaign?.id) {
      ids.push(result.campaign.id);
    }

    // Handle campaign copies (from duplicateCampaignBatch)
    if (result.campaignCopies) {
      result.campaignCopies.forEach(copy => {
        if (copy.id) ids.push(copy.id);
      });
    }

    // Handle strategyForAll campaigns
    if (result.campaigns) {
      result.campaigns.forEach(c => {
        if (c.campaign?.id) ids.push(c.campaign.id);
      });
    }

    return ids;
  }

  /**
   * Get test progress
   */
  getTestProgress(testId) {
    return this.activeTests.get(testId) || null;
  }

  /**
   * Get test result
   */
  getTestResult(testId) {
    return this.testResults.get(testId) || null;
  }

  /**
   * Get all test results
   */
  getAllResults() {
    return Array.from(this.testResults.values());
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.testResults.clear();
  }

  /**
   * Get active tests
   */
  getActiveTests() {
    return Array.from(this.activeTests.entries()).map(([id, test]) => ({
      testId: id,
      ...test
    }));
  }

  /**
   * Delete test campaigns from Facebook
   */
  async cleanupTestCampaigns(campaignIds, facebookApi) {
    const results = [];

    for (const campaignId of campaignIds) {
      try {
        await facebookApi.deleteCampaign(campaignId);
        results.push({ campaignId, status: 'deleted' });
      } catch (error) {
        results.push({ campaignId, status: 'error', error: error.message });
      }
    }

    return results;
  }
}

module.exports = new TestRunnerService();
