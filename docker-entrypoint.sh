#!/bin/sh
set -e

echo "========================================"
echo "Enterprise Reporting System - Entrypoint"
echo "Powered by Bun"
echo "========================================"

ensure_directories() {
  mkdir -p /app/data /app/uploads /app/job-outputs /app/logs /app/data/uploads
}

# Ensure required directories exist
ensure_directories

# Note: Migrations are run during the build process in the builder stage
# We skip migrations at runtime to avoid better-sqlite3 compatibility issues with Bun

echo "Starting application..."
echo "========================================"

exec su-exec bunuser:bunuser bun server.js
