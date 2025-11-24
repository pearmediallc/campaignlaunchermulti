import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { StrategyForAdsFormData } from '../../../types/strategyForAds';
import VariationForm from '../AdDuplication/VariationForm';

interface AdVariationFormsProps {
  adsPerAdSet: number;
  isDynamicMode?: boolean;
  originalAdData: {
    primaryText: string;
    headline: string;
    description?: string;
    url: string;
    displayLink?: string;
    callToAction?: string;
    mediaType: string;
  };
  originalDynamicData?: {
    primaryTextVariations: string[];
    headlineVariations: string[];
  };
}

const AdVariationForms: React.FC<AdVariationFormsProps> = ({
  adsPerAdSet,
  isDynamicMode = false,
  originalAdData,
  originalDynamicData
}) => {
  const { setValue, watch } = useFormContext<StrategyForAdsFormData>();
  const [activeTab, setActiveTab] = useState(0);
  const [variations, setVariations] = useState<any[]>([]);

  // Get selected ad set indices from form context
  const selectedAdSetIndices = watch('adVariationConfig.selectedAdSetIndices') || [];

  // Watch for existing variations from loaded template
  const existingVariations = watch('adVariationConfig.variations');

  // Initialize variations based on mode
  useEffect(() => {
    // Check if variations already exist (from loaded template)
    if (existingVariations && existingVariations.length > 0) {
      console.log('📋 Found existing variations from template:', existingVariations);
      setVariations(existingVariations);
      return; // Don't reinitialize - use template data
    }

    // Get variation mode from form
    const variationMode = watch('adVariationConfig.variationMode') || 'single_creative';

    // Only create new variations if none exist
    const initialVariations = [];

    if (variationMode === 'per_ad_creative') {
      // NEW MODE: Create one variation per ad within each selected ad set
      console.log(`🎨 Per-ad creative mode: Creating ${selectedAdSetIndices.length} × ${adsPerAdSet} = ${selectedAdSetIndices.length * adsPerAdSet} variations`);

      selectedAdSetIndices.forEach((adSetIndex) => {
        for (let adNum = 1; adNum <= adsPerAdSet; adNum++) {
          initialVariations.push({
            variationNumber: initialVariations.length + 1,
            adSetIndex: adSetIndex,
            adNumber: adNum, // NEW: Track which ad within the ad set
            useOriginal: false,
            primaryText: '',
            headline: '',
            description: '',
            websiteUrl: originalAdData.url,
            displayLink: originalAdData.displayLink || '',
            callToAction: originalAdData.callToAction,
            useOriginalMedia: false, // Force upload for each creative
            primaryTextVariations: [],
            headlineVariations: []
          });
        }
      });

      console.log(`✅ Created ${initialVariations.length} variations for per-ad creative mode`);
    } else {
      // EXISTING MODE: Create one variation per selected ad set
      console.log(`🎨 Single creative mode: Creating ${selectedAdSetIndices.length} variations (one per ad set)`);

      selectedAdSetIndices.forEach((adSetIndex, idx) => {
        initialVariations.push({
          variationNumber: idx + 1,
          adSetIndex: adSetIndex,
          useOriginal: false,
          primaryText: '',
          headline: '',
          description: '',
          websiteUrl: originalAdData.url,
          displayLink: originalAdData.displayLink || '',
          callToAction: originalAdData.callToAction,
          useOriginalMedia: true,
          primaryTextVariations: [],
          headlineVariations: []
        });
      });

      console.log(`✅ Created ${initialVariations.length} variations for single creative mode`);
    }

    // If no variations created (no ad sets selected), create a default one
    if (initialVariations.length === 0 && adsPerAdSet > 0) {
      initialVariations.push({
        variationNumber: 1,
        adSetIndex: 0,
        useOriginal: true,
        primaryText: originalAdData.primaryText,
        headline: originalAdData.headline,
        description: originalAdData.description,
        websiteUrl: originalAdData.url,
        displayLink: originalAdData.displayLink || '',
        callToAction: originalAdData.callToAction,
        useOriginalMedia: true,
        primaryTextVariations: [],
        headlineVariations: []
      });
    }

    setVariations(initialVariations);

    // Update form context only if creating new variations
    if (initialVariations.length > 0) {
      setValue('adVariationConfig.variations', initialVariations);
    }
  }, [selectedAdSetIndices, adsPerAdSet, originalAdData, setValue, watch('adVariationConfig.variationMode')]); // Added variationMode dependency

  const handleVariationUpdate = (index: number, updatedVariation: any) => {
    const newVariations = [...variations];
    newVariations[index] = {
      ...updatedVariation,
      variationNumber: index + 1
    };

    console.log(`🔄 AdVariationForms - Updating variation ${index + 1}:`, {
      updatedVariation,
      hasImageHash: !!updatedVariation.imageHash,
      hasVideoId: !!updatedVariation.videoId,
      useOriginalMedia: updatedVariation.useOriginalMedia,
      primaryText: updatedVariation.primaryText,
      headline: updatedVariation.headline,
      primaryTextVariations: updatedVariation.primaryTextVariations,
      headlineVariations: updatedVariation.headlineVariations,
      allVariations: newVariations
    });

    setVariations(newVariations);

    // Update form context
    setValue('adVariationConfig.variations', newVariations);
    console.log(`✅ Form context updated with ${newVariations.length} variations`);
  };

  // Don't show if no ad sets selected
  if (selectedAdSetIndices.length === 0) {
    return null;
  }

  // Get variation mode
  const variationMode = watch('adVariationConfig.variationMode') || 'single_creative';

  // Group variations by ad set for tab rendering
  const groupedVariations = selectedAdSetIndices.map((adSetIdx) => {
    const adSetVariations = variations.filter(v => v.adSetIndex === adSetIdx);
    return {
      adSetIndex: adSetIdx,
      variations: adSetVariations
    };
  });

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configure Ad Variations for Selected Ad Sets
      </Typography>

      {/* Info Alert - Adapts to mode */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>
            {variationMode === 'per_ad_creative'
              ? `Per-Ad Creative Mode: ${variations.length} unique creatives (${selectedAdSetIndices.length} ad sets × ${adsPerAdSet} creatives each)`
              : `You've selected ${selectedAdSetIndices.length} ad set(s) for variations.`
            }
          </strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {variationMode === 'per_ad_creative'
            ? `Each tab represents one ad set. Within each tab, you'll configure ${adsPerAdSet} unique creatives using horizontal scrolling.`
            : 'Each tab below represents a different ad set. You can configure unique content for each ad set, including custom text and creative.'
          }
        </Typography>
        {variationMode === 'single_creative' && (
          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
            💡 Ad sets not selected here will use the original ad{isDynamicMode ? ' with its dynamic variations' : ''}.
          </Typography>
        )}
      </Alert>

      {/* UNIFIED TAB UI - Works for both single_creative and per_ad_creative modes */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {groupedVariations.map((group, index) => (
          <Tab
            key={group.adSetIndex}
            label={
              variationMode === 'per_ad_creative'
                ? `Ad Set ${group.adSetIndex + 1} (${group.variations.length} Creatives)`
                : `Ad Set ${group.adSetIndex + 1} Variation`
            }
            sx={{
              fontWeight: activeTab === index ? 600 : 400,
              color: activeTab === index ? 'primary.main' : 'text.secondary'
            }}
          />
        ))}
      </Tabs>

      {/* Tab Content - Renders differently based on mode */}
      {groupedVariations.map((group, tabIndex) => (
        <Box
          key={group.adSetIndex}
          role="tabpanel"
          hidden={activeTab !== tabIndex}
        >
          {activeTab === tabIndex && (
            <Box>
              {/* Success Alert */}
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Ad Set {group.adSetIndex + 1}:</strong>{' '}
                  {variationMode === 'per_ad_creative'
                    ? `Configure ${group.variations.length} unique creatives for this ad set. Each creative will be used by one ad.`
                    : `This variation will create a unique ad for this ad set.${isDynamicMode ? ' You can enable dynamic text variations below for this specific ad set.' : ''}`
                  }
                </Typography>
              </Alert>

              {variationMode === 'per_ad_creative' ? (
                // PER-AD MODE: Horizontal scrolling cards
                <>
                  {/* Progress indicator */}
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Showing {group.variations.length} of {adsPerAdSet} creatives for Ad Set {group.adSetIndex + 1}
                  </Typography>

                  {/* Horizontal scroll container */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 3,
                      overflowX: 'auto',
                      overflowY: 'visible',
                      pb: 2,
                      mb: 2,
                      '&::-webkit-scrollbar': {
                        height: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: 'grey.200',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'primary.main',
                        borderRadius: '4px',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      },
                    }}
                  >
                    {group.variations.map((variation) => {
                      const variationIdx = variations.findIndex(
                        v => v.adSetIndex === group.adSetIndex && v.adNumber === variation.adNumber
                      );

                      return (
                        <Paper
                          key={variation.adNumber}
                          elevation={3}
                          sx={{
                            minWidth: '420px',
                            maxWidth: '420px',
                            flex: '0 0 auto',
                            p: 2.5,
                            border: '2px solid',
                            borderColor: 'primary.light',
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: 4,
                              transform: 'translateY(-2px)',
                            },
                          }}
                        >
                          {/* Card Header */}
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 2,
                            pb: 1.5,
                            borderBottom: '2px solid',
                            borderColor: 'divider'
                          }}>
                            <Typography variant="subtitle1" color="primary" fontWeight="bold">
                              📸 Creative {variation.adNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {variation.adNumber} of {adsPerAdSet}
                            </Typography>
                          </Box>

                          {/* Variation Form */}
                          <VariationForm
                            variationNumber={variation.variationNumber}
                            variation={variation}
                            originalAdData={{
                              id: 'temp-ad-id',
                              name: 'Original Ad',
                              creative: {
                                id: 'temp-creative-id',
                                object_story_spec: {
                                  page_id: watch('facebookPage') || '',
                                  link_data: {
                                    message: originalAdData.primaryText || '',
                                    name: originalAdData.headline || '',
                                    description: originalAdData.description || '',
                                    link: originalAdData.url || '',
                                    call_to_action: {
                                      type: originalAdData.callToAction || 'LEARN_MORE'
                                    }
                                  }
                                }
                              }
                            }}
                            onChange={(updated) => handleVariationUpdate(variationIdx, updated)}
                          />
                        </Paper>
                      );
                    })}
                  </Box>

                  {/* Scroll hint */}
                  {group.variations.length > 2 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="caption">
                        💡 Scroll horizontally to view all {group.variations.length} creatives for this ad set
                      </Typography>
                    </Alert>
                  )}
                </>
              ) : (
                // SINGLE MODE: One form (original behavior)
                <VariationForm
                  variationNumber={group.variations[0]?.variationNumber || 1}
                  variation={group.variations[0] || {}}
                  originalAdData={{
                    id: 'temp-ad-id',
                    name: 'Original Ad',
                    creative: {
                      id: 'temp-creative-id',
                      object_story_spec: {
                        page_id: watch('facebookPage') || '',
                        link_data: {
                          message: originalAdData.primaryText || '',
                          name: originalAdData.headline || '',
                          description: originalAdData.description || '',
                          link: originalAdData.url || '',
                          call_to_action: {
                            type: originalAdData.callToAction || 'LEARN_MORE'
                          }
                        }
                      }
                    }
                  }}
                  onChange={(updated) => {
                    const variationIdx = variations.findIndex(
                      v => v.adSetIndex === group.adSetIndex
                    );
                    if (variationIdx !== -1) {
                      handleVariationUpdate(variationIdx, updated);
                    }
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      ))}
    </Paper>
  );
};

export default AdVariationForms;
