# CourtMate Tennis App

Full-stack web application connecting recreational tennis players to schedule matches, track results, and monitor performance.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, TailwindCSS
- **Backend**: NestJS, TypeScript, TypeORM
- **Database**: PostgreSQL with PostGIS
- **Cache**: Redis
- **Real-time**: Socket.IO with Redis adapter
- **Authentication**: JWT (access + refresh tokens)
- **Storage**: Cloudinary (photos)
- **Email**: SendGrid
- **SMS**: Twilio
- **Maps**: Google Places API

## Project Structure

```
.
├── backend/          # NestJS backend API
├── frontend/         # Next.js frontend application
├── docker-compose.yml
└── package.json      # Root workspace configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL 14+ (or use Docker)
- Redis 6+ (or use Docker)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` files in both `backend/` and `frontend/` directories
   - Fill in all required values

4. Start services with Docker:
   ```bash
   docker-compose up -d
   ```

5. Run database migrations:
   ```bash
   cd backend
   npm run migration:run
   ```

6. Start development servers:
   ```bash
   npm run dev
   ```

This will start:
- Backend API on http://localhost:3001
- Frontend app on http://localhost:3000

## Development

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both projects for production
- `npm run test` - Run all tests
- `npm run lint` - Lint both projects

## Documentation

- [PROJECT_PLAN.md](./PROJECT_PLAN.md) - Detailed project specifications and implementation plan
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup guide for development and production
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) - Database backup and restore procedures
- [backend/README.md](./backend/README.md) - Backend API documentation

## Implementation Status

- ✅ Phase 1: Foundation (Database schema, TypeORM, Redis, JWT auth)
- ✅ Phase 2: Core Features (Court management, Match creation, Applications) - *In progress by another agent*
- ✅ Phase 3: Real-time & Results (Chat, Score entry, ELO calculation, Stats)
- ✅ Phase 4: Notifications & Admin (Email/SMS, Admin panel, Reports, Analytics)
- ✅ Phase 5: Polish & Testing (Unit tests, E2E tests, Error handling, Documentation)
- ✅ Phase 6: Deployment & DevOps (Docker, CI/CD, Seed scripts, Backup/restore)

## Quick Start

### Development (Docker)

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run migration:run

# Seed database (optional)
docker-compose exec backend npm run seed
```

### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- API Docs: http://localhost:3001/api/v1/docs

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup instructions.
