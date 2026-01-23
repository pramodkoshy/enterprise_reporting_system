import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { encrypt } from '@/lib/security/encryption';
import { logAudit } from '@/lib/security/audit';
import { v4 as uuidv4 } from 'uuid';
import type { DataSource } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const db = getDb();
    const dataSources = await db<DataSource>('data_sources')
      .where('is_deleted', false)
      .orderBy('name');

    // Remove sensitive connection info
    const sanitizedSources = dataSources.map(({ connection_config, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: { items: sanitizedSources, meta: { total: sanitizedSources.length } },
    });
  } catch (error) {
    console.error('Error fetching data sources:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch data sources' } },
      { status: 500 }
    );
  }
}

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
    const { name, description, clientType, connectionConfig } = body;

    if (!name || !clientType || !connectionConfig) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = uuidv4();

    await db<DataSource>('data_sources').insert({
      id,
      name,
      description,
      client_type: clientType as any,
      connection_config: encrypt(JSON.stringify(connectionConfig)),
      created_by: session.user.id,
    });

    await logAudit({
      userId: session.user.id,
      action: 'create',
      resourceType: 'data_source',
      resourceId: id,
      details: { name, clientType },
    });

    const dataSource = await db<DataSource>('data_sources').where('id', id).first();

    return NextResponse.json({ success: true, data: dataSource });
  } catch (error) {
    console.error('Error creating data source:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create data source' } },
      { status: 500 }
    );
  }
}
