import type { Knex } from 'knex';
import type { SchemaInfo, TableInfo, ViewInfo, ColumnSchema, ForeignKeyInfo, IndexInfo } from '@/types/api';

interface IntrospectionResult {
  schema: SchemaInfo;
  logs: string[];
}

export async function introspectSchema(connection: Knex, dialect: string): Promise<IntrospectionResult> {
  const logs: string[] = [];

  const addLog = (message: string) => {
    logs.push(`[${new Date().toISOString()}] ${message}`);
    console.log(message);
  };

  const result = await introspectSchemaInternal(connection, dialect, addLog);

  return {
    schema: result,
    logs,
  };
}

async function introspectSchemaInternal(connection: Knex, dialect: string, addLog: (msg: string) => void): Promise<SchemaInfo> {
  switch (dialect) {
    case 'pg':
      return introspectPostgres(connection, addLog);
    case 'mysql':
      return introspectMySQL(connection, addLog);
    case 'sqlite3':
      return introspectSQLite(connection, addLog);
    case 'mssql':
      return introspectMSSQL(connection, addLog);
    default:
      return introspectGeneric(connection, addLog);
  }
}

async function introspectPostgres(connection: Knex, addLog: (msg: string) => void): Promise<SchemaInfo> {
  // Get tables
  const tables = await connection.raw(`
    SELECT table_name, table_schema
    FROM information_schema.tables
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  // Get views
  const views = await connection.raw(`
    SELECT table_name, table_schema, view_definition
    FROM information_schema.views
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_name
  `);

  const tableInfos: TableInfo[] = await Promise.all(
    tables.rows.map(async (t: { table_name: string; table_schema: string }) => {
      const columns = await getPostgresColumns(connection, t.table_schema, t.table_name);
      const primaryKey = await getPostgresPrimaryKey(connection, t.table_schema, t.table_name);
      const foreignKeys = await getPostgresForeignKeys(connection, t.table_schema, t.table_name);
      const indexes = await getPostgresIndexes(connection, t.table_schema, t.table_name);

      return {
        name: t.table_name,
        schema: t.table_schema,
        columns,
        primaryKey,
        foreignKeys,
        indexes,
      };
    })
  );

  const viewInfos: ViewInfo[] = await Promise.all(
    views.rows.map(async (v: { table_name: string; table_schema: string; view_definition: string }) => {
      const columns = await getPostgresColumns(connection, v.table_schema, v.table_name);
      return {
        name: v.table_name,
        schema: v.table_schema,
        columns,
        definition: v.view_definition,
      };
    })
  );

  return { tables: tableInfos, views: viewInfos };
}

async function getPostgresColumns(
  connection: Knex,
  schema: string,
  table: string
): Promise<ColumnSchema[]> {
  const result = await connection.raw(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = ? AND table_name = ?
    ORDER BY ordinal_position
  `, [schema, table]);

  return result.rows.map((c: {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
    character_maximum_length: number | null;
  }) => ({
    name: c.column_name,
    type: c.character_maximum_length
      ? `${c.data_type}(${c.character_maximum_length})`
      : c.data_type,
    nullable: c.is_nullable === 'YES',
    defaultValue: c.column_default,
  }));
}

async function getPostgresPrimaryKey(
  connection: Knex,
  schema: string,
  table: string
): Promise<string[]> {
  const result = await connection.raw(`
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE i.indisprimary
    AND n.nspname = ?
    AND c.relname = ?
  `, [schema, table]);

  return result.rows.map((r: { attname: string }) => r.attname);
}

async function getPostgresForeignKeys(
  connection: Knex,
  schema: string,
  table: string
): Promise<ForeignKeyInfo[]> {
  const result = await connection.raw(`
    SELECT
      kcu.column_name,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = ?
    AND tc.table_name = ?
  `, [schema, table]);

  return result.rows.map((r: {
    column_name: string;
    referenced_table: string;
    referenced_column: string;
  }) => ({
    column: r.column_name,
    referencedTable: r.referenced_table,
    referencedColumn: r.referenced_column,
  }));
}

