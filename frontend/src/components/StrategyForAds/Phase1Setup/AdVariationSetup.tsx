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
  Divider
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { Psychology as VariationIcon } from '@mui/icons-material';
import { StrategyForAdsFormData } from '../../../types/strategyForAds';

interface AdVariationSetupProps {
  adSetCount: number; // Total ad sets from duplication settings
}

const AdVariationSetup: React.FC<AdVariationSetupProps> = ({ adSetCount }) => {
  const { control, watch, setValue } = useFormContext<StrategyForAdsFormData>();
  const [selectedAdSetIndices, setSelectedAdSetIndices] = useState<number[]>([]);
  const [adsPerAdSet, setAdsPerAdSet] = useState<number>(3);

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
        Each variation can have its own dynamic text variations (5 texts × 5 headlines) for maximum testing power!
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
