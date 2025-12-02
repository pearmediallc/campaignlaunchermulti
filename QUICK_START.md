# Rate Limit System - Quick Start Guide

## 🚀 Fast Setup (5 Steps)

### 1. Run Migrations (2 minutes)
```bash
cd /Users/mac/Desktop/campaignlaunchermulti/backend
npx sequelize-cli db:migrate
```

### 2. Add System Users (10 minutes)

Get System User tokens from Facebook Business Manager, then:

```bash
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

Repeat for all 10 System Users.

### 3. Whitelist Internal Accounts (5 minutes)

```bash
curl -X POST http://localhost:5000/api/rate-limit/internal-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "adAccountId": "act_123456789",
    "businessManagerId": "BUSINESS_MANAGER_ID",
    "businessManagerName": "My Business Manager"
  }'
```

Repeat for all ad accounts in your 14 BMs.

### 4. Add Middleware (10 minutes)

Edit `/backend/routes/strategy150.js` (and other campaign routes):

```javascript
// Add at top
const { rateLimitHandler, updateRateLimitFromResponse } = require('../middleware/rateLimitHandler');

// Add to your route
router.post('/duplicate',
  authenticate,
  requireFacebookAuth,
  rateLimitHandler,              // ← ADD THIS
  updateRateLimitFromResponse,   // ← ADD THIS
  async (req, res) => {
    // Get the right token
    const accessToken = req.useSystemUser 
      ? req.systemUserToken 
      : userOAuthToken;

    // Use it for Facebook API
    const facebookApi = new FacebookAPI({ accessToken, ... });
    
    // ... rest of your code
  }
);
```

### 5. Handle Frontend Response (5 minutes)

```javascript
// In your frontend API call
if (response.status === 202 && response.data.status === 'queued') {
  showNotification({
    type: 'info',
    message: `Queued due to rate limit. Processing in ${response.data.queue.estimatedWaitMinutes} minutes.`
  });
} else {
  showNotification({ type: 'success', message: 'Created successfully!' });
}
```

## ✅ Verify It Works

1. Create campaign for internal account → Should use System User
2. Create 200 campaigns for external account → 201st should queue
3. Wait 1 minute → Queued request should process automatically
4. Check logs: `[Queue Processor] Processing X queued requests`

## 📖 Full Documentation

- **Complete Setup**: See `RATE_LIMIT_SETUP_GUIDE.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`

Done! 🎉
