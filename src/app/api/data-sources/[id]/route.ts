import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { decrypt } from '@/lib/security/encryption';
import { getConnection, closeConnection } from '@/lib/db/connection-manager';
import type { DataSource } from '@/types/database';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
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

    // Return with decrypted connection config for editing
    const connectionConfig = JSON.parse(decrypt(dataSource.connection_config));

    return NextResponse.json({
      success: true,
      data: {
        ...dataSource,
        connectionConfig, // Decrypted for the UI
      },
    });
  } catch (error) {
    console.error('Error fetching data source:', error);
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
      .where('data_source_id', id)
      .where('is_deleted', false)
      .count('id as count')
      .first();

    const chartCount = await db('chart_definitions')
      .join('report_definitions', 'chart_definitions.report_id', 'report_definitions.id')
      .where('report_definitions.data_source_id', id)
      .where('chart_definitions.is_deleted', false)
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
        is_active: false,
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
