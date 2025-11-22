import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Alert,
  Paper,
  Divider,
  Switch,
  FormHelperText,
  Chip,
  Autocomplete,
  RadioGroup,
  Radio,
  Button,
  IconButton,
  Slider
} from '@mui/material';
import { Controller, useFormContext, useFieldArray } from 'react-hook-form';
import { Settings, LocationOn, Add, Delete, Schedule, Calculate, Refresh } from '@mui/icons-material';
import {
  PERFORMANCE_GOAL_OPTIONS,
  CONVERSION_EVENT_OPTIONS,
  ATTRIBUTION_SETTING_OPTIONS,
  PLACEMENT_OPTIONS,
  DEFAULT_MANUAL_PLACEMENTS,
  DEVICE_OPTIONS,
  PLATFORM_OPTIONS,
  StrategyForAllFormData
} from '../../../types/strategyForAll';
import { useFacebookResources } from '../../../hooks/useFacebookResources';
import axios from 'axios';
import SavedAudienceLoader from '../../shared/SavedAudienceLoader';
import BulkStateUploader from '../../shared/BulkStateUploader';
import DaypartingSchedule from '../../shared/DaypartingSchedule';

// Full list of countries for targeting
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'RU', name: 'Russia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'TH', name: 'Thailand' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'IL', name: 'Israel' },
  { code: 'TR', name: 'Turkey' },
  { code: 'GR', name: 'Greece' },
  { code: 'PT', name: 'Portugal' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' }
];

// US States for targeting
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

