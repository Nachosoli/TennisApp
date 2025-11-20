# Database Scripts

This directory contains utility scripts for database operations.

## Seed Script

### Usage

```bash
# Seed database with 200 users and 100 courts
npm run seed

# Or directly
ts-node -r tsconfig-paths/register src/scripts/seed.ts
```

### What it creates

- **1 Admin user**: admin@courtmate.com / admin123
- **2 Test users**: test@courtmate.com / test123, test2@courtmate.com / test123
- **197 Regular users**: user1@courtmate.com through user197@courtmate.com / password123
- **100 Courts**: Distributed across Florida cities
- **User Stats**: ELO ratings, win streaks, match history for all users

### Environment Variables

The seed script uses the same database configuration as the application:
- `DB_HOST` (default: localhost)
- `DB_PORT` (default: 5432)
- `DB_USER` (default: postgres)
- `DB_PASSWORD` (default: postgres)
- `DB_NAME` (default: courtmate)

## Backup Scripts

### Linux/macOS

```bash
# Make executable
chmod +x backup-db.sh restore-db.sh

# Backup
./backup-db.sh

# Restore
./restore-db.sh backups/courtmate_backup_20240115_020000.sql.gz
```

### Windows PowerShell

```powershell
# Backup
.\backup-db.ps1

# Restore
.\restore-db.ps1 -BackupFile "backups\courtmate_backup_20240115_020000.sql"
```

See [BACKUP_RESTORE.md](../../BACKUP_RESTORE.md) for detailed documentation.

