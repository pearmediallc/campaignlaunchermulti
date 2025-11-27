import React, { useState } from 'react';
import { Box, Button, Stack, Alert } from '@mui/material';
import { CloudUpload, VideoLibrary, AspectRatio } from '@mui/icons-material';
import VideoThumbnailSelector from './VideoThumbnailSelector';
import AspectRatioSelector from './AspectRatioSelector';

interface MediaUploadEnhancedProps {
  mediaType: 'single_image' | 'single_video' | 'carousel';
  videoFile?: File | null;
  onThumbnailChange: (thumbnail: File | null, frameIndex?: number) => void;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  disabled?: boolean;
}

/**
 * MediaUploadEnhanced
 * Shows thumbnail selector button for videos and aspect ratio selector for all media
 */
const MediaUploadEnhanced: React.FC<MediaUploadEnhancedProps> = ({
  mediaType,
  videoFile,
  onThumbnailChange,
  aspectRatio,
  onAspectRatioChange,
  disabled = false
}) => {
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);

  const handleThumbnailSelected = (thumbnail: File | null, frameIndex?: number) => {
    onThumbnailChange(thumbnail, frameIndex);
    setShowThumbnailSelector(false);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Stack spacing={2}>
        {/* Aspect Ratio Selector - For all media types */}
        <AspectRatioSelector
          value={aspectRatio || '1:1'}
          onChange={onAspectRatioChange}
          mediaType={mediaType === 'single_image' ? 'image' : 'video'}
          disabled={disabled}
          helperText="Select the aspect ratio for your media. Facebook will crop/resize to match."
          showPreview={true}
        />

        {/* Video Thumbnail Selector - Only for videos */}
        {mediaType === 'single_video' && videoFile && (
          <>
            <Button
              variant="outlined"
              startIcon={<VideoLibrary />}
              onClick={() => setShowThumbnailSelector(true)}
              disabled={disabled}
              fullWidth
            >
              Select Video Thumbnail
            </Button>

            <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
              Choose a specific frame from your video or upload a custom image to use as the thumbnail.
            </Alert>

            <VideoThumbnailSelector
              videoFile={videoFile}
              onThumbnailSelected={handleThumbnailSelected}
              open={showThumbnailSelector}
              onClose={() => setShowThumbnailSelector(false)}
            />
          </>
        )}
      </Stack>
    </Box>
  );
};

export default MediaUploadEnhanced;
