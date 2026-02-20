/**
 * API Route: List Entity Records (Paginated)
 * GET /api/data-sources/[id]/entities/[entityId]/records
 *
 * Lists records from an entity with server-side pagination.
 * Requires is_editable=true on the datasource.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/metadata/data-service';
import { EntityService } from '@/lib/metadata/entity-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; entityId: string } }
) {
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

    // Get entity metadata
    const entity = await EntityService.getById(params.entityId);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } },
        { status: 404 }
      );
    }

    // Verify entity belongs to the specified datasource
    if (entity.data_source_id !== params.id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Entity does not belong to this datasource' } },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sort: searchParams.get('sort') || undefined,
      order: (searchParams.get('order') || 'asc') as 'asc' | 'desc',
    };

    // Validate pagination parameters
    if (queryParams.page < 1) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'page must be >= 1' } },
        { status: 400 }
      );
    }

    if (queryParams.limit < 1 || queryParams.limit > 500) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'limit must be between 1 and 500' } },
        { status: 400 }
      );
    }

    // List records with server-side pagination
    const result = await DataService.listRecords(
      params.id,
      entity,
      queryParams,
      context.userId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error listing entity records:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list entity records',
        },
      },
      { status: 500 }
    );
  }
}
