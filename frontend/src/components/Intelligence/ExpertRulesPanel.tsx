/**
 * ExpertRulesPanel.tsx
 *
 * Displays expert rules from media buyers that serve as
 * baseline knowledge for the intelligence engine.
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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ExpandMore,
  Refresh,
  Shield,
  TrendingUp,
  Speed,
  GpsFixed,
  Category,
  Verified,
  Groups,
  Lightbulb,
} from '@mui/icons-material';
import { intelligenceApi, ExpertRule } from '../../services/intelligenceApi';

interface ExpertRulesPanelProps {
  onRefresh?: () => void;
}

const ExpertRulesPanel: React.FC<ExpertRulesPanelProps> = ({ onRefresh }) => {
  const [rules, setRules] = useState<ExpertRule[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rulesRes, summaryRes, benchmarksRes] = await Promise.all([
        intelligenceApi.getExpertRules(),
        intelligenceApi.getExpertRulesSummary(),
        intelligenceApi.getExpertBenchmarks()
      ]);

      if (rulesRes.success) {
        setRules(rulesRes.rules || []);
      }
      if (summaryRes.success) {
        setSummary(summaryRes);
      }
      if (benchmarksRes.success) {
        setBenchmarks(benchmarksRes.benchmarks || {});
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch expert rules');
    } finally {
      setLoading(false);
    }
  };

  const getRuleIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'kill':
        return <Shield color="error" />;
      case 'scale':
        return <TrendingUp color="success" />;
      case 'benchmark':
        return <Speed color="primary" />;
      case 'targeting':
        return <GpsFixed color="info" />;
      case 'structure':
        return <Category color="secondary" />;
      default:
        return <Lightbulb color="warning" />;
    }
  };

  const getRuleColor = (ruleType: string): 'error' | 'success' | 'primary' | 'info' | 'secondary' | 'warning' => {
    switch (ruleType) {
      case 'kill': return 'error';
      case 'scale': return 'success';
      case 'benchmark': return 'primary';
      case 'targeting': return 'info';
      case 'structure': return 'secondary';
      default: return 'warning';
    }
  };

  const formatRuleType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatVertical = (vertical: string) => {
    if (vertical === 'all') return 'All Verticals';
    return vertical.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
      {/* Summary Section */}
      {summary && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Verified sx={{ fontSize: 40, color: 'success.main' }} />
            <Box>
              <Typography variant="h6">
                Expert Knowledge Base
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rules derived from {summary.total || 0} expert media buyer insights
              </Typography>
            </Box>
          </Box>

          {/* Rule Type Breakdown */}
          <Grid container spacing={2}>
            {Object.entries(summary.by_type || {}).map(([type, count]) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={type}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                    {getRuleIcon(type)}
                    <Typography variant="h5" fontWeight="bold">
                      {count as number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatRuleType(type)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Benchmarks Section */}
      {benchmarks && Object.keys(benchmarks).length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
            Performance Benchmarks
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Aggregated performance thresholds from expert media buyers
          </Typography>

          <Grid container spacing={2}>
            {benchmarks.cpc_max && (
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Max CPC
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                      ${benchmarks.cpc_max.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {benchmarks.cpm_min && benchmarks.cpm_max && (
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      CPM Range
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                      ${benchmarks.cpm_min} - ${benchmarks.cpm_max}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {benchmarks.roi_target && (
              <Grid size={{ xs: 6, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">
                      Target ROI
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {benchmarks.roi_target}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Groups sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Expert Rules Found
          </Typography>
          <Typography color="text.secondary">
            Expert rules will appear here once they are seeded from media buyer insights.
          </Typography>
        </Paper>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            All Expert Rules ({rules.length})
          </Typography>

          {rules.map((rule, index) => (
            <Accordion key={rule.id || index} defaultExpanded={index === 0}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  {getRuleIcon(rule.rule_type)}
                  <Box flexGrow={1}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {rule.name}
                    </Typography>
                    <Box display="flex" gap={1} mt={0.5}>
                      <Chip
                        label={formatRuleType(rule.rule_type)}
                        size="small"
                        color={getRuleColor(rule.rule_type)}
                      />
                      <Chip
                        label={formatVertical(rule.vertical)}
                        size="small"
                        variant="outlined"
                      />
                      {rule.campaign_structure && (
                        <Chip
                          label={typeof rule.campaign_structure === 'string' ? rule.campaign_structure : JSON.stringify(rule.campaign_structure)}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      icon={<Groups />}
                      label={`${rule.expert_count} expert${rule.expert_count !== 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                    />
                    <Tooltip title="Confidence Score">
                      <Box sx={{ minWidth: 60 }}>
                        <Typography variant="caption" color="text.secondary">
                          {((rule.confidence_score || 0) * 100).toFixed(0)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(rule.confidence_score || 0) * 100}
                          color={rule.confidence_score >= 0.7 ? 'success' : rule.confidence_score >= 0.5 ? 'warning' : 'error'}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    </Tooltip>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <Typography variant="body2" paragraph>
                      {rule.description}
                    </Typography>
                  </Grid>

                  {/* Conditions */}
                  {rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0 && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Conditions
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Metric</TableCell>
                              <TableCell>Operator</TableCell>
                              <TableCell>Value</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rule.conditions.map((cond: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell>{cond.metric}</TableCell>
                                <TableCell>{cond.operator}</TableCell>
                                <TableCell>{cond.value}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  )}

                  {/* Actions */}
                  {rule.actions && rule.actions.length > 0 && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Actions
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {rule.actions.map((action: any, idx: number) => (
                          <Chip
                            key={idx}
                            label={action.action?.replace(/_/g, ' ')}
                            color="primary"
                            size="small"
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}

                  {/* Winning States */}
                  {rule.winning_states && (
                    <Grid size={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Targeting Insights
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {rule.winning_states.winning?.map((state: any, idx: number) => (
                          <Chip
                            key={idx}
                            label={`${state.state} (${state.count}x)`}
                            color="success"
                            size="small"
                          />
                        ))}
                        {rule.winning_states.excluded?.map((state: any, idx: number) => (
                          <Chip
                            key={`excl-${idx}`}
                            label={`Exclude: ${state.state}`}
                            color="error"
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}

                  {/* Validation Stats */}
                  {(rule.times_validated ?? 0) > 0 && (
                    <Grid size={12}>
                      <Divider sx={{ my: 1 }} />
                      <Box display="flex" gap={2}>
                        <Typography variant="caption" color="text.secondary">
                          Validated: {rule.times_validated} times
                        </Typography>
                        {rule.validation_accuracy != null && (
                          <Typography variant="caption" color="text.secondary">
                            Accuracy: {((rule.validation_accuracy ?? 0) * 100).toFixed(1)}%
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Info Alert */}
      <Alert severity="info" sx={{ mt: 3 }} icon={<Verified />}>
        <Typography variant="body2">
          <strong>How expert rules work:</strong> These rules are derived from your organization's
          top media buyers' form submissions. They serve as a baseline for the intelligence engine
          and are continuously validated against actual performance data.
        </Typography>
      </Alert>

      {/* Refresh Button */}
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Tooltip title="Refresh expert rules">
          <IconButton onClick={fetchData}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default ExpertRulesPanel;
