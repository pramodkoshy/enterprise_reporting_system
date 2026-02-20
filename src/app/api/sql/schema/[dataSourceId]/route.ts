import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { getConnection } from '@/lib/db/connection-manager';
import { introspectSchema } from '@/lib/sql/schema-introspection';
import { SyncService } from '@/lib/metadata/sync-service';
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
        { success: false, error: { code: 'NOT_FOUND', message: 'Data source not found or not active' } },
        { status: 404 }
      );
    }

    // Get connection and introspect schema
    const connection = await getConnection(dataSource);
    const { schema, logs } = await introspectSchema(connection, dataSource.client_type);

    // Sync metadata after successful introspection
    let syncResult;
    try {
      syncResult = await SyncService.syncDataSource(dataSourceId, session.user.id);
      console.log(`[Schema Sync] Synced ${syncResult.entitiesCreated} created, ${syncResult.entitiesUpdated} updated entities for datasource ${dataSourceId}`);
    } catch (syncError) {
      console.error('[Schema Sync] Failed to sync metadata:', syncError);
      // Don't fail the request if sync fails - still return the schema
    }

    // Check if schema is empty and provide helpful message
    if (schema.tables.length === 0 && schema.views.length === 0) {
      return NextResponse.json({
        success: true,
        data: { ...schema, logs },
        warning: 'No tables or views found in this database. The database may be empty or you may not have permission to access the tables.',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...schema,
        logs,
        metadataSync: syncResult ? {
          entitiesCreated: syncResult.entitiesCreated,
          entitiesUpdated: syncResult.entitiesUpdated,
          fieldsCreated: syncResult.fieldsCreated,
          fieldsUpdated: syncResult.fieldsUpdated,
        } : undefined,
      },
    });
  } catch (error) {
    console.error('Schema introspection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Provide more helpful error messages
    if (errorMessage.includes('SQLITE_CANTOPEN')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_NOT_FOUND',
            message: 'Database file not found. Please check the file path in the data source configuration.',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTROSPECTION_ERROR',
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
