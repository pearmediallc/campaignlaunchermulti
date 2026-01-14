import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import TimezoneSelector from './TimezoneSelector';
import DayOfWeekPicker from './DayOfWeekPicker';
import { campaignScheduleApi, CampaignScheduleData } from '../../services/campaignScheduleApi';

interface BulkScheduleModalProps {
  open: boolean;
  onClose: () => void;
  campaignIds: string[];
  campaignNames?: { [key: string]: string };
  onScheduleSaved?: () => void;
}

interface ProcessingResult {
  campaignId: string;
  campaignName: string;
  status: 'success' | 'error';
  error?: string;
}

const BulkScheduleModal: React.FC<BulkScheduleModalProps> = ({
  open,
  onClose,
  campaignIds,
  campaignNames = {},
  onScheduleSaved
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'form' | 'processing' | 'results'>('form');
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState(0);

  // Form state
  const [timezone, setTimezone] = useState('America/New_York');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday'
  ]);
  const [isEnabled, setIsEnabled] = useState(true);

  const handleClose = () => {
    if (processing) {
      return; // Don't allow closing while processing
    }

    // Reset state
    setCurrentStep('form');
    setResults([]);
    setProgress(0);
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    setProcessing(true);
    setError(null);
    setCurrentStep('processing');
    setResults([]);
    setProgress(0);

    try {
      // Validate times
      if (startTime === endTime) {
        setError('Start time and end time cannot be the same');
        setProcessing(false);
        setCurrentStep('form');
        return;
      }

      const totalCampaigns = campaignIds.length;
      const processedResults: ProcessingResult[] = [];

      // Process each campaign sequentially
      for (let i = 0; i < campaignIds.length; i++) {
        const campaignId = campaignIds[i];
        const campaignName = campaignNames[campaignId] || `Campaign ${campaignId}`;

        const scheduleData: CampaignScheduleData = {
          campaignName,
          timezone,
          startTime,
          endTime,
          daysOfWeek,
          isEnabled
        };

        try {
          await campaignScheduleApi.createOrUpdateSchedule(campaignId, scheduleData);

          processedResults.push({
            campaignId,
            campaignName,
            status: 'success'
          });
        } catch (err: any) {
          console.error(`Error scheduling campaign ${campaignId}:`, err);
          processedResults.push({
            campaignId,
            campaignName,
            status: 'error',
            error: err.response?.data?.error || err.message || 'Failed to save schedule'
          });
        }

        // Update progress
        setProgress(((i + 1) / totalCampaigns) * 100);
        setResults([...processedResults]);
      }

      setCurrentStep('results');

      if (onScheduleSaved) {
        onScheduleSaved();
      }
    } catch (err: any) {
      console.error('Bulk schedule error:', err);
      setError('An unexpected error occurred');
      setCurrentStep('form');
    } finally {
      setProcessing(false);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={processing}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <ScheduleIcon color="primary" />
            <Typography variant="h6">
              {currentStep === 'form' && `Schedule ${campaignIds.length} Campaign${campaignIds.length !== 1 ? 's' : ''}`}
              {currentStep === 'processing' && 'Scheduling Campaigns...'}
              {currentStep === 'results' && 'Scheduling Complete'}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={processing}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {currentStep === 'form' && (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                You are scheduling {campaignIds.length} campaign{campaignIds.length !== 1 ? 's' : ''}.
                The same schedule will be applied to all selected campaigns.
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <TimezoneSelector
                value={timezone}
                onChange={setTimezone}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                  Start Time *
                </Typography>
                <input
                  type="time"
                  className="form-control"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                  End Time *
                </Typography>
                <input
                  type="time"
                  className="form-control"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <DayOfWeekPicker
                value={daysOfWeek}
                onChange={setDaysOfWeek}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Enable Schedule
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isEnabled
                      ? 'Schedule will activate immediately'
                      : 'Schedule will be saved but not activated'}
                  </Typography>
                </Box>
              }
            />

            <Paper
              elevation={0}
              sx={{
                bgcolor: '#f5f5f5',
                p: 2,
                mt: 2,
                borderRadius: 2
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Schedule Preview:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Campaigns will turn <strong>ON</strong> at <strong>{startTime}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Campaigns will turn <strong>OFF</strong> at <strong>{endTime}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Days: {daysOfWeek.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Timezone: {timezone}
              </Typography>
            </Paper>
          </>
        )}

        {currentStep === 'processing' && (
          <Box sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <CircularProgress size={60} />
            </Box>
            <Typography variant="h6" align="center" gutterBottom>
              Scheduling campaigns...
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" gutterBottom>
              Processing {Math.round(progress / campaignIds.length * 100)}% ({results.length} of {campaignIds.length})
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ mt: 2, height: 8, borderRadius: 4 }}
            />

            {results.length > 0 && (
              <Box sx={{ mt: 3, maxHeight: 200, overflowY: 'auto' }}>
                {results.map((result, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.5,
                      px: 1,
                      bgcolor: result.status === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                      borderRadius: 1,
                      mb: 0.5
                    }}
                  >
                    {result.status === 'success' ? (
                      <SuccessIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                      <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                    )}
                    <Typography variant="caption">
                      {result.campaignName}
                      {result.error && ` - ${result.error}`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {currentStep === 'results' && (
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2,
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: 2,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {successCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Successful
                </Typography>
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: 2,
                  bgcolor: 'rgba(244, 67, 54, 0.1)',
                  borderRadius: 2,
                  textAlign: 'center'
                }}
              >
                <Typography variant="h4" color="error.main" fontWeight="bold">
                  {errorCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
              </Paper>
            </Box>

            {successCount > 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Successfully scheduled {successCount} campaign{successCount !== 1 ? 's' : ''}
              </Alert>
            )}

            {errorCount > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to schedule {errorCount} campaign{errorCount !== 1 ? 's' : ''}
              </Alert>
            )}

            <Typography variant="body2" fontWeight={500} gutterBottom>
              Details:
            </Typography>
            <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {results.map((result, index) => (
                <ListItem
                  key={index}
                  sx={{
                    bgcolor: result.status === 'success' ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)',
                    mb: 0.5,
                    borderRadius: 1
                  }}
                >
                  <ListItemIcon>
                    {result.status === 'success' ? (
                      <SuccessIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={result.campaignName}
                    secondary={result.error || 'Scheduled successfully'}
                    secondaryTypographyProps={{
                      color: result.status === 'success' ? 'success.main' : 'error.main'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {currentStep === 'form' && (
          <>
            <Button onClick={handleClose} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={processing || daysOfWeek.length === 0}
              startIcon={processing ? <CircularProgress size={16} /> : <ScheduleIcon />}
            >
              Schedule {campaignIds.length} Campaign{campaignIds.length !== 1 ? 's' : ''}
            </Button>
          </>
        )}

        {currentStep === 'processing' && (
          <Button disabled>
            Processing...
          </Button>
        )}

        {currentStep === 'results' && (
          <Button variant="contained" onClick={handleClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkScheduleModal;
