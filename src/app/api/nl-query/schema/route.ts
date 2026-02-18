import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { introspectAndCacheSchema, getSchemaContext } from '@/lib/mastra/schema-store';
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
    const { data_source_id, refresh = false } = body;

    if (!data_source_id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'data_source_id is required' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const dataSource = await db<DataSource>('data_sources')
      .where('id', data_source_id)
      .where('is_active', true)
      .first();

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Data source not found or inactive' } },
        { status: 404 }
      );
    }

    let context;
    if (refresh) {
      context = await introspectAndCacheSchema(dataSource);
    } else {
      context = await getSchemaContext(dataSource);
    }

    return NextResponse.json({
      success: true,
      data: {
        tableCount: context.schemaInfo.tables.length,
        viewCount: context.schemaInfo.views?.length || 0,
        tables: context.schemaInfo.tables.map((t) => ({
          name: t.name,
          columnCount: t.columns.length,
          columns: t.columns.map((c) => ({ name: c.name, type: c.type })),
        })),
        schemaText: context.schemaText,
      },
    });
  } catch (error) {
    console.error('Schema introspection error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
