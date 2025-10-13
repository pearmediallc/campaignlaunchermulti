import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import { ContentCopy as CopyIcon, Close } from '@mui/icons-material';
import AdSetSelector from './AdSetSelector';
import VariationConfigurator from './VariationConfigurator';
import { AdDuplicationRequest, AdSetSelection, AdVariation } from '../../../types/adDuplication';
import axios from 'axios';

interface AdDuplicationModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  originalAdId: string;
  originalAdData?: any; // Will be fetched if not provided
  availableAdSets: Array<{
    id: string;
    name: string;
  }>;
}

const AdDuplicationModal: React.FC<AdDuplicationModalProps> = ({
  open,
  onClose,
  campaignId,
  originalAdId,
  originalAdData,
  availableAdSets
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [duplicationType, setDuplicationType] = useState<'quick' | 'custom' | null>(null);
  const [selectedAdSets, setSelectedAdSets] = useState<AdSetSelection[]>([]);
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    adsCreated: number;
    totalAdsToCreate: number;
    currentOperation: string;
    status: string;
    errors?: Array<{
      adSetIndex?: number;
      adSetName?: string;
      copyNumber?: number;
      error: string;
    }>;
  } | null>(null);

  const steps = ['Select Type', 'Choose Ad Sets', 'Configure Variations'];

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setDuplicationType(null);
      setSelectedAdSets([]);
      setVariations([]);
      setLoading(false);
      setError(null);
      setJobId(null);
      setProgress(null);
    }
  }, [open]);

  // Poll for progress when job is created
  useEffect(() => {
    if (!jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/campaigns/strategy-for-all/ads/progress/${jobId}`);
        const jobData = response.data;

        setProgress({
          adsCreated: jobData.adsCreated || 0,
          totalAdsToCreate: jobData.totalAdsToCreate || 0,
          currentOperation: jobData.currentOperation || '',
          status: jobData.status,
          errors: jobData.errors || []
        });

        // Stop polling if complete or error
        if (jobData.status === 'completed' || jobData.status === 'error') {
          clearInterval(pollInterval);
          setLoading(false);

          // Check if there are any errors even in completed status
          const hasErrors = jobData.errors && jobData.errors.length > 0;
          const allFailed = jobData.adsCreated === 0;

          if (jobData.status === 'completed' && !hasErrors) {
            // Only auto-close if truly successful (no errors)
            setTimeout(() => {
              onClose();
            }, 2000);
          } else if (hasErrors || allFailed) {
            // Show error details if any ads failed
            const errorMsg = allFailed
              ? `Failed to create all ${jobData.totalAdsToCreate} ads. See details below.`
              : `${jobData.errors.length} ad(s) failed to create. ${jobData.adsCreated} created successfully.`;
            setError(errorMsg);
          } else {
            setError(jobData.currentOperation || 'Duplication failed');
          }
        }
      } catch (err) {
        console.error('Error polling progress:', err);
        clearInterval(pollInterval);
        setLoading(false);
        setError('Failed to track progress');
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [jobId, onClose]);

  const handleTypeSelection = (type: 'quick' | 'custom') => {
    setDuplicationType(type);
    setActiveStep(1);
  };

  const handleAdSetSelection = (selections: AdSetSelection[]) => {
    setSelectedAdSets(selections);
    if (duplicationType === 'quick') {
      // Skip variation step for quick duplicate
      handleSubmit(selections, []);
    } else {
      setActiveStep(2);
    }
  };

  const handleVariationConfiguration = (configuredVariations: AdVariation[]) => {
    setVariations(configuredVariations);
    handleSubmit(selectedAdSets, configuredVariations);
  };

  const handleSubmit = async (adSets: AdSetSelection[], vars: AdVariation[]) => {
    setLoading(true);
    setError(null);

    try {
      const request: AdDuplicationRequest = {
        campaignId,
        originalAdId,
        duplicationType: duplicationType!,
        adSets: adSets.map(as => ({
          adSetId: as.adSetId,
          numberOfCopies: as.numberOfCopies
        })),
        variations: duplicationType === 'custom' ? vars : []
      };

      const response = await axios.post('/api/campaigns/strategy-for-all/ads/duplicate', request);

      if (response.data.success) {
        setJobId(response.data.jobId);
        // Progress polling will take over from here
      } else {
        setError('Failed to start duplication');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error starting duplication:', err);
      setError(err.response?.data?.message || 'Failed to duplicate ads');
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" gutterBottom>
              Choose Duplication Type
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select how you want to duplicate your ads
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
              <Button
                variant={duplicationType === 'quick' ? 'contained' : 'outlined'}
                size="large"
                onClick={() => handleTypeSelection('quick')}
                sx={{ p: 3, textAlign: 'left', justifyContent: 'flex-start' }}
              >
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Quick Duplicate
                  </Typography>
                  <Typography variant="body2">
                    Duplicate ads using the same post ID. Fastest option, preserves engagement and social proof.
                    No customization available.
                  </Typography>
                </Box>
              </Button>

              <Button
                variant={duplicationType === 'custom' ? 'contained' : 'outlined'}
                size="large"
                onClick={() => handleTypeSelection('custom')}
                sx={{ p: 3, textAlign: 'left', justifyContent: 'flex-start' }}
              >
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Create Variations
                  </Typography>
                  <Typography variant="body2">
                    Create custom variations for A/B testing. Customize creative, text, headlines, and more.
                    Each variation creates a new post.
                  </Typography>
                </Box>
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <AdSetSelector
            availableAdSets={availableAdSets}
            onConfirm={handleAdSetSelection}
            onBack={handleBack}
          />
        );

      case 2:
        return (
          <VariationConfigurator
            originalAdData={originalAdData}
            selectedAdSets={selectedAdSets}
            onConfirm={handleVariationConfiguration}
            onBack={handleBack}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CopyIcon sx={{ mr: 2 }} />
            Duplicate Ads for A/B Testing
          </Box>
          {!loading && (
            <Button onClick={onClose} size="small">
              <Close />
            </Button>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Stepper */}
        {!loading && !jobId && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label, index) => {
              // Skip variation step for quick duplicate
              if (duplicationType === 'quick' && index === 2) return null;
              return (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              );
            })}
          </Stepper>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Progress Display */}
        {loading && progress && (
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" gutterBottom align="center">
              Creating Ads...
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ flex: 1, mr: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={(progress.adsCreated / progress.totalAdsToCreate) * 100}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {progress.adsCreated} / {progress.totalAdsToCreate}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              {progress.currentOperation}
            </Typography>
          </Box>
        )}

        {/* Loading without progress */}
        {loading && !progress && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Step Content */}
        {!loading && !jobId && renderStepContent()}

        {/* Success State */}
        {progress?.status === 'completed' && !progress?.errors?.length && (
          <Alert severity="success" sx={{ mt: 2 }}>
            All ads created successfully! Modal will close automatically...
          </Alert>
        )}

        {/* Error Details */}
        {progress?.errors && progress.errors.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Failed Ads ({progress.errors.length}):
              </Typography>
              {progress.errors.slice(0, 5).map((err, index) => (
                <Typography key={index} variant="body2" sx={{ mt: 1 }}>
                  • {err.adSetName || `Ad Set ${err.adSetIndex || '?'}`}
                  {err.copyNumber ? ` - Copy ${err.copyNumber}` : ''}: {err.error}
                </Typography>
              ))}
              {progress.errors.length > 5 && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  ...and {progress.errors.length - 5} more errors
                </Typography>
              )}
            </Alert>
          </Box>
        )}
      </DialogContent>

      {!loading && !jobId && activeStep > 0 && (
        <DialogActions>
          <Button onClick={handleBack}>Back</Button>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default AdDuplicationModal;
