# Test Migration Script for Windows PowerShell
# This script tests the database migration

Write-Host "🚀 Testing CourtMate Database Migration" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  No .env file found. Using defaults from config." -ForegroundColor Yellow
}

# Check database connection
Write-Host ""
Write-Host "📡 Running migration..." -ForegroundColor Cyan
npm run migration:run

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 To verify tables were created, run this SQL query:" -ForegroundColor Cyan
    Write-Host "  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Migration failed. Please check the error above." -ForegroundColor Red
    exit 1
}

