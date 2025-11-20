# Database Migration Guide

## ⚠️ IMPORTANT: Your app uses Render's PostgreSQL in production

### Option 1: Run Migration via Render Shell (RECOMMENDED)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your **backend service**
3. Click the **"Shell"** tab
4. Run these commands:
   ```bash
   cd /opt/render/project/src/backend
   npx sequelize-cli db:migrate
   ```
5. Verify:
   ```bash
   npx sequelize-cli db:migrate:status
   ```
   Should show: "up" next to `20251120000001-create-failed-entities.js`

### Option 2: Auto-run on Next Deploy

I'll add the migration to run automatically on deploy.

### What This Migration Does:

Creates the `FailedEntities` table with columns:
- id, userId, campaignId, campaignName
- adsetId, adsetName, adId, adName
- entityType, failureReason, userFriendlyReason
- errorCode, facebookError (JSON)
- retryCount, status, strategyType
- metadata (JSON), recoveredAt
- createdAt, updatedAt

### After Migration:

The failure tracking system will automatically:
1. Track all campaign creation failures
2. Show them in the universal floating badge
3. Allow manual retry from UI
4. Display user-friendly error messages
