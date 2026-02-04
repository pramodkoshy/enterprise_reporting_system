import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { getConnection } from '@/lib/db/connection-manager';
import type { DataSource } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const db = getDb();

    // Fetch the saved query
    const query = await db('saved_queries').where('id', id).first();
    if (!query) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Query not found' } },
        { status: 404 }
      );
    }

    // Get data source
    const dataSource = await db<DataSource>('data_sources')
      .where('id', query.data_source_id)
      .where('is_active', true)
      .first();

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'DATASOURCE_NOT_FOUND', message: 'Data source not found' } },
        { status: 404 }
      );
    }

    // Get connection and execute query with limit for preview
    const connection = await getConnection(dataSource);
    let limitedSQL = query.sql_content.trim();

    // Remove trailing semicolon if present
    limitedSQL = limitedSQL.replace(/;+$/, '');

    // Add LIMIT clause if not present for preview
    if (!/\bLIMIT\s+\d+/i.test(limitedSQL)) {
      limitedSQL = `${limitedSQL} LIMIT 5`;
    }

    const result = await connection.raw(limitedSQL);

    // Extract rows
    let rows: Record<string, unknown>[] = [];
    if (Array.isArray(result)) {
      rows = result;
    } else if (result.rows) {
      rows = result.rows;
    } else if (result[0]) {
      rows = Array.isArray(result[0]) ? result[0] : [result[0]];
    }

    return NextResponse.json({
      success: true,
      data: {
        rows,
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      },
    });
  } catch (error) {
    console.error('Error executing query for preview:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to execute query' } },
      { status: 500 }
    );
  }
}
