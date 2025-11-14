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

  // Initialize variations - one per selected ad set
  useEffect(() => {
    // Check if variations already exist (from loaded template)
    if (existingVariations && existingVariations.length > 0) {
      console.log('📋 Found existing variations from template:', existingVariations);
      setVariations(existingVariations);
      return; // Don't reinitialize - use template data
    }

    // Only create new variations if none exist
    const initialVariations = [];

    // Create one variation for each selected ad set
    selectedAdSetIndices.forEach((adSetIndex, idx) => {
      initialVariations.push({
        variationNumber: idx + 1,
        adSetIndex: adSetIndex, // Track which ad set this variation is for
        useOriginal: false, // Start with custom for all variations
        primaryText: '',
        headline: '',
        description: '',
        websiteUrl: originalAdData.url,
        displayLink: originalAdData.displayLink || '',
        callToAction: originalAdData.callToAction,
        useOriginalMedia: true,
        // Initialize text variation arrays
        primaryTextVariations: [],
        headlineVariations: []
      });
    });

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
  }, [selectedAdSetIndices, adsPerAdSet, originalAdData, setValue]); // Removed existingVariations from dependencies to avoid loops

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

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configure Ad Variations for Selected Ad Sets
      </Typography>

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
    </Paper>
  );
};

export default AdVariationForms;
