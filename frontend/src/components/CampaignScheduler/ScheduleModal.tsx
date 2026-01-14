import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import TimezoneSelector from './TimezoneSelector';
import DayOfWeekPicker from './DayOfWeekPicker';
import { campaignScheduleApi, CampaignSchedule, CampaignScheduleData } from '../../services/campaignScheduleApi';

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  onScheduleSaved?: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  open,
  onClose,
  campaignId,
  campaignName,
  onScheduleSaved
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  // Existing schedule
  const [existingSchedule, setExistingSchedule] = useState<CampaignSchedule | null>(null);

  // Load existing schedule when modal opens
  useEffect(() => {
    if (open) {
      loadExistingSchedule();
    } else {
      // Reset form when modal closes
      setError(null);
      setSuccess(false);
    }
  }, [open, campaignId]);

  const loadExistingSchedule = async () => {
    setLoadingSchedule(true);
    setError(null);

    try {
      const response = await campaignScheduleApi.getSchedule(campaignId);

      if (response.hasSchedule && response.schedule) {
        const schedule = response.schedule;
        setExistingSchedule(schedule);
        setTimezone(schedule.timezone);
        setStartTime(schedule.startTime);
        setEndTime(schedule.endTime);
        setDaysOfWeek(schedule.daysOfWeek);
        setIsEnabled(schedule.isEnabled);
      } else {
        setExistingSchedule(null);
        // Keep default values
      }
    } catch (err: any) {
      console.error('Error loading schedule:', err);
      setError(err.response?.data?.error || 'Failed to load schedule');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate times
      if (startTime === endTime) {
        setError('Start time and end time cannot be the same');
        setLoading(false);
        return;
      }

      const scheduleData: CampaignScheduleData = {
        campaignName,
        timezone,
        startTime,
        endTime,
        daysOfWeek,
        isEnabled
      };

      await campaignScheduleApi.createOrUpdateSchedule(campaignId, scheduleData);

      setSuccess(true);
      if (onScheduleSaved) {
        onScheduleSaved();
      }

      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err.response?.data?.error || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await campaignScheduleApi.deleteSchedule(campaignId);
      setSuccess(true);
      if (onScheduleSaved) {
        onScheduleSaved();
      }

      // Close modal after 1 second
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error deleting schedule:', err);
      setError(err.response?.data?.error || 'Failed to delete schedule');
    } finally {
      setLoading(false);
    }
  };

  const formatNextScheduledTime = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            {existingSchedule ? 'Edit Schedule' : 'Create Schedule'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {loadingSchedule ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Campaign Name */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Campaign
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {campaignName}
              </Typography>
            </Box>

            {/* Timezone */}
            <TimezoneSelector
              value={timezone}
              onChange={setTimezone}
            />

            {/* Time Range */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }} // 5 min steps
                required
                fullWidth
                helperText="Campaign starts at this time"
              />
              <TextField
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }} // 5 min steps
                required
                fullWidth
                helperText="Campaign pauses at this time"
              />
            </Box>

            {/* Days of Week */}
            <DayOfWeekPicker
              value={daysOfWeek}
              onChange={setDaysOfWeek}
            />

            {/* Enable/Disable */}
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
                  <Typography variant="body1" fontWeight={500}>
                    Schedule Enabled
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isEnabled ? 'Schedule is active and will run automatically' : 'Schedule is paused and will not run'}
                  </Typography>
                </Box>
              }
            />

            {/* Preview */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: '#f5f8fa',
                border: '1px solid #e0e7ed'
              }}
            >
              <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon fontSize="small" color="primary" />
                Schedule Preview
              </Typography>
              <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlayIcon fontSize="small" sx={{ color: 'success.main' }} />
                  <Typography variant="body2">
                    <strong>Start:</strong> {startTime} {timezone.split('/')[1]?.replace('_', ' ')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PauseIcon fontSize="small" sx={{ color: 'warning.main' }} />
                  <Typography variant="body2">
                    <strong>Pause:</strong> {endTime} {timezone.split('/')[1]?.replace('_', ' ')}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <strong>Days:</strong> {daysOfWeek.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                </Typography>
              </Box>
            </Paper>

            {/* Existing Schedule Info */}
            {existingSchedule && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #90caf9'
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} gutterBottom color="primary.dark">
                  Current Schedule Status
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption">
                    <strong>Next Start:</strong> {formatNextScheduledTime(existingSchedule.nextScheduledStart)}
                  </Typography>
                  <Typography variant="caption">
                    <strong>Next Pause:</strong> {formatNextScheduledTime(existingSchedule.nextScheduledPause)}
                  </Typography>
                  {existingSchedule.lastStartedAt && (
                    <Typography variant="caption">
                      <strong>Last Started:</strong> {formatNextScheduledTime(existingSchedule.lastStartedAt)}
                    </Typography>
                  )}
                  {existingSchedule.lastPausedAt && (
                    <Typography variant="caption">
                      <strong>Last Paused:</strong> {formatNextScheduledTime(existingSchedule.lastPausedAt)}
                    </Typography>
                  )}
                </Box>
              </Paper>
            )}

            {/* Error/Success Messages */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success">
                Schedule {existingSchedule ? 'updated' : 'created'} successfully!
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          {existingSchedule && (
            <Button
              onClick={handleDelete}
              color="error"
              disabled={loading || loadingSchedule}
            >
              Delete Schedule
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading || loadingSchedule || daysOfWeek.length === 0}
            startIcon={loading ? <CircularProgress size={16} /> : <ScheduleIcon />}
          >
            {loading ? 'Saving...' : existingSchedule ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleModal;
