import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Alert,
  Paper,
  Chip,
  Stack
} from '@mui/material';
import { AdSetSelection } from '../../../types/adDuplication';

interface AdSetSelectorProps {
  availableAdSets: Array<{
    id: string;
    name: string;
  }>;
  onConfirm: (selections: AdSetSelection[]) => void;
  onBack: () => void;
}

const AdSetSelector: React.FC<AdSetSelectorProps> = ({
  availableAdSets,
  onConfirm,
  onBack
}) => {
  const [selections, setSelections] = useState<Map<string, AdSetSelection>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const handleToggleAdSet = (adSetId: string, adSetName: string) => {
    const newSelections = new Map(selections);
    if (newSelections.has(adSetId)) {
      newSelections.delete(adSetId);
    } else {
      newSelections.set(adSetId, {
        adSetId,
        adSetName,
        numberOfCopies: 1 // Default to 1 new copy
      });
    }
    setSelections(newSelections);
    setError(null);
  };

  const handleCopiesChange = (adSetId: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 6) {
      return;
    }

    const newSelections = new Map(selections);
    const selection = newSelections.get(adSetId);
    if (selection) {
      selection.numberOfCopies = num;
      newSelections.set(adSetId, selection);
      setSelections(newSelections);
      setError(null);
    }
  };

  const handleConfirm = () => {
    if (selections.size === 0) {
      setError('Please select at least one ad set');
      return;
    }

    // Validate all selections have valid copy counts
    const selectionsArray = Array.from(selections.values());
    for (const selection of selectionsArray) {
      if (selection.numberOfCopies < 1 || selection.numberOfCopies > 6) {
        setError('Number of copies must be between 1 and 6');
        return;
      }
    }

    onConfirm(selectionsArray);
  };

  const totalAdsToCreate = Array.from(selections.values()).reduce(
    (sum, sel) => sum + sel.numberOfCopies,
    0
  );

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Ad Sets & Number of Copies
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose which ad sets to duplicate into, and how many new ads to create in each.
        (Max 6 new ads + 1 original = 7 total per ad set)
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Stats */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'background.default' }}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Chip
            label={`${selections.size} Ad Set${selections.size !== 1 ? 's' : ''} Selected`}
            color={selections.size > 0 ? 'primary' : 'default'}
          />
          <Chip
            label={`${totalAdsToCreate} New Ad${totalAdsToCreate !== 1 ? 's' : ''} to Create`}
            color={totalAdsToCreate > 0 ? 'secondary' : 'default'}
          />
        </Stack>
      </Paper>

      {/* Ad Set List */}
      <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 3 }}>
        {availableAdSets.map((adSet) => {
          const isSelected = selections.has(adSet.id);
          const selection = selections.get(adSet.id);

          return (
            <Paper
              key={adSet.id}
              sx={{
                p: 2,
                mb: 2,
                border: isSelected ? 2 : 1,
                borderColor: isSelected ? 'primary.main' : 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleToggleAdSet(adSet.id, adSet.name)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">{adSet.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {adSet.id}
                      </Typography>
                    </Box>
                  }
                  sx={{ flex: 1 }}
                />

                {isSelected && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      New Ads:
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      value={selection?.numberOfCopies || 1}
                      onChange={(e) => handleCopiesChange(adSet.id, e.target.value)}
                      inputProps={{
                        min: 1,
                        max: 6,
                        style: { width: '60px', textAlign: 'center' }
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      (1-6)
                    </Typography>
                  </Box>
                )}
              </Box>

              {isSelected && selection && (
                <Box sx={{ mt: 1, pl: 5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total in this ad set: {selection.numberOfCopies + 1} ads
                    ({selection.numberOfCopies} new + 1 original)
                  </Typography>
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button onClick={onBack} variant="outlined">
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selections.size === 0}
        >
          Continue {totalAdsToCreate > 0 && `(${totalAdsToCreate} ads)`}
        </Button>
      </Box>
    </Box>
  );
};

export default AdSetSelector;
