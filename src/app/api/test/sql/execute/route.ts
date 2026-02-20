import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { getConnection } from '@/lib/db/connection-manager';
import type { DataSource } from '@/types/database';

/**
 * TEST-ONLY endpoint for executing SQL including DDL statements
 * This allows CREATE TABLE, INSERT, etc. for testing purposes
 * WARNING: This endpoint should ONLY be enabled in test environments
 */

export async function POST(request: NextRequest) {
  try {
    // Only allow in test environment or with test header
    const isTestMode = process.env.NODE_ENV === 'test' ||
                       process.env.NEXT_PUBLIC_APP_ENV === 'test' ||
                       request.headers.get('x-test-mode') === 'true';

    if (!isTestMode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Test-only endpoint is not available in this environment',
          },
        },
        { status: 403 }
      );
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sql, dataSourceId } = body;

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

    // Get connection and execute SQL
    const connection = await getConnection(dataSource);

    // For SQLite, split and execute multiple statements
    let result;
    if (dataSource.client_type === 'sqlite3') {
      // Split SQL statements by semicolon and filter empty ones
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Execute each statement
      const results: any[] = [];
      for (const statement of statements) {
        const stmtResult = await connection.raw(statement);
        results.push(stmtResult);
      }
      result = results;
    } else {
      result = await connection.raw(sql);
    }

    return NextResponse.json({
      success: true,
      data: {
        result,
        message: 'SQL executed successfully',
      },
    });
  } catch (error) {
    console.error('[TEST SQL EXECUTE ERROR] SQL execution error:', error);
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
