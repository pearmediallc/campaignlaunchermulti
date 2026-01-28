import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import { Strategy150FormData } from '../../../types/strategy150';
import CampaignSection from './CampaignSection';
import AdSetSection from './AdSetSection';
import AdSection from './AdSection';
import TemplateManager from '../../Templates/TemplateManager';
import { TemplateData, templateApi } from '../../../services/templateApi';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { useFacebookResources } from '../../../hooks/useFacebookResources';
import CampaignNamePrefix from '../../shared/CampaignNamePrefix';


interface Phase1SetupProps {
  onSubmit: (data: Strategy150FormData) => void;
  error?: string;
  importedAdsData?: any; // Data from Ad Scraper import
}

const Phase1Setup: React.FC<Phase1SetupProps> = ({ onSubmit, error, importedAdsData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<Strategy150FormData | null>(null);
  const [loadedTemplateId, setLoadedTemplateId] = useState<number | null>(null);
  const { resources } = useFacebookResources();

  // ============================================================================
  // NEW FEATURES: Campaign Name Prefix (Strategy-150)
  // ============================================================================
  const [prefixOption, setPrefixOption] = useState<'launcher' | 'none' | 'custom'>('launcher');
  const [customPrefix, setCustomPrefix] = useState('');
  // ============================================================================

  // System default values (fallback if no user template)
  const systemDefaults: Strategy150FormData = {
    // Campaign Level Defaults
    campaignName: '',
    buyingType: 'AUCTION',
    objective: 'OUTCOME_SALES',
    budgetLevel: 'campaign',
    specialAdCategories: [],
    campaignBudgetOptimization: true,
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP',

    // Campaign Budget
    campaignBudget: {
      dailyBudget: 50,
      lifetimeBudget: undefined
    },

    // Ad Set Level Defaults
    performanceGoal: 'maximize_conversions',
    pixel: '',
    conversionEvent: 'Purchase',
    attributionSetting: '1_day_click_1_day_view',
    attributionWindow: '1_day',

    // Ad Set Budget & Schedule
    adSetBudget: {
      dailyBudget: 50,
      lifetimeBudget: undefined,
      scheduleType: 'run_continuously',
      spendingLimits: {
        enabled: false,
        valueType: 'percentage',
        dailyMin: undefined,
        dailyMax: undefined,
        lifetimeMin: undefined,
        lifetimeMax: undefined
      }
    },

    // Ad Level Defaults
    facebookPage: '',
    urlType: 'website',
    url: '',
    headline: '',
    description: '',
    primaryText: '',
    mediaType: 'single_image',
    callToAction: 'LEARN_MORE',
    publishDirectly: false,

    // Enhanced Targeting
    targeting: {
      locations: {
        countries: ['US']
      },
      ageMin: 18,
      ageMax: 65,
      genders: ['all']
    },

    // Placements
    placementType: 'automatic',
    placements: {
      facebook: ['feed', 'stories'],
      instagram: ['stream', 'stories'],
      audienceNetwork: ['classic'],
      messenger: [],
      devices: ['mobile', 'desktop'],
      platforms: ['all']
    },

    // Duplication Settings
    duplicationSettings: {
      defaultBudgetPerAdSet: 1,
      budgetDistributionType: 'equal'
    },

    // Budget type for consistency
    budgetType: 'daily'
  };

  const methods = useForm<Strategy150FormData>({
    defaultValues: systemDefaults
  });

  // Load user's default template on mount
  useEffect(() => {
    const loadUserDefaultTemplate = async () => {
      try {
        setLoadingTemplate(true);
        const defaultTemplate = await templateApi.getDefaultTemplate();

        if (defaultTemplate && defaultTemplate.templateData) {
          // Deep merge: system defaults → user template
          const mergedDefaults = deepMerge(systemDefaults, defaultTemplate.templateData);

          // Apply merged defaults to form
          methods.reset(mergedDefaults);
        } else {
          // No default template, use system defaults
          methods.reset(systemDefaults);
        }
      } catch (error) {
        console.log('No default template found or error loading, using system defaults');
        methods.reset(systemDefaults);
      } finally {
        setLoadingTemplate(false);
      }
    };

    loadUserDefaultTemplate();
  }, []);

  // ===== AD SCRAPER IMPORT AUTO-POPULATION =====
  // Auto-populate form fields when ads are imported from Ad Scraper
  useEffect(() => {
    if (importedAdsData && importedAdsData.ads && importedAdsData.ads.length > 0 && !loadingTemplate) {
      const firstAd = importedAdsData.ads[0];

      console.log('🎨 [Strategy 1-50-1] Auto-populating form with imported ad data:', firstAd);

      // Populate text fields
      if (firstAd.primaryText) {
        methods.setValue('primaryText', firstAd.primaryText, { shouldValidate: true, shouldDirty: true });
        console.log('  ✅ Set primaryText:', firstAd.primaryText);
      }

      if (firstAd.headline) {
        methods.setValue('headline', firstAd.headline, { shouldValidate: true, shouldDirty: true });
        console.log('  ✅ Set headline:', firstAd.headline);
      }

      if (firstAd.description) {
        methods.setValue('description', firstAd.description, { shouldValidate: true, shouldDirty: true });
        console.log('  ✅ Set description:', firstAd.description);
      }

      if (firstAd.url) {
        methods.setValue('url', firstAd.url, { shouldValidate: true, shouldDirty: true });
        console.log('  ✅ Set url:', firstAd.url);
      }

      if (firstAd.displayLink) {
        methods.setValue('displayLink', firstAd.displayLink, { shouldValidate: true, shouldDirty: true });
        console.log('  ✅ Set displayLink:', firstAd.displayLink);
      }

      if (firstAd.callToAction) {
        methods.setValue('callToAction', firstAd.callToAction, { shouldValidate: true, shouldDirty: true });
        console.log('  ✅ Set callToAction:', firstAd.callToAction);
      }

      // Set URL type based on what was imported
      if (firstAd.urlType) {
        methods.setValue('urlType', firstAd.urlType, { shouldValidate: true, shouldDirty: true });
        console.log('  ✅ Set urlType:', firstAd.urlType);
      }

      // Handle media file if it was downloaded successfully
      if (firstAd.mediaFile) {
        const isVideo = firstAd.mediaFile.type.startsWith('video/');
        methods.setValue('mediaType', isVideo ? 'single_video' : 'single_image', { shouldValidate: true, shouldDirty: true });

        if (isVideo) {
          methods.setValue('video', firstAd.mediaFile, { shouldValidate: true, shouldDirty: true });
          console.log('  ✅ Set video file:', firstAd.mediaFile.name);
        } else {
          methods.setValue('image', firstAd.mediaFile, { shouldValidate: true, shouldDirty: true });
          console.log('  ✅ Set image file:', firstAd.mediaFile.name);
        }
      } else if (firstAd.imageUrl || firstAd.videoUrl) {
        console.log('  ℹ️  Media URL available but file not downloaded - user will need to upload manually');
      }

      console.log('✅ [Strategy 1-50-1] Form auto-population complete!');
    }
  }, [importedAdsData, loadingTemplate, methods]);
  // ===== END AD SCRAPER IMPORT AUTO-POPULATION =====

  // Deep merge function for nested objects
  const deepMerge = (target: any, source: any): any => {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  };

  const isObject = (item: any): boolean => {
    return item && typeof item === 'object' && !Array.isArray(item);
  };

  const handleFormSubmit = methods.handleSubmit((data: Strategy150FormData) => {
    // Show confirmation dialog before submitting
    console.log('📋 [Phase1Setup] Form submitted with data:', {
      hasVideoThumbnail: !!(data as any).videoThumbnail,
      videoThumbnailName: (data as any).videoThumbnailFrameIndex,
      videoThumbnailFrameIndex: (data as any).videoThumbnailFrameIndex,
      mediaType: data.mediaType
    });

    // ============================================================================
    // NEW FEATURES: Add prefix options to form data (Strategy-150)
    // ============================================================================
    const enhancedData: Strategy150FormData = {
      ...data,
      prefixOption,
      customPrefix: prefixOption === 'custom' ? customPrefix : undefined
    };
    console.log('✅ [Phase1Setup] Enhanced with prefix:', {
      prefixOption,
      customPrefix: prefixOption === 'custom' ? customPrefix : undefined
    });
    // ============================================================================

    setPendingFormData(enhancedData);
    setConfirmDialogOpen(true);
  });

  const handleConfirmSubmit = (
    numberOfCampaigns?: number,
    deploymentTargets?: any[],
    deploymentMode?: 'parallel' | 'sequential'
  ) => {
    // User confirmed - proceed with campaign creation
    setConfirmDialogOpen(false);
    if (pendingFormData) {
      // Multi-account deployment
      if (deploymentTargets && deploymentTargets.length > 0) {
        console.log('🚀 [Phase1Setup] Multi-account deployment requested');
        console.log('   Targets:', deploymentTargets);
        console.log('   Mode:', deploymentMode);
        const dataWithDeployment = {
          ...pendingFormData,
          _multiAccountDeployment: {
            targets: deploymentTargets,
            mode: deploymentMode || 'parallel'
          }
        };
        console.log('📦 [Phase1Setup] Sending data with _multiAccountDeployment:', dataWithDeployment._multiAccountDeployment);
        onSubmit(dataWithDeployment as Strategy150FormData);
      }
      // Multiple campaigns in same account
      else if (numberOfCampaigns && numberOfCampaigns > 1) {
        console.log('📋 [Phase1Setup] Multiple campaigns requested:', numberOfCampaigns);
        const dataWithMultiple = {
          ...pendingFormData,
          _multipleCampaigns: numberOfCampaigns
        };
        onSubmit(dataWithMultiple as Strategy150FormData);
      }
      // Single campaign
      else {
        console.log('📝 [Phase1Setup] Single campaign requested');
        onSubmit(pendingFormData);
      }
    }
  };

  const handleCancelSubmit = () => {
    // User cancelled - close dialog and let them review
    setConfirmDialogOpen(false);
    setPendingFormData(null);
  };

  // Template management handlers
  const handleLoadTemplate = (templateData: TemplateData, templateId?: number) => {
    console.log('📋 Loading template with data:', templateData);

    // Track loaded template ID for update functionality
    if (templateId) {
      setLoadedTemplateId(templateId);
    }

    // Load template data into form
    Object.keys(templateData).forEach((key) => {
      const value = templateData[key as keyof TemplateData];
      if (value !== undefined && value !== null) {
        // Set value directly without checking if field exists
        // This ensures new fields are loaded properly
        methods.setValue(key as keyof Strategy150FormData, value as any, {
          shouldValidate: false,
          shouldDirty: true
        });

        console.log(`  ✅ Set field '${key}' with value:`, value);
      }
    });

    console.log('📋 Template loading complete');
  };

  const handleClearForm = () => {
    methods.reset();
    setLoadedTemplateId(null); // Clear loaded template tracking
  };

  // Form sections for better organization
  const formSections = [
    { label: 'Campaign', component: 'campaign' },
    { label: 'Ad Set', component: 'adset' },
    { label: 'Ad Creative', component: 'ad' }
  ];

  // Show loading state while fetching default template
  if (loadingTemplate) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading your default template...
        </Typography>
      </Box>
    );
  }

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleFormSubmit}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Template Manager Section */}
        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: { xs: 2, md: 3 }, backgroundColor: '#f8f9fa' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            📑 Campaign Templates
          </Typography>
          <TemplateManager
            formData={methods.getValues()}
            onLoadTemplate={handleLoadTemplate}
            onClearForm={handleClearForm}
          />
        </Paper>

        {/* Optional: Add stepper for visual progress */}
        <Stepper activeStep={-1} orientation={isMobile ? 'vertical' : 'horizontal'} sx={{ mb: { xs: 2, md: 4 } }}>
          {formSections.map((section) => (
            <Step key={section.label} completed>
              <StepLabel>{section.label} Configuration</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Campaign Section */}
        <CampaignSection />

        {/* Ad Set Section */}
        <AdSetSection />

        {/* Ad Section */}
        <AdSection />

        {/* ============================================================================
            NEW FEATURES: Campaign Name Prefix (Strategy-150)
            ============================================================================ */}
        <CampaignNamePrefix
          campaignName={methods.watch('campaignName') || ''}
          prefixOption={prefixOption}
          customPrefix={customPrefix}
          onPrefixOptionChange={setPrefixOption}
          onCustomPrefixChange={setCustomPrefix}
        />
        {/* ============================================================================ */}

        {/* Submit Button */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ minWidth: 300, py: 1.5 }}
            color="primary"
          >
            Create Initial Campaign (1-1-1)
          </Button>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mt: 3 }}>
          After creating the initial campaign, you'll be able to capture the Post ID and duplicate it into 49 additional ad sets with $1 budget each.
        </Alert>

        {/* Budget Confirmation Dialog */}
        <ConfirmationDialog
          open={confirmDialogOpen}
          formData={pendingFormData}
          selectedAdAccount={resources.selectedAdAccount}
          selectedPage={resources.selectedPage}
          selectedPixel={resources.selectedPixel}
          onConfirm={handleConfirmSubmit}
          onCancel={handleCancelSubmit}
        />
      </Box>
    </FormProvider>
  );
};

export default Phase1Setup;