import React, { useState } from 'react';
import { Box, TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import LevelTabs from './LevelTabs';
import DataTable from './DataTable';
import { useFacebookData } from './hooks/useFacebookData';

/**
 * Facebook-Style Campaign Manager
 * Mimics Facebook Ads Manager UI with three-level hierarchy
 */
const FacebookCampaignManager: React.FC = () => {
  const [activeLevel, setActiveLevel] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState('last_14d');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data based on active level
  const { data, loading, error, refetch, hasMore, loadMore } = useFacebookData({
    level: activeLevel,
    dateRange,
    expandedRows,
    searchQuery
  });

  const handleLevelChange = (level: 'campaigns' | 'adsets' | 'ads') => {
    setActiveLevel(level);
    setSelectedItems(new Set()); // Clear selection when changing levels
    setExpandedRows(new Set()); // Clear expanded rows
  };

  const handleSelectItem = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAll = (ids: string[]) => {
    if (selectedItems.size === ids.length) {
      setSelectedItems(new Set()); // Deselect all
    } else {
      setSelectedItems(new Set(ids)); // Select all
    }
  };

  const handleToggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <Box sx={{ width: '100%', bgcolor: '#f5f6f7', minHeight: '100vh', pb: 4 }}>
      {/* Tab Navigation */}
      <LevelTabs
        activeLevel={activeLevel}
        onLevelChange={handleLevelChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Search Bar */}
      <Box sx={{ px: 3, pt: 2, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={`Search ${activeLevel} by name or ID...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#65676b' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery('')}
                  sx={{ padding: '4px' }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{
            bgcolor: 'white',
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#dddfe2'
              },
              '&:hover fieldset': {
                borderColor: '#1877f2'
              }
            }
          }}
        />
      </Box>

      {/* Data Table */}
      <DataTable
        level={activeLevel}
        data={data}
        loading={loading}
        error={error}
        selectedItems={selectedItems}
        expandedRows={expandedRows}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        onToggleRow={handleToggleRow}
        onRefresh={refetch}
        hasMore={hasMore}
        onLoadMore={loadMore}
        searchQuery={searchQuery}
      />
    </Box>
  );
};

export default FacebookCampaignManager;
