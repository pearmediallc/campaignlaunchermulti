# Deploy to Render - Step by Step Guide

## ✅ Tested Configuration (Based on Working `campaignlauncher` Deployment)

Follow these EXACT steps to deploy successfully:

---

## 📋 Step-by-Step Instructions

### **1. Go to Render Dashboard**
- Visit: https://dashboard.render.com/
- Click **"New +"** → **"Web Service"**

### **2. Connect GitHub Repository**
- Repository: `pearmediallc/campaignlaunchermulti`
- Branch: `main`
- Click **"Connect"**

### **3. Configure Service (EXACT SETTINGS)**

| Setting | Value |
|---------|-------|
| **Name** | `fb-campaign-launcher-multi` (or your preferred name) |
| **Region** | `Oregon (US West)` (or closest to you) |
| **Branch** | `main` |
| **Runtime** | **`Node`** ⚠️ MUST be Node, NOT Docker |
| **Build Command** | `cd fb-campaign-launcher/frontend && npm install && npm run build && cd ../backend && npm install` |
| **Start Command** | `cd fb-campaign-launcher/backend && node server.js` |
| **Instance Type** | `Free` or `Starter` |

⚠️ **IMPORTANT:** Make sure "Runtime" shows **"Node"** - if it says "Docker", change it!

---

### **4. Environment Variables**

Click **"Advanced"** → Scroll down to **"Environment Variables"**

Add these EXACT variables (copy from your Render dashboard):

```bash
# Node Environment
NODE_ENV=production
PORT=10000

# Database Configuration
DATABASE_URL=postgresql://campaignlaunch_user:Jmsu7KZxS2Vbyia8jKc171I3sHcrkDdF@dpg-d2k7ik6mcj7s73a0svkg-a.oregon-postgres.render.com/campaignlaunch
DB_HOST=dpg-d2k7ik6mcj7s73a0svkg-a.oregon-postgres.render.com
DB_NAME=campaignlaunch
DB_USER=campaignlaunch_user
DB_PASSWORD=Jmsu7KZxS2Vbyia8jKc171I3sHcrkDdF

# Facebook App Configuration
FB_APP_ID=735375959485927
FB_APP_SECRET=33e916d787ac0bea476ef946f56207b2
FB_API_VERSION=v18.0
FB_REDIRECT_URI=https://campaignlaunchermulti.onrender.com/api/auth/facebook/callback

# Frontend & Backend URLs
FRONTEND_URL=https://campaignlaunchermulti.onrender.com
BACKEND_URL=https://campaignlaunchermulti.onrender.com
CORS_ORIGIN=https://campaignlaunchermulti.onrender.com

# Security Keys
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
JWT_SECRET=Ao2Z4tdB80IVODQk/kd0YKyyPrRmZft+3ZXQqbicVsk=
JWT_EXPIRES_IN=7d
SESSION_SECRET=your_super_secret_session_key_change_this_in_production

# Eligibility Settings
ELIGIBILITY_VALIDITY_DAYS=30
MIN_ACCOUNT_AGE_DAYS=30
REQUIRE_SPENDING_HISTORY=false
REQUIRE_PAYMENT_METHOD=true
MIN_AD_ACCOUNTS=1
CHECK_BUSINESS_VERIFICATION=false
```

---

### **5. Create Web Service**

Click **"Create Web Service"**

Render will:
1. Clone your repository
2. Run the build command
3. Install dependencies
4. Build the React frontend
5. Start the Node.js backend

---

## 🎯 Expected Build Output

You should see:

```
==> Cloning from https://github.com/pearmediallc/campaignlaunchermulti...
==> Checking out commit...
==> Using Node version 18.x (or 20.x)
==> Running build command: cd fb-campaign-launcher/frontend && npm install...
==> Frontend build complete
==> Installing backend dependencies...
==> Build successful!
==> Starting server: cd fb-campaign-launcher/backend && node server.js
==> Your service is live at https://campaignlaunchermulti.onrender.com
```

---

## ✅ Post-Deployment Checklist

### **1. Test the Deployment**
- Visit: https://campaignlaunchermulti.onrender.com
- You should see the Campaign Launcher login page

### **2. Update Facebook App Settings**
Go to https://developers.facebook.com/apps/735375959485927/

**Add to Facebook Login → Settings → Valid OAuth Redirect URIs:**
```
https://campaignlaunchermulti.onrender.com/api/auth/facebook/callback
```

**Add to App Domains:**
```
campaignlaunchermulti.onrender.com
```

Click **Save Changes**

### **3. Test Login**
- Go to https://campaignlaunchermulti.onrender.com
- Click "Login with Facebook"
- Should redirect to Facebook and back successfully

---

## 🐛 Troubleshooting

### ❌ Error: "failed to read dockerfile"
**Cause:** Runtime is set to "Docker" instead of "Node"

**Fix:**
1. Delete the web service
2. Create new one
3. Make SURE "Runtime" is set to **"Node"**

### ❌ Error: "npm: command not found" or "node: command not found"
**Cause:** Runtime not set to Node

**Fix:** Ensure Runtime = "Node" in service settings

### ❌ Error: "Cannot find module"
**Cause:** Build command not running correctly

**Fix:** Verify build command EXACTLY matches:
```
cd fb-campaign-launcher/frontend && npm install && npm run build && cd ../backend && npm install
```

### ❌ Error: "ENOENT: no such file or directory"
**Cause:** Start command path is wrong

**Fix:** Verify start command EXACTLY matches:
```
cd fb-campaign-launcher/backend && node server.js
```

### ❌ Build succeeds but site doesn't load
**Cause:** Missing environment variables

**Fix:** Double-check ALL environment variables are added

---

## 📊 Monitoring

**Check Logs:**
1. Go to your service in Render dashboard
2. Click "Logs" tab
3. Look for any errors

**Check Events:**
- Click "Events" tab to see deployment history

---

## 🔄 Redeploying

To redeploy after code changes:
1. Push to GitHub (main branch)
2. Render auto-deploys
3. Or click "Manual Deploy" → "Deploy latest commit"

---

## 📞 Success Criteria

✅ Build completes without errors
✅ Service shows "Live" status (green)
✅ Can access https://campaignlaunchermulti.onrender.com
✅ Facebook login works
✅ Can select ad account, page, pixel
✅ Can create campaigns

---

**Last Updated:** October 2025
**Repository:** https://github.com/pearmediallc/campaignlaunchermulti
**Working Example:** https://campaignlauncher.onrender.com (deployed the same way)
