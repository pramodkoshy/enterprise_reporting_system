import { NextRequest, NextResponse } from 'next/server';

// This endpoint initializes the database
// It should only be used for first-time setup
export async function POST(request: NextRequest) {
  try {
    // Import modules
    const knex = require('knex');
    const path = require('path');
    const fs = require('fs');

    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'config.sqlite');

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create knex instance for SQLite
    const knexInstance = knex({
      client: 'better-sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });

    // Run migrations directly using createRequire
    const { createRequire } = require('module');
    const migrationsDir = '/app/migrations';

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    // Create require from a file that exists in the container
    const nodeRequire = createRequire('/app/server.js');

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    for (const file of migrationFiles) {
      try {
        const migrationPath = path.join(migrationsDir, file);

        console.log(`Loading migration: ${file}...`);
        const migration = nodeRequire(migrationPath);

        console.log(`Migration loaded: ${file}, up: ${typeof migration?.up}`);

        if (typeof migration?.up === 'function') {
          console.log(`Running migration: ${file}...`);
          await migration.up(knexInstance);
          console.log(`✅ Ran migration: ${file}`);
        } else {
          console.log(`⚠️  No up function in ${file}`);
        }
      } catch (error) {
        console.error(`❌ Failed to run migration ${file}:`, error);
        throw error;
      }
    }

    await knexInstance.destroy();

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Setup endpoint - POST to initialize database'
  });
}
