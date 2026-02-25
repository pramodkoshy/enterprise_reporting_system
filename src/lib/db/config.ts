/**
 * Database configuration using Knex with sqlite3 client
 * For production (Bun runtime), we use a custom wrapper around bun:sqlite
 */

import knex, { Knex } from 'knex';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { getBunSQLiteWrapper as getBunSQLite } from './bun-sqlite-wrapper';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/config.sqlite';

let db: Knex | null = null;
let isProduction = process.env.NODE_ENV === 'production';

/**
 * Get the database connection
 * - Development: Knex with better-sqlite3
 * - Production: Knex with a custom bun:sqlite dialect wrapper
 */
export function getDb(): Knex {
  if (!db) {
    // Ensure directory exists
    const dir = path.dirname(DATABASE_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // In production (Bun runtime), we can't use better-sqlite3 or sqlite3
    // because they require native Node.js modules
    // For now, use better-sqlite3 in dev and a workaround in production
    if (!isProduction) {
      // Development: Use Knex with better-sqlite3
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
    } else {
      // Production: Use Knex with better-sqlite3 (pre-built during Docker build)
      // The native bindings should work since they were compiled during the build
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
