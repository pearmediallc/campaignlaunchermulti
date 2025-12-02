# Rate Limit Management System - Setup Guide

## Overview

The rate limit management system has been implemented to handle Facebook API rate limits intelligently:
- **System Users** for internal ad accounts (your 14 Business Managers) = 10x capacity
- **Request Queue** for OAuth users when rate limited = automatic retry
- **Background Processor** runs every minute to process queued requests

## What Has Been Implemented

### ✅ Backend Components Created

1. **Database Migrations**
   - `backend/migrations/20251128000001-create-rate-limit-tables.js`
   - Creates 4 tables: `system_users`, `rate_limit_tracker`, `request_queue`, `internal_ad_accounts`

2. **Models**
   - `backend/models/SystemUser.js` - System User token management
   - `backend/models/RateLimitTracker.js` - Per-user rate limit tracking
   - `backend/models/RequestQueue.js` - Queued requests storage
   - `backend/models/InternalAdAccount.js` - Whitelist of internal accounts

3. **Services**
   - `backend/services/SystemUserManager.js` - System User token rotation
   - `backend/services/RateLimitService.js` - Rate limit tracking & queueing
   - `backend/services/QueueProcessor.js` - Background processor (auto-starts)

4. **Middleware**
   - `backend/middleware/rateLimitHandler.js` - Rate limit detection & routing

5. **Routes**
   - `backend/routes/rateLimitManagement.js` - Admin endpoints for management

6. **Server Integration**
   - Queue processor auto-starts on server startup
   - New admin routes registered at `/api/rate-limit/*`

---

## Manual Setup Steps Required

### Step 1: Run Database Migrations

```bash
cd /Users/mac/Desktop/campaignlaunchermulti/backend
npx sequelize-cli db:migrate
```

This will create the required database tables.

---

### Step 2: Add Your System Users (Optional but Recommended)

You need to manually add System User tokens for your 14 Business Managers. This can be done via API or directly in the database.

**Option A: Using API (Recommended)**

```bash
# Example: Add a System User
curl -X POST http://localhost:5000/api/rate-limit/system-users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "System User 1",
    "systemUserId": "FACEBOOK_SYSTEM_USER_ID",
    "accessToken": "SYSTEM_USER_ACCESS_TOKEN",
    "businessManagerId": "BUSINESS_MANAGER_ID"
  }'
```

**Option B: Direct Database Insert**

```sql
INSERT INTO system_users (name, system_user_id, access_token, business_manager_id, is_active, created_at, updated_at)
VALUES
  ('System User 1', 'FB_SYSTEM_USER_ID_1', 'ENCRYPTED_TOKEN_1', 'BM_ID_1', true, NOW(), NOW()),
  ('System User 2', 'FB_SYSTEM_USER_ID_2', 'ENCRYPTED_TOKEN_2', 'BM_ID_2', true, NOW(), NOW());
-- Repeat for all 10 System Users
```

**Note:** Tokens are automatically encrypted when saved through the model.

---

### Step 3: Whitelist Your Internal Ad Accounts

Add all ad accounts from your 14 Business Managers to the `internal_ad_accounts` table:

**Using API:**

```bash
curl -X POST http://localhost:5000/api/rate-limit/internal-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "adAccountId": "act_123456789",
    "businessManagerId": "BUSINESS_MANAGER_ID",
    "businessManagerName": "BM Name (Optional)"
  }'
```

**Or via Database:**

```sql
INSERT INTO internal_ad_accounts (ad_account_id, business_manager_id, business_manager_name, use_system_users, is_active, created_at, updated_at)
VALUES
  ('act_123456789', 'BM_ID_1', 'Business Manager 1', true, true, NOW(), NOW()),
  ('act_987654321', 'BM_ID_1', 'Business Manager 1', true, true, NOW(), NOW());
-- Add all your internal accounts
```

---

### Step 4: Integrate Middleware into Campaign Routes (IMPORTANT)

