import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  FormControl,
  FormLabel,
  Slider,
  Button,
  Divider,
  Chip
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterConfig) => void;
}

export interface FilterConfig {
  status?: string[];
  minBudget?: number;
  maxBudget?: number;
  minSpend?: number;
  maxSpend?: number;
  searchText?: string;
}

/**
 * Filter Panel - Side panel for advanced filtering
 */
const FilterPanel: React.FC<FilterPanelProps> = ({ open, onClose, onApplyFilters }) => {
  const [filters, setFilters] = useState<FilterConfig>({
    status: [],
    minBudget: 0,
    maxBudget: 10000,
    minSpend: 0,
    maxSpend: 10000,
    searchText: ''
  });

  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleStatusToggle = (status: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    setFilters({ ...filters, status: newStatuses });
  };

  const handleApply = () => {
    onApplyFilters(filters);

    // Track active filters for display
    const active: string[] = [];
    if (filters.status && filters.status.length > 0) {
      active.push(`Status: ${filters.status.join(', ')}`);
    }
    if (filters.minBudget && filters.minBudget > 0) {
      active.push(`Min Budget: $${filters.minBudget}`);
    }
    if (filters.searchText && filters.searchText.trim() !== '') {
      active.push(`Search: ${filters.searchText}`);
    }
    setActiveFilters(active);

    onClose();
  };

  const handleReset = () => {
    setFilters({
      status: [],
      minBudget: 0,
      maxBudget: 10000,
      minSpend: 0,
      maxSpend: 10000,
      searchText: ''
    });
    setActiveFilters([]);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 350, p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Filters</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Search */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <FormLabel sx={{ mb: 1, fontSize: '14px', fontWeight: 600 }}>Search</FormLabel>
            <TextField
              size="small"
              placeholder="Search by name or ID"
              value={filters.searchText}
              onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
            />
          </FormControl>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Status Filter */}
        <Box sx={{ mb: 3 }}>
          <FormLabel sx={{ mb: 1, fontSize: '14px', fontWeight: 600 }}>Status</FormLabel>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'].map((status) => (
              <Chip
                key={status}
                label={status}
                onClick={() => handleStatusToggle(status)}
                color={filters.status?.includes(status) ? 'primary' : 'default'}
                variant={filters.status?.includes(status) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Budget Range */}
        <Box sx={{ mb: 3 }}>
          <FormLabel sx={{ mb: 1, fontSize: '14px', fontWeight: 600 }}>
            Budget Range (${filters.minBudget} - ${filters.maxBudget})
          </FormLabel>
          <Slider
            value={[filters.minBudget || 0, filters.maxBudget || 10000]}
            onChange={(_, newValue) => {
              const [min, max] = newValue as number[];
              setFilters({ ...filters, minBudget: min, maxBudget: max });
            }}
            valueLabelDisplay="auto"
            min={0}
            max={10000}
            step={100}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Spend Range */}
        <Box sx={{ mb: 3 }}>
          <FormLabel sx={{ mb: 1, fontSize: '14px', fontWeight: 600 }}>
            Spend Range (${filters.minSpend} - ${filters.maxSpend})
          </FormLabel>
          <Slider
            value={[filters.minSpend || 0, filters.maxSpend || 10000]}
            onChange={(_, newValue) => {
              const [min, max] = newValue as number[];
              setFilters({ ...filters, minSpend: min, maxSpend: max });
            }}
            valueLabelDisplay="auto"
            min={0}
            max={10000}
            step={100}
          />
        </Box>

        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Active Filters:
            </Typography>
            {activeFilters.map((filter, index) => (
              <Chip
                key={index}
                label={filter}
                size="small"
                sx={{ mr: 1, mb: 1 }}
                onDelete={() => {
                  // Remove this filter
                  setActiveFilters(activeFilters.filter((_, i) => i !== index));
                }}
              />
            ))}
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 4 }}>
          <Button variant="outlined" onClick={handleReset} fullWidth sx={{ textTransform: 'none' }}>
            Reset
          </Button>
          <Button variant="contained" onClick={handleApply} fullWidth sx={{ textTransform: 'none' }}>
            Apply
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default FilterPanel;
