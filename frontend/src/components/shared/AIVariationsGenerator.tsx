import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';

interface AIVariationsGeneratorProps {
  open: boolean;
  onClose: () => void;
  baseText: string;
  type: 'primary_text' | 'headline' | 'description';
  maxLength?: number;
  onApply: (selectedVariations: string[]) => void;
}

const AIVariationsGenerator: React.FC<AIVariationsGeneratorProps> = ({
  open,
  onClose,
  baseText,
  type,
  maxLength,
  onApply
}) => {
  const [tone, setTone] = useState('professional');
  const [count, setCount] = useState(5);
  const [variations, setVariations] = useState<string[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toneOptions = [
    { value: 'professional', label: 'Professional', description: 'Business-appropriate and trustworthy' },
    { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
    { value: 'urgent', label: 'Urgent', description: 'Action-oriented and compelling' },
    { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
    { value: 'luxury', label: 'Luxury', description: 'Elegant and premium' },
    { value: 'playful', label: 'Playful', description: 'Fun and engaging' }
  ];

  const typeLabels = {
    primary_text: 'Primary Text',
    headline: 'Headline',
    description: 'Description'
  };

  const handleGenerate = async () => {
    if (!baseText || baseText.trim().length === 0) {
      setError('Please enter text to generate variations from');
      return;
    }

    setLoading(true);
    setError(null);
    setVariations([]);
    setSelectedVariations(new Set());

    try {
      const response = await axios.post('/api/ai/generate-variations', {
        baseText: baseText.trim(),
        tone,
        count,
        type,
        maxLength
      });

      if (response.data.success) {
        setVariations(response.data.variations);
        // Pre-select all variations
        setSelectedVariations(new Set(response.data.variations.map((_: string, idx: number) => idx)));
      } else {
        throw new Error(response.data.error || 'Failed to generate variations');
      }
    } catch (err: any) {
      console.error('Error generating AI variations:', err);
      setError(err.response?.data?.message || err.message || 'Failed to generate variations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleVariation = (index: number) => {
    const newSelected = new Set(selectedVariations);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedVariations(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedVariations.size === variations.length) {
      setSelectedVariations(new Set());
    } else {
      setSelectedVariations(new Set(variations.map((_, idx) => idx)));
    }
  };

  const handleApply = () => {
    const selected = Array.from(selectedVariations)
      .sort((a, b) => a - b)
      .map(idx => variations[idx]);

    if (selected.length === 0) {
      setError('Please select at least one variation');
      return;
    }

    onApply(selected);
    onClose();
  };

  const handleClose = () => {
    setVariations([]);
    setSelectedVariations(new Set());
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <AIIcon color="primary" />
            <Typography variant="h6">
              AI {typeLabels[type]} Variations
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Base Text Display */}
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Original {typeLabels[type]}:
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            "{baseText}"
          </Typography>
          {maxLength && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Character limit: {baseText.length}/{maxLength}
            </Typography>
          )}
        </Alert>

        {/* Settings */}
        <Box display="flex" gap={2} mb={3}>
          <FormControl fullWidth>
            <InputLabel>Tone</InputLabel>
            <Select
              value={tone}
              label="Tone"
              onChange={(e) => setTone(e.target.value)}
              disabled={loading}
            >
              {toneOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box>
                    <Typography variant="body2">{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Count</InputLabel>
            <Select
              value={count}
              label="Count"
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={loading}
            >
              {[3, 5, 7, 10].map((num) => (
                <MenuItem key={num} value={num}>{num}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Generate Button */}
        {variations.length === 0 && (
          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AIIcon />}
            onClick={handleGenerate}
            disabled={loading || !baseText}
            sx={{ mb: 2 }}
          >
            {loading ? 'Generating AI Variations...' : 'Generate Variations'}
          </Button>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Variations List */}
        {variations.length > 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight="bold">
                Generated Variations ({selectedVariations.size}/{variations.length} selected)
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  startIcon={<CheckIcon />}
                >
                  {selectedVariations.size === variations.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  size="small"
                  onClick={handleGenerate}
                  startIcon={<RefreshIcon />}
                  disabled={loading}
                >
                  Regenerate
                </Button>
              </Box>
            </Box>

            <List sx={{ maxHeight: '400px', overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {variations.map((variation, index) => (
                <ListItem
                  key={index}
                  disablePadding
                  divider={index < variations.length - 1}
                >
                  <ListItemButton onClick={() => toggleVariation(index)} dense>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedVariations.has(index)}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="body2">{variation}</Typography>
                          <Box display="flex" gap={1} mt={0.5}>
                            <Chip
                              label={`${variation.length} chars`}
                              size="small"
                              color={maxLength && variation.length > maxLength ? 'error' : 'default'}
                            />
                            <Chip
                              label={`Variation ${index + 1}`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                💡 <strong>Tip:</strong> Select the variations you like and click Apply to fill your variation fields.
                You can edit them afterwards if needed.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {variations.length > 0 && (
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={loading || selectedVariations.size === 0}
            startIcon={<CheckIcon />}
          >
            Apply {selectedVariations.size} Variation{selectedVariations.size !== 1 ? 's' : ''}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AIVariationsGenerator;
