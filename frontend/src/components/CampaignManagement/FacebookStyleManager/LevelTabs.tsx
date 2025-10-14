import React from 'react';
import { Box, Tabs, Tab, Select, MenuItem, FormControl, Typography } from '@mui/material';

interface LevelTabsProps {
  activeLevel: 'campaigns' | 'adsets' | 'ads';
  onLevelChange: (level: 'campaigns' | 'adsets' | 'ads') => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

/**
 * Level Tabs Component - Mimics Facebook's Campaign | Ad Sets | Ads tabs
 */
const LevelTabs: React.FC<LevelTabsProps> = ({
  activeLevel,
  onLevelChange,
  dateRange,
  onDateRangeChange
}) => {
  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid #e4e6eb',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          py: 1
        }}
      >
        {/* Level Tabs */}
        <Tabs
          value={activeLevel}
          onChange={(_, newValue) => onLevelChange(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '15px',
              fontWeight: 500,
              minWidth: 120,
              color: '#65676b'
            },
            '& .Mui-selected': {
              color: '#1877f2'
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#1877f2',
              height: 3
            }
          }}
        >
          <Tab label="Campaigns" value="campaigns" />
          <Tab label="Ad Sets" value="adsets" />
          <Tab label="Ads" value="ads" />
        </Tabs>

        {/* Date Range Selector */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            sx={{
              fontSize: '14px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#ccd0d5'
              }
            }}
          >
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="yesterday">Yesterday</MenuItem>
            <MenuItem value="last_3d">Last 3 days</MenuItem>
            <MenuItem value="last_7d">Last 7 days</MenuItem>
            <MenuItem value="last_14d">Last 14 days</MenuItem>
            <MenuItem value="last_28d">Last 28 days</MenuItem>
            <MenuItem value="last_30d">Last 30 days</MenuItem>
            <MenuItem value="last_90d">Last 90 days</MenuItem>
            <MenuItem value="this_month">This month</MenuItem>
            <MenuItem value="last_month">Last month</MenuItem>
            <MenuItem value="maximum">All time</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default LevelTabs;
