/**
 * PatternsPanel.tsx
 *
 * Displays learned patterns, source accounts, and top performers.
 * Shows pattern types, confidence levels, and recommendations.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ExpandMore,
  Refresh,
  TrendingUp,
  Schedule,
  Groups,
  Lightbulb,
  Psychology,
  AutoGraph,
  Timer,
  Category,
  EmojiEvents,
  AccountBalance,
  Campaign,
} from '@mui/icons-material';
import { intelligenceApi, Pattern } from '../../services/intelligenceApi';
import { toast } from 'react-toastify';

interface PatternsPanelProps {
  onRefresh?: () => void;
}

interface SourceAccount {
  id: string;
  name: string;
}

interface TopPerformer {
  ad_account_id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  metrics: {
    spend: string;
    revenue: string;
    conversions: number;
    impressions: number;
    clicks: number;
    roas: string;
    cpa: string;
    ctr: string;
    cpc: string;
  };
  data_points: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const PatternsPanel: React.FC<PatternsPanelProps> = ({ onRefresh }) => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [sourceAccounts, setSourceAccounts] = useState<SourceAccount[]>([]);
  const [summary, setSummary] = useState<{
    total_patterns: number;
    by_type: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Top performers state
  const [topPerformers, setTopPerformers] = useState<{
    campaigns: TopPerformer[];
    adsets: TopPerformer[];
    ads: TopPerformer[];
  }>({ campaigns: [], adsets: [], ads: [] });
  const [performersLoading, setPerformersLoading] = useState(false);
  const [performerMetric, setPerformerMetric] = useState<string>('roas');
  const [performerDays, setPerformerDays] = useState<number>(30);

  useEffect(() => {
    fetchPatterns();
    fetchTopPerformers();
  }, []);

  useEffect(() => {
    fetchTopPerformers();
  }, [performerMetric, performerDays]);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await intelligenceApi.getPatterns();
      if (response.success) {
        // Handle both 'patterns' and 'insights' keys for backwards compatibility
        setPatterns(response.patterns || response.insights || []);
        setSourceAccounts(response.source_accounts || []);
        setSummary({
          total_patterns: response.total_patterns || 0,
          by_type: response.by_type || {}
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch patterns');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopPerformers = async () => {
    try {
      setPerformersLoading(true);
      const response = await intelligenceApi.getTopPerformers({
        metric: performerMetric as any,
        days: performerDays,
        limit: 20,
        entity_type: 'all',
        min_spend: 10
      });
      if (response.success) {
        setTopPerformers({
          campaigns: response.top_campaigns || [],
          adsets: response.top_ad_sets || [],
          ads: response.top_ads || []
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch top performers:', err);
    } finally {
      setPerformersLoading(false);
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'time_performance':
        return <Schedule color="primary" />;
      case 'audience_cluster':
      case 'cluster':
        return <Groups color="secondary" />;
      case 'creative_performance':
        return <AutoGraph color="success" />;
      case 'budget_optimization':
      case 'budget_correlation':
        return <TrendingUp color="warning" />;
      case 'winner_profile':
        return <EmojiEvents color="success" />;
      case 'loser_profile':
        return <TrendingUp color="error" />;
      case 'audience_fatigue':
        return <Groups color="warning" />;
      default:
        return <Psychology color="action" />;
    }
  };

  const getConfidenceColor = (confidence: string): 'success' | 'warning' | 'error' => {
    const value = parseInt(confidence) || 0;
    if (value >= 70) return 'success';
    if (value >= 40) return 'warning';
    return 'error';
  };

  const getConfidenceValue = (confidence: string): number => {
    // Handle "85%" format
    const match = confidence.match(/(\d+)/);
    return match ? parseInt(match[1]) : 50;
  };

  const formatPatternType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatValidUntil = (dateStr: string) => {
    if (!dateStr) return 'No expiration';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Valid for ${diffDays} days`;
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
        <IconButton color="inherit" size="small" onClick={fetchPatterns}>
          <Refresh />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<Psychology />} label="Patterns" iconPosition="start" />
          <Tab icon={<EmojiEvents />} label="Top Performers" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Patterns Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Summary Section */}
        {summary && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Psychology sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6">
                  Learned Patterns
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The intelligence engine has identified {summary.total_patterns} patterns from your campaign data
                </Typography>
              </Box>
            </Box>

            {/* Pattern Type Breakdown */}
            <Grid container spacing={2}>
              {Object.entries(summary.by_type).map(([type, count]) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={type}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getPatternIcon(type)}
                        <Box>
                          <Typography variant="h6">{count}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatPatternType(type)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Source Accounts */}
            {sourceAccounts.length > 0 && (
              <Box mt={3}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  <AccountBalance fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Patterns learned from {sourceAccounts.length} account(s):
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                  {sourceAccounts.map((acc) => (
                    <Chip
                      key={acc.id}
                      label={acc.name || acc.id}
                      size="small"
                      variant="outlined"
                      icon={<AccountBalance />}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        )}

        {/* Pattern List */}
        {patterns.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Lightbulb sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Patterns Detected Yet
            </Typography>
            <Typography color="text.secondary">
              The intelligence engine needs more data to identify patterns.
              Run a data backfill and patterns will appear as data is collected and analyzed.
            </Typography>
          </Paper>
        ) : (
          <Box>
            {patterns.map((pattern, index) => (
              <Accordion key={pattern.id || index} defaultExpanded={index === 0}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" gap={2} width="100%">
                    {getPatternIcon(pattern.type)}
                    <Box flexGrow={1}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {pattern.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatPatternType(pattern.type)}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={pattern.confidence}
                        size="small"
                        color={getConfidenceColor(pattern.confidence)}
                      />
                      <Chip
                        icon={<Category />}
                        label={`${pattern.sample_size} samples`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid size={12}>
                      <Typography variant="body2" paragraph>
                        {pattern.description}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box mb={2}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          Confidence Level
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={getConfidenceValue(pattern.confidence)}
                            color={getConfidenceColor(pattern.confidence)}
                            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="body2" fontWeight="medium">
                            {pattern.confidence}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box mb={2}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          Sample Size
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Category fontSize="small" color="action" />
                          <Typography variant="body2">
                            Based on {pattern.sample_size} data points
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>

                    <Grid size={12}>
                      <Divider sx={{ my: 1 }} />
                      <Box display="flex" alignItems="center" gap={1}>
                        <Timer fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {formatValidUntil(pattern.valid_until)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Info Alert */}
        <Alert severity="info" sx={{ mt: 3 }} icon={<Psychology />}>
          <Typography variant="body2">
            <strong>How patterns work:</strong> The intelligence engine uses K-means clustering
            and statistical analysis to identify patterns in your campaign performance data.
            Patterns are continuously updated as new data is collected.
          </Typography>
        </Alert>
      </TabPanel>

      {/* Top Performers Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <EmojiEvents sx={{ fontSize: 40, color: 'warning.main' }} />
              <Box>
                <Typography variant="h6">Top Performers</Typography>
                <Typography variant="body2" color="text.secondary">
                  Best performing campaigns, ad sets, and ads based on your metrics
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Metric</InputLabel>
                <Select
                  value={performerMetric}
                  label="Metric"
                  onChange={(e) => setPerformerMetric(e.target.value)}
                >
                  <MenuItem value="roas">ROAS</MenuItem>
                  <MenuItem value="ctr">CTR</MenuItem>
                  <MenuItem value="cpc">CPC</MenuItem>
                  <MenuItem value="conversions">Conversions</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Days</InputLabel>
                <Select
                  value={performerDays}
                  label="Days"
                  onChange={(e) => setPerformerDays(e.target.value as number)}
                >
                  <MenuItem value={7}>7 Days</MenuItem>
                  <MenuItem value={14}>14 Days</MenuItem>
                  <MenuItem value={30}>30 Days</MenuItem>
                  <MenuItem value={60}>60 Days</MenuItem>
                  <MenuItem value={90}>90 Days</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Paper>

        {performersLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Top Campaigns */}
            {topPerformers.campaigns.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  <Campaign sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Top Campaigns
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Campaign</TableCell>
                        <TableCell>Account</TableCell>
                        <TableCell align="right">Spend</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">ROAS</TableCell>
                        <TableCell align="right">Conv.</TableCell>
                        <TableCell align="right">CTR</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topPerformers.campaigns.slice(0, 10).map((p, idx) => (
                        <TableRow key={p.entity_id} sx={{ bgcolor: idx === 0 ? 'success.light' : 'inherit' }}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {idx === 0 && <EmojiEvents color="warning" fontSize="small" />}
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {p.entity_name || p.entity_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {p.ad_account_id}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">${p.metrics.spend}</TableCell>
                          <TableCell align="right">${p.metrics.revenue}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${p.metrics.roas}x`}
                              size="small"
                              color={parseFloat(p.metrics.roas) >= 2 ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">{p.metrics.conversions}</TableCell>
                          <TableCell align="right">{p.metrics.ctr}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Top Ad Sets */}
            {topPerformers.adsets.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  <Groups sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Top Ad Sets
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Ad Set</TableCell>
                        <TableCell align="right">Spend</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">ROAS</TableCell>
                        <TableCell align="right">Conv.</TableCell>
                        <TableCell align="right">CTR</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topPerformers.adsets.slice(0, 10).map((p, idx) => (
                        <TableRow key={p.entity_id} sx={{ bgcolor: idx === 0 ? 'success.light' : 'inherit' }}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {idx === 0 && <EmojiEvents color="warning" fontSize="small" />}
                              <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                                {p.entity_name || p.entity_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">${p.metrics.spend}</TableCell>
                          <TableCell align="right">${p.metrics.revenue}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${p.metrics.roas}x`}
                              size="small"
                              color={parseFloat(p.metrics.roas) >= 2 ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">{p.metrics.conversions}</TableCell>
                          <TableCell align="right">{p.metrics.ctr}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Top Ads */}
            {topPerformers.ads.length > 0 && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  <AutoGraph sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Top Ads
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Ad</TableCell>
                        <TableCell align="right">Spend</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">ROAS</TableCell>
                        <TableCell align="right">Conv.</TableCell>
                        <TableCell align="right">CTR</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topPerformers.ads.slice(0, 10).map((p, idx) => (
                        <TableRow key={p.entity_id} sx={{ bgcolor: idx === 0 ? 'success.light' : 'inherit' }}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {idx === 0 && <EmojiEvents color="warning" fontSize="small" />}
                              <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                                {p.entity_name || p.entity_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">${p.metrics.spend}</TableCell>
                          <TableCell align="right">${p.metrics.revenue}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${p.metrics.roas}x`}
                              size="small"
                              color={parseFloat(p.metrics.roas) >= 2 ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">{p.metrics.conversions}</TableCell>
                          <TableCell align="right">{p.metrics.ctr}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* No data */}
            {topPerformers.campaigns.length === 0 && topPerformers.adsets.length === 0 && topPerformers.ads.length === 0 && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <EmojiEvents sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Performance Data Yet
                </Typography>
                <Typography color="text.secondary">
                  Run a data backfill to collect performance data from your ad accounts.
                  Top performers will appear once data is collected.
                </Typography>
              </Paper>
            )}
          </>
        )}
      </TabPanel>

      {/* Refresh Button */}
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Tooltip title="Refresh data">
          <IconButton onClick={() => { fetchPatterns(); fetchTopPerformers(); }}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default PatternsPanel;
