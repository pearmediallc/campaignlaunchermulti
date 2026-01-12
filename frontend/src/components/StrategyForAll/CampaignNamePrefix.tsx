import React from 'react';
import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  TextField,
  Paper,
  Alert,
  Chip
} from '@mui/material';

interface CampaignNamePrefixProps {
  campaignName: string;
  prefixOption: 'launcher' | 'none' | 'custom';
  customPrefix: string;
  onPrefixOptionChange: (option: 'launcher' | 'none' | 'custom') => void;
  onCustomPrefixChange: (prefix: string) => void;
}

const CampaignNamePrefix: React.FC<CampaignNamePrefixProps> = ({
  campaignName,
  prefixOption,
  customPrefix,
  onPrefixOptionChange,
  onCustomPrefixChange
}) => {
  // Calculate final campaign name based on selections
  const getFinalName = () => {
    if (!campaignName) return '';

    if (prefixOption === 'launcher') {
      return `[Launcher] ${campaignName}`;
    } else if (prefixOption === 'custom' && customPrefix.trim()) {
      return `[${customPrefix.trim()}] ${campaignName}`;
    } else {
      return campaignName;
    }
  };

  const finalName = getFinalName();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: '#f5f8fa',
        border: '1px solid #e0e7ed'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: '#1a1a1a',
            fontSize: '1.1rem'
          }}
        >
          📝 Campaign Name Prefix
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, fontSize: '0.875rem' }}
      >
        Choose how to prefix your campaign name to identify campaigns launched via Launcher
      </Typography>

      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          value={prefixOption}
          onChange={(e) => onPrefixOptionChange(e.target.value as 'launcher' | 'none' | 'custom')}
        >
          {/* Option 1: Keep [Launcher] prefix (default) */}
          <FormControlLabel
            value="launcher"
            control={<Radio sx={{ color: '#1976d2', '&.Mui-checked': { color: '#1976d2' } }} />}
            label={
              <Box sx={{ width: '100%' }}>
                <Typography variant="body1" fontWeight={500} sx={{ fontSize: '0.95rem' }}>
                  Keep [Launcher] prefix <Chip label="DEFAULT" size="small" color="primary" sx={{ ml: 1, height: '20px', fontSize: '0.7rem' }} />
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                  Final name: <strong>{campaignName ? `[Launcher] ${campaignName}` : '[Launcher] Your Campaign Name'}</strong>
                </Typography>
              </Box>
            }
            sx={{
              mb: 2,
              p: 2,
              backgroundColor: prefixOption === 'launcher' ? '#e3f2fd' : '#ffffff',
              border: prefixOption === 'launcher' ? '2px solid #1976d2' : '1px solid #e0e0e0',
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: prefixOption === 'launcher' ? '#e3f2fd' : '#f5f5f5',
              }
            }}
          />

          {/* Option 2: Remove prefix */}
          <FormControlLabel
            value="none"
            control={<Radio sx={{ color: '#1976d2', '&.Mui-checked': { color: '#1976d2' } }} />}
            label={
              <Box sx={{ width: '100%' }}>
                <Typography variant="body1" fontWeight={500} sx={{ fontSize: '0.95rem' }}>
                  Remove prefix (Use exact name)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                  Final name: <strong>{campaignName || 'Your Campaign Name'}</strong>
                </Typography>
              </Box>
            }
            sx={{
              mb: 2,
              p: 2,
              backgroundColor: prefixOption === 'none' ? '#e3f2fd' : '#ffffff',
              border: prefixOption === 'none' ? '2px solid #1976d2' : '1px solid #e0e0e0',
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: prefixOption === 'none' ? '#e3f2fd' : '#f5f5f5',
              }
            }}
          />

          {/* Option 3: Custom prefix */}
          <FormControlLabel
            value="custom"
            control={<Radio sx={{ color: '#1976d2', '&.Mui-checked': { color: '#1976d2' } }} />}
            label={
              <Box sx={{ width: '100%' }}>
                <Typography variant="body1" fontWeight={500} sx={{ fontSize: '0.95rem' }}>
                  Custom prefix
                </Typography>
                {prefixOption === 'custom' && (
                  <TextField
                    size="small"
                    placeholder="Enter custom prefix (e.g., TEST, BETA)"
                    value={customPrefix}
                    onChange={(e) => onCustomPrefixChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      mt: 1.5,
                      width: '100%',
                      maxWidth: '400px',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#ffffff',
                        '& fieldset': {
                          borderColor: '#c4c4c4',
                        },
                        '&:hover fieldset': {
                          borderColor: '#1976d2',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1976d2',
                        },
                      },
                    }}
                    inputProps={{ maxLength: 20 }}
                  />
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.85rem' }}>
                  Final name: <strong>{prefixOption === 'custom' && customPrefix.trim() ? `[${customPrefix.trim()}] ${campaignName}` : `[Your Prefix] ${campaignName || 'Your Campaign Name'}`}</strong>
                </Typography>
              </Box>
            }
            sx={{
              mb: 2,
              p: 2,
              backgroundColor: prefixOption === 'custom' ? '#e3f2fd' : '#ffffff',
              border: prefixOption === 'custom' ? '2px solid #1976d2' : '1px solid #e0e0e0',
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: prefixOption === 'custom' ? '#e3f2fd' : '#f5f5f5',
              }
            }}
          />
        </RadioGroup>
      </FormControl>

      {/* Final name preview */}
      {finalName && (
        <Alert
          severity="info"
          sx={{
            mt: 2,
            backgroundColor: '#e8f4fd',
            borderLeft: '4px solid #2196f3',
            '& .MuiAlert-icon': {
              color: '#2196f3'
            }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
            <strong>Final Campaign Name:</strong> {finalName}
          </Typography>
        </Alert>
      )}
    </Paper>
  );
};

export default CampaignNamePrefix;
