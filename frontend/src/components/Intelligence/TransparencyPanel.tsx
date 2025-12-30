/**
 * TransparencyPanel
 *
 * Shows complete transparency into what data is being used for training,
 * which accounts contribute data, and how patterns are learned.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  Refresh,
  Storage,
  School,
  AccountCircle,
  Timeline,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  TrendingUp,
  DataUsage
} from '@mui/icons-material';
import intelligenceApi from '../../services/intelligenceApi';

interface TransparencyData {
  data_sources: {
    total_data_points: number;
    total_entities: number;
    accounts_with_data: number;
    accounts: Array<{
      ad_account_id: string;
      data_points: number;
      unique_entities: number;
      date_range: { from: string; to: string };
      total_spend: string;
      total_revenue: string;
    }>;
  };
  backfill: {
    summary: {
      total: number;
      completed: number;
      in_progress: number;
      failed: number;
      pending: number;
    };
    accounts: Array<{
      ad_account_id: string;
      status: string;
      progress: number;
      days_completed: number;
      total_days: number;
    }>;
  };
  patterns: {
    total: number;
    learned_from_data: number;
    from_expert_rules: number;
    details: Array<{
      id: number;
      type: string;
      name: string;
      description: string;
      sample_size: number;
      confidence: string;
      created_at: string;
      valid_until: string;
      data_source: string;
      is_expert_rule: boolean;
      accounts_used: string;
      key_metrics: any;
    }>;
  };
  account_scores: {
    total_scored: number;
    accounts: Array<{
      ad_account_id: string;
      overall_score: number;
      score_date: string;
      components: {
        performance: number;
        efficiency: number;
        pixel_health: number;
        learning: number;
        consistency: number;
      };
    }>;
  };
  pixel_health: {
    total_unique_pixels: number;
    pixels: Array<{
      pixel_id: string;
      pixel_name: string;
      ad_account_id: string;
      emq: number | null;
      is_active: boolean;
      last_snapshot: string;
      events: {
        page_views: number;
        view_content: number;
        add_to_cart: number;
        purchases: number;
      };
    }>;
  };
  expert_rules: {
    summary: Record<string, number>;
    total: number;
  };
  training_readiness: {
    data_status: string;
    min_data_for_patterns: number;
    current_data: number;
    patterns_active: number;
    accounts_scored: number;
    backfill_completion: number;
  };
}

const TransparencyPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TransparencyData | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await intelligenceApi.getTransparencyDashboard();
      if (response.success) {
        setData(response.transparency);
      } else {
        setError('Failed to load transparency data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transparency data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />;
      case 'in_progress':
        return <CircularProgress size={16} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 18 }} />;
      default:
        return <Warning sx={{ color: 'warning.main', fontSize: 18 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'learning':
        return 'info';
      case 'collecting':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton size="small" onClick={fetchData}>
          <Refresh />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return <Alert severity="info">No transparency data available</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Training Transparency Dashboard
        </Typography>
        <Tooltip title="Refresh data">
          <IconButton onClick={fetchData}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Training Readiness Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
          <DataUsage /> Training Readiness
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">Data Status</Typography>
                <Box display="flex" alignItems="center" gap={1} mt={1}>
                  <Chip
                    label={data.training_readiness.data_status.toUpperCase()}
                    color={getStatusColor(data.training_readiness.data_status) as any}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">Total Data Points</Typography>
                <Typography variant="h4">{data.training_readiness.current_data.toLocaleString()}</Typography>
                <Typography variant="caption" color="textSecondary">
                  Min required: {data.training_readiness.min_data_for_patterns}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">Active Patterns</Typography>
                <Typography variant="h4">{data.training_readiness.patterns_active}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">Backfill Completion</Typography>
                <Typography variant="h4">{data.training_readiness.backfill_completion}%</Typography>
                <LinearProgress
                  variant="determinate"
                  value={data.training_readiness.backfill_completion}
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Sources */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Storage color="primary" />
            <Typography variant="h6">
              Data Sources ({data.data_sources.accounts_with_data} accounts, {data.data_sources.total_data_points.toLocaleString()} data points)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Account ID</TableCell>
                  <TableCell align="right">Data Points</TableCell>
                  <TableCell align="right">Unique Entities</TableCell>
                  <TableCell>Date Range</TableCell>
                  <TableCell align="right">Total Spend</TableCell>
                  <TableCell align="right">Total Revenue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data_sources.accounts.slice(0, 20).map((acc) => (
                  <TableRow key={acc.ad_account_id}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {acc.ad_account_id}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{acc.data_points.toLocaleString()}</TableCell>
                    <TableCell align="right">{acc.unique_entities}</TableCell>
                    <TableCell>
                      {acc.date_range.from} - {acc.date_range.to}
                    </TableCell>
                    <TableCell align="right">${parseFloat(acc.total_spend).toLocaleString()}</TableCell>
                    <TableCell align="right">${parseFloat(acc.total_revenue).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {data.data_sources.accounts.length > 20 && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Showing 20 of {data.data_sources.accounts.length} accounts
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Patterns */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <School color="primary" />
            <Typography variant="h6">
              Learned Patterns ({data.patterns.total} total: {data.patterns.learned_from_data} from data, {data.patterns.from_expert_rules} from expert rules)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Expert Rules</strong> are static rules with "1 sample" - they provide baseline thresholds from domain knowledge.
              <br />
              <strong>Learned Patterns</strong> are dynamically trained from your actual performance data.
            </Typography>
          </Alert>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pattern Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Data Source</TableCell>
                  <TableCell align="right">Sample Size</TableCell>
                  <TableCell align="right">Confidence</TableCell>
                  <TableCell>Valid Until</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.patterns.details.map((pattern) => (
                  <TableRow key={pattern.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {pattern.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {pattern.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pattern.type.replace(/_/g, ' ')}
                        size="small"
                        color={pattern.is_expert_rule ? 'warning' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={pattern.is_expert_rule ? 'warning.main' : 'success.main'}>
                        {pattern.data_source}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={pattern.sample_size > 100 ? 'bold' : 'normal'}
                        color={pattern.sample_size < 10 ? 'warning.main' : 'inherit'}
                      >
                        {pattern.sample_size.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{pattern.confidence}</TableCell>
                    <TableCell>
                      {new Date(pattern.valid_until).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Account Scores */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <AccountCircle color="primary" />
            <Typography variant="h6">
              Account Scores ({data.account_scores.total_scored} accounts scored)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {data.account_scores.total_scored === 0 ? (
            <Alert severity="warning">
              No account scores calculated yet. Click "Calculate Account Scores" in the Account Scores tab to generate scores for all backfilled accounts.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Account ID</TableCell>
                    <TableCell align="right">Overall Score</TableCell>
                    <TableCell align="right">Performance</TableCell>
                    <TableCell align="right">Efficiency</TableCell>
                    <TableCell align="right">Pixel Health</TableCell>
                    <TableCell align="right">Learning</TableCell>
                    <TableCell align="right">Consistency</TableCell>
                    <TableCell>Score Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.account_scores.accounts.slice(0, 20).map((acc) => (
                    <TableRow key={acc.ad_account_id}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {acc.ad_account_id}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold" color={acc.overall_score >= 70 ? 'success.main' : acc.overall_score >= 50 ? 'warning.main' : 'error.main'}>
                          {acc.overall_score}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{acc.components.performance}</TableCell>
                      <TableCell align="right">{acc.components.efficiency}</TableCell>
                      <TableCell align="right">{acc.components.pixel_health}</TableCell>
                      <TableCell align="right">{acc.components.learning}</TableCell>
                      <TableCell align="right">{acc.components.consistency}</TableCell>
                      <TableCell>{acc.score_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {data.account_scores.accounts.length > 20 && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Showing 20 of {data.account_scores.accounts.length} accounts
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Backfill Status */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Timeline color="primary" />
            <Typography variant="h6">
              Backfill Status (
              {data.backfill.summary.completed} completed,
              {data.backfill.summary.in_progress} in progress,
              {data.backfill.summary.failed} failed)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: 'success.light' }}>
                <CardContent>
                  <Typography variant="h4">{data.backfill.summary.completed}</Typography>
                  <Typography variant="body2">Completed</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: 'info.light' }}>
                <CardContent>
                  <Typography variant="h4">{data.backfill.summary.in_progress}</Typography>
                  <Typography variant="body2">In Progress</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: 'error.light' }}>
                <CardContent>
                  <Typography variant="h4">{data.backfill.summary.failed}</Typography>
                  <Typography variant="body2">Failed</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card variant="outlined" sx={{ bgcolor: 'grey.200' }}>
                <CardContent>
                  <Typography variant="h4">{data.backfill.summary.pending}</Typography>
                  <Typography variant="body2">Pending</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Pixel Health */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <TrendingUp color="primary" />
            <Typography variant="h6">
              Pixel Health ({data.pixel_health.total_unique_pixels} unique pixels)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pixel Name</TableCell>
                  <TableCell>Pixel ID</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell align="right">EMQ</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Purchases</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.pixel_health.pixels.slice(0, 20).map((pixel) => (
                  <TableRow key={pixel.pixel_id}>
                    <TableCell>{pixel.pixel_name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {pixel.pixel_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {pixel.ad_account_id}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {pixel.emq !== null ? pixel.emq : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pixel.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={pixel.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="right">{pixel.events.purchases}</TableCell>
                    <TableCell>{pixel.last_snapshot}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {data.pixel_health.pixels.length > 20 && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Showing 20 of {data.pixel_health.pixels.length} pixels
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Expert Rules Summary */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <School color="primary" />
            <Typography variant="h6">
              Expert Rules ({data.expert_rules.total} total rules)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            Expert rules provide baseline thresholds from domain knowledge. They are not trained from your data but serve as starting points for automation rules.
          </Alert>
          <Grid container spacing={2}>
            {Object.entries(data.expert_rules.summary).map(([key, count]) => (
              <Grid size={{ xs: 6, md: 3 }} key={key}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      {key.replace(/-/g, ' ')}
                    </Typography>
                    <Typography variant="h5">{count}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default TransparencyPanel;
