import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Card,
  CardContent,
  FormHelperText,
  Chip
} from '@mui/material';
import { AspectRatio as AspectRatioIcon } from '@mui/icons-material';

export interface AspectRatio {
  value: string;
  label: string;
  width: number;
  height: number;
  description?: string;
  recommended?: boolean;
}

export const ASPECT_RATIOS: AspectRatio[] = [
  {
    value: '1:1',
    label: 'Square (1:1)',
    width: 1080,
    height: 1080,
    description: 'Best for Instagram Feed, Facebook Feed',
    recommended: true
  },
  {
    value: '4:5',
    label: 'Vertical (4:5)',
    width: 1080,
    height: 1350,
    description: 'Best for Instagram Feed, mobile-optimized',
    recommended: true
  },
  {
    value: '16:9',
    label: 'Landscape (16:9)',
    width: 1920,
    height: 1080,
    description: 'Best for YouTube, desktop displays',
    recommended: true
  },
  {
    value: '9:16',
    label: 'Stories (9:16)',
    width: 1080,
    height: 1920,
    description: 'Best for Instagram Stories, Facebook Stories, Reels',
    recommended: true
  },
  {
    value: '2:3',
    label: 'Portrait (2:3)',
    width: 1080,
    height: 1620,
    description: 'Tall portrait format'
  }
];

interface AspectRatioSelectorProps {
  value: string;
  onChange: (ratio: string) => void;
  mediaType: 'image' | 'video';
  disabled?: boolean;
  error?: string;
  helperText?: string;
  showPreview?: boolean;
}

/**
 * AspectRatioSelector Component
 * Allows users to select the aspect ratio for their media
 */
const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  value,
  onChange,
  mediaType,
  disabled = false,
  error,
  helperText,
  showPreview = true
}) => {
  const selectedRatio = ASPECT_RATIOS.find(r => r.value === value);

  return (
    <Box>
      <FormControl fullWidth error={!!error} disabled={disabled}>
        <InputLabel id="aspect-ratio-label">
          Aspect Ratio
        </InputLabel>
        <Select
          labelId="aspect-ratio-label"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          label="Aspect Ratio"
          startAdornment={
            <AspectRatioIcon sx={{ mr: 1, color: 'action.active' }} />
          }
        >
          {ASPECT_RATIOS.map((ratio) => (
            <MenuItem key={ratio.value} value={ratio.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Box>
                  <Typography variant="body1">{ratio.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ratio.description}
                  </Typography>
                </Box>
                {ratio.recommended && (
                  <Chip label="Recommended" size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
        {error && <FormHelperText error>{error}</FormHelperText>}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>

      {showPreview && selectedRatio && (
        <Card sx={{ mt: 2, bgcolor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Preview: {selectedRatio.label}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                p: 2,
                bgcolor: 'white',
                borderRadius: 1
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 200,
                  aspectRatio: selectedRatio.value.replace(':', '/'),
                  bgcolor: '#e0e0e0',
                  border: '2px dashed #1976d2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {selectedRatio.width} × {selectedRatio.height}
                </Typography>
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {selectedRatio.description}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AspectRatioSelector;
