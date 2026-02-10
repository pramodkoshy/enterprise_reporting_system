import { NextRequest, NextResponse } from 'next/server';

// This endpoint seeds the database with initial data
// It should only be used after migrations have been run
export async function POST(request: NextRequest) {
  try {
    // Import modules
    const knex = require('knex');
    const path = require('path');
    const fs = require('fs');

    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'config.sqlite');

    // Create knex instance for SQLite
    const knexInstance = knex({
      client: 'better-sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });

    // Run seed directly using createRequire
    const { createRequire } = require('module');
    const seedsDir = '/app/seeds';

    if (!fs.existsSync(seedsDir)) {
      throw new Error(`Seeds directory not found: ${seedsDir}`);
    }

    // Create require from node_modules path
    const nodeRequire = createRequire('/app/node_modules/knex');

    const seedFiles = fs.readdirSync(seedsDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    for (const file of seedFiles) {
      try {
        const seedPath = path.join(seedsDir, file);

        console.log(`Loading seed: ${file}...`);
        const seedModule = nodeRequire(seedPath);

        console.log(`Seed loaded: ${file}, seed: ${typeof seedModule?.seed}`);

        if (typeof seedModule?.seed === 'function') {
          console.log(`Running seed: ${file}...`);
          await seedModule.seed(knexInstance);
          console.log(`✅ Ran seed: ${file}`);
        } else {
          console.log(`⚠️  No seed function in ${file}`);
        }
      } catch (error) {
        console.error(`❌ Failed to run seed ${file}:`, error);
        throw error;
      }
    }

    await knexInstance.destroy();

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      credentials: {
        email: 'admin@admin.com',
        password: 'admin'
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Seed endpoint - POST to seed database with initial data'
  });
}
