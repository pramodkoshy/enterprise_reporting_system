import knex, { Knex } from "knex";
import { join } from "path";
import type { DataSource, DatabaseClientType } from "@/types/database";
import { decrypt } from "@/lib/security/encryption";
import { getDb } from "@/lib/db/config";

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
  connectionConfig: ConnectionConfig,
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
    case "sqlite3":
      let filename = connectionConfig.filename || ":memory:";
      let fullPath: string;

      if (filename === ":memory:") {
        fullPath = filename;
      } else if (filename.startsWith("/")) {
        fullPath = filename;
      } else if (
        filename.startsWith("./data/") ||
        filename.startsWith("data/")
      ) {
        fullPath = join(process.cwd(), filename.replace(/^\.\//, ""));
      } else {
        fullPath = join(process.cwd(), "data", "uploads", filename);
      }

      return {
        ...baseConfig,
        client: "better-sqlite3",
        connection: {
          filename: fullPath,
        },
        useNullAsDefault: true,
      };

    case "pg":
      return {
        ...baseConfig,
        connection: {
          host: connectionConfig.host,
          port: connectionConfig.port || 5432,
          database: connectionConfig.database,
          user: connectionConfig.user,
          password: connectionConfig.password,
          ssl: connectionConfig.ssl ? { rejectUnauthorized: false } : undefined,
        },
      };

    case "mysql":
      return {
        ...baseConfig,
        client: "mysql2",
        connection: {
          host: connectionConfig.host,
          port: connectionConfig.port || 3306,
          database: connectionConfig.database,
          user: connectionConfig.user,
          password: connectionConfig.password,
          ssl: connectionConfig.ssl ? { rejectUnauthorized: false } : undefined,
        },
      };

    case "mssql":
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

    case "oracledb":
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

  console.warn(
    "[CONNECTION MANAGER] getConnection called for data source:",
    dataSource.name,
    "(ID:",
    dataSource.id,
    ")",
  );
  console.warn(
    "[CONNECTION MANAGER] Data source client type:",
    dataSource.client_type,
  );
  console.warn(
    "[CONNECTION MANAGER] Connection config ciphertext length:",
    dataSource.connection_config?.length,
  );

  if (connectionPool[poolKey]) {
    // Test the connection is still alive
    try {
      await connectionPool[poolKey].raw("SELECT 1");

      // Debug: Log cached connection
      console.log(
        "[CONNECTION MANAGER] Using cached connection for data source:",
        dataSource.name,
      );
      if (dataSource.client_type === "sqlite3") {
        try {
          const dbInfo = await connectionPool[poolKey].raw(
            "PRAGMA database_list",
          );
          console.log(
            "[CONNECTION MANAGER] SQLite database list (cached):",
            dbInfo,
          );
        } catch (e) {
          console.error("[CONNECTION MANAGER] Failed to get database list:", e);
        }
      }

      return connectionPool[poolKey];
    } catch {
      // Connection is dead, remove it and create a new one
      console.warn(
        "[CONNECTION MANAGER] Cached connection is dead, removing from pool",
      );
      await connectionPool[poolKey].destroy();
      delete connectionPool[poolKey];
    }
  }

  // Decrypt connection config (or parse plain JSON for backwards compatibility)
  console.warn("[CONNECTION MANAGER] About to decrypt connection config...");
  console.warn(
    "[CONNECTION MANAGER] Connection config ciphertext length:",
    dataSource.connection_config?.length,
  );
  console.warn(
    "[CONNECTION MANAGER] Connection config (first 100 chars):",
    dataSource.connection_config?.substring(0, 100),
  );

  let connectionConfig: ConnectionConfig;
  let needsEncryption = false;

  try {
    // Check if connection_config is encrypted (should be hex string with sufficient length)
    const isEncrypted =
      dataSource.connection_config.length > 64 &&
      /^[0-9a-fA-F]+$/.test(dataSource.connection_config);

    if (isEncrypted) {
      console.warn(
        "[CONNECTION MANAGER] Config appears to be encrypted, attempting decryption...",
      );
      const decryptedConfig = decrypt(dataSource.connection_config);
      console.warn("[CONNECTION MANAGER] Decryption successful!");
      console.warn(
        "[CONNECTION MANAGER] Decrypted config (first 200 chars):",
        decryptedConfig.substring(0, 200),
      );
      connectionConfig = JSON.parse(decryptedConfig);
      console.warn("[CONNECTION MANAGER] JSON parse successful!");
    } else {
      // Plain text JSON - backwards compatibility
      console.warn(
        "[CONNECTION MANAGER WARNING] Config appears to be plain JSON (not encrypted)!",
      );
      console.warn(
        "[CONNECTION MANAGER WARNING] This is a backwards compatibility mode.",
      );
      console.warn(
        "[CONNECTION MANAGER WARNING] Data source ID:",
        dataSource.id,
      );
      console.warn(
        "[CONNECTION MANAGER WARNING] Data source name:",
        dataSource.name,
      );
      console.warn(
        "[CONNECTION MANAGER WARNING] The config will be used as-is and re-encrypted on save.",
      );
      connectionConfig = JSON.parse(dataSource.connection_config);
      needsEncryption = true;
      console.warn(
        "[CONNECTION MANAGER] Plain JSON config parsed successfully",
      );
    }
  } catch (error) {
    console.error(
      "[CONNECTION MANAGER ERROR] Failed to parse connection config!",
    );
    console.error("[CONNECTION MANAGER ERROR] Data source ID:", dataSource.id);
    console.error(
      "[CONNECTION MANAGER ERROR] Data source name:",
      dataSource.name,
    );
    console.error(
      "[CONNECTION MANAGER ERROR] Connection config length:",
      dataSource.connection_config?.length,
    );
    console.error(
      "[CONNECTION MANAGER ERROR] Connection config (first 200 chars):",
      dataSource.connection_config?.substring(0, 200),
    );
    console.error("[CONNECTION MANAGER ERROR] Error:", error);
    throw error;
  }

  // If config was plain JSON, re-encrypt it for future use
  if (needsEncryption) {
    console.warn(
      "[CONNECTION MANAGER] Re-encrypting plain JSON config for data source:",
      dataSource.id,
    );
    try {
      const { encrypt } = await import("@/lib/security/encryption");
      const encryptedConfig = encrypt(JSON.stringify(connectionConfig));

      // Update in database (fire and forget - don't block connection)
      const db = getDb();
      db("data_sources")
        .where("id", dataSource.id)
        .update({ connection_config: encryptedConfig })
        .then(() => {
          console.warn(
            "[CONNECTION MANAGER] Config re-encrypted and saved successfully for data source:",
            dataSource.id,
          );
        })
        .catch((err) => {
          console.error(
            "[CONNECTION MANAGER ERROR] Failed to save re-encrypted config:",
            err,
          );
        });
    } catch (error) {
      console.error(
        "[CONNECTION MANAGER ERROR] Failed to re-encrypt config:",
        error,
      );
      // Continue anyway - we have the plain config
    }
  }

  // Debug: Log the connection config
  console.log(
    "[CONNECTION MANAGER] Creating connection for data source:",
    dataSource.name,
  );
  console.log("[CONNECTION MANAGER] Connection config:", {
    ...connectionConfig,
    password: connectionConfig.password ? "***" : undefined,
  });

  const knexConfig = buildKnexConfig(dataSource.client_type, connectionConfig);
  const connection = knex(knexConfig);

  // Test connection
  console.warn("[CONNECTION MANAGER] Testing connection with SELECT 1...");
  await connection.raw("SELECT 1");
  console.warn("[CONNECTION MANAGER] Connection test successful!");

  // Debug: Test query to see database file info
  if (dataSource.client_type === "sqlite3") {
    try {
      const dbInfo = await connection.raw("PRAGMA database_list");
      console.log("[CONNECTION MANAGER] SQLite database list:", dbInfo);
    } catch (e) {
      console.error("[CONNECTION MANAGER] Failed to get database list:", e);
    }
  }

  connectionPool[poolKey] = connection;
  console.warn("[CONNECTION MANAGER] Connection added to pool and returning");
  return connection;
}

export async function testConnection(
  clientType: DatabaseClientType,
  connectionConfig: ConnectionConfig,
): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();
  let connection: Knex | null = null;

  try {
    // For SQLite, verify the file exists first
    if (clientType === "sqlite3" && connectionConfig.filename) {
      const fs = await import("fs");

      // Build the full path the same way buildKnexConfig does
      const filename = connectionConfig.filename;
      const dbPath =
        filename.startsWith("/") || filename === ":memory:"
          ? filename
          : join(process.cwd(), "data", "uploads", filename);

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

    await connection.raw("SELECT 1");
    const latency = Date.now() - startTime;

    // For SQLite, verify we can actually query tables
    if (clientType === "sqlite3") {
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
      message: "Connection successful",
      latency,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
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
