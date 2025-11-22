import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Tabs,
  Tab,
  TextField
} from '@mui/material';
import {
  Close as CloseIcon,
  Upload as UploadIcon,
  CheckCircle as CheckIcon,
  CloudUpload as CloudUploadIcon,
  TextFields as TextIcon
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

interface BulkStateUploaderProps {
  open: boolean;
  onClose: () => void;
  onStatesUploaded: (regions: Array<{key: string; name: string}>) => void;
}

interface UploadResult {
  regions: Array<{key: string; name: string}>;
  count: number;
  invalidStates?: string[];
}

const BulkStateUploader: React.FC<BulkStateUploaderProps> = ({
  open,
  onClose,
  onStatesUploaded
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!validTypes.includes(selectedFile.type) &&
          !selectedFile.name.endsWith('.csv') &&
          !selectedFile.name.endsWith('.xlsx')) {
        setError('Please upload a CSV or Excel file');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        '/api/facebook-targeting/bulk-upload-states',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setUploadResult(response.data);
        toast.success(`Successfully mapped ${response.data.count} states`);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to upload states';
      setError(errorMsg);

      // Show invalid states if any
      if (err.response?.data?.invalidStates) {
        setUploadResult({
          regions: [],
          count: 0,
          invalidStates: err.response.data.invalidStates
        });
      }

      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleTextParse = async () => {
    if (!textInput.trim()) {
      setError('Please enter state names');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        '/api/facebook-targeting/parse-states-text',
        { text: textInput }
      );

      if (response.data.success) {
        setUploadResult(response.data);
        toast.success(`Successfully mapped ${response.data.count} states`);

        if (response.data.hasInvalidStates) {
          toast.warning(`${response.data.invalidStates.length} state names could not be recognized`);
        }
      } else {
        throw new Error(response.data.error || 'Parse failed');
      }
    } catch (err: any) {
      console.error('Parse error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to parse states';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!uploadResult || uploadResult.regions.length === 0) {
      toast.error('No valid states to apply');
      return;
    }

    onStatesUploaded(uploadResult.regions);
    toast.success(`Applied ${uploadResult.count} states to targeting`);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setTextInput('');
    setUploadResult(null);
    setError(null);
    setActiveTab(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <CloudUploadIcon color="primary" />
            <Typography variant="h6">Bulk Add States</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Add multiple US states at once - either paste them directly or upload a file
        </Alert>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab icon={<TextIcon />} label="Paste Text" />
          <Tab icon={<UploadIcon />} label="Upload File" />
        </Tabs>

        {/* Text Input Tab */}
        {activeTab === 0 && (
          <Box>
            <TextField
              fullWidth
              multiline
              rows={8}
              variant="outlined"
              placeholder="Paste state names here (one per line or comma-separated)&#10;Example:&#10;California, Texas, New York&#10;or&#10;CA&#10;TX&#10;NY"
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                setError(null);
                setUploadResult(null);
              }}
              sx={{ mb: 2 }}
            />

            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
              <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                Supported formats:
              </Typography>
              <Typography variant="caption" display="block">
                • One state per line: California, Texas, New York
              </Typography>
              <Typography variant="caption" display="block">
                • Comma-separated: CA, TX, NY
              </Typography>
              <Typography variant="caption" display="block">
                • Mixed: California, TX, New York (full names or abbreviations)
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleTextParse}
              disabled={loading || !textInput.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <TextIcon />}
            >
              {loading ? 'Processing...' : 'Parse States'}
            </Button>
          </Box>
        )}

        {/* File Upload Tab */}
        {activeTab === 1 && (
          <Box>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                border: file ? '2px solid' : '2px dashed',
                borderColor: file ? 'primary.main' : 'grey.400',
                bgcolor: file ? 'primary.50' : 'transparent',
                cursor: 'pointer',
                mb: 2,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
              onClick={handleBrowseClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {!file ? (
                <>
                  <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" gutterBottom>
                    Click to browse or drag and drop
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supported formats: CSV, Excel (.xlsx, .xls)
                  </Typography>
                </>
              ) : (
                <>
                  <CheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(file.size / 1024).toFixed(2)} KB
                  </Typography>
                  <br />
                  <Button size="small" onClick={handleBrowseClick} sx={{ mt: 1 }}>
                    Choose Different File
                  </Button>
                </>
              )}
            </Paper>

            {/* Format Example */}
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
              <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                Example CSV format:
              </Typography>
              <Typography variant="caption" fontFamily="monospace" display="block" sx={{ whiteSpace: 'pre' }}>
{`California
Texas
New York
Florida
CA
TX`}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Supports both full state names and abbreviations (case-insensitive)
              </Typography>
            </Box>

            {/* Upload Button */}
            {file && !uploadResult && (
              <Button
                fullWidth
                variant="contained"
                onClick={handleFileUpload}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
              >
                {loading ? 'Processing...' : 'Process File'}
              </Button>
            )}
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Results Display */}
        {uploadResult && uploadResult.regions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Successfully mapped {uploadResult.count} states!
              </Typography>
            </Alert>

            <Typography variant="subtitle2" gutterBottom>
              States to be added:
            </Typography>
            <List
              dense
              sx={{
                maxHeight: '200px',
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              {uploadResult.regions.map((region, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={region.name}
                    secondary={`Facebook Region Key: ${region.key}`}
                  />
                  <Chip label="Valid" color="success" size="small" />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Invalid States */}
        {uploadResult && uploadResult.invalidStates && uploadResult.invalidStates.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Could not recognize {uploadResult.invalidStates.length} entries:
            </Typography>
            <Typography variant="caption">
              {uploadResult.invalidStates.join(', ')}
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {uploadResult && uploadResult.regions.length > 0 && (
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={loading}
            startIcon={<CheckIcon />}
          >
            Apply {uploadResult.count} States
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkStateUploader;
