import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import axios from 'axios';

interface FailedEntity {
  id: number;
  campaignId: string;
  campaignName: string;
  adsetId?: string;
  adsetName?: string;
  adId?: string;
  adName?: string;
  entityType: 'campaign' | 'adset' | 'ad';
  failureReason: string;
  userFriendlyReason: string;
  errorCode?: string;
  retryCount: number;
  status: 'failed' | 'retrying' | 'recovered' | 'permanent_failure';
  createdAt: string;
  updatedAt: string;
}

interface FailureStats {
  total: number;
  byType: {
    campaign: number;
    adset: number;
    ad: number;
  };
  byStatus: {
    failed: number;
    retrying: number;
    recovered: number;
    permanent_failure: number;
  };
  recoveryRate: string;
}

interface FailureReportModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName?: string;
}

const FailureReportModal: React.FC<FailureReportModalProps> = ({
  open,
  onClose,
  campaignId,
  campaignName
}) => {
  const [failures, setFailures] = useState<FailedEntity[]>([]);
  const [stats, setStats] = useState<FailureStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFailures = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.get(`/api/failures/campaign/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setFailures(response.data.failures);
        setStats(response.data.stats);
      } else {
        setErrorMessage('Failed to fetch failures');
      }
    } catch (error: any) {
      console.error('Error fetching failures:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to fetch failures');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (failureId: number) => {
    setRetrying(failureId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await axios.post(
        `/api/failures/${failureId}/retry`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setSuccessMessage('Entity successfully recovered!');
        // Refresh the failures list
        await fetchFailures();
      } else {
        setErrorMessage(response.data.message || 'Retry failed');
      }
    } catch (error: any) {
      console.error('Error retrying failed entity:', error);
      setErrorMessage(error.response?.data?.message || 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  useEffect(() => {
    if (open) {
      fetchFailures();
    }
  }, [open, campaignId]);

  const getStatusChip = (status: FailedEntity['status']) => {
    const statusConfig = {
      failed: { color: 'error' as const, icon: <ErrorOutlineIcon fontSize="small" />, label: 'Failed' },
      retrying: { color: 'warning' as const, icon: <RefreshIcon fontSize="small" />, label: 'Retrying' },
      recovered: { color: 'success' as const, icon: <CheckCircleIcon fontSize="small" />, label: 'Recovered' },
      permanent_failure: { color: 'default' as const, icon: <WarningIcon fontSize="small" />, label: 'Permanent Failure' }
    };

    const config = statusConfig[status];

    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  const getEntityTypeLabel = (type: FailedEntity['entityType']) => {
    const labels = {
      campaign: 'Campaign',
      adset: 'Ad Set',
      ad: 'Ad'
    };
    return labels[type];
  };

  // Filter to show only unrecovered failures
  const unresolvedFailures = failures.filter(
    f => f.status === 'failed' || f.status === 'retrying' || f.status === 'permanent_failure'
  );

  const hasFailures = unresolvedFailures.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <ErrorOutlineIcon color="warning" />
            <Typography variant="h6">
              Campaign Creation Report
              {campaignName && ` - ${campaignName}`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : (
          <>
            {successMessage && (
              <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            {errorMessage && (
              <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            {!hasFailures ? (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                <Typography variant="body1" fontWeight="bold">
                  All entities created successfully!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No failures detected for this campaign.
                </Typography>
              </Alert>
            ) : (
              <>
                {stats && (
                  <Box mb={3}>
                    <Alert severity="warning" icon={<WarningIcon />}>
                      <Typography variant="body2">
                        <strong>{stats.byStatus.failed + stats.byStatus.retrying + stats.byStatus.permanent_failure}</strong> entities failed during creation.
                        Recovery rate: <strong>{stats.recoveryRate}%</strong>
                      </Typography>
                    </Alert>
                  </Box>
                )}

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell><strong>Type</strong></TableCell>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Error</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Retries</strong></TableCell>
                        <TableCell align="center"><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {unresolvedFailures.map((failure) => (
                        <TableRow key={failure.id} hover>
                          <TableCell>
                            <Chip
                              label={getEntityTypeLabel(failure.entityType)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {failure.adsetName || failure.adName || failure.campaignName}
                            </Typography>
                            {failure.errorCode && (
                              <Typography variant="caption" color="text.secondary">
                                Code: {failure.errorCode}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={failure.failureReason} arrow>
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 300,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {failure.userFriendlyReason}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {getStatusChip(failure.status)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={failure.retryCount}
                              size="small"
                              color={failure.retryCount >= 3 ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {failure.status !== 'permanent_failure' && failure.retryCount < 3 && (
                              <Tooltip title="Retry creation">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleRetry(failure.id)}
                                  disabled={retrying === failure.id}
                                >
                                  {retrying === failure.id ? (
                                    <CircularProgress size={20} />
                                  ) : (
                                    <RefreshIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Note: Failed entities are tracked automatically and will be retried during campaign creation.
                    You can manually retry above if needed.
                  </Typography>
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={fetchFailures} disabled={loading} startIcon={<RefreshIcon />}>
          Refresh
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FailureReportModal;
