/**
 * Run database migrations
 * This script ensures all database tables are created before running tests
 */

import { getDb } from '../src/lib/db/config';
import { runMigrations } from '../src/lib/db/config';

async function main() {
  console.log('Starting database migrations...');

  try {
    const db = getDb();
    await runMigrations(db);
    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
