# Quick Migration Test Script
# Run this from the project root after starting Docker Desktop

Write-Host "🚀 CourtMate Migration Test" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker
Write-Host "Step 1: Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Step 2: Start services
Write-Host ""
Write-Host "Step 2: Starting PostgreSQL and Redis..." -ForegroundColor Yellow
docker-compose up -d postgres redis

# Wait a bit for services to start
Write-Host "Waiting for services to be healthy..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Step 3: Check service status
Write-Host ""
Write-Host "Step 3: Checking service status..." -ForegroundColor Yellow
docker-compose ps

# Step 4: Test database connection
Write-Host ""
Write-Host "Step 4: Testing database connection..." -ForegroundColor Yellow
try {
    docker exec courtmate_postgres psql -U courtmate -d courtmate_db -c "SELECT 1;" | Out-Null
    Write-Host "✅ Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Database might still be starting. Wait a few more seconds." -ForegroundColor Yellow
}

# Step 5: Run migration
Write-Host ""
Write-Host "Step 5: Running migration..." -ForegroundColor Yellow
Set-Location backend
npm run migration:run

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 6: Verifying tables..." -ForegroundColor Yellow
    Set-Location ..
    docker exec courtmate_postgres psql -U courtmate -d courtmate_db -c "\dt"
    Write-Host ""
    Write-Host "✅ Migration test complete!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Migration failed. Check errors above." -ForegroundColor Red
    Set-Location ..
    exit 1
}

