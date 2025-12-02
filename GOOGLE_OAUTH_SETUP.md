# Google OAuth Setup Guide

## Current Status
✅ **Code is implemented** - Google OAuth is fully integrated in both frontend and backend
❌ **Environment variables missing** - Need to configure Google OAuth credentials

## What's Already Done

1. ✅ Backend Google OAuth strategy (`backend/src/auth/strategies/google.strategy.ts`)
2. ✅ Backend OAuth routes (`/auth/google` and `/auth/google/callback`)
3. ✅ Frontend "Sign in with Google" button on login page
4. ✅ Frontend OAuth callback handler (`/auth/callback`)
5. ✅ User creation/update logic for OAuth users

## What You Need to Do

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or **Google Identity API**)
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen (if not done already)
6. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: **CourtBuddy** (or your app name)
   - Authorized JavaScript origins:
     - `http://localhost:3001` (for development)
     - Your production backend URL (for production)
   - Authorized redirect URIs:
     - `http://localhost:3001/api/v1/auth/google/callback` (for development)
     - `https://your-backend-domain.com/api/v1/auth/google/callback` (for production)
7. Copy the **Client ID** and **Client Secret**

### Step 2: Add Environment Variables to Backend

Add these to your `backend/.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3002
```

**Important Notes:**
- `FRONTEND_URL` should match your frontend dev server port (currently 3002)
- `GOOGLE_CALLBACK_URL` must match exactly what you configured in Google Console
- For production, update these URLs to your production domains

### Step 3: Restart Backend Server

After adding the environment variables, restart your backend:

```bash
cd backend
npm run start:dev
```

You should see in the logs:
```
🔵 [GoogleStrategy] Constructor called
🔵 [GoogleStrategy] Client ID: SET
🔵 [GoogleStrategy] Client Secret: SET
✅ [GoogleStrategy] Successfully initialized
```

If you see errors, check that the environment variables are set correctly.

### Step 4: Test Google OAuth

1. Start both frontend and backend servers
2. Go to `http://localhost:3002/auth/login`
3. You should see a **"Sign in with Google"** button
4. Click it - you should be redirected to Google's login page
5. After logging in with Google, you'll be redirected back to the app

## Troubleshooting

### "Sign in with Google" button doesn't appear
- ✅ **Fixed**: The button is in the code at `frontend/app/auth/login/page.tsx` (lines 149-180)
- If it's not showing, check browser console for errors
- Make sure you're on the `/auth/login` page

### Backend crashes on startup with Google OAuth error
- **Error**: `Google OAuth credentials are not configured`
- **Fix**: Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `backend/.env`
- Restart the backend server

### OAuth redirect fails
- **Check**: `GOOGLE_CALLBACK_URL` in `.env` matches Google Console settings
- **Check**: `FRONTEND_URL` matches your frontend port
- **Check**: Backend logs for specific error messages

### "redirect_uri_mismatch" error from Google
- The callback URL in your `.env` doesn't match what's in Google Console
- Update Google Console → Credentials → OAuth 2.0 Client ID → Authorized redirect URIs
- Make sure it includes: `http://localhost:3001/api/v1/auth/google/callback`

### User not created after OAuth login
- Check backend logs for errors during user creation
- Check database connection
- Verify `UserStats` table exists (created by migrations)

## Code Locations

- **Backend Strategy**: `backend/src/auth/strategies/google.strategy.ts`
- **Backend Routes**: `backend/src/auth/auth.controller.ts` (lines 136-167)
- **Frontend Button**: `frontend/app/auth/login/page.tsx` (lines 149-180)
- **Frontend Callback**: `frontend/app/auth/callback/page.tsx`

## Production Setup

For production, update these in your production environment:

```env
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback
FRONTEND_URL=https://yourdomain.com
```

And update Google Console with your production callback URL.

