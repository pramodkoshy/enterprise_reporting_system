import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { decrypt } from '@/lib/security/encryption';
import { getConnection, closeConnection } from '@/lib/db/connection-manager';
import type { DataSource } from '@/types/database';
import { log } from '@/lib/utils/logger';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const startTime = Date.now();
  const path = `/api/data-sources/${params.id}`;
  const method = 'GET';

  try {
    log.apiRequest(method, path, undefined, { operation: 'fetch_data_source', dataSourceId: params.id });

    const session = await auth();
    if (!session?.user) {
      log.warn('Unauthorized access attempt', { path, method, dataSourceId: params.id });
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = params;
    const db = getDb();
    log.dbQuery('SELECT', 'data_sources', { id });

    const dataSource = await db<DataSource>('data_sources')
      .where('id', id)
      .where('is_deleted', false)
      .first();

    if (!dataSource) {
      log.warn('Data source not found', { dataSourceId: id });
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Data source not found' } },
        { status: 404 }
      );
    }

    // Decrypt connection config (or parse plain JSON for backwards compatibility)
    log.info('Decrypting connection config for data source', { dataSourceId: id, name: dataSource.name });
    let connectionConfig;

    try {
      // Check if connection_config is encrypted (should be hex string with sufficient length)
      const isEncrypted = dataSource.connection_config.length > 64 &&
                          /^[0-9a-fA-F]+$/.test(dataSource.connection_config);

      if (isEncrypted) {
        connectionConfig = JSON.parse(decrypt(dataSource.connection_config));
        log.info('Connection config decrypted successfully', { dataSourceId: id });
      } else {
        // Plain text JSON - backwards compatibility
        log.warn('Data source has plain JSON config (not encrypted) - using backwards compatibility', {
          dataSourceId: id,
          name: dataSource.name,
        });
        connectionConfig = JSON.parse(dataSource.connection_config);

        // Re-encrypt in the background
        const { encrypt } = await import('@/lib/security/encryption');
        const encryptedConfig = encrypt(JSON.stringify(connectionConfig));
        db('data_sources')
          .where('id', id)
          .update({ connection_config: encryptedConfig })
          .then(() => {
            log.info('Plain JSON config re-encrypted and saved', { dataSourceId: id });
          })
          .catch((err) => {
            log.error('Failed to re-encrypt config', { dataSourceId: id }, err);
          });
      }
    } catch (decryptError) {
      log.error('Failed to decrypt connection config', { dataSourceId: id }, decryptError as Error);
      throw decryptError;
    }

    const duration = Date.now() - startTime;
    log.apiResponse(method, path, 200, duration);

    return NextResponse.json({
      success: true,
      data: {
        ...dataSource,
        connectionConfig, // Decrypted for the UI
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.apiError(method, path, 500, error as Error, { duration, dataSourceId: params.id });

    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch data source' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, clientType, connectionConfig } = body;

    if (!name || !clientType || !connectionConfig) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if data source exists
    const existing = await db<DataSource>('data_sources')
      .where('id', id)
      .where('is_deleted', false)
      .first();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Data source not found' } },
        { status: 404 }
      );
    }

    const { encrypt } = await import('@/lib/security/encryption');

    // Prepare connection config - keep existing password if not provided
    let finalConnectionConfig = connectionConfig;
    if (!connectionConfig.password) {
      const existingConfig = JSON.parse(decrypt(existing.connection_config));
      finalConnectionConfig = {
        ...connectionConfig,
        password: existingConfig.password,
      };
    }

    await db<DataSource>('data_sources')
      .where('id', id)
      .update({
        name,
        description,
        client_type: clientType,
        connection_config: encrypt(JSON.stringify(finalConnectionConfig)),
        updated_at: new Date().toISOString(),
      });

    // Clear connection cache for this data source
    await closeConnection(id);

    const updatedDataSource = await db<DataSource>('data_sources')
      .where('id', id)
      .first();

    return NextResponse.json({
      success: true,
      data: updatedDataSource,
    });
  } catch (error) {
    console.error('Error updating data source:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update data source' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  return PATCH(request, { params });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id } = params;
    const db = getDb();

    // Check if data source exists
    const dataSource = await db<DataSource>('data_sources')
      .where('id', id)
      .where('is_deleted', false)
      .first();

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Data source not found' } },
        { status: 404 }
      );
    }

    // Check if data source is in use
    const queryCount = await db('saved_queries')
      .where('data_source_id', id)
      .where('is_deleted', false)
      .count('id as count')
      .first();

    const reportCount = await db('report_definitions')
      .join('saved_queries', 'report_definitions.saved_query_id', 'saved_queries.id')
      .where('saved_queries.data_source_id', id)
      .where('report_definitions.is_deleted', false)
      .where('saved_queries.is_deleted', false)
      .count('report_definitions.id as count')
      .first();

    const chartCount = await db('chart_definitions')
      .join('saved_queries', 'chart_definitions.saved_query_id', 'saved_queries.id')
      .where('saved_queries.data_source_id', id)
      .where('chart_definitions.is_deleted', false)
      .where('saved_queries.is_deleted', false)
      .count('chart_definitions.id as count')
      .first();

    const queries = Number(queryCount?.count || 0);
    const reports = Number(reportCount?.count || 0);
    const charts = Number(chartCount?.count || 0);

    if (queries > 0 || reports > 0 || charts > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'IN_USE',
            message: 'Cannot delete data source: it is in use',
            details: { queries, reports, charts }
          }
        },
        { status: 400 }
      );
    }

    // Soft delete
    await db<DataSource>('data_sources')
      .where('id', id)
      .update({
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: session.user.id,
        updated_at: new Date().toISOString(),
      } as any);

    // Clear connection cache for this data source
    await closeConnection(id);

    return NextResponse.json({
      success: true,
      data: { message: 'Data source deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting data source:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete data source' } },
      { status: 500 }
    );
  }
}
