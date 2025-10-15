import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import { CampaignData, AdSetData, AdData } from './types';

interface EnhancedStatusChipProps {
  item: CampaignData | AdSetData | AdData;
  showEffectiveStatus?: boolean;
  showLearningPhase?: boolean;
}

/**
 * Enhanced Status Chip - Displays multiple status indicators like Facebook
 * Shows primary status + effective status + learning phase (for ad sets)
 */
const EnhancedStatusChip: React.FC<EnhancedStatusChipProps> = ({
  item,
  showEffectiveStatus = true,
  showLearningPhase = true
}) => {
  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' | 'info' => {
    switch (status) {
      case 'ACTIVE':
      case 'DELIVERING':
      case 'APPROVED':
        return 'success';
      case 'PAUSED':
      case 'PENDING_REVIEW':
      case 'IN_PROCESS':
        return 'warning';
      case 'DELETED':
      case 'ARCHIVED':
      case 'DISAPPROVED':
      case 'NOT_DELIVERING':
        return 'error';
      case 'LEARNING':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status?: string): string => {
    if (!status) return '';

    // Map Facebook API statuses to friendly labels
    const statusMap: Record<string, string> = {
      'ACTIVE': 'Active',
      'PAUSED': 'Paused',
      'DELETED': 'Deleted',
      'ARCHIVED': 'Archived',
      'CAMPAIGN_PAUSED': 'Campaign paused',
      'ADSET_PAUSED': 'Ad set paused',
      'PENDING_REVIEW': 'In review',
      'DISAPPROVED': 'Rejected',
      'PREAPPROVED': 'Approved',
      'PENDING_BILLING_INFO': 'Billing needed',
      'WITH_ISSUES': 'Has issues',
      'IN_PROCESS': 'Processing',
      'NOT_DELIVERING': 'Not delivering',
      'LEARNING': 'Learning'
    };

    return statusMap[status] || status.replace(/_/g, ' ').toLowerCase();
  };

  const primaryStatus = item.status;
  const effectiveStatus = item.effective_status;
  const learningStageInfo = (item as AdSetData).learning_stage_info;
  const learningStatus = learningStageInfo?.status;

  // Determine learning phase label
  const getLearningLabel = () => {
    if (!learningStatus) return '';
    // Facebook shows "Learning limited" when status is LEARNING_LIMITED or when learning phase is constrained
    if (learningStatus === 'LEARNING_LIMITED') return 'Learning limited';
    if (learningStatus === 'LEARNING') return 'Learning limited'; // Facebook shows "Learning limited" by default
    if (learningStatus === 'NOT_LEARNING') return '';
    return learningStatus.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Primary Status */}
      <Chip
        label={getStatusLabel(primaryStatus)}
        color={getStatusColor(primaryStatus)}
        size="small"
        sx={{
          fontSize: '12px',
          fontWeight: 500,
          height: '24px'
        }}
      />

      {/* Effective Status (if different from primary) */}
      {showEffectiveStatus && effectiveStatus && effectiveStatus !== primaryStatus && (
        <Tooltip title={`Effective status: ${getStatusLabel(effectiveStatus)}`} arrow>
          <Chip
            label={getStatusLabel(effectiveStatus)}
            color={getStatusColor(effectiveStatus)}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '11px',
              fontWeight: 400,
              height: '22px',
              borderStyle: 'dashed'
            }}
          />
        </Tooltip>
      )}

      {/* Learning Phase Status (for ad sets only) */}
      {showLearningPhase && learningStatus && learningStatus !== 'NOT_LEARNING' && (
        <Tooltip
          title={
            learningStatus === 'LEARNING_LIMITED' || learningStatus === 'LEARNING'
              ? "This ad set's learning is limited because it doesn't get enough conversions. Performance may be impacted."
              : "This ad set is still learning. Performance may improve as it gathers more data."
          }
          arrow
        >
          <Chip
            label={getLearningLabel()}
            color={learningStatus === 'LEARNING_LIMITED' ? 'warning' : 'info'}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '10px',
              fontWeight: 500,
              height: '20px',
              bgcolor: learningStatus === 'LEARNING_LIMITED' ? 'rgba(237, 108, 2, 0.08)' : 'rgba(2, 136, 209, 0.08)',
              borderColor: learningStatus === 'LEARNING_LIMITED' ? '#ed6c02' : undefined
            }}
          />
        </Tooltip>
      )}

      {/* Issues Indicator */}
      {item.issues_info && item.issues_info.length > 0 && (
        <Tooltip
          title={
            <Box>
              {item.issues_info.map((issue, idx) => (
                <Box key={idx} sx={{ mb: 0.5 }}>
                  <strong>{issue.level}: </strong>
                  {issue.error_summary || issue.error_message}
                </Box>
              ))}
            </Box>
          }
          arrow
        >
          <Chip
            label={`${item.issues_info.length} issue${item.issues_info.length > 1 ? 's' : ''}`}
            color="error"
            size="small"
            variant="outlined"
            sx={{
              fontSize: '10px',
              fontWeight: 500,
              height: '20px',
              borderColor: '#d32f2f',
              color: '#d32f2f',
              bgcolor: 'rgba(211, 47, 47, 0.08)'
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
};

export default EnhancedStatusChip;
