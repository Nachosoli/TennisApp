#!/bin/bash

# Database Backup Script for CourtMate
# Usage: ./backup-db.sh [backup-name]

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-courtmate}
BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=${1:-courtmate_backup_${TIMESTAMP}}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Backup file path
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"

echo "📦 Starting database backup..."
echo "Database: ${DB_NAME}"
echo "Backup file: ${BACKUP_FILE}"

# Perform backup
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -F c \
  -f "${BACKUP_FILE}.dump" \
  --verbose

# Also create SQL dump
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -f "${BACKUP_FILE}" \
  --verbose

# Compress SQL dump
gzip -f "${BACKUP_FILE}"

echo "✅ Backup completed: ${BACKUP_FILE}.gz"
echo "✅ Backup completed: ${BACKUP_FILE}.dump"

# List recent backups
echo ""
echo "📋 Recent backups:"
ls -lh "${BACKUP_DIR}" | tail -5

