# Backup & Restore Guide

This guide covers database backup and restore procedures for CourtMate.

## Backup Procedures

### Automated Backups

#### Linux/macOS

```bash
# Make script executable
chmod +x backend/scripts/backup-db.sh

# Run backup
./backend/scripts/backup-db.sh

# Custom backup name
./backend/scripts/backup-db.sh my-backup-name
```

#### Windows PowerShell

```powershell
# Run backup
.\backend\scripts\backup-db.ps1

# Custom backup name
.\backend\scripts\backup-db.ps1 -BackupName "my-backup-name"
```

### Manual Backup

#### Using pg_dump (SQL format)

```bash
pg_dump -h localhost -U postgres -d courtmate -f backup.sql
```

#### Using pg_dump (Custom format - recommended)

```bash
pg_dump -h localhost -U postgres -d courtmate -F c -f backup.dump
```

#### Using Docker

```bash
docker exec courtmate_postgres pg_dump -U postgres -d courtmate_db > backup.sql
```

### Backup Schedule

#### Cron Job (Linux/macOS)

Add to crontab (`crontab -e`):

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backend/scripts/backup-db.sh >> /var/log/courtmate-backup.log 2>&1

# Weekly backup on Sunday at 3 AM
0 3 * * 0 /path/to/backend/scripts/backup-db.sh weekly_backup >> /var/log/courtmate-backup.log 2>&1
```

#### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily at 2 AM)
4. Set action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-File "C:\path\to\backend\scripts\backup-db.ps1"`

## Restore Procedures

### Using Restore Scripts

#### Linux/macOS

```bash
# Make script executable
chmod +x backend/scripts/restore-db.sh

# Restore from backup
./backend/scripts/restore-db.sh backups/courtmate_backup_20240115_020000.sql.gz
```

#### Windows PowerShell

```powershell
# Restore from backup
.\backend\scripts\restore-db.ps1 -BackupFile "backups\courtmate_backup_20240115_020000.sql"
```

### Manual Restore

#### From SQL dump

```bash
psql -h localhost -U postgres -d courtmate < backup.sql
```

#### From custom format dump

```bash
pg_restore -h localhost -U postgres -d courtmate --clean --if-exists backup.dump
```

#### Using Docker

```bash
# Copy backup file to container
docker cp backup.sql courtmate_postgres:/tmp/backup.sql

# Restore
docker exec -i courtmate_postgres psql -U postgres -d courtmate_db < backup.sql
```

## Backup Retention Policy

### Recommended Policy

- **Daily backups**: Keep for 7 days
- **Weekly backups**: Keep for 4 weeks
- **Monthly backups**: Keep for 12 months

### Cleanup Script

```bash
#!/bin/bash
# cleanup-old-backups.sh

BACKUP_DIR="./backups"
DAYS_TO_KEEP=7

# Remove backups older than specified days
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${DAYS_TO_KEEP} -delete
find "${BACKUP_DIR}" -name "*.dump" -mtime +${DAYS_TO_KEEP} -delete

echo "✅ Cleaned up backups older than ${DAYS_TO_KEEP} days"
```

## Backup Verification

### Verify Backup File

```bash
# Check SQL dump
head -n 20 backup.sql

# Check custom format dump
pg_restore --list backup.dump
```

### Test Restore

1. Create test database
2. Restore backup to test database
3. Verify data integrity
4. Drop test database

```bash
# Create test database
createdb -h localhost -U postgres courtmate_test

# Restore to test database
pg_restore -h localhost -U postgres -d courtmate_test backup.dump

# Verify (example query)
psql -h localhost -U postgres -d courtmate_test -c "SELECT COUNT(*) FROM users;"

# Drop test database
dropdb -h localhost -U postgres courtmate_test
```

## Redis Backup

Redis persistence is configured via `redis.conf`:

```conf
# RDB snapshots
save 900 1
save 300 10
save 60 10000

# AOF (Append Only File)
appendonly yes
appendfsync everysec
```

### Manual Redis Backup

```bash
# Create RDB snapshot
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backups/redis-$(date +%Y%m%d).rdb
```

## Cloud Backup (Recommended)

### AWS S3

```bash
# Upload backup to S3
aws s3 cp backup.sql.gz s3://courtmate-backups/daily/backup-$(date +%Y%m%d).sql.gz

# Download from S3
aws s3 cp s3://courtmate-backups/daily/backup-20240115.sql.gz ./restore.sql.gz
```

### Google Cloud Storage

```bash
# Upload backup
gsutil cp backup.sql.gz gs://courtmate-backups/daily/backup-$(date +%Y%m%d).sql.gz

# Download backup
gsutil cp gs://courtmate-backups/daily/backup-20240115.sql.gz ./restore.sql.gz
```

## Disaster Recovery

### Full System Restore

1. **Restore Database**
   ```bash
   ./backend/scripts/restore-db.sh backups/latest-backup.sql.gz
   ```

2. **Run Migrations** (if needed)
   ```bash
   cd backend
   npm run migration:run
   ```

3. **Restore Redis** (if needed)
   ```bash
   redis-cli --rdb /backups/redis-latest.rdb
   ```

4. **Restart Services**
   ```bash
   docker-compose restart backend
   ```

### Point-in-Time Recovery

PostgreSQL Point-in-Time Recovery (PITR) requires:
- Continuous archiving enabled
- WAL (Write-Ahead Log) files
- Base backup

See PostgreSQL documentation for PITR setup.

## Monitoring

### Backup Monitoring

Monitor backup success/failure:

```bash
# Check last backup time
ls -lh backups/ | head -5

# Check backup size
du -sh backups/

# Verify backup integrity
pg_restore --list backups/latest.dump | head -20
```

### Alerting

Set up alerts for:
- Backup failures
- Backup size anomalies
- Missing backups
- Disk space issues

## Best Practices

1. **Automate backups**: Use cron jobs or task schedulers
2. **Test restores**: Regularly test restore procedures
3. **Off-site storage**: Store backups in cloud storage
4. **Encryption**: Encrypt sensitive backups
5. **Documentation**: Keep restore procedures documented
6. **Monitoring**: Monitor backup success/failure
7. **Retention**: Follow retention policy
8. **Verification**: Verify backup integrity regularly

## Troubleshooting

### Backup Fails

- Check database connection
- Verify disk space
- Check file permissions
- Review error logs

### Restore Fails

- Verify backup file integrity
- Check database connection
- Ensure sufficient disk space
- Check user permissions
- Review PostgreSQL logs

### Large Backup Files

- Use custom format (`.dump`) for compression
- Compress SQL dumps with gzip
- Consider incremental backups
- Archive old backups

## Support

For backup/restore issues:
1. Check logs: `backend/logs/`
2. Review PostgreSQL logs
3. Verify environment variables
4. Test with manual commands
5. Contact database administrator

