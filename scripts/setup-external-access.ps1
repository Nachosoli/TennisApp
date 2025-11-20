# PowerShell script for setting up external network access on Windows

Write-Host "🚀 CourtMate External Access Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
} catch {
    Write-Host "❌ docker-compose not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Get server IP
try {
    $SERVER_IP = (Invoke-WebRequest -Uri "https://ifconfig.me" -UseBasicParsing).Content.Trim()
} catch {
    $SERVER_IP = "YOUR_SERVER_IP"
}

Write-Host "📍 Detected server IP: $SERVER_IP" -ForegroundColor Yellow
Write-Host ""

# Ask for domain name
$DOMAIN_NAME = Read-Host "Enter your domain name (or press Enter to use IP)"

if ([string]::IsNullOrWhiteSpace($DOMAIN_NAME)) {
    $FRONTEND_URL = "http://$SERVER_IP"
    $BACKEND_URL = "http://$SERVER_IP"
    $USE_SSL = $false
} else {
    $FRONTEND_URL = "https://$DOMAIN_NAME"
    $BACKEND_URL = "https://$DOMAIN_NAME"
    $USE_SSL = $true
}

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Frontend URL: $FRONTEND_URL"
Write-Host "  Backend URL: $BACKEND_URL"
Write-Host "  Use SSL: $USE_SSL"
Write-Host ""

# Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
    } else {
        New-Item -ItemType File -Path .env | Out-Null
    }
}

# Function to update or add env variable
function Update-EnvVariable {
    param(
        [string]$Key,
        [string]$Value
    )
    
    $content = Get-Content .env -ErrorAction SilentlyContinue
    $found = $false
    
    for ($i = 0; $i -lt $content.Length; $i++) {
        if ($content[$i] -match "^$Key=") {
            $content[$i] = "$Key=$Value"
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        $content += "$Key=$Value"
    }
    
    $content | Set-Content .env
}

# Update .env file
Write-Host "📝 Updating .env file..." -ForegroundColor Yellow
Update-EnvVariable "FRONTEND_URL" $FRONTEND_URL
Update-EnvVariable "BACKEND_URL" $BACKEND_URL
Update-EnvVariable "CORS_ORIGINS" "$FRONTEND_URL,http://localhost:3000"

# Setup nginx directories
Write-Host ""
Write-Host "📁 Creating nginx directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "nginx\ssl\live" | Out-Null
New-Item -ItemType Directory -Force -Path "nginx\www" | Out-Null
New-Item -ItemType Directory -Force -Path "nginx\logs" | Out-Null

# SSL setup
if ($USE_SSL) {
    Write-Host ""
    Write-Host "🔒 SSL Configuration" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To set up SSL certificates:" -ForegroundColor Yellow
    Write-Host "1. Install certbot or use a certificate provider"
    Write-Host "2. Get certificate for $DOMAIN_NAME"
    Write-Host "3. Copy certificates to nginx\ssl\live\$DOMAIN_NAME\"
    Write-Host ""
    Write-Host "Update nginx\nginx.conf and replace YOUR_DOMAIN with $DOMAIN_NAME" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "ℹ️  Using HTTP-only configuration" -ForegroundColor Yellow
    Write-Host "   Update docker-compose.external.yml to use nginx-http.conf for HTTP-only access"
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review and update .env file with your configuration"
Write-Host "2. Start services: docker-compose -f docker-compose.external.yml up -d --build"
Write-Host "3. Check logs: docker-compose -f docker-compose.external.yml logs -f"
Write-Host ""
Write-Host "For detailed instructions, see EXTERNAL_ACCESS_SETUP.md"

