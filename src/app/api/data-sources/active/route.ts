import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { decrypt } from '@/lib/security/encryption';
import { getConnection, testConnection } from '@/lib/db/connection-manager';
import type { DataSource } from '@/types/database';

// GET /api/data-sources/active - Get the active data source
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // For now, return the first available data source
    // In the future, you could store user's preferred active connection
    const db = getDb();
    const dataSource = await db<DataSource>('data_sources')
      .where('is_active', true)
      .orderBy('created_at', 'desc')
      .first();

    if (!dataSource) {
      return NextResponse.json({
        success: true,
        data: { activeDataSource: null },
      });
    }

    // Return sanitized data source (without sensitive config)
    const { connection_config, ...sanitized } = dataSource;

    return NextResponse.json({
      success: true,
      data: { activeDataSource: sanitized },
    });
  } catch (error) {
    console.error('Error fetching active data source:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch active data source' } },
      { status: 500 }
    );
  }
}

// POST /api/data-sources/active - Set the active data source
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
    const { dataSourceId } = body;

    if (!dataSourceId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Data source ID is required' } },
        { status: 400 }
      );
    }

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

    // Test the connection to make sure it's valid
    const connectionConfig = JSON.parse(decrypt(dataSource.connection_config));
    const testResult = await testConnection(dataSource.client_type, connectionConfig);

    if (!testResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CONNECTION_ERROR', message: 'Cannot activate data source: ' + testResult.message },
        },
        { status: 400 }
      );
    }

    // Return sanitized data source
    const { connection_config, ...sanitized } = dataSource;

    return NextResponse.json({
      success: true,
      data: {
        activeDataSource: sanitized,
        testResult,
      },
    });
  } catch (error) {
    console.error('Error setting active data source:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to set active data source' } },
      { status: 500 }
    );
  }
}
