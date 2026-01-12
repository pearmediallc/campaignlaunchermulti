import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  TextField,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  ShoppingCart,
  Add,
  Close
} from '@mui/icons-material';
import axios from 'axios';
import {
  ProductCatalog,
  ProductSet,
  CatalogVertical,
  CatalogListResponse,
  ProductSetsResponse,
  CreateCatalogRequest,
  CreateCatalogResponse
} from '../../types/strategyForAll';

interface ProductCatalogSelectorProps {
  onCatalogSelect: (catalogId: string | null, productSetId?: string) => void;
}

const CATALOG_VERTICALS: { value: CatalogVertical; label: string; description: string }[] = [
  { value: 'commerce', label: 'E-commerce Products', description: 'Physical or digital products for sale' },
  { value: 'destinations', label: 'Travel Destinations', description: 'Travel and tourism destinations' },
  { value: 'flights', label: 'Flight Bookings', description: 'Airline flight inventory' },
  { value: 'home_listings', label: 'Real Estate', description: 'Properties for sale or rent' },
  { value: 'hotels', label: 'Hotel Bookings', description: 'Hotel and accommodation inventory' },
  { value: 'vehicles', label: 'Automotive', description: 'Cars, motorcycles, and other vehicles' },
  { value: 'media_titles', label: 'Media Titles', description: 'Movies, TV shows, books, music' }
];

