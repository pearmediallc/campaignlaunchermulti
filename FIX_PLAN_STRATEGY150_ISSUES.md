# Strategy 150 Critical Issues - Fix Plan

## Problem Summary
1. **Budget Issue**: User enters $50, Facebook receives $5000 (100x multiplier error)
2. **Resource Selection**: Selected pages/pixels/ad accounts not being used
3. **Form Values**: Default values override user selections
4. **CBO Budget**: Campaign budget not properly mapped

## Root Cause Analysis

### 1. Double Budget Conversion Bug
**Location**: Multiple conversion points causing compound multiplication

#### Current Flow (BROKEN):
```javascript
User Input: $50
↓
Frontend (Strategy150Container.tsx:310, 344-345):
  50 * 100 = 5000 // Converts to "cents"
↓
Backend (strategy150.js:489-493):
  parseBudget sees 5000 (number)
  Assumes it's cents: 5000 / 100 = 50
↓
FacebookAPI (facebookApi.js:527-540):
  parseBudgetValue gets 50
  Converts to cents: 50 * 100 = 5000
↓
Meta API: Receives 5000 cents = $5000 ❌
```

### 2. Resource Selection Not Working
- `useFacebookResources` fetches selected resources
- Form uses static `defaultValues` that override resources
- Condition `!watch('pixel')` never true because defaults exist
- Resource switching updates DB but not form

### 3. Form State Management Issues
- Static defaults in `useForm` prevent dynamic updates
- `setValue` conditions fail due to existing defaults
- No synchronization between resource changes and form

## Fix Implementation

### FIX 1: Remove Double Budget Conversion

#### File: `/frontend/src/components/Strategy150/Strategy150Container.tsx`

**Lines 308-310 (REMOVE conversion):**
```javascript
// BEFORE (WRONG):
} else if (key === 'dailyBudget' || key === 'lifetimeBudget') {
  formData.append(key, String(Number(value) * 100)); // REMOVE THIS MULTIPLICATION
}

// AFTER (FIXED):
} else if (key === 'dailyBudget' || key === 'lifetimeBudget') {
  formData.append(key, String(Number(value))); // Send as dollars
}
```

**Lines 344-345 (REMOVE conversion):**
```javascript
// BEFORE (WRONG):
dailyBudget: workingCampaignData.adSetBudget.dailyBudget ?
  workingCampaignData.adSetBudget.dailyBudget * 100 : undefined,
lifetimeBudget: workingCampaignData.adSetBudget.lifetimeBudget ?
  workingCampaignData.adSetBudget.lifetimeBudget * 100 : undefined

// AFTER (FIXED):
dailyBudget: workingCampaignData.adSetBudget.dailyBudget || undefined,
lifetimeBudget: workingCampaignData.adSetBudget.lifetimeBudget || undefined
```

#### File: `/backend/routes/strategy150.js`

**Lines 489-493 (FIX logic):**
```javascript
// BEFORE (WRONG):
const parseBudget = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    return value / 100; // WRONG - assumes cents
  }
  // ...
}

// AFTER (FIXED):
const parseBudget = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    return value; // Already in dollars from frontend
  }
  const cleanValue = String(value).replace(/[$,]/g, '');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? undefined : parsed;
}
```

### FIX 2: Resource Selection & Form Synchronization

#### File: `/frontend/src/components/Strategy150/Phase1Setup/AdSetSection.tsx`

**Lines 165-175 (FIX condition):**
```javascript
// BEFORE (WRONG):
useEffect(() => {
  if (resources.pixels.length > 0 && !watch('pixel')) { // Never true due to defaults
    // ...
  }
}, [resources, setValue, watch]);

// AFTER (FIXED):
useEffect(() => {
  if (resources.pixels.length > 0) {
    // Always update with selected resource if available
    if (resources.selectedPixel) {
      setValue('pixel', resources.selectedPixel.id, { shouldValidate: true });
    } else if (!watch('pixel') || watch('pixel') === '') {
      // Only use first pixel as fallback if no selection
      setValue('pixel', resources.pixels[0].id);
    }
  }
}, [resources]); // Remove watch dependency to prevent loops
```

#### File: `/frontend/src/components/Strategy150/Phase1Setup/AdSection.tsx`

**Lines 89-99 (FIX condition):**
```javascript
// BEFORE (WRONG):
useEffect(() => {
  if (resources.pages.length > 0 && !watch('facebookPage')) {
    // ...
  }
}, [resources, setValue, watch]);

// AFTER (FIXED):
useEffect(() => {
  if (resources.pages.length > 0) {
    // Always update with selected resource if available
    if (resources.selectedPage) {
      setValue('facebookPage', resources.selectedPage.id, { shouldValidate: true });
    } else if (!watch('facebookPage') || watch('facebookPage') === '') {
      setValue('facebookPage', resources.pages[0].id);
    }
  }
}, [resources]); // Remove watch dependency
```

