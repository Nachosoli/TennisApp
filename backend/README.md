# CourtMate Backend API

NestJS backend API for the CourtMate Tennis App.

## Features

- ✅ Authentication & Authorization (JWT)
- ✅ User Management
- ✅ Court Management
- ✅ Match Creation & Management
- ✅ Slot Applications & Locking
- ✅ Real-time Chat (Socket.IO)
- ✅ Score Entry & ELO Calculation
- ✅ User Statistics & Head-to-Head
- ✅ Notifications (Email/SMS)
- ✅ Admin Panel
- ✅ Reporting System
- ✅ Analytics Dashboard

## Tech Stack

- **Framework**: NestJS 11+
- **Language**: TypeScript
- **Database**: PostgreSQL with PostGIS
- **ORM**: TypeORM
- **Cache**: Redis
- **Real-time**: Socket.IO with Redis adapter
- **Authentication**: JWT (access + refresh tokens)
- **Email**: SendGrid
- **SMS**: Twilio
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

Required environment variables (see `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/courtmate
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=password
DB_NAME=courtmate

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=noreply@domaincourt.io

# Google Maps (optional)
GOOGLE_MAPS_API_KEY=your-api-key

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# App
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
PORT=3001
```

### Database Setup

```bash
# Run migrations
npm run migration:run

# Revert last migration (if needed)
npm run migration:revert
```

### Running the App

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:3001/api/v1`

## API Documentation

Swagger documentation is available at:
- **Development**: `http://localhost:3001/api/v1/docs`
- **Production**: `https://domaincourt.io/api/v1/docs`

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Project Structure

```
src/
├── auth/              # Authentication module
├── users/             # User management
├── courts/            # Court management
├── matches/           # Match management
├── applications/      # Slot applications
├── chat/             # Real-time chat
├── results/          # Score entry & ELO
├── stats/            # User statistics
├── elo/              # ELO calculation service
├── notifications/    # Email/SMS notifications
├── admin/            # Admin operations
├── reports/          # User reporting
├── analytics/        # Analytics dashboard
├── common/           # Shared utilities
├── config/           # Configuration
├── entities/         # Database entities
└── migrations/       # Database migrations
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/verify-phone` - Verify phone number
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update profile
- `PUT /api/v1/users/me/home-court` - Set/remove home court
- `GET /api/v1/users/:id` - Get public profile

### Courts
- `GET /api/v1/courts` - List courts
- `POST /api/v1/courts` - Create court
- `GET /api/v1/courts/:id` - Get court
- `PUT /api/v1/courts/:id` - Update court
- `DELETE /api/v1/courts/:id` - Delete court

### Matches
- `GET /api/v1/matches` - List matches
- `POST /api/v1/matches` - Create match
- `GET /api/v1/matches/:id` - Get match
- `PUT /api/v1/matches/:id` - Update match
- `DELETE /api/v1/matches/:id` - Cancel match
- `GET /api/v1/matches/calendar` - Get calendar view

### Applications
- `POST /api/v1/applications` - Apply to slot
- `POST /api/v1/applications/:id/confirm` - Confirm application
- `POST /api/v1/applications/:id/reject` - Reject application
- `GET /api/v1/applications/me` - Get my applications

### Chat
- `GET /api/v1/chat/matches/:matchId/messages` - Get messages
- WebSocket: `/chat` namespace

### Results
- `POST /api/v1/results` - Submit score
- `GET /api/v1/results/matches/:matchId` - Get result
- `PATCH /api/v1/results/matches/:matchId/dispute` - Dispute score

### Stats
- `GET /api/v1/stats/users/:userId` - Get user stats
- `GET /api/v1/stats/head-to-head/:userId1/:userId2` - Head-to-head
- `GET /api/v1/stats/users/:userId/elo-history` - ELO history

### Notifications
- `GET /api/v1/notifications` - Get notifications
- `GET /api/v1/notifications/preferences` - Get preferences
- `PUT /api/v1/notifications/preferences` - Update preferences

### Admin
- `POST /api/v1/admin/users/:userId/suspend` - Suspend user
- `POST /api/v1/admin/users/:userId/ban` - Ban user
- `PUT /api/v1/admin/users/:userId` - Edit user
- `DELETE /api/v1/admin/courts/:courtId` - Delete court
- `PATCH /api/v1/admin/results/:resultId/resolve-dispute` - Resolve dispute
- `GET /api/v1/admin/actions` - Get admin logs

### Reports
- `POST /api/v1/reports` - Create report
- `GET /api/v1/reports/me` - Get my reports
- `GET /api/v1/reports` - Get all reports (admin)
- `PATCH /api/v1/reports/:id/status` - Update status (admin)

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard
- `GET /api/v1/analytics/user-growth` - User growth
- `GET /api/v1/analytics/match-completion` - Match completion
- `GET /api/v1/analytics/popular-courts` - Popular courts
- `GET /api/v1/analytics/elo-distribution` - ELO distribution
- `GET /api/v1/analytics/geographic-distribution` - Geographic stats
- `GET /api/v1/analytics/peak-usage` - Peak usage

## WebSocket Events

### Client → Server
- `join_match` - Join match chat room
- `leave_match` - Leave match chat room
- `send_message` - Send chat message

### Server → Client
- `joined_match` - Confirmation of joining
- `left_match` - Confirmation of leaving
- `new_message` - New message broadcast
- `error` - Error messages

## Database Migrations

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## Performance Optimization

- Redis caching for frequently accessed data
- Database query optimization with indexes
- Connection pooling
- Request logging and monitoring
- Error handling and retry mechanisms

## Security

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention (TypeORM)
- CORS configuration
- Rate limiting (to be implemented)

## Monitoring

- Structured logging with Winston
- Error tracking (Sentry integration ready)
- Request/response logging
- Performance metrics

## License

UNLICENSED