async function getPostgresIndexes(
  connection: Knex,
  schema: string,
  table: string
): Promise<IndexInfo[]> {
  const result = await connection.raw(`
    SELECT
      i.relname as index_name,
      ix.indisunique as is_unique,
      array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns
    FROM pg_index ix
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE n.nspname = ?
    AND t.relname = ?
    AND NOT ix.indisprimary
    GROUP BY i.relname, ix.indisunique
  `, [schema, table]);

  return result.rows.map((r: {
    index_name: string;
    is_unique: boolean;
    columns: string[];
  }) => ({
    name: r.index_name,
    columns: r.columns,
    unique: r.is_unique,
  }));
}

async function introspectMySQL(connection: Knex, addLog: (msg: string) => void): Promise<SchemaInfo> {
  const tables = await connection.raw(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
    AND table_type = 'BASE TABLE'
  `);

  const views = await connection.raw(`
    SELECT table_name, view_definition
    FROM information_schema.views
    WHERE table_schema = DATABASE()
  `);

  const tableInfos: TableInfo[] = await Promise.all(
    tables[0].map(async (t: { table_name: string }) => {
      const columns = await getMySQLColumns(connection, t.table_name);
      return {
        name: t.table_name,
        columns,
      };
    })
  );

  const viewInfos: ViewInfo[] = views[0].map((v: { table_name: string; view_definition: string }) => ({
    name: v.table_name,
    columns: [],
    definition: v.view_definition,
  }));

  return { tables: tableInfos, views: viewInfos };
}

async function getMySQLColumns(connection: Knex, table: string): Promise<ColumnSchema[]> {
  const result = await connection.raw(`DESCRIBE ??`, [table]);
  return result[0].map((c: {
    Field: string;
    Type: string;
    Null: string;
    Default: string | null;
    Key: string;
  }) => ({
    name: c.Field,
    type: c.Type,
    nullable: c.Null === 'YES',
    defaultValue: c.Default,
    isPrimaryKey: c.Key === 'PRI',
  }));
}

async function introspectSQLite(connection: Knex, addLog: (msg: string) => void): Promise<SchemaInfo> {
  addLog('Starting SQLite schema introspection');

  // First, check if we can query the database at all
  try {
    await connection.raw('SELECT 1');
    addLog('Database connection test successful');
  } catch (error) {
    addLog(`SQLite connection test failed: ${error}`);
    console.error('SQLite connection test failed:', error);
    return { tables: [], views: [] };
  }

  const tables = await connection.raw(`
    SELECT name FROM sqlite_master
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);

  const views = await connection.raw(`
    SELECT name, sql FROM sqlite_master
    WHERE type = 'view'
    ORDER BY name
  `);

  // Debug: Inspect the raw result structure
  addLog(`Tables result type: ${typeof tables}`);
  addLog(`Tables result isArray: ${Array.isArray(tables)}`);
  addLog(`Tables result: ${JSON.stringify(tables).substring(0, 200)}...`);

  // better-sqlite3 with Knex returns results in different formats
  // Try to extract the actual array of results
  let tableList: any[] = [];

  // Try various possible formats
  if (Array.isArray(tables) && tables.length > 0 && typeof tables[0] === 'object') {
    // Array of objects
    tableList = tables;
    addLog(`Extracted ${tableList.length} tables as direct array`);
  } else if (tables?.rows && Array.isArray(tables.rows)) {
    tableList = tables.rows;
    addLog(`Extracted ${tableList.length} tables from .rows property`);
  } else if (tables?.[0] && Array.isArray(tables[0])) {
    tableList = tables[0];
    addLog(`Extracted ${tableList.length} tables from nested array`);
  } else if (typeof tables === 'object' && tables !== null) {
    // Try to find the array in the object
    const values = Object.values(tables);
    for (const val of values) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        tableList = val;
        addLog(`Extracted ${tableList.length} tables from object values`);
        break;
      }
    }
  }

  addLog(`Final tableList length: ${tableList.length}`);

  let viewList: any[] = [];
  if (Array.isArray(views)) {
    viewList = views;
  } else if (views?.rows && Array.isArray(views.rows)) {
    viewList = views.rows;
  } else if (views?.[0] && Array.isArray(views[0])) {
    viewList = views[0];
  } else if (typeof views === 'object' && views !== null) {
    const values = Object.values(views);
    for (const val of values) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        viewList = val;
        break;
      }
    }
  }

  addLog(`Found ${viewList.length} views`);

  const tableInfos: TableInfo[] = await Promise.all(
    tableList.map(async (t: { name: string } | any) => {
      const tableName = typeof t === 'string' ? t : t.name;
      addLog(`Processing table: ${tableName}`);
      const columns = await getSQLiteColumns(connection, tableName, addLog);
      return {
        name: tableName,
        columns,
      };
    })
  );

  const viewInfos: ViewInfo[] = viewList.map((v: { name: string; sql: string } | any) => ({
    name: typeof v === 'string' ? v : v.name,
    columns: [],
    definition: typeof v === 'string' ? undefined : v.sql,
  }));

  addLog(`Schema introspection complete: ${tableInfos.length} tables, ${viewInfos.length} views`);

  return { tables: tableInfos, views: viewInfos };
}

