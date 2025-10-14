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
  originalAdData: {
    primaryText: string;
    headline: string;
    description?: string;
    url: string;
    displayLink?: string;
    callToAction?: string;
    mediaType: string;
  };
}

const AdVariationForms: React.FC<AdVariationFormsProps> = ({
  adsPerAdSet,
  originalAdData
}) => {
  const { setValue, watch } = useFormContext<StrategyForAdsFormData>();
  const [activeTab, setActiveTab] = useState(0);
  const [variations, setVariations] = useState<any[]>([]);

  // Initialize variations
  useEffect(() => {
    const initialVariations = [];

    // First variation - use original data
    initialVariations.push({
      variationNumber: 1,
      useOriginal: true,
      primaryText: originalAdData.primaryText,
      headline: originalAdData.headline,
      description: originalAdData.description,
      websiteUrl: originalAdData.url,
      displayLink: originalAdData.displayLink,
      callToAction: originalAdData.callToAction,
      useOriginalMedia: true
    });

    // Remaining variations - blank for user to customize
    for (let i = 2; i <= adsPerAdSet; i++) {
      initialVariations.push({
        variationNumber: i,
        useOriginal: false,
        primaryText: '',
        headline: '',
        description: '',
        websiteUrl: originalAdData.url, // Keep same URL by default
        displayLink: '',
        callToAction: originalAdData.callToAction,
        useOriginalMedia: true // Default to using original media
      });
    }

    setVariations(initialVariations);

    // Update form context
    setValue('adVariationConfig.variations', initialVariations);
  }, [adsPerAdSet, originalAdData, setValue]);

  const handleVariationUpdate = (index: number, updatedVariation: any) => {
    const newVariations = [...variations];
    newVariations[index] = {
      ...updatedVariation,
      variationNumber: index + 1
    };
    setVariations(newVariations);

    // Update form context
    setValue('adVariationConfig.variations', newVariations);
  };

  if (adsPerAdSet === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configure Ad Variations ({adsPerAdSet} variations)
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Tip:</strong> Variation 1 is pre-filled with your original ad content.
          Customize variations 2-{adsPerAdSet} with different headlines, copy, or media for A/B testing.
        </Typography>
      </Alert>

      {/* Tabs for each variation */}
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
            label={
              index === 0
                ? `Variation ${index + 1} (Original)`
                : `Variation ${index + 1}`
            }
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
            <VariationForm
              variationNumber={variation.variationNumber}
              variation={variation}
              originalAdData={{
                creative: {
                  object_story_spec: {
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
          )}
        </Box>
      ))}
    </Paper>
  );
};

export default AdVariationForms;
