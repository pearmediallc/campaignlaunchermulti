import React from 'react';
import {
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  CircularProgress,
  Alert,
  Paper,
  Typography,
  IconButton,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Refresh as RefreshIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import ExpandableRow from './ExpandableRow';
import BulkActionsToolbar from './BulkActionsToolbar';
import { CampaignData, AdSetData, AdData } from './types';

interface DataTableProps {
  level: 'campaigns' | 'adsets' | 'ads';
  data: CampaignData[] | AdSetData[] | AdData[];
  loading: boolean;
  error: string | null;
  selectedItems: Set<string>;
  expandedRows: Set<string>;
  loadingRows?: Set<string>;
  onSelectItem: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onToggleRow: (id: string) => void;
  onRefresh: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  searchQuery?: string;
  onBulkSchedule?: () => void;
}

/**
 * Data Table Component - Displays campaigns/adsets/ads in Facebook-style table
 */
const DataTable: React.FC<DataTableProps> = ({
  level,
  data,
  loading,
  error,
  selectedItems,
  expandedRows,
  loadingRows = new Set(),
  onSelectItem,
  onSelectAll,
  onToggleRow,
  onRefresh,
  hasMore = false,
  onLoadMore,
  searchQuery = '',
  onBulkSchedule
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const allIds = data.map((item) => item.id);
  const allSelected = selectedItems.size > 0 && selectedItems.size === data.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < data.length;

  // Column definitions based on level
  const getColumns = () => {
    const baseColumns = [
      { id: 'name', label: level === 'campaigns' ? 'Campaign name' : level === 'adsets' ? 'Ad set name' : 'Ad name' },
      { id: 'status', label: 'Delivery' },
      { id: 'results', label: 'Results' },
      { id: 'reach', label: 'Reach' },
      { id: 'impressions', label: 'Impressions' },
      { id: 'cost_per_result', label: 'Cost per result' },
      { id: 'amount_spent', label: 'Amount spent' },
      { id: 'ctr', label: 'CTR' },
      { id: 'cpm', label: 'CPM' }
    ];

    // Add budget column for campaigns and adsets
    if (level === 'campaigns' || level === 'adsets') {
      baseColumns.splice(2, 0, { id: 'budget', label: 'Budget' });
    }

    return baseColumns;
  };

  const columns = getColumns();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, pt: 2 }}>
      {/* Bulk Actions Toolbar */}
      {selectedItems.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedItems.size}
          onClearSelection={() => onSelectAll([])}
          level={level}
          selectedItems={selectedItems}
          data={data}
          onRefresh={onRefresh}
          onBulkSchedule={onBulkSchedule}
        />
      )}

      {/* Table */}
      <Paper sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: { xs: 1.5, md: 2 }, borderBottom: '1px solid #e4e6eb' }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '14px', md: '16px' }, fontWeight: 600 }}>
            {data.length} {level === 'campaigns' ? 'Campaigns' : level === 'adsets' ? 'Ad Sets' : 'Ads'}
          </Typography>
          <IconButton onClick={onRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: isMobile ? '800px' : 'auto' }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f6f7' }}>
              {/* Checkbox column */}
              <TableCell padding="checkbox" sx={{ width: 50 }}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() => onSelectAll(allIds)}
                />
              </TableCell>

              {/* Expand column (only for campaigns and adsets) */}
              {(level === 'campaigns' || level === 'adsets') && (
                <TableCell sx={{ width: 50 }} />
              )}

              {/* Data columns */}
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  sx={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#65676b',
                    textTransform: 'none'
                  }}
                >
                  {column.label}
                </TableCell>
              ))}

              {/* Actions column */}
              <TableCell sx={{ width: 80 }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 3} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No {level} found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <ExpandableRow
                  key={item.id}
                  item={item}
                  level={level}
                  columns={columns}
                  selected={selectedItems.has(item.id)}
                  expanded={expandedRows.has(item.id)}
                  isLoading={loadingRows.has(item.id)}
                  onSelect={() => onSelectItem(item.id)}
                  onToggle={() => onToggleRow(item.id)}
                  expandedRows={expandedRows}
                  loadingRows={loadingRows}
                  onToggleRow={onToggleRow}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </TableBody>
        </Table>
        </Box>

        {/* Load More Button */}
        {hasMore && onLoadMore && data.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, borderTop: '1px solid #e4e6eb' }}>
            <Button
              variant="outlined"
              onClick={onLoadMore}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <ExpandMoreIcon />}
              sx={{
                textTransform: 'none',
                borderColor: '#dddfe2',
                color: '#050505',
                '&:hover': {
                  borderColor: '#1877f2',
                  backgroundColor: 'rgba(24, 119, 242, 0.04)'
                }
              }}
            >
              {loading ? 'Loading...' : 'Load More Campaigns'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Search Results Counter */}
      {searchQuery && (
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {data.length} results for "{searchQuery}"
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DataTable;
