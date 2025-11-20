# Database Restore Script for CourtMate (PowerShell)
# Usage: .\restore-db.ps1 <backup-file>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

# Configuration
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "courtmate" }
$DB_PASSWORD = $env:DB_PASSWORD

if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Error: Backup file not found: $BackupFile"
    exit 1
}

Write-Host "⚠️  WARNING: This will overwrite the existing database!"
Write-Host "Database: $DB_NAME"
Write-Host "Backup file: $BackupFile"
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Restore cancelled"
    exit 1
}

Write-Host "🔄 Restoring database..."

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DB_PASSWORD

# Determine backup format and restore
if ($BackupFile -match "\.dump$") {
    # Custom format dump
    pg_restore `
        -h $DB_HOST `
        -p $DB_PORT `
        -U $DB_USER `
        -d $DB_NAME `
        --clean `
        --if-exists `
        --verbose `
        $BackupFile
} elseif ($BackupFile -match "\.sql$") {
    # SQL dump
    Get-Content $BackupFile | psql `
        -h $DB_HOST `
        -p $DB_PORT `
        -U $DB_USER `
        -d $DB_NAME `
        --verbose
} else {
    Write-Host "❌ Error: Unsupported backup file format"
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Restore failed!"
    exit 1
}

Write-Host "✅ Database restored successfully!"

