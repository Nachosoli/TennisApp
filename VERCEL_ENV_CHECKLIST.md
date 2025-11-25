# Vercel Environment Variables Checklist

## Required Environment Variables

Add these in **Vercel Dashboard → Settings → Environment Variables**:

### 1. **NEXT_PUBLIC_API_URL** (REQUIRED)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api/v1
```
- **Critical**: Must be your actual backend API URL
- Must use `https://` (not `http://`)
- Must include `/api/v1` at the end
- **Example**: `https://api.courtmate.com/api/v1` or `https://your-backend.railway.app/api/v1`

### 2. **NEXT_PUBLIC_WS_URL** (REQUIRED)
```
NEXT_PUBLIC_WS_URL=wss://your-backend-url.com
```
- **Critical**: Must be your actual backend WebSocket URL
- Must use `wss://` (secure WebSocket, not `ws://`)
- Should NOT include `/api/v1` or any path
- **Example**: `wss://api.courtmate.com` or `wss://your-backend.railway.app`

### 3. **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY** (REQUIRED)
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBvnXZupi70e61FtH9aDgnQ0qwqBsbIe18
```
- Your Google Maps API key
- Used for maps, place autocomplete, and geocoding

### 4. **NEXT_PUBLIC_VAPID_PUBLIC_KEY** (OPTIONAL)
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```
- Only needed if you're using push notifications
- Can be left empty if not using PWA push notifications

## Environment Configuration

### Set for All Environments
When adding variables in Vercel, make sure to select:
- ✅ **Production**
- ✅ **Preview** 
- ✅ **Development**

### After Adding Variables
1. **Redeploy** your application (variables are only available after redeploy)
2. Go to **Deployments** tab
3. Click **⋯** on latest deployment
4. Click **Redeploy**

## Common Issues & Solutions

### Issue: 500 Internal Server Error / FUNCTION_INVOCATION_FAILED

**Possible Causes:**

1. **Missing or Incorrect API URL**
   - ❌ `http://localhost:3001/api/v1` (won't work in production)
   - ❌ `https://your-backend.com` (missing `/api/v1`)
   - ✅ `https://your-backend.com/api/v1`

2. **Missing or Incorrect WebSocket URL**
   - ❌ `ws://localhost:3001` (not secure, won't work)
   - ❌ `wss://your-backend.com/api/v1` (shouldn't include path)
   - ✅ `wss://your-backend.com`

3. **Backend Not Accessible**
   - Verify your backend is deployed and accessible
   - Test the API URL in browser: `https://your-backend.com/api/v1/health`
   - Check CORS settings on backend allow your Vercel domain

4. **Environment Variables Not Applied**
   - Variables only apply to NEW deployments
   - Must redeploy after adding/changing variables

### Issue: API Connection Errors

**Check:**
1. Backend is running and accessible
2. CORS is configured to allow your Vercel domain
3. API URL uses `https://` (not `http://`)
4. Backend URL is correct (no typos)

### Issue: WebSocket Connection Fails

**Check:**
1. WebSocket URL uses `wss://` (secure)
2. Backend supports secure WebSocket connections
3. Backend WebSocket is accessible from internet
4. No firewall blocking WebSocket connections

## Verification Steps

### 1. Check Environment Variables in Vercel
- Go to **Settings → Environment Variables**
- Verify all required variables are set
- Check they're enabled for **Production**

### 2. Check Build Logs
- Go to **Deployments** tab
- Click on latest deployment
- Check **Build Logs** for any errors
- Look for environment variable warnings

### 3. Check Function Logs
- Go to **Deployments** tab
- Click on latest deployment
- Go to **Functions** tab
- Check for runtime errors

### 4. Test API Connection
- Open browser console on your Vercel site
- Check for API connection errors
- Verify API calls are going to correct URL

## Quick Setup Script

Copy and paste these into Vercel Dashboard:

```
NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_URL/api/v1
NEXT_PUBLIC_WS_URL=wss://YOUR_BACKEND_URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBvnXZupi70e61FtH9aDgnQ0qwqBsbIe18
```

**Replace `YOUR_BACKEND_URL` with your actual backend URL!**

## Backend Requirements

Your backend must:
1. ✅ Be deployed and accessible via HTTPS
2. ✅ Support CORS for your Vercel domain
3. ✅ Support secure WebSocket (WSS) connections
4. ✅ Have `/api/v1/health` endpoint (for health checks)

## Need Help?

1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify backend is accessible
4. Test API endpoints directly

