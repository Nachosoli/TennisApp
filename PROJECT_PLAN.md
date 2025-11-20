# CourtMate Tennis App - Project Plan

## Overview
Full-stack web application connecting recreational tennis players to schedule matches, track results, and monitor performance. Production-ready with backend, frontend, database, real-time chat, and PWA support.

## Technical Stack Decisions

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **PWA**: Installability only (no offline support)
- **Push Notifications**: Critical notifications only (Match Confirmed, Match Accepted)

### Backend
- **Framework**: NestJS (separate service)
- **Language**: TypeScript
- **API**: RESTful with versioning (`/api/v1/`)
- **Documentation**: OpenAPI/Swagger

### Database
- **Primary**: PostgreSQL with PostGIS extension
- **ORM**: TypeORM with migrations
- **Caching**: Redis (slot locks, user sessions, courts, user profiles)

### Real-time
- **Chat**: Socket.IO with Redis adapter (horizontal scaling)

### Authentication
- **Method**: JWT (access token: 1 hour, refresh token: 7 days)
- **Password**: bcrypt/argon2
- **SMS**: Twilio (US format only, optional but required for match creation/application)

### Third-party Services
- **Email**: SendGrid (HTML templates)
- **SMS**: Twilio (US only)
- **Maps**: Google Places API (with caching)
- **Storage**: Cloudinary (photos: 10MB max, JPG/PNG/WebP)

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: AWS/GCP Docker
- **Database**: Managed PostgreSQL
- **CI/CD**: Basic CI (tests on PR), manual deployment
- **Monitoring**: Structured logging (Winston/Pino) + Sentry
- **Rate Limiting**: 1000 requests/minute per user

## Core Business Rules

### User Registration & Profile
- Email + password + optional phone verification
- Phone verification required before creating/applying to matches
- Profile: name, email, phone, optional photo, bio, play style, rating (UTR/USTA/custom), home court toggle
- Profile visibility: Limited (name, photo, rating) until match confirmation

### Home Court Rules
- Users without home court can only APPLY to matches (cannot create)
- Users with home court can CREATE matches
- At least one player in a match must have a home court
- Users without home court can match with users who have one

### Match Creation
- Only users with home court can create matches
- Multiple matches per day allowed (different filters per match)
- Filters at match level (not per slot): skill level, gender, max distance, surface
- Required: court, date(s), time slots, match format (singles/doubles)
- Calendar shows matches matching preferences (1 month ahead)
- Toggle to show matches outside preferences
- Color-coded by surface: Hard=blue, Clay=red, Grass=green, Indoor=gray

### Slot Application & Locking
- Users can apply to multiple matches (unlimited) if no time overlap
- Application auto-locks slot (Redis)
- Lock expiration: Configurable by admins, default 2 hours
- Creator confirms → match becomes CONFIRMED
- Only one slot per match application

### Doubles Format
- One user applies and can bring non-platform friend
- Guest players stored with name only

### Court Management
- Users can create courts: name, address, coordinates, surface, public/private
- Google Places API validation with caching
- Reusable court dropdown (all user-created courts)
- No admin approval required
- Admin can edit/delete courts (deleted courts show as "unavailable" on existing matches)

### Score Entry & ELO
- Either player can submit (first submission recorded)
- Other player can dispute
- Full score format: "6-4 3-6 6-2"
- ELO: Initial 1000, K-factor 20, separate for singles/doubles
- Stats: Win streaks (no losing streaks), head-to-head history

### Match Cancellation
- Creators can cancel anytime
- 1 free cancellation per 3 months before ELO penalty
- Notifications sent to participants

### Notifications
- Types: Match Created, Match Accepted, Match Confirmed, Court Changes, Score Reminder (24hrs after match), New Chat
- Defaults: Critical ON (Match Confirmed, Match Accepted), others OFF
- User preferences per notification type (email/SMS)
- Retry: Once after 1 hour if failed

### Reporting & Admin
- Users can report: users, matches, courts
- Admin capabilities: suspend/ban users, edit profiles/ratings/home courts, edit/delete courts, resolve disputes, override confirmations, adjust scores, force cancel matches
- Admin creation: First admin seeded, additional admins invite-only
- Analytics: Comprehensive (user growth, match completion, popular courts, ELO distribution, geographic distribution, peak usage, revenue placeholder)

## Database Schema

