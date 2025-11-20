#!/bin/bash

# Setup script for external network access
# This script helps configure Docker for external access

set -e

echo "🚀 CourtMate External Access Setup"
echo "===================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Please don't run this script as root"
   exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
echo "📍 Detected server IP: $SERVER_IP"
echo ""

# Ask for domain name
read -p "Enter your domain name (or press Enter to use IP): " DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    FRONTEND_URL="http://$SERVER_IP"
    BACKEND_URL="http://$SERVER_IP"
    USE_SSL=false
else
    FRONTEND_URL="https://$DOMAIN_NAME"
    BACKEND_URL="https://$DOMAIN_NAME"
    USE_SSL=true
fi

echo ""
echo "Configuration:"
echo "  Frontend URL: $FRONTEND_URL"
echo "  Backend URL: $BACKEND_URL"
echo "  Use SSL: $USE_SSL"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env 2>/dev/null || touch .env
fi

# Update .env file
echo ""
echo "📝 Updating .env file..."

# Function to update or add env variable
update_env() {
    local key=$1
    local value=$2
    
    if grep -q "^$key=" .env; then
        # Update existing
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^$key=.*|$key=$value|" .env
        else
            sed -i "s|^$key=.*|$key=$value|" .env
        fi
    else
        # Add new
        echo "$key=$value" >> .env
    fi
}

update_env "FRONTEND_URL" "$FRONTEND_URL"
update_env "BACKEND_URL" "$BACKEND_URL"
update_env "CORS_ORIGINS" "$FRONTEND_URL,http://localhost:3000"

# Setup nginx directories
echo ""
echo "📁 Creating nginx directories..."
mkdir -p nginx/ssl/live
mkdir -p nginx/www
mkdir -p nginx/logs

# SSL setup
if [ "$USE_SSL" = true ]; then
    echo ""
    echo "🔒 SSL Configuration"
    echo "==================="
    echo ""
    echo "To set up SSL certificates:"
    echo "1. Install certbot: sudo apt-get install certbot"
    echo "2. Get certificate: sudo certbot certonly --standalone -d $DOMAIN_NAME"
    echo "3. Copy certificates to nginx/ssl/live/$DOMAIN_NAME/"
    echo ""
    echo "Update nginx/nginx.conf and replace YOUR_DOMAIN with $DOMAIN_NAME"
else
    echo ""
    echo "ℹ️  Using HTTP-only configuration"
    echo "   Update docker-compose.external.yml to use nginx-http.conf for HTTP-only access"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review and update .env file with your configuration"
echo "2. Start services: docker-compose -f docker-compose.external.yml up -d --build"
echo "3. Check logs: docker-compose -f docker-compose.external.yml logs -f"
echo ""
echo "For detailed instructions, see EXTERNAL_ACCESS_SETUP.md"

