import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardMedia,
  CardActionArea,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  VideoLibrary as VideoIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

interface VideoThumbnailSelectorProps {
  videoFile: File;
  onThumbnailSelected: (thumbnail: File | null, frameIndex?: number) => void;
  open: boolean;
  onClose: () => void;
}

interface VideoFrame {
  blob: Blob;
  dataUrl: string;
  timestamp: number;
  index: number;
}

/**
 * VideoThumbnailSelector Component
 * Allows users to select a video thumbnail by:
 * 1. Choosing a frame from the video
 * 2. Uploading a custom image
 */
const VideoThumbnailSelector: React.FC<VideoThumbnailSelectorProps> = ({
  videoFile,
  onThumbnailSelected,
  open,
  onClose
}) => {
  const [frames, setFrames] = useState<VideoFrame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [tabValue, setTabValue] = useState(0); // 0 = frames, 1 = custom upload
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && videoFile) {
      extractFrames();
    }
  }, [open, videoFile]);

  const extractFrames = async () => {
    setLoading(true);
    setError(null);
    setFrames([]);

    try {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(videoFile);
      video.src = objectUrl;
      video.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      const duration = video.duration;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const extractedFrames: VideoFrame[] = [];
      const frameInterval = Math.max(2, duration / 12); // Extract ~12 frames, minimum 2 seconds apart

      for (let i = 0; i < 12 && i * frameInterval < duration; i++) {
        const timestamp = i * frameInterval;

        // Seek to timestamp
        video.currentTime = timestamp;
        await new Promise(resolve => {
          video.onseeked = resolve;
        });

        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        extractedFrames.push({
          blob,
          dataUrl,
          timestamp,
          index: i
        });
      }

      setFrames(extractedFrames);
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      console.error('Error extracting frames:', err);
      setError('Failed to extract video frames. Please try uploading a custom thumbnail.');
    } finally {
      setLoading(false);
    }
  };

  const handleFrameSelect = (frameIndex: number) => {
    setSelectedFrameIndex(frameIndex);
    setCustomThumbnail(null);
  };

  const handleCustomThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCustomThumbnail(file);
      setSelectedFrameIndex(null);
    }
  };

  const handleConfirm = () => {
    if (tabValue === 0 && selectedFrameIndex !== null) {
      // User selected a frame
      const frame = frames[selectedFrameIndex];
      const file = new File([frame.blob], 'thumbnail.jpg', { type: 'image/jpeg' });
      onThumbnailSelected(file, selectedFrameIndex);
    } else if (tabValue === 1 && customThumbnail) {
      // User uploaded custom thumbnail
      onThumbnailSelected(customThumbnail);
    } else {
      // No selection
      onThumbnailSelected(null);
    }
    onClose();
  };

  const handleCancel = () => {
    setSelectedFrameIndex(null);
    setCustomThumbnail(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Select Video Thumbnail</Typography>
          <IconButton onClick={handleCancel} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab icon={<VideoIcon />} label="Choose Frame" />
          <Tab icon={<ImageIcon />} label="Upload Custom" />
        </Tabs>

        {/* Tab 0: Choose from video frames */}
        {tabValue === 0 && (
          <Box>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Extracting video frames...</Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            {!loading && frames.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
                {frames.map((frame) => (
                  <Card
                    key={frame.index}
                    sx={{
                      position: 'relative',
                      border: selectedFrameIndex === frame.index ? '3px solid #1976d2' : '1px solid #ddd'
                    }}
                  >
                    <CardActionArea onClick={() => handleFrameSelect(frame.index)}>
                      <CardMedia
                        component="img"
                        image={frame.dataUrl}
                        alt={`Frame ${frame.index + 1}`}
                        sx={{ height: 120, objectFit: 'cover' }}
                      />
                      <Box sx={{ p: 1, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                        <Typography variant="caption">
                          {frame.timestamp.toFixed(1)}s
                        </Typography>
                      </Box>
                      {selectedFrameIndex === frame.index && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: '#1976d2',
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <CheckIcon sx={{ color: 'white', fontSize: 20 }} />
                        </Box>
                      )}
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            )}

            {!loading && frames.length === 0 && !error && (
              <Alert severity="info">No frames extracted. Try uploading a custom thumbnail.</Alert>
            )}
          </Box>
        )}

        {/* Tab 1: Upload custom thumbnail */}
        {tabValue === 1 && (
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCustomThumbnailUpload}
              style={{ display: 'none' }}
            />

            <Button
              variant="outlined"
              startIcon={<ImageIcon />}
              onClick={() => fileInputRef.current?.click()}
              fullWidth
              sx={{ mb: 2 }}
            >
              Choose Custom Thumbnail Image
            </Button>

            {customThumbnail && (
              <Card>
                <CardMedia
                  component="img"
                  image={URL.createObjectURL(customThumbnail)}
                  alt="Custom thumbnail"
                  sx={{ maxHeight: 300, objectFit: 'contain' }}
                />
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {customThumbnail.name}
                  </Typography>
                </Box>
              </Card>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              Upload a custom image to use as your video thumbnail. Recommended: 1200x628px or 1:1 square.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={
            (tabValue === 0 && selectedFrameIndex === null) ||
            (tabValue === 1 && !customThumbnail)
          }
        >
          Confirm Selection
        </Button>
      </DialogActions>

      {/* Hidden elements for frame extraction */}
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Dialog>
  );
};

export default VideoThumbnailSelector;
