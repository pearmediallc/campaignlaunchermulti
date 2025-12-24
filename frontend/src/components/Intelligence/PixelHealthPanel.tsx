/**
 * PixelHealthPanel.tsx
 *
 * Displays Facebook pixel health metrics including EMQ scores,
 * event tracking status, and conversion funnel analysis.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle,
  Warning,
  Error,
  Refresh,
  TrendingUp,
  TrendingDown,
  Remove,
  Visibility,
  ShoppingCart,
  Payment,
  LocalMall,
} from '@mui/icons-material';
import { intelligenceApi, PixelHealth } from '../../services/intelligenceApi';

interface PixelHealthPanelProps {
  onRefresh?: () => void;
}

const PixelHealthPanel: React.FC<PixelHealthPanelProps> = ({ onRefresh }) => {
  const [pixels, setPixels] = useState<PixelHealth[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPixelHealth();
  }, []);

  const fetchPixelHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await intelligenceApi.getPixelHealth();
      if (response.success) {
        setPixels(response.pixels || []);
        setSummary(response.summary);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch pixel health data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle color="success" />;
    if (score >= 60) return <Warning color="warning" />;
    return <Error color="error" />;
  };

  const getEMQLabel = (emq: number | null) => {
    if (emq === null) return 'N/A';
    if (emq >= 8) return 'Excellent';
    if (emq >= 6) return 'Good';
    if (emq >= 4) return 'Fair';
    return 'Poor';
  };

  const getEMQColor = (emq: number | null): 'success' | 'warning' | 'error' | 'default' => {
    if (emq === null) return 'default';
    if (emq >= 8) return 'success';
    if (emq >= 6) return 'warning';
    return 'error';
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
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
        <IconButton color="inherit" size="small" onClick={fetchPixelHealth}>
          <Refresh />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">
                  Total Pixels
                </Typography>
                <Typography variant="h4">
                  {summary.total_pixels || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">
                  Active Pixels
                </Typography>
                <Typography variant="h4" color="success.main">
                  {summary.active_pixels || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">
                  Average Health Score
                </Typography>
                <Typography variant="h4" color={getHealthColor(summary.average_health || 0) + '.main'}>
                  {summary.average_health?.toFixed(0) || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="caption">
                  Average EMQ
                </Typography>
                <Typography variant="h4">
                  {summary.average_emq?.toFixed(1) || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Pixel Health Table */}
      {pixels.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Pixel Health Data Yet
          </Typography>
          <Typography color="text.secondary" paragraph>
            Pixel health data will be collected automatically by the Intelligence Engine, or you can start a manual backfill.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Go to the <strong>DATA BACKFILL</strong> tab to start collecting historical pixel data for your ad accounts.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Pixel</TableCell>
                <TableCell align="center">Health Score</TableCell>
                <TableCell align="center">EMQ</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Server Events</TableCell>
                <TableCell>Conversion Funnel</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pixels.map((pixel) => (
                <TableRow key={pixel.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">{pixel.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pixel.id}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {getHealthIcon(pixel.health_score)}
                        <Typography variant="h6">
                          {pixel.health_score}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pixel.health_score}
                        color={getHealthColor(pixel.health_score)}
                        sx={{ width: 80, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={pixel.emq !== null ? pixel.emq.toFixed(1) : 'N/A'}
                      color={getEMQColor(pixel.emq)}
                      size="small"
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {getEMQLabel(pixel.emq)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={pixel.is_active ? 'Active' : 'Inactive'}
                      color={pixel.is_active ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={pixel.has_server_events ? 'Enabled' : 'Not Set'}
                      color={pixel.has_server_events ? 'success' : 'warning'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {pixel.funnel ? (
                      <Box>
                        <FunnelStep
                          icon={<Visibility fontSize="small" />}
                          label="View → ATC"
                          value={pixel.funnel.view_to_atc}
                        />
                        <FunnelStep
                          icon={<ShoppingCart fontSize="small" />}
                          label="ATC → Checkout"
                          value={pixel.funnel.atc_to_checkout}
                        />
                        <FunnelStep
                          icon={<Payment fontSize="small" />}
                          label="Checkout → Purchase"
                          value={pixel.funnel.checkout_to_purchase}
                        />
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                          <LocalMall fontSize="small" color="primary" />
                          <Typography variant="caption" fontWeight="bold">
                            Overall: {formatPercentage(pixel.funnel.overall_conversion)}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No funnel data
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Refresh Button */}
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Tooltip title="Refresh pixel health data">
          <IconButton onClick={fetchPixelHealth}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

// Helper component for funnel steps
interface FunnelStepProps {
  icon: React.ReactNode;
  label: string;
  value: number | null;
}

const FunnelStep: React.FC<FunnelStepProps> = ({ icon, label, value }) => {
  const getColor = (val: number | null) => {
    if (val === null) return 'text.secondary';
    if (val >= 0.3) return 'success.main';
    if (val >= 0.1) return 'warning.main';
    return 'error.main';
  };

  return (
    <Box display="flex" alignItems="center" gap={1} mb={0.25}>
      {icon}
      <Typography variant="caption" sx={{ minWidth: 100 }}>
        {label}:
      </Typography>
      <Typography
        variant="caption"
        fontWeight="medium"
        color={getColor(value)}
      >
        {value !== null ? `${(value * 100).toFixed(1)}%` : 'N/A'}
      </Typography>
    </Box>
  );
};

export default PixelHealthPanel;
