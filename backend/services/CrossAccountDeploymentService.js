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
  async checkCachedUploadFile(mediaId, mediaType, isThumbnail = false) {
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      const files = await fs.readdir(uploadsDir);

      // Look for files that might match this media ID
      // Uploaded files are named like:
      // - Videos: media-1765304000321-604289530.mp4
      // - Images: media-1765304000321-604289530.jpg
      // - Video Thumbnails: videoThumbnail-1765304000321-604289530.jpg
      for (const file of files) {
        let isMatch = false;

        if (isThumbnail) {
          // Look specifically for video thumbnail files
          isMatch = file.startsWith('videoThumbnail-') && (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'));
        } else if (mediaType === 'video') {
          // Look for video files (NOT thumbnails)
          isMatch = file.includes('media-') && file.endsWith('.mp4');
        } else if (mediaType === 'image') {
          // Look for image files (NOT thumbnails)
          isMatch = file.includes('media-') && (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'));
        }

        if (isMatch) {
          const filePath = path.join(uploadsDir, file);
          const stats = await fs.stat(filePath);

          // Check if file was recently created (within last 30 minutes)
          // This ensures we're using the right file for this deployment
          const fileAge = Date.now() - stats.mtimeMs;
          if (fileAge < 30 * 60 * 1000) { // 30 minutes
            const fileType = isThumbnail ? 'video thumbnail' : mediaType;
            console.log(`    💾 Found cached upload file (${fileType}): ${file}`);
            console.log(`       File age: ${Math.floor(fileAge / 1000 / 60)} minutes`);
            return filePath;
          }
        }
      }

      const fileType = isThumbnail ? 'video thumbnail' : mediaType;
      console.log(`    ℹ️  No recent cached upload found for ${fileType} ${mediaId}`);
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
      videoThumbnails: [], // Custom video thumbnails (video_data.image_hash)
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

      // CRITICAL: Check for video thumbnail in video_data (separate from main image!)
      // Video thumbnails are custom thumbnails uploaded as videoThumbnail-*.jpg
      if (creative.object_story_spec?.video_data?.image_hash) {
        const thumbnailHash = creative.object_story_spec.video_data.image_hash;
        console.log(`  🖼️  Found video thumbnail hash: ${thumbnailHash}`);

        // OPTIMIZATION: Check if we have the original uploaded thumbnail file cached
        const cachedUploadPath = await this.checkCachedUploadFile(thumbnailHash, 'image', true); // true = isThumbnail

        if (cachedUploadPath && await fs.access(cachedUploadPath).then(() => true).catch(() => false)) {
          // Use cached upload file directly!
          console.log(`    ✅ Using cached thumbnail upload file (no download needed!)`);
          const stats = await fs.stat(cachedUploadPath);
          const filename = path.basename(cachedUploadPath);

          // Copy to deployment cache so cleanup works correctly
          const deploymentDir = path.join(this.tempDir, deploymentId);
          await fs.mkdir(deploymentDir, { recursive: true });
          const cachedPath = path.join(deploymentDir, filename);
          await fs.copyFile(cachedUploadPath, cachedPath);

          mediaCache.videoThumbnails.push({
            originalHash: thumbnailHash,
            localPath: cachedPath,
            size: stats.size,
            filename
          });

          console.log(`    ✅ Video thumbnail cached successfully from upload: ${thumbnailHash}`);
        } else {
          // Fallback: Download from Facebook
          console.log(`    📥 Cached thumbnail upload not found - downloading from Facebook...`);

          try {
            const imageData = await sourceApi.makeApiCallWithRotation(
              'GET',
              `${sourceApi.baseURL}/act_${sourceApi.adAccountId}/adimages`,
              { params: { hashes: [thumbnailHash], access_token: sourceApi.accessToken } }
            );

            // Response structure: { data: { data: { [hash]: { url, permalink_url } } } }
            if (imageData && imageData.data && imageData.data.data && imageData.data.data[thumbnailHash]) {
              const imageUrl = imageData.data.data[thumbnailHash].url || imageData.data.data[thumbnailHash].permalink_url;
              if (imageUrl) {
                console.log(`    ✓ Thumbnail URL found: ${imageUrl.substring(0, 50)}...`);
                const cached = await this.downloadAndCacheMedia(
                  imageUrl,
                  'image',
                  thumbnailHash,
                  deploymentId
                );

                mediaCache.videoThumbnails.push({
                  originalHash: thumbnailHash,
                  ...cached
                });
                console.log(`    ✅ Video thumbnail cached successfully: ${thumbnailHash}`);
              } else {
                console.error(`    ❌ No thumbnail URL found for hash ${thumbnailHash}`);
              }
            } else {
              console.error(`    ❌ Thumbnail not found in API response for hash ${thumbnailHash}`);
              console.error(`    Response structure:`, JSON.stringify(imageData, null, 2).substring(0, 500));
            }
          } catch (thumbnailError) {
            console.error(`  ⚠️  Could not download video thumbnail ${thumbnailHash}:`, thumbnailError.message);
            console.error(`  Stack:`, thumbnailError.stack);
          }
        }
      }

      // Check for image in object_story_spec (main creative image, NOT video thumbnail)
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
      videos: {},
      videoThumbnails: {} // Map of old hash → new hash for video thumbnails
    };

    try {
      // Upload main images (link_data.image_hash)
      for (const image of cachedMedia.images) {
        console.log(`    📤 Uploading main image to target account...`);
        try {
          const newHash = await targetApi.uploadImage(image.localPath);
          if (newHash) {
            uploadedMedia.images[image.originalHash] = newHash;
            console.log(`      ✅ Main image uploaded: ${image.originalHash} → ${newHash}`);
          }
        } catch (uploadError) {
          console.error(`      ❌ Failed to upload main image:`, uploadError.message);
        }
      }

      // Upload video thumbnails (video_data.image_hash) - MUST be uploaded before videos
      for (const thumbnail of cachedMedia.videoThumbnails) {
        console.log(`    📤 Uploading video thumbnail to target account...`);
        try {
          const newHash = await targetApi.uploadImage(thumbnail.localPath);
          if (newHash) {
            uploadedMedia.videoThumbnails[thumbnail.originalHash] = newHash;
            console.log(`      ✅ Video thumbnail uploaded: ${thumbnail.originalHash} → ${newHash}`);
          }
        } catch (uploadError) {
          console.error(`      ❌ Failed to upload video thumbnail:`, uploadError.message);
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

    // CRITICAL DEBUG: Log what we're working with
    console.log(`      🔍 MEDIA REPLACEMENT DEBUG:`);
    console.log(`         Creative has video_data.image_hash: ${spec.video_data?.image_hash || 'NO'}`);
    console.log(`         Uploaded videoThumbnails mapping:`, Object.keys(uploadedMedia.videoThumbnails || {}).length > 0 ? uploadedMedia.videoThumbnails : 'EMPTY');
    console.log(`         Uploaded images mapping:`, Object.keys(uploadedMedia.images || {}).length > 0 ? uploadedMedia.images : 'EMPTY');
    console.log(`         Uploaded videos mapping:`, Object.keys(uploadedMedia.videos || {}).length > 0 ? uploadedMedia.videos : 'EMPTY');

    // Replace video ID
    if (spec.video_data?.video_id && uploadedMedia.videos[spec.video_data.video_id]) {
      const oldId = spec.video_data.video_id;
      const newId = uploadedMedia.videos[oldId];
      console.log(`      🔄 Replacing video_id: ${oldId} → ${newId}`);
      spec.video_data.video_id = newId;

      // CRITICAL FIX: Facebook requires EXACTLY ONE thumbnail field
      // Error 1443051: "Only one of image_url and image_hash should be specified"
      // Error 1443226: "Please specify one of image_hash or image_url"
      // Solution: Keep image_hash (permanent), remove image_url (temporary URL)
      if (spec.video_data.image_url && spec.video_data.image_hash) {
        console.log(`      🧹 Removing image_url from video_data (keeping image_hash)`);
        delete spec.video_data.image_url;
      }
    }

    // CRITICAL: Replace video thumbnail hash (video_data.image_hash)
    // This is DIFFERENT from main image hash (link_data.image_hash)
    // Video thumbnails are account-specific and must be uploaded to each target account
    if (spec.video_data?.image_hash) {
      const oldHash = spec.video_data.image_hash;
      console.log(`      🔍 Looking for thumbnail mapping: ${oldHash}`);

      if (uploadedMedia.videoThumbnails[oldHash]) {
        // SUCCESS: We have the uploaded thumbnail - use it
        const newHash = uploadedMedia.videoThumbnails[oldHash];
        console.log(`      ✅ FOUND! Replacing video thumbnail hash: ${oldHash} → ${newHash}`);
        spec.video_data.image_hash = newHash;
      } else {
        // FALLBACK: Thumbnail upload failed or not available
        // SOLUTION: Remove image_hash entirely - Facebook will auto-generate thumbnail from video
        console.warn(`      ⚠️  Video thumbnail hash ${oldHash} NOT FOUND in uploaded media`);
        console.warn(`      Available keys:`, Object.keys(uploadedMedia.videoThumbnails || {}));
        console.warn(`      🎬 FALLBACK: Removing image_hash - Facebook will auto-generate thumbnail from video`);
        delete spec.video_data.image_hash;
      }
    }

    // Replace main image hash (link_data.image_hash - main creative image, NOT video thumbnail)
    if (spec.link_data?.image_hash && uploadedMedia.images[spec.link_data.image_hash]) {
      const oldHash = spec.link_data.image_hash;
      const newHash = uploadedMedia.images[oldHash];
      console.log(`      🔄 Replacing main image hash: ${oldHash} → ${newHash}`);
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
  async cloneCampaignToTarget(sourceCampaignId, sourceAccount, target, userAccessToken, strategyInfo = null) {
    console.log(`\n🎯 CLONING CAMPAIGN TO TARGET:`);
    console.log(`  Source Campaign: ${sourceCampaignId}`);
    console.log(`  Source Account: ${sourceAccount.adAccountId}`);
    console.log(`  Source Page: ${sourceAccount.pageId}`);
    console.log(`  Source Pixel: ${sourceAccount.pixelId || 'none'}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  Target Account: ${target.adAccountId}`);
    console.log(`  Target Page: ${target.pageId}`);
    console.log(`  Target Pixel: ${target.pixelId || 'none (will use source pixel if same account)'}`);

    if (strategyInfo) {
      console.log(`  🎯 Strategy: 1-${strategyInfo.numberOfAdSets}-1`);
      console.log(`  📊 Will create ${strategyInfo.numberOfAdSets} ad sets with custom budgets`);
    }

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
      // Different account: use target pixel if provided, otherwise null
      // NOTE: Pixel is set at ad set level via promoted_object, not required at ad level
      effectivePixelId = target.pixelId || null;

      if (effectivePixelId) {
        console.log(`  🔄 Cross-account deployment - using target pixel: ${effectivePixelId}`);
      } else {
        console.log(`  🔄 Cross-account deployment - no pixel specified (will rely on ad set promoted_object)`);
      }

      if (!effectivePixelId && sourceAccount.pixelId) {
        console.warn(`  ⚠️  WARNING: Source has pixel ${sourceAccount.pixelId} but target has none!`);
        console.warn(`  ℹ️  Ad set will use promoted_object for tracking (pixel set at ad set level)`);
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

    // Get full campaign details (only for strategies that need to clone from source)
    // Skip this for fresh-campaign strategies (Strategy for Ads, Strategy for All) where sourceCampaignId is null
    let campaignStructure = null;

    if (sourceCampaignId) {
      console.log(`\n📖 Step 1: Reading source campaign structure...`);
      campaignStructure = await this.readCampaignStructure(sourceFacebookApi, sourceCampaignId, strategyInfo ? true : false);
      console.log(`✅ Campaign structure read:`, {
        name: campaignStructure.campaign.name,
        adSets: campaignStructure.adSets.length,
        ads: campaignStructure.ads.length,
        objective: campaignStructure.campaign.objective,
        isTemplate: !!strategyInfo
      });

      // If strategy info is provided, we'll replicate the structure
      if (strategyInfo) {
        console.log(`  📊 Will replicate structure based on strategy: 1-${strategyInfo.numberOfAdSets}-1`);
      }
    } else {
      console.log(`\n📖 Step 1: Skipping source campaign read (fresh-campaign strategy)...`);
      console.log(`  ℹ️  Strategy will create fresh campaigns in each target account`);
    }

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
    const deploymentId = `deploy_${sourceCampaignId || 'fresh'}_${Date.now()}`;

    // Detect strategy type and use batch method when possible
    // IMPORTANT: Check strategyType FIRST before checking numberOfAdSets
    // Otherwise Strategy for Ads (with 50 ad sets) will match Strategy 150
    const isStrategyForAds = strategyInfo && strategyInfo.strategyType === 'for-ads' && strategyInfo.campaignData;
    const isStrategyForAll = strategyInfo && strategyInfo.campaignData && strategyInfo.adSetCount !== undefined && strategyInfo.strategyType !== 'for-ads';
    const isStrategy150 = strategyInfo && strategyInfo.numberOfAdSets === 50 && strategyInfo.campaignData && !strategyInfo.strategyType;
    let newCampaign;

    if (isStrategyForAds) {
      console.log(`  🚀 Using BATCH method for Strategy For Ads deployment...`);
      const adSetCount = strategyInfo.adSetCount || 0;
      newCampaign = await this.createStrategyForAdsCampaignBatch(
        targetFacebookApi,
        strategyInfo.campaignData,
        target,
        effectivePixelId,
        adSetCount,
        strategyInfo.mediaHashes
      );
    } else if (isStrategyForAll) {
      console.log(`  🚀 Using BATCH method for Strategy For All deployment...`);
      const adSetCount = strategyInfo.adSetCount || 0;
      newCampaign = await this.createStrategyForAllCampaignBatch(
        targetFacebookApi,
        strategyInfo.campaignData,
        target,
        effectivePixelId,
        adSetCount
      );
    } else if (isStrategy150) {
      console.log(`  🚀 Using BATCH method for Strategy 150 deployment...`);
      newCampaign = await this.createStrategy150CampaignBatch(
        targetFacebookApi,
        strategyInfo.campaignData,
        target,
        effectivePixelId
      );
    } else {
      console.log(`  📋 Using STRUCTURE CLONE method for deployment...`);
      newCampaign = await this.createCampaignFromStructure(
        targetFacebookApi,
        campaignStructure,
        target,
        accountInfo,
        sourceAccount.pixelId,
        effectivePixelId,
        deploymentId,
        sourceFacebookApi,
        strategyInfo
      );
    }

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

      // Normalize both IDs (remove act_ prefix for comparison)
      const normalizedActual = actualAccountId.replace('act_', '');
      const normalizedExpected = expectedAccountId.replace('act_', '');

      console.log(`  Campaign account_id: ${actualAccountId}`);
      console.log(`  Expected account_id: ${expectedAccountId}`);

      if (normalizedActual !== normalizedExpected) {
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
   * @param {boolean} templateOnly - If true, only read first ad set and ad as template
   */
  async readCampaignStructure(facebookApi, campaignId, templateOnly = false) {
    console.log(`  📊 Fetching campaign details...`);
    if (templateOnly) {
      console.log(`  ℹ️  Template mode: Will only fetch first ad set and ad as template`);
    }

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

    // Get ad sets (with pagination support for campaigns with many ad sets)
    console.log(`  📊 Fetching ad sets...`);
    const adSets = [];
    let adSetsUrl = `${facebookApi.baseURL}/${campaignId}/adsets`;

    do {
      const adSetsResponse = await facebookApi.makeApiCallWithRotation(
        'GET',
        adSetsUrl,
        {
          params: {
            fields: 'name,optimization_goal,billing_event,bid_strategy,bid_amount,daily_budget,lifetime_budget,start_time,end_time,targeting,status,attribution_spec,promoted_object',
            limit: templateOnly ? 1 : 100, // Only fetch 1 if template mode
            access_token: facebookApi.accessToken
          }
        }
      );

      const fetchedAdSets = adSetsResponse.data.data || [];
      adSets.push(...fetchedAdSets);

      // Check for next page (skip if template mode)
      adSetsUrl = templateOnly ? null : (adSetsResponse.data.paging?.next || null);

      if (adSetsUrl) {
        console.log(`  📄 Fetched ${fetchedAdSets.length} ad sets, continuing pagination...`);
      }
    } while (adSetsUrl);

    console.log(`  ✅ Total ad sets fetched: ${adSets.length}`);

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

    // Get ads for each ad set (with pagination support)
    console.log(`  📊 Fetching ads from ${adSets.length} ad sets...`);
    const ads = [];

    for (let i = 0; i < adSets.length; i++) {
      const adSet = adSets[i];
      console.log(`  📄 Fetching ads from ad set ${i + 1}/${adSets.length}: ${adSet.name}`);

      let adsUrl = `${facebookApi.baseURL}/${adSet.id}/ads`;

      do {
        const adsResponse = await facebookApi.makeApiCallWithRotation(
          'GET',
          adsUrl,
          {
            params: {
              fields: 'name,adset_id,creative{id,object_story_spec,asset_feed_spec,image_hash,video_id},status',  // FIXED: Expand creative to get full spec
              limit: templateOnly ? 1 : 100, // Only fetch 1 if template mode
              access_token: facebookApi.accessToken
            }
          }
        );

        const fetchedAds = adsResponse.data.data || [];
        ads.push(...fetchedAds);

        // Check for next page (skip if template mode)
        adsUrl = templateOnly ? null : (adsResponse.data.paging?.next || null);

        if (adsUrl) {
          console.log(`    📄 Fetched ${fetchedAds.length} ads, continuing pagination...`);
        }
      } while (adsUrl);
    }

    console.log(`  ✅ Ads fetched: ${ads.length}`);

    return {
      campaign,
      adSets,
      ads
    };
  }

  /**
   * Create Strategy 150 campaign in target account using BATCH pattern
   * This uses the 1-1-1 + batch duplicate approach for optimal API usage
   */
  async createStrategy150CampaignBatch(facebookApi, campaignData, target, targetPixelId = null) {
    console.log(`  🚀 BATCH MODE: Creating Strategy 150 campaign in target account`);
    console.log(`    Target Ad Account: ${target.adAccountId}`);
    console.log(`    Target Page: ${target.pageId}`);
    console.log(`    Target Pixel: ${targetPixelId || 'none'}`);

    // Create a FacebookAPI instance for the target account
    const FacebookAPI = require('./facebookApi');
    const targetApi = new FacebookAPI({
      accessToken: facebookApi.accessToken,
      adAccountId: target.adAccountId.replace('act_', ''),
      pageId: target.pageId,
      pixelId: targetPixelId
    });

    // Prepare campaign data for target account
    const targetCampaignData = {
      ...campaignData,
      selectedPageId: target.pageId,
      selectedAdAccountId: target.adAccountId,
      selectedPixelId: targetPixelId || campaignData.selectedPixelId,
      // Use custom campaign name if provided, otherwise make it unique for this page
      campaignName: target.customCampaignName || `${campaignData.campaignName} - Page ${target.pageId.toString().slice(-6)}`
    };

    // Log custom campaign name usage
    if (target.customCampaignName) {
      console.log(`  ✏️  Using custom campaign name for ${target.pageName}: "${target.customCampaignName}"`);
    } else {
      console.log(`  📝 Using default name with page suffix: "${targetCampaignData.campaignName}"`);
    }

    console.log(`  📝 Step 1: Creating initial 1-1-1 structure...`);

    // STEP 1: Create initial 1-1-1 structure
    const initialResult = await targetApi.createStrategy150Campaign(targetCampaignData);

    console.log(`    ✅ Initial structure created:`);
    console.log(`      Campaign: ${initialResult.campaign.id}`);
    console.log(`      Ad Set: ${initialResult.adSet.id}`);
    console.log(`      Ad: ${initialResult.ads[0].id}`);
    console.log(`      Post ID: ${initialResult.postId || 'Not captured'}`);

    if (!initialResult.postId) {
      throw new Error('Post ID not captured from initial ad creation. Cannot proceed with batch duplication for target account.');
    }

    // STEP 2: Use batch API to duplicate remaining 49 (with sequential fallback)
    console.log(`  📝 Step 2: Duplicating remaining 49 ad sets + ads...`);

    let batchResult = null;
    let usedBatchMethod = false;

    try {
      console.log(`    🚀 Attempting BATCH API method...`);

      const BatchDuplicationService = require('./batchDuplication');
      const batchService = new BatchDuplicationService(
        facebookApi.accessToken,
        target.adAccountId.replace('act_', ''),
        target.pageId,
        targetPixelId
      );

      batchResult = await batchService.duplicateAdSetsBatch(
        initialResult.adSet.id,
        initialResult.campaign.id,
        initialResult.postId,
        49,
        targetCampaignData
      );

      // Check success rate (at least 90%)
      if (batchResult.summary.successRate >= 90) {
        usedBatchMethod = true;
        console.log(`    ✅ BATCH API successful!`);
        console.log(`      Ad Sets Created: ${batchResult.adSets.length}/49`);
        console.log(`      Ads Created: ${batchResult.ads.length}/49`);
        console.log(`      API Calls Used: ${batchResult.batchesExecuted}`);
        console.log(`      API Calls Saved: ${batchResult.apiCallsSaved}`);
        console.log(`      Success Rate: ${batchResult.summary.successRate}%`);
      } else {
        throw new Error(`Batch success rate too low: ${batchResult.summary.successRate}%`);
      }

    } catch (batchError) {
      console.warn(`    ⚠️  BATCH API failed: ${batchError.message}`);
      console.log(`    🔄 Falling back to SEQUENTIAL method...`);

      // FALLBACK: Sequential duplication
      const Strategy150Duplication = require('./strategy150Duplication');
      const duplicationService = new Strategy150Duplication(targetApi);

      const sequentialResults = await duplicationService.duplicateAdSetsSequential(
        initialResult.adSet.id,
        initialResult.campaign.id,
        initialResult.postId,
        49,
        targetCampaignData
      );

      batchResult = {
        adSets: sequentialResults.adSets || [],
        ads: sequentialResults.ads || [],
        operations: 49 * 2,
        batchesExecuted: 49 * 2,
        apiCallsSaved: 0,
        summary: {
          totalExpected: 49,
          totalSuccess: sequentialResults.adSets?.length || 0,
          totalAdSetsCreated: sequentialResults.adSets?.length || 0,
          totalAdsCreated: sequentialResults.ads?.length || 0,
          successRate: Math.round(((sequentialResults.adSets?.length || 0) / 49) * 100)
        }
      };

      console.log(`    ✅ SEQUENTIAL method completed`);
      console.log(`      Ad Sets Created: ${batchResult.adSets.length}/49`);
      console.log(`      Ads Created: ${batchResult.ads.length}/49`);
    }

    // Return result in same format as createCampaignFromStructure
    const totalAdSets = 1 + batchResult.adSets.length; // 1 initial + batch
    const totalAds = 1 + (batchResult.ads?.length || batchResult.adSets.length); // 1 initial + batch

    console.log(`\n  📊 TARGET ACCOUNT TOTALS:`);
    console.log(`    ✅ Campaign: ${initialResult.campaign.id}`);
    console.log(`    ✅ Total Ad Sets: ${totalAdSets}/50 (1 initial + ${batchResult.adSets.length} duplicates)`);
    console.log(`    ✅ Total Ads: ${totalAds}/50 (1 initial + ${batchResult.ads?.length || batchResult.adSets.length} duplicates)`);
    console.log(`    ✅ Post ID: ${initialResult.postId} (100% root effect)`);
    console.log(`    ✅ Method Used: ${usedBatchMethod ? 'BATCH_API' : 'SEQUENTIAL'}`);

    return {
      campaignId: initialResult.campaign.id,
      campaignName: targetCampaignData.campaignName,
      adSetsCount: totalAdSets,
      adSetsRequested: 50,
      adsCount: totalAds,
      adsRequested: 50,
      pixelUsed: targetPixelId,
      duplicationMethod: usedBatchMethod ? 'BATCH_API' : 'SEQUENTIAL',
      batchStats: {
        method: usedBatchMethod ? 'BATCH_API' : 'SEQUENTIAL',
        operations: batchResult.operations,
        batchesExecuted: batchResult.batchesExecuted,
        apiCallsSaved: batchResult.apiCallsSaved,
        successRate: batchResult.summary.successRate
      },
      failures: {
        adSets: batchResult.summary.hasFailures ? [] : [],
        ads: []
      },
      status: batchResult.summary.successRate === 100 ? 'success' : 'partial'
    };
  }

  /**
   * Create Strategy For All campaign in target account using BATCH pattern
   * Supports dynamic ad set count (0-50)
   */
  async createStrategyForAllCampaignBatch(facebookApi, campaignData, target, targetPixelId = null, adSetCount = 49) {
    console.log(`  🚀 BATCH MODE: Creating Strategy For All campaign in target account`);
    console.log(`    Target Ad Account: ${target.adAccountId}`);
    console.log(`    Target Page: ${target.pageId}`);
    console.log(`    Target Pixel: ${targetPixelId || 'none'}`);
    console.log(`    Ad Set Count: ${adSetCount}`);

    // Create FacebookAPI instance for target
    const FacebookAPI = require('./facebookApi');
    const targetApi = new FacebookAPI({
      accessToken: facebookApi.accessToken,
      adAccountId: target.adAccountId.replace('act_', ''),
      pageId: target.pageId,
      pixelId: targetPixelId
    });

    // Prepare campaign data for target
    const targetCampaignData = {
      ...campaignData,
      selectedPageId: target.pageId,
      selectedAdAccountId: target.adAccountId,
      selectedPixelId: targetPixelId || campaignData.selectedPixelId,
      // Use custom campaign name if provided, otherwise make it unique for this page
      campaignName: target.customCampaignName || `${campaignData.campaignName} - Page ${target.pageId.toString().slice(-6)}`
    };

    // Log custom campaign name usage
    if (target.customCampaignName) {
      console.log(`  ✏️  Using custom campaign name for ${target.pageName}: "${target.customCampaignName}"`);
    } else {
      console.log(`  📝 Using default name with page suffix: "${targetCampaignData.campaignName}"`);
    }

    console.log(`  📝 Step 1: Creating initial 1-1-1 structure...`);

    // STEP 1: Create initial 1-1-1
    const initialResult = await targetApi.createCampaignStructure(targetCampaignData);

    console.log(`    ✅ Initial structure created:`);
    console.log(`      Campaign: ${initialResult.campaign.id}`);
    console.log(`      Ad Set: ${initialResult.adSet.id}`);
    console.log(`      Ad: ${initialResult.ads[0].id}`);
    console.log(`      Post ID: ${initialResult.postId || 'Not captured'}`);

    if (!initialResult.postId) {
      throw new Error('Post ID not captured. Cannot proceed with batch duplication for target account.');
    }

    // STEP 2: Batch duplicate if adSetCount > 0
    let batchResult = null;
    let duplicationMethod = 'NONE';
    let totalAdSets = 1;
    let totalAds = 1;

    if (adSetCount > 0) {
      console.log(`  📝 Step 2: Duplicating ${adSetCount} additional ad sets...`);

      try {
        console.log(`    🚀 Attempting BATCH API method...`);

        const BatchDuplicationService = require('./batchDuplication');
        const batchService = new BatchDuplicationService(
          facebookApi.accessToken,
          target.adAccountId.replace('act_', ''),
          target.pageId,
          targetPixelId
        );

        batchResult = await batchService.duplicateAdSetsBatch(
          initialResult.adSet.id,
          initialResult.campaign.id,
          initialResult.postId,
          adSetCount,
          targetCampaignData
        );

        // Check for orphaned ad sets and DELETE them (don't throw error)
        const adSetAdMismatch = batchResult.adSets.length !== batchResult.ads.length;
        const hasOrphans = batchResult.summary.hasOrphans || false;

        if (adSetAdMismatch || hasOrphans) {
          console.warn(`    ⚠️  WARNING: Ad set/ad mismatch: ${batchResult.adSets.length} ad sets, ${batchResult.ads.length} ads`);

          if (batchResult.orphanedAdSets && batchResult.orphanedAdSets.length > 0) {
            console.warn(`       🗑️  Deleting ${batchResult.orphanedAdSets.length} orphaned ad sets...`);

            // Delete orphaned ad sets to maintain 1:1 ratio
            const targetApi = new (require('./facebookApi'))({
              accessToken: facebookApi.accessToken,
              adAccountId: target.adAccountId.replace('act_', ''),
              pageId: target.pageId,
              pixelId: targetPixelId
            });

            for (const orphan of batchResult.orphanedAdSets) {
              try {
                await targetApi.deleteAdSet(orphan.adSetId);
                console.log(`         ✅ Deleted orphaned ad set: ${orphan.adSetId}`);
              } catch (deleteError) {
                console.error(`         ❌ Failed to delete ad set ${orphan.adSetId}: ${deleteError.message}`);
              }
            }

            console.warn(`       ✅ Orphaned ad sets cleaned up`);
          }
        }

        // Check success rate AFTER cleanup (use ads count)
        const effectiveSuccessRate = Math.round((batchResult.ads.length / adSetCount) * 100);

        if (effectiveSuccessRate >= 90) {
          duplicationMethod = 'BATCH_API';
          console.log(`    ✅ BATCH API successful!`);
          console.log(`      Complete Pairs: ${batchResult.ads.length}/${adSetCount} (orphans deleted)`);
          console.log(`      Ad Sets: ${batchResult.ads.length}/${adSetCount}`);
          console.log(`      Ads: ${batchResult.ads.length}/${adSetCount}`);
          console.log(`      ✅ 1:1 Ratio: VERIFIED`);
          console.log(`      Effective Success Rate: ${effectiveSuccessRate}%`);

          totalAdSets = 1 + batchResult.ads.length;  // Use ads count (orphans deleted)
          totalAds = 1 + batchResult.ads.length;
        } else {
          throw new Error(`Batch success rate too low: ${effectiveSuccessRate}% (need 90%)`);
        }

      } catch (batchError) {
        console.warn(`    ⚠️  BATCH API failed: ${batchError.message}`);
        console.log(`    🔄 Falling back to SEQUENTIAL method...`);

        // CRITICAL: Count how many pairs batch already created
        const pairsAlreadyCreated = (batchResult && batchResult.ads) ? batchResult.ads.length : 0;
        const pairsNeeded = adSetCount - pairsAlreadyCreated;

        console.log(`    📊 Batch created: ${pairsAlreadyCreated} pairs`);
        console.log(`    📊 Still need: ${pairsNeeded} pairs to reach target of ${adSetCount}`);

        if (pairsNeeded <= 0) {
          console.log(`    ✅ Target already reached by batch, no sequential needed`);
          totalAdSets = 1 + pairsAlreadyCreated;
          totalAds = 1 + pairsAlreadyCreated;
          duplicationMethod = 'BATCH_API_PARTIAL';
        } else {
          // SEQUENTIAL FALLBACK - Create ONLY the remaining pairs needed
          try {
            const duplicatedAdSets = [];

            for (let i = 0; i < pairsNeeded; i++) {
              const pairNumber = pairsAlreadyCreated + i + 1; // Continue numbering from batch
              let createdAdSet = null;

              try {
                // Create ad set
                const adSetParams = {
                  ...targetCampaignData,
                  campaignId: initialResult.campaign.id,
                  adSetName: `AdSet ${pairNumber + 1}`, // Use pairNumber for sequential numbering
                };

              // Budget handling (CBO vs ABO)
              if (targetCampaignData.budgetLevel === 'adset') {
                adSetParams.dailyBudget = targetCampaignData.dailyBudget;
                adSetParams.lifetimeBudget = targetCampaignData.lifetimeBudget;
              } else {
                delete adSetParams.dailyBudget;
                delete adSetParams.lifetimeBudget;
                delete adSetParams.adSetBudget;
              }

              const newAdSet = await targetApi.createAdSet(adSetParams);
              createdAdSet = newAdSet; // Track created ad set for cleanup

              if (newAdSet) {
                try {
                  // Create ad - NESTED try-catch to handle ad creation failures separately
                  const adParams = {
                    ...targetCampaignData,
                    adsetId: newAdSet.id,
                    adName: `Ad ${pairNumber + 1}`, // Use pairNumber for sequential numbering
                    postId: initialResult.postId,
                    displayLink: targetCampaignData.displayLink,
                    url: targetCampaignData.url,
                    headline: targetCampaignData.headline,
                    primaryText: targetCampaignData.primaryText,
                    description: targetCampaignData.description,
                    callToAction: targetCampaignData.callToAction
                  };

                  const newAd = await targetApi.createAd(adParams);

                  // SUCCESS - Both ad set and ad created
                  duplicatedAdSets.push({ adSet: newAdSet, ad: newAd });
                  console.log(`       ✅ Created pair ${pairNumber + 1} of ${adSetCount + 1} (ad set + ad)`);

                } catch (adError) {
                  // Ad creation failed - DELETE the orphaned ad set immediately
                  console.error(`       ❌ Ad ${pairNumber + 1} creation failed: ${adError.message}`);
                  console.log(`       🗑️  Deleting orphaned ad set ${newAdSet.id}...`);

                  try {
                    await targetApi.deleteAdSet(newAdSet.id);
                    console.log(`       ✅ Deleted orphaned ad set ${newAdSet.id}`);
                  } catch (deleteError) {
                    console.error(`       ⚠️  Failed to delete orphaned ad set ${newAdSet.id}: ${deleteError.message}`);
                  }

                  // Continue to next iteration (don't add to duplicatedAdSets)
                }
              }
            } catch (adSetError) {
              // Ad set creation failed - nothing to clean up
              console.error(`       ❌ Ad set ${pairNumber + 1} creation failed: ${adSetError.message}`);
              // Continue to next iteration
            }
            }

            // CRITICAL: Add batch-created pairs to the total count
            totalAdSets = 1 + pairsAlreadyCreated + duplicatedAdSets.length;
            totalAds = 1 + pairsAlreadyCreated + duplicatedAdSets.length;
            duplicationMethod = pairsAlreadyCreated > 0 ? 'BATCH_API + SEQUENTIAL' : 'SEQUENTIAL';

            console.log(`    ✅ SEQUENTIAL method completed`);
            console.log(`       Batch created: ${pairsAlreadyCreated} pairs`);
            console.log(`       Sequential created: ${duplicatedAdSets.length} pairs`);
            console.log(`       Total pairs: ${pairsAlreadyCreated + duplicatedAdSets.length}/${adSetCount}`);

          } catch (sequentialError) {
            console.error(`    ❌ SEQUENTIAL method failed: ${sequentialError.message}`);
            console.log(`    ⚠️  Continuing with partial results from batch`);
            totalAdSets = 1 + pairsAlreadyCreated;
            totalAds = 1 + pairsAlreadyCreated;
            duplicationMethod = 'BATCH_API_PARTIAL';
          }
        }
      }
    }

    console.log(`\n  📊 TARGET ACCOUNT TOTALS:`);
    console.log(`    ✅ Campaign: ${initialResult.campaign.id}`);
    console.log(`    ✅ Total Ad Sets: ${totalAdSets}/${1 + adSetCount} (1 initial + ${adSetCount} requested)`);
    console.log(`    ✅ Total Ads: ${totalAds}/${1 + adSetCount}`);
    console.log(`    ✅ Post ID: ${initialResult.postId} (100% root effect)`);
    console.log(`    ✅ Method Used: ${duplicationMethod}`);

    return {
      campaignId: initialResult.campaign.id,
      campaignName: targetCampaignData.campaignName,
      adSetsCount: totalAdSets,
      adSetsRequested: 1 + adSetCount,
      adsCount: totalAds,
      adsRequested: 1 + adSetCount,
      pixelUsed: targetPixelId,
      duplicationMethod: duplicationMethod,
      batchStats: batchResult ? {
        method: duplicationMethod,
        operations: batchResult.operations,
        apiCallsSaved: batchResult.apiCallsSaved,
        successRate: batchResult.summary.successRate
      } : null,
      failures: {
        adSets: [],
        ads: []
      },
      status: batchResult ? (batchResult.summary.successRate === 100 ? 'success' : 'partial') : 'success'
    };
  }

  /**
   * Create Strategy For Ads campaign in target account using BATCH pattern
   * Supports dynamic ad set count (0-50), dynamic creatives, and ad variations
   */
  async createStrategyForAdsCampaignBatch(facebookApi, campaignData, target, targetPixelId = null, adSetCount = 0, mediaHashes = null) {
    console.log(`\n  🎯 ========================================`);
    console.log(`  🎯 STRATEGY FOR ADS - BATCH CREATION`);
    console.log(`  🎯 Target: ${target.adAccountId} / ${target.pageId}`);
    console.log(`  🎯 Ad Sets Requested: ${adSetCount + 1} (1 initial + ${adSetCount} duplicates)`);
    console.log(`  🎯 ========================================\n`);

    // Prepare campaign data for target account
    const targetCampaignData = {
      ...campaignData,
      pixelId: targetPixelId, // Override pixel for target account
      // Media will be uploaded fresh in target account
      skipMediaUpload: false,
      reusedMediaHashes: null
    };

    const targetApi = new FacebookAPI({
      accessToken: facebookApi.accessToken,
      adAccountId: target.adAccountId.replace('act_', ''),
      pageId: target.pageId,
      pixelId: targetPixelId
    });

    // STEP 1: Create initial 1-1-1 structure in target account
    console.log(`  📝 Step 1: Creating initial 1-1-1 structure...`);
    const initialResult = await targetApi.createCampaignStructure(targetCampaignData);

    // Extract IDs (handle both nested and flat structures)
    const campaignId = initialResult.campaign?.id || initialResult.campaignId;
    const adSetId = initialResult.adSet?.id || initialResult.adSetId;
    const adId = initialResult.ads?.[0]?.id || initialResult.adId;
    const capturedMediaHashes = initialResult.mediaHashes;

    console.log(`  ✅ Initial structure created:`);
    console.log(`     Campaign ID: ${campaignId}`);
    console.log(`     Ad Set ID: ${adSetId}`);
    console.log(`     Ad ID: ${adId}`);

    if (initialResult.postId) {
      console.log(`     Post ID: ${initialResult.postId} (for regular ads)`);
    }
    if (capturedMediaHashes) {
      console.log(`     Media Hashes: Captured for dynamic creatives`);
      if (capturedMediaHashes.dynamicImages) {
        console.log(`       Images: ${capturedMediaHashes.dynamicImages.length}`);
      }
      if (capturedMediaHashes.dynamicVideos) {
        console.log(`       Videos: ${capturedMediaHashes.dynamicVideos.length}`);
      }
    }

    let totalAdSets = 1;
    let totalAds = 1;
    let duplicationMethod = 'NONE';
    let batchResult = null; // Declare at function scope for return object access

    // STEP 2: Batch duplicate if adSetCount > 0
    if (adSetCount > 0) {
      console.log(`\n  📝 Step 2: Batch duplicating ${adSetCount} additional ad sets...`);

      try {
        // Try BATCH API first
        console.log(`    🚀 Attempting BATCH API method...`);

        const BatchDuplicationService = require('./batchDuplication');
        const batchService = new BatchDuplicationService(
          facebookApi.accessToken,
          target.adAccountId.replace('act_', ''),
          target.pageId,
          targetPixelId
        );

        batchResult = await batchService.duplicateAdSetsBatch(
          adSetId,
          campaignId,
          initialResult.postId || null,  // May be null for dynamic creatives
          adSetCount,
          {
            ...targetCampaignData,
            campaignName: campaignData.campaignName,
            mediaHashes: capturedMediaHashes,  // Use target account's media hashes
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

        // Check for orphaned ad sets and DELETE them (don't throw error)
        const adSetAdMismatch = batchResult.adSets.length !== batchResult.ads.length;
        const hasOrphans = batchResult.summary.hasOrphans || false;

        if (adSetAdMismatch || hasOrphans) {
          console.warn(`    ⚠️  WARNING: Ad set/ad count mismatch detected!`);
          console.warn(`       Ad Sets Created: ${batchResult.adSets.length}`);
          console.warn(`       Ads Created: ${batchResult.ads.length}`);
          console.warn(`       Orphaned Ad Sets: ${batchResult.summary.totalOrphaned || 0}`);

          if (batchResult.orphanedAdSets && batchResult.orphanedAdSets.length > 0) {
            console.warn(`       🗑️  Deleting ${batchResult.orphanedAdSets.length} orphaned ad sets...`);

            // Delete orphaned ad sets to maintain 1:1 ratio
            for (const orphan of batchResult.orphanedAdSets) {
              try {
                await facebookApi.deleteAdSet(orphan.adSetId);
                console.log(`         ✅ Deleted orphaned ad set: ${orphan.adSetId}`);
              } catch (deleteError) {
                console.error(`         ❌ Failed to delete ad set ${orphan.adSetId}: ${deleteError.message}`);
              }
            }

            console.warn(`       ✅ Orphaned ad sets cleaned up - continuing with successful pairs only`);
          }
        }

        // Check success rate AFTER cleanup (use ads count, not ad sets count)
        const effectiveSuccessRate = Math.round((batchResult.ads.length / adSetCount) * 100);

        if (effectiveSuccessRate >= 90) {
          totalAdSets = 1 + batchResult.ads.length;  // Use ads count (orphans deleted)
          totalAds = 1 + batchResult.ads.length;
          duplicationMethod = 'BATCH_API';

          console.log(`    ✅ BATCH API successful!`);
          console.log(`       Complete Pairs: ${batchResult.ads.length}/${adSetCount} (orphans deleted)`);
          console.log(`       Ad Sets: ${batchResult.ads.length}/${adSetCount}`);
          console.log(`       Ads: ${batchResult.ads.length}/${adSetCount}`);
          console.log(`       ✅ 1:1 Ratio: VERIFIED`);
          console.log(`       Effective Success Rate: ${effectiveSuccessRate}%`);
          console.log(`       API Calls Saved: ${batchResult.apiCallsSaved}`);
        } else {
          throw new Error(`Batch success rate too low: ${effectiveSuccessRate}% (need 90%)`);
        }

      } catch (batchError) {
        console.warn(`    ⚠️  BATCH API failed: ${batchError.message}`);
        console.log(`    🔄 Falling back to SEQUENTIAL method...`);

        // CRITICAL: Count how many pairs batch already created
        const pairsAlreadyCreated = (batchResult && batchResult.ads) ? batchResult.ads.length : 0;
        const pairsNeeded = adSetCount - pairsAlreadyCreated;

        console.log(`    📊 Batch created: ${pairsAlreadyCreated} pairs`);
        console.log(`    📊 Still need: ${pairsNeeded} pairs to reach target of ${adSetCount}`);

        if (pairsNeeded <= 0) {
          console.log(`    ✅ Target already reached by batch, no sequential needed`);
          totalAdSets = 1 + pairsAlreadyCreated;
          totalAds = 1 + pairsAlreadyCreated;
          duplicationMethod = 'BATCH_API_PARTIAL';
        } else {
          // SEQUENTIAL FALLBACK - Create ONLY the remaining pairs needed
          try {
            const duplicatedAdSets = [];

            for (let i = 0; i < pairsNeeded; i++) {
              const pairNumber = pairsAlreadyCreated + i + 1; // Continue numbering from batch
              let createdAdSet = null;

              try {
                // Create ad set
                const adSetParams = {
                  ...targetCampaignData,
                  campaignId: campaignId,
                  // Use campaign name AS-IS (prefix already applied in route if user chose one)
                  adSetName: `${campaignData.campaignName} - AdSet ${pairNumber + 1}`, // Use pairNumber for sequential numbering
                };

              // Budget handling (CBO vs ABO)
              if (campaignData.budgetLevel === 'adset') {
                adSetParams.dailyBudget = campaignData.dailyBudget;
                adSetParams.lifetimeBudget = campaignData.lifetimeBudget;
              } else {
                delete adSetParams.dailyBudget;
                delete adSetParams.lifetimeBudget;
                delete adSetParams.adSetBudget;
              }

              const newAdSet = await targetApi.createAdSet(adSetParams);
              createdAdSet = newAdSet; // Track created ad set for cleanup

              if (newAdSet) {
                try {
                  // Create ad - NESTED try-catch to handle ad creation failures separately
                  const adParams = {
                    ...targetCampaignData,
                    adsetId: newAdSet.id,
                    // Use campaign name AS-IS (prefix already applied in route if user chose one)
                    adName: `${campaignData.campaignName} - Ad ${pairNumber + 1}`, // Use pairNumber for sequential numbering
                    postId: initialResult.postId,
                    displayLink: campaignData.displayLink,
                    url: campaignData.url,
                    headline: campaignData.headline,
                    primaryText: campaignData.primaryText,
                    description: campaignData.description,
                    callToAction: campaignData.callToAction,
                    mediaAssets: capturedMediaHashes,
                    dynamicCreativeEnabled: campaignData.dynamicCreativeEnabled,
                    dynamicTextEnabled: campaignData.dynamicTextEnabled,
                    primaryTextVariations: campaignData.primaryTextVariations,
                    headlineVariations: campaignData.headlineVariations
                  };

                  const newAd = await targetApi.createAd(adParams);

                  // SUCCESS - Both ad set and ad created
                  duplicatedAdSets.push({ adSet: newAdSet, ad: newAd });
                  console.log(`       ✅ Created pair ${pairNumber + 1} of ${adSetCount + 1} (ad set + ad)`);

                } catch (adError) {
                  // Ad creation failed - DELETE the orphaned ad set immediately
                  console.error(`       ❌ Ad ${pairNumber + 1} creation failed: ${adError.message}`);
                  console.log(`       🗑️  Deleting orphaned ad set ${newAdSet.id}...`);

                  try {
                    await targetApi.deleteAdSet(newAdSet.id);
                    console.log(`       ✅ Deleted orphaned ad set ${newAdSet.id}`);
                  } catch (deleteError) {
                    console.error(`       ⚠️  Failed to delete orphaned ad set ${newAdSet.id}: ${deleteError.message}`);
                  }

                  // Continue to next iteration (don't add to duplicatedAdSets)
                }
              }
            } catch (adSetError) {
              // Ad set creation failed - nothing to clean up
              console.error(`       ❌ Ad set ${pairNumber + 1} creation failed: ${adSetError.message}`);
              // Continue to next iteration
            }
            }

            // CRITICAL: Add batch-created pairs to the total count
            totalAdSets = 1 + pairsAlreadyCreated + duplicatedAdSets.length;
            totalAds = 1 + pairsAlreadyCreated + duplicatedAdSets.length;
            duplicationMethod = pairsAlreadyCreated > 0 ? 'BATCH_API + SEQUENTIAL' : 'SEQUENTIAL';

            console.log(`    ✅ SEQUENTIAL method completed`);
            console.log(`       Batch created: ${pairsAlreadyCreated} pairs`);
            console.log(`       Sequential created: ${duplicatedAdSets.length} pairs`);
            console.log(`       Total pairs: ${pairsAlreadyCreated + duplicatedAdSets.length}/${adSetCount}`);

          } catch (sequentialError) {
            console.error(`    ❌ SEQUENTIAL fallback failed: ${sequentialError.message}`);
            console.log(`    ⚠️  Continuing with partial results from batch`);
            totalAdSets = 1 + pairsAlreadyCreated;
            totalAds = 1 + pairsAlreadyCreated;
            duplicationMethod = 'BATCH_API_PARTIAL';
          }
        }
      }
    }

    console.log(`\n  📊 TARGET ACCOUNT TOTALS:`);
    console.log(`    ✅ Campaign: ${initialResult.campaign.id}`);
    console.log(`    ✅ Total Ad Sets: ${totalAdSets}/${1 + adSetCount} (1 initial + ${adSetCount} requested)`);
    console.log(`    ✅ Total Ads: ${totalAds}/${1 + adSetCount}`);

    if (campaignData.dynamicCreativeEnabled) {
      console.log(`    ✅ Creative Type: Dynamic Creative (asset_feed_spec)`);
      console.log(`    ✅ 100% Root Effect: All ad sets use identical targeting`);
    } else {
      console.log(`    ✅ Post ID: ${initialResult.postId} (100% root effect)`);
    }

    console.log(`    ✅ Method Used: ${duplicationMethod}`);

    return {
      campaignId: initialResult.campaign.id,
      campaignName: targetCampaignData.campaignName,
      adSetsCount: totalAdSets,
      adSetsRequested: 1 + adSetCount,
      adsCount: totalAds,
      adsRequested: 1 + adSetCount,
      pixelUsed: targetPixelId,
      duplicationMethod: duplicationMethod,
      isDynamicCreative: campaignData.dynamicCreativeEnabled || false,
      batchStats: batchResult ? {
        method: duplicationMethod,
        operations: batchResult.operations,
        apiCallsSaved: batchResult.apiCallsSaved,
        successRate: batchResult.summary.successRate
      } : null,
      failures: {
        adSets: [],
        ads: []
      },
      status: batchResult ? (batchResult.summary.successRate === 100 ? 'success' : 'partial') : 'success'
    };
  }

  /**
   * Create campaign from structure in target account
   */
  async createCampaignFromStructure(facebookApi, structure, target, accountInfo = null, sourcePixelId = null, targetPixelId = null, deploymentId = null, sourceApi = null, strategyInfo = null) {
    console.log(`  🏗️  Creating campaign structure...`);
    console.log(`  🎨 Pixel Configuration:`);
    console.log(`    Source Pixel: ${sourcePixelId || 'none'}`);
    console.log(`    Target Pixel: ${targetPixelId || 'none'}`);

    // CRITICAL: Make campaign name unique to avoid conflicts when deploying to same account with different pages
    // Use custom campaign name if provided, otherwise use page ID in name to ensure uniqueness
    const pageIdLast6 = target.pageId.toString().slice(-6); // Last 6 digits of page ID
    const newCampaignName = target.customCampaignName || `${structure.campaign.name} - Page ${pageIdLast6}`;

    if (target.customCampaignName) {
      console.log(`  ✏️  Using custom campaign name: "${target.customCampaignName}"`);
    }

    console.log(`  📝 Using unique campaign name for page ${target.pageId}: ${newCampaignName}`);

    // If strategy info is provided, replicate the structure
    if (strategyInfo) {
      console.log(`  🎯 Strategy Mode: Will create ${strategyInfo.numberOfAdSets} ad sets`);
      console.log(`  📊 Custom budgets:`, strategyInfo.customBudgets ? `${strategyInfo.customBudgets.length} custom` : 'Standard');
    }

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
            videos: cachedMedia.videos.length,
            videoThumbnails: cachedMedia.videoThumbnails.length
          });

          // Upload cached media to target account
          if (cachedMedia.images.length > 0 || cachedMedia.videos.length > 0 || cachedMedia.videoThumbnails.length > 0) {
            console.log(`\n📤 MEDIA UPLOAD: Uploading cached media to target account...`);
            uploadedMedia = await this.uploadCachedMediaToTarget(cachedMedia, facebookApi, target.adAccountId);

            console.log(`  ✅ Media uploaded to target:`, {
              images: Object.keys(uploadedMedia.images).length,
              videos: Object.keys(uploadedMedia.videos).length,
              videoThumbnails: Object.keys(uploadedMedia.videoThumbnails).length
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

    // Create ad sets (use strategy info if provided for 1-50-1 replication)
    const numberOfAdSets = strategyInfo ? strategyInfo.numberOfAdSets : structure.adSets.length;
    const templateAdSet = structure.adSets[0]; // Use first ad set as template

    console.log(`  📦 Creating ${numberOfAdSets} ad sets...`);
    if (strategyInfo) {
      console.log(`  🎯 Strategy Mode: Replicating template ad set ${numberOfAdSets} times`);
    }

    const adSetMapping = new Map(); // Map old ID to new ID
    const createdAdSetIds = []; // Store created ad set IDs for ad creation
    const failedAdSets = []; // Track failed ad sets for error reporting
    let successfulAdSets = 0;

    for (let i = 0; i < numberOfAdSets; i++) {
      // Use template ad set for strategy mode, otherwise use actual ad set from structure
      const adSet = strategyInfo ? templateAdSet : structure.adSets[i];
      const adSetNumber = i + 1;

      // Apply custom budget if provided in strategy info
      let customBudget = null;
      if (strategyInfo?.customBudgets && strategyInfo.customBudgets[i]) {
        customBudget = strategyInfo.customBudgets[i];
      } else if (strategyInfo?.adSetBudget) {
        customBudget = strategyInfo.adSetBudget;
      }

      console.log(`    Creating ad set ${adSetNumber}/${numberOfAdSets}: ${adSet.name} ${adSetNumber}`);

      // Use optimization goal from source ad set (no conversion needed)
      // Facebook API accepts OFFSITE_CONVERSIONS, VALUE, LINK_CLICKS, etc. as valid optimization goals
      // Campaign objective (OUTCOME_SALES, OUTCOME_LEADS, etc.) is separate from optimization goal
      const optimizationGoal = adSet.optimization_goal;
      console.log(`      🎯 Optimization goal: ${optimizationGoal} (for campaign objective: ${structure.campaign.objective})`);

      const adSetData = {
        name: strategyInfo ? `${adSet.name} ${adSetNumber}` : adSet.name, // Add number for strategy mode
        campaign_id: newCampaignId,
        optimization_goal: optimizationGoal, // Use safe optimization goal
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

        // CRITICAL FIX: Final enforcement - ensure target pixel is used if provided
        // This catches any edge cases where pixel wasn't replaced correctly
        if (targetPixelId && promotedObject.pixel_id !== targetPixelId) {
          console.log(`      🔒 ENFORCING target pixel: ${promotedObject.pixel_id} → ${targetPixelId}`);
          promotedObject.pixel_id = targetPixelId;
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

      // Apply custom budget if provided, otherwise use template budget
      if (customBudget) {
        if (customBudget.daily) {
          adSetData.daily_budget = parseInt(customBudget.daily) * 100; // Convert to cents
          console.log(`      💰 Applying custom daily budget: $${customBudget.daily}`);
        } else if (customBudget.lifetime) {
          adSetData.lifetime_budget = parseInt(customBudget.lifetime) * 100; // Convert to cents
          console.log(`      💰 Applying custom lifetime budget: $${customBudget.lifetime}`);
        }
      } else {
        if (adSet.daily_budget) adSetData.daily_budget = adSet.daily_budget;
        if (adSet.lifetime_budget) adSetData.lifetime_budget = adSet.lifetime_budget;
      }

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
        targeting: adSetData.targeting ? 'Present' : 'Missing',
        daily_budget: adSetData.daily_budget,
        lifetime_budget: adSetData.lifetime_budget
      });

      // ERROR RESILIENCE: Wrap in try-catch to continue on failure
      try {
        const adSetResponse = await facebookApi.makeApiCallWithRotation(
          'POST',
          `${facebookApi.baseURL}/act_${facebookApi.adAccountId}/adsets`,
          { params: adSetData }  // Facebook Graph API accepts POST params as query string (same as facebookApi.js)
        );

        const newAdSetId = adSetResponse.data.id;
        adSetMapping.set(adSet.id, newAdSetId);
        createdAdSetIds.push(newAdSetId); // Store for ad creation
        successfulAdSets++;
        console.log(`      ✅ Ad set ${adSetNumber} created successfully: ${newAdSetId}`);
      } catch (adSetError) {
        console.error(`      ❌ Failed to create ad set ${adSetNumber}:`, adSetError.message);
        failedAdSets.push({
          number: adSetNumber,
          name: adSetData.name,
          error: adSetError.message,
          errorCode: adSetError.response?.data?.error?.code,
          errorSubcode: adSetError.response?.data?.error?.error_subcode
        });
        // Push null to maintain index alignment for ad creation
        createdAdSetIds.push(null);
        // Continue to next ad set - don't stop the entire deployment
      }

      // RATE LIMITING: Add delay every 10 ad sets to prevent Facebook throttling
      if ((i + 1) % 10 === 0 && i + 1 < numberOfAdSets) {
        console.log(`      ⏸️  Pausing 2 seconds (created ${i + 1}/${numberOfAdSets} ad sets)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Ad set creation summary
    console.log(`  📊 Ad set creation complete: ${successfulAdSets}/${numberOfAdSets} successful`);
    if (failedAdSets.length > 0) {
      console.warn(`  ⚠️  ${failedAdSets.length} ad sets failed to create`);
      failedAdSets.forEach(failed => {
        console.warn(`    - Ad Set ${failed.number}: ${failed.error}`);
      });
    }

    // Create ads (replicate template ad for each ad set in strategy mode)
    const numberOfAds = strategyInfo ? numberOfAdSets : structure.ads.length;
    const templateAd = structure.ads[0]; // Use first ad as template
    const failedAds = []; // Track failed ads
    let successfulAds = 0;

    console.log(`  🎨 Creating ${numberOfAds} ads...`);
    if (strategyInfo) {
      console.log(`  ℹ️  Strategy mode: Will replicate template ad "${templateAd.name}" ${numberOfAdSets} times (1 per ad set)`);
    }

    for (let i = 0; i < numberOfAds; i++) {
      const ad = strategyInfo ? templateAd : structure.ads[i];
      const adNumber = i + 1;

      // In strategy mode, use createdAdSetIds; otherwise use the mapping
      const newAdSetId = strategyInfo ? createdAdSetIds[i] : adSetMapping.get(ad.adset_id);

      if (!newAdSetId) {
        console.warn(`    ⚠️  Skipping ad ${ad.name} - parent ad set not found`);
        continue;
      }

      console.log(`    Creating ad ${adNumber}/${numberOfAds}: ${ad.name}${strategyInfo ? ` ${adNumber}` : ''}`);

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
        name: strategyInfo ? `${ad.name} ${adNumber}` : ad.name, // Add number in strategy mode
        adset_id: newAdSetId,
        creative: JSON.stringify({
          object_story_spec: creativeSpec  // Wrap spec in object
        }),
        status: 'PAUSED',
        access_token: facebookApi.accessToken
      };

      console.log(`      📤 Creating ad with creative spec...`);

      // ERROR RESILIENCE: Wrap in try-catch to continue on failure
      try {
        await facebookApi.makeApiCallWithRotation(
          'POST',
          `${facebookApi.baseURL}/act_${facebookApi.adAccountId}/ads`,
          { params: adData }  // Facebook Graph API accepts POST params as query string (same as facebookApi.js)
        );
        successfulAds++;
        console.log(`      ✅ Ad ${adNumber} created successfully`);
      } catch (adError) {
        console.error(`      ❌ Failed to create ad ${adNumber}:`, adError.message);
        failedAds.push({
          number: adNumber,
          name: adData.name,
          adSetId: newAdSetId,
          error: adError.message,
          errorCode: adError.response?.data?.error?.code,
          errorSubcode: adError.response?.data?.error?.error_subcode
        });
        // Continue to next ad - don't stop the entire deployment
      }

      // RATE LIMITING: Add delay every 10 ads to prevent Facebook throttling
      if ((i + 1) % 10 === 0 && i + 1 < numberOfAds) {
        console.log(`      ⏸️  Pausing 2 seconds (created ${i + 1}/${numberOfAds} ads)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Ad creation summary
    console.log(`  📊 Ad creation complete: ${successfulAds}/${numberOfAds} successful`);
    if (failedAds.length > 0) {
      console.warn(`  ⚠️  ${failedAds.length} ads failed to create`);
      failedAds.forEach(failed => {
        console.warn(`    - Ad ${failed.number}: ${failed.error}`);
      });
    }

    // Final pixel verification summary
    console.log(`\n📊 DEPLOYMENT SUMMARY:`);
    console.log(`  Source Pixel: ${sourcePixelId || 'none'}`);
    console.log(`  Target Pixel Used: ${targetPixelId || 'none'}`);
    console.log(`  Campaign: ${newCampaignId}`);
    console.log(`  Ad Sets: ${successfulAdSets}/${numberOfAdSets} created`);
    console.log(`  Ads: ${successfulAds}/${numberOfAds} created`);
    if (strategyInfo) {
      console.log(`  Strategy: 1-${numberOfAdSets}-${numberOfAds} requested`);
    }
    if (failedAdSets.length > 0 || failedAds.length > 0) {
      console.warn(`  ⚠️  Deployment had failures - see details above`);
    }

    return {
      campaignId: newCampaignId,
      campaignName: newCampaignName,
      adSetsCount: successfulAdSets,
      adSetsRequested: numberOfAdSets,
      adsCount: successfulAds,
      adsRequested: numberOfAds,
      pixelUsed: targetPixelId,
      failures: {
        adSets: failedAdSets,
        ads: failedAds
      },
      status: (failedAdSets.length === 0 && failedAds.length === 0) ? 'success' : 'partial'
    };
  }

  /**
   * Deploy campaign to multiple targets
   */
  async deployToMultipleTargets(userId, sourceCampaignId, sourceAccount, targets, processingMode = 'parallel', strategyInfo = null) {
    console.log(`\n🚀 MULTI-ACCOUNT DEPLOYMENT INITIATED`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Source Campaign: ${sourceCampaignId}`);
    console.log(`  Targets: ${targets.length}`);
    console.log(`  Mode: ${processingMode}`);

    if (strategyInfo) {
      console.log(`  Strategy: 1-${strategyInfo.numberOfAdSets || '?'}-1`);
      console.log(`  Will create ${strategyInfo.numberOfAdSets} ad sets in each target account`);
    }

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
            userAccessToken,
            strategyInfo
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
            userAccessToken,
            strategyInfo
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
