# Strategy150 Audit - Remaining Issues Found

## 1. ❌ CRITICAL: CampaignBudgetOptimization Synchronization Issue

### Problem
- When `budgetLevel = 'campaign'`, the `campaignBudgetOptimization` toggle appears but defaults to `true`
- However, there's NO useEffect to sync these two fields
- This creates confusion: user can have `budgetLevel='campaign'` but `campaignBudgetOptimization=false`

### Current Code (CampaignSection.tsx line 195-215)
```jsx
{budgetLevel === 'campaign' && (
  <Controller
    name="campaignBudgetOptimization"
    defaultValue={true}  // Always true but not synced!
```

### Backend Check (facebookApi.js line 1147)
```javascript
const useCampaignBudget = campaignData.budgetLevel === 'campaign' || campaignData.campaignBudgetOptimization;
```

### FIX NEEDED
Add synchronization in CampaignSection.tsx:
```javascript
useEffect(() => {
  if (budgetLevel === 'campaign') {
    setValue('campaignBudgetOptimization', true);
  } else {
    setValue('campaignBudgetOptimization', false);
  }
}, [budgetLevel, setValue]);
```

## 2. ⚠️ Performance Goal Not Being Used

### Problem
- Frontend sends `performanceGoal: 'maximize_conversions'`
- Backend receives it but NEVER passes to Facebook API
- Facebook API expects `optimization_goal` at ad set level

### Missing Mapping (facebookApi.js createAdSet)
```javascript
// Current: optimization_goal hardcoded
optimization_goal: this.mapOptimizationGoal(adSetData.objective),

// Should include performanceGoal:
optimization_goal: adSetData.performanceGoal || this.mapOptimizationGoal(adSetData.objective),
```

## 3. ⚠️ Attribution Settings Not Passed

### Problem
- Frontend collects `attributionSetting` and `attributionWindow`
- Backend receives them but doesn't pass to Facebook

### Missing in facebookApi.js
```javascript
// Should add to ad set params:
attribution_spec: {
  event_type: adSetData.conversionEvent,
  window_days: adSetData.attributionWindow === '1_day' ? 1 : 7
}
```

## 4. ⚠️ Campaign Spending Limit Not Implemented

### Problem
- Form has `campaignSpendingLimit` field (CampaignSection.tsx line 362)
- Backend receives it but never passes to Facebook
- Facebook expects `spend_cap` at campaign level

### Fix in facebookApi.js createCampaign:
```javascript
if (campaignData.campaignSpendingLimit) {
  params.spend_cap = this.parseBudgetValue(campaignData.campaignSpendingLimit);
}
```

## 5. ⚠️ Placement Configuration Ignored

### Problem
- Frontend sends detailed placement configuration
- Backend completely ignores it
- All ads use automatic placements

### Current Frontend (Phase1Setup.tsx)
```javascript
placements: {
  facebook: ['feed', 'stories'],
  instagram: ['stream', 'stories'],
  audienceNetwork: ['classic'],
  messenger: [],
  devices: ['mobile', 'desktop'],
  platforms: ['all']
}
```

### Missing in Backend
Ad set should include:
```javascript
targeting: {
  ...existingTargeting,
  publisher_platforms: placementType === 'automatic' ? ['facebook', 'instagram', 'audience_network', 'messenger'] : customPlacements
}
```

## 6. ⚠️ Schedule Type Not Properly Handled

### Problem
- `adSetBudget.scheduleType` exists but not used correctly
- When `scheduled`, should require start/end times
- Currently no validation for this

### Fix Needed
Add validation in Strategy150Container.tsx:
```javascript
if (workingCampaignData.adSetBudget?.scheduleType === 'scheduled' &&
    !workingCampaignData.adSetBudget?.endDate) {
  validationErrors.push('End date required for scheduled campaigns');
}
```

## 7. ⚠️ Media Upload Status Not Tracked

### Problem
- Media files uploaded but no progress tracking
- User doesn't know if upload succeeded
- No error handling for failed uploads

### Current Code (Strategy150Container.tsx)
```javascript
if (workingCampaignData.mediaType === 'single_image' && workingCampaignData.image instanceof File) {
  formData.append('media', workingCampaignData.image);
}
// No validation or feedback
```

## 8. ⚠️ Manual Pixel ID Not Validated

### Problem
- User can enter manual pixel ID
- No validation that it's a valid Facebook pixel
- Could cause campaign creation to fail

### Fix Needed
Add validation:
```javascript
if (campaignData.pixel === 'manual' && campaignData.manualPixelId) {
  // Validate pixel ID format (should be numeric)
  if (!/^\d+$/.test(campaignData.manualPixelId)) {
    errors.push('Invalid pixel ID format');
  }
}
```

## 9. ⚠️ Bid Strategy Parameters Not Complete

### Problem
- Frontend sends `bidAmount`, `costCap`, `minRoas`
- These are parsed but not always used correctly
- Missing field mapping for some bid strategies

### Current Issue
```javascript
// LOWEST_COST_WITH_BID_CAP needs bid_amount
// COST_CAP needs bid_amount (not cost_cap)
// LOWEST_COST_WITH_MIN_ROAS needs min_roas
```

## 10. ❌ BUG: Default CBO Toggle State

### Problem
When user selects "Campaign Budget Optimization" from dropdown:
- Toggle appears with `defaultValue={true}`
- But form state might not be synchronized
- Can cause mismatch between UI and actual value

### Fix in CampaignSection.tsx
```javascript
<Controller
  name="campaignBudgetOptimization"
  control={control}
  defaultValue={budgetLevel === 'campaign'} // Sync with budgetLevel
```

## Summary of Issues by Priority

### CRITICAL (Must Fix)
1. CampaignBudgetOptimization sync issue - causes wrong budget placement
2. Default CBO toggle state - UI/data mismatch

### IMPORTANT (Should Fix)
3. Performance goal not used - limits optimization
4. Attribution settings ignored - affects tracking
5. Campaign spending limit not passed - no budget caps
6. Schedule validation missing - could cause errors

### NICE TO HAVE
7. Placement configuration ignored - uses automatic only
8. Media upload feedback missing - poor UX
9. Manual pixel validation - could improve error handling
10. Bid strategy parameters incomplete - advanced features missing

## Recommended Actions

1. **Immediate**: Fix CBO synchronization issue
2. **Next**: Add missing field mappings to FacebookAPI
3. **Then**: Add validation for required fields
4. **Finally**: Improve UX with upload progress and feedback