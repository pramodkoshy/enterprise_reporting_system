import knex, { Knex } from 'knex';
import knexConfig from './knexfile';
import path from 'path';
import fs from 'fs';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

let db: Knex | null = null;

export function getDb(): Knex {
  if (!db) {
    db = knex(config);
  }
  return db;
}

// Alias for getDb() - used for clarity when accessing config database
export function getConfigDB(): Knex {
  return getDb();
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}

// Run migrations directly - this works in production builds
export async function runMigrations(knexInstance: Knex): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');

  // Read all migration files
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    .sort();

  for (const file of migrationFiles) {
    try {
      const migrationPath = path.join(migrationsDir, file);
      // Dynamic import for ESM compatibility
      const migration = await import(migrationPath);

      if (typeof migration.up === 'function') {
        await migration.up(knexInstance);
        console.log(`✅ Ran migration: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Failed to run migration ${file}:`, error);
      throw error;
    }
  }
}

export { knex };
export type { Knex };
