import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
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

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configure Ad Variations for Selected Ad Sets
      </Typography>

      {variationMode === 'per_ad_creative' ? (
        // NEW MODE: Accordion UI - One accordion per ad set, multiple forms inside
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Per-Ad Creative Mode:</strong> You're configuring {variations.length} unique creatives ({selectedAdSetIndices.length} ad sets × {adsPerAdSet} creatives each).
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Each accordion below represents one ad set. Inside each, you'll configure {adsPerAdSet} unique creatives.
            </Typography>
          </Alert>

          {selectedAdSetIndices.map((adSetIdx) => {
            // Filter variations for this ad set
            const adSetVariations = variations.filter(v => v.adSetIndex === adSetIdx);

            return (
              <Accordion key={adSetIdx} defaultExpanded={adSetIdx === selectedAdSetIndices[0]}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'primary.light' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    📂 Ad Set {adSetIdx + 1} - {adsPerAdSet} Unique Creatives
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {adSetVariations.map((variation) => {
                      const variationIdx = variations.findIndex(
                        v => v.adSetIndex === adSetIdx && v.adNumber === variation.adNumber
                      );

                      return (
                        <Paper
                          key={variation.adNumber}
                          elevation={3}
                          sx={{
                            p: 2,
                            border: '2px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.default'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle2" color="primary" fontWeight="bold">
                              📸 Creative {variation.adNumber} of {adsPerAdSet}
                            </Typography>
                          </Box>
                          <Divider sx={{ mb: 2 }} />
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
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      ) : (
        // EXISTING MODE: Tab UI - One tab per ad set
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>You've selected {selectedAdSetIndices.length} ad set(s) for variations.</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Each tab below represents a different ad set. You can configure unique content for each ad set, including:
              • Custom text and creative
              • Optional dynamic text variations (multiple headlines/primary text per ad)
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              💡 Ad sets not selected here will use the original ad with its dynamic variations.
            </Typography>
          </Alert>

          {/* Tabs for each selected ad set */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            {variations.map((variation, index) => (
              <Tab
                key={index}
                label={`Ad Set ${variation.adSetIndex + 1} Variation`}
                sx={{
                  fontWeight: activeTab === index ? 600 : 400,
                  color: activeTab === index ? 'primary.main' : 'text.secondary'
                }}
              />
            ))}
          </Tabs>

          {/* Active variation form */}
          {variations.map((variation, index) => (
            <Box
              key={index}
              role="tabpanel"
              hidden={activeTab !== index}
            >
              {activeTab === index && (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Ad Set {variation.adSetIndex + 1}:</strong> This variation will create a unique ad for this ad set.
                      {isDynamicMode && ' You can enable dynamic text variations below for this specific ad set.'}
                    </Typography>
                  </Alert>
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
                    onChange={(updated) => handleVariationUpdate(index, updated)}
                  />
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default AdVariationForms;
