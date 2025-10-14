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
  Typography
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowRight as ExpandLessIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import InlineEdit from './InlineEdit';
import { CampaignData, AdSetData, AdData } from './types';

interface ExpandableRowProps {
  item: CampaignData | AdSetData | AdData;
  level: 'campaigns' | 'adsets' | 'ads';
  columns: Array<{ id: string; label: string }>;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
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
  onSelect,
  onToggle
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);

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
    return `$${(value / 100).toFixed(2)}`;
  };

  const formatNumber = (value?: number) => {
    if (!value) return '0';
    return value.toLocaleString();
  };

  const formatPercentage = (value?: number) => {
    if (!value) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  const getCellValue = (columnId: string) => {
    const metrics = item.metrics;

    switch (columnId) {
      case 'name':
        return (
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
        );
      case 'status':
        return (
          <Chip
            label={item.status}
            color={getStatusColor(item.status)}
            size="small"
            sx={{ fontSize: '12px', fontWeight: 500 }}
          />
        );
      case 'budget':
        const budget = (item as CampaignData).daily_budget || (item as AdSetData).daily_budget;
        return formatCurrency(budget);
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
            {hasChildren && (
              <IconButton size="small" onClick={onToggle}>
                {expanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </IconButton>
            )}
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
          <IconButton size="small">
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>

      {/* Nested Children (Ad Sets or Ads) */}
      {hasChildren && (
        <TableRow>
          <TableCell colSpan={columns.length + 3} sx={{ p: 0, bgcolor: '#fafafa' }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, pl: 8 }}>
                {level === 'campaigns' && (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Ad Sets ({(item as CampaignData).adsets?.length || 0})
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {(item as CampaignData).adsets?.map((adset) => (
                          <TableRow key={adset.id} sx={{ '&:hover': { bgcolor: '#f0f0f0' } }}>
                            <TableCell sx={{ fontSize: '13px' }}>{adset.name}</TableCell>
                            <TableCell>
                              <Chip
                                label={adset.status}
                                color={getStatusColor(adset.status)}
                                size="small"
                                sx={{ fontSize: '11px' }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '13px' }}>
                              {formatCurrency(adset.daily_budget)}
                            </TableCell>
                            <TableCell sx={{ fontSize: '13px' }}>
                              {formatNumber(adset.metrics?.impressions)}
                            </TableCell>
                            <TableCell sx={{ fontSize: '13px' }}>
                              {formatCurrency(adset.metrics?.spend)}
                            </TableCell>
                          </TableRow>
                        ))}
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
                            <TableCell sx={{ fontSize: '13px' }}>{ad.name}</TableCell>
                            <TableCell>
                              <Chip
                                label={ad.status}
                                color={getStatusColor(ad.status)}
                                size="small"
                                sx={{ fontSize: '11px' }}
                              />
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
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default ExpandableRow;
