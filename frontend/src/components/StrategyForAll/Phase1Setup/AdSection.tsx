import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormControlLabel,
  Radio,
  RadioGroup,
  Alert,
  Paper,
  Divider,
  FormHelperText,
  Button,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  LinearProgress,
  Chip,
  Autocomplete,
  Avatar,
  Checkbox,
  Collapse,
  Stack
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { AdsClick, CloudUpload, Delete, Image, VideoLibrary, ViewCarousel, AutoAwesome } from '@mui/icons-material';
import {
  URL_TYPE_OPTIONS,
  StrategyForAllFormData
} from '../../../types/strategyForAll';
import { useFacebookResources } from '../../../hooks/useFacebookResources';
import axios from 'axios';
import LibrarySelector from '../../LibrarySelector';
import AIVariationsGenerator from '../../shared/AIVariationsGenerator';

// Call-to-Action options
const CALL_TO_ACTION_OPTIONS = [
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'DOWNLOAD', 'GET_QUOTE', 'CONTACT_US',
  'SUBSCRIBE', 'APPLY_NOW', 'BOOK_NOW', 'GET_OFFER', 'GET_SHOWTIMES', 'LISTEN_NOW',
  'WATCH_MORE', 'REQUEST_TIME', 'SEE_MENU', 'OPEN_LINK', 'BUY_NOW', 'BET_NOW',
  'ADD_TO_CART', 'ORDER_NOW', 'PLAY_GAME', 'DONATE', 'GET_DIRECTIONS', 'SEND_MESSAGE', 'CALL_NOW'
];

// Media specifications from Meta
const MEDIA_SPECS = {
  image: {
    formats: ['JPG', 'JPEG', 'PNG', 'GIF', 'BMP'],
    minWidth: 600,
    minHeight: 600,
    maxFileSize: 30 * 1024 * 1024, // 30MB
    aspectRatios: [
      { value: '1:1', label: 'Square (1:1)', width: 1080, height: 1080 },
      { value: '4:5', label: 'Vertical (4:5)', width: 1080, height: 1350 },
      { value: '16:9', label: 'Landscape (16:9)', width: 1920, height: 1080 },
      { value: '9:16', label: 'Stories (9:16)', width: 1080, height: 1920 },
      { value: '2:3', label: 'Portrait (2:3)', width: 1080, height: 1620 }
    ]
  },
  video: {
    formats: ['MP4', 'MOV', 'AVI', 'WMV', 'FLV', 'MKV'],
    minDuration: 1, // seconds
    maxDuration: 241 * 60, // 241 minutes
    maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
    aspectRatios: [
      { value: '1:1', label: 'Square (1:1)' },
      { value: '4:5', label: 'Vertical (4:5)' },
      { value: '16:9', label: 'Landscape (16:9)' },
      { value: '9:16', label: 'Stories (9:16)' },
      { value: '2:3', label: 'Portrait (2:3)' }
    ]
  },
  carousel: {
    minCards: 2,
    maxCards: 10,
    mixedMedia: true
  }
};

