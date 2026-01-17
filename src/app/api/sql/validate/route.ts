import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { validateSQL } from '@/lib/sql/validator';
import { getDb } from '@/lib/db/config';
import type { DataSource } from '@/types/database';

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
    const { sql, dataSourceId } = body;

    if (!sql) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'SQL content is required' } },
        { status: 400 }
      );
    }

    // Get dialect from data source if provided
    let dialect = 'pg';
    if (dataSourceId) {
      const db = getDb();
      const dataSource = await db<DataSource>('data_sources')
        .where('id', dataSourceId)
        .first();
      if (dataSource) {
        dialect = dataSource.client_type;
      }
    }

    const validationResult = validateSQL(sql, dialect);

    return NextResponse.json({
      success: true,
      data: validationResult,
    });
  } catch (error) {
    console.error('SQL validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
