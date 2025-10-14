import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import { DragIndicator as DragIcon, Close as CloseIcon } from '@mui/icons-material';
import { ColumnConfig } from './types';

interface ColumnCustomizerProps {
  open: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => void;
}

/**
 * Column Customizer - Allows users to show/hide and reorder columns
 */
const ColumnCustomizer: React.FC<ColumnCustomizerProps> = ({
  open,
  onClose,
  columns,
  onSave
}) => {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);

  const handleToggleColumn = (columnId: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const handleReset = () => {
    setLocalColumns(
      columns.map((col) => ({ ...col, visible: true }))
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Customize Columns</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select which columns to display in your table
        </Typography>

        <List>
          {localColumns.map((column) => (
            <ListItem
              key={column.id}
              dense
              sx={{
                border: '1px solid #e4e6eb',
                borderRadius: 1,
                mb: 1,
                '&:hover': { bgcolor: '#f5f6f7' }
              }}
            >
              <ListItemIcon>
                <DragIcon sx={{ color: '#65676b', cursor: 'grab' }} />
              </ListItemIcon>
              <ListItemText primary={column.label} />
              <Checkbox
                checked={column.visible}
                onChange={() => handleToggleColumn(column.id)}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset} sx={{ textTransform: 'none' }}>
          Reset to Default
        </Button>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" sx={{ textTransform: 'none' }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnCustomizer;
