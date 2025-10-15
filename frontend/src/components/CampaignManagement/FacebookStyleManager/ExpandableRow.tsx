import React, { useState } from 'react';
import {
  TableRow,
  TableCell,
  Checkbox,
  IconButton,
  Chip,
  Box,
  Collapse,
  Table,
  TableBody,
  Typography,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowRight as ExpandLessIcon,
  MoreVert as MoreVertIcon,
  Campaign as CampaignIcon,
  Layers as AdSetIcon,
  Article as AdIcon,
  Edit as EditIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import InlineEdit from './InlineEdit';
import EnhancedStatusChip from './EnhancedStatusChip';
import { CampaignData, AdSetData, AdData } from './types';

interface ExpandableRowProps {
  item: CampaignData | AdSetData | AdData;
  level: 'campaigns' | 'adsets' | 'ads';
  columns: Array<{ id: string; label: string }>;
  selected: boolean;
  expanded: boolean;
  isLoading?: boolean; // Show loading spinner when expanding
  onSelect: () => void;
  onToggle: () => void;
  expandedRows?: Set<string>; // For tracking nested expansions
  loadingRows?: Set<string>; // For tracking which nested rows are loading
  onToggleRow?: (id: string) => void; // For toggling nested rows
}

/**
 * Expandable Row Component - Renders a single row with expand/collapse functionality
 */
const ExpandableRow: React.FC<ExpandableRowProps> = ({
  item,
  level,
  columns,
  selected,
  expanded,
  isLoading = false,
  onSelect,
  onToggle,
  expandedRows = new Set(),
  loadingRows = new Set(),
  onToggleRow
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action: string) => {
    console.log(`Action: ${action} on ${level} ${item.id}`);
    // TODO: Implement actual actions
    handleMenuClose();
  };

  const hasChildren =
    (level === 'campaigns' && (item as CampaignData).adsets && (item as CampaignData).adsets!.length > 0) ||
    (level === 'adsets' && (item as AdSetData).ads && (item as AdSetData).ads!.length > 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PAUSED':
        return 'warning';
      case 'DELETED':
      case 'ARCHIVED':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '$0.00';
    const numValue = Number(value);
    if (isNaN(numValue)) return '$0.00';
    return `$${numValue.toFixed(2)}`;
  };

  const formatBudget = (value?: number) => {
    if (!value || value === 0) return 'Using campaign budget';
    const numValue = Number(value);
    if (isNaN(numValue)) return 'Using campaign budget';
    return `$${(numValue / 100).toFixed(2)}`; // Budgets are in cents
  };

  const formatNumber = (value?: number) => {
    if (!value) return '0';
    const numValue = Number(value);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString();
  };

  const formatPercentage = (value?: number) => {
    if (!value) return '0.00%';
    const numValue = Number(value);
    if (isNaN(numValue)) return '0.00%';
    return `${numValue.toFixed(2)}%`;
  };

  const getCellValue = (columnId: string) => {
    const metrics = item.metrics;

    switch (columnId) {
      case 'name':
        const getIcon = () => {
          if (level === 'campaigns') return <CampaignIcon sx={{ fontSize: 16, color: '#65676b', mr: 1 }} />;
          if (level === 'adsets') return <AdSetIcon sx={{ fontSize: 16, color: '#65676b', mr: 1 }} />;
          return <AdIcon sx={{ fontSize: 16, color: '#65676b', mr: 1 }} />;
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {getIcon()}
            <InlineEdit
              value={item.name}
              onSave={(newValue) => {
                console.log('Update name:', item.id, newValue);
                setEditingField(null);
              }}
              isEditing={editingField === 'name'}
              onStartEdit={() => setEditingField('name')}
              onCancelEdit={() => setEditingField(null)}
            />
          </Box>
        );
      case 'status':
        return <EnhancedStatusChip item={item} showEffectiveStatus showLearningPhase />;
      case 'budget':
        const budget = (item as CampaignData).daily_budget || (item as AdSetData).daily_budget;
        return formatBudget(budget);
      case 'results':
        return formatNumber(metrics?.results);
      case 'reach':
        return formatNumber(metrics?.reach);
      case 'impressions':
        return formatNumber(metrics?.impressions);
      case 'cost_per_result':
        return formatCurrency(metrics?.cost_per_result);
      case 'amount_spent':
        return formatCurrency(metrics?.spend);
      case 'ctr':
        return formatPercentage(metrics?.ctr);
      case 'cpm':
        return formatCurrency(metrics?.cpm);
      default:
        return '-';
    }
  };

  return (
    <>
      {/* Main Row */}
      <TableRow
        hover
        selected={selected}
        sx={{
          '&:hover': { bgcolor: '#f5f6f7' },
          cursor: 'pointer'
        }}
      >
        {/* Checkbox */}
        <TableCell padding="checkbox">
          <Checkbox checked={selected} onChange={onSelect} />
        </TableCell>

        {/* Expand/Collapse Icon */}
        {(level === 'campaigns' || level === 'adsets') && (
          <TableCell>
            <IconButton size="small" onClick={onToggle} disabled={isLoading}>
              {isLoading ? (
                <CircularProgress size={20} />
              ) : expanded ? (
                <ExpandMoreIcon />
              ) : (
                <ExpandLessIcon />
              )}
            </IconButton>
          </TableCell>
        )}

        {/* Data Columns */}
        {columns.map((column) => (
          <TableCell key={column.id} sx={{ fontSize: '14px', color: '#050505' }}>
            {getCellValue(column.id)}
          </TableCell>
        ))}

        {/* Actions */}
        <TableCell align="right">
          <IconButton size="small" onClick={handleMenuClick}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => handleAction('edit')}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleAction('duplicate')}>
              <ListItemIcon>
                <DuplicateIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Duplicate</ListItemText>
            </MenuItem>
            {item.status === 'ACTIVE' ? (
              <MenuItem onClick={() => handleAction('pause')}>
                <ListItemIcon>
                  <PauseIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Pause</ListItemText>
              </MenuItem>
            ) : (
              <MenuItem onClick={() => handleAction('activate')}>
                <ListItemIcon>
                  <PlayIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Activate</ListItemText>
              </MenuItem>
            )}
            <MenuItem onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </TableCell>
      </TableRow>

      {/* Nested Children (Ad Sets or Ads) */}
      {expanded && (
        <TableRow>
          <TableCell colSpan={columns.length + 3} sx={{ p: 0, bgcolor: '#fafafa' }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                  <CircularProgress size={24} sx={{ mr: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Loading {level === 'campaigns' ? 'ad sets' : 'ads'}...
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ p: 2, pl: 8 }}>
                  {level === 'campaigns' && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Ad Sets ({(item as CampaignData).adsets?.length || 0})
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {(item as CampaignData).adsets?.map((adset) => {
                          const adsetExpanded = expandedRows.has(adset.id);
                          const adsetHasAds = adset.ads && adset.ads.length > 0;
                          const isAdsetLoading = loadingRows.has(adset.id);

                          return (
                            <React.Fragment key={adset.id}>
                              {/* Ad Set Row */}
                              <TableRow sx={{ '&:hover': { bgcolor: '#f0f0f0' } }}>
                                <TableCell sx={{ width: '40px', pl: 1 }}>
                                  {onToggleRow && (
                                    <IconButton
                                      size="small"
                                      onClick={() => onToggleRow(adset.id)}
                                      sx={{ ml: 0.5 }}
                                      disabled={isAdsetLoading}
                                    >
                                      {isAdsetLoading ? (
                                        <CircularProgress size={16} />
                                      ) : adsetExpanded ? (
                                        <ExpandMoreIcon fontSize="small" />
                                      ) : (
                                        <ExpandLessIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  )}
                                </TableCell>
                                <TableCell sx={{ fontSize: '13px', minWidth: 200 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', pl: 1 }}>
                                    <AdSetIcon sx={{ fontSize: 14, color: '#65676b', mr: 1 }} />
                                    {adset.name}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px' }}>
                                  <EnhancedStatusChip item={adset} showEffectiveStatus showLearningPhase />
                                </TableCell>
                                <TableCell sx={{ fontSize: '12px' }}>{formatBudget(adset.daily_budget)}</TableCell>
                                <TableCell sx={{ fontSize: '12px', textAlign: 'right' }}>{formatNumber(adset.metrics?.results)}</TableCell>
                                <TableCell sx={{ fontSize: '12px', textAlign: 'right' }}>{formatNumber(adset.metrics?.reach)}</TableCell>
                                <TableCell sx={{ fontSize: '12px', textAlign: 'right' }}>{formatNumber(adset.metrics?.impressions)}</TableCell>
                                <TableCell sx={{ fontSize: '12px', textAlign: 'right' }}>{formatCurrency(adset.metrics?.cost_per_result)}</TableCell>
                                <TableCell sx={{ fontSize: '12px', textAlign: 'right' }}>{formatCurrency(adset.metrics?.spend)}</TableCell>
                                <TableCell sx={{ fontSize: '12px', textAlign: 'right' }}>{formatPercentage(adset.metrics?.ctr)}</TableCell>
                                <TableCell sx={{ fontSize: '12px', textAlign: 'right' }}>{formatCurrency(adset.metrics?.cpm)}</TableCell>
                              </TableRow>

                              {/* Nested Ads for this Ad Set */}
                              {adsetExpanded && (
                                <TableRow>
                                  <TableCell colSpan={11} sx={{ p: 0, bgcolor: '#f5f5f5', borderBottom: '1px solid #e4e6eb' }}>
                                    <Collapse in={adsetExpanded} timeout="auto" unmountOnExit>
                                      {isAdsetLoading ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                                          <CircularProgress size={20} sx={{ mr: 2 }} />
                                          <Typography variant="body2" color="text.secondary">
                                            Loading ads...
                                          </Typography>
                                        </Box>
                                      ) : (
                                        <Box sx={{ p: 2, pl: 8 }}>
                                          <Typography variant="caption" sx={{ mb: 1, fontWeight: 600, display: 'block', color: '#65676b' }}>
                                            Ads ({adset.ads?.length || 0})
                                          </Typography>
                                          <Table size="small">
                                            <TableBody>
                                              {adset.ads?.map((ad) => (
                                                <TableRow key={ad.id} sx={{ '&:hover': { bgcolor: '#e8e8e8' } }}>
                                                  <TableCell sx={{ fontSize: '12px', width: '40px' }}></TableCell>
                                                  <TableCell sx={{ fontSize: '12px', minWidth: 180 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', pl: 2 }}>
                                                      <AdIcon sx={{ fontSize: 12, color: '#65676b', mr: 1 }} />
                                                      {ad.name}
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell sx={{ fontSize: '11px' }}>
                                                    <EnhancedStatusChip item={ad} showEffectiveStatus showLearningPhase={false} />
                                                  </TableCell>
                                                  <TableCell sx={{ fontSize: '11px' }}>—</TableCell>
                                                  <TableCell sx={{ fontSize: '11px', textAlign: 'right' }}>{formatNumber(ad.metrics?.results)}</TableCell>
                                                  <TableCell sx={{ fontSize: '11px', textAlign: 'right' }}>{formatNumber(ad.metrics?.reach)}</TableCell>
                                                  <TableCell sx={{ fontSize: '11px', textAlign: 'right' }}>{formatNumber(ad.metrics?.impressions)}</TableCell>
                                                  <TableCell sx={{ fontSize: '11px', textAlign: 'right' }}>{formatCurrency(ad.metrics?.cost_per_result)}</TableCell>
                                                  <TableCell sx={{ fontSize: '11px', textAlign: 'right' }}>{formatCurrency(ad.metrics?.spend)}</TableCell>
                                                  <TableCell sx={{ fontSize: '11px', textAlign: 'right' }}>{formatPercentage(ad.metrics?.ctr)}</TableCell>
                                                  <TableCell sx={{ fontSize: '11px', textAlign: 'right' }}>{formatCurrency(ad.metrics?.cpm)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </Box>
                                      )}
                                    </Collapse>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </>
                )}

                {level === 'adsets' && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Ads ({(item as AdSetData).ads?.length || 0})
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {(item as AdSetData).ads?.map((ad) => (
                          <TableRow key={ad.id} sx={{ '&:hover': { bgcolor: '#f0f0f0' } }}>
                            <TableCell sx={{ fontSize: '13px' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <AdIcon sx={{ fontSize: 14, color: '#65676b', mr: 1 }} />
                                {ad.name}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <EnhancedStatusChip item={ad} showEffectiveStatus showLearningPhase={false} />
                            </TableCell>
                            <TableCell sx={{ fontSize: '13px' }}>
                              {formatNumber(ad.metrics?.impressions)}
                            </TableCell>
                            <TableCell sx={{ fontSize: '13px' }}>
                              {formatCurrency(ad.metrics?.spend)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
                </Box>
              )}
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default ExpandableRow;
