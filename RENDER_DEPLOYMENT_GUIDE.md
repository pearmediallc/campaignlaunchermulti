# Render Deployment Guide for Campaign Launcher Multi

## 🚨 IMPORTANT: Fixing the Dockerfile Error

If you're getting the error:
```
error: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

This means Render is trying to use Docker instead of Node.js. Follow the steps below to fix it.

---

## ✅ Deployment Instructions

### **Method 1: Deploy as Blueprint (RECOMMENDED)**

This is the easiest method and uses the `render.yaml` file automatically.

1. **Go to Render Dashboard:** https://dashboard.render.com/

2. **Click "New +" → "Blueprint"**
   - NOT "Web Service" - must be "Blueprint"

3. **Connect Repository:**
   - Select: `pearmediallc/campaignlaunchermulti`
   - Branch: `main`

4. **Render will detect `render.yaml` automatically**
   - Review the configuration
   - Click **"Apply"**

5. **Render will create the service automatically** using the settings from `render.yaml`

---

### **Method 2: Manual Web Service Setup**

If Blueprint doesn't work, create a manual web service:

1. **Go to Render Dashboard:** https://dashboard.render.com/

2. **Click "New +" → "Web Service"**

3. **Connect Repository:**
   - Repository: `pearmediallc/campaignlaunchermulti`
   - Branch: `main`

4. **Configure Service Settings:**

   | Setting | Value |
   |---------|-------|
   | **Name** | `fb-campaign-launcher` |
   | **Region** | Choose closest to your users |
   | **Runtime** | `Node` |
   | **Root Directory** | `fb-campaign-launcher` |
   | **Build Command** | `cd frontend && npm install && npm run build && cd ../backend && npm install` |
   | **Start Command** | `cd backend && node server.js` |
   | **Instance Type** | Free or Starter |

5. **Add Environment Variables:**

   Click "Advanced" → "Add Environment Variable" and add these:

   ```bash
   NODE_ENV=production
   PORT=10000

   # Database (from your Render dashboard - you showed these earlier)
   DATABASE_URL=postgresql://campaignlaunch_user:Jmsu7KZxS2Vbyia8jKc171I3sHcrkDdF@dpg-d2k7ik6mcj7s73a0svkg-a.oregon-postgres.render.com/campaignlaunch
   DB_HOST=dpg-d2k7ik6mcj7s73a0svkg-a.oregon-postgres.render.com
   DB_NAME=campaignlaunch
   DB_USER=campaignlaunch_user
   DB_PASSWORD=Jmsu7KZxS2Vbyia8jKc171I3sHcrkDdF

   # Facebook App (from your .env file)
   FB_APP_ID=735375959485927
   FB_APP_SECRET=33e916d787ac0bea476ef946f56207b2
   FB_API_VERSION=v18.0
   FB_REDIRECT_URI=https://campaignlaunchermulti.onrender.com/api/auth/facebook/callback

   # Frontend & CORS
   FRONTEND_URL=https://campaignlaunchermulti.onrender.com
   CORS_ORIGIN=https://campaignlaunchermulti.onrender.com
   BACKEND_URL=https://campaignlaunchermulti.onrender.com

   # Security (from your .env file)
   ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
   JWT_SECRET=Ao2Z4tdB80IVODQk/kd0YKyyPrRmZft+3ZXQqbicVsk=
   JWT_EXPIRES_IN=7d
   SESSION_SECRET=your_super_secret_session_key_change_this_in_production

   # Eligibility Configuration
   ELIGIBILITY_VALIDITY_DAYS=30
   MIN_ACCOUNT_AGE_DAYS=30
   REQUIRE_SPENDING_HISTORY=false
   REQUIRE_PAYMENT_METHOD=true
   MIN_AD_ACCOUNTS=1
   CHECK_BUSINESS_VERIFICATION=false
   ```

6. **Click "Create Web Service"**

---

## 📋 Post-Deployment Steps

### **1. Update Facebook App Settings**

After deployment, update your Facebook App with the new callback URL:

1. Go to: https://developers.facebook.com/apps/735375959485927/
2. Navigate to **Facebook Login → Settings**
3. Add to **Valid OAuth Redirect URIs:**
   ```
   https://campaignlaunchermulti.onrender.com/api/auth/facebook/callback
   ```
4. Add to **Allowed Domains:**
   ```
   campaignlaunchermulti.onrender.com
   ```
5. Click **Save Changes**

### **2. Test the Deployment**

Visit your app:
- **Frontend:** https://campaignlaunchermulti.onrender.com
- **API Health:** https://campaignlaunchermulti.onrender.com/api/health

### **3. Monitor Logs**

In Render Dashboard:
- Click on your service
- Go to **"Logs"** tab
- Watch for any errors during build/startup

---

## 🐛 Troubleshooting

### **Error: "failed to read dockerfile"**
- ✅ **Solution:** You're using the wrong deployment method. Use "Blueprint" NOT "Web Service"
- OR delete the service and recreate using Method 1 or Method 2 above

### **Error: "Module not found"**
- Check that `rootDir` is set to `fb-campaign-launcher`
- Check that build command includes `npm install` for both frontend and backend

### **Error: "Cannot connect to database"**
- Verify `DATABASE_URL` environment variable is correct
- Check that your PostgreSQL database is running on Render

### **Error: "Facebook authentication failed"**
- Verify `FB_REDIRECT_URI` matches exactly what's in Facebook App settings
- Check that `FB_APP_ID` and `FB_APP_SECRET` are correct

### **Build succeeds but app crashes**
- Check the **Logs** tab in Render
- Most common issue: Missing environment variables
- Verify `PORT=10000` is set

---

## 📊 Expected Build Output

When deployment is successful, you should see:

```
==> Cloning from https://github.com/pearmediallc/campaignlaunchermulti...
==> Checking out commit...
==> Using Node version 18.x
==> Running build command...
==> Installing frontend dependencies...
==> Building React app...
==> Installing backend dependencies...
==> Build complete!
==> Starting server...
==> Your service is live at https://campaignlaunchermulti.onrender.com
```

---

## 🔒 Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use Render's environment variables** - More secure than hardcoding
3. **Rotate secrets regularly** - Especially `JWT_SECRET` and `SESSION_SECRET`
4. **Enable HTTPS only** - Already configured in production

---

## 📞 Need Help?

If deployment still fails:
1. Check Render logs for specific error messages
2. Verify all environment variables are set
3. Make sure Facebook App settings are updated
4. Check that database is accessible

---

**Last Updated:** October 2025
**Repository:** https://github.com/pearmediallc/campaignlaunchermulti
**Live URL:** https://campaignlaunchermulti.onrender.com
