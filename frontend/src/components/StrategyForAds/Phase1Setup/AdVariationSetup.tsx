import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Alert,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { Psychology as VariationIcon, ExpandMore, ContentCopy } from '@mui/icons-material';
import { StrategyForAdsFormData } from '../../../types/strategyForAds';

interface AdVariationSetupProps {
  adSetCount: number; // Total ad sets from duplication settings
}

interface TextVariation {
  variationNumber: number;
  primaryText: string;
  headline: string;
}

const AdVariationSetup: React.FC<AdVariationSetupProps> = ({ adSetCount }) => {
  const { control, watch, setValue } = useFormContext<StrategyForAdsFormData>();
  const [selectedAdSetIndices, setSelectedAdSetIndices] = useState<number[]>([]);
  const [adsPerAdSet, setAdsPerAdSet] = useState<number>(3);
  const [textVariations, setTextVariations] = useState<TextVariation[]>([]);

  // Watch original primary text and headline from form
  const originalPrimaryText = watch('primaryText');
  const originalHeadline = watch('headline');

  // Generate ad set options (1 to adSetCount)
  const adSetOptions = Array.from({ length: adSetCount }, (_, i) => ({
    value: i,
    label: `Ad Set ${i + 1}`
  }));

  const handleAdSetSelectionChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    const indices = typeof value === 'string' ? [] : value;
    setSelectedAdSetIndices(indices);

    // Update form context
    setValue('adVariationConfig.selectedAdSetIndices', indices);
  };

  const handleAdsPerAdSetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 1;
    const clampedValue = Math.max(1, Math.min(7, value));
    setAdsPerAdSet(clampedValue);

    // Update form context
    setValue('adVariationConfig.adsPerAdSet', clampedValue);

    // Initialize text variations array when adsPerAdSet changes
    const newVariations: TextVariation[] = [];
    for (let i = 1; i <= clampedValue; i++) {
      newVariations.push({
        variationNumber: i,
        primaryText: i === 1 ? (originalPrimaryText || '') : '',
        headline: i === 1 ? (originalHeadline || '') : ''
      });
    }
    setTextVariations(newVariations);
  };

  const handleTextVariationChange = (index: number, field: 'primaryText' | 'headline', value: string) => {
    const updatedVariations = [...textVariations];
    updatedVariations[index] = {
      ...updatedVariations[index],
      [field]: value
    };
    setTextVariations(updatedVariations);

    // Update form context with variations
    const formVariations = updatedVariations.map(v => ({
      variationNumber: v.variationNumber,
      useOriginal: false,
      primaryText: v.primaryText,
      headline: v.headline,
      websiteUrl: watch('url'),
      callToAction: watch('callToAction'),
      useOriginalMedia: true
    }));
    setValue('adVariationConfig.variations', formVariations);
  };

  const handleCopyFromOriginal = (index: number) => {
    const updatedVariations = [...textVariations];
    updatedVariations[index] = {
      ...updatedVariations[index],
      primaryText: originalPrimaryText || '',
      headline: originalHeadline || ''
    };
    setTextVariations(updatedVariations);

    // Update form context
    const formVariations = updatedVariations.map(v => ({
      variationNumber: v.variationNumber,
      useOriginal: false,
      primaryText: v.primaryText,
      headline: v.headline,
      websiteUrl: watch('url'),
      callToAction: watch('callToAction'),
      useOriginalMedia: true
    }));
    setValue('adVariationConfig.variations', formVariations);
  };

  // Calculate totals
  const adSetsWithVariations = selectedAdSetIndices.length;
  const adSetsWithoutVariations = adSetCount - adSetsWithVariations;
  const totalAdsInVariationSets = adSetsWithVariations * adsPerAdSet;
  const totalAdsInNonVariationSets = adSetsWithoutVariations * 1; // 1 ad per non-variation ad set
  const totalAds = totalAdsInVariationSets + totalAdsInNonVariationSets;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <VariationIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">
          Ad Variations Configuration
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Configure which ad sets should have multiple ad variations for A/B testing.
        Ad sets without variations will use the original ad post ID (preserving social proof).
      </Alert>

      {/* Ad Set Selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="ad-set-selection-label">
          Which ad sets should have ad variations?
        </InputLabel>
        <Select
          labelId="ad-set-selection-label"
          multiple
          value={selectedAdSetIndices}
          onChange={handleAdSetSelectionChange}
          input={<OutlinedInput label="Which ad sets should have ad variations?" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as number[]).map((index) => (
                <Chip key={index} label={`Ad Set ${index + 1}`} size="small" />
              ))}
            </Box>
          )}
        >
          {adSetOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Select specific ad sets that will have multiple ad variations. Leave empty to use original ad for all ad sets.
        </Typography>
      </FormControl>

      {/* Ads Per Ad Set */}
      {selectedAdSetIndices.length > 0 && (
        <>
          <TextField
            fullWidth
            type="number"
            label="How many ads per selected ad set?"
            value={adsPerAdSet}
            onChange={handleAdsPerAdSetChange}
            inputProps={{ min: 1, max: 7 }}
            helperText="Maximum 7 ads per ad set (including the original ad). Each variation will have different content/post ID."
            sx={{ mb: 3 }}
          />

          {/* Dynamic Text Variation Fields */}
          {textVariations.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />

              <Alert severity="info" sx={{ mb: 2 }}>
                💡 Configure different text for each ad variation. Variation 1 defaults to your original text.
              </Alert>

              {textVariations.map((variation, index) => (
                <Accordion key={index} defaultExpanded={index === 0}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        Variation {variation.variationNumber}
                      </Typography>
                      {index > 0 && (
                        <Tooltip title="Copy from original text">
                          <IconButton
                            size="small"
                            sx={{ ml: 'auto', mr: 2 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyFromOriginal(index);
                            }}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Primary Text"
                        value={variation.primaryText}
                        onChange={(e) => handleTextVariationChange(index, 'primaryText', e.target.value)}
                        placeholder={index === 0 ? "Uses original primary text" : "Enter custom primary text"}
                        helperText={index === 0 ? "This is your default text" : `Custom text for variation ${variation.variationNumber}`}
                      />
                      <TextField
                        fullWidth
                        label="Headline"
                        value={variation.headline}
                        onChange={(e) => handleTextVariationChange(index, 'headline', e.target.value)}
                        placeholder={index === 0 ? "Uses original headline" : "Enter custom headline"}
                        helperText={index === 0 ? "This is your default headline" : `Custom headline for variation ${variation.variationNumber}`}
                      />
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Summary */}
          <Paper sx={{ p: 2, backgroundColor: 'success.light' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              ✅ Configuration Summary:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • <strong>Ad Sets WITH Variations:</strong> {adSetsWithVariations} ad sets
              </Typography>
              <Typography variant="body2" sx={{ pl: 2, mb: 1 }}>
                └─ Each has {adsPerAdSet} ads = {totalAdsInVariationSets} ads total
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • <strong>Ad Sets WITHOUT Variations:</strong> {adSetsWithoutVariations} ad sets
              </Typography>
              <Typography variant="body2" sx={{ pl: 2, mb: 1 }}>
                └─ Each has 1 ad (original) = {totalAdsInNonVariationSets} ads total
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                • <strong>Total:</strong> {adSetCount} ad sets, {totalAds} ads
              </Typography>
            </Box>
          </Paper>

          {selectedAdSetIndices.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> You'll configure the {adsPerAdSet} ad variations in the next section.
                These variations will be applied to all selected ad sets ({adSetsWithVariations} ad sets).
              </Typography>
            </Alert>
          )}
        </>
      )}
    </Paper>
  );
};

export default AdVariationSetup;
