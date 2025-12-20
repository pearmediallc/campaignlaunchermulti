/**
 * AdminTestDashboard.tsx
 *
 * Admin-only dashboard for running campaign creation tests.
 * All test campaigns are created in PAUSED state (no spend).
 * This component is isolated and only accessible to admin users.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
} from '@mui/material';
import {
  ExpandMore,
  PlayArrow,
  PlaylistPlay,
  Delete,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Info,
  CloudUpload,
  Image,
  VideoLibrary,
  Campaign,
  Assessment,
  Clear,
  Settings,
  AccountTree,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';

// Types
interface TestScenario {
  id: string;
  name: string;
  description: string;
  strategy: string;
  category: string;
  adSetCount?: number;
  adCount?: number;
  mediaType?: string;
}

interface LogEntry {
  time: string;
  message: string;
}

interface TestResult {
  testId: string;
  scenarioId: string;
  scenarioName: string;
  status: 'passed' | 'failed' | 'error';
  startTime: string;
  endTime?: string;
  duration?: number;
  durationFormatted?: string;
  error?: string;
  createdCampaign?: {
    campaignId: string;
    campaignName: string;
    adSetCount: number;
    adCount: number;
  };
  verification?: {
    expectedAdSets: number;
    actualAdSets: number;
    expectedAds: number;
    actualAds: number;
    adSetsMatch: boolean;
    adsMatch: boolean;
    passed?: boolean;
    issues?: Array<{ type: string; entity?: string; expected?: number; actual?: number; message?: string }>;
  };
  logs?: LogEntry[] | string[];
  expected?: { campaigns: number; adSets: number; ads: number };
  actual?: { campaigns: number; adSets: number; ads: number };
}

interface ActiveTest {
  testId: string;
  scenarioId: string;
  progress: number;
  progressMessage: string;
  logs: string[];
}

interface Resources {
  adAccountId: string;
  adAccountName: string;
  pageId: string;
  pageName: string;
  pixelId?: string;
  pixelName?: string;
}


interface AdAccount {
  id: string;
  account_id: string;
  name: string;
}

interface Page {
  id: string;
  name: string;
}

interface StatusData {
  hasAuth: boolean;
  tokenValid: boolean;
  resources: Resources;
  allAdAccounts: AdAccount[];
  allPages: Page[];
  scenarios: Record<string, TestScenario[]>;
  media: {
    images: number;
    videos: number;
    imageFiles: string[];
    videoFiles: string[];
  };
  activeTests: ActiveTest[];
  recentResults: TestResult[];
}

export const AdminTestDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [runningTests, setRunningTests] = useState<Map<string, ActiveTest>>(new Map());
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [pollingActive, setPollingActive] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [campaignsToCleanup, setCampaignsToCleanup] = useState<string[]>([]);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check if user is admin or super_admin (case-insensitive)
  const isAdmin = user?.roles?.some((role: any) => {
    const roleName = typeof role === 'string' ? role : role.name;
    return ['admin', 'super_admin'].includes(roleName?.toLowerCase());
  });

  // Fetch test status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get('/admin/test/status');
      if (response.data.success) {
        setStatusData(response.data.data);
        setTestResults(response.data.data.recentResults || []);

        // Update running tests from active tests
        const activeMap = new Map<string, ActiveTest>();
        response.data.data.activeTests?.forEach((test: ActiveTest) => {
          activeMap.set(test.testId, test);
        });
        setRunningTests(activeMap);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('Admin access required');
      } else {
        toast.error('Failed to fetch test status');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling for active tests
  useEffect(() => {
    if (runningTests.size > 0 && !pollingActive) {
      setPollingActive(true);
      const interval = setInterval(() => {
        fetchStatus();
      }, 2000);
      return () => {
        clearInterval(interval);
        setPollingActive(false);
      };
    }
  }, [runningTests.size, pollingActive, fetchStatus]);

  // Run single test
  const runTest = async (scenarioId: string) => {
    try {
      const response = await api.post('/admin/test/run', { scenarioId });
      if (response.data.success) {
        toast.success(`Test started: ${scenarioId}`);
        // Add to running tests with initial state
        setRunningTests(prev => {
          const next = new Map(prev);
          next.set(response.data.testId, {
            testId: response.data.testId,
            scenarioId,
            progress: 0,
            progressMessage: 'Starting...',
            logs: []
          });
          return next;
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start test');
    }
  };

  // Run multiple tests
  const runSelectedTests = async () => {
    if (selectedScenarios.length === 0) {
      toast.warning('Please select at least one scenario');
      return;
    }

    try {
      const accountConfigs = selectedAccounts.length > 0
        ? selectedAccounts.map(accountId => ({
            adAccountId: `act_${accountId}`,
            pageId: statusData?.resources.pageId,
            pixelId: statusData?.resources.pixelId
          }))
        : undefined;

      const response = await api.post('/admin/test/run-multiple', {
        scenarioIds: selectedScenarios,
        accountConfigs,
        runMode: 'sequential'
      });

      if (response.data.success) {
        toast.success(`Started ${response.data.testIds.length} tests`);
        setSelectedScenarios([]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start tests');
    }
  };

  // Cleanup test campaigns
  const cleanupCampaigns = async () => {
    if (campaignsToCleanup.length === 0) {
      toast.warning('No campaigns to cleanup');
      return;
    }

    try {
      const response = await api.post('/admin/test/cleanup', {
        campaignIds: campaignsToCleanup
      });

      if (response.data.success) {
        toast.success(`Cleaned up ${response.data.results.length} campaigns`);
        setCleanupDialogOpen(false);
        setCampaignsToCleanup([]);
        fetchStatus();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cleanup campaigns');
    }
  };

  // Clear all results
  const clearResults = async () => {
    try {
      await api.post('/admin/test/clear-results');
      setTestResults([]);
      toast.success('Test results cleared');
    } catch (error: any) {
      toast.error('Failed to clear results');
    }
  };

  // Toggle scenario selection
  const toggleScenario = (scenarioId: string) => {
    setSelectedScenarios(prev =>
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  // Select all scenarios in category
  const selectAllInCategory = (categoryScenarios: TestScenario[]) => {
    const ids = categoryScenarios.map(s => s.id);
    setSelectedScenarios(prev => {
      const existing = new Set(prev);
      const allSelected = ids.every(id => existing.has(id));
      if (allSelected) {
        return prev.filter(id => !ids.includes(id));
      } else {
        // Combine and deduplicate
        const combined = [...prev, ...ids];
        return combined.filter((id, index) => combined.indexOf(id) === index);
      }
    });
  };

  // Show logs dialog
  const showLogs = (logs: string[]) => {
    setSelectedLogs(logs);
    setLogDialogOpen(true);
  };

  // Handle media upload
  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await api.post('/admin/test/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success(`Uploaded ${response.data.data.uploadedFiles.length} file(s)`);
        fetchStatus(); // Refresh to get updated media counts
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload files');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle delete single media file
  const handleDeleteMedia = async (filename: string) => {
    setDeletingMedia(filename);
    try {
      const response = await api.delete(`/admin/test/media/${encodeURIComponent(filename)}`);
      if (response.data.success) {
        toast.success(`Deleted ${filename}`);
        fetchStatus(); // Refresh to get updated media counts
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete file');
    } finally {
      setDeletingMedia(null);
    }
  };

  // Handle delete all media files
  const handleDeleteAllMedia = async () => {
    if (!window.confirm('Are you sure you want to delete ALL media files? This cannot be undone.')) {
      return;
    }

    setUploading(true);
    try {
      const response = await api.delete('/admin/test/media');
      if (response.data.success) {
        toast.success(response.data.message);
        fetchStatus();
        setMediaDialogOpen(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete files');
    } finally {
      setUploading(false);
    }
  };

  // Open cleanup dialog with campaign IDs from results
  const openCleanupDialog = () => {
    const campaignIds = testResults
      .filter(r => r.createdCampaign?.campaignId)
      .map(r => r.createdCampaign!.campaignId);
    // Deduplicate without using Set spread
    const uniqueCampaignIds = campaignIds.filter((id, index) => campaignIds.indexOf(id) === index);
    setCampaignsToCleanup(uniqueCampaignIds);
    setCleanupDialogOpen(true);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'error':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'error':
        return 'warning';
      default:
        return 'info';
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Admin access required. This page is only available to administrators.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!statusData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load test dashboard</Alert>
      </Box>
    );
  }

  const passedCount = testResults.filter(r => r.status === 'passed').length;
  const failedCount = testResults.filter(r => r.status === 'failed').length;
  const errorCount = testResults.filter(r => r.status === 'error').length;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Campaign Creation Test Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Admin-only testing interface. All campaigns are created in PAUSED state.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh Status">
              <IconButton onClick={fetchStatus} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Auth Status */}
        {!statusData.hasAuth && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Facebook authentication required. Please connect your Facebook account first.
          </Alert>
        )}

        {statusData.hasAuth && !statusData.tokenValid && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Facebook token has expired. Please re-authenticate.
          </Alert>
        )}

        {/* Status Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {/* Resources Card */}
          <Card sx={{ flex: '1 1 300px', minWidth: 280 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Settings sx={{ mr: 1 }} />
                <Typography variant="h6">Active Resources</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Campaign sx={{ mr: 1, fontSize: 18 }} />
                  <Typography variant="body2" noWrap>
                    <strong>Ad Account:</strong> {statusData.resources.adAccountName || statusData.resources.adAccountId || 'Not set'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccountTree sx={{ mr: 1, fontSize: 18 }} />
                  <Typography variant="body2" noWrap>
                    <strong>Page:</strong> {statusData.resources.pageName || 'Not set'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Assessment sx={{ mr: 1, fontSize: 18 }} />
                  <Typography variant="body2" noWrap>
                    <strong>Pixel:</strong> {statusData.resources.pixelName || 'Not set'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Media Card */}
          <Card sx={{ flex: '1 1 300px', minWidth: 280 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CloudUpload sx={{ mr: 1 }} />
                  <Typography variant="h6">Available Media</Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setMediaDialogOpen(true)}
                  sx={{ minWidth: 'auto' }}
                >
                  Manage
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Image sx={{ mr: 1 }} color="primary" />
                  <Typography variant="h4">{statusData.media.images}</Typography>
                  <Typography variant="body2" sx={{ ml: 1 }}>images</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VideoLibrary sx={{ mr: 1 }} color="secondary" />
                  <Typography variant="h4">{statusData.media.videos}</Typography>
                  <Typography variant="body2" sx={{ ml: 1 }}>videos</Typography>
                </Box>
              </Box>
              {/* Upload Button */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo"
                  onChange={handleMediaUpload}
                  style={{ display: 'none' }}
                  id="media-upload-input"
                />
                <Button
                  variant="contained"
                  startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  size="small"
                  fullWidth
                >
                  {uploading ? 'Uploading...' : 'Upload Media'}
                </Button>
              </Box>
              {(statusData.media.images === 0 && statusData.media.videos === 0) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No media files. Upload images/videos to run tests.
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Results Summary Card */}
          <Card sx={{ flex: '1 1 300px', minWidth: 280 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assessment sx={{ mr: 1 }} />
                <Typography variant="h6">Test Results Summary</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  icon={<CheckCircle />}
                  label={`${passedCount} Passed`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<Error />}
                  label={`${failedCount} Failed`}
                  color="error"
                  variant="outlined"
                />
                <Chip
                  icon={<Warning />}
                  label={`${errorCount} Errors`}
                  color="warning"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={clearResults}
                  disabled={testResults.length === 0}
                >
                  Clear
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={openCleanupDialog}
                  disabled={testResults.filter(r => r.createdCampaign).length === 0}
                >
                  Cleanup
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Running Tests */}
        {runningTests.size > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Running Tests ({runningTests.size})
            </Typography>
            {Array.from(runningTests.values()).map(test => (
              <Paper key={test.testId} sx={{ p: 2, mb: 1 }} variant="outlined">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={20} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1">{test.scenarioId}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {test.progressMessage}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={test.progress}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  {test.logs.length > 0 && (
                    <Button size="small" onClick={() => showLogs(test.logs)}>
                      View Logs
                    </Button>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        )}

        {/* Real-Time Error Display - Shows errors from failed/error tests */}
        {testResults.filter(r => r.status === 'failed' || r.status === 'error').length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
              <Error sx={{ mr: 1 }} />
              Errors & Failures ({testResults.filter(r => r.status === 'failed' || r.status === 'error').length})
            </Typography>
            <Paper sx={{ maxHeight: 400, overflow: 'auto', bgcolor: '#fff5f5', border: '1px solid', borderColor: 'error.light' }}>
              {testResults.filter(r => r.status === 'failed' || r.status === 'error').slice().reverse().map((result, index) => (
                <Box
                  key={result.testId || index}
                  sx={{
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'error.light',
                    '&:last-child': { borderBottom: 'none' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      icon={result.status === 'error' ? <Warning /> : <Error />}
                      label={result.status.toUpperCase()}
                      color={result.status === 'error' ? 'warning' : 'error'}
                      size="small"
                    />
                    <Typography variant="subtitle2" fontWeight="bold">
                      {result.scenarioName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({result.durationFormatted || `${(result.duration ? result.duration / 1000 : 0).toFixed(1)}s`})
                    </Typography>
                  </Box>

                  {/* Show main error */}
                  {result.error && (
                    <Alert severity="error" sx={{ mb: 1, py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {result.error}
                      </Typography>
                    </Alert>
                  )}

                  {/* Show verification issues */}
                  {result.verification?.issues && result.verification.issues.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      {result.verification.issues.map((issue, i) => (
                        <Alert key={i} severity="warning" sx={{ mb: 0.5, py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '12px' }}>
                            {issue.type === 'count_mismatch' && (
                              <>
                                <strong>{issue.entity}:</strong> Expected {issue.expected}, got {issue.actual}
                              </>
                            )}
                            {issue.type === 'verification_error' && issue.message}
                          </Typography>
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {/* Show expected vs actual if available */}
                  {result.expected && result.actual && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '12px' }}>
                        <strong>Expected:</strong> {result.expected.campaigns} camp, {result.expected.adSets} adsets, {result.expected.ads} ads
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '12px' }}>
                        <strong>Actual:</strong> {result.actual.campaigns} camp, {result.actual.adSets} adsets, {result.actual.ads} ads
                      </Typography>
                    </Box>
                  )}

                  {/* Show error logs (filter for errors/warnings) */}
                  {result.logs && result.logs.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                        Relevant Logs:
                      </Typography>
                      <Box sx={{
                        bgcolor: '#1c1e21',
                        color: '#fff',
                        p: 1,
                        borderRadius: 1,
                        mt: 0.5,
                        maxHeight: 150,
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '11px'
                      }}>
                        {result.logs
                          .filter((log: LogEntry | string) => {
                            const message = typeof log === 'string' ? log : log.message;
                            return message.toLowerCase().includes('error') ||
                                   message.toLowerCase().includes('fail') ||
                                   message.toLowerCase().includes('warning') ||
                                   message.toLowerCase().includes('exception');
                          })
                          .slice(-10) // Show last 10 error-related logs
                          .map((log: LogEntry | string, i: number) => (
                            <Box key={i} sx={{ mb: 0.5 }}>
                              {typeof log === 'string' ? log : (
                                <>
                                  <span style={{ color: '#888' }}>{new Date(log.time).toLocaleTimeString()}</span>
                                  {' '}{log.message}
                                </>
                              )}
                            </Box>
                          ))}
                        {result.logs.filter((log: LogEntry | string) => {
                          const message = typeof log === 'string' ? log : log.message;
                          return message.toLowerCase().includes('error') ||
                                 message.toLowerCase().includes('fail') ||
                                 message.toLowerCase().includes('warning');
                        }).length === 0 && (
                          <Typography variant="caption" color="grey.500">
                            No error-specific logs. Click "View Logs" below for full log.
                          </Typography>
                        )}
                      </Box>
                      <Button
                        size="small"
                        sx={{ mt: 0.5 }}
                        onClick={() => showLogs(result.logs!.map((l: LogEntry | string) => typeof l === 'string' ? l : `${l.time}: ${l.message}`))}
                      >
                        View Full Logs
                      </Button>
                    </Box>
                  )}
                </Box>
              ))}
            </Paper>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Test Scenarios */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Test Scenarios</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Badge badgeContent={selectedScenarios.length} color="primary">
                <Button
                  variant="contained"
                  startIcon={<PlaylistPlay />}
                  onClick={runSelectedTests}
                  disabled={selectedScenarios.length === 0 || !statusData.hasAuth}
                >
                  Run Selected
                </Button>
              </Badge>
            </Box>
          </Box>

          {/* Multi-account selection - Show if there are any ad accounts */}
          {statusData.allAdAccounts && statusData.allAdAccounts.length > 0 && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Run on Additional Accounts (optional)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Select accounts to run tests on multiple ad accounts. Leave empty to use only the active account.
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Select Ad Accounts</InputLabel>
                <Select
                  multiple
                  value={selectedAccounts}
                  onChange={(e) => setSelectedAccounts(e.target.value as string[])}
                  label="Select Ad Accounts"
                  renderValue={(selected) => `${selected.length} account(s) selected`}
                >
                  {statusData.allAdAccounts.map((account: AdAccount) => (
                    <MenuItem key={account.account_id || account.id} value={account.account_id || account.id}>
                      <Checkbox checked={selectedAccounts.includes(account.account_id || account.id)} />
                      {account.name} ({account.account_id || account.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedAccounts.length > 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Tests will run on {selectedAccounts.length} additional account(s) using the active Page and Pixel.
                </Alert>
              )}
            </Box>
          )}

          {/* Scenario Categories */}
          {Object.entries(statusData.scenarios).map(([category, scenarios]) => (
            <Accordion key={category} defaultExpanded={category === 'Strategy 150'}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="subtitle1">{category}</Typography>
                  <Chip label={`${scenarios.length} tests`} size="small" />
                  <Box sx={{ flex: 1 }} />
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAllInCategory(scenarios);
                    }}
                  >
                    {scenarios.every(s => selectedScenarios.includes(s.id)) ? 'Deselect All' : 'Select All'}
                  </Button>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={scenarios.every(s => selectedScenarios.includes(s.id))}
                            indeterminate={
                              scenarios.some(s => selectedScenarios.includes(s.id)) &&
                              !scenarios.every(s => selectedScenarios.includes(s.id))
                            }
                            onChange={() => selectAllInCategory(scenarios)}
                          />
                        </TableCell>
                        <TableCell>Scenario</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Media Type</TableCell>
                        <TableCell>Ad Sets</TableCell>
                        <TableCell>Ads</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scenarios.map(scenario => (
                        <TableRow key={scenario.id}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedScenarios.includes(scenario.id)}
                              onChange={() => toggleScenario(scenario.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {scenario.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {scenario.id}
                            </Typography>
                          </TableCell>
                          <TableCell>{scenario.description}</TableCell>
                          <TableCell>
                            <Chip
                              label={scenario.mediaType || 'N/A'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{scenario.adSetCount || 1}</TableCell>
                          <TableCell>{scenario.adCount || scenario.adSetCount || 1}</TableCell>
                          <TableCell>
                            <Tooltip title="Run this test">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => runTest(scenario.id)}
                                disabled={!statusData.hasAuth}
                              >
                                <PlayArrow />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Test Results */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Test Results ({testResults.length})
          </Typography>

          {testResults.length === 0 ? (
            <Alert severity="info">No test results yet. Run some tests to see results here.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Scenario</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Campaign</TableCell>
                    <TableCell>Verification</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testResults.slice().reverse().map((result, index) => (
                    <TableRow key={result.testId || index}>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(result.status)}
                          label={result.status}
                          color={getStatusColor(result.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{result.scenarioName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {result.scenarioId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {result.duration ? `${(result.duration / 1000).toFixed(1)}s` : '-'}
                      </TableCell>
                      <TableCell>
                        {result.createdCampaign ? (
                          <Box>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {result.createdCampaign.campaignName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {result.createdCampaign.campaignId}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.verification ? (
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {result.verification.adSetsMatch ? (
                                <CheckCircle fontSize="small" color="success" />
                              ) : (
                                <Error fontSize="small" color="error" />
                              )}
                              <Typography variant="caption">
                                Ad Sets: {result.verification.actualAdSets}/{result.verification.expectedAdSets}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {result.verification.adsMatch ? (
                                <CheckCircle fontSize="small" color="success" />
                              ) : (
                                <Error fontSize="small" color="error" />
                              )}
                              <Typography variant="caption">
                                Ads: {result.verification.actualAds}/{result.verification.expectedAds}
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.logs && result.logs.length > 0 && (
                          <Tooltip title="View Logs">
                            <IconButton size="small" onClick={() => showLogs(result.logs!)}>
                              <Info />
                            </IconButton>
                          </Tooltip>
                        )}
                        {result.error && (
                          <Tooltip title={result.error}>
                            <IconButton size="small" color="error">
                              <Error />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Logs Dialog */}
      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Test Logs</DialogTitle>
        <DialogContent>
          <List dense>
            {selectedLogs.map((log, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Info fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={log}
                  primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialogOpen} onClose={() => setCleanupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cleanup Test Campaigns</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will delete the following test campaigns from Facebook:
          </Alert>
          <List dense>
            {campaignsToCleanup.map(id => (
              <ListItem key={id}>
                <ListItemIcon>
                  <Campaign />
                </ListItemIcon>
                <ListItemText primary={id} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={cleanupCampaigns}
            variant="contained"
            color="error"
            startIcon={<Delete />}
          >
            Delete {campaignsToCleanup.length} Campaigns
          </Button>
        </DialogActions>
      </Dialog>

      {/* Media Management Dialog */}
      <Dialog open={mediaDialogOpen} onClose={() => setMediaDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CloudUpload sx={{ mr: 1 }} />
              Manage Test Media
            </Box>
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<Delete />}
              onClick={handleDeleteAllMedia}
              disabled={uploading || (statusData?.media.images === 0 && statusData?.media.videos === 0)}
            >
              Delete All
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Upload images (.jpg, .png, .webp) and videos (.mp4, .mov) for testing.
            Tests will automatically use the appropriate media type.
          </Alert>

          {/* Upload Section */}
          <Box sx={{ mb: 3, p: 2, border: '2px dashed', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo"
              onChange={handleMediaUpload}
              style={{ display: 'none' }}
              id="media-dialog-upload-input"
            />
            <label htmlFor="media-dialog-upload-input">
              <Button
                variant="contained"
                component="span"
                startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />}
                disabled={uploading}
                size="large"
              >
                {uploading ? 'Uploading...' : 'Select Files to Upload'}
              </Button>
            </label>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Max 200MB per file. Multiple files supported.
            </Typography>
          </Box>

          {/* Images Section */}
          {statusData && statusData.media.imageFiles && statusData.media.imageFiles.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Image sx={{ mr: 1 }} color="primary" />
                Images ({statusData.media.imageFiles.length})
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                {statusData.media.imageFiles.map((filename: string) => (
                  <ListItem
                    key={filename}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDeleteMedia(filename)}
                        disabled={deletingMedia === filename}
                      >
                        {deletingMedia === filename ? <CircularProgress size={16} /> : <Delete fontSize="small" />}
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <Image fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={filename}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Videos Section */}
          {statusData && statusData.media.videoFiles && statusData.media.videoFiles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <VideoLibrary sx={{ mr: 1 }} color="secondary" />
                Videos ({statusData.media.videoFiles.length})
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                {statusData.media.videoFiles.map((filename: string) => (
                  <ListItem
                    key={filename}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDeleteMedia(filename)}
                        disabled={deletingMedia === filename}
                      >
                        {deletingMedia === filename ? <CircularProgress size={16} /> : <Delete fontSize="small" />}
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <VideoLibrary fontSize="small" color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={filename}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* No Media Message */}
          {statusData && statusData.media.images === 0 && statusData.media.videos === 0 && (
            <Alert severity="warning">
              No media files uploaded yet. Upload images and videos to run test scenarios.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMediaDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminTestDashboard;
