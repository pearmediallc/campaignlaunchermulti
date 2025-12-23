/**
 * IntelligenceDashboard.tsx
 *
 * Main dashboard for the Campaign Intelligence Engine.
 * Displays account scores, pending actions, automation rules,
 * and AI-powered insights.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Psychology,
  Refresh,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Notifications,
  AutoAwesome,
  Rule,
  Speed,
  TrackChanges,
  School,
  CloudDownload,
  ShowChart,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

import { intelligenceApi, DashboardData, PendingAction, Notification } from '../services/intelligenceApi';
import AccountScoreCard from '../components/Intelligence/AccountScoreCard';
import PendingActionsPanel from '../components/Intelligence/PendingActionsPanel';
import AutomationRulesPanel from '../components/Intelligence/AutomationRulesPanel';
import NotificationsPanel from '../components/Intelligence/NotificationsPanel';
import PixelHealthPanel from '../components/Intelligence/PixelHealthPanel';
import PatternsPanel from '../components/Intelligence/PatternsPanel';
import ExpertRulesPanel from '../components/Intelligence/ExpertRulesPanel';
import BackfillPanel from '../components/Intelligence/BackfillPanel';
import TrainingAnalyticsPanel from '../components/Intelligence/TrainingAnalyticsPanel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const IntelligenceDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [moduleEnabled, setModuleEnabled] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await intelligenceApi.getDashboard();
      if (response.success) {
        setDashboardData(response.data);
        setError(null);
      }
    } catch (err: any) {
      if (err.response?.status === 503) {
        setModuleEnabled(false);
        setError('Intelligence module is disabled. Enable it in environment settings.');
      } else {
        setError(err.response?.data?.error || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    fetchDashboard();
  };

  const handleApproveAction = async (actionId: number) => {
    try {
      await intelligenceApi.approveAction(actionId);
      toast.success('Action approved successfully');
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve action');
    }
  };

  const handleRejectAction = async (actionId: number) => {
    try {
      await intelligenceApi.rejectAction(actionId);
      toast.info('Action rejected');
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject action');
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp sx={{ color: 'success.main' }} />;
      case 'declining':
        return <TrendingDown sx={{ color: 'error.main' }} />;
      default:
        return <TrendingFlat sx={{ color: 'text.secondary' }} />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <Box textAlign="center">
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Loading Intelligence Dashboard...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (!moduleEnabled) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Psychology sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Intelligence Module Disabled
          </Typography>
          <Typography color="text.secondary" paragraph>
            The Campaign Intelligence Engine is currently disabled.
            To enable it, set <code>ENABLE_INTELLIGENCE=true</code> in your environment variables.
          </Typography>
          <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
            <Typography variant="body2">
              The Intelligence Engine provides:
              <ul style={{ marginBottom: 0 }}>
                <li>AI-powered campaign optimization suggestions</li>
                <li>Automated rules for loss prevention and scaling</li>
                <li>Account health scoring and monitoring</li>
                <li>Pattern learning from your campaign data</li>
              </ul>
            </Typography>
          </Alert>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  const pendingCount = dashboardData?.pending_actions?.length || 0;
  const unreadCount = dashboardData?.notifications?.unread_count || 0;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Psychology sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Campaign Intelligence
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-powered optimization and insights
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh Dashboard">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Score
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {dashboardData?.account_scores?.summary?.average_score || '--'}
                  </Typography>
                </Box>
                <Speed sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              </Box>
              {dashboardData?.account_scores?.summary && (
                <LinearProgress
                  variant="determinate"
                  value={dashboardData.account_scores.summary.average_score}
                  color={getScoreColor(dashboardData.account_scores.summary.average_score) as any}
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Actions
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {pendingCount}
                  </Typography>
                </Box>
                <Badge badgeContent={pendingCount} color="warning">
                  <CheckCircle sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
                </Badge>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Awaiting your approval
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Rules
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {Object.values(dashboardData?.patterns?.by_type || {}).reduce((a, b) => a + b, 0) || 0}
                  </Typography>
                </Box>
                <Rule sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Automation rules running
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Patterns Learned
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {dashboardData?.patterns?.total_patterns || 0}
                  </Typography>
                </Box>
                <AutoAwesome sx={{ fontSize: 40, color: 'secondary.main', opacity: 0.7 }} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                AI-discovered patterns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label="Account Scores"
            icon={<Speed />}
            iconPosition="start"
          />
          <Tab
            label={
              <Badge badgeContent={pendingCount} color="warning">
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle /> Pending Actions
                </Box>
              </Badge>
            }
          />
          <Tab
            label="Automation Rules"
            icon={<Rule />}
            iconPosition="start"
          />
          <Tab
            label={
              <Badge badgeContent={unreadCount} color="error">
                <Box display="flex" alignItems="center" gap={1}>
                  <Notifications /> Notifications
                </Box>
              </Badge>
            }
          />
          <Tab
            label="Pixel Health"
            icon={<TrackChanges />}
            iconPosition="start"
          />
          <Tab
            label="Patterns & Insights"
            icon={<AutoAwesome />}
            iconPosition="start"
          />
          <Tab
            label="Expert Rules"
            icon={<School />}
            iconPosition="start"
          />
          <Tab
            label="Data Backfill"
            icon={<CloudDownload />}
            iconPosition="start"
          />
          <Tab
            label="Training Analytics"
            icon={<ShowChart />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <AccountScoreCard
          scores={dashboardData?.account_scores}
          onRefresh={handleRefresh}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <PendingActionsPanel
          actions={dashboardData?.pending_actions || []}
          onApprove={handleApproveAction}
          onReject={handleRejectAction}
          onRefresh={handleRefresh}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <AutomationRulesPanel onRefresh={handleRefresh} />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <NotificationsPanel onRefresh={handleRefresh} />
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <PixelHealthPanel onRefresh={handleRefresh} />
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <PatternsPanel onRefresh={handleRefresh} />
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        <ExpertRulesPanel onRefresh={handleRefresh} />
      </TabPanel>

      <TabPanel value={activeTab} index={7}>
        <BackfillPanel onRefresh={handleRefresh} />
      </TabPanel>

      <TabPanel value={activeTab} index={8}>
        <TrainingAnalyticsPanel onRefresh={handleRefresh} />
      </TabPanel>
    </Container>
  );
};

export default IntelligenceDashboard;
