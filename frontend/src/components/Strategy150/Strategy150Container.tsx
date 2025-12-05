import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Container,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { Strategy150FormData, Strategy150Phase, Strategy150Response } from '../../types/strategy150';
import Phase1Setup from './Phase1Setup/Phase1Setup';
import Phase2PostCapture from './Phase2PostCapture/Phase2PostCapture';
import Phase3Duplication from './Phase3Duplication/Phase3Duplication';
import CompletionSummary from './CompletionSummary/CompletionSummary';
import CampaignManagementContainer from './CampaignManagement/CampaignManagementContainer';
import MultiplyContainer from './MultiplySection/MultiplyContainer';
import { CreativeLibraryProvider } from '../../contexts/CreativeLibraryContext';

const steps = [
  'Campaign Setup (1-1-1)',
  'Post ID Collection',
  'Duplication (1-49-1)',
  'Completion'
];

const Strategy150Container: React.FC = () => {
  // Tab management
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // Get URL location for import detection
  const location = useLocation();

  // Existing state for campaign creation
  const [phase, setPhase] = useState<Strategy150Phase>('setup');
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Strategy150FormData | null>(null);
  const [campaignResult, setCampaignResult] = useState<Strategy150Response | null>(null);
  const [postId, setPostId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [skippedFields, setSkippedFields] = useState<any>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  // State for imported ads from Ad Scraper
  const [importedAdsData, setImportedAdsData] = useState<any>(null);

  // ===== AD SCRAPER IMPORT INTEGRATION =====
  // Helper: Download single media file via proxy
  const downloadMediaViaProxy = async (sessionId: string, adIndex: number): Promise<File | null> => {
    try {
      const proxyUrl = `https://facebookswipefile-2gxnqoptoa-uc.a.run.app/api/proxy-media/${sessionId}/${adIndex}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        console.error(`❌ Failed proxy download for ad ${adIndex + 1}: HTTP ${response.status}`);
        return null;
      }

      const blob = await response.blob();
      const isVideo = blob.type.startsWith('video/');
      const fileName = isVideo ? `imported-ad-${adIndex + 1}.mp4` : `imported-ad-${adIndex + 1}.jpg`;
      const file = new File([blob], fileName, { type: blob.type || (isVideo ? 'video/mp4' : 'image/jpeg') });

      console.log(`✅ Downloaded media for ad ${adIndex + 1}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      return file;
    } catch (error: any) {
      console.error(`❌ Error downloading media for ad ${adIndex + 1}:`, error);
      return null;
    }
  };

  // Helper: Download ALL media files for all ads
  const downloadAllMediaViaProxy = async (sessionId: string, ads: any[]): Promise<any[]> => {
    const adsWithMedia = [];

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];

      if (ad.imageUrl || ad.videoUrl) {
        const mediaFile = await downloadMediaViaProxy(sessionId, i);
        adsWithMedia.push({ ...ad, mediaFile });
      } else {
        // No media for this ad
        adsWithMedia.push(ad);
      }
    }

    const successCount = adsWithMedia.filter(ad => ad.mediaFile).length;
    console.log(`✅ Successfully downloaded ${successCount}/${ads.length} media files`);

    return adsWithMedia;
  };

  // Detect import from Ad Scraper and fetch ads
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const importSessionId = searchParams.get('import');

    if (importSessionId && phase === 'setup' && !importedAdsData) {
      console.log('🔍 [Strategy 1-50-1] Detected Ad Scraper import session:', importSessionId);
      fetchAdsFromScraper(importSessionId);
    }
  }, [location.search, phase, importedAdsData]);

  const fetchAdsFromScraper = async (sessionId: string) => {
    try {
      console.log('📥 [Strategy 1-50-1] Fetching ads from Ad Scraper session:', sessionId);

      // Call Ad Scraper API to get ads
      const response = await fetch(`https://facebookswipefile-2gxnqoptoa-uc.a.run.app/api/launcher-import/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ [Strategy 1-50-1] Failed to fetch ads from Ad Scraper:', response.status, response.statusText);
        setError(`Failed to import ads from Ad Scraper: ${response.statusText}`);
        return;
      }

      const result = await response.json();

      if (result.success && result.ads && result.ads.length > 0) {
        console.log(`✅ [Strategy 1-50-1] Successfully fetched ${result.ads.length} ads from Ad Scraper`);
        console.log('📦 Ads data:', result.ads);

        // Download ALL media files via proxy (Strategy 1-50-1 uses only first ad)
        console.log(`📥 Downloading media for ${result.ads.length} ad(s)...`);
        const adsWithMedia = await downloadAllMediaViaProxy(sessionId, result.ads);

        // Store imported ads data with downloaded media
        setImportedAdsData({
          ...result,
          ads: adsWithMedia
        });

        setError(`✅ Successfully imported ${result.ads.length} ad(s) from Ad Scraper with media!`);

      } else {
        console.error('❌ [Strategy 1-50-1] No ads found in session:', result);
        setError('Failed to import ads: Session not found or expired');
      }
    } catch (error: any) {
      console.error('❌ [Strategy 1-50-1] Error fetching ads from Ad Scraper:', error);
      setError(`Failed to import ads: ${error.message}`);
    }
  };
  // ===== END AD SCRAPER IMPORT INTEGRATION =====

  const getPhaseComponent = () => {
    switch (phase) {
      case 'setup':
        return (
          <Phase1Setup
            onSubmit={handlePhase1Submit}
            error={error}
            importedAdsData={importedAdsData}
          />
        );
      case 'creating':
      case 'waiting':
      case 'manual':
        return (
          <Phase2PostCapture
            campaignResult={campaignResult}
            phase={phase}
            onPostIdCaptured={handlePostIdCaptured}
            onManualInput={handleManualPostId}
            onRetry={handleRetryPostCapture}
          />
        );
      case 'duplicating':
        return (
          <Phase3Duplication
            campaignResult={campaignResult}
            postId={postId}
            formData={formData}
            onCompleted={handleDuplicationCompleted}
          />
        );
      case 'completed':
        return (
          <CompletionSummary
            campaignResult={campaignResult}
            postId={postId}
            onCreateNew={handleCreateNew}
          />
        );
      case 'error':
        return (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6">Error</Typography>
            {error}
          </Alert>
        );
      default:
        return null;
    }
  };

  const handlePhase1Submit = async (data: Strategy150FormData) => {
    console.log('\n🎯 ========== STRATEGY 1-50-1 CLIENT START ==========');
    console.log('📄 Form Data Received:', data);
    console.log('📊 Key Parameters:');
    console.log('  - Campaign Name:', data.campaignName);
    console.log('  - Objective:', data.objective);
    console.log('  - Budget Type:', data.budgetType);
    console.log('  - Daily Budget:', data.adSetBudget?.dailyBudget || 'Not set');
    console.log('  - Conversion Event:', data.conversionEvent);

    // Check if multiple campaigns requested
    const numberOfCampaigns = (data as any)._multipleCampaigns || 1;
    if (numberOfCampaigns > 1) {
      console.log(`📢 Creating ${numberOfCampaigns} identical campaigns`);
    }

    // Check if multi-account deployment requested
    const multiAccountDeployment = (data as any)._multiAccountDeployment;
    if (multiAccountDeployment) {
      console.log('🚀 [Container] Multi-account deployment detected!');
      console.log('   Targets:', multiAccountDeployment.targets?.length || 0);
      console.log('   Mode:', multiAccountDeployment.mode);
      console.log('   Full data:', multiAccountDeployment);
    } else {
      console.log('ℹ️  [Container] No multi-account deployment (_multiAccountDeployment not found in data)');
    }

    try {
      setFormData(data);
      setPhase('creating');
      setActiveStep(1);
      setError('');

      // Map Strategy150FormData to Strategy 1-50-1 endpoint format
      const campaignData = {
        // Basic campaign data
        campaignName: data.campaignName,
        primaryText: data.primaryText,
        headline: data.headline,
        description: data.description,
        url: data.url,
        urlType: data.urlType,
        callToAction: data.callToAction,
        displayLink: data.displayLink,

        // Media data
        mediaType: data.mediaType,
        mediaFiles: data.mediaFiles,
        image: data.image,
        video: data.video,
        images: data.images,
        mediaSpecs: data.mediaSpecs,

        // Facebook resources
        facebookPage: data.facebookPage,
        instagramAccount: data.instagramAccount,
        pixel: data.pixel,

        // Strategy 1-50-1 specific
        strategy: '1-50-1',
        publishDirectly: data.publishDirectly,

        // Budget configuration
        budgetType: data.budgetType || 'daily',
        budgetLevel: data.budgetLevel || 'adset',

        // Send budgets at root level for backend compatibility (ensure they're numbers)
        dailyBudget: data.budgetType === 'daily' || !data.budgetType ?
                    (data.adSetBudget?.dailyBudget ? parseFloat(String(data.adSetBudget.dailyBudget).replace(/[$,]/g, '')) : 50) : undefined,
        lifetimeBudget: data.budgetType === 'lifetime' ?
                       (data.adSetBudget?.lifetimeBudget ? parseFloat(String(data.adSetBudget.lifetimeBudget).replace(/[$,]/g, '')) : 350) : undefined,

        // Campaign budget (for CBO)
        campaignBudget: data.campaignBudget,
        campaignBudgetOptimization: data.campaignBudgetOptimization,

        // Ad set budget (keep for backward compatibility)
        adSetBudget: {
          dailyBudget: data.adSetBudget?.dailyBudget || (data.budgetType === 'daily' ? 50 : undefined),
          lifetimeBudget: data.adSetBudget?.lifetimeBudget || (data.budgetType === 'lifetime' ? 350 : undefined),
          spendingLimits: data.adSetBudget?.spendingLimits
        },

        // Meta API compliance fields
        buyingType: data.buyingType || 'AUCTION',
        objective: data.objective,
        specialAdCategories: data.specialAdCategories || [],
        performanceGoal: data.performanceGoal || 'maximize_conversions',
        conversionEvent: data.conversionEvent,
        conversionLocation: data.conversionLocation || 'website',
        attributionSetting: data.attributionSetting,
        attributionWindow: data.attributionWindow,
        bidStrategy: data.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
        bidAmount: data.bidAmount,
        costCap: data.costCap,
        minRoas: data.minRoas,

        // Targeting
        targeting: data.targeting || {
          locations: { countries: ['US'] },
          ageMin: 18,
          ageMax: 65,
          genders: ['all']
        },

        // Placements
        placementType: data.placementType || 'automatic',
        placements: data.placements,

        // Duplication settings for Strategy 1-50-1
        duplicationSettings: data.duplicationSettings || {
          defaultBudgetPerAdSet: 1,
          budgetDistributionType: 'equal'
        }
      };

      // Use the working campaignApi.createCampaign instead of custom endpoint
      console.log('\n🔄 Processing Form Data...');
      console.log('📤 Using working campaign creation flow');
      console.log('📝 Budget configuration:');
      console.log('  - Budget Type:', data.budgetType);
      console.log('  - Daily Budget:', data.adSetBudget?.dailyBudget || 'Not set');
      console.log('  - Lifetime Budget:', data.adSetBudget?.lifetimeBudget || 'Not set');

      // Transform to match working CampaignForm structure
      // IMPORTANT: Only send fields that backend validates and expects
      const workingCampaignData: any = {
        // Required fields
        campaignName: campaignData.campaignName,
        primaryText: campaignData.primaryText,
        headline: campaignData.headline,
        description: campaignData.description || '',

        // CRITICAL: Include objective from Strategy150 data
        objective: campaignData.objective || 'OUTCOME_LEADS',
        buyingType: campaignData.buyingType || 'AUCTION',
        budgetLevel: campaignData.budgetLevel || 'adset',
        specialAdCategories: campaignData.specialAdCategories || [],
        performanceGoal: campaignData.performanceGoal || 'maximize_conversions',
        conversionEvent: campaignData.conversionEvent || 'Lead',

        // Bid strategy and related fields
        bidStrategy: campaignData.bidStrategy,
        bidAmount: campaignData.bidAmount,
        costCap: campaignData.costCap,
        minRoas: campaignData.minRoas,

        // URL fields
        url: campaignData.url || '',
        urlType: (campaignData.urlType === 'lead_gen' || campaignData.urlType === 'call') ? campaignData.urlType : 'lead_gen',

        // Budget - send the appropriate one based on budgetType
        budgetType: campaignData.budgetType || 'daily',

        // Call to action
        callToAction: campaignData.callToAction || 'LEARN_MORE',

        // Required field for CampaignFormData
        conversionLocation: campaignData.conversionLocation || 'website',

        // Targeting in working format (preserve user's selections)
        targeting: {
          locations: campaignData.targeting?.locations || { countries: ['US'] },
          ageMin: campaignData.targeting?.ageMin || 18,
          ageMax: campaignData.targeting?.ageMax || 65,
        },

        // Media
        mediaType: campaignData.mediaType || 'single_image',
        mediaFiles: campaignData.mediaFiles,
        image: campaignData.image,
        video: campaignData.video,
        images: campaignData.images,
        videoThumbnail: (data as any).videoThumbnail,  // CRITICAL: Get from form data (data), not campaignData
        videoThumbnailFrameIndex: (data as any).videoThumbnailFrameIndex,  // CRITICAL: Get from form data (data), not campaignData

        // Creative Library integration - CRITICAL for editor name in ad names
        editorName: data.editorName,
        fromLibrary: data.fromLibrary,

        // Placements (preserve all user selections including devices)
        placements: {
          facebook: campaignData.placements?.facebook || ['feed'],
          instagram: campaignData.placements?.instagram || ['stream'],
          audience_network: campaignData.placements?.audienceNetwork || [],
          messenger: campaignData.placements?.messenger || [],
          devices: campaignData.placements?.devices || ['mobile', 'desktop'],
          platforms: campaignData.placements?.platforms || ['all']
        },
        placementType: campaignData.placementType || 'automatic',

        // Attribution settings (preserve user's selection)
        attributionSetting: campaignData.attributionSetting || '1_day_click_1_day_view',
        attributionWindow: campaignData.attributionWindow || '7_day'
      };

      // Add budget based on type (make sure to get the actual values)
      if (campaignData.budgetType === 'lifetime') {
        workingCampaignData.lifetimeBudget = campaignData.lifetimeBudget || campaignData.adSetBudget?.lifetimeBudget || 350;
      } else {
        workingCampaignData.dailyBudget = campaignData.dailyBudget || campaignData.adSetBudget?.dailyBudget || 50;
      }

      // CRITICAL: Include adSetBudget with spendingLimits for ad set level controls
      workingCampaignData.adSetBudget = campaignData.adSetBudget;

      // CRITICAL: Include multi-account deployment data if present
      if (multiAccountDeployment) {
        workingCampaignData._multiAccountDeployment = multiAccountDeployment;
        console.log('✅ [Container] Added _multiAccountDeployment to workingCampaignData');
      }

      // CRITICAL: Include _multipleCampaigns if present
      if ((data as any)._multipleCampaigns) {
        workingCampaignData._multipleCampaigns = (data as any)._multipleCampaigns;
        console.log('✅ [Container] Added _multipleCampaigns to workingCampaignData');
      }

      // Log to verify budget is being set
      console.log('💰 Budget configuration:', {
        budgetType: workingCampaignData.budgetType,
        dailyBudget: workingCampaignData.dailyBudget,
        lifetimeBudget: workingCampaignData.lifetimeBudget
      });

      // Remove any undefined fields before sending
      Object.keys(workingCampaignData).forEach(key => {
        if (workingCampaignData[key] === undefined) {
          delete workingCampaignData[key];
        }
      });

      console.log('\n📤 Sending Request to Backend...');
      console.log('🔗 Endpoint: /api/campaigns/strategy-150/create');
      console.log('📦 Payload size:', JSON.stringify(workingCampaignData).length, 'bytes');
      console.log('📊 Request data:', workingCampaignData);

      // CRITICAL: Log video thumbnail status
      if (workingCampaignData.mediaType === 'single_video') {
        console.log('🎬 Video upload detected');
        console.log('   Video file:', workingCampaignData.video instanceof File ? workingCampaignData.video.name : 'NOT A FILE');
        console.log('   Custom thumbnail:', (workingCampaignData as any).videoThumbnail instanceof File ? (workingCampaignData as any).videoThumbnail.name : 'NO CUSTOM THUMBNAIL');
        console.log('   Thumbnail frame index:', (workingCampaignData as any).videoThumbnailFrameIndex);
      }

      // Create FormData to handle file uploads properly
      const formData = new FormData();

      // Add all non-file fields to FormData
      Object.keys(workingCampaignData).forEach(key => {
        const value = workingCampaignData[key as keyof typeof workingCampaignData];

        if (key === 'media' || key === 'mediaFiles' || key === 'image' || key === 'video' || key === 'videoThumbnail') {
          // Skip file fields, we'll handle them separately
          return;
        }

        if (value === undefined || value === null) {
          return;
        }

        // Handle arrays and objects
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === 'object' && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'dailyBudget' || key === 'lifetimeBudget') {
          // Keep budget values in dollars (backend will convert to cents)
          formData.append(key, String(Number(value)));
        } else {
          formData.append(key, String(value));
        }
      });

      // Handle media files based on mediaType
      if (workingCampaignData.mediaType === 'single_image' && workingCampaignData.image instanceof File) {
        formData.append('media', workingCampaignData.image);
      } else if (workingCampaignData.mediaType === 'single_video' && workingCampaignData.video instanceof File) {
        formData.append('media', workingCampaignData.video);

        // Add video thumbnail if provided
        if (workingCampaignData.videoThumbnail instanceof File) {
          formData.append('videoThumbnail', workingCampaignData.videoThumbnail);
          console.log('✅ Including video thumbnail:', workingCampaignData.videoThumbnail.name);

          // Add frame index if provided
          if (workingCampaignData.videoThumbnailFrameIndex !== undefined) {
            formData.append('videoThumbnailFrameIndex', String(workingCampaignData.videoThumbnailFrameIndex));
          }
        }
      } else if (workingCampaignData.mediaType === 'carousel' && workingCampaignData.images && Array.isArray(workingCampaignData.images)) {
        workingCampaignData.images.forEach((file: File) => {
          formData.append('media', file);
        });
      } else if (workingCampaignData.mediaFiles && Array.isArray(workingCampaignData.mediaFiles)) {
        // Fallback to mediaFiles if specific fields aren't set
        workingCampaignData.mediaFiles.forEach((file: File) => {
          formData.append('media', file);
        });
      }

      // Ensure special ad categories is properly formatted
      if (workingCampaignData.specialAdCategories) {
        const categories = Array.isArray(workingCampaignData.specialAdCategories)
          ? workingCampaignData.specialAdCategories
          : [workingCampaignData.specialAdCategories];
        formData.set('specialAdCategories', JSON.stringify(categories));
      }

      // Handle nested budget object - keep values in dollars
      if (workingCampaignData.adSetBudget) {
        const adSetBudget = {
          ...workingCampaignData.adSetBudget,
          dailyBudget: workingCampaignData.adSetBudget.dailyBudget ? workingCampaignData.adSetBudget.dailyBudget : undefined,
          lifetimeBudget: workingCampaignData.adSetBudget.lifetimeBudget ? workingCampaignData.adSetBudget.lifetimeBudget : undefined,
          // ✅ FIX: Include schedule fields from form data
          scheduleType: data.adSetBudget?.scheduleType || 'run_continuously',
          startDate: data.adSetBudget?.startDate,
          endDate: data.adSetBudget?.endDate,
          dayparting: data.adSetBudget?.dayparting
        };
        formData.set('adSetBudget', JSON.stringify(adSetBudget));
      }

      // CRITICAL: Send editor name if files were selected from Creative Library
      if (workingCampaignData.editorName) {
        formData.set('editorName', workingCampaignData.editorName);
        console.log('✅ Including editor name in submission:', workingCampaignData.editorName);
      } else {
        console.log('ℹ️ No editor name (files uploaded locally)');
      }

      // Send fromLibrary flag to indicate files came from library
      if (workingCampaignData.fromLibrary) {
        formData.set('fromLibrary', 'true');
        console.log('✅ FromLibrary flag set: true');
      }

      // Loop for multiple campaigns
      const createdCampaigns = [];
      let lastSuccessfulResult = null;

      for (let i = 0; i < numberOfCampaigns; i++) {
        // Update campaign name for copies
        if (i > 0) {
          formData.set('campaignName', `${data.campaignName} - Copy ${i + 1}`);
          console.log(`\n📢 Creating campaign ${i + 1} of ${numberOfCampaigns}: ${data.campaignName} - Copy ${i + 1}`);

          // Add 10-second delay between campaigns to avoid rate limits
          console.log('⏳ Waiting 10 seconds to avoid rate limits...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          console.log(`\n📢 Creating campaign ${i + 1} of ${numberOfCampaigns}: ${data.campaignName}`);
        }

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5002/api'}/campaigns/strategy-150/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            // Don't set Content-Type, let the browser set it with boundary for multipart
          },
          body: formData
        });

        const result = await response.json();

        console.log('📥 Response from working endpoint:', result);

        // Enhanced error logging
        if (result.error) {
          console.error(`❌ Campaign ${i + 1} creation error:`, result.error);
          if (i === 0) {
            // If first campaign fails, stop everything
            throw new Error(result.error);
          }
          // Otherwise, continue with remaining campaigns
          continue;
        }

        if (result.success) {
          createdCampaigns.push(result);
          lastSuccessfulResult = result;
          console.log(`✅ Campaign ${i + 1} created successfully`);
        }
        } catch (loopError: any) {
          if (i === 0) {
            throw loopError; // First campaign must succeed
          }
          console.error(`❌ Error creating campaign ${i + 1}:`, loopError.message);
          continue;
        }
      } // End of campaign creation loop

      // Process results after all campaigns are created
      if (!lastSuccessfulResult || createdCampaigns.length === 0) {
        throw new Error('Failed to create any campaigns');
      }

      const result = lastSuccessfulResult;

      // Get resource details for display
      const accountName = result.data?.adAccount?.name || 'Unknown Account';
      const pageName = result.data?.page?.name || data.facebookPage || 'Unknown Page';
      const pixelId = data.pixel || 'No Pixel';

      // Enhanced message with creation details
      const campaignCount = createdCampaigns.length;
      const enhancedMessage = campaignCount > 1
        ? `✅ ${campaignCount} campaigns created successfully!\n📊 Account: ${accountName}\n📱 Page: ${pageName}\n🎯 Pixel: ${pixelId}`
        : `✅ Campaign created successfully!\n📊 Account: ${accountName}\n📱 Page: ${pageName}\n🎯 Pixel: ${pixelId}`;

      // Transform CampaignResponse to Strategy150Response format
      const strategy150Result: Strategy150Response = {
        success: true,
        message: enhancedMessage,
        data: {
          phase: 'waiting', // Set to waiting since we'll capture Post ID next
          campaign: result.data?.campaign || {
            id: 'unknown',
            name: data.campaignName
          },
          adSet: result.data?.adSet || {
            id: 'unknown',
            name: `${data.campaignName} - Ad Set 1`
          },
          ads: result.data?.ads || [{
            id: 'unknown',
            name: `${data.campaignName} - Ad 1`
          }]
        }
      };

      console.log('📝 Transformed response:', strategy150Result);
      setCampaignResult(strategy150Result);

      // Check if fallback was used (fields were skipped)
      if (result.data?.adSet?._skippedFields) {
        setSkippedFields(result.data.adSet._skippedFields);
        setFallbackUsed(true);
        console.log('📢 Some fields were skipped for successful creation:', result.data.adSet._skippedFields);
      }

      setPhase('waiting');

      // Extract ad ID from the first ad for Post ID capture (only for first campaign)
      const adId = result.data?.ads?.[0]?.id;
      console.log('🎯 Extracted ad ID for Post ID capture:', adId);

      if (adId) {
        // Start automatic post ID capture with extracted ad ID
        setTimeout(() => {
          console.log('⏰ Starting Post ID capture for ad:', adId);
          handleAutoPostCapture(adId);
        }, 30000); // Wait 30 seconds before trying to fetch post ID
      } else {
        console.warn('⚠️ No ad ID found in response, switching to manual input');
        setPhase('manual');
      }
    } catch (error: any) {
      console.error('\n❌ ========== STRATEGY 1-50-1 FAILED ==========');
      console.error('🔴 Phase 1 error:', error);
      console.error('📍 Error Type:', error.name);
      console.error('📍 Error Status:', error.response?.status);
      console.error('📍 Error URL:', error.config?.url);

      // Extract detailed error message
      let errorMessage = 'Unknown error occurred';

      if (error.response?.data?.errors) {
        // Validation errors from backend
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map((e: any) => e.msg || e.message).join(', ');
        console.error('📋 Validation errors:', validationErrors);
      } else if (error.response?.data?.error) {
        // General error message from backend
        errorMessage = error.response.data.error;
        console.error('📋 Backend error message:', errorMessage);

        // Check for specific Facebook errors
        if (errorMessage.includes('promoted_object') || errorMessage.includes('custom_event_type')) {
          console.error('🎯 Facebook API field validation error detected');
          console.error('💡 Suggestion: Backend should retry with safe mode automatically');
        }
      } else if (error.message) {
        errorMessage = error.message;
        console.error('📋 Client error message:', errorMessage);
      }

      console.error('📊 Full error object:', error);
      console.error('==========================================\n');

      setError(errorMessage);
      setPhase('error');
    }
  };

  const handleAutoPostCapture = async (adId?: string, retryCount = 0): Promise<void> => {
    if (!adId) {
      setPhase('manual');
      return;
    }

    console.log('Attempting auto post capture for ad:', adId, 'Retry:', retryCount);

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const response = await fetch(`/api/campaigns/strategy-150/post-id/${adId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Received non-JSON response, likely HTML error page');
        throw new Error('Invalid response format');
      }

      // Check if response is ok before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.postId) {
        setPostId(result.postId);
        setPhase('duplicating');
        setActiveStep(2);
      } else if (retryCount < 2) {
        // Retry with exponential backoff
        console.log('Post ID not ready yet, retrying in 5 seconds...');
        setTimeout(() => {
          handleAutoPostCapture(adId, retryCount + 1);
        }, 5000 * (retryCount + 1));
      } else {
        // Auto-capture failed after retries, switch to manual input
        console.log('Auto-capture failed after retries');
        setPhase('manual');
      }
    } catch (error: any) {
      console.error('Auto post capture error:', error);

      if (error.name === 'AbortError') {
        console.error('Request timed out after 45 seconds');
      }

      // Retry on network errors if we haven't exceeded retry count
      if (retryCount < 2 && (error.name === 'AbortError' || error.message === 'Invalid response format')) {
        console.log('Retrying due to network error...');
        setTimeout(() => {
          handleAutoPostCapture(adId, retryCount + 1);
        }, 3000);
      } else {
        setPhase('manual');
      }
    }
  };

  const handlePostIdCaptured = (capturedPostId: string) => {
    // Keep the original Facebook format with underscore
    setPostId(capturedPostId);
    setPhase('duplicating');
    setActiveStep(2);
  };

  const handleManualPostId = (manualPostId: string) => {
    // Keep the original Facebook format with underscore
    setPostId(manualPostId);
    setPhase('duplicating');
    setActiveStep(2);
  };

  const handleRetryPostCapture = () => {
    if (campaignResult?.data?.ads?.[0]?.id) {
      setPhase('waiting');
      handleAutoPostCapture(campaignResult.data.ads[0].id);
    }
  };

  const handleDuplicationCompleted = () => {
    setPhase('completed');
    setActiveStep(3);
  };

  const handleCreateNew = () => {
    setPhase('setup');
    setActiveStep(0);
    setFormData(null);
    setCampaignResult(null);
    setPostId('');
    setError('');
    setSkippedFields(null);
    setFallbackUsed(false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Strategy 1-50-1
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create and manage your 1-campaign-50-adsets campaigns with advanced controls
          </Typography>

          {/* Tab Navigation */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            centered
            sx={{ mb: 4 }}
          >
            <Tab label="Create Campaign" value="create" />
            <Tab label="Manage Campaigns" value="manage" />
            <Tab label="Multiply Campaign" value="multiply" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 'create' ? (
          <>
            {/* Existing Campaign Creation Flow */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
                Create 1 campaign with 1 ad set and 1 ad, then duplicate into 49 additional ad sets using the same creative
              </Typography>

              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Fallback Warning */}
            {fallbackUsed && skippedFields && (
              <Alert
                severity="warning"
                sx={{ mb: 3 }}
                action={
                  <Typography variant="caption" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
                    <a
                      href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${localStorage.getItem('fb_ad_account_id')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit' }}
                    >
                      Configure in Facebook
                    </a>
                  </Typography>
                }
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  Campaign created successfully with some optimizations disabled
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  The following fields were skipped to ensure successful campaign creation:
                </Typography>
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3 }}>
                  {Object.keys(skippedFields).map(field => (
                    <li key={field}>
                      <Typography variant="caption">
                        <strong>{field}</strong>: You may need to set conversion tracking manually
                      </Typography>
                    </li>
                  ))}
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Your campaign was created successfully, but you may want to configure these settings in Facebook Ads Manager for optimal performance.
                </Typography>
              </Alert>
            )}

            {getPhaseComponent()}
          </>
        ) : activeTab === 'manage' ? (
          /* Campaign Management Tab */
          <CampaignManagementContainer />
        ) : activeTab === 'multiply' ? (
          /* Campaign Multiplication Tab */
          <MultiplyContainer />
        ) : null}

      </Paper>
    </Container>
  );
};

// Wrap with CreativeLibraryProvider for Creative Library integration
const Strategy150ContainerWithProvider: React.FC = () => {
  return (
    <CreativeLibraryProvider>
      <Strategy150Container />
    </CreativeLibraryProvider>
  );
};

export default Strategy150ContainerWithProvider;