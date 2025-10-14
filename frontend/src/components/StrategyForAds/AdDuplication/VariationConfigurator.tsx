import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Tabs,
  Tab,
  Paper,
  Divider
} from '@mui/material';
import { AdSetSelection, AdVariation, OriginalAdData } from '../../../types/adDuplication';
import VariationForm from './VariationForm';

interface VariationConfiguratorProps {
  originalAdData?: OriginalAdData;
  selectedAdSets: AdSetSelection[];
  onConfirm: (variations: AdVariation[]) => void;
  onBack: () => void;
}

const VariationConfigurator: React.FC<VariationConfiguratorProps> = ({
  originalAdData,
  selectedAdSets,
  onConfirm,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Calculate max variations needed (max numberOfCopies across all ad sets)
  const maxVariationsNeeded = Math.max(
    ...selectedAdSets.map(as => as.numberOfCopies)
  );

  // Initialize variations on mount
  useEffect(() => {
    const initialVariations: AdVariation[] = [];
    for (let i = 1; i <= maxVariationsNeeded; i++) {
      initialVariations.push({
        variationNumber: i,
        useOriginal: true // Default to using original values
      });
    }
    setVariations(initialVariations);
  }, [maxVariationsNeeded]);

  const handleVariationUpdate = (index: number, updatedVariation: AdVariation) => {
    const newVariations = [...variations];
    newVariations[index] = updatedVariation;
    setVariations(newVariations);
    setError(null);
  };

  const handleConfirm = () => {
    // Validate at least one variation has custom data
    const hasCustomVariation = variations.some(v => !v.useOriginal);
    if (!hasCustomVariation) {
      setError('Please customize at least one variation, or use Quick Duplicate instead');
      return;
    }

    onConfirm(variations);
  };

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Configure Ad Variations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Create {maxVariationsNeeded} variation{maxVariationsNeeded !== 1 ? 's' : ''} for A/B testing.
        Customize creative, text, and CTAs for each variation.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Info Box */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="body2">
          💡 <strong>Tip:</strong> Variations are assigned cyclically. If you have more ad copies than variations,
          they will repeat. For example, with 2 variations and 5 copies: V1, V2, V1, V2, V1.
        </Typography>
      </Paper>

      {/* Variation Tabs */}
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
            label={`Variation ${index + 1}`}
            icon={variation.useOriginal ? undefined : <span>✏️</span>}
            iconPosition="end"
          />
        ))}
      </Tabs>

      <Divider sx={{ mb: 3 }} />

      {/* Active Variation Form */}
      {variations[activeTab] && (
        <VariationForm
          variationNumber={activeTab + 1}
          variation={variations[activeTab]}
          originalAdData={originalAdData}
          onChange={(updated) => handleVariationUpdate(activeTab, updated)}
        />
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 4 }}>
        <Button onClick={onBack} variant="outlined">
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
        >
          Create Ads ({variations.length} variation{variations.length !== 1 ? 's' : ''})
        </Button>
      </Box>
    </Box>
  );
};

export default VariationConfigurator;
