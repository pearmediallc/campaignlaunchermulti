import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Chip,
  IconButton,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  People as AudienceIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

interface SavedAudience {
  id: string;
  name: string;
  targeting: any;
  time_created: string;
  time_updated: string;
}

interface SavedAudienceLoaderProps {
  open: boolean;
  onClose: () => void;
  onLoadAudience: (targeting: any) => void;
}

const SavedAudienceLoader: React.FC<SavedAudienceLoaderProps> = ({
  open,
  onClose,
  onLoadAudience
}) => {
  const [audiences, setAudiences] = useState<SavedAudience[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<SavedAudience | null>(null);

  useEffect(() => {
    if (open) {
      fetchSavedAudiences();
    }
  }, [open]);

  const fetchSavedAudiences = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/facebook-targeting/saved-audiences');

      if (response.data.success) {
        setAudiences(response.data.savedAudiences);
      } else {
        toast.error('Failed to load saved audiences');
      }
    } catch (error: any) {
      console.error('Error fetching saved audiences:', error);
      toast.error(error.response?.data?.message || 'Failed to load saved audiences');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAudience = (audience: SavedAudience) => {
    setSelectedAudience(audience);
  };

  const handleApplyAudience = () => {
    if (!selectedAudience) {
      toast.error('Please select an audience first');
      return;
    }

    onLoadAudience(selectedAudience.targeting);
    toast.success(`Loaded targeting from "${selectedAudience.name}"`);
    onClose();
  };

  const filteredAudiences = audiences.filter(audience =>
    audience.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTargetingSummary = (targeting: any): string => {
    const parts: string[] = [];

    if (targeting.geo_locations) {
      if (targeting.geo_locations.countries) {
        parts.push(`${targeting.geo_locations.countries.length} country(s)`);
      }
      if (targeting.geo_locations.regions) {
        parts.push(`${targeting.geo_locations.regions.length} region(s)`);
      }
      if (targeting.geo_locations.cities) {
        parts.push(`${targeting.geo_locations.cities.length} city(s)`);
      }
    }

    if (targeting.age_min || targeting.age_max) {
      parts.push(`Age: ${targeting.age_min || 18}-${targeting.age_max || 65}`);
    }

    if (targeting.genders) {
      parts.push(`Gender: ${targeting.genders.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'No targeting specified';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <AudienceIcon color="primary" />
            <Typography variant="h6">Load from Saved Audience</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Load targeting settings from your Facebook Saved Audiences. This will populate your form fields
          with the location, age, gender, and interest targeting from the selected audience.
        </Alert>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search saved audiences..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />

        {/* Loading State */}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading saved audiences...</Typography>
          </Box>
        )}

        {/* Audiences List */}
        {!loading && filteredAudiences.length === 0 && (
          <Alert severity="warning">
            No saved audiences found. Create saved audiences in Facebook Ads Manager first.
          </Alert>
        )}

        {!loading && filteredAudiences.length > 0 && (
          <List sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: '400px', overflow: 'auto' }}>
            {filteredAudiences.map((audience) => (
              <ListItem
                key={audience.id}
                disablePadding
                divider
                secondaryAction={
                  selectedAudience?.id === audience.id && (
                    <CheckIcon color="primary" />
                  )
                }
              >
                <ListItemButton
                  selected={selectedAudience?.id === audience.id}
                  onClick={() => handleSelectAudience(audience)}
                >
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {audience.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getTargetingSummary(audience.targeting)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={`Created: ${new Date(audience.time_created).toLocaleDateString()}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {selectedAudience && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Selected: {selectedAudience.name}
            </Typography>
            <Typography variant="caption">
              This will populate your targeting fields with the settings from this saved audience.
              You can modify them afterwards if needed.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={fetchSavedAudiences} disabled={loading}>
          Refresh
        </Button>
        <Button
          variant="contained"
          onClick={handleApplyAudience}
          disabled={loading || !selectedAudience}
          startIcon={<CheckIcon />}
        >
          Apply Audience
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SavedAudienceLoader;
