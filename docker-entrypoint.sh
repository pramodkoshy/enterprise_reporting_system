#!/bin/sh
set -e

echo "========================================"
echo "Enterprise Reporting System - Entrypoint"
echo "Powered by Bun"
echo "========================================"

ensure_directories() {
  mkdir -p /app/data /app/uploads /app/job-outputs /app/logs /app/data/uploads
}

run_migrations() {
  echo "Running database migrations..."
  # Use node to run migrations since better-sqlite3 is not supported in Bun
  # Node.js should be available for running knex
  if command -v node >/dev/null 2>&1; then
    node -e "
      const knex = require('knex');
      const { existsSync } = require('fs');

      const migrationsDir = existsSync('/app/migrations') ? '/app/migrations' : '/app/src/lib/db/migrations';
      const seedsDir = existsSync('/app/seeds') ? '/app/seeds' : '/app/src/lib/db/seeds';

      const db = knex({
        client: 'better-sqlite3',
        connection: { filename: process.env.DATABASE_PATH || '/app/data/config.sqlite' },
        useNullAsDefault: true,
        migrations: { directory: migrationsDir },
        seeds: { directory: seedsDir },
        pool: {
          afterCreate: (conn, cb) => { conn.pragma('foreign_keys = ON'); cb(); }
        }
      });

      db.migrate.latest()
        .then(() => { console.log('Migrations complete'); return db.seed.run(); })
        .then(() => { console.log('Seeds complete'); process.exit(0); })
        .catch(e => { console.error('Migration error:', e.message); process.exit(1); });
    "
  else
    echo "Warning: Node.js not available, skipping migrations"
    echo "Migrations should be run during build time"
  fi
}

if [ ! -f /app/data/.initialized ]; then
  echo "Database not initialized. Running first-time setup..."
  ensure_directories
  run_migrations
  touch /app/data/.initialized
  echo "Database initialization completed!"
else
  echo "Database already initialized. Checking for pending migrations..."
  run_migrations
fi

echo "Starting application..."
echo "========================================"

exec su-exec bunuser:bunuser bun server.js
