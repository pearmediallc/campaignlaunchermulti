/**
 * PatternsPanel.tsx
 *
 * Displays learned patterns and ML insights from the intelligence engine.
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
} from '@mui/icons-material';
import { intelligenceApi, Pattern } from '../../services/intelligenceApi';

interface PatternsPanelProps {
  onRefresh?: () => void;
}

const PatternsPanel: React.FC<PatternsPanelProps> = ({ onRefresh }) => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [summary, setSummary] = useState<{
    total_patterns: number;
    by_type: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await intelligenceApi.getPatterns();
      if (response.success) {
        setPatterns(response.patterns || []);
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

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'time_performance':
        return <Schedule color="primary" />;
      case 'audience_cluster':
        return <Groups color="secondary" />;
      case 'creative_performance':
        return <AutoGraph color="success" />;
      case 'budget_optimization':
        return <TrendingUp color="warning" />;
      default:
        return <Psychology color="action" />;
    }
  };

  const getConfidenceColor = (confidence: string): 'success' | 'warning' | 'error' => {
    switch (confidence.toLowerCase()) {
      case 'high':
        return 'success';
      case 'medium':
        return 'warning';
      default:
        return 'error';
    }
  };

  const getConfidenceValue = (confidence: string): number => {
    switch (confidence.toLowerCase()) {
      case 'high':
        return 90;
      case 'medium':
        return 60;
      case 'low':
        return 30;
      default:
        return 50;
    }
  };

  const formatPatternType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatValidUntil = (dateStr: string) => {
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
            Patterns will appear as more campaign data is collected and analyzed.
          </Typography>
        </Paper>
      ) : (
        <Box>
          {patterns.map((pattern, index) => (
            <Accordion key={index} defaultExpanded={index === 0}>
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
                          {getConfidenceValue(pattern.confidence)}%
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

      {/* Refresh Button */}
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Tooltip title="Refresh patterns">
          <IconButton onClick={fetchPatterns}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default PatternsPanel;
