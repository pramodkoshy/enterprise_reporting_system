import knex, { Knex } from 'knex';
import { join } from 'path';
import type { DataSource, DatabaseClientType } from '@/types/database';
import { decrypt } from '@/lib/security/encryption';

interface ConnectionPool {
  [key: string]: Knex;
}

const connectionPool: ConnectionPool = {};

interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  filename?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

function buildKnexConfig(
  clientType: DatabaseClientType,
  connectionConfig: ConnectionConfig
): Knex.Config {
  const baseConfig: Knex.Config = {
    client: clientType,
    pool: {
      min: 0,
      max: 10,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 600000,
    },
  };

  switch (clientType) {
    case 'sqlite3':
      const filename = connectionConfig.filename || ':memory:';
      // If it's not an absolute path and not memory, prepend data/uploads/
      const fullPath = filename.startsWith('/') || filename === ':memory:'
        ? filename
        : join(process.cwd(), 'data', 'uploads', filename);

      return {
        ...baseConfig,
        client: 'better-sqlite3',
        connection: {
          filename: fullPath,
        },
        useNullAsDefault: true,
      };

    case 'pg':
      return {
        ...baseConfig,
        connection: {
          host: connectionConfig.host,
          port: connectionConfig.port || 5432,
          database: connectionConfig.database,
          user: connectionConfig.user,
          password: connectionConfig.password,
          ssl: connectionConfig.ssl
            ? { rejectUnauthorized: false }
            : undefined,
        },
      };

    case 'mysql':
      return {
        ...baseConfig,
        client: 'mysql2',
        connection: {
          host: connectionConfig.host,
          port: connectionConfig.port || 3306,
          database: connectionConfig.database,
          user: connectionConfig.user,
          password: connectionConfig.password,
          ssl: connectionConfig.ssl
            ? { rejectUnauthorized: false }
            : undefined,
        },
      };

    case 'mssql':
      return {
        ...baseConfig,
        connection: {
          server: connectionConfig.host,
          port: connectionConfig.port || 1433,
          database: connectionConfig.database,
          user: connectionConfig.user,
          password: connectionConfig.password,
          options: {
            encrypt: connectionConfig.ssl || false,
            trustServerCertificate: true,
          },
        } as any,
      };

    case 'oracledb':
      return {
        ...baseConfig,
        connection: {
          host: connectionConfig.host,
          port: connectionConfig.port || 1521,
          database: connectionConfig.database,
          user: connectionConfig.user,
          password: connectionConfig.password,
        },
      };

    default:
      throw new Error(`Unsupported database client: ${clientType}`);
  }
}

export async function getConnection(dataSource: DataSource): Promise<Knex> {
  const poolKey = dataSource.id;

  if (connectionPool[poolKey]) {
    // Test the connection is still alive
    try {
      await connectionPool[poolKey].raw('SELECT 1');

      // Debug: Log cached connection
      console.log('Using cached connection for data source:', dataSource.name);
      if (dataSource.client_type === 'sqlite3') {
        try {
          const dbInfo = await connectionPool[poolKey].raw('PRAGMA database_list');
          console.log('SQLite database list (cached):', dbInfo);
        } catch (e) {
          console.error('Failed to get database list:', e);
        }
      }

      return connectionPool[poolKey];
    } catch {
      // Connection is dead, remove it and create a new one
      await connectionPool[poolKey].destroy();
      delete connectionPool[poolKey];
    }
  }

  // Decrypt connection config
  const connectionConfig: ConnectionConfig = JSON.parse(
    decrypt(dataSource.connection_config)
  );

  // Debug: Log the connection config
  console.log('Creating connection for data source:', dataSource.name);
  console.log('Connection config:', {
    ...connectionConfig,
    password: connectionConfig.password ? '***' : undefined,
  });

  const knexConfig = buildKnexConfig(dataSource.client_type, connectionConfig);
  const connection = knex(knexConfig);

  // Test connection
  await connection.raw('SELECT 1');

  // Debug: Test query to see database file info
  if (dataSource.client_type === 'sqlite3') {
    try {
      const dbInfo = await connection.raw('PRAGMA database_list');
      console.log('SQLite database list:', dbInfo);
    } catch (e) {
      console.error('Failed to get database list:', e);
    }
  }

  connectionPool[poolKey] = connection;
  return connection;
}

export async function testConnection(
  clientType: DatabaseClientType,
  connectionConfig: ConnectionConfig
): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();
  let connection: Knex | null = null;

  try {
    // For SQLite, verify the file exists first
    if (clientType === 'sqlite3' && connectionConfig.filename) {
      const fs = await import('fs');

      // Build the full path the same way buildKnexConfig does
      const filename = connectionConfig.filename;
      const dbPath = filename.startsWith('/') || filename === ':memory:'
        ? filename
        : join(process.cwd(), 'data', 'uploads', filename);

      // Check if file exists
      if (!fs.existsSync(dbPath)) {
        return {
          success: false,
          message: `Database file not found: ${dbPath}`,
        };
      }

      // Check if file is not empty
      const stats = fs.statSync(dbPath);
      if (stats.size === 0) {
        return {
          success: false,
          message: `Database file is empty: ${dbPath}`,
        };
      }
    }

    const knexConfig = buildKnexConfig(clientType, connectionConfig);
    connection = knex(knexConfig);

    await connection.raw('SELECT 1');
    const latency = Date.now() - startTime;

    // For SQLite, verify we can actually query tables
    if (clientType === 'sqlite3') {
      const tables = await connection.raw(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        LIMIT 1
      `);

      const hasTables = tables && tables.length > 0;
      if (hasTables) {
        return {
          success: true,
          message: `Connection successful. Database contains tables.`,
          latency,
        };
      } else {
        return {
          success: true,
          message: `Connected, but database appears to be empty (no tables found)`,
          latency,
        };
      }
    }

    return {
      success: true,
      message: 'Connection successful',
      latency,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (connection) {
      await connection.destroy();
    }
  }
}

export async function closeConnection(dataSourceId: string): Promise<void> {
  if (connectionPool[dataSourceId]) {
    await connectionPool[dataSourceId].destroy();
    delete connectionPool[dataSourceId];
  }
}

export async function closeAllConnections(): Promise<void> {
  const closePromises = Object.keys(connectionPool).map(async (key) => {
    await connectionPool[key].destroy();
    delete connectionPool[key];
  });
  await Promise.all(closePromises);
}

export function getActiveConnections(): string[] {
  return Object.keys(connectionPool);
}
