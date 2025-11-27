import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert as MuiAlert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Divider,
  IconButton
} from '@mui/material';
import {
  Search,
  Refresh,
  FilterList,
  DateRange,
  Close
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCampaignManagement } from '../../../hooks/useCampaignManagement';
import CampaignTable from './CampaignTable';
import PerformanceMetrics from './PerformanceMetrics';

const CampaignManagementContainer: React.FC = () => {
  // Date Range State (must be before hook call)
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });

  const {
    campaigns,
    metrics,
    loading,
    error,
    updateCampaignStatus,
    bulkUpdateStatus,
    refetch
  } = useCampaignManagement({ dateRange });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Advanced Filters State
  const [advancedFilters, setAdvancedFilters] = useState({
    hasIssues: false,
    learningStatus: [] as string[],
    objective: [] as string[]
  });
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;

    // Advanced Filters
    const matchesLearning = advancedFilters.learningStatus.length === 0 ||
      (campaign.duplicatedAdSets && campaign.duplicatedAdSets.some(adset =>
        adset.learningStatus && advancedFilters.learningStatus.includes(adset.learningStatus)
      ));

    const matchesObjective = advancedFilters.objective.length === 0 ||
      (campaign.objective && advancedFilters.objective.includes(campaign.objective));

    // Check if campaign has issues
    const hasIssues = campaign.issues_info && Array.isArray(campaign.issues_info) && campaign.issues_info.length > 0;
    const matchesIssues = !advancedFilters.hasIssues || hasIssues;

    return matchesSearch && matchesStatus && matchesLearning && matchesObjective && matchesIssues;
  });

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedCampaigns(selected ? filteredCampaigns.map(c => c.id) : []);
  };

  const handleUpdateStatus = async (campaignId: string, status: 'ACTIVE' | 'PAUSED') => {
    try {
      await updateCampaignStatus(campaignId, status);
      setSnackbar({
        open: true,
        message: `Campaign ${status.toLowerCase()} successfully`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update campaign status',
        severity: 'error'
      });
    }
  };

  const handleBulkAction = async (action: 'pause' | 'resume', campaignIds: string[]) => {
    try {
      const status = action === 'pause' ? 'PAUSED' : 'ACTIVE';
      await bulkUpdateStatus(campaignIds, status);
      setSelectedCampaigns([]);
      setSnackbar({
        open: true,
        message: `${campaignIds.length} campaign(s) ${action}d successfully`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to ${action} campaigns`,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleClearAllFilters = () => {
    setDateRange({ start: null, end: null });
    setAdvancedFilters({ hasIssues: false, learningStatus: [], objective: [] });
    setStatusFilter('all');
    setSearchTerm('');
  };

  const handleApplyDateRange = () => {
    setShowDatePicker(false);
    // The useCampaignManagement hook will automatically refetch data with the new date range
  };

  const handleApplyAdvancedFilters = () => {
    setShowFilterDialog(false);
  };

  const formatDateRange = () => {
    if (!dateRange.start && !dateRange.end) return '';
    const start = dateRange.start ? dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const end = dateRange.end ? dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    if (start && end) return `${start} - ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return '';
  };

  const hasActiveFilters = dateRange.start || dateRange.end || advancedFilters.hasIssues ||
    advancedFilters.learningStatus.length > 0 || advancedFilters.objective.length > 0 ||
    statusFilter !== 'all' || searchTerm !== '';

  const activeCount = filteredCampaigns.filter(c => c.status === 'ACTIVE').length;
  const pausedCount = filteredCampaigns.filter(c => c.status === 'PAUSED').length;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom align="center">
          Campaign Management
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Monitor and manage your campaigns
        </Typography>
      </Box>

      <PerformanceMetrics metrics={metrics} loading={loading} />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">
            Campaigns ({filteredCampaigns.length})
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`${activeCount} Active`}
              color="success"
              size="small"
              variant={statusFilter === 'ACTIVE' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'all' : 'ACTIVE')}
              clickable
            />
            <Chip
              label={`${pausedCount} Paused`}
              color="warning"
              size="small"
              variant={statusFilter === 'PAUSED' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter(statusFilter === 'PAUSED' ? 'all' : 'PAUSED')}
              clickable
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={refetch}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        </Box>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="medium">
              Active Filters:
            </Typography>

            {/* Search Term Chip */}
            {searchTerm && (
              <Chip
                label={`Search: "${searchTerm}"`}
                onDelete={() => setSearchTerm('')}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}

            {/* Status Filter Chip */}
            {statusFilter !== 'all' && (
              <Chip
                label={`Status: ${statusFilter}`}
                onDelete={() => setStatusFilter('all')}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}

            {/* Date Range Chip */}
            {(dateRange.start || dateRange.end) && (
              <Chip
                label={`Date: ${formatDateRange()}`}
                onDelete={() => setDateRange({ start: null, end: null })}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}

            {/* Learning Status Chips */}
            {advancedFilters.learningStatus.map(status => (
              <Chip
                key={status}
                label={`Learning: ${status}`}
                onDelete={() => setAdvancedFilters({
                  ...advancedFilters,
                  learningStatus: advancedFilters.learningStatus.filter(s => s !== status)
                })}
                color="info"
                variant="outlined"
                size="small"
              />
            ))}

            {/* Objective Chips */}
            {advancedFilters.objective.map(obj => (
              <Chip
                key={obj}
                label={`Objective: ${obj}`}
                onDelete={() => setAdvancedFilters({
                  ...advancedFilters,
                  objective: advancedFilters.objective.filter(o => o !== obj)
                })}
                color="info"
                variant="outlined"
                size="small"
              />
            ))}

            {/* Has Issues Chip */}
            {advancedFilters.hasIssues && (
              <Chip
                label="Has Issues"
                onDelete={() => setAdvancedFilters({ ...advancedFilters, hasIssues: false })}
                color="warning"
                variant="outlined"
                size="small"
              />
            )}

            {/* Clear All Button */}
            <Button
              size="small"
              onClick={handleClearAllFilters}
              sx={{ ml: 1 }}
            >
              Clear All
            </Button>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              )
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status Filter"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="PAUSED">Paused</MenuItem>
              <MenuItem value="ARCHIVED">Archived</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<DateRange />}
            size="small"
            onClick={() => setShowDatePicker(true)}
            color={dateRange.start || dateRange.end ? 'primary' : 'inherit'}
          >
            Date Range
          </Button>

          <Button
            variant="outlined"
            startIcon={<FilterList />}
            size="small"
            onClick={() => setShowFilterDialog(true)}
            color={advancedFilters.learningStatus.length > 0 || advancedFilters.objective.length > 0 || advancedFilters.hasIssues ? 'primary' : 'inherit'}
          >
            More Filters
          </Button>
        </Box>

        <CampaignTable
          campaigns={filteredCampaigns}
          loading={loading}
          selectedCampaigns={selectedCampaigns}
          onSelectCampaign={handleSelectCampaign}
          onSelectAll={handleSelectAll}
          onUpdateStatus={handleUpdateStatus}
          onBulkAction={handleBulkAction}
        />
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <MuiAlert severity="error" variant="filled">
            {error}
          </MuiAlert>
        </Snackbar>
      )}

      {/* Date Range Picker Dialog */}
      <Dialog open={showDatePicker} onClose={() => setShowDatePicker(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Select Date Range
            <IconButton onClick={() => setShowDatePicker(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <DatePicker
                label="Start Date"
                value={dateRange.start}
                onChange={(newValue) => setDateRange({ ...dateRange, start: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <DatePicker
                label="End Date"
                value={dateRange.end}
                onChange={(newValue) => setDateRange({ ...dateRange, end: newValue })}
                minDate={dateRange.start || undefined}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateRange({ start: null, end: null })}>
            Clear
          </Button>
          <Button onClick={() => setShowDatePicker(false)}>Cancel</Button>
          <Button onClick={handleApplyDateRange} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advanced Filters Dialog */}
      <Dialog open={showFilterDialog} onClose={() => setShowFilterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            More Filters
            <IconButton onClick={() => setShowFilterDialog(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Learning Status Filter */}
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Learning Phase Status
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={advancedFilters.learningStatus.includes('LEARNING')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAdvancedFilters({
                          ...advancedFilters,
                          learningStatus: [...advancedFilters.learningStatus, 'LEARNING']
                        });
                      } else {
                        setAdvancedFilters({
                          ...advancedFilters,
                          learningStatus: advancedFilters.learningStatus.filter(s => s !== 'LEARNING')
                        });
                      }
                    }}
                  />
                }
                label="Learning"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={advancedFilters.learningStatus.includes('SUCCESS')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAdvancedFilters({
                          ...advancedFilters,
                          learningStatus: [...advancedFilters.learningStatus, 'SUCCESS']
                        });
                      } else {
                        setAdvancedFilters({
                          ...advancedFilters,
                          learningStatus: advancedFilters.learningStatus.filter(s => s !== 'SUCCESS')
                        });
                      }
                    }}
                  />
                }
                label="Active (Learning Complete)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={advancedFilters.learningStatus.includes('FAIL')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAdvancedFilters({
                          ...advancedFilters,
                          learningStatus: [...advancedFilters.learningStatus, 'FAIL']
                        });
                      } else {
                        setAdvancedFilters({
                          ...advancedFilters,
                          learningStatus: advancedFilters.learningStatus.filter(s => s !== 'FAIL')
                        });
                      }
                    }}
                  />
                }
                label="Learning Limited"
              />
            </FormGroup>

            <Divider sx={{ my: 2 }} />

            {/* Objective Filter */}
            <Typography variant="subtitle2" gutterBottom>
              Campaign Objective
            </Typography>
            <FormGroup>
              {['CONVERSIONS', 'TRAFFIC', 'ENGAGEMENT', 'LEAD_GENERATION', 'APP_INSTALLS'].map(obj => (
                <FormControlLabel
                  key={obj}
                  control={
                    <Checkbox
                      checked={advancedFilters.objective.includes(obj)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAdvancedFilters({
                            ...advancedFilters,
                            objective: [...advancedFilters.objective, obj]
                          });
                        } else {
                          setAdvancedFilters({
                            ...advancedFilters,
                            objective: advancedFilters.objective.filter(o => o !== obj)
                          });
                        }
                      }}
                    />
                  }
                  label={obj.replace(/_/g, ' ')}
                />
              ))}
            </FormGroup>

            <Divider sx={{ my: 2 }} />

            {/* Has Issues Filter */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={advancedFilters.hasIssues}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, hasIssues: e.target.checked })}
                />
              }
              label="Show only campaigns with issues"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvancedFilters({ hasIssues: false, learningStatus: [], objective: [] })}>
            Clear All
          </Button>
          <Button onClick={() => setShowFilterDialog(false)}>Cancel</Button>
          <Button onClick={handleApplyAdvancedFilters} variant="contained">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CampaignManagementContainer;