const AdSetSection: React.FC = () => {
  const { control, watch, setValue } = useFormContext<StrategyForAllFormData>();
  const { resources, loading: loadingResources, refetch: refetchResources } = useFacebookResources();
  const [customAudiences, setCustomAudiences] = useState<any[]>([]);
  const [lookalikeAudiences, setLookalikeAudiences] = useState<any[]>([]);
  const [savedAudienceDialogOpen, setSavedAudienceDialogOpen] = useState(false);
  const [bulkStateDialogOpen, setBulkStateDialogOpen] = useState(false);

  // For backward compatibility with existing pixel loading logic
  const loadingPixels = loadingResources;

  const budgetLevel = watch('budgetLevel');
  const budgetType = watch('budgetType');
  const placementType = watch('placementType') || 'automatic';
  const scheduleType = watch('adSetBudget.scheduleType') || 'run_continuously';

  // Auto-clear spending limits when switching to ABO (spending limits incompatible with ABO)
  useEffect(() => {
    if (budgetLevel === 'adset' && watch('adSetBudget.spendingLimits.enabled')) {
      setValue('adSetBudget.spendingLimits.enabled', false);
      setValue('adSetBudget.spendingLimits.dailyMin', undefined);
      setValue('adSetBudget.spendingLimits.dailyMax', undefined);
      setValue('adSetBudget.spendingLimits.lifetimeMin', undefined);
      setValue('adSetBudget.spendingLimits.lifetimeMax', undefined);
    }
  }, [budgetLevel, setValue, watch]);

  // Auto-select saved pixel or first available pixel
  useEffect(() => {
    if (resources.pixels.length > 0 && !watch('pixel')) {
      // First try to use the saved selected pixel
      if (resources.selectedPixel) {
        setValue('pixel', resources.selectedPixel.id);
      } else {
        // Fallback to first available pixel
        setValue('pixel', resources.pixels[0].id);
      }
    }
  }, [resources, setValue, watch]);

  // Fetch audiences from Facebook OAuth
  useEffect(() => {
    fetchAudiences();
  }, []);

  // Auto-map conversion event based on objective selection
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'objective' && value.objective) {
        const objectiveToConversionMap: Record<string, string> = {
          'OUTCOME_LEADS': 'Lead',
          'OUTCOME_SALES': 'Purchase',
          'PHONE_CALL': 'Contact'
        };

        const suggestedConversionEvent = objectiveToConversionMap[value.objective];
        if (suggestedConversionEvent) {
          // Always update to match the objective
          setValue('conversionEvent', suggestedConversionEvent as 'Lead' | 'Contact' | 'Purchase');
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  // Apply Facebook's default manual placements when switching to manual
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'placementType' && value.placementType === 'manual') {
        const currentFacebookPlacements = value.placements?.facebook || [];
        const currentInstagramPlacements = value.placements?.instagram || [];

        // Only set defaults if placements are empty (first time switching to manual)
        if (currentFacebookPlacements.length === 0 && currentInstagramPlacements.length === 0) {
          setValue('placements.facebook', DEFAULT_MANUAL_PLACEMENTS.facebook);
          setValue('placements.instagram', DEFAULT_MANUAL_PLACEMENTS.instagram);
          setValue('placements.messenger', DEFAULT_MANUAL_PLACEMENTS.messenger);
          setValue('placements.audienceNetwork' as any, DEFAULT_MANUAL_PLACEMENTS.audience_network);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  const fetchAudiences = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/facebook/audiences', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.customAudiences) {
        setCustomAudiences(response.data.customAudiences);
      }
      if (response.data.lookalikeAudiences) {
        setLookalikeAudiences(response.data.lookalikeAudiences);
      }
    } catch (error) {
      console.error('Error fetching audiences:', error);
    }
  };

  const handleLoadSavedAudience = (targeting: any) => {
    if (targeting.geo_locations) {
      if (targeting.geo_locations.countries) {
        setValue('targeting.locations.countries', targeting.geo_locations.countries);
      }
      if (targeting.geo_locations.regions) {
        const regionKeys = targeting.geo_locations.regions.map((r: any) => r.key);
        setValue('targeting.locations.regions', regionKeys);
      }
    }
    if (targeting.age_min !== undefined) {
      setValue('targeting.ageMin', targeting.age_min);
    }
    if (targeting.age_max !== undefined) {
      setValue('targeting.ageMax', targeting.age_max);
    }
    if (targeting.genders !== undefined) {
      setValue('targeting.genders', targeting.genders);
    }
    if (targeting.custom_audiences) {
      setValue('targeting.customAudiences', targeting.custom_audiences);
    }
  };

  const handleBulkStatesUploaded = (regions: Array<{ key: string; name: string }>) => {
    const stateKeys = regions.map(r => r.key);
    setValue('targeting.locations.regions', stateKeys);
  };

  const handleDaypartingChange = (blocks: Array<{ days: number[]; startTime: number; endTime: number }>) => {
    setValue('adSetBudget.dayparting', blocks);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Settings sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">Ad Set Configuration</Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Performance Goal */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="performanceGoal"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Performance Goal</InputLabel>
                <Select {...field} label="Performance Goal">
                  {PERFORMANCE_GOAL_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  How Facebook should optimize your ad delivery
                </FormHelperText>
              </FormControl>
            )}
          />
        </Box>

        {/* Pixel Selection */}
        <Box sx={{ width: "100%", display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Controller
            name="pixel"
            control={control}
            rules={{ required: 'Pixel is required' }}
            render={({ field, fieldState: { error } }) => (
              <FormControl fullWidth error={!!error}>
                <InputLabel>Pixel</InputLabel>
                {resources.pixels.length > 0 ? (
                  <Select {...field} label="Pixel">
                    <MenuItem value="">
                      <em>Select a pixel</em>
                    </MenuItem>
                    {resources.pixels.map(pixel => (
                      <MenuItem key={pixel.id} value={pixel.id}>
                        {pixel.name} ({pixel.id})
                        {resources.selectedPixel?.id === pixel.id && (
                          <Chip label="Saved" size="small" color="primary" sx={{ ml: 1 }} />
                        )}
                      </MenuItem>
                    ))}
                    <Divider />
                    <MenuItem value="manual">
                      <em>Enter manually</em>
                    </MenuItem>
                  </Select>
                ) : (
                  <TextField
                    {...field}
                    label="Pixel ID"
                    placeholder="Enter your Facebook Pixel ID"
                    error={!!error}
                    disabled={loadingPixels}
                    InputLabelProps={{ shrink: true }}
                    helperText="Enter pixel ID as shown in Facebook Ads Manager"
                  />
                )}
                {error && <FormHelperText>{error.message}</FormHelperText>}
                {loadingPixels && <FormHelperText>Loading pixels...</FormHelperText>}
                {resources.pixels.length === 0 && !loadingPixels && (
                  <FormHelperText>
                    No pixels found. Click refresh to fetch pixels from your ad account.
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
          <IconButton
            onClick={() => {
              refetchResources();
            }}
            disabled={loadingPixels}
            sx={{ mt: 1 }}
            color="primary"
            title="Refresh pixels from Facebook"
          >
            <Refresh />
          </IconButton>
        </Box>

        {/* Manual Pixel Entry */}
        {watch('pixel') === 'manual' && (
          <Box sx={{ width: "100%" }}>
            <Controller
              name="manualPixelId"
              control={control}
              rules={{ required: 'Pixel ID is required when manual entry is selected' }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Manual Pixel ID"
                  placeholder="Enter your Facebook Pixel ID"
                  error={!!error}
                  helperText={error?.message || 'Enter the pixel ID manually'}
                />
              )}
            />
          </Box>
        )}

        {/* Conversion Event */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="conversionEvent"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Conversion Event</InputLabel>
                <Select {...field} label="Conversion Event">
                  {CONVERSION_EVENT_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Auto-selected based on objective (Leads→Lead, Sales→Purchase, Calls→Contact). You can change if needed.
                </FormHelperText>
              </FormControl>
            )}
          />
        </Box>

        {/* Attribution Setting */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="attributionSetting"
            control={control}
            defaultValue="1_day_click_1_day_view"
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Attribution Setting</InputLabel>
                <Select {...field} label="Attribution Setting">
                  {ATTRIBUTION_SETTING_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </Box>

        <Box sx={{ width: "100%" }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Budget & Schedule
          </Typography>
        </Box>

        {/* Ad Set Budget (when not using CBO) */}
        {budgetLevel === 'adset' && (
          <>
            {/* Budget Type */}
            <Box sx={{ width: "100%" }}>
              <Controller
                name="budgetType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Budget Type</InputLabel>
                    <Select {...field} label="Budget Type">
                      <MenuItem value="daily">Daily Budget</MenuItem>
                      <MenuItem value="lifetime">Lifetime Budget</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Box>

            {/* Budget Amount */}
            <Box sx={{ width: "100%" }}>
              <Controller
                name={budgetType === 'daily' ? 'adSetBudget.dailyBudget' : 'adSetBudget.lifetimeBudget'}
                control={control}
                defaultValue={50}
                rules={{
                  required: 'Budget amount is required',
                  min: { value: 1, message: 'Budget must be at least $1' }
                }}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label={budgetType === 'daily' ? 'Daily Budget' : 'Lifetime Budget'}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                    error={!!error}
                    helperText={error?.message || 'Budget for the initial ad set (1-1-1)'}
                  />
                )}
              />
            </Box>
          </>
        )}

        {/* Ad Set Spending Limits - Only for CBO */}
        {budgetLevel === 'campaign' ? (
          <>
            <Box sx={{ width: "100%" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Ad Set Spending Limits (Optional)
              </Typography>
            </Box>

            {/* Enable/Disable Toggle */}
            <Box sx={{ width: "100%" }}>
              <Controller
                name="adSetBudget.spendingLimits.enabled"
                control={control}
                defaultValue={false}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox {...field} checked={field.value || false} />}
                    label="Set a minimum or maximum spend limit for this ad set"
                  />
                )}
              />
            </Box>

            {watch('adSetBudget.spendingLimits.enabled') && (
              <>
                {/* Value Type Toggle (% or $) */}
                <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
                  <Controller
                    name="adSetBudget.spendingLimits.valueType"
                    control={control}
                    defaultValue="percentage"
                    render={({ field }) => (
                      <FormControl size="small">
                        <Select
                          {...field}
                          displayEmpty
                          sx={{ minWidth: 150 }}
                        >
                          <MenuItem value="percentage">Use % value</MenuItem>
                          <MenuItem value="dollar">Use $ value</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Box>

                {/* Daily Minimum */}
                <Box sx={{ width: "100%" }}>
                  <Controller
                    name="adSetBudget.spendingLimits.dailyMin"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Daily minimum"
                        type="number"
                        InputProps={{
                          startAdornment: watch('adSetBudget.spendingLimits.valueType') === 'dollar' ? (
                            <InputAdornment position="start">$</InputAdornment>
                          ) : null,
                          endAdornment: watch('adSetBudget.spendingLimits.valueType') === 'percentage' ? (
                            <InputAdornment position="end">%</InputAdornment>
                          ) : null
                        }}
                      />
                    )}
                  />
                </Box>

                {/* Daily Maximum */}
                <Box sx={{ width: "100%" }}>
                  <Controller
                    name="adSetBudget.spendingLimits.dailyMax"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Daily maximum"
                        type="number"
                        InputProps={{
                          startAdornment: watch('adSetBudget.spendingLimits.valueType') === 'dollar' ? (
                            <InputAdornment position="start">$</InputAdornment>
                          ) : null,
                          endAdornment: watch('adSetBudget.spendingLimits.valueType') === 'percentage' ? (
                            <InputAdornment position="end">%</InputAdornment>
                          ) : null
                        }}
                      />
                    )}
                  />
                </Box>
              </>
            )}
          </>
        ) : (
          /* ABO Warning - Spending Limits Not Compatible */
          <Box sx={{ width: "100%" }}>
            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Spending limits are not available with Ad Set Budget (ABO).</strong>
                <br />
                Spending limits can only be used with Campaign Budget Optimization (CBO).
                Facebook does not allow min/max spend caps when budgets are set at the ad set level.
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Schedule Type */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="adSetBudget.scheduleType"
            control={control}
            defaultValue="run_continuously"
            render={({ field }) => (
              <FormControl>
                <RadioGroup {...field} row>
                  <FormControlLabel value="run_continuously" control={<Radio />} label="Run continuously" />
                  <FormControlLabel value="scheduled" control={<Radio />} label="Set a start and end date" />
                </RadioGroup>
              </FormControl>
            )}
          />
        </Box>

        {/* Start and End Dates */}
        {scheduleType === 'scheduled' && (
          <>
            <Box sx={{ width: "100%" }}>
              <Controller
                name="adSetBudget.startDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="datetime-local"
                    label="Start Date & Time"
                    InputLabelProps={{ shrink: true }}
                    helperText="Campaign start date and time"
                  />
                )}
              />
            </Box>
            <Box sx={{ width: "100%" }}>
              <Controller
                name="adSetBudget.endDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="datetime-local"
                    label="End Date & Time (Optional)"
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty to run continuously"
                  />
                )}
              />
            </Box>
          </>
        )}

        {/* Dayparting Schedule */}
        {budgetType === 'lifetime' && (
          <Box sx={{ width: "100%" }}>
            <DaypartingSchedule
              value={watch('adSetBudget.dayparting') || []}
              onChange={handleDaypartingChange}
            />
          </Box>
        )}

        <Box sx={{ width: "100%" }}>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              <LocationOn sx={{ verticalAlign: 'middle', mr: 1 }} />
              Audience
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSavedAudienceDialogOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Load from Saved Audience
            </Button>
          </Box>
        </Box>

        {/* Location Targeting */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="targeting.locations.countries"
            control={control}
            defaultValue={['US']}
            render={({ field }) => (
              <Autocomplete
                {...field}
                multiple
                options={COUNTRIES}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') {
                    const country = COUNTRIES.find(c => c.code === option);
                    return country ? country.name : option;
                  }
                  return option.name;
                }}
                value={field.value?.map(code => COUNTRIES.find(c => c.code === code) || { code, name: code }) || []}
                onChange={(_, value) => {
                  const codes = value.map(v => typeof v === 'string' ? v : v.code);
                  field.onChange(codes);
                }}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <span style={{ marginRight: 8 }}>{option.code}</span>
                    {option.name}
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Countries"
                    placeholder="Select countries"
                    helperText="Target users in specific countries"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={typeof option === 'string' ? option : option.name} {...getTagProps({ index })} />
                  ))
                }
              />
            )}
          />
        </Box>

        {/* Regions/States (shows when US is selected) */}
        {watch('targeting.locations.countries')?.includes('US') && (
          <Box sx={{ width: "100%", mt: 2 }}>
            <Controller
              name="targeting.locations.regions"
              control={control}
              defaultValue={[]}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  options={US_STATES}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                      const state = US_STATES.find(s => s.code === option);
                      return state ? state.name : option;
                    }
                    return option.name;
                  }}
                  value={field.value?.map(code => US_STATES.find(s => s.code === code) || { code, name: code }) || []}
                  onChange={(_, value) => {
                    const codes = value.map(v => typeof v === 'string' ? v : v.code);
                    field.onChange(codes);
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <span style={{ marginRight: 8 }}>{option.code}</span>
                      {option.name}
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="States/Regions"
                      placeholder="Select US states"
                      helperText="Target users in specific states (US only)"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        size="small"
                        label={typeof option === 'string' ? option : option.name}
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                />
              )}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setBulkStateDialogOpen(true)}
                sx={{ textTransform: 'none' }}
              >
                Bulk Upload States
              </Button>
            </Box>
          </Box>
        )}

        {/* Age Range */}
        <Box sx={{ width: "100%" }}>
          <Typography gutterBottom>
            Age Range: {(watch('targeting.ageMin') || 18)} - {(watch('targeting.ageMax') || 65)}
          </Typography>
          <Box sx={{ px: 2 }}>
            <Controller
              name="targeting.ageRange"
              control={control}
              defaultValue={[18, 65]}
              render={({ field }) => (
                <Box>
                  <Slider
                    value={field.value || [18, 65]}
                    onChange={(_, value) => {
                      field.onChange(value);
                      // Also update the individual ageMin/ageMax fields for backward compatibility
                      setValue('targeting.ageMin', (value as number[])[0]);
                      setValue('targeting.ageMax', (value as number[])[1]);
                    }}
                    valueLabelDisplay="auto"
                    min={13}
                    max={65}
                    marks={[
                      { value: 13, label: '13' },
                      { value: 18, label: '18' },
                      { value: 25, label: '25' },
                      { value: 35, label: '35' },
                      { value: 45, label: '45' },
                      { value: 55, label: '55' },
                      { value: 65, label: '65+' }
                    ]}
                  />
                </Box>
              )}
            />
          </Box>
        </Box>

        {/* Gender */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="targeting.genders"
            control={control}
            defaultValue={['all']}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  {...field}
                  multiple
                  label="Gender"
                  renderValue={(selected) => (selected as string[]).join(', ')}
                >
                  <MenuItem value="all">
                    <Checkbox checked={(field.value as string[])?.includes('all')} />
                    All
                  </MenuItem>
                  <MenuItem value="male">
                    <Checkbox checked={(field.value as string[])?.includes('male')} />
                    Male
                  </MenuItem>
                  <MenuItem value="female">
                    <Checkbox checked={(field.value as string[])?.includes('female')} />
                    Female
                  </MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Box>

        {/* Custom Audiences */}
        {customAudiences.length > 0 && (
          <Box sx={{ width: "100%" }}>
            <Controller
              name="targeting.customAudiences"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  options={customAudiences}
                  getOptionLabel={(option) => option.name}
                  value={field.value || []}
                  onChange={(_, value) => field.onChange(value.map(v => v.id))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Custom Audiences"
                      placeholder="Select custom audiences"
                      helperText="Target your existing custom audiences"
                    />
                  )}
                />
              )}
            />
          </Box>
        )}

        {/* Lookalike Audiences */}
        {lookalikeAudiences.length > 0 && (
          <Box sx={{ width: "100%" }}>
            <Controller
              name="targeting.lookalikeAudiences"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  options={lookalikeAudiences}
                  getOptionLabel={(option) => option.name}
                  value={field.value || []}
                  onChange={(_, value) => field.onChange(value.map(v => v.id))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Lookalike Audiences"
                      placeholder="Select lookalike audiences"
                      helperText="Target audiences similar to your custom audiences"
                    />
                  )}
                />
              )}
            />
          </Box>
        )}

        <Box sx={{ width: "100%" }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Placements
          </Typography>
        </Box>

        {/* Placement Type */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="placementType"
            control={control}
            defaultValue="automatic"
            render={({ field }) => (
              <FormControl>
                <RadioGroup {...field} row>
                  <FormControlLabel
                    value="automatic"
                    control={<Radio />}
                    label="Automatic Placements (Recommended)"
                  />
                  <FormControlLabel
                    value="manual"
                    control={<Radio />}
                    label="Manual Placements"
                  />
                </RadioGroup>
              </FormControl>
            )}
          />
        </Box>

        {/* Manual Placement Selection */}
        {placementType === 'manual' && (
          <>
            {/* Devices */}
            <Box sx={{ width: "100%" }}>
              <Controller
                name="placements.devices"
                control={control}
                defaultValue={['mobile', 'desktop']}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Devices</InputLabel>
                    <Select
                      {...field}
                      multiple
                      label="Devices"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={DEVICE_OPTIONS.find(d => d.value === value)?.label} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {DEVICE_OPTIONS.map(device => (
                        <MenuItem key={device.value} value={device.value}>
                          <Checkbox checked={(field.value as string[])?.includes(device.value)} />
                          {device.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Box>

            {/* Platforms */}
            <Box sx={{ width: "100%" }}>
              <Controller
                name="placements.platforms"
                control={control}
                defaultValue={['all']}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Platforms</InputLabel>
                    <Select
                      {...field}
                      multiple
                      label="Platforms"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={PLATFORM_OPTIONS.find(p => p.value === value)?.label} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {PLATFORM_OPTIONS.map(platform => (
                        <MenuItem key={platform.value} value={platform.value}>
                          <Checkbox checked={(field.value as string[])?.includes(platform.value)} />
                          {platform.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Box>

            {/* Facebook Placements */}
            <Box sx={{ width: "100%" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Facebook</Typography>
              <Controller
                name="placements.facebook"
                control={control}
                defaultValue={['feed', 'story']}
                render={({ field }) => {
                  // WHITELIST: Only Meta API validated facebook_positions values
                  const VALID_FACEBOOK_POSITIONS = [
                    'feed', 'right_hand_column', 'marketplace', 'video_feeds',
                    'story', 'search', 'instream_video', 'facebook_reels',
                    'facebook_reels_overlay', 'profile_feed', 'instant_article'
                  ];

                  // Migration map for old values
                  const migrations: Record<string, string> = {
                    'stories': 'story',
                    'reels': 'facebook_reels',
                    'groups': 'profile_feed'
                  };

                  // Clean: migrate old values, then filter to whitelist
                  const cleanedValue = Array.from(new Set(
                    (field.value as string[] || [])
                      .map(v => migrations[v] || v)
                      .filter(v => VALID_FACEBOOK_POSITIONS.includes(v))
                  ));

                  // Update field if cleaned
                  if (JSON.stringify(cleanedValue) !== JSON.stringify(field.value)) {
                    field.onChange(cleanedValue);
                  }

                  return (
                  <FormGroup row>
                    {PLACEMENT_OPTIONS.facebook.map(placement => (
                      <FormControlLabel
                        key={placement.value}
                        control={
                          <Checkbox
                            checked={cleanedValue.includes(placement.value)}
                            onChange={(e) => {
                              const current = cleanedValue;
                              if (e.target.checked) {
                                field.onChange([...current, placement.value]);
                              } else {
                                field.onChange(current.filter(v => v !== placement.value));
                              }
                            }}
                          />
                        }
                        label={placement.label}
                      />
                    ))}
                  </FormGroup>
                  );
                }}
              />
            </Box>

            {/* Instagram Placements */}
            <Box sx={{ width: "100%" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Instagram</Typography>
              <Controller
                name="placements.instagram"
                control={control}
                defaultValue={['stream', 'story']}
                render={({ field }) => {
                  // WHITELIST: Only Meta API validated instagram_positions values
                  const VALID_INSTAGRAM_POSITIONS = [
                    'stream', 'story', 'explore', 'explore_home', 'reels',
                    'profile_feed', 'ig_search', 'profile_reels'
                  ];

                  // Migration map
                  const migrations: Record<string, string> = {
                    'stories': 'story',
                    'search': 'ig_search'
                  };

                  // Clean: migrate old values, then filter to whitelist
                  const cleanedValue = Array.from(new Set(
                    (field.value as string[] || [])
                      .map(v => migrations[v] || v)
                      .filter(v => VALID_INSTAGRAM_POSITIONS.includes(v))
                  ));

                  // Update field if cleaned
                  if (JSON.stringify(cleanedValue) !== JSON.stringify(field.value)) {
                    field.onChange(cleanedValue);
                  }

                  return (
                  <FormGroup row>
                    {PLACEMENT_OPTIONS.instagram.map(placement => (
                      <FormControlLabel
                        key={placement.value}
                        control={
                          <Checkbox
                            checked={cleanedValue.includes(placement.value)}
                            onChange={(e) => {
                              const current = cleanedValue;
                              if (e.target.checked) {
                                field.onChange([...current, placement.value]);
                              } else {
                                field.onChange(current.filter(v => v !== placement.value));
                              }
                            }}
                          />
                        }
                        label={placement.label}
                      />
                    ))}
                  </FormGroup>
                  );
                }}
              />
            </Box>

            {/* Messenger Placements */}
            <Box sx={{ width: "100%" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Messenger</Typography>
              <Controller
                name="placements.messenger"
                control={control}
                defaultValue={[]}
                render={({ field }) => {
                  // WHITELIST: Only Meta API validated messenger_positions values
                  const VALID_MESSENGER_POSITIONS = ['story', 'sponsored_messages'];

                  // Migration map
                  const migrations: Record<string, string> = {
                    'stories': 'story'
                  };

                  // Clean: migrate old values, then filter to whitelist
                  const cleanedValue = Array.from(new Set(
                    (field.value as string[] || [])
                      .map(v => migrations[v] || v)
                      .filter(v => VALID_MESSENGER_POSITIONS.includes(v))
                  ));

                  // Update field if cleaned
                  if (JSON.stringify(cleanedValue) !== JSON.stringify(field.value)) {
                    field.onChange(cleanedValue);
                  }

                  return (
                  <FormGroup row>
                    {PLACEMENT_OPTIONS.messenger.map(placement => (
                      <FormControlLabel
                        key={placement.value}
                        control={
                          <Checkbox
                            checked={cleanedValue.includes(placement.value)}
                            onChange={(e) => {
                              const current = cleanedValue;
                              if (e.target.checked) {
                                field.onChange([...current, placement.value]);
                              } else {
                                field.onChange(current.filter(v => v !== placement.value));
                              }
                            }}
                          />
                        }
                        label={placement.label}
                      />
                    ))}
                  </FormGroup>
                  );
                }}
              />
            </Box>

            {/* Audience Network Placements */}
            <Box sx={{ width: "100%" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Audience Network</Typography>
              <Controller
                name="placements.audienceNetwork"
                control={control}
                defaultValue={['classic']}
                render={({ field }) => (
                  <FormGroup row>
                    {PLACEMENT_OPTIONS.audience_network.map(placement => (
                      <FormControlLabel
                        key={placement.value}
                        control={
                          <Checkbox
                            checked={(field.value as string[])?.includes(placement.value)}
                            onChange={(e) => {
                              const current = field.value as string[] || [];
                              if (e.target.checked) {
                                field.onChange([...current, placement.value]);
                              } else {
                                field.onChange(current.filter(v => v !== placement.value));
                              }
                            }}
                          />
                        }
                        label={placement.label}
                      />
                    ))}
                  </FormGroup>
                )}
              />
            </Box>
          </>
        )}

        {/* Duplication Settings Section - Conditional based on budgetLevel */}
        <Box sx={{ width: "100%" }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Duplication Settings
          </Typography>
        </Box>

        {/* Number of Ad Sets to Duplicate */}
        <Box sx={{ width: "100%" }}>
          <Controller
            name="duplicationSettings.adSetCount"
            control={control}
            defaultValue={49}
            rules={{
              required: 'Number of ad sets is required',
              min: { value: 0, message: 'Minimum 0 ad sets' },
              max: { value: 49, message: 'Maximum 49 ad sets' }
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Number of Ad Sets to Duplicate"
                inputProps={{ min: 0, max: 49, step: 1 }}
                helperText={
                  error?.message ||
                  "Enter 0 to create only 1-1-1 structure (1 campaign, 1 ad set, 1 ad). Enter 1-49 to duplicate ad sets."
                }
                error={!!error}
              />
            )}
          />
        </Box>

        {/* Budget Information - Different for ABO vs CBO */}
        {budgetLevel === 'adset' ? (
          <Box sx={{ width: "100%" }}>
            <Alert severity="info">
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Budget per ad set:</strong> Each duplicated ad set will use the same budget
                as specified in "Budget & Schedule" above.
              </Typography>
              <Typography variant="body2" component="div">
                • <strong>Budget type:</strong> {watch('budgetType') === 'daily' ? 'Daily Budget' : 'Lifetime Budget'}
                <br />
                • <strong>Budget amount:</strong> ${(() => {
                  const budget = watch('budgetType') === 'daily'
                    ? (watch('adSetBudget.dailyBudget') || 0)
                    : (watch('adSetBudget.lifetimeBudget') || 0);
                  return Number(budget).toFixed(2);
                })()} per ad set
                <br />
                • <strong>Total ad sets:</strong> {watch('duplicationSettings.adSetCount') === 0
                  ? 1
                  : ((Number(watch('duplicationSettings.adSetCount')) || 49) + 1)
                }
                {watch('duplicationSettings.adSetCount') === 0
                  ? ' (1-1-1 structure only)'
                  : ` (1 initial + ${Number(watch('duplicationSettings.adSetCount')) || 49} duplicates)`
                }
                <br />
                • <strong>Total {watch('budgetType') === 'daily' ? 'daily' : 'lifetime'} spend:</strong> $
                {(() => {
                  const budgetValue = watch('budgetType') === 'daily'
                    ? (watch('adSetBudget.dailyBudget') || 0)
                    : (watch('adSetBudget.lifetimeBudget') || 0);
                  // Ensure budget is treated as a number (in dollars)
                  const budget = Number(budgetValue);
                  const adSetCount = Number(watch('duplicationSettings.adSetCount')) || 49;
                  const totalAdSets = watch('duplicationSettings.adSetCount') === 0 ? 1 : (adSetCount + 1);
                  const totalSpend = budget * totalAdSets;
                  // Format with thousands separator
                  return totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}
              </Typography>
            </Alert>
          </Box>
        ) : (
          /* CBO Info Message */
          <Box sx={{ width: "100%" }}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Campaign Budget Optimization (CBO) is enabled.</strong>
                <br />
                Facebook will automatically distribute your campaign budget across ad sets.
                No individual ad set budgets are required.
              </Typography>
            </Alert>
          </Box>
        )}
      </Box>

      {/* Saved Audience Loader Dialog */}
      <SavedAudienceLoader
        open={savedAudienceDialogOpen}
        onClose={() => setSavedAudienceDialogOpen(false)}
        onLoadAudience={handleLoadSavedAudience}
      />

      {/* Bulk State Uploader Dialog */}
      <BulkStateUploader
        open={bulkStateDialogOpen}
        onClose={() => setBulkStateDialogOpen(false)}
        onStatesUploaded={handleBulkStatesUploaded}
      />
    </Paper>
  );
};

export default AdSetSection;