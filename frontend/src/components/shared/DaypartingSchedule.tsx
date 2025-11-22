import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  IconButton,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface DaypartingBlock {
  days: number[]; // 0=Sunday, 6=Saturday
  startTime: number; // Minutes since midnight (0-1439)
  endTime: number; // Minutes since midnight (0-1439)
}

interface DaypartingScheduleProps {
  value: DaypartingBlock[];
  onChange: (blocks: DaypartingBlock[]) => void;
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

const DaypartingSchedule: React.FC<DaypartingScheduleProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [blocks, setBlocks] = useState<DaypartingBlock[]>(value || []);

  useEffect(() => {
    setBlocks(value || []);
  }, [value]);

  // Convert minutes to HH:MM format
  const minutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Convert HH:MM format to minutes
  const timeStringToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const addBlock = () => {
    const newBlock: DaypartingBlock = {
      days: [1, 2, 3, 4, 5], // Weekdays by default
      startTime: 540, // 9:00 AM
      endTime: 1020 // 5:00 PM
    };
    const updatedBlocks = [...blocks, newBlock];
    setBlocks(updatedBlocks);
    onChange(updatedBlocks);
  };

  const removeBlock = (index: number) => {
    const updatedBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(updatedBlocks);
    onChange(updatedBlocks);
  };

  const updateBlock = (index: number, updates: Partial<DaypartingBlock>) => {
    const updatedBlocks = blocks.map((block, i) =>
      i === index ? { ...block, ...updates } : block
    );
    setBlocks(updatedBlocks);
    onChange(updatedBlocks);
  };

  const toggleDay = (blockIndex: number, dayValue: number) => {
    const block = blocks[blockIndex];
    const days = block.days.includes(dayValue)
      ? block.days.filter(d => d !== dayValue)
      : [...block.days, dayValue].sort((a, b) => a - b);

    updateBlock(blockIndex, { days });
  };

  const selectAllDays = (blockIndex: number) => {
    updateBlock(blockIndex, { days: [0, 1, 2, 3, 4, 5, 6] });
  };

  const selectWeekdays = (blockIndex: number) => {
    updateBlock(blockIndex, { days: [1, 2, 3, 4, 5] });
  };

  const selectWeekends = (blockIndex: number) => {
    updateBlock(blockIndex, { days: [0, 6] });
  };

  const getDaysSummary = (days: number[]): string => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';

    return days
      .sort((a, b) => a - b)
      .map(d => DAYS_OF_WEEK[d].label)
      .join(', ');
  };

  const getTimeSummary = (startTime: number, endTime: number): string => {
    const start = minutesToTimeString(startTime);
    const end = minutesToTimeString(endTime);
    return `${start} - ${end}`;
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <TimeIcon color="primary" />
        <Typography variant="h6">Ad Scheduling (Dayparting)</Typography>
      </Box>

      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Important:</strong> Dayparting requires <strong>Lifetime Budget</strong>.
        </Typography>
        <Typography variant="caption">
          Schedule specific days and times when your ads will run. This helps you target your audience
          when they're most likely to be active and optimize your ad spend.
        </Typography>
      </Alert>

      {blocks.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            No ad scheduling configured. Ads will run 24/7.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Click "Add Time Block" below to schedule specific times.
          </Typography>
        </Paper>
      )}

      {blocks.map((block, index) => (
        <Paper
          key={index}
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" fontWeight="bold">
              Time Block {index + 1}
            </Typography>
            <IconButton
              size="small"
              onClick={() => removeBlock(index)}
              disabled={disabled}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Summary Chips */}
          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            <Chip
              label={getDaysSummary(block.days)}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={getTimeSummary(block.startTime, block.endTime)}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Box>

          {/* Quick Day Selection */}
          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            <Button
              size="small"
              variant="outlined"
              onClick={() => selectAllDays(index)}
              disabled={disabled}
            >
              All Days
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => selectWeekdays(index)}
              disabled={disabled}
            >
              Weekdays
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => selectWeekends(index)}
              disabled={disabled}
            >
              Weekends
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Day Selector */}
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Select Days:
          </Typography>
          <FormGroup row sx={{ mb: 2 }}>
            {DAYS_OF_WEEK.map((day) => (
              <FormControlLabel
                key={day.value}
                control={
                  <Checkbox
                    checked={block.days.includes(day.value)}
                    onChange={() => toggleDay(index, day.value)}
                    disabled={disabled}
                    size="small"
                  />
                }
                label={day.label}
              />
            ))}
          </FormGroup>

          {/* Time Range */}
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Time Range:
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              type="time"
              label="Start Time"
              value={minutesToTimeString(block.startTime)}
              onChange={(e) => {
                const minutes = timeStringToMinutes(e.target.value);
                updateBlock(index, { startTime: minutes });
              }}
              disabled={disabled}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <Typography variant="body2" color="text.secondary">
              to
            </Typography>
            <TextField
              type="time"
              label="End Time"
              value={minutesToTimeString(block.endTime)}
              onChange={(e) => {
                const minutes = timeStringToMinutes(e.target.value);
                updateBlock(index, { endTime: minutes });
              }}
              disabled={disabled}
              size="small"
              InputLabelProps={{ shrink: true }}
              error={block.endTime <= block.startTime}
              helperText={
                block.endTime <= block.startTime ? 'End time must be after start time' : ''
              }
            />
          </Box>

          {/* Validation Warning */}
          {block.days.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Please select at least one day
            </Alert>
          )}
        </Paper>
      ))}

      {/* Add Block Button */}
      <Button
        startIcon={<AddIcon />}
        onClick={addBlock}
        disabled={disabled}
        variant="outlined"
        fullWidth
      >
        Add Time Block
      </Button>

      {blocks.length > 0 && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="caption">
            Your ads will run during {blocks.length} time block{blocks.length > 1 ? 's' : ''}.
            Outside these times, your ads will be paused automatically.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default DaypartingSchedule;
