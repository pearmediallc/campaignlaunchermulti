/**
 * BackfillPanel.tsx
 *
 * Manages historical data backfill for ad accounts.
 * Users can start, pause, and monitor backfill progress.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions as MuiDialogActions,
  TextField,
  Autocomplete,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Refresh,
  PlayArrow,
  Pause,
  Delete,
  CloudDownload,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Storage,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { intelligenceApi, BackfillStatus } from '../../services/intelligenceApi';

interface BackfillPanelProps {
  onRefresh?: () => void;
}

interface AdAccount {
  id: string;
  name: string;
  isActive?: boolean;
}

interface Pixel {
  id: string;
  name: string;
  isActive?: boolean;
}

const BackfillPanel: React.FC<BackfillPanelProps> = ({ onRefresh }) => {
  const [backfillStatus, setBackfillStatus] = useState<BackfillStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedPixel, setSelectedPixel] = useState('');
  const [backfillDays, setBackfillDays] = useState(90);
  const [backfillType, setBackfillType] = useState('all');
  const [startingBackfill, setStartingBackfill] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await intelligenceApi.getBackfillStatus();
      if (response.success) {
        setBackfillStatus(response);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch backfill status');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailableResources = async () => {
    try {
      setResourcesLoading(true);
      // Fetch all available resources from the resource manager API
      const response = await fetch('/api/resources/available', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAdAccounts(data.adAccounts || []);
        setPixels(data.pixels || []);

        // Auto-select currently active resources
        const activeAccount = data.adAccounts?.find((acc: AdAccount) => acc.isActive);
        const activePixel = data.pixels?.find((p: Pixel) => p.isActive);

        if (activeAccount && !selectedAccount) {
          setSelectedAccount(activeAccount.id);
        }
        if (activePixel && !selectedPixel) {
          setSelectedPixel(activePixel.id);
        }
      } else {
        console.error('Failed to fetch resources:', data.message);
        toast.error(data.message || 'Failed to fetch available resources');
      }
    } catch (err) {
      console.error('Failed to fetch available resources:', err);
      toast.error('Failed to fetch available resources. Please ensure Facebook is connected.');
    } finally {
      setResourcesLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAvailableResources();

    // Poll for updates every 10 seconds if there are in-progress backfills
    const interval = setInterval(() => {
      if ((backfillStatus?.summary?.in_progress ?? 0) > 0) {
        fetchStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchStatus, backfillStatus?.summary?.in_progress]);

  const handleStartBackfill = async () => {
    if (!selectedAccount) {
      toast.error('Please select an ad account');
      return;
    }

    try {
      setStartingBackfill(true);
      const response = await intelligenceApi.startBackfill(
        selectedAccount,
        backfillDays,
        backfillType
      );

      if (response.success) {
        toast.success('Backfill started successfully');
        setDialogOpen(false);
        fetchStatus();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start backfill');
    } finally {
      setStartingBackfill(false);
    }
  };

  const handlePauseBackfill = async (adAccountId: string) => {
    try {
      await intelligenceApi.pauseBackfill(adAccountId);
      toast.info('Backfill paused');
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to pause backfill');
    }
  };

  const handleCancelBackfill = async (adAccountId: string) => {
    if (!window.confirm('Are you sure you want to cancel this backfill?')) return;

    try {
      await intelligenceApi.cancelBackfill(adAccountId);
      toast.info('Backfill cancelled');
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel backfill');
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'paused': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'in_progress': return <CircularProgress size={20} />;
      case 'pending': return <Schedule color="warning" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'paused': return <Pause color="disabled" />;
      default: return <Schedule />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={fetchStatus}>
          <Refresh />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <CloudDownload sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6">
                Historical Data Backfill
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Import historical performance data for training the intelligence engine
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={() => setDialogOpen(true)}
          >
            Start Backfill
          </Button>
        </Box>

        {/* Summary Stats */}
        {backfillStatus?.summary && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold">
                    {backfillStatus.summary.total_accounts ?? backfillStatus.summary.total ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Accounts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {backfillStatus.summary.completed}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold" color="info.main">
                    {backfillStatus.summary.in_progress}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    In Progress
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold">
                    {backfillStatus.summary.overall_progress ?? 0}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Overall Progress
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Account Backfill List */}
      {!backfillStatus?.accounts || backfillStatus.accounts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Storage sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Backfill Jobs
          </Typography>
          <Typography color="text.secondary" paragraph>
            Start a backfill to import historical data for your ad accounts.
            This data is essential for training the intelligence engine.
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={() => setDialogOpen(true)}
          >
            Start Your First Backfill
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {backfillStatus.accounts.map((account) => (
            <Grid size={{ xs: 12, md: 6 }} key={account.ad_account_id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {account.ad_account_id}
                      </Typography>
                      <Box display="flex" gap={1} mt={1}>
                        <Chip
                          icon={getStatusIcon(account.status)}
                          label={account.status.replace('_', ' ').toUpperCase()}
                          size="small"
                          color={getStatusColor(account.status)}
                        />
                        <Chip
                          label={account.backfill_type || 'all'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {account.progress ?? Math.round((account.days_completed / (account.total_days || 1)) * 100)}%
                    </Typography>
                  </Box>

                  <Box mt={2}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        {account.days_completed} / {account.total_days} days
                      </Typography>
                      {account.current_date && (
                        <Typography variant="caption" color="text.secondary">
                          Current: {account.current_date}
                        </Typography>
                      )}
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={account.progress ?? Math.round((account.days_completed / (account.total_days || 1)) * 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={account.status === 'failed' ? 'error' : 'primary'}
                    />
                  </Box>

                  <Box display="flex" justifyContent="space-between" mt={2}>
                    <Typography variant="caption" color="text.secondary">
                      {account.start_date} → {account.end_date}
                    </Typography>
                    {account.last_fetch_at && (
                      <Typography variant="caption" color="text.secondary">
                        Last update: {new Date(account.last_fetch_at).toLocaleTimeString()}
                      </Typography>
                    )}
                  </Box>

                  {account.error_message && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {account.error_message}
                    </Alert>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  {account.status === 'in_progress' && (
                    <Tooltip title="Pause Backfill">
                      <IconButton
                        size="small"
                        onClick={() => handlePauseBackfill(account.ad_account_id)}
                      >
                        <Pause />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Cancel Backfill">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleCancelBackfill(account.ad_account_id)}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Start Backfill Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Historical Backfill</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 1 }}>
            Import historical performance data from Facebook to train the intelligence engine.
          </Typography>

          {resourcesLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                Loading available resources...
              </Typography>
            </Box>
          ) : adAccounts.length === 0 ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                No ad accounts found. Please ensure your Facebook account is connected and has access to ad accounts.
              </Typography>
            </Alert>
          ) : (
            <Grid container spacing={2}>
              <Grid size={12}>
                <Autocomplete
                  options={adAccounts}
                  getOptionLabel={(option) => `${option.name || option.id}${option.isActive ? ' (Active)' : ''}`}
                  value={adAccounts.find(acc => acc.id === selectedAccount) || null}
                  onChange={(_, newValue) => setSelectedAccount(newValue?.id || '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Ad Account"
                      placeholder="Search ad accounts..."
                      helperText={`${adAccounts.length} accounts available`}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body2">
                          {option.name || option.id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.id} {option.isActive ? '• Active' : ''}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  filterOptions={(options, { inputValue }) => {
                    const searchLower = inputValue.toLowerCase();
                    return options.filter(option =>
                      (option.name?.toLowerCase().includes(searchLower)) ||
                      (option.id?.toLowerCase().includes(searchLower))
                    );
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  fullWidth
                />
              </Grid>

              {pixels.length > 0 && (
                <Grid size={12}>
                  <Autocomplete
                    options={[{ id: '', name: 'None' }, ...pixels]}
                    getOptionLabel={(option) => option.id === '' ? 'None' : `${option.name || option.id}${option.isActive ? ' (Active)' : ''}`}
                    value={pixels.find(p => p.id === selectedPixel) || { id: '', name: 'None' }}
                    onChange={(_, newValue) => setSelectedPixel(newValue?.id || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Pixel (Optional)"
                        placeholder="Search pixels..."
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    fullWidth
                  />
                </Grid>
              )}

              <Grid size={6}>
                <FormControl fullWidth>
                  <InputLabel>Days to Fetch</InputLabel>
                  <Select
                    value={backfillDays}
                    label="Days to Fetch"
                    onChange={(e) => setBackfillDays(e.target.value as number)}
                  >
                    <MenuItem value={7}>7 Days (Quick Test)</MenuItem>
                    <MenuItem value={14}>14 Days</MenuItem>
                    <MenuItem value={30}>30 Days</MenuItem>
                    <MenuItem value={60}>60 Days</MenuItem>
                    <MenuItem value={90}>90 Days (Recommended)</MenuItem>
                    <MenuItem value={180}>180 Days</MenuItem>
                    <MenuItem value={365}>365 Days (Full Year)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={6}>
                <FormControl fullWidth>
                  <InputLabel>Data Type</InputLabel>
                  <Select
                    value={backfillType}
                    label="Data Type"
                    onChange={(e) => setBackfillType(e.target.value)}
                  >
                    <MenuItem value="all">All Data (Recommended)</MenuItem>
                    <MenuItem value="insights">Performance Insights Only</MenuItem>
                    <MenuItem value="pixel">Pixel Data Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Backfill runs in the background and may take several minutes
              depending on the amount of data. You can monitor progress on this page.
            </Typography>
          </Alert>
        </DialogContent>
        <MuiDialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStartBackfill}
            disabled={!selectedAccount || startingBackfill || resourcesLoading}
            startIcon={startingBackfill ? <CircularProgress size={20} /> : <PlayArrow />}
          >
            {startingBackfill ? 'Starting...' : 'Start Backfill'}
          </Button>
        </MuiDialogActions>
      </Dialog>

      {/* Refresh Button */}
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Tooltip title="Refresh status">
          <IconButton onClick={fetchStatus}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default BackfillPanel;