async function getSQLiteColumns(connection: Knex, table: string, addLog: (msg: string) => void): Promise<ColumnSchema[]> {
  const result = await connection.raw(`PRAGMA table_info(??)`, [table]);

  addLog(`Fetching columns for table: ${table}`);

  // Handle different result formats from better-sqlite3
  let columns: any[] = [];
  if (Array.isArray(result)) {
    columns = result;
  } else if (result?.rows && Array.isArray(result.rows)) {
    columns = result.rows;
  } else if (result?.[0] && Array.isArray(result[0])) {
    columns = result[0];
  }

  addLog(`Found ${columns.length} columns for table: ${table}`);

  return columns.map((c: {
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }) => ({
    name: c.name,
    type: c.type || 'ANY',
    nullable: c.notnull === 0,
    defaultValue: c.dflt_value,
    isPrimaryKey: c.pk === 1,
  }));
}

async function introspectMSSQL(connection: Knex, addLog: (msg: string) => void): Promise<SchemaInfo> {
  const tables = await connection.raw(`
    SELECT table_name, table_schema
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const views = await connection.raw(`
    SELECT table_name, table_schema, view_definition
    FROM information_schema.views
    ORDER BY table_name
  `);

  const tableInfos: TableInfo[] = await Promise.all(
    tables.map(async (t: { table_name: string; table_schema: string }) => {
      const columns = await getMSSQLColumns(connection, t.table_schema, t.table_name);
      return {
        name: t.table_name,
        schema: t.table_schema,
        columns,
      };
    })
  );

  const viewInfos: ViewInfo[] = views.map((v: {
    table_name: string;
    table_schema: string;
    view_definition: string;
  }) => ({
    name: v.table_name,
    schema: v.table_schema,
    columns: [],
    definition: v.view_definition,
  }));

  return { tables: tableInfos, views: viewInfos };
}

async function getMSSQLColumns(
  connection: Knex,
  schema: string,
  table: string
): Promise<ColumnSchema[]> {
  const result = await connection.raw(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = ? AND table_name = ?
    ORDER BY ordinal_position
  `, [schema, table]);

  return result.map((c: {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
    character_maximum_length: number | null;
  }) => ({
    name: c.column_name,
    type: c.character_maximum_length
      ? `${c.data_type}(${c.character_maximum_length})`
      : c.data_type,
    nullable: c.is_nullable === 'YES',
    defaultValue: c.column_default,
  }));
}

async function introspectGeneric(connection: Knex, addLog: (msg: string) => void): Promise<SchemaInfo> {
  // Basic fallback for unknown databases
  return { tables: [], views: [] };
}
