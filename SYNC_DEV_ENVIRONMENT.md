# Sync Development Environment - Complete Guide

## Problem
Your development environment is outdated and missing:
- ❌ Contact form page
- ❌ Court reviews feature
- ❌ Database migrations (notifications, Stripe, etc.)
- ❌ Missing database columns (stripe_customer_id, etc.)
- ❌ Other recent features

## Solution: Complete Sync

### Step 1: Pull Latest Code

```bash
# Make sure you're in the project root
cd D:\TennisApp

# Pull latest code from repository
git pull origin main
# or
git pull origin master
# (use whatever your main branch is called)
```

### Step 2: Install/Update Dependencies

```bash
# Update backend dependencies
cd backend
npm install

# Update frontend dependencies
cd ../frontend
npm install
```

### Step 3: Check Database Migrations Status

**Option A: Via Admin Panel (Recommended)**
1. Start backend: `cd backend && npm run start:dev`
2. Start frontend: `cd frontend && npm run dev`
3. Go to `http://localhost:3002/admin/migrations`
4. Check which migrations are pending
5. Click "Run Pending Migrations"

**Option B: Via DBeaver (Manual)**
1. Open DBeaver
2. Connect to your database
3. Check which tables exist:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

### Step 4: Run Missing Migrations

**Critical Migrations to Check:**

1. **Notification Deliveries** (if missing `notification_deliveries` table):
   - Migration: `1734570000000-RefactorNotificationsToUseDeliveries.ts`
   - Creates: `notification_deliveries` table

2. **Court Reviews** (if missing `court_reviews` table):
   - Migration: `1734570100000-CreateCourtReviews.ts`
   - Creates: `court_reviews` table

3. **Stripe Transactions** (if missing `transactions` table or `stripe_customer_id` column):
   - Migration: `1734570200000-AddStripeTransactions.ts`
   - Creates: `transactions` table
   - Adds: `stripe_customer_id` column to `users` table

**Run via Admin Panel:**
- Go to `http://localhost:3002/admin/migrations`
- Click "Run Pending Migrations"

**Or Run via DBeaver:**
- Open each migration file in `backend/src/migrations/`
- Copy the SQL from the `up()` method
- Execute in DBeaver

**Or Run via Command Line:**
```bash
cd backend
npm run migration:run
```

### Step 5: Verify Database Schema

Run these SQL queries in DBeaver to verify:

```sql
-- Check if court_reviews table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'court_reviews'
) as court_reviews_exists;

-- Check if transactions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'transactions'
) as transactions_exists;

-- Check if notification_deliveries table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'notification_deliveries'
) as notification_deliveries_exists;

-- Check if stripe_customer_id column exists in users
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'stripe_customer_id'
) as stripe_customer_id_exists;
```

### Step 6: Rebuild Frontend

```bash
cd frontend

# Clear Next.js cache
rm -rf .next
# On Windows PowerShell:
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Rebuild
npm run build
```

### Step 7: Restart All Services

**Stop all running services:**
```powershell
# Stop all Node processes (be careful - this stops ALL node processes)
Get-Process node | Stop-Process -Force
```

**Start Backend:**
```bash
cd backend
npm run start:dev
```

**Start Frontend (in a new terminal):**
```bash
cd frontend
npm run dev
```

### Step 8: Verify Features

After restarting, verify these features work:

1. **Contact Form:**
   - Go to `http://localhost:3002/contact`
   - Should see a contact form with subject dropdown and message field

2. **Court Reviews:**
   - Go to `http://localhost:3002/courts`
   - Click on any court
   - Should see "Write Review" button and star ratings
   - Should see existing reviews if any

3. **Database:**
   - Check admin panel: `http://localhost:3002/admin/migrations`
   - All migrations should show as "Applied"

4. **Dark Mode:**
   - Click user icon → "Dark Mode" toggle
   - Should switch between light/dark themes

### Step 9: Check Environment Variables

Make sure you have all required environment variables:

**Backend `.env`:**
```env
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
PORT=3001
FRONTEND_URL=http://localhost:3002
GOOGLE_CLIENT_ID=your_google_client_id (optional)
GOOGLE_CLIENT_SECRET=your_google_client_secret (optional)
STRIPE_SECRET_KEY=your_stripe_key (optional)
STRIPE_PUBLISHABLE_KEY=your_stripe_key (optional)
```

**Frontend `.env.local` (optional - has defaults):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Quick Sync Script

If you want to do everything at once:

```powershell
# Navigate to project root
cd D:\TennisApp

# Pull latest code
git pull

# Update backend
cd backend
npm install
npm run migration:run

# Update frontend
cd ../frontend
npm install
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Restart services (run these in separate terminals)
# Terminal 1:
cd backend
npm run start:dev

# Terminal 2:
cd frontend
npm run dev
```

## Troubleshooting

### "Table already exists" errors
- This is OK - migrations check if tables exist before creating
- Just continue with other migrations

### "Column already exists" errors
- Some columns might already exist
- Check if the column actually exists in the database
- If it exists, the migration will skip it

### Frontend shows old UI
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Clear Next.js cache: `rm -rf .next` then rebuild

### Backend won't start
- Check for missing environment variables
- Check database connection
- Look at error logs in terminal

### Migrations won't run
- Check database connection
- Verify you have proper database permissions
- Try running migrations manually via DBeaver

## What to Do Right Now

1. **Pull latest code**: `git pull`
2. **Check migrations**: Go to admin panel or check database
3. **Run missing migrations**: Via admin panel or DBeaver
4. **Restart services**: Backend and frontend
5. **Test features**: Contact form, court reviews, etc.

