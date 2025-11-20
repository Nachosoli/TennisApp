#!/bin/bash

# Test Migration Script
# This script tests the database migration

echo "🚀 Testing CourtMate Database Migration"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Using defaults from config."
fi

# Check database connection
echo ""
echo "📡 Checking database connection..."
npm run migration:run

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📊 Verifying tables were created..."
    echo "Run this SQL to verify:"
    echo "  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
else
    echo ""
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

