#!/bin/bash

# Database Restore Script for CourtMate
# Usage: ./restore-db.sh <backup-file>

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Backup file required"
  echo "Usage: ./restore-db.sh <backup-file>"
  exit 1
fi

BACKUP_FILE=$1

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-courtmate}

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "⚠️  WARNING: This will overwrite the existing database!"
echo "Database: ${DB_NAME}"
echo "Backup file: ${BACKUP_FILE}"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "${confirm}" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 1
fi

echo "🔄 Restoring database..."

# Determine backup format and restore
if [[ "${BACKUP_FILE}" == *.dump ]]; then
  # Custom format dump
  PGPASSWORD="${DB_PASSWORD}" pg_restore \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --clean \
    --if-exists \
    --verbose \
    "${BACKUP_FILE}"
elif [[ "${BACKUP_FILE}" == *.gz ]]; then
  # Compressed SQL dump
  gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --verbose
elif [[ "${BACKUP_FILE}" == *.sql ]]; then
  # SQL dump
  PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -f "${BACKUP_FILE}" \
    --verbose
else
  echo "❌ Error: Unsupported backup file format"
  exit 1
fi

echo "✅ Database restored successfully!"