const AdSection: React.FC = () => {
  const { control, watch, setValue } = useFormContext<StrategyForAllFormData>();
  const { resources, loading: loadingResources } = useFacebookResources();
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [carouselCards, setCarouselCards] = useState<any[]>([]);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [selectedEditorName, setSelectedEditorName] = useState<string>('');

  // StrategyForAll doesn't support text variations in templates - only local state
  const [enableDynamicVariations, setEnableDynamicVariations] = useState(false);
  const [primaryTextVariations, setPrimaryTextVariations] = useState<string[]>(['']);
  const [headlineVariations, setHeadlineVariations] = useState<string[]>(['']);

  // AI Variations state
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiGenerationType, setAIGenerationType] = useState<'primary_text' | 'headline'>('primary_text');

  const urlType = watch('urlType');
  const mediaType = watch('mediaType');

  // Watch form values for Ad Scraper import
  const formDynamicTextEnabled = watch('dynamicTextEnabled');
  const formPrimaryVariations = watch('primaryTextVariations');
  const formHeadlineVariations = watch('headlineVariations');

  // Sync form data to local state when Ad Scraper import populates the form
  useEffect(() => {
    if (formDynamicTextEnabled !== undefined && formDynamicTextEnabled !== enableDynamicVariations) {
      setEnableDynamicVariations(formDynamicTextEnabled);
      console.log('🔄 [Strategy For All] Synced dynamicTextEnabled from form:', formDynamicTextEnabled);
    }

    if (formPrimaryVariations && formPrimaryVariations.length > 0) {
      setPrimaryTextVariations(formPrimaryVariations);
      console.log('🔄 [Strategy For All] Synced primary text variations from form:', formPrimaryVariations.length);
    }

    if (formHeadlineVariations && formHeadlineVariations.length > 0) {
      setHeadlineVariations(formHeadlineVariations);
      console.log('🔄 [Strategy For All] Synced headline variations from form:', formHeadlineVariations.length);
    }
  }, [formDynamicTextEnabled, formPrimaryVariations, formHeadlineVariations]);

  // Auto-select saved page or first available page
  useEffect(() => {
    if (resources.pages.length > 0 && !watch('facebookPage')) {
      // First try to use the saved selected page
      if (resources.selectedPage) {
        setValue('facebookPage', resources.selectedPage.id);
      } else {
        // Fallback to first available page
        setValue('facebookPage', resources.pages[0].id);
      }
    }
  }, [resources, setValue, watch]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);

    // Validate files based on media type
    if (mediaType === 'single_image' || mediaType === 'single_video') {
      if (fileArray.length > 1) {
        alert('Please select only one file for single media');
        return;
      }
    }

    if (mediaType === 'carousel') {
      if (fileArray.length > MEDIA_SPECS.carousel.maxCards) {
        alert(`Maximum ${MEDIA_SPECS.carousel.maxCards} files allowed for carousel`);
        return;
      }
    }

    // Validate file sizes and formats
    for (const file of fileArray) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (mediaType === 'single_image' && !isImage) {
        alert('Please select an image file');
        return;
      }

      if (mediaType === 'single_video' && !isVideo) {
        alert('Please select a video file');
        return;
      }

      if (isImage && file.size > MEDIA_SPECS.image.maxFileSize) {
        alert(`Image ${file.name} exceeds maximum size of 30MB`);
        return;
      }

      if (isVideo && file.size > MEDIA_SPECS.video.maxFileSize) {
        alert(`Video ${file.name} exceeds maximum size of 4GB`);
        return;
      }
    }

    console.log('📤 Regular file upload (not from library)');

    setMediaFiles(fileArray);
    setValue('mediaFiles', fileArray);

    // Clear editor name since this is a regular upload, not from library
    setSelectedEditorName('');
    setValue('editorName', undefined);
    console.log('🗑️ Cleared editor name (regular upload)');

    // Also set specific fields based on media type
    if (mediaType === 'single_image' && fileArray[0]) {
      setValue('image', fileArray[0]);
    } else if (mediaType === 'single_video' && fileArray[0]) {
      setValue('video', fileArray[0]);
    } else if (mediaType === 'carousel') {
      setValue('images', fileArray);
    }
  };

  const handleLibrarySelect = (files: File[], editorName: string) => {
    console.log('📝 Library files selected with editor:', editorName);
    console.log('📦 Number of files:', files.length);

    setSelectedEditorName(editorName);

    // CRITICAL: Store editor name AND library flag in form data so it gets sent to backend
    setValue('editorName', editorName);
    setValue('fromLibrary', true); // Flag to indicate files are from library
    console.log('✅ Editor name stored in form:', editorName);
    console.log('✅ FromLibrary flag set: true');

    setMediaFiles(files);
    setValue('mediaFiles', files);

    if (mediaType === 'single_image' && files[0]) {
      setValue('image', files[0]);
      console.log('📸 Single image set:', files[0].name);
    } else if (mediaType === 'single_video' && files[0]) {
      setValue('video', files[0]);
      console.log('🎥 Single video set:', files[0].name);
    } else if (mediaType === 'carousel') {
      setValue('images', files);
      console.log('🎠 Carousel images set:', files.map(f => f.name).join(', '));
    }
  };

  const removeMediaFile = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
    setValue('mediaFiles', newFiles);

    // Clear specific fields if all files removed
    if (newFiles.length === 0) {
      setValue('image', undefined);
      setValue('video', undefined);
      setValue('images', []);
      setSelectedEditorName(''); // Clear editor name when all files removed
    } else {
      // Update specific fields based on media type
      if (mediaType === 'single_image' && newFiles[0]) {
        setValue('image', newFiles[0]);
      } else if (mediaType === 'single_video' && newFiles[0]) {
        setValue('video', newFiles[0]);
      } else if (mediaType === 'carousel') {
        setValue('images', newFiles);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // AI Variations handlers
  const handleOpenAIGenerator = (type: 'primary_text' | 'headline') => {
    setAIGenerationType(type);
    setShowAIGenerator(true);
  };

  const handleApplyAIVariations = (selectedVariations: string[]) => {
    if (aiGenerationType === 'primary_text') {
      // Apply to primary text variations
      const newVariations = [...primaryTextVariations];
      selectedVariations.forEach((varText, idx) => {
        if (idx < 5) {
          newVariations[idx] = varText;
        }
      });
      setPrimaryTextVariations(newVariations);
    } else if (aiGenerationType === 'headline') {
      // Apply to headline variations
      const newVariations = [...headlineVariations];
      selectedVariations.forEach((varText, idx) => {
        if (idx < 5) {
          newVariations[idx] = varText;
        }
      });
      setHeadlineVariations(newVariations);
    }
    setShowAIGenerator(false);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AdsClick sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">Ad Creative</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Facebook Page Selection */}
        <Box sx={{ width: '100%' }}>
          <Controller
            name="facebookPage"
            control={control}
            rules={{ required: 'Facebook Page is required' }}
            render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
              <Autocomplete
                {...field}
                fullWidth
                disabled={loadingResources || resources.pages.length === 0}
                options={resources.pages}
                value={resources.pages.find(page => page.id === value) || null}
                onChange={(_, newValue) => {
                  onChange(newValue?.id || '');
                }}
                getOptionLabel={(option) => option.name || ''}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                renderOption={(props, option) => {
                  const pictureUrl = typeof option.picture === 'string'
                    ? option.picture
                    : option.picture?.data?.url;

                  return (
                    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {pictureUrl && (
                        <Avatar src={pictureUrl} sx={{ width: 24, height: 24 }} />
                      )}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1">{option.name}</Typography>
                      {option.category && (
                        <Typography variant="caption" color="text.secondary">
                          {option.category}
                        </Typography>
                      )}
                    </Box>
                    {resources.selectedPage?.id === option.id && (
                      <Chip label="Saved" size="small" color="primary" />
                    )}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Facebook Page"
                    placeholder="Search and select a page..."
                    error={!!error}
                    helperText={
                      error?.message ||
                      (!loadingResources && resources.pages.length === 0 && 'Please connect a Facebook Page in your account settings') ||
                      (resources.selectedPage && `Currently using saved page: ${resources.selectedPage.name}`)
                    }
                  />
                )}
              />
            )}
          />
        </Box>

        {/* Instagram Account (Optional) */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="instagramAccount"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Instagram Account (Optional)"
                placeholder="@username"
                helperText="Link your Instagram account to show ads on Instagram"
              />
            )}
          />
        </Box>

        <Box sx={{ width: "100%" }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Destination
          </Typography>
        </Box>

        {/* URL Type */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="urlType"
            control={control}
            defaultValue="website"
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Destination Type</InputLabel>
                <Select {...field} label="Destination Type">
                  {URL_TYPE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Where users will go when they interact with your ad
                </FormHelperText>
              </FormControl>
            )}
          />
        </Box>

        {/* URL Input (conditional) */}
        {urlType !== 'none' && urlType !== 'lead_gen' && (
          <Box sx={{ width: "100%" }}>
            <Controller
              name="url"
              control={control}
              rules={{
                required: (urlType && !['none', 'lead_gen'].includes(urlType as string)) ? 'URL is required' : false,
                pattern: urlType === 'website' ? {
                  value: /^https?:\/\/.+/,
                  message: 'Please enter a valid URL starting with http:// or https://'
                } : undefined
              }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={
                    urlType === 'website' ? 'Website URL' :
                    urlType === 'app_deeplink' ? 'App Deep Link' :
                    urlType === 'messenger' ? 'Messenger Link' :
                    urlType === 'whatsapp' ? 'WhatsApp Number' :
                    urlType === 'facebook_event' ? 'Facebook Event URL' :
                    'Destination URL'
                  }
                  placeholder={
                    urlType === 'website' ? 'https://example.com' :
                    urlType === 'app_deeplink' ? 'myapp://page/123' :
                    urlType === 'whatsapp' ? '+1234567890' :
                    'Enter destination'
                  }
                  error={!!error}
                  helperText={error?.message}
                />
              )}
            />
          </Box>
        )}

        {/* Lead Form Notice */}
        {urlType === 'lead_gen' && (
          <Box sx={{ width: "100%" }}>
            <Alert severity="info">
              Lead forms will be created automatically based on your campaign settings. Users will see a form directly in Facebook/Instagram.
            </Alert>
          </Box>
        )}

        {/* No Destination Notice */}
        {urlType === 'none' && (
          <Box sx={{ width: "100%" }}>
            <Alert severity="warning">
              No destination selected. Users will only be able to engage with your ad (like, comment, share) but won't be directed anywhere.
            </Alert>
          </Box>
        )}

        <Box sx={{ width: "100%" }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Media
          </Typography>
        </Box>

        {/* Media Type Selection */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="mediaType"
            control={control}
            defaultValue="single_image"
            render={({ field }) => (
              <FormControl>
                <RadioGroup {...field} row>
                  <FormControlLabel
                    value="single_image"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Image sx={{ mr: 1 }} />
                        Single Image
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="single_video"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <VideoLibrary sx={{ mr: 1 }} />
                        Single Video
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="carousel"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ViewCarousel sx={{ mr: 1 }} />
                        Carousel (2-10 cards)
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            )}
          />
        </Box>

        {/* Media Specifications */}
        <Box sx={{ width: "100%" }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {mediaType === 'single_image' ? 'Image' : mediaType === 'single_video' ? 'Video' : 'Carousel'} Specifications:
            </Typography>
            {mediaType === 'single_image' && (
              <Box>
                • Formats: {MEDIA_SPECS.image.formats.join(', ')}<br />
                • Minimum: {MEDIA_SPECS.image.minWidth}x{MEDIA_SPECS.image.minHeight}px<br />
                • Maximum file size: 30MB<br />
                • Recommended aspect ratios: 1:1, 4:5, 16:9, 9:16
              </Box>
            )}
            {mediaType === 'single_video' && (
              <Box>
                • Formats: {MEDIA_SPECS.video.formats.join(', ')}<br />
                • Duration: {MEDIA_SPECS.video.minDuration} sec - {MEDIA_SPECS.video.maxDuration / 60} minutes<br />
                • Maximum file size: 4GB<br />
                • Recommended aspect ratios: 1:1, 4:5, 16:9, 9:16
              </Box>
            )}
            {mediaType === 'carousel' && (
              <Box>
                • {MEDIA_SPECS.carousel.minCards}-{MEDIA_SPECS.carousel.maxCards} cards<br />
                • Mix of images and videos supported<br />
                • Each card follows individual image/video specifications
              </Box>
            )}
          </Alert>
        </Box>

        {/* File Upload */}
        <Box sx={{ width: "100%" }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <input
                accept={
                  mediaType === 'single_image' ? 'image/*' :
                  mediaType === 'single_video' ? 'video/*' :
                  'image/*,video/*'
                }
                style={{ display: 'none' }}
                id="media-file-upload"
                type="file"
                multiple={mediaType === 'carousel'}
                onChange={handleFileUpload}
              />
              <label htmlFor="media-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  fullWidth
                  sx={{ py: 2 }}
                >
                  Upload from Computer
                </Button>
              </label>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Image />}
                fullWidth
                sx={{ py: 2 }}
                onClick={() => setShowLibraryModal(true)}
              >
                Select from Library
              </Button>
            </Box>
          </Box>
          {selectedEditorName && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Selected from library: {selectedEditorName} (will be added to ad name)
            </Alert>
          )}
        </Box>

        {/* Media Preview */}
        {mediaFiles.length > 0 && (
          <Box sx={{ width: "100%" }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {mediaFiles.map((file, index) => (
                <Box sx={{ width: { xs: '100%', sm: '48%', md: '31%' } }} key={index}>
                  <Card>
                    {file.type.startsWith('image/') ? (
                      <CardMedia
                        component="img"
                        height="200"
                        image={URL.createObjectURL(file)}
                        alt={file.name}
                      />
                    ) : (
                      <CardMedia
                        component="video"
                        height="200"
                        src={URL.createObjectURL(file)}
                        controls
                      />
                    )}
                    <CardContent>
                      <Typography variant="body2" noWrap>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeMediaFile(index)}
                      >
                        <Delete />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <Box sx={{ width: "100%" }}>
            <Box sx={{ width: '100%' }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                Uploading... {uploadProgress}%
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={{ width: "100%" }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Ad Copy
          </Typography>
        </Box>

        {/* Primary Text */}
        <Box sx={{ width: "100%" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" fontWeight="medium">Primary Text</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutoAwesome />}
              onClick={() => handleOpenAIGenerator('primary_text')}
              disabled={!watch('primaryText') || watch('primaryText').trim().length === 0}
              sx={{ ml: 2 }}
            >
              Generate with AI
            </Button>
          </Box>
          <Controller
            name="primaryText"
            control={control}
            rules={{
              required: 'Primary text is required',
              maxLength: { value: 2500, message: 'Primary text must be 2500 characters or less' }
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={4}
                placeholder="Main text that appears above your ad"
                error={!!error}
                helperText={error?.message || `${field.value?.length || 0}/2500 characters (recommended: 125 for optimal display)`}
              />
            )}
          />
        </Box>

        {/* Headline */}
        <Box sx={{ width: "100%" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" fontWeight="medium">Headline</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutoAwesome />}
              onClick={() => handleOpenAIGenerator('headline')}
              disabled={!watch('headline') || watch('headline').trim().length === 0}
              sx={{ ml: 2 }}
            >
              Generate with AI
            </Button>
          </Box>
          <Controller
            name="headline"
            control={control}
            rules={{
              required: 'Headline is required',
              maxLength: { value: 255, message: 'Headline must be 255 characters or less' }
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                placeholder="Short, attention-grabbing headline"
                error={!!error}
                helperText={error?.message || `${field.value?.length || 0}/255 characters`}
              />
            )}
          />
        </Box>

        {/* Description */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="description"
            control={control}
            rules={{
              maxLength: { value: 255, message: 'Description must be 255 characters or less' }
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="Description (Optional)"
                placeholder="Additional context below headline"
                error={!!error}
                helperText={error?.message || `${field.value?.length || 0}/255 characters`}
              />
            )}
          />
        </Box>

        {/* Dynamic Text Variations */}
        <Box sx={{ width: "100%", mt: 2 }}>
          <Paper sx={{ p: 2, bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.main' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={enableDynamicVariations}
                  onChange={(e) => setEnableDynamicVariations(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Enable Dynamic Text Variations (Optional)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Create up to 5 variations for Primary Text and Headlines. Facebook will test combinations to find the best performers.
                  </Typography>
                </Box>
              }
            />

            <Collapse in={enableDynamicVariations}>
              <Box sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  💡 Facebook's Dynamic Creative will automatically test different combinations of your text variations to optimize performance.
                </Alert>

                {/* Primary Text Variations */}
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                  Primary Text Variations (up to 5)
                </Typography>
                <Stack spacing={1.5}>
                  {primaryTextVariations.map((text, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        label={`Variation ${index + 1}`}
                        placeholder="Enter alternative primary text..."
                        value={text}
                        onChange={(e) => {
                          const newVariations = [...primaryTextVariations];
                          newVariations[index] = e.target.value;
                          setPrimaryTextVariations(newVariations);
                        }}
                        helperText={`${text.length}/2500 characters`}
                      />
                      {index > 0 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const newVariations = primaryTextVariations.filter((_, i) => i !== index);
                            setPrimaryTextVariations(newVariations);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  {primaryTextVariations.length < 5 && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AdsClick />}
                      onClick={() => setPrimaryTextVariations([...primaryTextVariations, ''])}
                    >
                      Add Primary Text Variation
                    </Button>
                  )}
                </Stack>

                {/* Headline Variations */}
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                  Headline Variations (up to 5)
                </Typography>
                <Stack spacing={1.5}>
                  {headlineVariations.map((headline, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        size="small"
                        label={`Variation ${index + 1}`}
                        placeholder="Enter alternative headline..."
                        value={headline}
                        onChange={(e) => {
                          const newVariations = [...headlineVariations];
                          newVariations[index] = e.target.value;
                          setHeadlineVariations(newVariations);
                        }}
                        helperText={`${headline.length}/255 characters`}
                      />
                      {index > 0 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const newVariations = headlineVariations.filter((_, i) => i !== index);
                            setHeadlineVariations(newVariations);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  {headlineVariations.length < 5 && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AdsClick />}
                      onClick={() => setHeadlineVariations([...headlineVariations, ''])}
                    >
                      Add Headline Variation
                    </Button>
                  )}
                </Stack>
              </Box>
            </Collapse>
          </Paper>
        </Box>

        {/* Call to Action */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="callToAction"
            control={control}
            defaultValue="LEARN_MORE"
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Call to Action</InputLabel>
                <Select {...field} label="Call to Action">
                  {CALL_TO_ACTION_OPTIONS.map(cta => (
                    <MenuItem key={cta} value={cta}>
                      {cta.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Button text that encourages people to take action
                </FormHelperText>
              </FormControl>
            )}
          />
        </Box>

        {/* Display Link (Optional) */}
        {urlType === 'website' && (
          <Box sx={{ width: "100%" }}>
            <Controller
              name="displayLink"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Display Link (Optional)"
                  placeholder="example.com"
                  helperText="Clean URL shown in the ad (without http://)"
                />
              )}
            />
          </Box>
        )}

        <Box sx={{ width: "100%" }}>
          <Alert severity="success">
            Your ad creative is ready! The ad will be created with the media and copy you've provided. After creation, you'll be able to get the Post ID for duplication.
          </Alert>
        </Box>
      </Box>

      {/* Library Selector Modal */}
      <LibrarySelector
        open={showLibraryModal}
        mediaType={mediaType || 'single_image'}
        onSelect={handleLibrarySelect}
        onClose={() => setShowLibraryModal(false)}
      />

      {/* AI Variations Generator Modal */}
      <AIVariationsGenerator
        open={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        baseText={aiGenerationType === 'primary_text' ? watch('primaryText') || '' : watch('headline') || ''}
        type={aiGenerationType}
        maxLength={aiGenerationType === 'primary_text' ? 125 : 40}
        onApply={handleApplyAIVariations}
      />
    </Paper>
  );
};

export default AdSection;