import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Button,
  Checkbox
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { AdVariation, OriginalAdData } from '../../../types/adDuplication';

interface VariationFormProps {
  variationNumber: number;
  variation: AdVariation;
  originalAdData?: OriginalAdData;
  onChange: (updatedVariation: AdVariation) => void;
}

const VariationForm: React.FC<VariationFormProps> = ({
  variationNumber,
  variation,
  originalAdData,
  onChange
}) => {
  const [mediaUploadMode, setMediaUploadMode] = useState<'original' | 'new'>('original');

  // Extract original values from originalAdData
  const getOriginalValue = (field: string): string => {
    if (!originalAdData?.creative?.object_story_spec) return '';

    const spec = originalAdData.creative.object_story_spec;
    const linkData = spec.link_data;
    const videoData = spec.video_data;

    switch (field) {
      case 'primaryText':
        return linkData?.message || videoData?.message || '';
      case 'headline':
        return linkData?.name || videoData?.title || '';
      case 'description':
        return linkData?.description || videoData?.description || '';
      case 'websiteUrl':
        return linkData?.link || videoData?.call_to_action?.value?.link || '';
      case 'displayLink':
        return ''; // Not stored in original data
      case 'callToAction':
        return linkData?.call_to_action?.type || videoData?.call_to_action?.type || 'LEARN_MORE';
      default:
        return '';
    }
  };

  const handleUseOriginalToggle = (useOriginal: boolean) => {
    onChange({
      ...variation,
      useOriginal,
      // Clear custom values if switching to original
      ...(useOriginal ? {
        primaryText: undefined,
        headline: undefined,
        description: undefined,
        displayLink: undefined,
        websiteUrl: undefined,
        callToAction: undefined,
        imageUrl: undefined,
        videoId: undefined
      } : {})
    });
  };

  const handleFieldChange = (field: string, value: any) => {
    onChange({
      ...variation,
      [field]: value,
      useOriginal: false // Automatically switch to custom when editing
    });
  };

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Placeholder for file upload logic
    // In production, this would upload to your media endpoint
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      // TODO: Implement file upload and get URL/ID back
    }
  };

  return (
    <Box>
      {/* Use Original Toggle */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'background.default' }}>
        <Typography variant="subtitle2" gutterBottom>
          Variation {variationNumber} Settings
        </Typography>
        <RadioGroup
          value={variation.useOriginal ? 'original' : 'custom'}
          onChange={(e) => handleUseOriginalToggle(e.target.value === 'original')}
        >
          <FormControlLabel
            value="original"
            control={<Radio />}
            label="Use Original Ad Data (No Changes)"
          />
          <FormControlLabel
            value="custom"
            control={<Radio />}
            label="Enter Custom Values"
          />
        </RadioGroup>
      </Paper>

      {/* Custom Fields (only show if not using original) */}
      {!variation.useOriginal && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Media Upload Section */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Creative
            </Typography>
            <RadioGroup
              value={mediaUploadMode}
              onChange={(e) => setMediaUploadMode(e.target.value as 'original' | 'new')}
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                value="original"
                control={<Radio />}
                label="Keep Original Media"
              />
              <FormControlLabel
                value="new"
                control={<Radio />}
                label="Upload New Media"
              />
            </RadioGroup>

            {mediaUploadMode === 'new' && (
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                >
                  Upload Image/Video
                  <input
                    type="file"
                    hidden
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                  />
                </Button>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={variation.applyToRemaining || false}
                      onChange={(e) => handleFieldChange('applyToRemaining', e.target.checked)}
                    />
                  }
                  label="Apply this media to all remaining variations"
                  sx={{ mt: 1 }}
                />
              </Box>
            )}
          </Paper>

          {/* Text Fields */}
          <TextField
            label="Primary Text"
            multiline
            rows={3}
            fullWidth
            value={variation.primaryText || ''}
            onChange={(e) => handleFieldChange('primaryText', e.target.value)}
            placeholder={`Original: ${getOriginalValue('primaryText')}`}
            helperText={`Original value: ${getOriginalValue('primaryText').substring(0, 50)}${getOriginalValue('primaryText').length > 50 ? '...' : ''}`}
          />

          <TextField
            label="Headline"
            fullWidth
            value={variation.headline || ''}
            onChange={(e) => handleFieldChange('headline', e.target.value)}
            placeholder={`Original: ${getOriginalValue('headline')}`}
            helperText={`Original value: ${getOriginalValue('headline')}`}
          />

          <TextField
            label="Description"
            multiline
            rows={2}
            fullWidth
            value={variation.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder={`Original: ${getOriginalValue('description')}`}
            helperText={`Original value: ${getOriginalValue('description')}`}
          />

          <TextField
            label="Website URL"
            fullWidth
            value={variation.websiteUrl || ''}
            onChange={(e) => handleFieldChange('websiteUrl', e.target.value)}
            placeholder={`Original: ${getOriginalValue('websiteUrl')}`}
            helperText="The destination URL for the ad"
          />

          <TextField
            label="Display Link"
            fullWidth
            value={variation.displayLink || ''}
            onChange={(e) => handleFieldChange('displayLink', e.target.value)}
            placeholder="example.com/special-offer"
            helperText="Optional vanity URL shown in the ad"
          />

          <FormControl fullWidth>
            <InputLabel>Call to Action</InputLabel>
            <Select
              value={variation.callToAction || getOriginalValue('callToAction') || 'LEARN_MORE'}
              onChange={(e) => handleFieldChange('callToAction', e.target.value)}
              label="Call to Action"
            >
              <MenuItem value="LEARN_MORE">Learn More</MenuItem>
              <MenuItem value="SIGN_UP">Sign Up</MenuItem>
              <MenuItem value="DOWNLOAD">Download</MenuItem>
              <MenuItem value="BOOK_TRAVEL">Book Now</MenuItem>
              <MenuItem value="SHOP_NOW">Shop Now</MenuItem>
              <MenuItem value="GET_QUOTE">Get Quote</MenuItem>
              <MenuItem value="APPLY_NOW">Apply Now</MenuItem>
              <MenuItem value="CONTACT_US">Contact Us</MenuItem>
              <MenuItem value="SUBSCRIBE">Subscribe</MenuItem>
              <MenuItem value="REQUEST_TIME">Request Time</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Show preview of original values when using original */}
      {variation.useOriginal && originalAdData && (
        <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
          <Typography variant="subtitle2" gutterBottom>
            Original Ad Preview
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2">
              <strong>Primary Text:</strong> {getOriginalValue('primaryText')}
            </Typography>
            <Typography variant="body2">
              <strong>Headline:</strong> {getOriginalValue('headline')}
            </Typography>
            <Typography variant="body2">
              <strong>Description:</strong> {getOriginalValue('description')}
            </Typography>
            <Typography variant="body2">
              <strong>Website URL:</strong> {getOriginalValue('websiteUrl')}
            </Typography>
            <Typography variant="body2">
              <strong>CTA:</strong> {getOriginalValue('callToAction')}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default VariationForm;
