import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Chip,
  Divider,
  Typography
} from '@mui/material';
import { FilterList as FilterIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

export interface FilterOptions {
  deliveryStatus: string[];
  learningStatus: string[];
  issuesStatus: string[];
}

interface FilterBarProps {
  level: 'campaigns' | 'adsets' | 'ads';
  activeFilters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

const DELIVERY_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active', color: '#00a400' },
  { value: 'PAUSED', label: 'Paused', color: '#ed6c02' },
  { value: 'IN_REVIEW', label: 'In Review', color: '#0288d1' },
  { value: 'PENDING_REVIEW', label: 'Pending Review', color: '#0288d1' },
  { value: 'DISAPPROVED', label: 'Disapproved', color: '#d32f2f' },
  { value: 'WITH_ISSUES', label: 'With Issues', color: '#d32f2f' },
  { value: 'NOT_DELIVERING', label: 'Not Delivering', color: '#9e9e9e' }
];

const LEARNING_STATUS_OPTIONS = [
  { value: 'LEARNING', label: 'Learning', color: '#0288d1' },
  { value: 'LEARNING_LIMITED', label: 'Learning Limited', color: '#ed6c02' },
  { value: 'NOT_LEARNING', label: 'Not Learning', color: '#00a400' }
];

const ISSUES_OPTIONS = [
  { value: 'HAS_ISSUES', label: 'Has Issues', color: '#d32f2f' },
  { value: 'NO_ISSUES', label: 'No Issues', color: '#00a400' }
];

const FilterBar: React.FC<FilterBarProps> = ({ level, activeFilters, onFilterChange }) => {
  const [deliveryAnchor, setDeliveryAnchor] = useState<null | HTMLElement>(null);
  const [learningAnchor, setLearningAnchor] = useState<null | HTMLElement>(null);
  const [issuesAnchor, setIssuesAnchor] = useState<null | HTMLElement>(null);

  const deliveryOpen = Boolean(deliveryAnchor);
  const learningOpen = Boolean(learningAnchor);
  const issuesOpen = Boolean(issuesAnchor);

  const handleDeliveryToggle = (value: string) => {
    const newStatuses = activeFilters.deliveryStatus.includes(value)
      ? activeFilters.deliveryStatus.filter(s => s !== value)
      : [...activeFilters.deliveryStatus, value];

    onFilterChange({ ...activeFilters, deliveryStatus: newStatuses });
  };

  const handleLearningToggle = (value: string) => {
    const newStatuses = activeFilters.learningStatus.includes(value)
      ? activeFilters.learningStatus.filter(s => s !== value)
      : [...activeFilters.learningStatus, value];

    onFilterChange({ ...activeFilters, learningStatus: newStatuses });
  };

  const handleIssuesToggle = (value: string) => {
    const newStatuses = activeFilters.issuesStatus.includes(value)
      ? activeFilters.issuesStatus.filter(s => s !== value)
      : [...activeFilters.issuesStatus, value];

    onFilterChange({ ...activeFilters, issuesStatus: newStatuses });
  };

  const clearAllFilters = () => {
    onFilterChange({ deliveryStatus: [], learningStatus: [], issuesStatus: [] });
  };

  const totalActiveFilters =
    activeFilters.deliveryStatus.length +
    activeFilters.learningStatus.length +
    activeFilters.issuesStatus.length;

  return (
    <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid #e4e6eb', display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Delivery Status Filter */}
      <Button
        variant={activeFilters.deliveryStatus.length > 0 ? 'contained' : 'outlined'}
        size="small"
        endIcon={<ExpandMoreIcon />}
        onClick={(e) => setDeliveryAnchor(e.currentTarget)}
        sx={{
          textTransform: 'none',
          borderColor: '#dddfe2',
          color: activeFilters.deliveryStatus.length > 0 ? 'white' : '#050505',
          bgcolor: activeFilters.deliveryStatus.length > 0 ? '#1877f2' : 'white',
          '&:hover': {
            borderColor: '#1877f2',
            bgcolor: activeFilters.deliveryStatus.length > 0 ? '#1565d8' : 'rgba(24, 119, 242, 0.04)'
          }
        }}
      >
        Delivery
        {activeFilters.deliveryStatus.length > 0 && ` (${activeFilters.deliveryStatus.length})`}
      </Button>
      <Menu
        anchorEl={deliveryAnchor}
        open={deliveryOpen}
        onClose={() => setDeliveryAnchor(null)}
      >
        <Typography variant="caption" sx={{ px: 2, py: 1, color: '#65676b', fontWeight: 600 }}>
          DELIVERY STATUS
        </Typography>
        <Divider />
        <FormGroup sx={{ px: 2, py: 1 }}>
          {DELIVERY_STATUS_OPTIONS.map(option => (
            <FormControlLabel
              key={option.value}
              control={
                <Checkbox
                  checked={activeFilters.deliveryStatus.includes(option.value)}
                  onChange={() => handleDeliveryToggle(option.value)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: option.color }} />
                  {option.label}
                </Box>
              }
            />
          ))}
        </FormGroup>
      </Menu>

      {/* Learning Status Filter (Ad Sets only) */}
      {level === 'adsets' && (
        <>
          <Button
            variant={activeFilters.learningStatus.length > 0 ? 'contained' : 'outlined'}
            size="small"
            endIcon={<ExpandMoreIcon />}
            onClick={(e) => setLearningAnchor(e.currentTarget)}
            sx={{
              textTransform: 'none',
              borderColor: '#dddfe2',
              color: activeFilters.learningStatus.length > 0 ? 'white' : '#050505',
              bgcolor: activeFilters.learningStatus.length > 0 ? '#1877f2' : 'white',
              '&:hover': {
                borderColor: '#1877f2',
                bgcolor: activeFilters.learningStatus.length > 0 ? '#1565d8' : 'rgba(24, 119, 242, 0.04)'
              }
            }}
          >
            Learning Phase
            {activeFilters.learningStatus.length > 0 && ` (${activeFilters.learningStatus.length})`}
          </Button>
          <Menu
            anchorEl={learningAnchor}
            open={learningOpen}
            onClose={() => setLearningAnchor(null)}
          >
            <Typography variant="caption" sx={{ px: 2, py: 1, color: '#65676b', fontWeight: 600 }}>
              LEARNING PHASE
            </Typography>
            <Divider />
            <FormGroup sx={{ px: 2, py: 1 }}>
              {LEARNING_STATUS_OPTIONS.map(option => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={activeFilters.learningStatus.includes(option.value)}
                      onChange={() => handleLearningToggle(option.value)}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: option.color }} />
                      {option.label}
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Menu>
        </>
      )}

      {/* Issues Filter */}
      <Button
        variant={activeFilters.issuesStatus.length > 0 ? 'contained' : 'outlined'}
        size="small"
        endIcon={<ExpandMoreIcon />}
        onClick={(e) => setIssuesAnchor(e.currentTarget)}
        sx={{
          textTransform: 'none',
          borderColor: '#dddfe2',
          color: activeFilters.issuesStatus.length > 0 ? 'white' : '#050505',
          bgcolor: activeFilters.issuesStatus.length > 0 ? '#1877f2' : 'white',
          '&:hover': {
            borderColor: '#1877f2',
            bgcolor: activeFilters.issuesStatus.length > 0 ? '#1565d8' : 'rgba(24, 119, 242, 0.04)'
          }
        }}
      >
        Issues
        {activeFilters.issuesStatus.length > 0 && ` (${activeFilters.issuesStatus.length})`}
      </Button>
      <Menu
        anchorEl={issuesAnchor}
        open={issuesOpen}
        onClose={() => setIssuesAnchor(null)}
      >
        <Typography variant="caption" sx={{ px: 2, py: 1, color: '#65676b', fontWeight: 600 }}>
          ISSUES STATUS
        </Typography>
        <Divider />
        <FormGroup sx={{ px: 2, py: 1 }}>
          {ISSUES_OPTIONS.map(option => (
            <FormControlLabel
              key={option.value}
              control={
                <Checkbox
                  checked={activeFilters.issuesStatus.includes(option.value)}
                  onChange={() => handleIssuesToggle(option.value)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: option.color }} />
                  {option.label}
                </Box>
              }
            />
          ))}
        </FormGroup>
      </Menu>

      {/* Active Filter Chips */}
      {totalActiveFilters > 0 && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Button
            size="small"
            onClick={clearAllFilters}
            sx={{ textTransform: 'none', color: '#1877f2' }}
          >
            Clear all filters
          </Button>
        </>
      )}
    </Box>
  );
};

export default FilterBar;
