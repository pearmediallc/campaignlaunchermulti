/**
 * PendingActionsPanel.tsx
 *
 * Displays pending automation actions that require user approval.
 * Users can approve or reject each action.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions as MuiDialogActions,
  TextField,
  Alert,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle,
  Cancel,
  ExpandMore,
  ExpandLess,
  Schedule,
  TrendingDown,
  TrendingUp,
  Pause,
  PlayArrow,
  AttachMoney,
  Info,
} from '@mui/icons-material';
import { PendingAction } from '../../services/intelligenceApi';

interface PendingActionsPanelProps {
  actions: PendingAction[];
  onApprove: (actionId: number) => void;
  onReject: (actionId: number, reason?: string) => void;
  onRefresh: () => void;
}

const PendingActionsPanel: React.FC<PendingActionsPanelProps> = ({
  actions,
  onApprove,
  onReject,
  onRefresh,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'pause':
        return <Pause color="error" />;
      case 'activate':
        return <PlayArrow color="success" />;
      case 'increase_budget':
        return <TrendingUp color="success" />;
      case 'decrease_budget':
        return <TrendingDown color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const getActionColor = (actionType: string): 'error' | 'success' | 'warning' | 'info' => {
    switch (actionType) {
      case 'pause':
        return 'error';
      case 'activate':
        return 'success';
      case 'increase_budget':
        return 'success';
      case 'decrease_budget':
        return 'warning';
      default:
        return 'info';
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) return 'Expired';
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const handleRejectClick = (action: PendingAction) => {
    setSelectedAction(action);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedAction) {
      onReject(selectedAction.id, rejectReason || undefined);
      setRejectDialogOpen(false);
      setSelectedAction(null);
      setRejectReason('');
    }
  };

  if (actions.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Pending Actions
        </Typography>
        <Typography color="text.secondary">
          All automation actions have been processed. New suggestions will appear here
          when rules are triggered or AI detects optimization opportunities.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          {actions.length} Pending Action{actions.length !== 1 ? 's' : ''}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            color="success"
            size="small"
            onClick={() => actions.forEach(a => onApprove(a.id))}
            sx={{ mr: 1 }}
          >
            Approve All
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => actions.forEach(a => onReject(a.id))}
          >
            Reject All
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {actions.map((action) => (
          <Grid size={{ xs: 12, md: 6 }} key={action.id}>
            <Card
              sx={{
                borderLeft: 4,
                borderColor: `${getActionColor(action.action_type)}.main`,
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box display="flex" alignItems="center" gap={1}>
                    {getActionIcon(action.action_type)}
                    <Typography variant="h6">
                      {action.action_type.replace(/_/g, ' ').toUpperCase()}
                    </Typography>
                  </Box>
                  <Chip
                    icon={<Schedule />}
                    label={formatTimeRemaining(action.expires_at)}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Typography variant="body1" sx={{ mt: 1, mb: 1 }}>
                  {action.description}
                </Typography>

                <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                  <Chip
                    label={action.entity_type}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={action.entity_name || action.entity_id}
                    size="small"
                  />
                  {action.model_confidence && (
                    <Tooltip title="AI Confidence Score">
                      <Chip
                        label={`${(action.model_confidence * 100).toFixed(0)}% confident`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                </Box>

                <IconButton
                  size="small"
                  onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                >
                  {expandedId === action.id ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  View Details
                </Typography>

                <Collapse in={expandedId === action.id}>
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Trigger Reason
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {action.trigger_reason}
                    </Typography>

                    {action.trigger_metrics && action.trigger_metrics.length > 0 && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Triggered Metrics
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap">
                          {action.trigger_metrics.map((metric, idx) => (
                            <Chip
                              key={idx}
                              label={`${metric.metric} ${metric.operator} ${metric.value} (actual: ${metric.actual_value?.toFixed(2)})`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </>
                    )}
                  </Box>
                </Collapse>
              </CardContent>

              <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => handleRejectClick(action)}
                >
                  Reject
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => onApprove(action.id)}
                >
                  Approve
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Reject Action</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to reject this action?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Help the AI learn by providing a reason..."
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            Your feedback helps improve future suggestions.
          </Alert>
        </DialogContent>
        <MuiDialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleRejectConfirm}>
            Reject Action
          </Button>
        </MuiDialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingActionsPanel;
