import { Parser } from 'node-sql-parser';
import { format as formatSQL } from 'sql-formatter';

export interface SQLValidationResult {
  isValid: boolean;
  errors: SQLError[];
  warnings: SQLWarning[];
  ast?: unknown;
  formattedSQL?: string;
}

export interface SQLError {
  message: string;
  line?: number;
  column?: number;
  offset?: number;
}

export interface SQLWarning {
  message: string;
  line?: number;
  column?: number;
  type: 'performance' | 'security' | 'style';
}

type SQLDialect = 'postgresql' | 'mysql' | 'transactsql' | 'sqlite' | 'bigquery';

const dialectMap: Record<string, SQLDialect> = {
  pg: 'postgresql',
  mysql: 'mysql',
  mssql: 'transactsql',
  sqlite3: 'sqlite',
  oracledb: 'bigquery', // Closest approximation
};

const parser = new Parser();

export function validateSQL(
  sql: string,
  dialect: string = 'pg'
): SQLValidationResult {
  const errors: SQLError[] = [];
  const warnings: SQLWarning[] = [];
  let ast: unknown = null;
  let formattedSQL: string | undefined;

  const parserDialect = dialectMap[dialect] || 'postgresql';

  try {
    // Parse the SQL to check syntax
    ast = parser.astify(sql, { database: parserDialect });

    // Try to format the SQL
    try {
      formattedSQL = formatSQL(sql, {
        language: dialect === 'pg' ? 'postgresql' : dialect === 'mysql' ? 'mysql' : 'sql',
        tabWidth: 2,
        keywordCase: 'upper',
      });
    } catch {
      // Formatting failed but SQL is valid
    }

    // Security warnings
    checkSecurityIssues(sql, warnings);

    // Performance warnings
    checkPerformanceIssues(sql, ast, warnings);

    return {
      isValid: true,
      errors,
      warnings,
      ast,
      formattedSQL,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Try to extract line/column information from the error
    const lineMatch = errorMessage.match(/line\s+(\d+)/i);
    const columnMatch = errorMessage.match(/column\s+(\d+)/i);

    errors.push({
      message: errorMessage,
      line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
      column: columnMatch ? parseInt(columnMatch[1], 10) : undefined,
    });

    return {
      isValid: false,
      errors,
      warnings,
    };
  }
}

function checkSecurityIssues(sql: string, warnings: SQLWarning[]): void {
  const sqlUpper = sql.toUpperCase();

  // Check for DROP statements
  if (/\bDROP\s+(TABLE|DATABASE|INDEX|VIEW)\b/i.test(sql)) {
    warnings.push({
      message: 'DROP statement detected - this will permanently delete data',
      type: 'security',
    });
  }

  // Check for TRUNCATE statements
  if (/\bTRUNCATE\b/i.test(sql)) {
    warnings.push({
      message: 'TRUNCATE statement detected - this will delete all rows',
      type: 'security',
    });
  }

  // Check for DELETE without WHERE
  if (/\bDELETE\s+FROM\b/i.test(sql) && !/\bWHERE\b/i.test(sql)) {
    warnings.push({
      message: 'DELETE without WHERE clause - this will delete all rows',
      type: 'security',
    });
  }

  // Check for UPDATE without WHERE
  if (/\bUPDATE\b/i.test(sql) && !/\bWHERE\b/i.test(sql)) {
    warnings.push({
      message: 'UPDATE without WHERE clause - this will update all rows',
      type: 'security',
    });
  }

  // Check for potential SQL injection patterns
  if (/('|")\s*;\s*--/i.test(sql) || /'\s*OR\s+'?\d+'?\s*=\s*'?\d+/i.test(sql)) {
    warnings.push({
      message: 'Potential SQL injection pattern detected',
      type: 'security',
    });
  }
}

function checkPerformanceIssues(
  sql: string,
  ast: unknown,
  warnings: SQLWarning[]
): void {
  // Check for SELECT *
  if (/\bSELECT\s+\*/i.test(sql)) {
    warnings.push({
      message: 'SELECT * detected - consider selecting only needed columns',
      type: 'performance',
    });
  }

  // Check for missing LIMIT
  if (/\bSELECT\b/i.test(sql) && !/\bLIMIT\b/i.test(sql) && !/\bTOP\b/i.test(sql)) {
    warnings.push({
      message: 'Query without LIMIT - consider adding a limit for large tables',
      type: 'performance',
    });
  }

  // Check for LIKE with leading wildcard
  if (/\bLIKE\s+['"]%/i.test(sql)) {
    warnings.push({
      message: 'LIKE with leading wildcard may prevent index usage',
      type: 'performance',
    });
  }

  // Check for OR in WHERE clause
  if (/\bWHERE\b.*\bOR\b/i.test(sql)) {
    warnings.push({
      message: 'OR in WHERE clause may prevent optimal index usage - consider UNION',
      type: 'performance',
    });
  }

  // Check for functions on indexed columns
  if (/\bWHERE\b.*\b(UPPER|LOWER|TRIM|SUBSTRING|CAST|CONVERT)\s*\(/i.test(sql)) {
    warnings.push({
      message: 'Function on column in WHERE clause may prevent index usage',
      type: 'performance',
    });
  }
}

export function formatSQLCode(sql: string, dialect: string = 'pg'): string {
  try {
    return formatSQL(sql, {
      language: dialect === 'pg' ? 'postgresql' : dialect === 'mysql' ? 'mysql' : 'sql',
      tabWidth: 2,
      keywordCase: 'upper',
    });
  } catch {
    return sql;
  }
}

export function extractTables(sql: string, dialect: string = 'pg'): string[] {
  try {
    const parserDialect = dialectMap[dialect] || 'postgresql';
    const tables = parser.tableList(sql, { database: parserDialect });
    return tables.map((t: string) => {
      const parts = t.split('::');
      return parts[parts.length - 1];
    });
  } catch {
    return [];
  }
}

export function extractColumns(sql: string, dialect: string = 'pg'): string[] {
  try {
    const parserDialect = dialectMap[dialect] || 'postgresql';
    const columns = parser.columnList(sql, { database: parserDialect });
    return columns.map((c: string) => {
      const parts = c.split('::');
      return parts[parts.length - 1];
    });
  } catch {
    return [];
  }
}

export function isReadOnlyQuery(sql: string): boolean {
  const sqlTrimmed = sql.trim().toUpperCase();
  return (
    sqlTrimmed.startsWith('SELECT') ||
    sqlTrimmed.startsWith('WITH') ||
    sqlTrimmed.startsWith('EXPLAIN') ||
    sqlTrimmed.startsWith('SHOW') ||
    sqlTrimmed.startsWith('DESCRIBE')
  );
}