**You need to manually add the rate limit middleware to your campaign creation endpoints.**

#### Example: Strategy 1-50-1 Route

Edit `/Users/mac/Desktop/campaignlaunchermulti/backend/routes/strategy150.js`:

```javascript
const { rateLimitHandler, updateRateLimitFromResponse } = require('../middleware/rateLimitHandler');

// Add middleware to duplicate endpoint
router.post('/duplicate',
  authenticate,
  requireFacebookAuth,
  rateLimitHandler,  // ← ADD THIS
  updateRateLimitFromResponse,  // ← ADD THIS
  async (req, res) => {
    // ... existing code
  }
);
```

#### Apply to These Routes:

1. `/backend/routes/strategy150.js` - Strategy 1-50-1
2. `/backend/routes/strategyForAll.js` - Strategy for All
3. `/backend/routes/strategyForAds.js` - Strategy for Ads
4. `/backend/routes/campaigns.js` - General campaigns
5. Any other routes that create Facebook campaigns/ad sets/ads

**Pattern:**
```javascript
router.post('/your-endpoint',
  authenticate,
  rateLimitHandler,           // Check rate limit & decide token
  updateRateLimitFromResponse, // Update tracking from response
  async (req, res) => {
    // Your existing logic here

    // If using System User (internal account):
    if (req.useSystemUser) {
      const accessToken = req.systemUserToken;
      // Use this token instead of user's OAuth token
    }
  }
);
```

---

### Step 5: Update FacebookAPI Calls to Use System User Token

When a request has `req.useSystemUser === true`, you should use `req.systemUserToken` instead of the user's OAuth token:

```javascript
// In your route handler
const accessToken = req.useSystemUser ? req.systemUserToken : userOAuthToken;

const facebookApi = new FacebookAPI({
  accessToken,  // Will be System User token for internal accounts
  adAccountId,
  pageId,
  pixelId
});

// Make Facebook API call
const result = await facebookApi.createCampaign(campaignData);

// Store Facebook response headers for rate limit tracking
res.locals.facebookHeaders = result.headers || {};
```

---

### Step 6: Handle Queued Responses in Frontend

When the backend returns status `202` with `status: 'queued'`, update your frontend to show a friendly message:

```javascript
// Frontend axios call
try {
  const response = await axios.post('/api/campaigns/strategy-150/duplicate', data);

  if (response.status === 202 && response.data.status === 'queued') {
    // Show queue notification
    showNotification({
      type: 'info',
      title: 'Campaign Queued',
      message: `Your campaign has been queued due to rate limits. It will be processed in approximately ${response.data.queue.estimatedWaitMinutes} minutes. You'll be notified when complete.`,
      queueId: response.data.queue.queueId
    });
  } else {
    // Normal success
    showNotification({
      type: 'success',
      title: 'Campaign Created',
      message: 'Your campaign was created successfully!'
    });
  }
} catch (error) {
  // Handle error
}
```

---

### Step 7: Add Frontend Queue Status Component (Optional)

Create a component to show user's queued requests:

```jsx
// Example component
import { useEffect, useState } from 'react';
import axios from 'axios';

