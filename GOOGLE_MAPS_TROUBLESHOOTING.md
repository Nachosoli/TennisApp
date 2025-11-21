# Google Maps API Troubleshooting Guide

This document provides step-by-step instructions for diagnosing and fixing Google Maps API issues in the CourtMate application.

## Table of Contents

- [Problem Description](#problem-description)
- [Symptoms](#symptoms)
- [Diagnosis Steps](#diagnosis-steps)
- [Solution Steps](#solution-steps)
- [Verification Steps](#verification-steps)
- [Prevention Tips](#prevention-tips)
- [Related Files](#related-files)

---

## Problem Description

The Google Maps API may fail to load or display maps due to missing or incorrectly configured API keys in Next.js. This typically happens when:

1. The `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable is not properly exposed to the client-side code
2. The API key is missing from `next.config.ts` environment configuration
3. The `.next` cache contains stale environment variable data
4. The frontend container needs to be restarted after configuration changes

## Symptoms

### Common Symptoms:

- Maps do not display (blank area where map should be)
- Console shows: `[MatchesMap] API Key from env: MISSING`
- Console shows: `[MatchesMap] All NEXT_PUBLIC env vars: []`
- Error message: "Map failed to load" or "Map not available"
- `useLoadScript` reports `isLoaded: false` or `loadError` is set
- Google Maps API warnings in browser console

### What You'll See:

**In Browser Console:**
```
[MatchesMap] API Key from env: MISSING
[MatchesMap] All NEXT_PUBLIC env vars: []
[MatchesMap] useLoadScript state: {isLoaded: false, loadError: undefined}
```

**On Screen:**
- "Loading map..." message that never resolves
- "Map failed to load" error message
- "Map not available" message
- Blank/empty map area

---

## Diagnosis Steps

### Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Look for messages prefixed with `[MatchesMap]`, `[GoogleMap]`, or `[HomeCourtAutocomplete]`
4. Check if the API key is reported as "MISSING" or "Present"

### Step 2: Verify Environment Variable in Container

```bash
# Check if the environment variable is set in the container
docker-compose exec frontend printenv NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

**Expected Output:**
```
AIzaSyBvnXZupi70e61FtH9aDgnQ0qwqBsbIe18
```

**If empty or missing:** The environment variable is not set in docker-compose.yml

### Step 3: Check next.config.ts

Verify that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is in the `env` section:

```bash
# View the config file
cat frontend/next.config.ts
```

**Look for:**
```typescript
env: {
  NEXT_PUBLIC_API_URL: ...,
  NEXT_PUBLIC_WS_URL: ...,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: ...,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "fallback-key",
},
```

**If missing:** The API key is not being exposed to client-side code

### Step 4: Check .env.local File

```bash
# Check if .env.local exists and contains the API key
cat frontend/.env.local
```

**Expected Content:**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBvnXZupi70e61FtH9aDgnQ0qwqBsbIe18
```

### Step 5: Check Next.js Logs

```bash
# Check if Next.js detected the .env.local file
docker-compose logs frontend | grep -i "Environments"
```

**Expected Output:**
```
- Environments: .env.local
```

---

## Solution Steps

### Solution 1: Add API Key to next.config.ts (Primary Fix)

This is the most important fix. Next.js requires `NEXT_PUBLIC_*` variables to be explicitly listed in the `env` section of `next.config.ts` to be available in the browser.

**File:** `frontend/next.config.ts`

**Add this line to the `env` section:**

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBvnXZupi70e61FtH9aDgnQ0qwqBsbIe18",
  },
  // ... rest of config
};
```

**Important:** Always include a fallback value (the `|| "fallback-key"` part) to ensure the API key is available even if the environment variable isn't set.

### Solution 2: Clear Next.js Cache

After modifying `next.config.ts`, you must clear the `.next` cache:

**On Windows (PowerShell):**
```powershell
# Stop the frontend container
docker-compose stop frontend

# Clear the cache
Remove-Item -Recurse -Force frontend\.next

# Restart the frontend
docker-compose up -d frontend
```

**On Linux/Mac:**
```bash
# Stop the frontend container
docker-compose stop frontend

# Clear the cache
rm -rf frontend/.next

# Restart the frontend
docker-compose up -d frontend
```

### Solution 3: Restart Frontend Container

After making configuration changes, always restart the frontend:

```bash
docker-compose restart frontend
```

Wait 10-15 seconds for Next.js to fully start, then check logs:

```bash
docker-compose logs frontend --tail 20
```

**Look for:**
```
✓ Ready in XXXms
- Environments: .env.local
```

### Solution 4: Verify docker-compose.yml Configuration

Ensure the API key is set in `docker-compose.yml`:

**File:** `docker-compose.yml`

```yaml
frontend:
  environment:
    NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001/api/v1}
    NEXT_PUBLIC_WS_URL: ${NEXT_PUBLIC_WS_URL:-ws://localhost:3001}
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: AIzaSyBvnXZupi70e61FtH9aDgnQ0qwqBsbIe18
    PORT: 3000
    NODE_ENV: development
```

### Solution 5: Create/Update .env.local File

Create or update `frontend/.env.local`:

**File:** `frontend/.env.local`

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBvnXZupi70e61FtH9aDgnQ0qwqBsbIe18
```

**Note:** This file should be in `.gitignore` and not committed to version control.

---

## Verification Steps

### Step 1: Check Browser Console

1. Hard refresh your browser (`Ctrl + Shift + R` or `Cmd + Shift + R`)
2. Open Developer Tools (F12) → Console tab
3. Look for:

**Success Indicators:**
```
[MatchesMap] API Key from env: Present (AIzaSyBvnX...)
[MatchesMap] useLoadScript state: {isLoaded: true, loadError: undefined}
```

**Failure Indicators:**
```
[MatchesMap] API Key from env: MISSING
[MatchesMap] All NEXT_PUBLIC env vars: []
```

### Step 2: Verify Map Displays

1. Navigate to the Calendar page (`/calendar`)
2. Check if the map displays on the right side
3. Verify that court markers appear on the map
4. Click on markers to ensure InfoWindows work

### Step 3: Test Map Components

Test all components that use Google Maps:

- **Calendar Page** (`/calendar`) - Should show map with match markers
- **Profile Page** (`/profile`) - Home court autocomplete should work
- **Create Court Page** (`/courts/create`) - Court autocomplete should work
- **Create Match Page** (`/matches/create`) - Any map components should load

---

## Prevention Tips

### 1. Always Include Fallback Values

When adding `NEXT_PUBLIC_*` variables to `next.config.ts`, always include a fallback:

```typescript
// ✅ Good - Has fallback
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "fallback-key",

// ❌ Bad - No fallback, will be undefined if env var not set
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
```

### 2. Clear Cache After Config Changes

**Always clear the `.next` cache after modifying `next.config.ts`:**

```bash
# Windows
Remove-Item -Recurse -Force frontend\.next

# Linux/Mac
rm -rf frontend/.next
```

### 3. Restart Container After Changes

**Always restart the frontend container after configuration changes:**

```bash
docker-compose restart frontend
```

### 4. Check Logs After Restart

**Verify Next.js started correctly:**

```bash
docker-compose logs frontend --tail 20
```

Look for:
- `✓ Ready in XXXms`
- `- Environments: .env.local`

### 5. Version Control Considerations

**When restoring previous versions:**

- Check if `next.config.ts` includes the Google Maps API key
- Verify the `env` section has all required `NEXT_PUBLIC_*` variables
- Clear cache and restart after restoring

### 6. Document Configuration Changes

**When modifying environment configuration:**

- Update this troubleshooting guide if you discover new issues
- Document any new `NEXT_PUBLIC_*` variables added
- Note any special configuration requirements

---

## Related Files

### Configuration Files

- `frontend/next.config.ts` - **CRITICAL** - Must include API key in `env` section
- `docker-compose.yml` - Environment variables for containers
- `frontend/.env.local` - Local environment variables (not in git)

### Component Files Using Google Maps

- `frontend/src/components/MatchesMap.tsx` - Main map component for calendar
- `frontend/src/components/GoogleMap.tsx` - Generic map component
- `frontend/src/components/HomeCourtAutocomplete.tsx` - Home court selection
- `frontend/src/components/ui/CourtAutocomplete.tsx` - Court autocomplete
- `frontend/app/profile/page.tsx` - Profile page with map
- `frontend/app/courts/create/page.tsx` - Court creation with map

### How Components Access the API Key

All components access the API key the same way:

```typescript
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
```

This will only work if:
1. The variable is listed in `next.config.ts` `env` section
2. The `.next` cache has been cleared
3. The frontend container has been restarted

---

## Quick Reference: Complete Fix Checklist

When Google Maps stops working, follow this checklist:

- [ ] Check browser console for error messages
- [ ] Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exists in `next.config.ts` `env` section
- [ ] Ensure fallback value is included: `|| "fallback-key"`
- [ ] Check `docker-compose.yml` has the environment variable
- [ ] Verify `frontend/.env.local` exists and contains the key
- [ ] Clear `.next` cache: `rm -rf frontend/.next` or `Remove-Item -Recurse -Force frontend\.next`
- [ ] Restart frontend: `docker-compose restart frontend`
- [ ] Wait 10-15 seconds for Next.js to start
- [ ] Check logs: `docker-compose logs frontend --tail 20`
- [ ] Hard refresh browser: `Ctrl + Shift + R` or `Cmd + Shift + R`
- [ ] Verify in console: API key should show as "Present"
- [ ] Test map display on `/calendar` page

---

## Common Error Messages and Solutions

### "Map failed to load"
**Cause:** API key not available in browser
**Solution:** Add to `next.config.ts` and clear cache

### "Map not available"
**Cause:** API key is empty string
**Solution:** Check environment variable is set and has fallback

### "NoApiKeys" warning in console
**Cause:** Google Maps API key is invalid or missing
**Solution:** Verify API key is correct and has required APIs enabled

### Maps load but show "For development purposes only"
**Cause:** API key has billing restrictions or is in test mode
**Solution:** Enable billing in Google Cloud Console

### Maps don't show markers
**Cause:** API key works but Places API or Geocoding API not enabled
**Solution:** Enable required APIs in Google Cloud Console

---

## Additional Resources

- [Next.js Environment Variables Documentation](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [React Google Maps API Library](https://github.com/JustFly1984/react-google-maps-api)

---

**Last Updated:** November 20, 2025  
**Maintained By:** CourtMate Development Team

