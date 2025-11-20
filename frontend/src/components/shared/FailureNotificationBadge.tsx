import React, { useState } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Paper,
  Typography,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tooltip
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  ExpandMore as ExpandIcon,
  Minimize as MinimizeIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ClearAll as ClearAllIcon
} from '@mui/icons-material';
import { useFailureTracking } from '../../contexts/FailureTrackingContext';
import FailureReportModal from './FailureReportModal';

const FailureNotificationBadge: React.FC = () => {
  const {
    campaignGroups,
    unresolvedCount,
    isMinimized,
    isVisible,
    loading,
    toggleMinimized,
    hide,
    refreshFailures,
    clearAllFailures,
    dismissCampaign
  } = useFailureTracking();

  const [selectedCampaign, setSelectedCampaign] = useState<{id: string; name: string} | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  // Always show badge (even when count is 0) - removed the conditional return
  // Badge is always visible so users know the feature exists

  const handleAccordionChange = (campaignId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedCampaign(isExpanded ? campaignId : null);
  };

  const handleViewDetails = (campaignId: string, campaignName: string) => {
    setSelectedCampaign({ id: campaignId, name: campaignName });
  };

  const handleCloseModal = () => {
    setSelectedCampaign(null);
  };

  const handleDismissCampaign = (campaignId: string) => {
    dismissCampaign(campaignId);
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
    }
  };

  return (
    <>
      {/* Floating Badge */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 9999,
          maxWidth: isMinimized ? 'auto' : 450,
          width: isMinimized ? 'auto' : '100%'
        }}
      >
        {/* Minimized State */}
        {isMinimized ? (
          <Tooltip title={`${unresolvedCount} campaign failure${unresolvedCount !== 1 ? 's' : ''} - Click to view`} arrow>
            <Badge
              badgeContent={unresolvedCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.6 },
                    '100%': { opacity: 1 }
                  }
                }
              }}
            >
              <Paper
                elevation={6}
                onClick={toggleMinimized}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  bgcolor: 'warning.light',
                  color: 'warning.contrastText',
                  '&:hover': {
                    bgcolor: 'warning.main'
                  },
                  transition: 'all 0.2s'
                }}
              >
                <ErrorIcon />
                <Typography variant="body2" fontWeight="bold">
                  Failures
                </Typography>
              </Paper>
            </Badge>
          </Tooltip>
        ) : (
          /* Maximized State */
          <Paper
            elevation={8}
            sx={{
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper'
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 2,
                bgcolor: 'warning.light',
                color: 'warning.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <ErrorIcon />
                <Typography variant="h6" fontSize="1rem">
                  Campaign Failures ({unresolvedCount})
                </Typography>
              </Box>
              <Box>
                <Tooltip title="Refresh">
                  <IconButton size="small" onClick={refreshFailures} disabled={loading} sx={{ color: 'inherit' }}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Clear All">
                  <IconButton size="small" onClick={clearAllFailures} sx={{ color: 'inherit' }}>
                    <ClearAllIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Minimize">
                  <IconButton size="small" onClick={toggleMinimized} sx={{ color: 'inherit' }}>
                    <MinimizeIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Close">
                  <IconButton size="small" onClick={hide} sx={{ color: 'inherit' }}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
              {campaignGroups.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  No failures to display
                </Typography>
              ) : (
                <List disablePadding>
                  {campaignGroups.map((group, index) => (
                    <Box key={group.campaignId}>
                      {index > 0 && <Divider sx={{ my: 1 }} />}
                      <Accordion
                        expanded={expandedCampaign === group.campaignId}
                        onChange={handleAccordionChange(group.campaignId)}
                        elevation={0}
                        sx={{ '&:before': { display: 'none' } }}
                      >
                        <AccordionSummary expandIcon={<ExpandIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <ErrorIcon color="error" fontSize="small" />
                            <Typography variant="body2" fontWeight="medium" sx={{ flexGrow: 1 }}>
                              {group.campaignName}
                            </Typography>
                            <Chip
                              label={`${group.unresolvedCount} failure${group.unresolvedCount !== 1 ? 's' : ''}`}
                              size="small"
                              color="error"
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Campaign ID: {group.campaignId.substring(0, 20)}...
                            </Typography>

                            {/* Failure Summary */}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', my: 1 }}>
                              {group.failures.slice(0, 3).map((failure) => (
                                <Chip
                                  key={failure.id}
                                  label={`${failure.entityType}: ${failure.adsetName || failure.adName || 'Unknown'}`}
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                />
                              ))}
                              {group.failures.length > 3 && (
                                <Chip
                                  label={`+${group.failures.length - 3} more`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>

                            {/* Actions */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => handleViewDetails(group.campaignId, group.campaignName)}
                                fullWidth
                              >
                                View Details
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleDismissCampaign(group.campaignId)}
                              >
                                Dismiss
                              </Button>
                            </Box>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  ))}
                </List>
              )}
            </Box>

            {/* Footer */}
            <Box
              sx={{
                p: 1,
                bgcolor: 'grey.100',
                borderTop: 1,
                borderColor: 'divider'
              }}
            >
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                Auto-refreshes every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Detail Modal */}
      {selectedCampaign && (
        <FailureReportModal
          open={true}
          onClose={handleCloseModal}
          campaignId={selectedCampaign.id}
          campaignName={selectedCampaign.name}
        />
      )}
    </>
  );
};

export default FailureNotificationBadge;
