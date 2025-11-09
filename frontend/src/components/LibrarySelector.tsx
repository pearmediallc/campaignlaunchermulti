import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Checkbox,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import { Close, Image as ImageIcon, VideoLibrary } from '@mui/icons-material';
import axios from 'axios';
import { useCreativeLibrary } from '../contexts/CreativeLibraryContext';

interface LibrarySelectorProps {
  mediaType: 'single_image' | 'single_video' | 'carousel';
  onSelect: (files: File[], editorName: string) => void;
  onClose: () => void;
  open: boolean;
}

interface MediaFile {
  id: string;
  filename: string;
  original_filename: string;
  editor_id: string;
  editor_name: string;
  file_type: 'image' | 'video';
  s3_url: string;
  thumbnail_url: string;
  created_at: string;
  mime_type: string;
  width?: number;
  height?: number;
}

interface Editor {
  id: string;
  name: string;
  display_name: string;
}

const LibrarySelector: React.FC<LibrarySelectorProps> = ({
  mediaType,
  onSelect,
  onClose,
  open
}) => {
  // Use Creative Library context for authentication
  const { isAuthenticated, token, authenticate, logout, loading: authLoading, user } = useCreativeLibrary();

  // Local authentication state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // File selection state
  const [editors, setEditors] = useState<Editor[]>([]);
  const [selectedEditor, setSelectedEditor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const CREATIVE_LIBRARY_URL = process.env.REACT_APP_CREATIVE_LIBRARY_URL || 'http://localhost:3001';

  // Check authentication status and fetch editors when modal opens
  useEffect(() => {
    console.log('📋 LibrarySelector opened');
    console.log(`   isAuthenticated: ${isAuthenticated}`);
    console.log(`   token: ${token ? token.substring(0, 20) + '...' : 'null'}`);

    if (open && isAuthenticated && token) {
      console.log('✅ Already authenticated, fetching editors...');
      fetchEditors();
    } else if (open && !isAuthenticated) {
      console.log('ℹ️  Not authenticated, showing login form');
      setEditors([]);
      setFiles([]);
      setSelectedFiles([]);
      setError('');
    }
  }, [open, isAuthenticated, token]);

  // Handle login using context
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email and password');
      return;
    }

    setLoginError('');

    console.log('🔐 Attempting login via CreativeLibraryContext...');

    const result = await authenticate(loginEmail, loginPassword);

    if (result.success) {
      console.log('✅ Login successful via context');

      // Clear login form
      setLoginEmail('');
      setLoginPassword('');
      setLoginError('');

      // Fetch editors - token is now available in context
      await fetchEditors();
    } else {
      console.log('❌ Login failed:', result.error);
      setLoginError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  // Fetch editors using token from context
  const fetchEditors = async () => {
    try {
      console.log('📡 Fetching editors from Creative Library...');
      console.log(`   Token: ${token ? token.substring(0, 20) + '...' : 'null'}`);

      if (!token) {
        console.log('❌ No token available');
        setError('Not authenticated. Please login.');
        return;
      }

      const response = await axios.get(`${CREATIVE_LIBRARY_URL}/api/editors`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Editors fetched successfully:', response.data.data?.length || 0);
      setEditors(response.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('❌ Failed to fetch editors:', err);

      // If token is invalid/expired, show error
      if (err.response?.status === 401 || err.response?.status === 403) {
        setLoginError('Session expired. Please login again.');
      } else {
        setError('Failed to load editors.');
      }
    }
  };

  const handleSearch = async () => {
    if (!selectedEditor) {
      setError('Please select an editor');
      return;
    }

    setLoading(true);
    setError('');
    setFiles([]);
    setSelectedFiles([]);

    try {
      console.log('🔍 Searching files with token from context...');

      if (!token) {
        setError('Please login to Creative Library first');
        setLoading(false);
        return;
      }

      // Determine file type filter
      let fileTypeParam = 'all';
      if (mediaType === 'single_image' || mediaType === 'carousel') {
        fileTypeParam = 'image';
      } else if (mediaType === 'single_video') {
        fileTypeParam = 'video';
      }

      console.log(`   Editor: ${selectedEditor}`);
      console.log(`   File Type: ${fileTypeParam}`);
      console.log(`   Date Range: ${startDate || 'any'} to ${endDate || 'any'}`);

      // Build query params
      const params = new URLSearchParams({
        editor_id: selectedEditor,
        file_type: fileTypeParam
      });

      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await axios.get(
        `${CREATIVE_LIBRARY_URL}/api/media/select?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fetchedFiles = response.data.data.files || [];
      setFiles(fetchedFiles);

      if (fetchedFiles.length === 0) {
        setError('No files found for the selected criteria');
      }
    } catch (err: any) {
      console.error('Failed to fetch files:', err);

      // If token is invalid/expired, show error
      if (err.response?.status === 401 || err.response?.status === 403) {
        setLoginError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.error || 'Failed to load files from Creative Library');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    if (mediaType === 'single_image' || mediaType === 'single_video') {
      // Single selection only
      setSelectedFiles([fileId]);
    } else {
      // Multiple selection for carousel
      if (selectedFiles.includes(fileId)) {
        setSelectedFiles(selectedFiles.filter(id => id !== fileId));
      } else {
        if (selectedFiles.length >= 10) {
          setError('Maximum 10 files allowed for carousel');
          return;
        }
        setSelectedFiles([...selectedFiles, fileId]);
      }
    }
  };

  const handleConfirm = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    // Validate selection count
    if ((mediaType === 'single_image' || mediaType === 'single_video') && selectedFiles.length > 1) {
      setError('Please select only one file');
      return;
    }

    if (mediaType === 'carousel' && selectedFiles.length < 2) {
      setError('Please select at least 2 files for carousel');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Download selected files and convert to File objects
      const selectedFileObjects = files.filter(f => selectedFiles.includes(f.id));
      const downloadedFiles: File[] = [];

      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      console.log('🚀 LIBRARY SELECTOR - DOWNLOADING FILES VIA PROXY');
      console.log('📍 Creative Library URL:', CREATIVE_LIBRARY_URL);
      console.log('🔐 Token from context:', token.substring(0, 20) + '...');
      console.log(`📦 Downloading ${selectedFileObjects.length} file(s)...`);

      for (const file of selectedFileObjects) {
        console.log('📥 START DOWNLOAD via proxy API:', file.original_filename);
        console.log('🆔 File ID:', file.id);
        console.log('📍 Endpoint:', `${CREATIVE_LIBRARY_URL}/api/media/${file.id}/download`);

        // Fetch through Creative Library API with auth to avoid CORS issues
        // The backend will proxy the file from S3/CloudFront with proper CORS headers
        const response = await axios.get(`${CREATIVE_LIBRARY_URL}/api/media/${file.id}/download`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });

        console.log('✅ DOWNLOAD COMPLETE via proxy:', file.original_filename, response.data.size, 'bytes');

        const downloadedFile = new File([response.data], file.original_filename, { type: file.mime_type });
        downloadedFiles.push(downloadedFile);
      }

      console.log('📦 All files downloaded:', downloadedFiles.length);

      // Get editor name for ad naming convention
      const editor = editors.find(e => e.id === selectedEditor);
      const editorName = editor?.display_name || editor?.name || '';

      // Pass files and editor name back to parent
      onSelect(downloadedFiles, editorName);
      onClose();
    } catch (err: any) {
      console.error('❌ Failed to download files:', err);

      if (err.response?.status === 401 || err.response?.status === 403) {
        setLoginError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.error || 'Failed to download files from Creative Library');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleLogout = () => {
    console.log('🚪 Logging out from Creative Library...');
    logout(); // Use context logout
    // Clear local state
    setEditors([]);
    setFiles([]);
    setSelectedFiles([]);
    setSelectedEditor('');
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    setError('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Select from Creative Library</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isAuthenticated && (
              <Button variant="outlined" size="small" onClick={handleLogout}>
                Logout
              </Button>
            )}
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {!isAuthenticated ? (
            // Login Form
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                Please login to your Creative Library account to select creatives.
              </Alert>

              {loginError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {loginError}
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400, mx: 'auto' }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={authLoading}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={authLoading}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleLogin}
                  disabled={authLoading || !loginEmail || !loginPassword}
                  sx={{ mt: 1 }}
                >
                  {authLoading ? <CircularProgress size={24} /> : 'Login to Creative Library'}
                </Button>
              </Box>
            </>
          ) : (
            // File Selection Interface
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Select creatives from your Creative Library. The selected editor's name will be added to your ad name for tracking.
              </Alert>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Filters */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 40%' } }}>
              <FormControl fullWidth>
                <InputLabel>Editor</InputLabel>
                <Select
                  value={selectedEditor}
                  onChange={(e) => setSelectedEditor(e.target.value)}
                  label="Editor"
                >
                  <MenuItem value="">Select editor...</MenuItem>
                  {editors.map(editor => (
                    <MenuItem key={editor.id} value={editor.id}>
                      {editor.display_name || editor.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 25%' } }}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 25%' } }}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' } }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                disabled={loading || !selectedEditor}
                sx={{ height: '56px' }}
              >
                {loading ? <CircularProgress size={24} /> : 'Search'}
              </Button>
            </Box>
          </Box>

          {/* File Grid */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : files.length > 0 ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {mediaType === 'single_image' || mediaType === 'single_video'
                  ? 'Click to select one file'
                  : `Select 2-10 files for carousel (${selectedFiles.length} selected)`}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {files.map(file => (
                  <Box key={file.id} sx={{ flex: { xs: '1 1 100%', sm: '0 0 calc(50% - 8px)', md: '0 0 calc(33.333% - 11px)', lg: '0 0 calc(25% - 12px)' } }}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: selectedFiles.includes(file.id) ? '3px solid #1976d2' : '1px solid #e0e0e0',
                        position: 'relative'
                      }}
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      {file.file_type === 'image' ? (
                        <CardMedia
                          component="img"
                          height="200"
                          image={file.thumbnail_url || file.s3_url}
                          alt={file.original_filename}
                          sx={{ objectFit: 'cover' }}
                        />
                      ) : file.thumbnail_url ? (
                        // Video with thumbnail - show thumbnail image with play icon overlay
                        <Box sx={{ position: 'relative', height: 200 }}>
                          <CardMedia
                            component="img"
                            height="200"
                            image={file.thumbnail_url}
                            alt={file.original_filename}
                            sx={{ objectFit: 'cover' }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              bgcolor: 'rgba(0, 0, 0, 0.6)',
                              borderRadius: '50%',
                              width: 60,
                              height: 60,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <VideoLibrary sx={{ fontSize: 40, color: '#fff' }} />
                          </Box>
                        </Box>
                      ) : (
                        // Video without thumbnail - show placeholder
                        <Box
                          sx={{
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#f5f5f5'
                          }}
                        >
                          <VideoLibrary sx={{ fontSize: 60, color: '#9e9e9e' }} />
                        </Box>
                      )}

                      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                        <Checkbox
                          checked={selectedFiles.includes(file.id)}
                          sx={{
                            bgcolor: 'white',
                            borderRadius: 1,
                            '&:hover': { bgcolor: 'white' }
                          }}
                        />
                      </Box>

                      <CardContent>
                        <Typography variant="body2" noWrap title={file.original_filename}>
                          {file.original_filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(file.created_at)}
                        </Typography>
                        {file.width && file.height && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {file.width} × {file.height}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            </>
          ) : null}
              </>
            )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading || authLoading}>
          Cancel
        </Button>
        {isAuthenticated && (
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading || selectedFiles.length === 0}
          >
            Use Selected ({selectedFiles.length})
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default LibrarySelector;