### FIX 3: Remove/Update Default Values

#### File: `/frontend/src/components/Strategy150/Phase1Setup/Phase1Setup.tsx`

**Lines 24-96 (UPDATE defaults):**
```javascript
// BEFORE:
const methods = useForm<Strategy150FormData>({
  defaultValues: {
    campaignBudget: {
      dailyBudget: 50, // Remove this default
    },
    adSetBudget: {
      dailyBudget: 50, // Remove this default
    },
    pixel: '', // Keep empty
    facebookPage: '', // Keep empty
  }
});

// AFTER:
const methods = useForm<Strategy150FormData>({
  defaultValues: {
    campaignBudget: {
      dailyBudget: undefined, // Let user set it
    },
    adSetBudget: {
      dailyBudget: undefined, // Let user set it
    },
    pixel: '', // Will be set by resource selection
    facebookPage: '', // Will be set by resource selection
  }
});
```

### FIX 4: Campaign Budget Optimization Mapping

#### File: `/frontend/src/components/Strategy150/Strategy150Container.tsx`

**Add CBO budget extraction (around line 300):**
```javascript
// Add extraction of CBO budget when budgetLevel is 'campaign'
if (workingCampaignData.budgetLevel === 'campaign' && workingCampaignData.campaignBudget) {
  // Ensure CBO budget is at root level for backend
  if (workingCampaignData.campaignBudget.dailyBudget) {
    formData.set('dailyBudget', String(workingCampaignData.campaignBudget.dailyBudget));
  }
  if (workingCampaignData.campaignBudget.lifetimeBudget) {
    formData.set('lifetimeBudget', String(workingCampaignData.campaignBudget.lifetimeBudget));
  }
}
```

### FIX 5: Add Resource Refresh on Switch

#### File: `/frontend/src/components/Strategy150/Phase1Setup/Phase1Setup.tsx`

**Add resource refresh hook:**
```javascript
// Add after line 22
import { useFacebookResources } from '../../../hooks/useFacebookResources';

// Inside component (after line 96):
const { resources, refetch } = useFacebookResources();

// Listen for resource changes
useEffect(() => {
  const handleResourceSwitch = () => {
    refetch(); // Refresh resources when switched
  };

  // Listen for custom event when resources are switched
  window.addEventListener('resourcesSwitched', handleResourceSwitch);
  return () => window.removeEventListener('resourcesSwitched', handleResourceSwitch);
}, [refetch]);
```

## Testing Checklist

After implementing fixes, test:

1. **Budget Conversion**:
   - [ ] Enter $50 daily budget at CBO level
   - [ ] Verify Facebook receives exactly $50 (not $5000)
   - [ ] Test with ad set level budget

2. **Resource Selection**:
   - [ ] Select specific page/pixel/ad account
   - [ ] Verify they appear in form
   - [ ] Switch resources and verify update

3. **Form Persistence**:
   - [ ] Fill form partially
   - [ ] Switch resources
   - [ ] Verify form retains values

4. **CBO Budget**:
   - [ ] Set campaign-level budget
   - [ ] Verify it's used (not ad set budget)

## Implementation Order

1. **FIRST**: Fix budget conversion (highest priority - losing money!)
2. **SECOND**: Fix resource selection (usability issue)
3. **THIRD**: Fix form defaults (user experience)
4. **FOURTH**: Fix CBO mapping (functionality)
5. **FIFTH**: Add resource refresh (enhancement)

## Validation

Run these console checks:

```javascript
// In browser console after form submit:
// Check FormData being sent
const formData = new FormData();
// ... after population
for (let [key, value] of formData.entries()) {
  console.log(key, value);
}

// Backend logging in strategy150.js:
console.log('Raw budget from frontend:', req.body.dailyBudget);
console.log('Parsed budget:', parseBudget(req.body.dailyBudget));
console.log('Sent to Facebook:', campaignData.dailyBudget);
```

## Summary

The main issues are:
1. **Triple conversion**: Frontend → Backend → FacebookAPI (each multiplying/dividing)
2. **Static defaults** preventing dynamic resource updates
3. **Wrong conditions** in useEffect hooks
4. **Missing CBO budget** mapping

These fixes will:
- Send correct budget amounts to Facebook
- Use selected resources properly
- Maintain user selections
- Support both CBO and ad set budgets correctly