import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { getConnection } from '@/lib/db/connection-manager';
import { introspectSchema } from '@/lib/sql/schema-introspection';
import type { DataSource } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataSourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { dataSourceId } = await params;

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

    // Get connection and introspect schema
    const connection = await getConnection(dataSource);
    const schema = await introspectSchema(connection, dataSource.client_type);

    return NextResponse.json({
      success: true,
      data: schema,
    });
  } catch (error) {
    console.error('Schema introspection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTROSPECTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