function QueuedRequests() {
  const [queuedItems, setQueuedItems] = useState([]);

  useEffect(() => {
    const fetchQueued = async () => {
      const { data } = await axios.get('/api/rate-limit/queue/my-requests');
      setQueuedItems(data.requests);
    };

    fetchQueued();
    const interval = setInterval(fetchQueued, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>Queued Requests ({queuedItems.length})</h3>
      {queuedItems.map(item => (
        <div key={item.id}>
          <p>{item.actionType} - {item.status}</p>
          <p>Processing in {item.estimatedWaitMinutes} minutes</p>
        </div>
      ))}
    </div>
  );
}
```

---

## API Endpoints Available

### User Endpoints (Authenticated)

- `GET /api/rate-limit/queue/my-requests` - Get your queued requests
- `GET /api/rate-limit/rate-limit/status?adAccountId=act_123` - Check your rate limit status

### Admin Endpoints (Requires `manage_system` permission)

- `GET /api/rate-limit/system-users/status` - View all System Users and their usage
- `POST /api/rate-limit/system-users` - Add a new System User
- `POST /api/rate-limit/internal-accounts` - Add an internal ad account
- `GET /api/rate-limit/queue/all?page=1&limit=20&status=queued` - View all queued requests

---

## How It Works

### For Internal Accounts (Your 14 BMs)

1. User creates campaign for internal ad account
2. Middleware detects account is in `internal_ad_accounts` table
3. Gets available System User token (load balanced)
4. Uses System User token instead of user's OAuth token
5. Much higher capacity (10 System Users × 200/hr = 2000/hr)

### For External Accounts (Random OAuth Users)

1. User creates campaign for external ad account
2. Middleware checks user's rate limit status
3. If under 80% usage → proceed immediately
4. If over 80% usage → queue request
5. Background processor runs every minute
6. When rate limit resets → processes queued request
7. User gets notified (you need to implement notification system)

---

## Testing the Implementation

### 1. Test System User Selection

```bash
# Check System Users status
curl -X GET http://localhost:5000/api/rate-limit/system-users/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. Test Queue

```bash
# Manually check user's queue
curl -X GET http://localhost:5000/api/rate-limit/queue/my-requests \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### 3. Test Rate Limit

```bash
# Check rate limit status
curl -X GET "http://localhost:5000/api/rate-limit/rate-limit/status?adAccountId=act_123456789" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

## Environment Variables

Make sure you have `ENCRYPTION_KEY` in your `.env` file (already exists from FacebookAuth):

```env
ENCRYPTION_KEY=your_32_byte_hex_key_here
```

---

## Monitoring

### Check Queue Processor Logs

```bash
# Look for these in your server logs:
[Queue Processor] Processing X queued requests
[Queue Processor] Request 123 completed successfully
```

### Monitor Database

```sql
-- Check queued requests
SELECT * FROM request_queue WHERE status = 'queued';

-- Check System Users usage
SELECT name, rate_limit_used, rate_limit_reset_at FROM system_users WHERE is_active = true;

-- Check rate limit tracking
SELECT user_id, ad_account_id, calls_used, calls_limit, usage_percentage
FROM rate_limit_tracker
WHERE window_reset_at > NOW();
```

---

## Troubleshooting

### Queue Not Processing

- Check server logs for queue processor startup
- Verify `QueueProcessor.start()` is called in `server.js`
- Check if requests have `processAfter` in the future

### System Users Not Working

- Verify System Users are in database with `is_active = true`
- Check tokens are not expired
- Verify ad accounts are in `internal_ad_accounts` table

### Rate Limit Not Tracking

- Check if `updateRateLimitFromResponse` middleware is applied
- Verify Facebook response headers are being captured
- Check `rate_limit_tracker` table for entries

---

## Next Steps (Optional Enhancements)

1. **Notification System**: Implement WebSocket or email notifications when queued requests complete
2. **Frontend Queue Dashboard**: Build a UI to show queued requests
3. **Rate Limit Analytics**: Add charts showing rate limit usage over time
4. **Priority Queue**: Allow premium users to have higher priority
5. **Webhook Callbacks**: Allow users to provide webhook URLs for completion notifications

---

## Summary of What You Need to Do

### Required:
1. ✅ Run migrations (`npx sequelize-cli db:migrate`)
2. ✅ Add System Users via API or database
3. ✅ Add internal ad accounts via API or database
4. ✅ Integrate `rateLimitHandler` middleware into campaign routes
5. ✅ Update route handlers to use `req.systemUserToken` when available
6. ✅ Handle 202 status responses in frontend

### Optional:
7. ⚠️ Build frontend queue status component
8. ⚠️ Implement notification system for completed requests
9. ⚠️ Add admin dashboard for monitoring

The core system is functional and will start working once you complete steps 1-6!
