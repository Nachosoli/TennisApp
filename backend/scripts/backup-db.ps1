# Database Backup Script for CourtMate (PowerShell)
# Usage: .\backup-db.ps1 [backup-name]

param(
    [string]$BackupName = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "courtmate" }
$DB_PASSWORD = $env:DB_PASSWORD
$BACKUP_DIR = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backups" }
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

if ($BackupName -eq "") {
    $BackupName = "courtmate_backup_$TIMESTAMP"
}

# Create backup directory if it doesn't exist
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

$BACKUP_FILE = Join-Path $BACKUP_DIR "$BackupName.sql"

Write-Host "📦 Starting database backup..."
Write-Host "Database: $DB_NAME"
Write-Host "Backup file: $BACKUP_FILE"

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DB_PASSWORD

# Perform backup
$env:PGPASSWORD = $DB_PASSWORD
pg_dump `
    -h $DB_HOST `
    -p $DB_PORT `
    -U $DB_USER `
    -d $DB_NAME `
    -f $BACKUP_FILE `
    --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backup failed!"
    exit 1
}

Write-Host "✅ Backup completed: $BACKUP_FILE"

# List recent backups
Write-Host ""
Write-Host "📋 Recent backups:"
Get-ChildItem $BACKUP_DIR | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | Format-Table Name, Length, LastWriteTime

