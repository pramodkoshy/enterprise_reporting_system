import { NextRequest, NextResponse } from 'next/server';

// This endpoint initializes the database
// It should only be used for first-time setup
export async function POST(request: NextRequest) {
  try {
    // Import knex dynamically to avoid build issues
    const knex = require('knex');
    const path = require('path');

    // Create knex instance for SQLite
    const knexInstance = knex({
      client: 'better-sqlite3',
      connection: {
        filename: process.env.DATABASE_PATH || './data/config.sqlite',
      },
      useNullAsDefault: true,
      migrations: {
        directory: path.join(process.cwd(), 'src/lib/db/migrations'),
        extension: 'ts',
      },
    });

    // Run migrations
    await knexInstance.migrate.latest();

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
