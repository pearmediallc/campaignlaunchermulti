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
  Close as CloseIcon
} from '@mui/icons-material';
import { CampaignData, AdSetData, AdData } from './types';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  level: 'campaigns' | 'adsets' | 'ads';
  selectedItems: Set<string>;
  data: (CampaignData | AdSetData | AdData)[];
  onRefresh: () => void;
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
  onRefresh
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
          alert('Budget editing not yet implemented');
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
