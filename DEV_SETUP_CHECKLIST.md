# Development Setup Checklist

## Current Status
- Frontend dev server running on port **3002** (Next.js auto-assigned)
- Backend should be on port **3001** (default)

## 1. Environment Variables

### Frontend Environment Variables
Create `frontend/.env.local` with:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_key_here (optional)
```

### Backend Environment Variables
Create `backend/.env` with:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tennisapp

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# Server
PORT=3001
NODE_ENV=development

# Stripe (if using payments)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_webhook_secret_here

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key_here
SUPPORT_EMAIL=support@courtbuddy.io

# Google OAuth (REQUIRED for social login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3002

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379
```

## 2. Database Migrations

### Required Migrations (in order):
1. ✅ `1700000000000-InitialSchema.ts` - Base schema
2. ✅ `1734567890000-AddEmailVerified.ts` - Email verification
3. ✅ `1734567900000-AddUltimateToRatingTypeEnum.ts` - Rating types
4. ✅ `1734568000000-AddGenderToUser.ts` - User gender
5. ✅ `1734568100000-UpdateEloDefaultTo1500.ts` - ELO defaults
6. ✅ `1734568200000-RenameVerifiedToPhoneVerified.ts` - Phone verification
7. ✅ `1734568300000-AddHomeCourtIndex.ts` - Performance indexes
8. ✅ `1734568400000-AddPerformanceIndexes.ts` - More indexes
9. ✅ `1734568500000-AddPaymentSystem.ts` - Payment system
10. ✅ `1734569100000-AddCancelledMatchesToUserStats.ts` - Cancellation stats
11. ✅ `1734569200000-UpdateEnumsToLowercase.ts` - Enum updates
12. ✅ `1734569300000-AllowMultipleApplicationsPerSlot.ts` - Applications
13. ✅ `1734569400000-AddWaitlistedStatus.ts` - Waitlist status
14. ✅ `1734569500000-ChangeCoordinatesToText.ts` - Coordinates
15. ✅ `1734569600000-AddOAuthFields.ts` - OAuth fields
16. ✅ `1734569700000-AddMatchApplicantToNotificationEnums.ts` - Notifications
17. ✅ `1734570000000-RefactorNotificationsToUseDeliveries.ts` - Notification refactor
18. ⚠️ **`1734570100000-CreateCourtReviews.ts`** - Court reviews (NEW)
19. ⚠️ **`1734570200000-AddStripeTransactions.ts`** - Stripe transactions (NEW)

### Check Migration Status:
```sql
-- Run in DBeaver or psql
SELECT * FROM migrations ORDER BY timestamp DESC;
```

### Run Missing Migrations:
**Option 1: Via Admin Panel**
- Go to `http://localhost:3002/admin/migrations`
- Click "Run Pending Migrations"

**Option 2: Via DBeaver**
- Open the migration file
- Copy the SQL from the `up()` method
- Execute in DBeaver

**Option 3: Via Command Line**
```bash
cd backend
npm run migration:run
```

## 3. Verify Database Schema

### Check if Court Reviews table exists:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'court_reviews';
```

### Check if Transactions table exists:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'transactions';
```

### Check if stripe_customer_id column exists in users:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name = 'stripe_customer_id';
```

## 4. Start Development Servers

### Backend:
```bash
cd backend
npm run start:dev
```
Should start on `http://localhost:3001`

### Frontend:
```bash
cd frontend
npm run dev
```
Should start on `http://localhost:3000` (or auto-assigned port like 3002)

## 5. Test Dark Mode

1. Open `http://localhost:3002` (or whatever port Next.js assigned)
2. Log in to your account
3. Click your user icon (top right)
4. Look for "Dark Mode" toggle in dropdown
5. Click to toggle between light/dark modes
6. Refresh page - preference should persist

## 6. Common Issues

### Issue: Frontend can't connect to backend
- **Check**: Backend is running on port 3001
- **Check**: `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- **Check**: CORS is enabled in backend

### Issue: Database errors
- **Check**: Database is running and accessible
- **Check**: `DATABASE_URL` in backend `.env`
- **Check**: All migrations have been run

### Issue: Dark mode not working
- **Check**: Browser console for errors
- **Check**: `localStorage` has `theme-preference` key
- **Check**: `ThemeProvider` is in `layout.tsx`

### Issue: Court reviews not showing
- **Check**: `CreateCourtReviews` migration has been run
- **Check**: `court_reviews` table exists in database
- **Check**: Backend `ReviewsModule` is registered in `app.module.ts`

### Issue: Stripe errors
- **Check**: Stripe keys are set in backend `.env`
- **Check**: `stripe_customer_id` column exists in `users` table
- **Check**: `transactions` table exists

### Issue: Google OAuth / Social Login not working
- **Check**: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in backend `.env`
- **Check**: `FRONTEND_URL` matches your frontend port (e.g., `http://localhost:3002`)
- **Check**: `GOOGLE_CALLBACK_URL` is set correctly (should be `http://localhost:3001/api/v1/auth/google/callback`)
- **Check**: Google OAuth credentials are configured in Google Cloud Console
- **Check**: Authorized redirect URIs in Google Console includes the callback URL
- **Check**: Backend is running and GoogleStrategy initializes without errors
- **Check**: "Sign in with Google" button appears on login page

## 7. Quick Verification Commands

```bash
# Check if backend is running
curl http://localhost:3001/api/v1/health

# Check if frontend is running
curl http://localhost:3002

# Check database connection (from backend directory)
npm run typeorm query "SELECT 1"
```

