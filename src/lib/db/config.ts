/**
 * Database configuration using Knex with sqlite3 client
 * sqlite3 client works with Bun runtime (no better-sqlite3)
 */

import knex, { Knex } from 'knex';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/config.sqlite';

let db: Knex | null = null;

/**
 * Get the database connection using Knex with sqlite3 client
 * sqlite3 client is compatible with Bun runtime
 */
export function getDb(): Knex {
  if (!db) {
    // Ensure directory exists
    const dir = path.dirname(DATABASE_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Create Knex instance with better-sqlite3 client
    // Using --ignore-scripts so native module compilation is skipped
    db = knex({
      client: 'better-sqlite3',
      connection: {
        filename: DATABASE_PATH,
      },
      useNullAsDefault: true,
      pool: {
        min: 0,
        max: 10,
      },
    });

    // Enable foreign keys
    db.raw('PRAGMA foreign_keys = ON').catch((err) => {
      console.error('Failed to enable foreign keys:', err);
    });
  }
  return db;
}

// Alias for getDb() - used for clarity when accessing config database
export function getConfigDB(): Knex {
  return getDb();
}

/**
 * Close the database connection
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}
