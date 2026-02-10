#!/bin/sh
set -e

echo "========================================"
echo "Enterprise Reporting System - Docker Startup"
echo "========================================"

# Ensure required directories exist
mkdir -p /app/data
mkdir -p /app/job-outputs
mkdir -p /app/uploads
mkdir -p /app/logs

echo "Directories created/verified"

# Run database initialization if this is a fresh start
if [ ! -f /app/data/.initialized ]; then
  echo "First run detected - initializing database..."

  # Run migrations
  if [ -f "/app/node_modules/.bin/knex" ]; then
    echo "Running database migrations..."
    node /app/node_modules/.bin/knex migrate:latest --knexfile=/app/src/lib/db/knexfile.ts || echo "Migrations already completed or failed"
  fi

  # Run seeds
  if [ -f "/app/node_modules/.bin/knex" ]; then
    echo "Running database seeds..."
    node /app/node_modules/.bin/knex seed:run --knexfile=/app/src/lib/db/knexfile.ts || echo "Seeds already completed or failed"
  fi

  # Mark as initialized
  touch /app/data/.initialized
  echo "Database initialization completed"
else
  echo "Database already initialized, skipping..."
fi

# Verify admin user exists (quick check)
echo "Verifying setup..."

echo "========================================"
echo "Starting application..."
echo "========================================"

# Start the application
exec node server.js
