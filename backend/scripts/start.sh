#!/bin/sh
# Startup script that runs migrations before starting the app

set -e  # Exit on any error

echo "🔄 Running database migrations..."
npm run migration:run

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migration failed. Container will not start."
  exit 1
fi

echo "🚀 Starting application..."
exec npm run start:prod


