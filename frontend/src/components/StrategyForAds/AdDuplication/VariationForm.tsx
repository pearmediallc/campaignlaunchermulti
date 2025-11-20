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
  Checkbox,
  CircularProgress,
  Alert
} from '@mui/material';
import { CloudUpload, CheckCircle, PhotoLibrary, AutoAwesome } from '@mui/icons-material';
import { AdVariation, OriginalAdData } from '../../../types/adDuplication';
import LibrarySelector from '../../LibrarySelector';
import AIVariationsGenerator from '../../shared/AIVariationsGenerator';

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
  // Initialize media mode based on variation data
  const getInitialMediaMode = (): 'original' | 'new' | 'library' => {
    if (variation.imageHash || variation.videoId || variation.videoHash) {
      return 'new'; // User has uploaded media
    }
    if (variation.editorName) {
      return 'library'; // User selected from library
    }
    return 'original'; // Default to original
  };

  const [mediaUploadMode, setMediaUploadMode] = useState<'original' | 'new' | 'library'>(getInitialMediaMode());
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>(() => {
    // Initialize filename if media was already uploaded
    if (variation.imageHash) return `Image: ${variation.imageHash.substring(0, 10)}...`;
    if (variation.videoId || variation.videoHash) return `Video: ${(variation.videoId || variation.videoHash || '').substring(0, 10)}...`;
    return '';
  });
  const [uploadError, setUploadError] = useState<string>('');
  const [showLibrarySelector, setShowLibrarySelector] = useState(false);
  const [selectedEditorName, setSelectedEditorName] = useState<string>('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiGenerationType, setAIGenerationType] = useState<'primary_text' | 'headline'>('primary_text');

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
    const updatedVariation = {
      ...variation,
      [field]: value,
      useOriginal: false // Automatically switch to custom when editing
    };

    // Log the field change for debugging
    console.log(`📝 Variation ${variation.variationNumber} field change:`, {
      field,
      newValue: value,
      fullVariation: updatedVariation,
      useOriginalMedia: updatedVariation.useOriginalMedia,
      hasImageHash: !!updatedVariation.imageHash,
      hasVideoId: !!updatedVariation.videoId,
      primaryTextVariations: updatedVariation.primaryTextVariations,
      headlineVariations: updatedVariation.headlineVariations
    });

    onChange(updatedVariation);
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    setUploadError('');

    try {
      console.log('📤 Uploading media for variation:', file.name);

      const formData = new FormData();
      formData.append('media', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5002/api'}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Media uploaded successfully:', result.data);
        setUploadedFileName(file.name);

        // Ensure we're in 'new' mode after upload
        setMediaUploadMode('new');

        // Update variation with uploaded media IDs
        const updatedVariation: any = {
          ...variation,
          useOriginalMedia: false // Explicitly mark as NOT using original
        };

        if (result.data.type === 'video') {
          updatedVariation.videoId = result.data.videoId;
          console.log('  💾 Saved videoId to variation:', result.data.videoId);
        } else if (result.data.type === 'image') {
          updatedVariation.imageHash = result.data.imageHash;
          console.log('  💾 Saved imageHash to variation:', result.data.imageHash);
        }

        console.log(`📊 Complete variation ${variation.variationNumber} after media upload:`, {
          variationNumber: updatedVariation.variationNumber,
          adSetIndex: updatedVariation.adSetIndex,
          useOriginalMedia: updatedVariation.useOriginalMedia,
          imageHash: updatedVariation.imageHash,
          videoId: updatedVariation.videoId,
          primaryText: updatedVariation.primaryText,
          headline: updatedVariation.headline,
          primaryTextVariations: updatedVariation.primaryTextVariations,
          headlineVariations: updatedVariation.headlineVariations
        });

        onChange(updatedVariation);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Media upload error:', error);
      setUploadError(error.message || 'Failed to upload media');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleLibrarySelect = async (files: File[], editorName: string) => {
    console.log('📚 Files selected from Creative Library:', files.length);
    console.log('👤 Editor:', editorName);

    if (files.length === 0) return;

    setUploadingMedia(true);
    setUploadError('');
    setSelectedEditorName(editorName);

    try {
      const file = files[0]; // For variations, we only use single files
      console.log('📤 Uploading Creative Library file for variation:', file.name);

      const formData = new FormData();
      formData.append('media', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5002/api'}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Creative Library media uploaded successfully:', result.data);
        setUploadedFileName(`${file.name} (${editorName})`);

        // Ensure we're in 'library' mode after selection
        setMediaUploadMode('library');

        // Update variation with uploaded media IDs and editor name
        const updatedVariation: any = {
          ...variation,
          useOriginalMedia: false,
          editorName: editorName // Store editor name for ad naming
        };

        if (result.data.type === 'video') {
          updatedVariation.videoId = result.data.videoId;
          console.log('  💾 Saved videoId to variation:', result.data.videoId);
        } else if (result.data.type === 'image') {
          updatedVariation.imageHash = result.data.imageHash;
          console.log('  💾 Saved imageHash to variation:', result.data.imageHash);
        }

        console.log(`📚 Creative Library media selected for variation ${variation.variationNumber}:`, {
          editorName,
          updatedVariation
        });

        onChange(updatedVariation);
        setShowLibrarySelector(false);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Creative Library media upload error:', error);
      setUploadError(error.message || 'Failed to upload Creative Library media');
    } finally {
      setUploadingMedia(false);
    }
  };

  // AI Variations Handlers
  const handleOpenAIGenerator = (type: 'primary_text' | 'headline') => {
    setAIGenerationType(type);
    setShowAIGenerator(true);
  };

  const handleApplyAIVariations = (selectedVariations: string[]) => {
    if (aiGenerationType === 'primary_text') {
      // Apply variations to primary text fields
      const newPrimaryVariations = [...(variation.primaryTextVariations || Array(5).fill(''))];
      selectedVariations.forEach((varText, idx) => {
        if (idx < 5) {
          newPrimaryVariations[idx] = varText;
        }
      });
      handleFieldChange('primaryTextVariations', newPrimaryVariations);
    } else if (aiGenerationType === 'headline') {
      // Apply variations to headline fields
      const newHeadlineVariations = [...(variation.headlineVariations || Array(5).fill(''))];
      selectedVariations.forEach((varText, idx) => {
        if (idx < 5) {
          newHeadlineVariations[idx] = varText;
        }
      });
      handleFieldChange('headlineVariations', newHeadlineVariations);
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
              onChange={(e) => {
                const newMode = e.target.value as 'original' | 'new' | 'library';
                setMediaUploadMode(newMode);

                // When switching to original mode, set useOriginalMedia to true
                if (newMode === 'original') {
                  const updatedVariation = {
                    ...variation,
                    useOriginalMedia: true,
                    imageHash: undefined,
                    videoId: undefined,
                    videoHash: undefined
                  };

                  console.log(`🔄 Switching to original media for variation ${variation.variationNumber}:`, {
                    updatedVariation,
                    preservedText: updatedVariation.primaryText,
                    preservedHeadline: updatedVariation.headline,
                    preservedTextVariations: updatedVariation.primaryTextVariations,
                    preservedHeadlineVariations: updatedVariation.headlineVariations
                  });

                  onChange(updatedVariation);
                  setUploadedFileName('');
                }
              }}
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
                label="Upload from Computer"
              />
              <FormControlLabel
                value="library"
                control={<Radio />}
                label="Select from Creative Library"
              />
            </RadioGroup>

            {mediaUploadMode === 'new' && (
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={uploadingMedia ? <CircularProgress size={20} /> : uploadedFileName ? <CheckCircle color="success" /> : <CloudUpload />}
                  fullWidth
                  disabled={uploadingMedia}
                >
                  {uploadingMedia ? 'Uploading...' : uploadedFileName ? `Uploaded: ${uploadedFileName}` : 'Upload Image/Video'}
                  <input
                    type="file"
                    hidden
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                  />
                </Button>

                {uploadError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {uploadError}
                  </Alert>
                )}

                {uploadedFileName && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    ✅ Media uploaded successfully! This variation will use your uploaded media instead of the original.
                  </Alert>
                )}

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

            {mediaUploadMode === 'library' && (
              <Box>
                <Button
                  variant="outlined"
                  onClick={() => setShowLibrarySelector(true)}
                  startIcon={uploadingMedia ? <CircularProgress size={20} /> : uploadedFileName ? <CheckCircle color="success" /> : <PhotoLibrary />}
                  fullWidth
                  disabled={uploadingMedia}
                >
                  {uploadingMedia ? 'Processing...' : uploadedFileName ? `Selected: ${uploadedFileName}` : 'Browse Creative Library'}
                </Button>

                {uploadError && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {uploadError}
                  </Alert>
                )}

                {uploadedFileName && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    ✅ Media selected from Creative Library! This variation will use media from {selectedEditorName}.
                  </Alert>
                )}

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

          {/* Text Fields with Variations */}
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                Primary Text & Variations
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoAwesome />}
                onClick={() => handleOpenAIGenerator('primary_text')}
                disabled={!variation.primaryText || variation.primaryText.trim().length === 0}
                sx={{ ml: 2 }}
              >
                Generate with AI
              </Button>
            </Box>
            <TextField
              label="Primary Text (Main)"
              multiline
              rows={3}
              fullWidth
              value={variation.primaryText || ''}
              onChange={(e) => handleFieldChange('primaryText', e.target.value)}
              placeholder={`Original: ${getOriginalValue('primaryText')}`}
              helperText="This is your main primary text. Fill this first, then use AI to generate variations."
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
              + Add Text Variations (Optional - Facebook will test combinations)
            </Typography>
            {[0, 1, 2, 3, 4].map((index) => (
              <TextField
                key={`primary-var-${index}`}
                label={`Primary Text Variation ${index + 1}`}
                multiline
                rows={2}
                fullWidth
                value={variation.primaryTextVariations?.[index] || ''}
                onChange={(e) => {
                  const newVariations = [...(variation.primaryTextVariations || Array(5).fill(''))];
                  newVariations[index] = e.target.value;
                  handleFieldChange('primaryTextVariations', newVariations);
                }}
                placeholder={`Optional variation ${index + 1}`}
                sx={{ mb: 1 }}
              />
            ))}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                Headline & Variations
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoAwesome />}
                onClick={() => handleOpenAIGenerator('headline')}
                disabled={!variation.headline || variation.headline.trim().length === 0}
                sx={{ ml: 2 }}
              >
                Generate with AI
              </Button>
            </Box>
            <TextField
              label="Headline (Main)"
              fullWidth
              value={variation.headline || ''}
              onChange={(e) => handleFieldChange('headline', e.target.value)}
              placeholder={`Original: ${getOriginalValue('headline')}`}
              helperText="This is your main headline. Fill this first, then use AI to generate variations."
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
              + Add Headline Variations (Optional - Facebook will test combinations)
            </Typography>
            {[0, 1, 2, 3, 4].map((index) => (
              <TextField
                key={`headline-var-${index}`}
                label={`Headline Variation ${index + 1}`}
                fullWidth
                value={variation.headlineVariations?.[index] || ''}
                onChange={(e) => {
                  const newVariations = [...(variation.headlineVariations || Array(5).fill(''))];
                  newVariations[index] = e.target.value;
                  handleFieldChange('headlineVariations', newVariations);
                }}
                placeholder={`Optional variation ${index + 1}`}
                sx={{ mb: 1 }}
              />
            ))}

            {((variation.primaryTextVariations?.filter(t => t?.trim()).length || 0) > 0 ||
              (variation.headlineVariations?.filter(h => h?.trim()).length || 0) > 0) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>🎯 Auto-Optimization:</strong> Facebook will test {
                    Math.max(1, (variation.primaryTextVariations?.filter(t => t?.trim()).length || 0) + (variation.primaryText?.trim() ? 1 : 0)) *
                    Math.max(1, (variation.headlineVariations?.filter(h => h?.trim()).length || 0) + (variation.headline?.trim() ? 1 : 0))
                  } combinations and automatically show the best performers.
                </Typography>
              </Alert>
            )}
          </Paper>

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

      {/* Library Selector Modal */}
      <LibrarySelector
        open={showLibrarySelector}
        mediaType="single_image" // Variations use single images/videos
        onSelect={handleLibrarySelect}
        onClose={() => setShowLibrarySelector(false)}
      />

      {/* AI Variations Generator Modal */}
      <AIVariationsGenerator
        open={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        baseText={aiGenerationType === 'primary_text' ? variation.primaryText || '' : variation.headline || ''}
        type={aiGenerationType}
        maxLength={aiGenerationType === 'primary_text' ? 125 : 40}
        onApply={handleApplyAIVariations}
      />
    </Box>
  );
};

export default VariationForm;
