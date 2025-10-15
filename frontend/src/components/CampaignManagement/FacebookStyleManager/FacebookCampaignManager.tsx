import React, { useState, useMemo } from 'react';
import { Box, TextField, InputAdornment, IconButton } from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import LevelTabs from './LevelTabs';
import DataTable from './DataTable';
import FilterBar, { FilterOptions } from './FilterBar';
import { useFacebookData } from './hooks/useFacebookData';
import { CampaignData, AdSetData, AdData } from './types';

/**
 * Facebook-Style Campaign Manager
 * Mimics Facebook Ads Manager UI with three-level hierarchy
 */
const FacebookCampaignManager: React.FC = () => {
  const [activeLevel, setActiveLevel] = useState<'campaigns' | 'adsets' | 'ads'>('campaigns');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set()); // Track which rows are loading
  const [dateRange, setDateRange] = useState('last_14d');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    deliveryStatus: [],
    learningStatus: [],
    issuesStatus: []
  });

  // Fetch data based on active level
  const { data, loading, error, refetch, hasMore, loadMore } = useFacebookData({
    level: activeLevel,
    dateRange,
    expandedRows,
    searchQuery
  });

  // Apply filters to data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Delivery status filter
    if (filters.deliveryStatus.length > 0) {
      filtered = filtered.filter((item: CampaignData | AdSetData | AdData) => {
        const effectiveStatus = item.effective_status || item.status;

        // Check if item matches any selected delivery status
        return filters.deliveryStatus.some(status => {
          if (status === 'WITH_ISSUES') return item.issues_info && item.issues_info.length > 0;
          if (status === 'IN_REVIEW') return effectiveStatus?.includes('REVIEW') || effectiveStatus === 'PENDING_REVIEW';
          if (status === 'PENDING_REVIEW') return effectiveStatus === 'PENDING_REVIEW';
          if (status === 'DISAPPROVED') return effectiveStatus === 'DISAPPROVED';
          if (status === 'NOT_DELIVERING') return effectiveStatus === 'CAMPAIGN_PAUSED' || effectiveStatus === 'ADSET_PAUSED';
          return effectiveStatus === status || item.status === status;
        });
      });
    }

    // Learning status filter (ad sets only)
    if (filters.learningStatus.length > 0 && activeLevel === 'adsets') {
      filtered = filtered.filter((item: AdSetData) => {
        const learningStatus = item.learning_stage_info?.status;
        return filters.learningStatus.includes(learningStatus || 'NOT_LEARNING');
      });
    }

    // Issues filter
    if (filters.issuesStatus.length > 0) {
      filtered = filtered.filter((item: CampaignData | AdSetData | AdData) => {
        const hasIssues = item.issues_info && item.issues_info.length > 0;

        if (filters.issuesStatus.includes('HAS_ISSUES') && hasIssues) return true;
        if (filters.issuesStatus.includes('NO_ISSUES') && !hasIssues) return true;
        return false;
      });
    }

    return filtered;
  }, [data, filters, activeLevel]);

  const handleLevelChange = (level: 'campaigns' | 'adsets' | 'ads') => {
    setActiveLevel(level);
    setSelectedItems(new Set()); // Clear selection when changing levels
    setExpandedRows(new Set()); // Clear expanded rows
    setFilters({ deliveryStatus: [], learningStatus: [], issuesStatus: [] }); // Clear filters
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
    const newLoading = new Set(loadingRows);

    if (newExpanded.has(id)) {
      // Collapsing - remove from expanded
      newExpanded.delete(id);
      newLoading.delete(id);
    } else {
      // Expanding - add to both expanded and loading
      newExpanded.add(id);
      newLoading.add(id);

      // Remove from loading after data is fetched (simulated delay)
      setTimeout(() => {
        setLoadingRows(prev => {
          const updated = new Set(prev);
          updated.delete(id);
          return updated;
        });
      }, 1500); // Will be replaced when data actually loads
    }

    setExpandedRows(newExpanded);
    setLoadingRows(newLoading);
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

      {/* Filter Bar */}
      <FilterBar
        level={activeLevel}
        activeFilters={filters}
        onFilterChange={setFilters}
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
        data={filteredData}
        loading={loading}
        error={error}
        selectedItems={selectedItems}
        expandedRows={expandedRows}
        loadingRows={loadingRows}
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
