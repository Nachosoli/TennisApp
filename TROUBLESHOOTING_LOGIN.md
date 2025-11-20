# Troubleshooting Login/Sign Up Errors

## ✅ Fixed Issues

1. **ErrorBoundary Import** - Fixed missing import in login and register pages
2. **Database Synchronization** - Disabled auto-sync, migrations ran successfully
3. **Backend Started** - Backend is now running successfully

## 🔍 Common Login/Sign Up Errors

### Error 1: "Network Error" or "Failed to fetch"
**Cause:** Frontend cannot reach backend API

**Solutions:**
1. **Check API URL Configuration:**
   - Frontend should use: `http://107.139.214.38:3001/api/v1` (public IP)
   - Or `http://192.168.1.65:3001/api/v1` (local network)
   - Verify in browser DevTools → Network tab

2. **Check CORS:**
   - Backend CORS should include your frontend URL
   - Current CORS_ORIGINS: `http://107.139.214.38:3002,http://192.168.1.65:3002,http://localhost:3002`

3. **Check Router Port Forwarding:**
   - Port 3001 must be forwarded to 192.168.1.65:3001
   - Test: `curl http://107.139.214.38:3001/api/v1/health/live`

### Error 2: "CORS policy" error in browser console
**Cause:** Browser blocking cross-origin requests

**Solutions:**
1. Verify CORS_ORIGINS includes your frontend URL
2. Restart backend: `docker-compose restart backend`
3. Check browser console for exact CORS error

### Error 3: "401 Unauthorized" or "Invalid credentials"
**Cause:** Authentication issue

**Solutions:**
1. Check if user exists in database
2. Verify password is correct
3. Check backend logs: `docker-compose logs backend`

### Error 4: "500 Internal Server Error"
**Cause:** Backend server error

**Solutions:**
1. Check backend logs: `docker-compose logs backend --tail 50`
2. Verify database connection
3. Check if migrations ran: `docker-compose exec backend npm run migration:run`

## 🧪 Testing Steps

### 1. Test Backend Health
```bash
# From your machine
curl http://localhost:3001/api/v1/health/live

# From external network (if port forwarding configured)
curl http://107.139.214.38:3001/api/v1/health/live
```

### 2. Test Login Endpoint
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Go to Network tab
5. Try logging in
6. Check the failed request and its response

### 4. Check Frontend API Configuration
In browser console, run:
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
```

## 🔧 Quick Fixes

### Restart All Services
```bash
docker-compose restart
```

### Check Container Status
```bash
docker-compose ps
```

### View Real-time Logs
```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs  
docker-compose logs -f frontend
```

### Verify Environment Variables
```bash
# Check backend env
docker-compose exec backend env | grep -E "FRONTEND_URL|CORS_ORIGINS"

# Check frontend env
docker-compose exec frontend env | grep NEXT_PUBLIC
```

## 📋 Current Configuration

- **Backend URL:** http://107.139.214.38:3001/api/v1
- **Frontend URL:** http://107.139.214.38:3002
- **CORS Origins:** http://107.139.214.38:3002, http://192.168.1.65:3002, http://localhost:3002

## 🆘 Still Having Issues?

Please provide:
1. **Exact error message** from browser console
2. **Network tab** screenshot showing the failed request
3. **Backend logs** from when you try to login: `docker-compose logs backend --tail 20`

