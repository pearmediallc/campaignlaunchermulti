import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

/**
 * Inline Edit Component - Click to edit text fields inline
 */
const InlineEdit: React.FC<InlineEditProps> = ({
  value,
  onSave,
  isEditing,
  onStartEdit,
  onCancelEdit
}) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim() !== '' && editValue !== value) {
      onSave(editValue);
    } else {
      onCancelEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      onCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TextField
          inputRef={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '14px'
            }
          }}
        />
        <IconButton size="small" onClick={handleSave} color="primary">
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            setEditValue(value);
            onCancelEdit();
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      onClick={onStartEdit}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          textDecoration: 'underline'
        }
      }}
    >
      {value}
    </Box>
  );
};

export default InlineEdit;
