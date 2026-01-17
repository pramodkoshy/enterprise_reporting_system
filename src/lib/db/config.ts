import knex, { Knex } from 'knex';
import knexConfig from './knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

let db: Knex | null = null;

export function getDb(): Knex {
  if (!db) {
    db = knex(config);
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}

export { knex };
export type { Knex };
