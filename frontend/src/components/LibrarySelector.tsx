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
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

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

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('creative_library_token');
  };

  // Check authentication status and fetch editors on mount
  useEffect(() => {
    if (open) {
      const token = getAuthToken();
      if (token) {
        setIsAuthenticated(true);
        fetchEditors();
      } else {
        setIsAuthenticated(false);
        setEditors([]);
        setFiles([]);
        setSelectedFiles([]);
        setError('');
      }
    }
  }, [open]);

  // Handle login
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email and password');
      return;
    }

    setLoggingIn(true);
    setLoginError('');

    try {
      const response = await axios.post(`${CREATIVE_LIBRARY_URL}/api/auth/login`, {
        email: loginEmail,
        password: loginPassword
      });

      if (response.data.success && response.data.data.token) {
        // Store token
        localStorage.setItem('creative_library_token', response.data.data.token);

        // Update state
        setIsAuthenticated(true);
        setLoginEmail('');
        setLoginPassword('');
        setLoginError('');

        // Fetch editors
        await fetchEditors();
      } else {
        setLoginError('Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      const errorMessage = err.response?.data?.error || 'Login failed. Please check your credentials.';
      setLoginError(errorMessage);
    } finally {
      setLoggingIn(false);
    }
  };

  const fetchEditors = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      const response = await axios.get(`${CREATIVE_LIBRARY_URL}/api/editors`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEditors(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch editors:', err);

      // If token is invalid/expired, clear it and show login
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('creative_library_token');
        setIsAuthenticated(false);
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
      const token = getAuthToken();
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

      // If token is invalid/expired, clear it and show login
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('creative_library_token');
        setIsAuthenticated(false);
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

      for (const file of selectedFileObjects) {
        const response = await fetch(file.s3_url);
        const blob = await response.blob();
        const downloadedFile = new File([blob], file.original_filename, { type: file.mime_type });
        downloadedFiles.push(downloadedFile);
      }

      // Get editor name for ad naming convention
      const editor = editors.find(e => e.id === selectedEditor);
      const editorName = editor?.display_name || editor?.name || '';

      // Pass files and editor name back to parent
      onSelect(downloadedFiles, editorName);
      onClose();
    } catch (err) {
      console.error('Failed to download files:', err);
      setError('Failed to download files from Creative Library');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleLogout = () => {
    localStorage.removeItem('creative_library_token');
    setIsAuthenticated(false);
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
                  disabled={loggingIn}
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
                  disabled={loggingIn}
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
                  disabled={loggingIn || !loginEmail || !loginPassword}
                  sx={{ mt: 1 }}
                >
                  {loggingIn ? <CircularProgress size={24} /> : 'Login to Creative Library'}
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
                      ) : (
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
        <Button onClick={onClose} disabled={loading || loggingIn}>
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
