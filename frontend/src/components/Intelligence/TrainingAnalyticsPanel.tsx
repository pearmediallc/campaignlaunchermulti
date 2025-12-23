/**
 * TrainingAnalyticsPanel.tsx
 *
 * Displays training progress and analytics for the intelligence engine.
 * Shows data collection progress, pattern learning status, and visualizations.
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
  LinearProgress,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Refresh,
  Psychology,
  DataUsage,
  School,
  TrendingUp,
  CheckCircle,
  Warning,
  BubbleChart,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';
import { intelligenceApi, TrainingStatus, TrainingHistory } from '../../services/intelligenceApi';

interface TrainingAnalyticsPanelProps {
  onRefresh?: () => void;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];

const TrainingAnalyticsPanel: React.FC<TrainingAnalyticsPanelProps> = ({ onRefresh }) => {
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null);
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory[]>([]);
  const [clusterData, setClusterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, historyRes, clusterRes] = await Promise.all([
        intelligenceApi.getTrainingStatus(),
        intelligenceApi.getTrainingHistory(30),
        intelligenceApi.getClusterData()
      ]);

      if (statusRes.success) {
        setTrainingStatus(statusRes.status);
      }
      if (historyRes.success) {
        // Wrap history in array if needed
        const history = historyRes.history;
        setTrainingHistory(Array.isArray(history) ? history : [history]);
      }
      if (clusterRes.success) {
        setClusterData(clusterRes.clusters);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch training analytics');
    } finally {
      setLoading(false);
    }
  };

  const getReadinessColor = (readiness: number): 'success' | 'warning' | 'error' => {
    if (readiness >= 80) return 'success';
    if (readiness >= 50) return 'warning';
    return 'error';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
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
        <IconButton color="inherit" size="small" onClick={fetchData}>
          <Refresh />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Status Overview */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <School sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h6">
              Training Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor the intelligence engine's learning progress
            </Typography>
          </Box>
        </Box>

        {/* Key Metrics */}
        {trainingStatus && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <DataUsage sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {formatNumber(trainingStatus.data_points)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Data Points
                  </Typography>
                  <Box mt={1}>
                    <LinearProgress
                      variant="determinate"
                      value={trainingStatus.data_readiness ?? 0}
                      color={getReadinessColor(trainingStatus.data_readiness ?? 0)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {trainingStatus.data_readiness ?? 0}% of {trainingStatus.min_required ?? 100} min
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Psychology sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {trainingStatus.patterns_learned ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Patterns Learned
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {trainingStatus.expert_rules ?? trainingStatus.expert_rules_loaded ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Expert Rules
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <TrendingUp sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {trainingStatus.average_confidence ?? 0}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg Confidence
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Charts Row 1: Data Collection Progress */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Data Collection Over Time
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Cumulative data points collected for training
            </Typography>

            {trainingHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trainingHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    formatter={(value: any) => [formatNumber(Number(value) || 0), 'Data Points']}
                    labelFormatter={(label: any) => new Date(label).toLocaleDateString()}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total_points"
                    name="Total Data Points"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                  <Line
                    type="monotone"
                    dataKey="daily_points"
                    name="Daily Collection"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography color="text.secondary">
                  No data collection history yet
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Pattern Breakdown
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Learned patterns by type
            </Typography>

            {trainingStatus?.pattern_breakdown && Object.keys(trainingStatus.pattern_breakdown).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={Object.entries(trainingStatus.pattern_breakdown).map(([type, count]) => ({
                    type: type.replace(/_/g, ' '),
                    count
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={100} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
                    {Object.entries(trainingStatus.pattern_breakdown).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height={250}>
                <Typography color="text.secondary">
                  No patterns learned yet
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2: Cluster Visualization */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <BubbleChart sx={{ mr: 1, verticalAlign: 'middle' }} />
              Performance Clusters
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              K-means clustering of ad sets by performance metrics
            </Typography>

            {clusterData ? (
              <>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {clusterData.cluster_descriptions?.map((desc: string, idx: number) => (
                    <Chip
                      key={idx}
                      label={desc}
                      size="small"
                      sx={{ backgroundColor: COLORS[idx % COLORS.length], color: 'white' }}
                    />
                  ))}
                </Box>

                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="x"
                      name="CPM (normalized)"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'CPM', position: 'bottom', fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="y"
                      name="ROAS (normalized)"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'ROAS', angle: -90, position: 'left', fontSize: 12 }}
                    />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                    {clusterData.centroids?.map((centroid: number[], idx: number) => (
                      <Scatter
                        key={idx}
                        name={`Cluster ${idx + 1}`}
                        data={[{ x: centroid[0] || 0, y: centroid[4] || 0 }]}
                        fill={COLORS[idx % COLORS.length]}
                      >
                        <Cell fill={COLORS[idx % COLORS.length]} />
                      </Scatter>
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Features: {clusterData.feature_names?.join(', ')}
                  </Typography>
                </Box>
              </>
            ) : (
              <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={300}>
                <Warning sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                <Typography color="text.secondary" textAlign="center">
                  Not enough data for clustering.
                  <br />
                  At least 50 data points with spend required.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Training Readiness
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Status of different training components
            </Typography>

            <Box>
              {/* Data Readiness */}
              <Box mb={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Data Collection</Typography>
                  <Chip
                    label={(trainingStatus?.data_readiness ?? 0) >= 100 ? 'Ready' : 'Collecting'}
                    size="small"
                    color={(trainingStatus?.data_readiness ?? 0) >= 100 ? 'success' : 'warning'}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, trainingStatus?.data_readiness ?? 0)}
                  sx={{ height: 10, borderRadius: 5 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {trainingStatus?.data_points ?? 0} / {trainingStatus?.min_required ?? 100} data points
                </Typography>
              </Box>

              {/* Pattern Learning */}
              <Box mb={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Pattern Learning</Typography>
                  <Chip
                    label={(trainingStatus?.patterns_learned ?? 0) > 0 ? 'Active' : 'Pending'}
                    size="small"
                    color={(trainingStatus?.patterns_learned ?? 0) > 0 ? 'success' : 'default'}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(trainingStatus?.patterns_learned ?? 0) > 0 ? 100 : 0}
                  sx={{ height: 10, borderRadius: 5 }}
                  color={(trainingStatus?.patterns_learned ?? 0) > 0 ? 'success' : 'inherit'}
                />
                <Typography variant="caption" color="text.secondary">
                  {trainingStatus?.patterns_learned ?? 0} patterns identified
                </Typography>
              </Box>

              {/* Expert Rules Integration */}
              <Box mb={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Expert Rules</Typography>
                  <Chip
                    label={(trainingStatus?.expert_rules ?? trainingStatus?.expert_rules_loaded ?? 0) > 0 ? 'Loaded' : 'Not Seeded'}
                    size="small"
                    color={(trainingStatus?.expert_rules ?? trainingStatus?.expert_rules_loaded ?? 0) > 0 ? 'success' : 'error'}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(trainingStatus?.expert_rules ?? trainingStatus?.expert_rules_loaded ?? 0) > 0 ? 100 : 0}
                  sx={{ height: 10, borderRadius: 5 }}
                  color={(trainingStatus?.expert_rules ?? trainingStatus?.expert_rules_loaded ?? 0) > 0 ? 'success' : 'error'}
                />
                <Typography variant="caption" color="text.secondary">
                  {trainingStatus?.expert_rules ?? trainingStatus?.expert_rules_loaded ?? 0} expert rules available
                </Typography>
              </Box>

              {/* Backfill Status */}
              {trainingStatus?.backfill && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Historical Backfill</Typography>
                    <Chip
                      label={(trainingStatus.backfill.completed ?? 0) === (trainingStatus.backfill.total_accounts ?? 0) ? 'Complete' : 'In Progress'}
                      size="small"
                      color={(trainingStatus.backfill.completed ?? 0) === (trainingStatus.backfill.total_accounts ?? 0) ? 'success' : 'info'}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={trainingStatus.backfill.overall_progress ?? trainingStatus.backfill.progress ?? 0}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {trainingStatus.backfill.completed ?? 0} / {trainingStatus.backfill.total_accounts ?? 0} accounts
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Info Alert */}
      <Alert severity="info" icon={<School />}>
        <Typography variant="body2">
          <strong>How training works:</strong> The intelligence engine collects performance data hourly
          and runs pattern learning daily. As more data is collected, pattern confidence increases.
          Expert rules provide a baseline that is validated against actual performance.
        </Typography>
      </Alert>

      {/* Refresh Button */}
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Tooltip title="Refresh analytics">
          <IconButton onClick={fetchData}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default TrainingAnalyticsPanel;
