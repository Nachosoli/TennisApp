# Run migrations on Railway using Railway CLI
# Usage: railway run npm run migration:run

Write-Host "🚀 Running migrations on Railway..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
try {
    railway --version | Out-Null
    Write-Host "✅ Railway CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI is not installed." -ForegroundColor Red
    Write-Host "Install it with: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
Write-Host ""
Write-Host "📡 Checking Railway connection..." -ForegroundColor Yellow
railway status

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not linked to a Railway project. Run 'railway link' first." -ForegroundColor Yellow
    exit 1
}

# Run migration
Write-Host ""
Write-Host "🔄 Running migrations..." -ForegroundColor Yellow
railway run npm run migration:run

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Migration failed. Check errors above." -ForegroundColor Red
    exit 1
}



