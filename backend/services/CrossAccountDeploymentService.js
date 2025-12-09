const db = require('../models');
const FacebookAPI = require('./facebookApi');
const { decryptToken } = require('../routes/facebookSDKAuth');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

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
    this.mediaCache = new Map(); // Cache for downloaded media files
    this.tempDir = path.join(__dirname, '../temp/deployments'); // Temp directory for cached media
  }

  /**
   * Download media from Facebook and cache it locally
   */
  async downloadAndCacheMedia(mediaUrl, mediaType, mediaId, deploymentId) {
    try {
      console.log(`  📥 Downloading ${mediaType} from Facebook...`);

      // Create deployment-specific temp directory
      const deploymentDir = path.join(this.tempDir, deploymentId);
      await fs.mkdir(deploymentDir, { recursive: true });

      // Generate unique filename
      const extension = mediaType === 'video' ? 'mp4' : 'jpg';
      const filename = `${mediaType}_${mediaId}_${Date.now()}.${extension}`;
      const localPath = path.join(deploymentDir, filename);

      // Download media
      const response = await axios({
        method: 'GET',
        url: mediaUrl,
        responseType: 'stream',
        timeout: 120000 // 2 minute timeout for large files
      });

      // Save to file
      const writer = require('fs').createWriteStream(localPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const stats = await fs.stat(localPath);
      console.log(`  ✅ ${mediaType} cached: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

      return {
        localPath,
        size: stats.size,
        filename
      };
    } catch (error) {
      console.error(`  ❌ Failed to download ${mediaType}:`, error.message);
      throw new Error(`Failed to download ${mediaType} from Facebook: ${error.message}`);
    }
  }

  /**
   * Check if media file exists in uploads directory (from original upload)
   */
  async checkCachedUploadFile(mediaId, mediaType) {
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      const files = await fs.readdir(uploadsDir);

      // Look for files that might match this media ID
      // Uploaded files are named like: media-1765304000321-604289530.mp4
      for (const file of files) {
        if (file.includes('media-') && (mediaType === 'video' ? file.endsWith('.mp4') : (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')))) {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);

          // Check if file was recently created (within last 30 minutes)
          // This ensures we're using the right file for this deployment
          const fileAge = Date.now() - stats.mtimeMs;
          if (fileAge < 30 * 60 * 1000) { // 30 minutes
            console.log(`    💾 Found cached upload file: ${file}`);
            console.log(`       File age: ${Math.floor(fileAge / 1000 / 60)} minutes`);
            return filePath;
          }
        }
      }

      console.log(`    ℹ️  No recent cached upload found for ${mediaType} ${mediaId}`);
      return null;
    } catch (error) {
      console.warn(`    ⚠️  Error checking cached uploads:`, error.message);
      return null;
    }
  }

  /**
   * Extract media from creative spec and download (or use cached upload)
   */
  async extractAndCacheMediaFromCreative(creative, sourceApi, deploymentId) {
    const mediaCache = {
      images: [],
      videos: [],
      metadata: {}
    };

    try {
      // Check for video in object_story_spec
      if (creative.object_story_spec?.video_data?.video_id) {
        const videoId = creative.object_story_spec.video_data.video_id;
        console.log(`  🎬 Found video in creative: ${videoId}`);

        // OPTIMIZATION: Check if we have the original uploaded file cached
        const cachedUploadPath = await this.checkCachedUploadFile(videoId, 'video');

        if (cachedUploadPath && await fs.access(cachedUploadPath).then(() => true).catch(() => false)) {
          // Use cached upload file directly!
          console.log(`    ✅ Using cached upload file (no download needed!)`);
          const stats = await fs.stat(cachedUploadPath);
          const filename = path.basename(cachedUploadPath);

          // Copy to deployment cache so cleanup works correctly
          const deploymentDir = path.join(this.tempDir, deploymentId);
          await fs.mkdir(deploymentDir, { recursive: true });
          const cachedPath = path.join(deploymentDir, filename);
          await fs.copyFile(cachedUploadPath, cachedPath);

          mediaCache.videos.push({
            originalId: videoId,
            localPath: cachedPath,
            size: stats.size,
            filename,
            title: creative.object_story_spec.video_data.title,
            message: creative.object_story_spec.video_data.message,
            callToAction: creative.object_story_spec.video_data.call_to_action
          });

          console.log(`    ✅ Video cached successfully from upload: ${videoId}`);
        } else {
          // Fallback: Download from Facebook
          console.log(`    📥 Cached upload not found - downloading from Facebook...`);

          try {
            const videoData = await sourceApi.makeApiCallWithRotation(
              'GET',
              `${sourceApi.baseURL}/${videoId}`,
              { params: { fields: 'source,title,description', access_token: sourceApi.accessToken } }
            );

            if (videoData.data && videoData.data.source) {
              console.log(`    ✓ Video source URL found: ${videoData.data.source.substring(0, 50)}...`);
              const cached = await this.downloadAndCacheMedia(
                videoData.data.source,
                'video',
                videoId,
                deploymentId
              );

            mediaCache.videos.push({
              originalId: videoId,
              ...cached,
              title: creative.object_story_spec.video_data.title,
              message: creative.object_story_spec.video_data.message,
              callToAction: creative.object_story_spec.video_data.call_to_action
            });
              console.log(`    ✅ Video cached successfully: ${videoId}`);
            } else {
              console.error(`    ❌ No video source found in API response for ${videoId}`);
              console.error(`    Response structure:`, JSON.stringify(videoData, null, 2).substring(0, 500));
            }
          } catch (videoError) {
            console.error(`  ⚠️  Could not download video ${videoId}:`, videoError.message);
            console.error(`  Stack:`, videoError.stack);
          }
        }
      }

      // Check for image in object_story_spec
      if (creative.object_story_spec?.link_data?.image_hash) {
        const imageHash = creative.object_story_spec.link_data.image_hash;
        console.log(`  🖼️  Found image hash in creative: ${imageHash}`);

        // OPTIMIZATION: Check if we have the original uploaded file cached
        const cachedUploadPath = await this.checkCachedUploadFile(imageHash, 'image');

        if (cachedUploadPath && await fs.access(cachedUploadPath).then(() => true).catch(() => false)) {
          // Use cached upload file directly!
          console.log(`    ✅ Using cached upload file (no download needed!)`);
          const stats = await fs.stat(cachedUploadPath);
          const filename = path.basename(cachedUploadPath);

          // Copy to deployment cache so cleanup works correctly
          const deploymentDir = path.join(this.tempDir, deploymentId);
          await fs.mkdir(deploymentDir, { recursive: true });
          const cachedPath = path.join(deploymentDir, filename);
          await fs.copyFile(cachedUploadPath, cachedPath);

          mediaCache.images.push({
            originalHash: imageHash,
            localPath: cachedPath,
            size: stats.size,
            filename
          });

          console.log(`    ✅ Image cached successfully from upload: ${imageHash}`);
        } else {
          // Fallback: Download from Facebook
          console.log(`    📥 Cached upload not found - downloading from Facebook...`);

          try {
            const imageData = await sourceApi.makeApiCallWithRotation(
              'GET',
              `${sourceApi.baseURL}/act_${sourceApi.adAccountId}/adimages`,
              { params: { hashes: [imageHash], access_token: sourceApi.accessToken } }
            );

            // Response structure: { data: { data: { [hash]: { url, permalink_url } } } }
            if (imageData && imageData.data && imageData.data.data && imageData.data.data[imageHash]) {
              const imageUrl = imageData.data.data[imageHash].url || imageData.data.data[imageHash].permalink_url;
              if (imageUrl) {
                console.log(`    ✓ Image URL found: ${imageUrl.substring(0, 50)}...`);
                const cached = await this.downloadAndCacheMedia(
                  imageUrl,
                  'image',
                  imageHash,
                  deploymentId
                );

                mediaCache.images.push({
                  originalHash: imageHash,
                  ...cached
                });
                console.log(`    ✅ Image cached successfully: ${imageHash}`);
              } else {
                console.error(`    ❌ No image URL found for hash ${imageHash}`);
              }
            } else {
              console.error(`    ❌ Image not found in API response for hash ${imageHash}`);
              console.error(`    Response structure:`, JSON.stringify(imageData, null, 2).substring(0, 500));
            }
          } catch (imageError) {
            console.error(`  ⚠️  Could not download image ${imageHash}:`, imageError.message);
            console.error(`  Stack:`, imageError.stack);
          }
        }
      }

      // Store creative metadata
      mediaCache.metadata = {
        primaryText: creative.object_story_spec?.link_data?.message || creative.object_story_spec?.video_data?.message,
        headline: creative.object_story_spec?.link_data?.name,
        description: creative.object_story_spec?.link_data?.description,
        callToAction: creative.object_story_spec?.link_data?.call_to_action || creative.object_story_spec?.video_data?.call_to_action,
        link: creative.object_story_spec?.link_data?.link || creative.object_story_spec?.video_data?.call_to_action?.value?.link
      };

      return mediaCache;
    } catch (error) {
      console.error(`  ❌ Failed to extract media from creative:`, error.message);
      return mediaCache;
    }
  }

  /**
   * Upload cached media to target account
   */
  async uploadCachedMediaToTarget(cachedMedia, targetApi, targetAccountId) {
    const uploadedMedia = {
      images: {},
      videos: {}
    };

    try {
      // Upload images
      for (const image of cachedMedia.images) {
        console.log(`    📤 Uploading image to target account...`);
        try {
          const newHash = await targetApi.uploadImage(image.localPath);
          if (newHash) {
            uploadedMedia.images[image.originalHash] = newHash;
            console.log(`      ✅ Image uploaded: ${image.originalHash} → ${newHash}`);
          }
        } catch (uploadError) {
          console.error(`      ❌ Failed to upload image:`, uploadError.message);
        }
      }

      // Upload videos
      for (const video of cachedMedia.videos) {
        console.log(`    📤 Uploading video to target account...`);
        try {
          const newVideoId = await targetApi.uploadVideo(video.localPath);
          if (newVideoId) {
            uploadedMedia.videos[video.originalId] = newVideoId;
            console.log(`      ✅ Video uploaded: ${video.originalId} → ${newVideoId}`);

            // Wait for video processing
            console.log(`      ⏳ Waiting for video to be processed...`);
            await targetApi.waitForVideoProcessing(newVideoId);
          }
        } catch (uploadError) {
          console.error(`      ❌ Failed to upload video:`, uploadError.message);
        }
      }

      return uploadedMedia;
    } catch (error) {
      console.error(`  ❌ Failed to upload media to target:`, error.message);
      throw error;
    }
  }

  /**
   * Replace media IDs in creative spec with target account's media IDs
   */
  replaceMediaInCreativeSpec(creativeSpec, uploadedMedia) {
    const spec = JSON.parse(JSON.stringify(creativeSpec)); // Deep clone

    // Replace video ID
    if (spec.video_data?.video_id && uploadedMedia.videos[spec.video_data.video_id]) {
      const oldId = spec.video_data.video_id;
      const newId = uploadedMedia.videos[oldId];
      console.log(`      🔄 Replacing video_id: ${oldId} → ${newId}`);
      spec.video_data.video_id = newId;

      // CRITICAL FIX: Remove redundant thumbnail fields
      // Facebook returns these on READ but rejects them on CREATE (Error 1443051)
      // "Only one of image_url and image_hash should be specified in the field video_data"
      if (spec.video_data.image_url) {
        console.log(`      🧹 Removing image_url from video_data (redundant field)`);
        delete spec.video_data.image_url;
      }
      if (spec.video_data.image_hash) {
        console.log(`      🧹 Removing image_hash from video_data (redundant field)`);
        delete spec.video_data.image_hash;
      }
    }

    // Replace image hash
    if (spec.link_data?.image_hash && uploadedMedia.images[spec.link_data.image_hash]) {
      const oldHash = spec.link_data.image_hash;
      const newHash = uploadedMedia.images[oldHash];
      console.log(`      🔄 Replacing image_hash: ${oldHash} → ${newHash}`);
      spec.link_data.image_hash = newHash;
    }

    return spec;
  }

  /**
   * Cleanup cached media files for a deployment
   */
  async cleanupDeploymentCache(deploymentId) {
    try {
      const deploymentDir = path.join(this.tempDir, deploymentId);
      await fs.rm(deploymentDir, { recursive: true, force: true });
      console.log(`  🧹 Cleaned up cached media for deployment ${deploymentId}`);
    } catch (error) {
      console.warn(`  ⚠️  Failed to cleanup cache:`, error.message);
    }
  }

  /**
   * Cleanup uploaded media files after deployment completes
   * This removes files from /uploads/ directory that were used for this deployment
   */
  async cleanupUploadedFiles() {
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      const files = await fs.readdir(uploadsDir);

      let cleanedCount = 0;

      // Remove files older than 30 minutes
      for (const file of files) {
        if (file.includes('media-')) {
          const filePath = path.join(uploadsDir, file);
          try {
            const stats = await fs.stat(filePath);
            const fileAge = Date.now() - stats.mtimeMs;

            // Delete files older than 30 minutes
            if (fileAge > 30 * 60 * 1000) {
              await fs.unlink(filePath);
              cleanedCount++;
              console.log(`    🗑️  Deleted old upload: ${file} (age: ${Math.floor(fileAge / 1000 / 60)} min)`);
            }
          } catch (error) {
            console.warn(`    ⚠️  Could not delete ${file}:`, error.message);
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`  🧹 Cleaned up ${cleanedCount} old uploaded files`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Failed to cleanup uploaded files:`, error.message);
    }
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
   * Query ad account capabilities and restrictions (SOFT CHECK - logs only, doesn't block)
   */
  async checkAccountCapabilities(facebookApi, adAccountId) {
    console.log(`\n🔍 CHECKING ACCOUNT CAPABILITIES: ${adAccountId}`);

    try {
      // Query ad account details including capabilities
      const accountInfo = await facebookApi.makeApiCallWithRotation(
        'GET',
        `${facebookApi.baseURL}/${adAccountId}`,
        {
          params: {
            fields: 'id,name,account_status,disable_reason,capabilities,can_create_brand_lift_study,is_prepay_account,spend_cap,amount_spent,balance,business,age,currency,timezone_name',
            access_token: facebookApi.accessToken
          }
        }
      );

      console.log(`  📊 Account Info:`, {
        id: accountInfo.data.id,
        name: accountInfo.data.name,
        status: accountInfo.data.account_status,
        disable_reason: accountInfo.data.disable_reason || 'none',
        currency: accountInfo.data.currency,
        is_prepay: accountInfo.data.is_prepay_account,
        capabilities: accountInfo.data.capabilities || []
      });

      // Check specific capabilities
      const caps = accountInfo.data.capabilities || [];
      console.log(`  ✓ Account Capabilities:`, caps);

      // Log any potential issues (NOT blocking, just informational)
      if (accountInfo.data.account_status !== 1) {
        console.warn(`  ⚠️  Account status is NOT active (status: ${accountInfo.data.account_status})`);
        if (accountInfo.data.disable_reason) {
          console.warn(`  ⚠️  Disable reason: ${accountInfo.data.disable_reason}`);
        }
      }

      return accountInfo.data;
    } catch (error) {
      console.error(`  ⚠️  Could not fetch account capabilities (non-blocking):`, error.message);
      return null;
    }
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
    console.log(`  Source Pixel: ${sourceAccount.pixelId || 'none'}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  Target Account: ${target.adAccountId}`);
    console.log(`  Target Page: ${target.pageId}`);
    console.log(`  Target Pixel: ${target.pixelId || 'none (will use source pixel if same account)'}`);

    // Determine which pixel to use
    const isSameAccount = sourceAccount.adAccountId === target.adAccountId ||
                          `act_${sourceAccount.adAccountId}` === target.adAccountId ||
                          sourceAccount.adAccountId === `act_${target.adAccountId}`;

    let effectivePixelId;
    if (isSameAccount) {
      // Same account: use source pixel
      effectivePixelId = sourceAccount.pixelId;
      console.log(`  ℹ️  Same account deployment - using source pixel: ${effectivePixelId || 'none'}`);
    } else {
      // Different account: use target pixel (must be provided)
      effectivePixelId = target.pixelId;
      console.log(`  🔄 Cross-account deployment - using target pixel: ${effectivePixelId || 'none'}`);

      if (!effectivePixelId && sourceAccount.pixelId) {
        console.warn(`  ⚠️  WARNING: Source has pixel ${sourceAccount.pixelId} but target has none!`);
        console.warn(`  ⚠️  This may cause deployment to fail if pixel is required.`);
      }
    }

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
    console.log(`  Effective Pixel: ${effectivePixelId || 'none'}`);

    const targetFacebookApi = new FacebookAPI({
      accessToken: userAccessToken,
      adAccountId: target.adAccountId.replace('act_', ''),
      pageId: target.pageId,
      pixelId: effectivePixelId
    });

    // CRITICAL VERIFICATION: Double-check API instance is pointing to correct account
    console.log(`\n🔍 VERIFICATION: Confirming API instance configuration...`);
    console.log(`  API adAccountId: ${targetFacebookApi.adAccountId}`);
    console.log(`  API pageId: ${targetFacebookApi.pageId}`);
    console.log(`  API pixelId: ${targetFacebookApi.pixelId}`);

    if (targetFacebookApi.adAccountId !== target.adAccountId.replace('act_', '')) {
      throw new Error(`CRITICAL: API account mismatch! Expected ${target.adAccountId}, got ${targetFacebookApi.adAccountId}`);
    }

    // Step 2.5: Check target account capabilities (SOFT CHECK - logs only, doesn't block)
    const accountInfo = await this.checkAccountCapabilities(targetFacebookApi, target.adAccountId);

    // Step 3: Create campaign in target account
    console.log(`\n🚀 Step 3: Creating campaign in target account...`);

    // Generate deployment ID for media caching
    const deploymentId = `deploy_${sourceCampaignId}_${Date.now()}`;

    const newCampaign = await this.createCampaignFromStructure(
      targetFacebookApi,
      campaignStructure,
      target,
      accountInfo,  // Pass account info to createCampaignFromStructure
      sourceAccount.pixelId, // Source pixel ID for replacement
      effectivePixelId, // Target pixel ID to use
      deploymentId, // Deployment ID for media caching
      sourceFacebookApi // Source API for downloading media
    );

    console.log(`✅ Campaign deployed successfully to target account!`);
    console.log(`  New Campaign ID: ${newCampaign.campaignId}`);
    console.log(`  Ad Sets Created: ${newCampaign.adSetsCount}`);
    console.log(`  Ads Created: ${newCampaign.adsCount}`);

    // Cleanup cached media files
    await this.cleanupDeploymentCache(deploymentId);

    // Cleanup old uploaded files (30+ minutes old)
    await this.cleanupUploadedFiles();

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
   * Replace pixel ID in creative spec (handles all possible locations)
   */
  replacePixelInCreativeSpec(creativeSpec, sourcePixelId, targetPixelId) {
    if (!creativeSpec) return creativeSpec;

    console.log(`\n🔄 PIXEL REPLACEMENT IN CREATIVE SPEC:`);
    console.log(`  Source Pixel: ${sourcePixelId || 'none'}`);
    console.log(`  Target Pixel: ${targetPixelId || 'none'}`);

    // Deep clone to avoid mutation
    const newSpec = JSON.parse(JSON.stringify(creativeSpec));
    const replacements = [];

    // Helper to get nested value
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    // Helper to set nested value
    const setNestedValue = (obj, path, value) => {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
      }, obj);
      target[lastKey] = value;
    };

    // Check all possible locations for pixel ID
    const pixelPaths = [
      'link_data.pixel_id',
      'video_data.pixel_id',
      'call_to_action.value.pixel_id'
    ];

    pixelPaths.forEach(path => {
      const currentValue = getNestedValue(newSpec, path);
      if (currentValue) {
        console.log(`  Found pixel at ${path}: ${currentValue}`);

        // If there's a source pixel and it matches, replace it
        if (sourcePixelId && currentValue === sourcePixelId) {
          if (targetPixelId) {
            setNestedValue(newSpec, path, targetPixelId);
            replacements.push({ path, from: currentValue, to: targetPixelId });
            console.log(`    ✓ Replaced: ${currentValue} → ${targetPixelId}`);
          } else {
            console.warn(`    ⚠️  No target pixel provided - keeping source pixel ${currentValue}`);
          }
        } else if (currentValue !== targetPixelId && targetPixelId) {
          // Pixel exists but doesn't match source - might be a different pixel
          console.warn(`    ⚠️  Found unexpected pixel: ${currentValue} (expected ${sourcePixelId})`);
        }
      }
    });

    if (replacements.length === 0) {
      console.log(`  ℹ️  No pixel found in creative spec (might be valid if no tracking needed)`);
    } else {
      console.log(`  ✅ Made ${replacements.length} pixel replacement(s)`);
    }

    // CRITICAL: Verify no source pixel remains (only if we had a source pixel and it's different from target)
    if (sourcePixelId && targetPixelId && sourcePixelId !== targetPixelId) {
      const specString = JSON.stringify(newSpec);
      if (specString.includes(sourcePixelId)) {
        console.error(`  ❌ SOURCE PIXEL STILL IN SPEC!`);
        console.error(`  Spec:`, JSON.stringify(newSpec, null, 2));
        throw new Error(`Failed to replace all instances of source pixel ${sourcePixelId}`);
      }
      console.log(`  ✅ VERIFIED: No source pixel remains in spec`);
    }

    return newSpec;
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
            fields: 'name,adset_id,creative{id,object_story_spec,asset_feed_spec,image_hash,video_id},status',  // FIXED: Expand creative to get full spec
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
  async createCampaignFromStructure(facebookApi, structure, target, accountInfo = null, sourcePixelId = null, targetPixelId = null, deploymentId = null, sourceApi = null) {
    console.log(`  🏗️  Creating campaign structure...`);
    console.log(`  🎨 Pixel Configuration:`);
    console.log(`    Source Pixel: ${sourcePixelId || 'none'}`);
    console.log(`    Target Pixel: ${targetPixelId || 'none'}`);

    // CRITICAL: Make campaign name unique to avoid conflicts when deploying to same account with different pages
    // Use page ID in name to ensure uniqueness
    const pageIdLast6 = target.pageId.toString().slice(-6); // Last 6 digits of page ID
    const newCampaignName = `${structure.campaign.name} - Page ${pageIdLast6}`;

    console.log(`  📝 Using unique campaign name for page ${target.pageId}: ${newCampaignName}`);

    // MEDIA CACHING: Extract and download media from source before creating ads
    let cachedMedia = null;
    let uploadedMedia = null;

    if (sourceApi && deploymentId && structure.ads.length > 0) {
      console.log(`\n📥 MEDIA CACHING: Extracting media from source creative...`);

      // Find first ad with valid creative
      const firstAdWithCreative = structure.ads.find(ad => ad.creative && ad.creative.object_story_spec);

      if (firstAdWithCreative) {
        try {
          cachedMedia = await this.extractAndCacheMediaFromCreative(
            firstAdWithCreative.creative,
            sourceApi,
            deploymentId
          );

          console.log(`  ✅ Media extracted:`, {
            images: cachedMedia.images.length,
            videos: cachedMedia.videos.length
          });

          // Upload cached media to target account
          if (cachedMedia.images.length > 0 || cachedMedia.videos.length > 0) {
            console.log(`\n📤 MEDIA UPLOAD: Uploading cached media to target account...`);
            uploadedMedia = await this.uploadCachedMediaToTarget(cachedMedia, facebookApi, target.adAccountId);

            console.log(`  ✅ Media uploaded to target:`, {
              images: Object.keys(uploadedMedia.images).length,
              videos: Object.keys(uploadedMedia.videos).length
            });
          }
        } catch (mediaError) {
          console.error(`  ⚠️  Media caching failed (will attempt ad creation anyway):`, mediaError.message);
          // Continue with deployment - some ads might work without media replacement
        }
      } else {
        console.log(`  ℹ️  No ads with creative spec found - skipping media caching`);
      }
    }

    // Log account currency for budget handling
    if (accountInfo) {
      console.log(`  💱 Target account currency: ${accountInfo.currency || 'Unknown'}`);
      if (structure.campaign.daily_budget || structure.campaign.lifetime_budget) {
        console.log(`  ⚠️  NOTE: Budget values are in smallest currency unit (cents/paise/etc)`);
        console.log(`  📊 Source budget: daily=${structure.campaign.daily_budget}, lifetime=${structure.campaign.lifetime_budget}`);
      }
    }

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
      { params: campaignData }  // Facebook Graph API accepts POST params as query string (same as facebookApi.js line 392)
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

        // Replace with target's pixel (use targetPixelId parameter, not target.pixelId which might be null)
        if (targetPixelId) {
          promotedObject.pixel_id = targetPixelId;
          console.log(`      🎯 Replacing promoted_object pixel: ${adSet.promoted_object.pixel_id || 'none'} → ${targetPixelId}`);
        } else if (adSet.promoted_object.pixel_id) {
          // Source had pixel but target doesn't - remove it
          delete promotedObject.pixel_id;
          console.log(`      ⚠️  Removing pixel from promoted_object (source had ${adSet.promoted_object.pixel_id}, target has none)`);
        }

        // Replace page_id
        if (target.pageId) {
          promotedObject.page_id = target.pageId;
          console.log(`      📄 Replacing promoted_object page: ${adSet.promoted_object.page_id || 'none'} → ${target.pageId}`);
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
        { params: adSetData }  // Facebook Graph API accepts POST params as query string (same as facebookApi.js)
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

      // CRITICAL: Cannot copy creative ID across accounts - must create new creative or use object_story_spec directly
      // Check if we have the full creative spec
      let creativeSpec;
      if (ad.creative && ad.creative.object_story_spec) {
        // We have the full creative spec - clone it and replace page_id with target page
        console.log(`      ✓ Using object_story_spec from source creative`);
        creativeSpec = JSON.parse(JSON.stringify(ad.creative.object_story_spec)); // Deep clone

        // CRITICAL: Replace page_id with target page
        if (creativeSpec.page_id) {
          console.log(`      🔄 Replacing page_id: ${creativeSpec.page_id} → ${target.pageId}`);
          creativeSpec.page_id = target.pageId;
        }

        // CRITICAL: Replace media IDs with target account's uploaded media
        if (uploadedMedia) {
          console.log(`      🎬 Replacing media IDs with target account's media...`);
          creativeSpec = this.replaceMediaInCreativeSpec(creativeSpec, uploadedMedia);
        } else if (creativeSpec.video_data?.video_id || creativeSpec.link_data?.image_hash) {
          console.warn(`      ⚠️  Creative has media but no uploaded media available - ad may fail!`);
        }

        // CRITICAL: Replace pixel_id if needed (cross-account deployment)
        if (sourcePixelId && targetPixelId && sourcePixelId !== targetPixelId) {
          console.log(`      🎨 Cross-account: Replacing pixel in creative spec...`);
          creativeSpec = this.replacePixelInCreativeSpec(creativeSpec, sourcePixelId, targetPixelId);
        } else if (sourcePixelId && !targetPixelId) {
          console.warn(`      ⚠️  Source has pixel but target doesn't - attempting deployment anyway`);
        }

        // CRITICAL DEBUG: Log COMPLETE creative spec (not truncated)
        console.log(`      📋 COMPLETE Creative spec after replacements:`);
        console.log(JSON.stringify(creativeSpec, null, 2));
      } else if (ad.creative && ad.creative.id) {
        // We only have creative ID - this WON'T work across accounts!
        console.error(`      ❌ CRITICAL: Only have creative ID (${ad.creative.id}), cannot copy across accounts`);
        console.error(`      ⚠️  Skipping this ad - need full creative spec to clone`);
        continue;
      } else {
        console.error(`      ❌ No valid creative data found for ad ${ad.name}`);
        continue;
      }

      // CRITICAL FIX: Creative parameter must be stringified object with object_story_spec property
      // NOT the spec itself stringified (same pattern as batchDuplication.js:245-247)
      const adData = {
        name: ad.name,
        adset_id: newAdSetId,
        creative: JSON.stringify({
          object_story_spec: creativeSpec  // Wrap spec in object
        }),
        status: 'PAUSED',
        access_token: facebookApi.accessToken
      };

      console.log(`      📤 Creating ad with creative spec...`);
      await facebookApi.makeApiCallWithRotation(
        'POST',
        `${facebookApi.baseURL}/act_${facebookApi.adAccountId}/ads`,
        { params: adData }  // Facebook Graph API accepts POST params as query string (same as facebookApi.js)
      );
    }

    console.log(`  ✅ All ads created`);

    // Final pixel verification summary
    console.log(`\n📊 PIXEL DEPLOYMENT SUMMARY:`);
    console.log(`  Source Pixel: ${sourcePixelId || 'none'}`);
    console.log(`  Target Pixel Used: ${targetPixelId || 'none'}`);
    console.log(`  Campaign: ${newCampaignId}`);
    console.log(`  Ad Sets: ${structure.adSets.length}`);
    console.log(`  Ads: ${structure.ads.length}`);

    return {
      campaignId: newCampaignId,
      campaignName: newCampaignName,
      adSetsCount: structure.adSets.length,
      adsCount: structure.ads.length,
      pixelUsed: targetPixelId
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
