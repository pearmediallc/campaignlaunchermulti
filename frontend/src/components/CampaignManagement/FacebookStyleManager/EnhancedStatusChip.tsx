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
  const deliveryStatus = item.delivery_status;
  const deliveryMessage = item.delivery_message;
  const learningStageInfo = (item as AdSetData).learning_stage_info;
  const learningStatus = (item as AdSetData).learning_status;
  const learningMessage = (item as AdSetData).learning_message;

  // Determine learning phase label
  const getLearningLabel = () => {
    if (!learningStatus) return '';
    // Map learning status from backend to display labels
    switch (learningStatus) {
      case 'LEARNING':
        return 'Learning in progress';
      case 'SUCCESS':
        return 'Active';
      case 'FAIL':
        return 'Learning limited';
      case 'WAIVING':
        return 'Learning waived';
      default:
        return learningStatus.replace(/_/g, ' ').toLowerCase();
    }
  };

  // Get delivery status message
  const getDeliveryStatusLabel = () => {
    if (!deliveryStatus || deliveryStatus === 'UNKNOWN') return '';
    // Map common delivery statuses to user-friendly labels
    const deliveryStatusMap: Record<string, string> = {
      'ACTIVE': 'Delivering',
      'NOT_DELIVERING': 'Not delivering',
      'PENDING': 'Pending',
      'LEARNING_LIMITED': 'Learning limited',
      'LEARNING': 'Learning'
    };
    return deliveryStatusMap[deliveryStatus] || deliveryStatus.replace(/_/g, ' ').toLowerCase();
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

      {/* Delivery Status (shows actual Facebook delivery status) */}
      {deliveryStatus && deliveryStatus !== 'UNKNOWN' && (
        <Tooltip
          title={deliveryMessage || `Delivery status: ${getDeliveryStatusLabel()}`}
          arrow
        >
          <Chip
            label={getDeliveryStatusLabel()}
            color={
              deliveryStatus === 'ACTIVE' ? 'success' :
              deliveryStatus === 'NOT_DELIVERING' ? 'error' :
              deliveryStatus.includes('LEARNING') ? 'warning' :
              'default'
            }
            size="small"
            variant="outlined"
            sx={{
              fontSize: '10px',
              fontWeight: 500,
              height: '20px',
              bgcolor:
                deliveryStatus === 'ACTIVE' ? 'rgba(46, 125, 50, 0.08)' :
                deliveryStatus === 'NOT_DELIVERING' ? 'rgba(211, 47, 47, 0.08)' :
                deliveryStatus.includes('LEARNING') ? 'rgba(237, 108, 2, 0.08)' :
                undefined
            }}
          />
        </Tooltip>
      )}

      {/* Learning Phase Status (for ad sets only) */}
      {showLearningPhase && learningStatus && learningStatus !== 'SUCCESS' && (
        <Tooltip
          title={learningMessage || `Learning status: ${getLearningLabel()}`}
          arrow
        >
          <Chip
            label={getLearningLabel()}
            color={
              learningStatus === 'FAIL' ? 'warning' :
              learningStatus === 'LEARNING' ? 'info' :
              'default'
            }
            size="small"
            variant="outlined"
            sx={{
              fontSize: '10px',
              fontWeight: 500,
              height: '20px',
              bgcolor:
                learningStatus === 'FAIL' ? 'rgba(237, 108, 2, 0.08)' :
                learningStatus === 'LEARNING' ? 'rgba(2, 136, 209, 0.08)' :
                undefined
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
