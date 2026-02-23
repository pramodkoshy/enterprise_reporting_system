import type { Knex } from "knex";
import path from "path";
import fs from "fs";

const isProduction = process.env.NODE_ENV === "production";

function getMigrationsDirectory(): string {
  if (isProduction) {
    const prodPath = "/app/migrations";
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }
  }
  return path.join(__dirname, "migrations");
}

function getSeedsDirectory(): string {
  if (isProduction) {
    const prodPath = "/app/seeds";
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }
  }
  return path.join(__dirname, "seeds");
}

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "better-sqlite3",
    connection: {
      filename: process.env.DATABASE_PATH || "./data/config.sqlite",
    },
    useNullAsDefault: true,
    migrations: {
      directory: getMigrationsDirectory(),
      extension: "ts",
    },
    seeds: {
      directory: getSeedsDirectory(),
      extension: "ts",
    },
    pool: {
      afterCreate: (conn: any, cb: () => void) => {
        conn.pragma("foreign_keys = ON");
        cb();
      },
    },
  },

  production: {
    client: "better-sqlite3", // Use sqlite3 which works with bun:sqlite wrapper
    connection: {
      filename: process.env.DATABASE_PATH || "/app/data/config.sqlite",
    },
    useNullAsDefault: true,
    migrations: {
      directory: getMigrationsDirectory(),
      extension: "js",
    },
    seeds: {
      directory: getSeedsDirectory(),
      extension: "js",
    },
    pool: {
      afterCreate: (conn: any, cb: () => void) => {
        conn.pragma("foreign_keys = ON");
        cb();
      },
    },
  },
};

export default config;