### Core Tables
1. **Users**: id, email, password_hash, phone, verified, first_name, last_name, photo_url, bio, play_style, rating_type, rating_value, home_court_id, created_at, updated_at
2. **Courts**: id, name, address, coordinates (PostGIS), surface_type, is_public, created_by_user_id, created_at, updated_at, deleted_at
3. **Matches**: id, creator_user_id, court_id, date, format (singles/doubles), skill_level_min, skill_level_max, gender_filter, max_distance, surface_filter, status, created_at, updated_at
4. **MatchSlots**: id, match_id, start_time, end_time, status (available/locked/confirmed), locked_by_user_id, locked_at, expires_at, confirmed_at
5. **Applications**: id, match_slot_id, applicant_user_id, guest_partner_name (for doubles), status (pending/confirmed/rejected), created_at
6. **ChatMessages**: id, match_id, user_id, message, created_at
7. **Results**: id, match_id, player1_user_id, player2_user_id, guest_player1_name, guest_player2_name, score, submitted_by_user_id, disputed, created_at, updated_at
8. **ELOLogs**: id, user_id, match_id, match_type (singles/doubles), elo_before, elo_after, opponent_user_id, created_at
9. **Notifications**: id, user_id, type, channel (email/sms), status (pending/sent/failed), retry_count, created_at, sent_at
10. **NotificationPreferences**: id, user_id, notification_type, email_enabled, sms_enabled
11. **AdminActions**: id, admin_user_id, action_type, target_type, target_id, details, created_at
12. **Reports**: id, reporter_user_id, report_type (user/match/court), target_id, reason, status, admin_user_id, resolved_at, created_at
13. **UserStats**: id, user_id, singles_elo, doubles_elo, win_streak_singles, win_streak_doubles, total_matches, total_wins, created_at, updated_at

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Project structure setup (monorepo)
- Database schema design & migrations
- TypeORM configuration
- Redis setup
- Basic authentication (JWT)
- User registration & profile

### Phase 2: Core Features (Week 3-4)
- Court management (CRUD, Google Places validation)
- Match creation (multiple slots, filters)
- Slot application & locking system
- Calendar view with filters
- Basic match detail page

### Phase 3: Real-time & Results (Week 5-6)
- Socket.IO chat implementation
- Score entry system
- ELO calculation & tracking
- Stats dashboard (win streaks, head-to-head)
- Match cancellation logic

### Phase 4: Notifications & Admin (Week 7-8)
- Notification system (email/SMS)
- PWA push notifications
- Admin panel (user management, court management)
- Dispute resolution system
- Reporting system
- Analytics dashboard

### Phase 5: Polish & Testing (Week 9-10)
- Map integration (Google Maps)
- UI/UX improvements
- Comprehensive testing (80%+ coverage)
- E2E tests for critical flows
- Performance optimization
- Documentation (API docs, deployment guides)

### Phase 6: Deployment & DevOps (Week 11-12)
- Docker setup (docker-compose)
- CI/CD pipeline (basic CI)
- Environment configuration
- Monitoring setup (Sentry, logging)
- Seed scripts (200 users, 100 courts, test accounts)
- Backup/restore documentation

## Testing Strategy

### Unit Tests
- Target: 80%+ coverage
- Focus: Business logic, utilities, services

### Integration Tests
- Critical flows: Registration, match creation, slot application, score entry, ELO calculation

### E2E Tests (Playwright/Cypress)
- Critical user flows: Complete match lifecycle, chat, score submission

## Seed Data

### Users (200 total)
- Mix of realistic and generic data
- Geographic focus: Florida cities
- Test accounts:
  - Admin user
  - Regular user with home court
  - User without home court

### Courts (100 total)
- Florida-based courts
- Mix of surfaces (Hard, Clay, Grass, Indoor)
- Mix of public/private

## Environment Variables

Required variables (documented in `.env.example`):
- Database: `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- JWT: `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- SendGrid: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- Google Maps: `GOOGLE_MAPS_API_KEY`
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- App: `NODE_ENV`, `FRONTEND_URL`, `BACKEND_URL`, `PORT`

## Deliverables Checklist

- [ ] Working frontend + backend code
- [ ] Dockerfiles + docker-compose for local dev
- [ ] Seed scripts (200 users, 100 courts)
- [ ] Unit & integration tests (80%+ coverage)
- [ ] E2E tests for critical flows
- [ ] Admin dashboard
- [ ] UI wireframes / basic layout
- [ ] OpenAPI / Swagger docs
- [ ] PWA support (manifest, service worker)
- [ ] Environment configuration (.env.example)
- [ ] CI/CD setup (basic CI)
- [ ] Monitoring & logging setup
- [ ] Backup/restore documentation

## Post-MVP Features (Future)
- Paid subscriptions
- Tournaments/ladders
- Coach marketplace
- Automatic court availability integrations

## Notes
- Designed for initial scale: 100-500 users
- All features production-ready from MVP
- Focus on Florida market initially (SMS, seed data)
- Scalable architecture (Redis adapter, horizontal scaling ready)

