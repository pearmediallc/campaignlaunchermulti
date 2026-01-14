import React, { useState, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography
} from '@mui/material';

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  error?: boolean;
  helperText?: string;
}

// Commonly used timezones (sorted by UTC offset)
const COMMON_TIMEZONES = [
  { label: 'Pacific Time - Los Angeles (UTC-8)', value: 'America/Los_Angeles', offset: -8 },
  { label: 'Mountain Time - Denver (UTC-7)', value: 'America/Denver', offset: -7 },
  { label: 'Central Time - Chicago (UTC-6)', value: 'America/Chicago', offset: -6 },
  { label: 'Eastern Time - New York (UTC-5)', value: 'America/New_York', offset: -5 },
  { label: 'London (UTC+0)', value: 'Europe/London', offset: 0 },
  { label: 'Paris/Berlin (UTC+1)', value: 'Europe/Paris', offset: 1 },
  { label: 'Dubai (UTC+4)', value: 'Asia/Dubai', offset: 4 },
  { label: 'Mumbai/Kolkata (UTC+5:30)', value: 'Asia/Kolkata', offset: 5.5 },
  { label: 'Singapore (UTC+8)', value: 'Asia/Singapore', offset: 8 },
  { label: 'Tokyo (UTC+9)', value: 'Asia/Tokyo', offset: 9 },
  { label: 'Sydney (UTC+10)', value: 'Australia/Sydney', offset: 10 }
];

// All US state timezones
const US_TIMEZONES = [
  { label: 'Alaska - Anchorage (UTC-9)', value: 'America/Anchorage', offset: -9 },
  { label: 'Hawaii - Honolulu (UTC-10)', value: 'Pacific/Honolulu', offset: -10 },
  { label: 'Pacific - Los Angeles (UTC-8)', value: 'America/Los_Angeles', offset: -8 },
  { label: 'Pacific - Portland (UTC-8)', value: 'America/Los_Angeles', offset: -8 },
  { label: 'Pacific - Seattle (UTC-8)', value: 'America/Los_Angeles', offset: -8 },
  { label: 'Pacific - San Francisco (UTC-8)', value: 'America/Los_Angeles', offset: -8 },
  { label: 'Mountain - Denver (UTC-7)', value: 'America/Denver', offset: -7 },
  { label: 'Mountain - Phoenix (UTC-7)', value: 'America/Phoenix', offset: -7 },
  { label: 'Central - Chicago (UTC-6)', value: 'America/Chicago', offset: -6 },
  { label: 'Central - Dallas (UTC-6)', value: 'America/Chicago', offset: -6 },
  { label: 'Eastern - New York (UTC-5)', value: 'America/New_York', offset: -5 },
  { label: 'Eastern - Miami (UTC-5)', value: 'America/New_York', offset: -5 },
  { label: 'Eastern - Atlanta (UTC-5)', value: 'America/New_York', offset: -5 },
  { label: 'Eastern - Boston (UTC-5)', value: 'America/New_York', offset: -5 }
];

// Major international timezones
const INTERNATIONAL_TIMEZONES = [
  { label: 'London, UK (UTC+0)', value: 'Europe/London', offset: 0 },
  { label: 'Paris, France (UTC+1)', value: 'Europe/Paris', offset: 1 },
  { label: 'Berlin, Germany (UTC+1)', value: 'Europe/Berlin', offset: 1 },
  { label: 'Rome, Italy (UTC+1)', value: 'Europe/Rome', offset: 1 },
  { label: 'Madrid, Spain (UTC+1)', value: 'Europe/Madrid', offset: 1 },
  { label: 'Cairo, Egypt (UTC+2)', value: 'Africa/Cairo', offset: 2 },
  { label: 'Moscow, Russia (UTC+3)', value: 'Europe/Moscow', offset: 3 },
  { label: 'Dubai, UAE (UTC+4)', value: 'Asia/Dubai', offset: 4 },
  { label: 'Mumbai, India (UTC+5:30)', value: 'Asia/Kolkata', offset: 5.5 },
  { label: 'Bangkok, Thailand (UTC+7)', value: 'Asia/Bangkok', offset: 7 },
  { label: 'Singapore (UTC+8)', value: 'Asia/Singapore', offset: 8 },
  { label: 'Hong Kong (UTC+8)', value: 'Asia/Hong_Kong', offset: 8 },
  { label: 'Tokyo, Japan (UTC+9)', value: 'Asia/Tokyo', offset: 9 },
  { label: 'Sydney, Australia (UTC+10)', value: 'Australia/Sydney', offset: 10 },
  { label: 'Auckland, New Zealand (UTC+12)', value: 'Pacific/Auckland', offset: 12 }
];

// Combine all timezones and remove duplicates
const ALL_TIMEZONES = [
  ...COMMON_TIMEZONES,
  ...US_TIMEZONES,
  ...INTERNATIONAL_TIMEZONES
].filter((tz, index, self) =>
  index === self.findIndex((t) => t.value === tz.value)
);

const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  value,
  onChange,
  error = false,
  helperText = ''
}) => {
  const [inputValue, setInputValue] = useState('');

  const selectedOption = useMemo(() => {
    return ALL_TIMEZONES.find(tz => tz.value === value) || null;
  }, [value]);

  return (
    <Autocomplete
      value={selectedOption}
      onChange={(event, newValue) => {
        if (newValue) {
          onChange(newValue.value);
        }
      }}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      options={ALL_TIMEZONES}
      groupBy={(option) => {
        if (COMMON_TIMEZONES.some(tz => tz.value === option.value)) {
          return '🌟 Common Timezones';
        } else if (US_TIMEZONES.some(tz => tz.value === option.value)) {
          return '🇺🇸 United States';
        } else {
          return '🌍 International';
        }
      }}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Timezone"
          error={error}
          helperText={helperText || 'Select the timezone for your schedule'}
          required
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.value}>
          <Typography variant="body2">
            {option.label}
          </Typography>
        </Box>
      )}
      sx={{
        '& .MuiAutocomplete-groupLabel': {
          backgroundColor: '#f5f5f5',
          fontWeight: 600,
          fontSize: '0.875rem'
        }
      }}
    />
  );
};

export default TimezoneSelector;
