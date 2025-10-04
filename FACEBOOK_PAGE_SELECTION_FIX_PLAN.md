# Facebook Page Selection Issue - Analysis & Fix Plan

## Issue Identified
Even though "Tessa Blair" is selected in the resources panel, the form validation fails with "Facebook Page must be selected". The page value is not being properly passed from the form to the validation logic.

## Root Causes

### 1. **Race Condition in useEffect**
The `useEffect` in AdSection.tsx that sets the page value might be running after the form has already initialized, or the value isn't being properly registered in the form state.

### 2. **Form State Management Issue**
The React Hook Form might not be properly tracking the value set by `setValue` because of the way the dependencies are set up in the useEffect.

### 3. **Timing Issue**
The resources are loaded asynchronously, and the form might be ready before the resources are available, causing the setValue to not work correctly.

## The Fix Plan

### Fix 1: Ensure Default Value is Set
Add a default value to the Controller to ensure it has a value even before useEffect runs.

### Fix 2: Fix useEffect Dependencies
The useEffect has `watch` in its dependencies which creates a new function reference on every render, causing infinite loops or preventing the effect from running properly.

### Fix 3: Add Explicit Form Registration
Ensure the field is properly registered in the form before trying to set its value.

### Fix 4: Add Fallback in Validation
If the form data doesn't have the page but resources do, use the selected page from resources.

## Implementation

### Step 1: Fix the useEffect Dependencies and Logic
```javascript
// Remove watch from dependencies to prevent infinite loops
// Use a ref to track if we've already set the value
const pageSetRef = useRef(false);

useEffect(() => {
  if (resources.pages && resources.pages.length > 0 && !pageSetRef.current) {
    if (resources.selectedPage && resources.selectedPage.id) {
      setValue('facebookPage', resources.selectedPage.id, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      pageSetRef.current = true;
    } else if (!watch('facebookPage')) {
      setValue('facebookPage', resources.pages[0].id, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      pageSetRef.current = true;
    }
  }
}, [resources.pages, resources.selectedPage, setValue]);
```

### Step 2: Add Default Value to Controller
```javascript
<Controller
  name="facebookPage"
  control={control}
  defaultValue={resources.selectedPage?.id || ''}  // Add default value
  rules={{ required: 'Facebook Page is required' }}
  render={({ field, fieldState: { error } }) => (
    // ...
  )}
/>
```

### Step 3: Fix Validation Logic
Add fallback to use resources if form data is empty:
```javascript
// In Strategy150Container.tsx
const pageId = workingCampaignData.facebookPage ||
               data.facebookPage ||
               resources?.selectedPage?.id;

if (!pageId) {
  validationErrors.push('Facebook Page must be selected');
}
```

### Step 4: Ensure Form State Sync
Add a check to ensure the form has the value before submission:
```javascript
// Before form submission
if (!data.facebookPage && resources.selectedPage) {
  data.facebookPage = resources.selectedPage.id;
}
```

## Why This Will Work

1. **Removes Race Conditions**: By using a ref to track if we've set the value, we prevent multiple setValue calls
2. **Proper Dependencies**: Removing watch from dependencies prevents infinite loops
3. **Default Value**: Ensures the Controller has a value from the start
4. **Fallback Logic**: Even if form state fails, we can fall back to resources
5. **Explicit Sync**: Ensures the form data has the page before validation

## Testing Plan

1. Load the page fresh and check if page is auto-selected
2. Switch resources and verify the page updates
3. Submit the form and verify no validation error
4. Check console logs to verify the correct page ID is being used

This approach ensures that the Facebook Page selection works reliably regardless of loading order or timing issues.