const ProductCatalogSelector: React.FC<ProductCatalogSelectorProps> = ({ onCatalogSelect }) => {
  // UI State
  const [expanded, setExpanded] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Data State
  const [catalogs, setCatalogs] = useState<ProductCatalog[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [selectedProductSetId, setSelectedProductSetId] = useState<string>('');
  const [productSets, setProductSets] = useState<ProductSet[]>([]);

  // Loading/Error State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // New Catalog Form
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogVertical, setNewCatalogVertical] = useState<CatalogVertical>('commerce');

  // Fetch catalogs when component expands
  useEffect(() => {
    if (expanded && catalogs.length === 0) {
      fetchCatalogs();
    }
  }, [expanded]);

  // Fetch product sets when catalog is selected
  useEffect(() => {
    if (selectedCatalogId) {
      fetchProductSets(selectedCatalogId);
    } else {
      setProductSets([]);
      setSelectedProductSetId('');
    }
  }, [selectedCatalogId]);

  const fetchCatalogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<CatalogListResponse>('/api/catalogs/list');
      if (response.data.success) {
        setCatalogs(response.data.catalogs);
        if (response.data.catalogs.length === 0) {
          setError('No catalogs found. Create a new catalog to get started.');
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch catalogs:', err);
      setError(err.response?.data?.error || 'Failed to fetch catalogs');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductSets = async (catalogId: string) => {
    try {
      const response = await axios.get<ProductSetsResponse>(`/api/catalogs/${catalogId}/product-sets`);
      if (response.data.success) {
        setProductSets(response.data.productSets);
      }
    } catch (err: any) {
      console.error('Failed to fetch product sets:', err);
      // Non-fatal error, just log it
    }
  };

  const handleCreateCatalog = async () => {
    if (!newCatalogName.trim()) {
      setError('Catalog name is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const payload: CreateCatalogRequest = {
        name: newCatalogName.trim(),
        vertical: newCatalogVertical
      };

      const response = await axios.post<CreateCatalogResponse>('/api/catalogs/create', payload);

      if (response.data.success) {
        const newCatalog = response.data.catalog;
        setCatalogs([...catalogs, newCatalog]);
        setSelectedCatalogId(newCatalog.id);
        onCatalogSelect(newCatalog.id);

        // Reset form
        setNewCatalogName('');
        setNewCatalogVertical('commerce');
        setCreateDialogOpen(false);

        alert(`Catalog "${newCatalog.name}" created successfully!`);
      }
    } catch (err: any) {
      console.error('Failed to create catalog:', err);
      setError(err.response?.data?.error || 'Failed to create catalog');
    } finally {
      setCreating(false);
    }
  };

  const handleCatalogChange = (catalogId: string) => {
    setSelectedCatalogId(catalogId);
    setSelectedProductSetId('');
    onCatalogSelect(catalogId || null);
  };

  const handleProductSetChange = (productSetId: string) => {
    setSelectedProductSetId(productSetId);
    onCatalogSelect(selectedCatalogId, productSetId || undefined);
  };

  const handleClearSelection = () => {
    setSelectedCatalogId('');
    setSelectedProductSetId('');
    onCatalogSelect(null);
    setExpanded(false);
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          backgroundColor: '#fff7e6',
          border: '1px solid #ffd966',
          overflow: 'hidden'
        }}
      >
        {/* Header - Always visible */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#fff4cc'
            }
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingCart sx={{ color: '#ff9800', fontSize: '1.5rem' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '1.1rem' }}>
              Product Catalog (Optional)
            </Typography>
            {selectedCatalogId && !expanded && (
              <Typography variant="body2" sx={{ ml: 1, color: '#ff9800', fontWeight: 500 }}>
                • Catalog Selected
              </Typography>
            )}
          </Box>
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {/* Collapsible Content */}
        <Collapse in={expanded}>
          <Box sx={{ p: 3, pt: 1, borderTop: '1px solid #ffd966' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.875rem' }}>
              Required for Dynamic Product Ads and Catalog Sales campaigns. Click to expand and configure.
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" sx={{ ml: 2 }}>Loading catalogs...</Typography>
              </Box>
            ) : error ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : catalogs.length > 0 ? (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="catalog-select-label">Select Catalog</InputLabel>
                  <Select
                    labelId="catalog-select-label"
                    value={selectedCatalogId}
                    onChange={(e) => handleCatalogChange(e.target.value)}
                    label="Select Catalog"
                    sx={{ backgroundColor: '#ffffff' }}
                  >
                    <MenuItem value="">
                      <em>None (Skip catalog)</em>
                    </MenuItem>
                    {catalogs.map((catalog) => (
                      <MenuItem key={catalog.id} value={catalog.id}>
                        {catalog.name} ({catalog.productCount} products)
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Choose an existing product catalog from your Facebook Business Manager</FormHelperText>
                </FormControl>

                {selectedCatalogId && productSets.length > 0 && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="product-set-select-label">Product Set (Optional)</InputLabel>
                    <Select
                      labelId="product-set-select-label"
                      value={selectedProductSetId}
                      onChange={(e) => handleProductSetChange(e.target.value)}
                      label="Product Set (Optional)"
                      sx={{ backgroundColor: '#ffffff' }}
                    >
                      <MenuItem value="">
                        <em>All Products</em>
                      </MenuItem>
                      {productSets.map((ps) => (
                        <MenuItem key={ps.id} value={ps.id}>
                          {ps.name} ({ps.productCount} products)
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>Optionally target a specific subset of products</FormHelperText>
                  </FormControl>
                )}
              </>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                No catalogs found. Create a new catalog to get started.
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{
                  backgroundColor: '#ff9800',
                  '&:hover': { backgroundColor: '#f57c00' }
                }}
              >
                Create New Catalog
              </Button>

              {selectedCatalogId && (
                <Button
                  variant="outlined"
                  onClick={handleClearSelection}
                  sx={{
                    borderColor: '#ff9800',
                    color: '#ff9800',
                    '&:hover': {
                      borderColor: '#f57c00',
                      backgroundColor: '#fff4cc'
                    }
                  }}
                >
                  Clear Selection
                </Button>
              )}
            </Box>

            {selectedCatalogId && (
              <Alert severity="success" sx={{ mt: 2, backgroundColor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  ✓ Catalog selected: {catalogs.find(c => c.id === selectedCatalogId)?.name}
                  {selectedProductSetId && ` (Product Set: ${productSets.find(ps => ps.id === selectedProductSetId)?.name})`}
                </Typography>
              </Alert>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Create Catalog Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !creating && setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Create New Product Catalog</Typography>
          <IconButton onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Catalog Name"
              value={newCatalogName}
              onChange={(e) => setNewCatalogName(e.target.value)}
              placeholder="My Product Catalog"
              required
              disabled={creating}
            />
            <FormControl fullWidth>
              <InputLabel>Catalog Type</InputLabel>
              <Select
                value={newCatalogVertical}
                onChange={(e) => setNewCatalogVertical(e.target.value as CatalogVertical)}
                label="Catalog Type"
                disabled={creating}
              >
                {CATALOG_VERTICALS.map((vertical) => (
                  <MenuItem key={vertical.value} value={vertical.value}>
                    {vertical.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {CATALOG_VERTICALS.find(v => v.value === newCatalogVertical)?.description}
              </FormHelperText>
            </FormControl>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateCatalog}
            disabled={creating || !newCatalogName.trim()}
            startIcon={creating ? <CircularProgress size={20} /> : <Add />}
          >
            {creating ? 'Creating...' : 'Create Catalog'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProductCatalogSelector;
