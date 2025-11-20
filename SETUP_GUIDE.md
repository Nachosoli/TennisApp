# CourtMate Setup Guide

Complete setup guide for local development and production deployment.

## Quick Start (Development)

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL 14+ with PostGIS (or use Docker)
- Redis 6+ (or use Docker)

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TennisApp
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   # Edit .env files with your configuration
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec backend npm run migration:run
   ```

5. **Seed database (optional)**
   ```bash
   docker-compose exec backend npm run seed
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api/v1
   - API Docs: http://localhost:3001/api/v1/docs

### Option 2: Manual Setup

1. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Set up PostgreSQL**
   ```bash
   # Create database
   createdb courtmate

   # Enable PostGIS extension
   psql -d courtmate -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   ```

3. **Set up Redis**
   ```bash
   # Start Redis (varies by OS)
   redis-server
   ```

4. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   # Edit .env files
   ```

5. **Run migrations**
   ```bash
   cd backend
   npm run migration:run
   ```

6. **Start backend**
   ```bash
   cd backend
   npm run start:dev
   ```

7. **Start frontend** (in another terminal)
   ```bash
   cd frontend
   npm run dev
   ```

## Production Setup

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions.

### Quick Production Deploy

```bash
# Set environment variables
export DB_PASSWORD=strong-password
export JWT_SECRET=strong-secret
# ... etc

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run
```

## Seed Data

### Run Seed Script

```bash
cd backend
npm run seed
```

### Test Accounts

After seeding, you can use these test accounts:

- **Admin**: admin@courtmate.com / admin123
- **User (with home court)**: test@courtmate.com / test123
- **User (without home court)**: test2@courtmate.com / test123

### What Gets Created

- 200 users (1 admin + 2 test + 197 regular)
- 100 courts across Florida cities
- User stats with ELO ratings
- Realistic test data

## Database Migrations

### Run Migrations

```bash
cd backend
npm run migration:run
```

### Generate New Migration

```bash
cd backend
npm run migration:generate -- -n MigrationName
```

### Revert Migration

```bash
cd backend
npm run migration:revert
```

## Testing

### Run Tests

```bash
# Backend unit tests
cd backend
npm run test

# Backend E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check connection string in `.env`
- Verify PostGIS extension is installed
- Check firewall rules

### Redis Connection Issues

- Verify Redis is running
- Check Redis host/port in `.env`
- Test connection: `redis-cli ping`

### Port Already in Use

- Change `PORT` in `.env` (backend)
- Change port in `next.config.ts` (frontend)
- Or stop the service using the port

### Migration Errors

- Ensure database exists
- Check PostGIS extension is installed
- Verify database user has proper permissions
- Review migration files

## Environment Variables

### Required Backend Variables

- `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`

### Optional Backend Variables

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (for SMS)
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (for email)
- `GOOGLE_MAPS_API_KEY` (for court validation)
- `CLOUDINARY_*` (for image uploads)
- `SENTRY_DSN` (for error tracking)

### Frontend Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL

## Development Workflow

1. **Start services**: `docker-compose up -d`
2. **Make changes**: Edit code in your IDE
3. **Test locally**: Services auto-reload
4. **Run tests**: `npm run test`
5. **Commit changes**: Git workflow

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:3001/api/v1/docs
- Test endpoints directly from the browser
- View request/response schemas

## Next Steps

- Review [PROJECT_PLAN.md](./PROJECT_PLAN.md) for feature overview
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- See [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) for backup procedures
- Review API documentation at `/api/v1/docs`

