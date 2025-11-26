#!/bin/bash
# Run migrations on Railway using Railway CLI
# Usage: railway run npm run migration:run

echo "🚀 Running migrations on Railway..."
echo "===================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI is installed"

# Check if logged in
echo ""
echo "📡 Checking Railway connection..."
railway status

if [ $? -ne 0 ]; then
    echo "⚠️  Not linked to a Railway project. Run 'railway link' first."
    exit 1
fi

# Run migration
echo ""
echo "🔄 Running migrations..."
railway run npm run migration:run

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
else
    echo ""
    echo "❌ Migration failed. Check errors above."
    exit 1
fi

