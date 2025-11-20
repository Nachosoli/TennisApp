# Database Seeding Guide

This guide explains how to seed the CourtMate database with test data.

## Prerequisites

1. Database must be running and accessible
2. Migrations must be run first: `npm run migration:run`
3. Environment variables must be set (see `.env.example`)

## Seed Scripts

### Seed Database

Populates the database with:
- **200 users** (including admin and test accounts)
- **100 courts** (Florida-based)
- **User stats** for all users

```bash
npm run seed
```

### Clear Database

⚠️ **WARNING**: This will delete ALL data from the database!

```bash
npm run seed:clear
```

## Test Accounts

After seeding, you can use these test accounts:

### Admin Account
- **Email**: `admin@courtmate.com`
- **Password**: `admin123`
- **Role**: Admin
- **Phone**: Verified

### Regular User (with home court)
- **Email**: `test@courtmate.com`
- **Password**: `test123`
- **Role**: User
- **Home Court**: Assigned
- **Phone**: Verified

### Regular User (without home court)
- **Email**: `test2@courtmate.com`
- **Password**: `test123`
- **Role**: User
- **Home Court**: None
- **Phone**: Verified

## Seed Data Details

### Users (200 total)
- Mix of realistic names and data
- Geographic focus: Florida cities (Miami, Tampa, Orlando, etc.)
- 70% phone verified
- 90% active users
- Various rating types (UTR, USTA, Custom)
- Ratings range: 2.0 - 8.0
- 60% have home courts assigned

### Courts (100 total)
- Florida-based locations
- Mix of surfaces: Hard, Clay, Grass, Indoor
- 70% public courts
- Random addresses in Florida cities

### User Stats
- Initial ELO: 1000 ± 200
- Win streaks: 0-5
- Total matches: 0-50
- Total wins: 0-30

## Customization

To modify seed data, edit `src/scripts/seed.ts`:

- Change user count: Modify `seedUsers(dataSource, 200)`
- Change court count: Modify `seedCourts(dataSource, users, 100)`
- Add more cities: Update `FLORIDA_CITIES` array
- Modify test accounts: Edit the `testUsers` array

## Troubleshooting

### Error: Cannot connect to database
- Check database is running
- Verify environment variables are set correctly
- Check database credentials

### Error: Table does not exist
- Run migrations first: `npm run migration:run`

### Error: Foreign key constraint
- Clear database first: `npm run seed:clear`
- Then run seed: `npm run seed`

## Notes

- Seed scripts use `ts-node` to run TypeScript directly
- All passwords are hashed using bcrypt
- Coordinates are randomly generated within city bounds
- Stats are randomly generated for realistic distribution

