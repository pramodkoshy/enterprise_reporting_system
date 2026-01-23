import type { Knex } from 'knex';
import path from 'path';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DATABASE_PATH || './data/config.sqlite',
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
      extension: 'ts',
    },
    pool: {
      afterCreate: (conn: any, cb: () => void) => {
        conn.pragma('foreign_keys = ON');
        cb();
      },
    },
  },

  production: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DATABASE_PATH || './data/config.sqlite',
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
      extension: 'ts',
    },
    pool: {
      afterCreate: (conn: any, cb: () => void) => {
        conn.pragma('foreign_keys = ON');
        cb();
      },
    },
  },
};

export default config;
