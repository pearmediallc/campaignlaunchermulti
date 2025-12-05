import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Checkbox,
  FormControlLabel,
  Alert,
  AlertTitle,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  FormControl,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  RocketLaunch,
  CheckCircle,
  Warning,
  Info,
  Speed,
  Schedule
} from '@mui/icons-material';
import axios from 'axios';

interface DeploymentTarget {
  adAccountId: string;
  adAccountName: string;
  pageId: string;
  pageName: string;
  pixelId?: string | null;
  pixelName?: string | null;
  isCurrent: boolean;
  status: string;
}

interface MultiAccountDeploymentSectionProps {
  show: boolean;
  onSelectionChange: (targets: DeploymentTarget[], mode: 'parallel' | 'sequential') => void;
}

export const MultiAccountDeploymentSection: React.FC<MultiAccountDeploymentSectionProps> = ({
  show,
  onSelectionChange
}) => {
  const [loading, setLoading] = useState(false);
  const [targets, setTargets] = useState<DeploymentTarget[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [processingMode, setProcessingMode] = useState<'parallel' | 'sequential'>('parallel');
  const [error, setError] = useState<string | null>(null);

  // Fetch available targets when section is shown
  useEffect(() => {
    if (show) {
      fetchTargets();
    }
  }, [show]);

  // Notify parent of selection changes
  useEffect(() => {
    const selected = targets.filter(t =>
      selectedTargets.has(`${t.adAccountId}-${t.pageId}`)
    );
    onSelectionChange(selected, processingMode);
  }, [selectedTargets, processingMode, targets]);

  const fetchTargets = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/campaigns/deployment/targets');

      if (response.data.success) {
        setTargets(response.data.combinations || []);

        // Pre-select current account/page
        const currentTarget = response.data.combinations.find((t: DeploymentTarget) => t.isCurrent);
        if (currentTarget) {
          setSelectedTargets(new Set([`${currentTarget.adAccountId}-${currentTarget.pageId}`]));
        }
      }
    } catch (err: any) {
      console.error('Error fetching deployment targets:', err);
      setError(err.response?.data?.error || 'Failed to load deployment targets');
    } finally {
      setLoading(false);
    }
  };

  const toggleTarget = (target: DeploymentTarget) => {
    const key = `${target.adAccountId}-${target.pageId}`;
    const newSelected = new Set(selectedTargets);

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }

    setSelectedTargets(newSelected);
  };

  const isSelected = (target: DeploymentTarget) => {
    return selectedTargets.has(`${target.adAccountId}-${target.pageId}`);
  };

  const selectedCount = selectedTargets.size;
  const estimatedTime = processingMode === 'parallel'
    ? `${Math.ceil(selectedCount * 3)} minutes`
    : `${Math.ceil(selectedCount * 5)} minutes`;

  if (!show) return null;

  return (
    <Accordion defaultExpanded sx={{ mb: 2, border: '2px solid', borderColor: 'primary.main' }}>
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{ bgcolor: 'primary.light' }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <RocketLaunch color="primary" />
          <Typography variant="h6" fontWeight={600}>
            🔥 Multi-Account Deployment (RECOMMENDED)
          </Typography>
          {selectedCount > 1 && (
            <Chip
              label={`${selectedCount} targets selected`}
              color="primary"
              size="small"
            />
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading deployment targets...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">
            <AlertTitle>Error Loading Targets</AlertTitle>
            {error}
            <Button onClick={fetchTargets} sx={{ mt: 1 }}>
              Retry
            </Button>
          </Alert>
        ) : (
          <>
            {/* Info Alert */}
            <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
              <AlertTitle>Deploy Across Multiple Accounts & Pages</AlertTitle>
              <Typography variant="body2">
                Select multiple account/page combinations to deploy this campaign simultaneously.
                Each account has its own rate limit, so deploying to multiple accounts is faster
                than creating multiple campaigns in one account.
              </Typography>
            </Alert>

            {/* Processing Mode Selection */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Processing Mode:
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={processingMode}
                  onChange={(e) => setProcessingMode(e.target.value as 'parallel' | 'sequential')}
                >
                  <FormControlLabel
                    value="parallel"
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Speed color="primary" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Parallel (Recommended) - Fastest
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            All accounts processed simultaneously. Each account uses its own rate limit.
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="sequential"
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Schedule color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Sequential - Slower but safer
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Processes one account at a time with waiting periods between each.
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Paper>

            {/* Target Selection Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell padding="checkbox">
                      <Tooltip title="Select/Deselect All">
                        <Checkbox
                          indeterminate={selectedCount > 0 && selectedCount < targets.length}
                          checked={selectedCount === targets.length && targets.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTargets(new Set(targets.map(t => `${t.adAccountId}-${t.pageId}`)));
                            } else {
                              setSelectedTargets(new Set());
                            }
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell><strong>Ad Account</strong></TableCell>
                    <TableCell><strong>Page</strong></TableCell>
                    <TableCell><strong>Pixel</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {targets.map((target, index) => {
                    const key = `${target.adAccountId}-${target.pageId}`;
                    const selected = isSelected(target);

                    return (
                      <TableRow
                        key={key}
                        hover
                        onClick={() => toggleTarget(target)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: selected ? 'action.selected' : 'inherit',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selected}
                            onChange={() => toggleTarget(target)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={target.isCurrent ? 600 : 400}>
                              {target.adAccountName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {target.adAccountId}
                            </Typography>
                            {target.isCurrent && (
                              <Chip label="Current" size="small" color="primary" sx={{ ml: 1 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{target.pageName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {target.pageId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {target.pixelId ? (
                            <>
                              <Typography variant="body2">{target.pixelName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {target.pixelId}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No pixel
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={target.status === 'ready' ? <CheckCircle /> : <Warning />}
                            label={target.status === 'ready' ? 'Ready' : target.status}
                            color={target.status === 'ready' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Deployment Summary */}
            <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'info.light' }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                📊 Deployment Summary
              </Typography>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Selected Targets:
                  </Typography>
                  <Typography variant="h6">{selectedCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Campaigns:
                  </Typography>
                  <Typography variant="h6">{selectedCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estimated Time:
                  </Typography>
                  <Typography variant="h6">{estimatedTime}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Processing Mode:
                  </Typography>
                  <Typography variant="h6">
                    {processingMode === 'parallel' ? '⚡ Parallel' : '⏭️ Sequential'}
                  </Typography>
                </Box>
              </Box>

              {selectedCount > 1 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    <strong>✨ Benefits:</strong>
                    <br />
                    • Each account has separate rate limits (5000 calls/hour)
                    <br />
                    • {processingMode === 'parallel' ?
                        `${selectedCount}x faster than sequential processing` :
                        'Safer, more conservative approach'
                      }
                    <br />
                    • All campaigns created with identical structure
                    <br />
                    • Created in PAUSED state for your review
                  </Typography>
                </Alert>
              )}
            </Paper>

            {/* Warnings */}
            {selectedCount > 5 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <AlertTitle>Large Deployment</AlertTitle>
                You've selected {selectedCount} targets. This will create {selectedCount} campaigns
                simultaneously. Make sure you have sufficient budget and permissions for all accounts.
              </Alert>
            )}

            {selectedCount === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <AlertTitle>No Targets Selected</AlertTitle>
                Please select at least one account/page combination to deploy to.
                Your current account/page is pre-selected by default.
              </Alert>
            )}
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
