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
import { StrategyForAllFormData, StrategyForAllPhase, StrategyForAllResponse } from '../../types/strategyForAll';
import Phase1Setup from './Phase1Setup/Phase1Setup';
import Phase2PostCapture from './Phase2PostCapture/Phase2PostCapture';
import Phase3Duplication from './Phase3Duplication/Phase3Duplication';
import CompletionSummary from './CompletionSummary/CompletionSummary';
import CampaignManagementContainer from './CampaignManagement/CampaignManagementContainer';
import MultiplyContainer from './MultiplySection/MultiplyContainer';
import { CreativeLibraryProvider } from '../../contexts/CreativeLibraryContext';

const StrategyForAllContainer: React.FC = () => {
  // Tab management
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // Get URL location for import detection
  const location = useLocation();

  // Existing state for campaign creation
  const [phase, setPhase] = useState<StrategyForAllPhase>('setup');
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<StrategyForAllFormData | null>(null);

  // Dynamic steps based on user's ad set count selection
  const adSetCount = formData?.duplicationSettings?.adSetCount || 50;
  const steps = [
    'Campaign Setup (1-1-1)',
    'Post ID Collection',
    `Duplication (1-${adSetCount}-1)`,
    'Completion'
  ];
  const [campaignResult, setCampaignResult] = useState<StrategyForAllResponse | null>(null);
  const [postId, setPostId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [skippedFields, setSkippedFields] = useState<any>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  // State for imported ads from Ad Scraper
  const [importedAdsData, setImportedAdsData] = useState<any>(null);

  // ===== AD SCRAPER IMPORT INTEGRATION =====
  // Detect import from Ad Scraper and fetch ads
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const importSessionId = searchParams.get('import');

    console.log('🔍 [Strategy For All] Import detection check:', {
      importSessionId,
      phase,
      hasImportedData: !!importedAdsData,
      willFetch: !!(importSessionId && phase === 'setup' && !importedAdsData)
    });

    if (importSessionId && phase === 'setup' && !importedAdsData) {
      console.log('🔍 [Strategy For All] Detected Ad Scraper import session:', importSessionId);
      fetchAdsFromScraper(importSessionId);
    }
  }, [location.search, phase, importedAdsData]);

  const fetchAdsFromScraper = async (sessionId: string) => {
    try {
      console.log('📥 [Strategy For All] Fetching ads from Ad Scraper session:', sessionId);

      const response = await fetch(`https://facebookswipefile-443507027642.us-central1.run.app/api/launcher-import/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ [Strategy For All] Failed to fetch ads from Ad Scraper:', response.status, response.statusText);
        setError(`Failed to import ads from Ad Scraper: ${response.statusText}`);
        return;
      }

      const result = await response.json();

      if (result.success && result.ads && result.ads.length > 0) {
        console.log(`✅ [Strategy For All] Successfully fetched ${result.ads.length} ads from Ad Scraper`);
        console.log('📦 Ads data:', result.ads);

        // Download ALL media files via proxy (Strategy For All uses only first ad)
        console.log(`📥 Downloading media for ${result.ads.length} ad(s)...`);
        const adsWithMedia = await downloadAllMediaViaProxy(sessionId, result.ads);

        // Store imported ads data with downloaded media
        setImportedAdsData({
          ...result,
          ads: adsWithMedia
        });

        setError(`✅ Successfully imported ${result.ads.length} ad(s) from Ad Scraper with media!`);

      } else {
        console.error('❌ [Strategy For All] No ads found in session:', result);
        setError('Failed to import ads: Session not found or expired');
      }
    } catch (error: any) {
      console.error('❌ [Strategy For All] Error fetching ads from Ad Scraper:', error);
      setError(`Failed to import ads: ${error.message}`);
    }
  };

  // Helper: Download single media file via proxy
  const downloadMediaViaProxy = async (sessionId: string, adIndex: number): Promise<File | null> => {
    try {
      const proxyUrl = `https://facebookswipefile-443507027642.us-central1.run.app/api/proxy-media/${sessionId}/${adIndex}`;
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
            adSetCount={formData?.duplicationSettings?.adSetCount || 50}
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

  const handlePhase1Submit = async (data: StrategyForAllFormData) => {
    // Check if multiple campaigns requested
    const numberOfCampaigns = (data as any)._multipleCampaigns || 1;
    if (numberOfCampaigns > 1) {
      console.log(`📢 Creating ${numberOfCampaigns} identical campaigns`);
    }

    console.log('\n🎯 ========== STRATEGY FOR ALL CLIENT START ==========');
    console.log('📄 Form Data Received:', data);
    console.log('📊 Key Parameters:');
    console.log('  - Campaign Name:', data.campaignName);
    console.log('  - Objective:', data.objective);
    console.log('  - Budget Type:', data.budgetType);
    console.log('  - Daily Budget:', data.adSetBudget?.dailyBudget || 'Not set');
    console.log('  - Conversion Event:', data.conversionEvent);
    console.log('  - Attribution Setting:', data.attributionSetting);
    console.log('  - Attribution Window:', data.attributionWindow);

    console.log('\n🔍 ========== USER SELECTIONS DEBUG ==========');
    console.log('🎯 PLACEMENTS:');
    console.log('  placementType:', data.placementType);
    console.log('  placements.facebook:', data.placements?.facebook);
    console.log('  placements.instagram:', data.placements?.instagram);
    console.log('  placements.messenger:', data.placements?.messenger);
    console.log('  placements.audienceNetwork:', data.placements?.audienceNetwork);
    console.log('  placements.devices:', data.placements?.devices);
    console.log('  placements.platforms:', data.placements?.platforms);

    console.log('\n📍 TARGETING:');
    console.log('  targeting object:', data.targeting);
    console.log('  targeting.locations:', data.targeting?.locations);
    console.log('  targeting.locations.countries:', data.targeting?.locations?.countries);
    console.log('  targeting.locations.regions:', data.targeting?.locations?.regions);
    console.log('  targeting.locations.cities:', data.targeting?.locations?.cities);
    console.log('  targeting.ageMin:', data.targeting?.ageMin);
    console.log('  targeting.ageMax:', data.targeting?.ageMax);
    console.log('  targeting.genders:', data.targeting?.genders);
    console.log('  targeting.detailedTargeting:', data.targeting?.detailedTargeting);
    console.log('  targeting.customAudiences:', data.targeting?.customAudiences);
    console.log('========================================\n');

    try {
      setFormData(data);
      setPhase('creating');
      setActiveStep(1);
      setError('');

      // Map StrategyForAllFormData to Strategy for All endpoint format
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

        // Strategy for All specific
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

        // Duplication settings for Strategy for All
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

        // CRITICAL: Include objective from StrategyForAll data
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

        // Attribution settings - CRITICAL: Must be passed to backend
        attributionSetting: campaignData.attributionSetting,
        attributionWindow: campaignData.attributionWindow,

        // URL fields
        url: campaignData.url || '',
        urlType: (campaignData.urlType === 'lead_gen' || campaignData.urlType === 'call') ? campaignData.urlType : 'lead_gen',

        // Budget - send the appropriate one based on budgetType
        budgetType: campaignData.budgetType || 'daily',

        // Call to action
        callToAction: campaignData.callToAction || 'LEARN_MORE',

        // Display Link (optional - only works for image/carousel ads)
        displayLink: campaignData.displayLink,

        // Required field for CampaignFormData
        conversionLocation: campaignData.conversionLocation || 'website',

        // Targeting - Pass complete user selections
        targeting: campaignData.targeting || {
          locations: { countries: ['US'] },
          ageMin: 18,
          ageMax: 65,
          genders: ['all']
        },

        // Media
        mediaType: campaignData.mediaType || 'single_image',
        mediaFiles: campaignData.mediaFiles,
        image: campaignData.image,
        video: campaignData.video,
        images: campaignData.images,

        // Creative Library integration - CRITICAL for editor name in ad names
        editorName: data.editorName,
        fromLibrary: data.fromLibrary,

        // Facebook resources
        facebookPage: campaignData.facebookPage,
        instagramAccount: campaignData.instagramAccount,
        pixel: campaignData.pixel,

        // Placements - Pass exactly what user selected
        placementType: campaignData.placementType || 'automatic'
      };

      // Only add placements if user selected manual placement
      if (campaignData.placementType === 'manual' && campaignData.placements) {
        console.log('🎯 Manual placements selected, passing user choices to backend');
        workingCampaignData.placements = {
          facebook: campaignData.placements.facebook || [],
          instagram: campaignData.placements.instagram || [],
          audience_network: campaignData.placements.audienceNetwork || [],
          messenger: campaignData.placements.messenger || [],
          devices: campaignData.placements.devices || [],
          platforms: campaignData.placements.platforms || []
        };
      } else {
        console.log('🎯 Automatic placements selected, letting Facebook optimize');
        // Don't send placements object for automatic placement
      }

      // Log what we're sending to backend
      console.log('\n📤 ========== SENDING TO BACKEND ==========');
      console.log('🎯 Placements:');
      console.log('  placementType:', workingCampaignData.placementType);
      console.log('  placements:', workingCampaignData.placements);
      console.log('\n📍 Targeting:');
      console.log('  targeting:', workingCampaignData.targeting);
      console.log('  targeting.locations:', workingCampaignData.targeting?.locations);
      console.log('  targeting.locations.countries:', workingCampaignData.targeting?.locations?.countries);
      console.log('  targeting.locations.regions:', workingCampaignData.targeting?.locations?.regions);
      console.log('  targeting.ageMin:', workingCampaignData.targeting?.ageMin);
      console.log('  targeting.ageMax:', workingCampaignData.targeting?.ageMax);
      console.log('  targeting.genders:', workingCampaignData.targeting?.genders);
      console.log('========================================\n');

      // Add budget based on type (make sure to get the actual values)
      if (campaignData.budgetType === 'lifetime') {
        workingCampaignData.lifetimeBudget = campaignData.lifetimeBudget || campaignData.adSetBudget?.lifetimeBudget || 350;
      } else {
        workingCampaignData.dailyBudget = campaignData.dailyBudget || campaignData.adSetBudget?.dailyBudget || 50;
      }

      // CRITICAL: Include adSetBudget with spendingLimits for ad set level controls
      workingCampaignData.adSetBudget = campaignData.adSetBudget;

      // CRITICAL: Include campaign budget for CBO
      if (campaignData.budgetLevel === 'campaign') {
        workingCampaignData.campaignBudget = campaignData.campaignBudget;
      }

      // CRITICAL: Include duplication settings
      workingCampaignData.duplicationSettings = campaignData.duplicationSettings;

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
      console.log('🔗 Endpoint: /api/campaigns/strategy-for-all/create');
      console.log('📦 Payload size:', JSON.stringify(workingCampaignData).length, 'bytes');
      console.log('📊 Request data:', workingCampaignData);
      console.log('🔍 Attribution in workingCampaignData:');
      console.log('  - attributionSetting:', workingCampaignData.attributionSetting);
      console.log('  - attributionWindow:', workingCampaignData.attributionWindow);

      // Loop for multiple campaigns
      const createdCampaigns = [];
      let lastSuccessfulResult = null;

      for (let i = 0; i < numberOfCampaigns; i++) {
        // Update campaign name for copies
        const currentCampaignName = i === 0 ? data.campaignName : `${data.campaignName} - Copy ${i + 1}`;
        if (i > 0) {
          console.log(`\n📢 Creating campaign ${i + 1} of ${numberOfCampaigns}: ${currentCampaignName}`);

          // Add 10-second delay between campaigns to avoid rate limits
          console.log('⏳ Waiting 10 seconds to avoid rate limits...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

        // Update the campaign name in workingCampaignData
        workingCampaignData.campaignName = currentCampaignName;

        // Create FormData to handle file uploads properly
        const formData = new FormData();

      // Add all non-file fields to FormData
      Object.keys(workingCampaignData).forEach(key => {
        const value = workingCampaignData[key as keyof typeof workingCampaignData];

        if (key === 'media' || key === 'mediaFiles' || key === 'image') {
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

        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5002/api'}/campaigns/strategy-for-all/create`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              // Don't set Content-Type, let the browser set it with boundary for multipart
            },
            body: formData
          });

          const result = await response.json();

          console.log('📥 Response from working endpoint:', result);

          // Enhanced error logging (CampaignResponse only has 'error' field, not 'errors')
          if (result.error) {
            console.error('❌ Campaign creation error:', result.error);
            // If first campaign fails, stop all
            if (i === 0) {
              throw new Error(result.error || 'Failed to create campaign');
            }
            // Otherwise continue with remaining campaigns
            console.log(`⚠️ Campaign ${i + 1} failed, continuing with remaining campaigns...`);
            continue;
          }

          if (result.success) {
            createdCampaigns.push(result);
            lastSuccessfulResult = result;

            // Get resource details for display
            const accountName = result.data?.adAccount?.name || 'Unknown Account';
            const pageName = result.data?.page?.name || data.facebookPage || 'Unknown Page';
            const pixelId = data.pixel || 'No Pixel';

            console.log(`✅ Campaign ${i + 1} created successfully!`);
          }
        } catch (loopError: any) {
          if (i === 0) {
            throw loopError; // First campaign must succeed
          }
          console.error(`❌ Error creating campaign ${i + 1}:`, loopError.message);
          continue;
        }
      } // End of loop

      // Process results after all campaigns are created
      if (!lastSuccessfulResult || createdCampaigns.length === 0) {
        throw new Error('Failed to create any campaigns');
      }

      // Use the first successful campaign for the main flow
      const primaryResult = createdCampaigns[0];

      // Get resource details for display
      const accountName = primaryResult.data?.adAccount?.name || 'Unknown Account';
      const pageName = primaryResult.data?.page?.name || data.facebookPage || 'Unknown Page';
      const pixelId = data.pixel || 'No Pixel';

      // Enhanced message with creation details
      const campaignCount = createdCampaigns.length;
      const enhancedMessage = campaignCount > 1
        ? `✅ ${campaignCount} campaigns created successfully!\n📊 Account: ${accountName}\n📱 Page: ${pageName}\n🎯 Pixel: ${pixelId}`
        : `✅ Campaign created successfully!\n📊 Account: ${accountName}\n📱 Page: ${pageName}\n🎯 Pixel: ${pixelId}`;

      // Transform CampaignResponse to StrategyForAllResponse format
      const strategyForAllResult: StrategyForAllResponse = {
        success: true,
        message: enhancedMessage,
        data: {
          phase: 'waiting', // Set to waiting since we'll capture Post ID next
          campaign: primaryResult.data?.campaign || {
            id: 'unknown',
            name: data.campaignName
          },
          adSet: primaryResult.data?.adSet || {
            id: 'unknown',
            name: `${data.campaignName} - Ad Set 1`
          },
          ads: primaryResult.data?.ads || [{
            id: 'unknown',
            name: `${data.campaignName} - Ad 1`
          }]
        }
      };

      console.log('📝 Transformed response:', strategyForAllResult);
      setCampaignResult(strategyForAllResult);

      // Check if fallback was used (fields were skipped)
      if (primaryResult.data?.adSet?._skippedFields) {
        setSkippedFields(primaryResult.data.adSet._skippedFields);
        setFallbackUsed(true);
        console.log('📢 Some fields were skipped for successful creation:', primaryResult.data.adSet?._skippedFields);
      }

      setPhase('waiting');

      // Extract ad ID from the first ad for Post ID capture
      const adId = primaryResult.data?.ads?.[0]?.id;
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
      console.error('\n❌ ========== STRATEGY FOR ALL FAILED ==========');
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

      const response = await fetch(`/api/campaigns/strategy-for-all/post-id/${adId}`, {
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

  const handleDuplicationCompleted = (duplicatedAdSets: Array<{ id: string; name: string }>) => {
    // Update campaignResult with duplicated ad sets data
    setCampaignResult(prev => {
      if (!prev || !prev.data) return prev;

      return {
        ...prev,
        data: {
          ...prev.data,
          duplicatedAdSets: duplicatedAdSets
        }
      };
    });
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
            Strategy for All
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create and manage your campaigns with flexible ad set duplication (1-49 ad sets)
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
                Create 1 campaign with 1 ad set and 1 ad, then duplicate into {adSetCount > 1 ? `${adSetCount - 1} additional ad sets` : 'your selected number of ad sets'} using the same creative
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
const StrategyForAllContainerWithProvider: React.FC = () => {
  return (
    <CreativeLibraryProvider>
      <StrategyForAllContainer />
    </CreativeLibraryProvider>
  );
};

export default StrategyForAllContainerWithProvider;