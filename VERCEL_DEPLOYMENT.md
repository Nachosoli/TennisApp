# Vercel Deployment Guide

This guide covers deploying the CourtMate frontend to Vercel.

## Prerequisites

- ✅ Git repository linked to Vercel
- ✅ Vercel account connected to GitHub
- ✅ Backend API deployed and accessible (separate from Vercel)

## Configuration Files

### `vercel.json`
- Root directory: `frontend`
- Framework: Next.js
- Build command: `cd frontend && npm install && npm run build`

### `frontend/next.config.ts`
- Removed `output: 'standalone'` (Vercel handles output automatically)
- Environment variables configured via Vercel Dashboard

## Vercel Dashboard Setup

### 1. Project Settings

Go to **Settings → General** in your Vercel project:

- **Root Directory**: `frontend`
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (or leave default)
- **Output Directory**: `.next` (or leave default)
- **Install Command**: `npm install` (or leave default)

### 2. Environment Variables

Go to **Settings → Environment Variables** and add:

#### Required Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api/v1
NEXT_PUBLIC_WS_URL=wss://your-backend-url.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBvnXZupi70e61FtH9aDgnQ0qwqBsbIe18
```

#### Optional Variables:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

**Important Notes:**
- Replace `your-backend-url.com` with your actual backend deployment URL
- Use `https://` for API URL and `wss://` for WebSocket URL (secure)
- Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Set these for **Production**, **Preview**, and **Development** environments

### 3. Domain Configuration

- Vercel automatically provides a `.vercel.app` domain
- You can add a custom domain in **Settings → Domains**
- SSL certificates are automatically provisioned

## Deployment Process

### Automatic Deployment

Once configured, Vercel will automatically deploy:
- **Production**: On push to `main` branch
- **Preview**: On push to other branches or pull requests

### Manual Deployment

1. Go to **Deployments** tab in Vercel Dashboard
2. Click **Redeploy** on any deployment
3. Or use Vercel CLI: `vercel --prod`

## Backend Requirements

Your NestJS backend must be deployed separately. Options:

### Recommended Platforms:
- **Railway** (easy setup, good for NestJS)
- **Render** (free tier available)
- **Fly.io** (good performance)
- **AWS/GCP/Azure** (enterprise)
- **Your own server** (VPS, etc.)

### Backend Configuration:

1. **CORS**: Must allow your Vercel domain
   ```typescript
   CORS_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
   ```

2. **WebSocket**: Must support WSS (secure WebSocket) for production

3. **Environment Variables**: Backend needs:
   - Database connection (PostgreSQL)
   - Redis connection
   - JWT secrets
   - API keys (SendGrid, Twilio, Cloudinary, etc.)

## Post-Deployment Checklist

- [ ] Verify frontend loads at Vercel URL
- [ ] Test API connection (check browser console for errors)
- [ ] Test authentication (login/register)
- [ ] Test WebSocket connection (real-time features)
- [ ] Verify Google Maps loads correctly
- [ ] Test on mobile devices
- [ ] Check PWA functionality (if applicable)
- [ ] Monitor Vercel logs for errors

## Troubleshooting

### Build Fails

1. Check **Deployments** tab for error logs
2. Verify `vercel.json` configuration
3. Ensure `frontend/package.json` has correct build script
4. Check Node.js version compatibility (Vercel uses Node 18+ by default)

### API Connection Errors

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check backend CORS configuration
3. Verify backend is accessible from internet
4. Check browser console for CORS errors

### WebSocket Connection Fails

1. Verify `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
2. Check backend WebSocket configuration
3. Verify backend supports secure WebSocket connections

### Environment Variables Not Working

1. Ensure variables start with `NEXT_PUBLIC_` for client-side access
2. Redeploy after adding/changing environment variables
3. Check variable names match exactly (case-sensitive)

## Monitoring

- **Vercel Analytics**: Enable in project settings
- **Logs**: View in **Deployments** → Select deployment → **Functions** tab
- **Performance**: Check **Analytics** tab for Core Web Vitals

## Rollback

If deployment has issues:

1. Go to **Deployments** tab
2. Find previous working deployment
3. Click **⋯** → **Promote to Production**

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Next.js Deployment: https://nextjs.org/docs/deployment

