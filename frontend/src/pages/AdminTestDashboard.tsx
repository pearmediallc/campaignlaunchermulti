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

interface TestResult {
  testId: string;
  scenarioId: string;
  scenarioName: string;
  status: 'passed' | 'failed' | 'error';
  startTime: string;
  endTime?: string;
  duration?: number;
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
  };
  logs?: string[];
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

  // Check if user is admin
  const isAdmin = user?.roles?.some((role: any) =>
    typeof role === 'string' ? role === 'admin' : role.name === 'admin'
  );

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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudUpload sx={{ mr: 1 }} />
                <Typography variant="h6">Available Media</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 3 }}>
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
              {(statusData.media.images === 0 && statusData.media.videos === 0) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No media files found in backend/uploads. Some tests may fail.
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

          {/* Multi-account selection */}
          {statusData.allAdAccounts.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Run on Additional Accounts (optional)</InputLabel>
                <Select
                  multiple
                  value={selectedAccounts}
                  onChange={(e) => setSelectedAccounts(e.target.value as string[])}
                  label="Run on Additional Accounts (optional)"
                >
                  {statusData.allAdAccounts.map(account => (
                    <MenuItem key={account.account_id} value={account.account_id}>
                      {account.name} ({account.account_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
    </Box>
  );
};

export default AdminTestDashboard;
