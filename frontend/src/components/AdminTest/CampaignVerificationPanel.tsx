/**
 * Campaign Verification Panel
 *
 * NEW COMPONENT - Completely isolated from existing functionality
 * Displays field-by-field verification results with checkboxes
 */

import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Paper,
  Alert,
  Checkbox,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Error as ErrorIcon,
  Campaign as CampaignIcon,
  Assessment,
  ViewList,
} from '@mui/icons-material';

interface FieldVerification {
  fieldName: string;
  expected: any;
  actual: any;
  match: boolean;
  importance: 'critical' | 'high' | 'medium' | 'low';
  errorMessage?: string;
}

interface AdSetVerification {
  adSetId: string;
  adSetName: string;
  fields: FieldVerification[];
  matchRate: number;
}

interface AdVerification {
  adId: string;
  adName: string;
  adSetId: string;
  fields: FieldVerification[];
  matchRate: number;
}

interface VerificationData {
  campaignId: string;
  verifiedAt: string;
  overallMatchRate: number;
  totalFields: number;
  matchedFields: number;
  mismatchedFields: number;
  verification: {
    campaign: {
      fields: FieldVerification[];
      matchRate: number;
    };
    adSets: AdSetVerification[];
    ads: AdVerification[];
  };
}

interface CampaignVerificationPanelProps {
  open: boolean;
  onClose: () => void;
  verificationData: VerificationData | null;
  loading: boolean;
}

export const CampaignVerificationPanel: React.FC<CampaignVerificationPanelProps> = ({
  open,
  onClose,
  verificationData,
  loading
}) => {
  if (!verificationData && !loading) {
    return null;
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'Not set';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment />
          <Typography variant="h6">Campaign Verification Report</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Verifying campaign fields...
            </Typography>
          </Box>
        ) : verificationData ? (
          <Box>
            {/* Overall Summary */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {verificationData.overallMatchRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overall Match Rate
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {verificationData.matchedFields}
                    </Typography>
                    <Typography variant="caption">Matched</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="error.main">
                      {verificationData.mismatchedFields}
                    </Typography>
                    <Typography variant="caption">Mismatched</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">
                      {verificationData.totalFields}
                    </Typography>
                    <Typography variant="caption">Total Fields</Typography>
                  </Box>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={verificationData.overallMatchRate}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'grey.300',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: verificationData.overallMatchRate >= 90 ? 'success.main' :
                             verificationData.overallMatchRate >= 70 ? 'warning.main' : 'error.main'
                  }
                }}
              />
            </Paper>

            {/* Campaign Level Fields */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <CampaignIcon />
                  <Typography variant="h6">Campaign Fields</Typography>
                  <Chip
                    label={`${verificationData.verification.campaign.matchRate}% match`}
                    size="small"
                    color={verificationData.verification.campaign.matchRate >= 90 ? 'success' : 'error'}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width="50px">✓</TableCell>
                        <TableCell>Field</TableCell>
                        <TableCell>Expected</TableCell>
                        <TableCell>Actual</TableCell>
                        <TableCell width="100px">Importance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {verificationData.verification.campaign.fields.map((field, index) => (
                        <TableRow key={index} sx={{ bgcolor: field.match ? 'success.50' : 'error.50' }}>
                          <TableCell>
                            <Checkbox
                              checked={field.match}
                              disabled
                              icon={<ErrorIcon color="error" />}
                              checkedIcon={<CheckCircle color="success" />}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {field.fieldName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
                              {formatValue(field.expected)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
                              {formatValue(field.actual)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={field.importance}
                              size="small"
                              color={getImportanceColor(field.importance) as any}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>

            {/* Ad Sets */}
            {verificationData.verification.adSets.map((adSet, adSetIndex) => (
              <Accordion key={adSet.adSetId}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <ViewList />
                    <Typography variant="h6">Ad Set: {adSet.adSetName}</Typography>
                    <Chip
                      label={`${adSet.matchRate}% match`}
                      size="small"
                      color={adSet.matchRate >= 90 ? 'success' : 'error'}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width="50px">✓</TableCell>
                          <TableCell>Field</TableCell>
                          <TableCell>Expected</TableCell>
                          <TableCell>Actual</TableCell>
                          <TableCell width="100px">Importance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {adSet.fields.map((field, fieldIndex) => (
                          <TableRow key={fieldIndex} sx={{ bgcolor: field.match ? 'success.50' : 'error.50' }}>
                            <TableCell>
                              <Checkbox
                                checked={field.match}
                                disabled
                                icon={<ErrorIcon color="error" />}
                                checkedIcon={<CheckCircle color="success" />}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {field.fieldName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
                                {formatValue(field.expected)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
                                {formatValue(field.actual)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={field.importance}
                                size="small"
                                color={getImportanceColor(field.importance) as any}
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Ads in this ad set */}
                  {verificationData.verification.ads
                    .filter(ad => ad.adSetId === adSet.adSetId)
                    .map((ad, adIndex) => (
                      <Box key={ad.adId} sx={{ mt: 2, pl: 2, borderLeft: '3px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Ad: {ad.adName} ({ad.matchRate}% match)
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableBody>
                              {ad.fields.map((field, fieldIndex) => (
                                <TableRow key={fieldIndex} sx={{ bgcolor: field.match ? 'success.50' : 'error.50' }}>
                                  <TableCell width="50px">
                                    <Checkbox
                                      checked={field.match}
                                      disabled
                                      icon={<ErrorIcon color="error" />}
                                      checkedIcon={<CheckCircle color="success" />}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                      {field.fieldName}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
                                      {formatValue(field.expected)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
                                      {formatValue(field.actual)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell width="100px">
                                    <Chip
                                      label={field.importance}
                                      size="small"
                                      color={getImportanceColor(field.importance) as any}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ))}
                </AccordionDetails>
              </Accordion>
            ))}

            {/* Summary Alert */}
            {verificationData.mismatchedFields > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Found {verificationData.mismatchedFields} mismatched field(s)
                </Typography>
                <Typography variant="caption">
                  Review the highlighted fields above to identify discrepancies between your form data and the actual Facebook campaign.
                </Typography>
              </Alert>
            )}

            {verificationData.mismatchedFields === 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Perfect Match! All fields verified successfully.
                </Typography>
                <Typography variant="caption">
                  The campaign was created exactly as specified in your form.
                </Typography>
              </Alert>
            )}
          </Box>
        ) : (
          <Alert severity="info">No verification data available</Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignVerificationPanel;
