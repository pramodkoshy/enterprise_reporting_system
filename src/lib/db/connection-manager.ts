import knex, { Knex } from 'knex';
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
      return {
        ...baseConfig,
        client: 'better-sqlite3',
        connection: {
          filename: connectionConfig.filename || ':memory:',
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
        },
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

  const knexConfig = buildKnexConfig(dataSource.client_type, connectionConfig);
  const connection = knex(knexConfig);

  // Test connection
  await connection.raw('SELECT 1');

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
    const knexConfig = buildKnexConfig(clientType, connectionConfig);
    connection = knex(knexConfig);

    await connection.raw('SELECT 1');
    const latency = Date.now() - startTime;

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
