import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { encrypt } from '@/lib/security/encryption';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { DataSource } from '@/types/database';
import { log } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const path = '/api/data-sources';
  const method = 'GET';

  try {
    log.apiRequest(method, path, undefined, { operation: 'fetch_data_sources' });

    const session = await auth();
    if (!session?.user) {
      log.warn('Unauthorized access attempt', { path, method });
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    log.info('Fetching data sources', { userId: session.user.id });

    const db = getDb();
    log.dbQuery('SELECT', 'data_sources', { is_deleted: false });

    const dataSources = await db<DataSource>('data_sources')
      .where('is_deleted', false)
      .orderBy('name');

    // Remove sensitive connection info
    const sanitizedSources = dataSources.map(({ connection_config, ...rest }) => rest);

    const duration = Date.now() - startTime;
    log.info('Data sources fetched successfully', {
      userId: session.user.id,
      count: sanitizedSources.length,
      duration,
    });

    log.apiResponse(method, path, 200, duration);

    return NextResponse.json({
      success: true,
      data: { items: sanitizedSources, meta: { total: sanitizedSources.length } },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.apiError(method, path, 500, error as Error, { duration });
    log.dbError('SELECT', 'data_sources', error as Error);

    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch data sources' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const path = '/api/data-sources';
  const method = 'POST';

  try {
    log.apiRequest(method, path, undefined, { operation: 'create_data_source' });

    const session = await auth();
    if (!session?.user) {
      log.warn('Unauthorized access attempt', { path, method });
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, clientType, connectionConfig } = body;

    log.info('Creating new data source', {
      userId: session.user.id,
      name,
      clientType,
    });

    if (!name || !clientType || !connectionConfig) {
      log.warn('Missing required fields for data source creation', {
        userId: session.user.id,
        hasName: !!name,
        hasClientType: !!clientType,
        hasConnectionConfig: !!connectionConfig,
      });
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuidv4();

    log.encryptionEvent('encrypting_connection_config', { dataSourceId: id });
    const encryptedConfig = encrypt(JSON.stringify(connectionConfig));
    log.encryptionEvent('connection_config_encrypted', { dataSourceId: id, configLength: encryptedConfig.length });

    log.dbQuery('INSERT', 'data_sources', { id, name, clientType });

    await db<DataSource>('data_sources').insert({
      id,
      name,
      description,
      client_type: clientType as any,
      connection_config: encryptedConfig,
      created_by: session.user.id,
    });

    await logAudit({
      userId: session.user.id,
      action: 'create',
      resourceType: 'data_source',
      resourceId: id,
      details: { name, clientType },
    });

    log.authEvent('data_source_created', session.user.id, { dataSourceId: id, name, clientType });

    const dataSource = await db<DataSource>('data_sources').where('id', id).first();

    const duration = Date.now() - startTime;
    log.info('Data source created successfully', {
      userId: session.user.id,
      dataSourceId: id,
      name,
      clientType,
      duration,
    });

    log.apiResponse(method, path, 201, duration);

    return NextResponse.json({ success: true, data: dataSource }, { status: 201 });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.apiError(method, path, 500, error as Error, { duration });
    log.dbError('INSERT', 'data_sources', error as Error);
    log.encryptionError('data_source_creation', error as Error);

    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create data source' } },
      { status: 500 }
    );
  }
}
