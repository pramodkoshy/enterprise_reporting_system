import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { getConnection } from '@/lib/db/connection-manager';
import { isReadOnlyQuery } from '@/lib/sql/validator';
import { logAudit } from '@/lib/security/audit';
import { paginationConfig, validatePageSize } from '@/lib/config/pagination';
import type { DataSource } from '@/types/database';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sql, dataSourceId, parameters, limit, offset, timeout = DEFAULT_TIMEOUT } = body;

    // Use configured default page size if not provided
    const effectiveLimit = validatePageSize(limit || paginationConfig.dataTablePageSize);
    const effectiveOffset = offset || 0;

    if (!sql) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'SQL content is required' } },
        { status: 400 }
      );
    }

    if (!dataSourceId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Data source ID is required' } },
        { status: 400 }
      );
    }

    // Only allow read-only queries in SQL editor
    if (!isReadOnlyQuery(sql)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only SELECT queries are allowed in the SQL editor',
          },
        },
        { status: 403 }
      );
    }

    // Get data source
    const db = getDb();
    const dataSource = await db<DataSource>('data_sources')
      .where('id', dataSourceId)
      .where('is_active', true)
      .first();

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Data source not found' } },
        { status: 404 }
      );
    }

    // Get connection
    const connection = await getConnection(dataSource);

    // Apply SERVER-SIDE pagination (MUST use LIMIT and OFFSET at database level)
    let limitedSQL = sql.trim();

    // Add LIMIT and OFFSET if not present (CRITICAL for server-side pagination)
    if (!/\bLIMIT\s+\d+/i.test(limitedSQL) && !/\bTOP\s+\d+/i.test(limitedSQL)) {
      // Remove trailing semicolon if present
      if (limitedSQL.endsWith(';')) {
        limitedSQL = limitedSQL.slice(0, -1);
      }
      // SERVER-SIDE: Add LIMIT and OFFSET to SQL query before sending to database
      limitedSQL = `${limitedSQL} LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`;
    } else if (/\bLIMIT\s+\d+/i.test(limitedSQL) && !/\bOFFSET\s+\d+/i.test(limitedSQL) && effectiveOffset > 0) {
      // Has LIMIT but no OFFSET, add OFFSET
      if (limitedSQL.endsWith(';')) {
        limitedSQL = limitedSQL.slice(0, -1);
      }
      limitedSQL = `${limitedSQL} OFFSET ${effectiveOffset}`;
    }

    // Validate that user-provided LIMIT doesn't exceed max configured page size
    const limitMatch = limitedSQL.match(/\bLIMIT\s+(\d+)/i);
    if (limitMatch) {
      const userLimit = parseInt(limitMatch[1], 10);
      const validatedLimit = validatePageSize(userLimit);
      if (userLimit !== validatedLimit) {
        limitedSQL = limitedSQL.replace(/\bLIMIT\s+\d+/i, `LIMIT ${validatedLimit}`);
      }
    }

    // Execute query with timeout
    const startTime = Date.now();

    let result;
    if (dataSource.client_type === 'sqlite3') {
      result = await connection.raw(limitedSQL);
    } else {
      result = await connection.raw(limitedSQL).timeout(timeout);
    }

    const executionTime = Date.now() - startTime;

    // Extract rows and column info
    let rows: Record<string, unknown>[] = [];
    let columns: { name: string; type: string }[] = [];

    if (Array.isArray(result)) {
      rows = result;
    } else if (result.rows) {
      rows = result.rows;
    } else if (result[0]) {
      rows = Array.isArray(result[0]) ? result[0] : [result[0]];
    }

    // Get column info from first row
    if (rows.length > 0) {
      columns = Object.keys(rows[0]).map((name) => ({
        name,
        type: typeof rows[0][name],
      }));
    }

    // Log the query execution
    await logAudit({
      userId: session.user.id,
      action: 'execute',
      resourceType: 'query',
      resourceId: dataSourceId,
      details: {
        sql: sql.substring(0, 500),
        rowCount: rows.length,
        executionTime,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        columns,
        rows,
        rowCount: rows.length,
        executionTime,
        truncated: rows.length >= effectiveLimit,
        pagination: {
          limit: effectiveLimit,
          offset: effectiveOffset,
          hasMore: rows.length >= effectiveLimit,
          serverSide: true, // Explicitly mark as server-side pagination
        },
      },
    });
  } catch (error) {
    console.error('SQL execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
