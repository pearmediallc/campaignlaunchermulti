import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Alert
} from '@mui/material';
import {
  CheckCircle,
  Campaign,
  AdsClick,
  Share,
  Add,
  OpenInNew,
  ContentCopy as CopyIcon,
  Psychology as VariationIcon,
  ExpandMore,
  Visibility
} from '@mui/icons-material';
import { StrategyForAdsResponse } from '../../../types/strategyForAds';
import MultiplyContainer from '../MultiplySection/MultiplyContainer';
import AdDuplicationModal from '../AdDuplication/AdDuplicationModal';

interface CompletionSummaryProps {
  campaignResult: StrategyForAdsResponse | null;
  postId: string;
  onCreateNew: () => void;
  adSetCount?: number; // Total ad set count from formData
}

const CompletionSummary: React.FC<CompletionSummaryProps> = ({
  campaignResult,
  postId,
  onCreateNew,
  adSetCount = 50 // Default to 50 for backward compatibility
}) => {
  const [showMultiplyDialog, setShowMultiplyDialog] = useState(false);
  const [showAdDuplicationDialog, setShowAdDuplicationDialog] = useState(false);

  // Store campaign data in session storage for multiplication
  useEffect(() => {
    if (campaignResult?.data?.campaign?.id && postId) {
      sessionStorage.setItem('lastCreatedCampaign', JSON.stringify({
        campaignId: campaignResult.data.campaign.id,
        postId: postId,
        timestamp: Date.now()
      }));
    }
  }, [campaignResult, postId]);

  const handleOpenFacebookAdsManager = () => {
    const url = `https://www.facebook.com/adsmanager/manage/campaigns?act=${campaignResult?.data?.campaign.id}`;
    window.open(url, '_blank');
  };

  const handleOpenMultiply = () => {
    setShowMultiplyDialog(true);
  };

  const handleCloseMultiply = () => {
    setShowMultiplyDialog(false);
  };

  const handleMultiplyComplete = () => {
    setShowMultiplyDialog(false);
    // Optionally refresh or show a success message
  };

  const handleOpenAdDuplication = () => {
    setShowAdDuplicationDialog(true);
  };

  const handleCloseAdDuplication = () => {
    setShowAdDuplicationDialog(false);
  };

  const totalAdSets = campaignResult?.data?.duplicatedAdSets ?
    1 + campaignResult.data.duplicatedAdSets.length : adSetCount;
  const duplicateCount = totalAdSets - 1; // Number of duplicates (excluding initial)

  // Prepare ad set list for duplication modal
  const availableAdSets = [
    {
      id: campaignResult?.data?.adSet?.id || '',
      name: campaignResult?.data?.adSet?.name || 'Original Ad Set'
    },
    ...(campaignResult?.data?.duplicatedAdSets?.map((adSet: any) => ({
      id: adSet.id,
      name: adSet.name
    })) || [])
  ];

  // Get the first ad ID from the ads array
  const originalAdId = campaignResult?.data?.ads?.[0]?.id || '';

  return (
    <Box sx={{ py: 4 }}>
      {/* Success Header */}
      <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', color: 'white' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircle sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            🎉 Campaign Created Successfully!
          </Typography>
          <Typography variant="h6">
            Your campaign has been successfully created with all ad sets and variations
          </Typography>
        </CardContent>
      </Card>

      {/* Campaign Summary */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Campaign sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Campaign Created
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {campaignResult?.data?.campaign.name}
              </Typography>
              <Chip
                label={`ID: ${campaignResult?.data?.campaign.id}`}
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AdsClick sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Ad Sets Created
              </Typography>
              <Typography variant="h3" color="primary.main" gutterBottom>
                {totalAdSets}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1 original + {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Share sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Post ID Used
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                All ad sets share the same creative
              </Typography>
              <Chip
                label={postId}
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Campaign Details */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Campaign Details
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Initial Campaign (1-1-1)"
              secondary={`Campaign: ${campaignResult?.data?.campaign.name}`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Original Ad Set"
              secondary={`Ad Set: ${campaignResult?.data?.adSet?.name || 'Unknown'}`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Creative Post Created"
              secondary={`Post ID: ${postId} (used across all ad sets)`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Ad Sets Duplicated"
              secondary={`${duplicateCount} additional ad set${duplicateCount !== 1 ? 's' : ''} created with "Use Existing Post" setting`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Campaign Setup Complete"
              secondary="All ad sets created with your custom ad variations"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Next Steps */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Next Steps
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <List>
          <ListItem>
            <ListItemText
              primary="1. Review in Facebook Ads Manager"
              secondary="Check all ad sets and make any necessary adjustments"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="2. Set Campaign Status"
              secondary="Change from 'Paused' to 'Active' when ready to launch"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="3. Monitor Performance"
              secondary="Track which ad sets perform best and optimize accordingly"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="4. Scale Successful Ad Sets"
              secondary="Increase budgets on top-performing ad sets"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Facebook Payload Verification */}
      {campaignResult?.data?.facebookPayload && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Visibility color="primary" />
                <Typography variant="h6">
                  View Data Sent to Facebook
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                This shows exactly what was submitted to Facebook's API. Verify your campaign settings below.
              </Alert>

              {/* Campaign Settings */}
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                📢 Campaign Settings
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  <TableRow>
                    <TableCell width="30%"><strong>Campaign Name</strong></TableCell>
                    <TableCell>{campaignResult.data.facebookPayload.campaign.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Objective</strong></TableCell>
                    <TableCell>
                      <Chip label={campaignResult.data.facebookPayload.campaign.objective} size="small" color="primary" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Buying Type</strong></TableCell>
                    <TableCell>{campaignResult.data.facebookPayload.campaign.buyingType}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Special Ad Categories</strong></TableCell>
                    <TableCell>
                      {campaignResult.data.facebookPayload.campaign.specialAdCategories?.length > 0
                        ? campaignResult.data.facebookPayload.campaign.specialAdCategories.join(', ')
                        : 'None'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell>
                      <Chip label={campaignResult.data.facebookPayload.campaign.status} size="small" color="success" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Budget Level</strong></TableCell>
                    <TableCell>
                      <Chip
                        label={campaignResult.data.facebookPayload.campaign.budgetLevel === 'campaign' ? 'CBO (Campaign)' : 'ABO (Ad Set)'}
                        size="small"
                        color={campaignResult.data.facebookPayload.campaign.budgetLevel === 'campaign' ? 'secondary' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                  {campaignResult.data.facebookPayload.campaign.dailyBudget && (
                    <TableRow>
                      <TableCell><strong>Campaign Daily Budget</strong></TableCell>
                      <TableCell><strong>${campaignResult.data.facebookPayload.campaign.dailyBudget}</strong></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Ad Set Settings */}
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                🎯 Ad Set Settings
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  <TableRow>
                    <TableCell width="30%"><strong>Ad Set Name</strong></TableCell>
                    <TableCell>{campaignResult.data.facebookPayload.adSet.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Optimization Goal</strong></TableCell>
                    <TableCell>
                      <Chip label={campaignResult.data.facebookPayload.adSet.optimizationGoal} size="small" color="primary" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Bid Strategy</strong></TableCell>
                    <TableCell>{campaignResult.data.facebookPayload.adSet.bidStrategy}</TableCell>
                  </TableRow>
                  {campaignResult.data.facebookPayload.adSet.conversionEvent && (
                    <TableRow>
                      <TableCell><strong>Conversion Event</strong></TableCell>
                      <TableCell>
                        <Chip label={campaignResult.data.facebookPayload.adSet.conversionEvent} size="small" color="secondary" />
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell><strong>Attribution Setting</strong></TableCell>
                    <TableCell>{campaignResult.data.facebookPayload.adSet.attributionSetting}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Placement Type</strong></TableCell>
                    <TableCell>
                      <Chip
                        label={campaignResult.data.facebookPayload.adSet.placementType === 'automatic' ? 'Automatic' : 'Manual'}
                        size="small"
                        color={campaignResult.data.facebookPayload.adSet.placementType === 'automatic' ? 'success' : 'info'}
                      />
                    </TableCell>
                  </TableRow>
                  {campaignResult.data.facebookPayload.adSet.placements && (
                    <TableRow>
                      <TableCell><strong>Manual Placements</strong></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {campaignResult.data.facebookPayload.adSet.placements.map((placement: string) => (
                            <Chip key={placement} label={placement} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Targeting */}
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                👥 Targeting
              </Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  <TableRow>
                    <TableCell width="30%"><strong>Locations</strong></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {campaignResult.data.facebookPayload.adSet.targeting?.geoLocations?.countries?.map((country: string) => (
                          <Chip key={country} label={`Country: ${country}`} size="small" color="primary" variant="outlined" />
                        ))}
                        {campaignResult.data.facebookPayload.adSet.targeting?.geoLocations?.regions?.map((region: any) => (
                          <Chip key={region.key} label={`Region: ${region.name || region.key}`} size="small" color="secondary" variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Age Range</strong></TableCell>
                    <TableCell>
                      {campaignResult.data.facebookPayload.adSet.targeting?.ageMin} - {campaignResult.data.facebookPayload.adSet.targeting?.ageMax} years
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Gender</strong></TableCell>
                    <TableCell>
                      <Chip
                        label={
                          campaignResult.data.facebookPayload.adSet.targeting?.genders?.[0] === 1
                            ? 'Male'
                            : campaignResult.data.facebookPayload.adSet.targeting?.genders?.[0] === 2
                            ? 'Female'
                            : 'All Genders'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Ad Creative */}
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
                🎨 Ad Creative
              </Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell width="30%"><strong>Ad Name</strong></TableCell>
                    <TableCell>{campaignResult.data.facebookPayload.ad.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Ad Format</strong></TableCell>
                    <TableCell>
                      <Chip label={campaignResult.data.facebookPayload.ad.format} size="small" color="info" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Primary Text</strong></TableCell>
                    <TableCell>{campaignResult.data.facebookPayload.ad.primaryText}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Headline</strong></TableCell>
                    <TableCell><strong>{campaignResult.data.facebookPayload.ad.headline}</strong></TableCell>
                  </TableRow>
                  {campaignResult.data.facebookPayload.ad.description && (
                    <TableRow>
                      <TableCell><strong>Description</strong></TableCell>
                      <TableCell>{campaignResult.data.facebookPayload.ad.description}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell><strong>Call to Action</strong></TableCell>
                    <TableCell>
                      <Chip label={campaignResult.data.facebookPayload.ad.callToAction} size="small" color="success" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Website URL</strong></TableCell>
                    <TableCell>
                      <a href={campaignResult.data.facebookPayload.ad.websiteUrl} target="_blank" rel="noopener noreferrer">
                        {campaignResult.data.facebookPayload.ad.websiteUrl}
                      </a>
                    </TableCell>
                  </TableRow>
                  {campaignResult.data.facebookPayload.ad.displayLink && (
                    <TableRow>
                      <TableCell><strong>Display Link</strong></TableCell>
                      <TableCell>{campaignResult.data.facebookPayload.ad.displayLink}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<OpenInNew />}
          onClick={handleOpenFacebookAdsManager}
          sx={{ minWidth: 200 }}
        >
          Open Ads Manager
        </Button>

        <Button
          variant="contained"
          size="large"
          color="secondary"
          startIcon={<CopyIcon />}
          onClick={handleOpenMultiply}
          sx={{ minWidth: 200 }}
        >
          Multiply Campaign
        </Button>

        <Button
          variant="contained"
          size="large"
          color="info"
          startIcon={<VariationIcon />}
          onClick={handleOpenAdDuplication}
          sx={{ minWidth: 200 }}
        >
          Duplicate Ads
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<Add />}
          onClick={onCreateNew}
          sx={{ minWidth: 200 }}
        >
          Create New Strategy
        </Button>
      </Box>

      {/* Tips */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          💡 Pro Tips for Your Campaign
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="• Use different audience targeting for each ad set to test various demographics" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Gradually increase budgets on ad sets showing strong performance" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Monitor frequency to avoid ad fatigue across your audience" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Consider A/B testing different placements on top-performing ad sets" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Use this strategy for lead generation campaigns with proven creative" />
          </ListItem>
        </List>
      </Paper>

      {/* Multiplication Dialog */}
      <Dialog
        open={showMultiplyDialog}
        onClose={handleCloseMultiply}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CopyIcon sx={{ mr: 2 }} />
            Multiply Campaign
          </Box>
        </DialogTitle>
        <DialogContent>
          <MultiplyContainer
            initialCampaignId={campaignResult?.data?.campaign?.id}
            initialPostId={postId}
            onComplete={handleMultiplyComplete}
            standalone={false}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMultiply}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Ad Duplication Dialog */}
      <AdDuplicationModal
        open={showAdDuplicationDialog}
        onClose={handleCloseAdDuplication}
        campaignId={campaignResult?.data?.campaign?.id || ''}
        originalAdId={originalAdId}
        availableAdSets={availableAdSets}
      />
    </Box>
  );
};

export default CompletionSummary;