#!/bin/sh
set -e

echo "========================================"
echo "Enterprise Reporting System - Entrypoint"
echo "========================================"

# Check if database is initialized
if [ ! -f /app/data/.initialized ]; then
  echo "Database not initialized. Running first-time setup..."

  # Ensure directories exist with correct permissions
  mkdir -p /app/data /app/uploads /app/job-outputs /app/logs

  # Run migrations
  echo "Running database migrations..."
  node /app/node_modules/.bin/knex migrate:latest --knexfile=/app/src/lib/db/knexfile.ts || echo "Migrations may have already run"

  # Run seeds
  echo "Running database seeds..."
  node /app/node_modules/.bin/knex seed:run --knexfile=/app/src/lib/db/knexfile.ts || echo "Seeds may have already run"

  # Mark as initialized
  touch /app/data/.initialized
  echo "Database initialization completed!"
else
  echo "Database already initialized. Skipping setup."
fi

echo "Starting application..."
echo "========================================"

# Start the application as nextjs user
exec su-exec nextjs:nodejs node server.js
