/**
 * AccountScoreCard.tsx
 *
 * Displays account health scores with visual indicators
 * and component breakdowns.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Tooltip,
  IconButton,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
  Info,
  Calculate,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { AccountScore, intelligenceApi } from '../../services/intelligenceApi';

interface AccountScoreCardProps {
  scores?: {
    hasData: boolean;
    summary?: {
      total_accounts: number;
      average_score: number;
      best_account: { id: string; score: number; grade: string } | null;
      worst_account: { id: string; score: number; grade: string } | null;
    };
    accounts?: AccountScore[];
  };
  onRefresh: () => void;
}

const AccountScoreCard: React.FC<AccountScoreCardProps> = ({ scores, onRefresh }) => {
  const [calculating, setCalculating] = useState(false);

  const handleCalculateScores = async () => {
    try {
      setCalculating(true);
      toast.info('Starting score calculation for all accounts...');
      await intelligenceApi.triggerScoreCalculation();
      toast.success('Score calculation started! This may take a few minutes. Refresh to see updates.');
      // Refresh after a short delay
      setTimeout(() => {
        onRefresh();
      }, 5000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start score calculation');
    } finally {
      setCalculating(false);
    }
  };

  if (!scores?.hasData) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Account Scores Available
        </Typography>
        <Typography color="text.secondary" paragraph>
          Account scores are calculated based on campaign performance data.
          Click the button below to calculate scores for all backfilled accounts.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={calculating ? <CircularProgress size={20} color="inherit" /> : <Calculate />}
          onClick={handleCalculateScores}
          disabled={calculating}
          sx={{ mt: 2 }}
        >
          {calculating ? 'Calculating...' : 'Calculate All Account Scores'}
        </Button>
      </Paper>
    );
  }

  const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return '#4caf50';
      case 'B': return '#8bc34a';
      case 'C': return '#ff9800';
      case 'D': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'declining':
        return <TrendingDown sx={{ color: 'error.main', fontSize: 20 }} />;
      default:
        return <TrendingFlat sx={{ color: 'text.secondary', fontSize: 20 }} />;
    }
  };

  const componentLabels: Record<string, string> = {
    performance: 'Performance',
    efficiency: 'Efficiency',
    pixel_health: 'Pixel Health',
    learning: 'Learning',
    consistency: 'Consistency',
  };

  return (
    <Box>
      {/* Header with Recalculate Button */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          startIcon={calculating ? <CircularProgress size={18} /> : <Calculate />}
          onClick={handleCalculateScores}
          disabled={calculating}
          size="small"
        >
          {calculating ? 'Calculating...' : 'Recalculate All Scores'}
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Average Score
              </Typography>
              <Typography variant="h2" fontWeight="bold">
                {scores.summary?.average_score || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Across {scores.summary?.total_accounts || 0} accounts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {scores.summary?.best_account && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Best Performing
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {scores.summary.best_account.score}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={scores.summary.best_account.grade}
                    size="small"
                    sx={{
                      bgcolor: getGradeColor(scores.summary.best_account.grade),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {scores.summary.best_account.id.substring(0, 20)}...
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {scores.summary?.worst_account && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Needs Attention
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {scores.summary.worst_account.score}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={scores.summary.worst_account.grade}
                    size="small"
                    sx={{
                      bgcolor: getGradeColor(scores.summary.worst_account.grade),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {scores.summary.worst_account.id.substring(0, 20)}...
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Individual Account Scores */}
      <Typography variant="h6" gutterBottom>
        Account Details
      </Typography>
      <Grid container spacing={2}>
        {scores.accounts?.map((account) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={account.ad_account_id}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                    {account.ad_account_id}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h4" fontWeight="bold">
                      {account.overall_score}
                    </Typography>
                    <Chip
                      label={account.grade}
                      size="small"
                      sx={{
                        bgcolor: getGradeColor(account.grade),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  {getTrendIcon(account.trend)}
                  <Typography
                    variant="caption"
                    color={
                      account.trend === 'improving' ? 'success.main' :
                      account.trend === 'declining' ? 'error.main' : 'text.secondary'
                    }
                  >
                    {account.trend_percentage > 0 ? '+' : ''}{account.trend_percentage}%
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                {account.status}
              </Typography>

              {/* Component Scores */}
              <Box mt={2}>
                {Object.entries(account.components).map(([key, value]) => (
                  <Box key={key} mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption">
                        {componentLabels[key] || key}
                      </Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {value}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={value}
                      color={getScoreColor(value)}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                ))}
              </Box>

              {/* Recommendations */}
              {account.recommendations && account.recommendations.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }} icon={<Info fontSize="small" />}>
                  <Typography variant="caption">
                    {account.recommendations[0]}
                  </Typography>
                </Alert>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AccountScoreCard;
