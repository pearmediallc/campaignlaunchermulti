import React from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  FormHelperText
} from '@mui/material';

interface DayOfWeekPickerProps {
  value: string[];
  onChange: (days: string[]) => void;
  error?: boolean;
  helperText?: string;
}

const DAYS = [
  { value: 'monday', label: 'Mon', fullLabel: 'Monday' },
  { value: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
  { value: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
  { value: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
  { value: 'friday', label: 'Fri', fullLabel: 'Friday' },
  { value: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
  { value: 'sunday', label: 'Sun', fullLabel: 'Sunday' }
];

const DayOfWeekPicker: React.FC<DayOfWeekPickerProps> = ({
  value,
  onChange,
  error = false,
  helperText = ''
}) => {
  const handleChange = (event: React.MouseEvent<HTMLElement>, newDays: string[]) => {
    // Don't allow unselecting all days
    if (newDays.length > 0) {
      onChange(newDays);
    }
  };

  const handleSelectAll = () => {
    onChange(DAYS.map(d => d.value));
  };

  const handleSelectWeekdays = () => {
    onChange(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  };

  const handleSelectWeekend = () => {
    onChange(['saturday', 'sunday']);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          Days of Week *
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={handleSelectWeekdays}
          >
            Weekdays
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>|</Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={handleSelectWeekend}
          >
            Weekend
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>|</Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={handleSelectAll}
          >
            All Days
          </Typography>
        </Box>
      </Box>

      <ToggleButtonGroup
        value={value}
        onChange={handleChange}
        aria-label="days of week"
        sx={{
          width: '100%',
          display: 'flex',
          gap: 0.5,
          '& .MuiToggleButton-root': {
            flex: 1,
            py: 1.5,
            border: error ? '1px solid #d32f2f' : '1px solid #e0e0e0',
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'primary.dark'
              }
            },
            '&:not(.Mui-selected)': {
              backgroundColor: '#fafafa',
              '&:hover': {
                backgroundColor: '#f0f0f0'
              }
            }
          }
        }}
      >
        {DAYS.map((day) => (
          <ToggleButton
            key={day.value}
            value={day.value}
            aria-label={day.fullLabel}
            title={day.fullLabel}
          >
            <Typography variant="body2" fontWeight="inherit">
              {day.label}
            </Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <FormHelperText error={error} sx={{ mt: 0.5 }}>
        {helperText || `${value.length} day${value.length !== 1 ? 's' : ''} selected`}
      </FormHelperText>
    </Box>
  );
};

export default DayOfWeekPicker;
