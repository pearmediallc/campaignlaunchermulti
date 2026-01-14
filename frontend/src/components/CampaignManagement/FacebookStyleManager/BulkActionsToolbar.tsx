import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Button,
  Menu,
  MenuItem,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow as ActivateIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { CampaignData, AdSetData, AdData } from './types';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  level: 'campaigns' | 'adsets' | 'ads';
  selectedItems: Set<string>;
  data: (CampaignData | AdSetData | AdData)[];
  onRefresh: () => void;
  onBulkSchedule?: () => void;
}

/**
 * Bulk Actions Toolbar - Appears when items are selected
 */
const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  level,
  selectedItems,
  data,
  onRefresh,
  onBulkSchedule
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>, action: string) => {
    setAnchorEl(event.currentTarget);
    setActionType(action);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActionType(null);
  };

  const handleAction = async (action: string) => {
    console.log(`Bulk action: ${action} on ${selectedCount} ${level}`);
    handleCloseMenu();
    setLoading(true);

    try {
      const API_BASE = '/api/campaigns';
      const selectedIds = Array.from(selectedItems);
      let successCount = 0;
      let errorCount = 0;

      switch (action) {
        case 'activate':
        case 'pause':
          const newStatus = action === 'activate' ? 'ACTIVE' : 'PAUSED';

          // Loop through selected items and update status
          for (const id of selectedIds) {
            try {
              let endpoint = '';
              if (level === 'campaigns') {
                endpoint = `${API_BASE}/${id}/edit`;
              } else if (level === 'adsets') {
                endpoint = `${API_BASE}/adsets/${id}/edit`;
              } else if (level === 'ads') {
                endpoint = `${API_BASE}/ads/${id}/edit`;
              }

              await axios.put(endpoint, { status: newStatus });
              successCount++;
              console.log(`✅ ${action} successful for ${id}`);
            } catch (error) {
              console.error(`❌ ${action} failed for ${id}:`, error);
              errorCount++;
            }
          }

          alert(`Bulk ${action}: ${successCount} succeeded, ${errorCount} failed`);
          break;

        case 'duplicate':
          if (level !== 'campaigns') {
            alert('Duplication is only available for campaigns');
            break;
          }

          // Duplicate each selected campaign
          for (const id of selectedIds) {
            try {
              const originalItem = data.find(item => item.id === id);
              const copyName = originalItem ? `${originalItem.name} - Copy` : 'Campaign Copy';

              await axios.post(`${API_BASE}/${id}/duplicate`, {
                new_name: copyName,
                number_of_copies: 1
              });
              successCount++;
              console.log(`✅ Duplicate successful for ${id}`);
            } catch (error) {
              console.error(`❌ Duplicate failed for ${id}:`, error);
              errorCount++;
            }
          }

          alert(`Bulk duplicate: ${successCount} succeeded, ${errorCount} failed`);
          break;

        case 'delete':
          const confirmDelete = window.confirm(
            `Are you sure you want to delete ${selectedCount} ${level}? This action cannot be undone.`
          );
          if (!confirmDelete) {
            break;
          }

          // Delete each selected item
          for (const id of selectedIds) {
            try {
              let endpoint = '';
              if (level === 'campaigns') {
                endpoint = `${API_BASE}/${id}`;
              } else if (level === 'adsets') {
                endpoint = `${API_BASE}/adsets/${id}`;
              } else if (level === 'ads') {
                endpoint = `${API_BASE}/ads/${id}`;
              }

              await axios.delete(endpoint);
              successCount++;
              console.log(`✅ Delete successful for ${id}`);
            } catch (error) {
              console.error(`❌ Delete failed for ${id}:`, error);
              errorCount++;
            }
          }

          alert(`Bulk delete: ${successCount} succeeded, ${errorCount} failed`);
          break;

        case 'increase_budget':
        case 'decrease_budget':
        case 'set_budget':
          const budgetAction = action.replace('_budget', '');
          let budgetValue: number | null = null;

          if (budgetAction === 'set') {
            const input = window.prompt('Enter new daily budget (in dollars):');
            if (!input) break;
            budgetValue = parseFloat(input);
            if (isNaN(budgetValue) || budgetValue <= 0) {
              alert('Please enter a valid budget amount');
              break;
            }
          } else if (budgetAction === 'increase' || budgetAction === 'decrease') {
            const input = window.prompt(
              `Enter amount to ${budgetAction} budget by (in dollars):`
            );
            if (!input) break;
            const amount = parseFloat(input);
            if (isNaN(amount) || amount <= 0) {
              alert('Please enter a valid amount');
              break;
            }

            // For increase/decrease, we need to get current budgets and calculate new ones
            for (const id of selectedIds) {
              try {
                const item = data.find(d => d.id === id);
                if (!item) continue;

                // Type guard: Ads don't have budgets
                if (level === 'ads') {
                  console.warn('Ads do not have budgets');
                  errorCount++;
                  continue;
                }

                // Get current budget (campaigns and ad sets have daily_budget)
                const currentBudget = parseFloat(String((item as any).daily_budget || (item as any).budget || 0)) / 100;
                const newBudget = budgetAction === 'increase'
                  ? currentBudget + amount
                  : Math.max(1, currentBudget - amount); // Minimum $1

                let endpoint = '';
                if (level === 'campaigns') {
                  endpoint = `${API_BASE}/${id}/edit`;
                } else if (level === 'adsets') {
                  endpoint = `${API_BASE}/adsets/${id}/edit`;
                }

                await axios.put(endpoint, { daily_budget: newBudget });
                successCount++;
              } catch (error) {
                errorCount++;
              }
            }

            alert(`Bulk budget ${budgetAction}: ${successCount} succeeded, ${errorCount} failed`);
            break;
          }

          // For 'set' budget
          if (budgetValue !== null) {
            for (const id of selectedIds) {
              try {
                let endpoint = '';
                if (level === 'campaigns') {
                  endpoint = `${API_BASE}/${id}/edit`;
                } else if (level === 'adsets') {
                  endpoint = `${API_BASE}/adsets/${id}/edit`;
                }

                await axios.put(endpoint, { daily_budget: budgetValue });
                successCount++;
              } catch (error) {
                errorCount++;
              }
            }

            alert(`Bulk set budget: ${successCount} succeeded, ${errorCount} failed`);
          }
          break;

        default:
          console.log('Unknown action:', action);
      }

      // Refresh data and clear selection
      onRefresh();
      onClearSelection();
    } catch (error: any) {
      console.error('Bulk action error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'sticky',
        top: 60,
        zIndex: 90,
        mb: 2,
        bgcolor: '#1877f2',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        py: 1.5,
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {loading ? (
          <>
            <CircularProgress size={20} sx={{ color: 'white' }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Processing...
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {selectedCount} selected
            </Typography>

            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />

            {/* Activate */}
            <Button
              variant="text"
              startIcon={<ActivateIcon />}
              onClick={() => handleAction('activate')}
              disabled={loading}
              sx={{ color: 'white', textTransform: 'none' }}
            >
              Activate
            </Button>

            {/* Pause */}
            <Button
              variant="text"
              startIcon={<PauseIcon />}
              onClick={() => handleAction('pause')}
              disabled={loading}
              sx={{ color: 'white', textTransform: 'none' }}
            >
              Pause
            </Button>

            {/* Schedule (only for campaigns) */}
            {level === 'campaigns' && onBulkSchedule && (
              <Button
                variant="text"
                startIcon={<ScheduleIcon />}
                onClick={onBulkSchedule}
                disabled={loading}
                sx={{ color: 'white', textTransform: 'none' }}
              >
                Schedule
              </Button>
            )}

            {/* Duplicate */}
            <Button
              variant="text"
              startIcon={<DuplicateIcon />}
              onClick={() => handleAction('duplicate')}
              disabled={loading}
          sx={{ color: 'white', textTransform: 'none' }}
        >
          Duplicate
        </Button>

            {/* Edit Budget (only for campaigns and adsets) */}
            {(level === 'campaigns' || level === 'adsets') && (
              <Button
                variant="text"
                startIcon={<EditIcon />}
                onClick={(e) => handleOpenMenu(e, 'budget')}
                disabled={loading}
                sx={{ color: 'white', textTransform: 'none' }}
              >
                Edit Budget
              </Button>
            )}

            {/* Delete */}
            <Button
              variant="text"
              startIcon={<DeleteIcon />}
              onClick={() => handleAction('delete')}
              disabled={loading}
              sx={{ color: 'white', textTransform: 'none' }}
            >
              Delete
            </Button>
          </>
        )}
      </Box>

      {/* Clear Selection */}
      <Button
        variant="text"
        startIcon={<CloseIcon />}
        onClick={onClearSelection}
        disabled={loading}
        sx={{ color: 'white', textTransform: 'none' }}
      >
        Clear
      </Button>

      {/* Budget Edit Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && actionType === 'budget'}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => handleAction('increase_budget')}>Increase Budget</MenuItem>
        <MenuItem onClick={() => handleAction('decrease_budget')}>Decrease Budget</MenuItem>
        <MenuItem onClick={() => handleAction('set_budget')}>Set Budget</MenuItem>
      </Menu>
    </Paper>
  );
};

export default BulkActionsToolbar;
