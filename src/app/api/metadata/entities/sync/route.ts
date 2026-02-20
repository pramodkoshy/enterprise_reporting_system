/**
 * API Route: Trigger Datasource Sync
 * POST /api/metadata/entities/sync
 *
 * Triggers schema introspection for a datasource and updates entity metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SyncService } from '@/lib/metadata/sync-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const canEdit = hasPermission(context, 'metadata_entity:edit') ??
      context.permissions.includes('metadata_entity:edit');

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { dataSourceId } = body;

    // Validate input
    if (!dataSourceId || typeof dataSourceId !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'dataSourceId is required' } },
        { status: 400 }
      );
    }

    // Perform sync
    const result = await SyncService.syncDataSource(dataSourceId, context.userId);

    return NextResponse.json({
      success: true,
      data: {
        dataSourceId,
        entitiesCreated: result.entitiesCreated,
        entitiesUpdated: result.entitiesUpdated,
        fieldsCreated: result.fieldsCreated,
        fieldsUpdated: result.fieldsUpdated,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error syncing datasource:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync datasource',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const canView = hasPermission(context, 'metadata_entity:view') ??
      context.permissions.includes('metadata_entity:view');

    if (!canView) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    // Get stale data sources that need sync
    const staleDataSources = await SyncService.getStaleDataSources(24); // 24 hours

    return NextResponse.json({
      success: true,
      data: {
        staleDataSources,
        count: staleDataSources.length,
      },
    });
  } catch (error) {
    console.error('Error getting stale datasources:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get stale datasources',
        },
      },
      { status: 500 }
    );
  }
}
