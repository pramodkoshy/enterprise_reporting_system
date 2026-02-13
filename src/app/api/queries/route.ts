import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { SavedQuery } from '@/types/database';
import { log } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const path = '/api/queries';
  const method = 'GET';

  try {
    log.apiRequest(method, path, undefined, { operation: 'fetch_queries' });

    const session = await auth();
    if (!session?.user) {
      log.warn('Unauthorized access attempt', { path, method });
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    log.info('Fetching saved queries', {
      userId: session.user.id,
      page,
      pageSize,
    });

    const db = getDb();
    log.dbQuery('SELECT', 'saved_queries', { page, pageSize });

    const queries = await db<SavedQuery>('saved_queries')
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(page * pageSize);

    const countResult = await db<SavedQuery>('saved_queries').count('* as count').first();
    const total = Number((countResult as { count?: string })?.count || 0);

    const duration = Date.now() - startTime;
    log.info('Queries fetched successfully', {
      userId: session.user.id,
      count: queries.length,
      total,
      duration,
    });

    log.apiResponse(method, path, 200, duration);

    return NextResponse.json({
      success: true,
      data: {
        items: queries,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.apiError(method, path, 500, error as Error, { duration });
    log.dbError('SELECT', 'saved_queries', error as Error);

    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch queries' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const path = '/api/queries';
  const method = 'POST';

  try {
    log.apiRequest(method, path, undefined, { operation: 'create_query' });

    const session = await auth();
    if (!session?.user) {
      log.warn('Unauthorized access attempt', { path, method });
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, dataSourceId, sqlContent, parametersSchema } = body;

    log.info('Creating new saved query', {
      userId: session.user.id,
      name,
      dataSourceId,
      sqlLength: sqlContent?.length,
    });

    if (!name || !dataSourceId || !sqlContent) {
      log.warn('Missing required fields for query creation', {
        userId: session.user.id,
        hasName: !!name,
        hasDataSourceId: !!dataSourceId,
        hasSqlContent: !!sqlContent,
      });
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuidv4();

    log.dbQuery('INSERT', 'saved_queries', { id, name });

    await db<SavedQuery>('saved_queries').insert({
      id,
      name,
      description,
      data_source_id: dataSourceId,
      sql_content: sqlContent,
      parameters_schema: parametersSchema ? JSON.stringify(parametersSchema) : undefined,
      created_by: session.user.id,
    });

    await logAudit({
      userId: session.user.id,
      action: 'create',
      resourceType: 'query',
      resourceId: id,
      details: { name },
    });

    log.authEvent('query_created', session.user.id, { queryId: id, name });

    const query = await db<SavedQuery>('saved_queries').where('id', id).first();

    const duration = Date.now() - startTime;
    log.info('Query created successfully', {
      userId: session.user.id,
      queryId: id,
      name,
      duration,
    });

    log.apiResponse(method, path, 201, duration);

    return NextResponse.json({ success: true, data: query }, { status: 201 });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.apiError(method, path, 500, error as Error, { duration });
    log.dbError('INSERT', 'saved_queries', error as Error);

    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create query' } },
      { status: 500 }
    );
  }
}
