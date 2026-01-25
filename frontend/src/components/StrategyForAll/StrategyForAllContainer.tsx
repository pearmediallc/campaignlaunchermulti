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
  Tab,
  Divider,
  Button
} from '@mui/material';
import { StrategyForAllFormData, StrategyForAllPhase, StrategyForAllResponse } from '../../types/strategyForAll';
import Phase1Setup from './Phase1Setup/Phase1Setup';
import Phase2PostCapture from './Phase2PostCapture/Phase2PostCapture';
import Phase3Duplication from './Phase3Duplication/Phase3Duplication';
import CompletionSummary from './CompletionSummary/CompletionSummary';
import CampaignManagementContainer from './CampaignManagement/CampaignManagementContainer';
import MultiplyContainer from './MultiplySection/MultiplyContainer';
import { CreativeLibraryProvider } from '../../contexts/CreativeLibraryContext';
import { useStrategyVerification } from '../../hooks/useStrategyVerification';

const StrategyForAllContainer: React.FC = () => {
  // Tab management
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // Verification hook for post-creation validation
  const { verify, isVerifying, verificationResult } = useStrategyVerification();

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
    // Try both Ad Scraper URLs (new primary, old fallback)
    const AD_SCRAPER_URLS = [
      'https://facebookswipefile-443507027642.us-central1.run.app',
      'https://facebookswipefile-2gxnqoptoa-uc.a.run.app'
    ];

    for (const baseUrl of AD_SCRAPER_URLS) {
      try {
        console.log(`📥 [Strategy For All] Fetching ads from ${baseUrl} session:`, sessionId);

        const response = await fetch(`${baseUrl}/api/launcher-import/${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`❌ [Strategy For All] Failed to fetch from ${baseUrl}:`, response.status, response.statusText);
          continue; // Try next URL
        }

        const result = await response.json();

        if (result.success && result.ads && result.ads.length > 0) {
          console.log(`✅ [Strategy For All] Successfully fetched ${result.ads.length} ads from ${baseUrl}`);
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
          return; // Success, exit function
        } else {
          console.error(`❌ [Strategy For All] No ads found in session on ${baseUrl}:`, result);
          // Try next URL
        }
      } catch (error: any) {
        console.error(`❌ [Strategy For All] Error fetching from ${baseUrl}:`, error);
        // Try next URL
      }
    }

    // All URLs failed
    console.error('❌ [Strategy For All] Failed to fetch ads from all Ad Scraper URLs');
    setError('Failed to import ads: Session not found or all servers unavailable');
  };

  // Helper: Download single media file via proxy
  const downloadMediaViaProxy = async (sessionId: string, adIndex: number): Promise<File | null> => {
    // Try both Ad Scraper URLs (new primary, old fallback)
    const AD_SCRAPER_URLS = [
      'https://facebookswipefile-443507027642.us-central1.run.app',
      'https://facebookswipefile-2gxnqoptoa-uc.a.run.app'
    ];

    for (const baseUrl of AD_SCRAPER_URLS) {
      try {
        const proxyUrl = `${baseUrl}/api/proxy-media/${sessionId}/${adIndex}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          console.error(`❌ Failed proxy download from ${baseUrl} for ad ${adIndex + 1}: HTTP ${response.status}`);
          continue; // Try next URL
        }

        const blob = await response.blob();
        const isVideo = blob.type.startsWith('video/');
        const fileName = isVideo ? `imported-ad-${adIndex + 1}.mp4` : `imported-ad-${adIndex + 1}.jpg`;
        const file = new File([blob], fileName, { type: blob.type || (isVideo ? 'video/mp4' : 'image/jpeg') });

        console.log(`✅ Downloaded media for ad ${adIndex + 1} from ${baseUrl}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        return file;
      } catch (error: any) {
        console.error(`❌ Error downloading media from ${baseUrl} for ad ${adIndex + 1}:`, error);
        // Try next URL
      }
    }

    console.error(`❌ Failed to download media for ad ${adIndex + 1} from all URLs`);
    return null;
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
          <Box sx={{ mb: 3 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>Campaign Creation Failed</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{error}</Typography>

              {/* Safety System Status */}
              {campaignResult?.safetySystem && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ my: 2, borderColor: 'error.light' }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    🛡️ Safety System Report
                  </Typography>

                  {/* Job ID */}
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Job ID:</strong> {campaignResult.safetySystem.jobId}
                  </Typography>

                  {/* Rollback Status */}
                  {campaignResult.safetySystem.status === 'rolled_back' && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        ✅ Automatic Rollback Executed
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Reason:</strong> {campaignResult.safetySystem.reason || 'Safety system triggered rollback'}
                      </Typography>
                      {campaignResult.safetySystem.rollback && (
                        <>
                          <Typography variant="body2" gutterBottom>
                            <strong>Entities Deleted:</strong> {campaignResult.safetySystem.rollback.entitiesDeleted}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            <strong>Delete Failures:</strong> {campaignResult.safetySystem.rollback.entitiesFailed}
                          </Typography>
                          <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                            ✅ No incomplete campaign exists. All created entities have been automatically deleted.
                          </Typography>

                          {/* Rollback Details */}
                          {campaignResult.safetySystem.rollback.details && campaignResult.safetySystem.rollback.details.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Rollback Details:
                              </Typography>
                              <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                                {campaignResult.safetySystem.rollback.details.map((detail, idx) => (
                                  <li key={idx}>
                                    <Typography variant="body2">
                                      {detail.status === 'deleted' ? '✅' : '❌'} {detail.entityType}: {detail.entityName} ({detail.facebookId})
                                      {detail.error && ` - ${detail.error}`}
                                    </Typography>
                                  </li>
                                ))}
                              </Box>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  )}

                  {/* Retry Status */}
                  {campaignResult.safetySystem.status === 'retrying' && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        🔄 Automatic Retry in Progress
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        The safety system is automatically retrying this operation.
                      </Typography>
                      <Typography variant="body2">
                        <strong>Retry Attempt:</strong> {campaignResult.safetySystem.attempt} of {campaignResult.safetySystem.attempt! + campaignResult.safetySystem.remaining!}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Remaining Attempts:</strong> {campaignResult.safetySystem.remaining}
                      </Typography>
                      <Typography variant="body2" color="info.main" sx={{ mt: 1 }}>
                        ℹ️ The system will automatically retry with exponential backoff (1s, 2s, 4s, 8s, 16s).
                      </Typography>
                    </Box>
                  )}

                  {/* No Safety Action - Raw Error */}
                  {!campaignResult.safetySystem.status && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      ℹ️ Error occurred before safety system could engage (pre-creation verification or validation error).
                    </Typography>
                  )}
                </Box>
              )}

              {/* No Safety System Data */}
              {!campaignResult?.safetySystem && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  ℹ️ Error occurred during validation or before campaign creation started.
                </Typography>
              )}
            </Alert>

            {/* Action Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button variant="contained" onClick={handleCreateNew}>
                Try Again
              </Button>
            </Box>
          </Box>
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
        videoThumbnail: data.videoThumbnail,  // CRITICAL: Include video thumbnail
        videoThumbnailFrameIndex: data.videoThumbnailFrameIndex,  // CRITICAL: Include thumbnail frame index

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
        },

        // Dynamic Text Variations (Facebook's Multiple Text Options)
        dynamicTextEnabled: data.dynamicTextEnabled || false,
        primaryTextVariations: data.primaryTextVariations || [],
        headlineVariations: data.headlineVariations || []
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
        urlType: campaignData.urlType || 'website', // Default to 'website' for most campaigns

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
        videoThumbnail: (data as any).videoThumbnail,  // CRITICAL: Get from form data (data), not campaignData
        videoThumbnailFrameIndex: (data as any).videoThumbnailFrameIndex,  // CRITICAL: Get from form data (data), not campaignData

        // Creative Library integration - CRITICAL for editor name in ad names
        editorName: data.editorName,
        fromLibrary: data.fromLibrary,

        // Facebook resources
        facebookPage: campaignData.facebookPage,
        instagramAccount: campaignData.instagramAccount,
        pixel: campaignData.pixel,

        // Dynamic Text Variations (for Facebook's Multiple Text Options)
        dynamicTextEnabled: (campaignData as any).dynamicTextEnabled || false,
        primaryTextVariations: (campaignData as any).primaryTextVariations || [],
        headlineVariations: (campaignData as any).headlineVariations || [],

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

      // CRITICAL: Include campaign name prefix customization
      if (data.prefixOption) {
        workingCampaignData.prefixOption = data.prefixOption;
        console.log('✅ [Container] Added prefixOption:', data.prefixOption);
      }
      if (data.customPrefix) {
        workingCampaignData.customPrefix = data.customPrefix;
        console.log('✅ [Container] Added customPrefix:', data.customPrefix);
      }

      // CRITICAL: Include product catalog options
      if (data.catalogId) {
        workingCampaignData.catalogId = data.catalogId;
        console.log('✅ [Container] Added catalogId:', data.catalogId);
      }
      if (data.productSetId) {
        workingCampaignData.productSetId = data.productSetId;
        console.log('✅ [Container] Added productSetId:', data.productSetId);
      }

      // Log to verify budget is being set
      console.log('💰 Budget configuration:', {
        budgetType: workingCampaignData.budgetType,
        dailyBudget: workingCampaignData.dailyBudget,
        lifetimeBudget: workingCampaignData.lifetimeBudget
      });

      // CRITICAL: Log thumbnail BEFORE removing undefined fields
      console.log('🔍 [THUMBNAIL DEBUG] Before cleanup:', {
        hasVideoThumbnail: !!(workingCampaignData as any).videoThumbnail,
        videoThumbnailType: typeof (workingCampaignData as any).videoThumbnail,
        isFile: (workingCampaignData as any).videoThumbnail instanceof File,
        thumbnailName: (workingCampaignData as any).videoThumbnail?.name,
        frameIndex: (workingCampaignData as any).videoThumbnailFrameIndex
      });

      // Remove any undefined fields before sending
      Object.keys(workingCampaignData).forEach(key => {
        if (workingCampaignData[key] === undefined) {
          delete workingCampaignData[key];
        }
      });

      // CRITICAL: Log thumbnail AFTER removing undefined fields
      console.log('🔍 [THUMBNAIL DEBUG] After cleanup:', {
        hasVideoThumbnail: !!(workingCampaignData as any).videoThumbnail,
        thumbnailStillPresent: (workingCampaignData as any).videoThumbnail instanceof File
      });

      console.log('\n📤 Sending Request to Backend...');
      console.log('🔗 Endpoint: /api/campaigns/strategy-for-all/create');
      console.log('📦 Payload size:', JSON.stringify(workingCampaignData).length, 'bytes');
      console.log('📊 Request data:', workingCampaignData);
      console.log('🔍 Attribution in workingCampaignData:');
      console.log('  - attributionSetting:', workingCampaignData.attributionSetting);
      console.log('  - attributionWindow:', workingCampaignData.attributionWindow);
      console.log('🔍 Text Variations in workingCampaignData:');
      console.log('  - dynamicTextEnabled:', workingCampaignData.dynamicTextEnabled);
      console.log('  - primaryTextVariations:', workingCampaignData.primaryTextVariations);
      console.log('  - headlineVariations:', workingCampaignData.headlineVariations);

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
        },
        // Extract safety system metadata from backend response
        safetySystem: primaryResult.data?.safetySystem ? {
          jobId: primaryResult.data.safetySystem.jobId,
          status: primaryResult.data.safetySystem.status,
          verified: primaryResult.data.safetySystem.verification?.verified,
          retriesUsed: primaryResult.data.safetySystem.retries?.used,
          finalCounts: primaryResult.data.safetySystem.finalCounts
        } : undefined
      };

      console.log('📝 Transformed response:', strategyForAllResult);
      setCampaignResult(strategyForAllResult);

      // Check if fallback was used (fields were skipped)
      if (primaryResult.data?.adSet?._skippedFields) {
        setSkippedFields(primaryResult.data.adSet._skippedFields);
        setFallbackUsed(true);
        console.log('📢 Some fields were skipped for successful creation:', primaryResult.data.adSet?._skippedFields);
      }

      // ============================================================================
      // FIX: Backend ALREADY did all duplication - skip Phase 2 & 3!
      // ============================================================================
      // The /create endpoint uses Strategy 150 pattern and creates:
      // - Initial 1-1-1 structure (campaign + ad set + ad)
      // - Batch duplication of remaining N-1 ad sets
      // - Returns postId from initial ad
      // - Returns allAdSets array with all created ad set IDs
      //
      // Therefore:
      // - Phase 2 (Post ID Capture) is UNNECESSARY - we already have postId
      // - Phase 3 (Duplication) is UNNECESSARY - backend already duplicated
      //
      // We should skip directly to completion phase!
      // ============================================================================

      // Check if backend returned postId (from initial ad creation)
      const backendPostId = primaryResult.data?.postId;
      const totalAdSetsCreated = primaryResult.data?.allAdSets?.length || 1;

      console.log('🔍 [Strategy For All] Checking if duplication already complete...');
      console.log(`   Backend returned postId: ${backendPostId || 'NO'}`);
      console.log(`   Total ad sets created: ${totalAdSetsCreated}`);
      console.log(`   Expected ad sets: ${adSetCount}`);

      // If backend has postId AND created all ad sets, skip directly to completion
      if (backendPostId && totalAdSetsCreated >= adSetCount) {
        console.log('✅ [Strategy For All] Backend completed all duplication!');
        console.log('   Skipping Phase 2 (Post Capture) and Phase 3 (Duplication)');
        console.log('   Going directly to completion phase');

        setPostId(backendPostId);
        setPhase('completed');
        setActiveStep(3);
      } else {
        // Fallback to old flow (for backward compatibility)
        console.log('⚠️  [Strategy For All] Backend did NOT complete duplication');
        console.log('   Falling back to Phase 2 (Post Capture) flow');

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
      }
    } catch (error: any) {
      console.error('\n❌ ========== STRATEGY FOR ALL FAILED ==========');
      console.error('🔴 Phase 1 error:', error);
      console.error('📍 Error Type:', error.name);
      console.error('📍 Error Status:', error.response?.status);
      console.error('📍 Error URL:', error.config?.url);

      // Extract detailed error message
      let errorMessage = 'Unknown error occurred';
      let safetySystemData = null;

      if (error.response?.data?.errors) {
        // Validation errors from backend
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map((e: any) => e.msg || e.message).join(', ');
        console.error('📋 Validation errors:', validationErrors);
      } else if (error.response?.data?.error) {
        // General error message from backend
        errorMessage = error.response.data.error;
        console.error('📋 Backend error message:', errorMessage);

        // Extract safety system metadata if present
        if (error.response?.data?.safetySystem) {
          safetySystemData = error.response.data.safetySystem;
          console.log('🛡️ Safety System Response:', safetySystemData);

          // Use safety system message if available (more detailed)
          if (safetySystemData.message) {
            errorMessage = safetySystemData.message;
            console.log('📝 Using safety system message:', errorMessage);
          }
        }

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

      // Store error result with safety system metadata
      const errorResult: StrategyForAllResponse = {
        success: false,
        message: errorMessage,
        error: errorMessage,
        safetySystem: safetySystemData
      };

      setCampaignResult(errorResult);
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

  const handleDuplicationCompleted = async (duplicatedAdSets: Array<{ id: string; name: string }>) => {
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

    // === VERIFICATION: Check created entities against original request ===
    // Run verification after strategy completes to ensure Facebook received correct data
    if (campaignResult?.data?.campaign?.id && formData) {
      console.log('\n🔍 [StrategyForAll] Starting post-creation verification...');

      // Collect all created entity IDs
      const adsetIds = [
        campaignResult.data.adSet?.id,
        ...duplicatedAdSets.map(a => a.id)
      ].filter(Boolean);

      const adIds = campaignResult.data.ads?.map((ad: any) => ad.id) || [];

      try {
        const verificationResult = await verify({
          originalRequest: formData,
          createdEntities: {
            campaignId: campaignResult.data.campaign.id,
            adsetIds,
            adIds
          },
          strategyType: 'strategyForAll',
          autoCorrect: true // Auto-fix mismatches
        });

        if (verificationResult) {
          if (verificationResult.passed) {
            console.log('✅ [StrategyForAll] Verification passed! All data matches.');
          } else {
            console.log(`⚠️ [StrategyForAll] Verification found ${verificationResult.totalMismatches} mismatch(es).`);
            if (verificationResult.corrections.successful > 0) {
              console.log(`   Auto-corrected: ${verificationResult.corrections.successful} field(s)`);
            }
            if (verificationResult.corrections.failed > 0) {
              console.log(`   Failed to correct: ${verificationResult.corrections.failed} field(s)`);
            }
          }
        }
      } catch (error) {
        console.error('❌ [StrategyForAll] Verification error:', error);
        // Don't fail the strategy - just log the error
      }
    }
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