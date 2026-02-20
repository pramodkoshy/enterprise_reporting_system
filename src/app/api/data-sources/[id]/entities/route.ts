/**
 * API Route: List Entities for Datasource
 * GET /api/data-sources/[id]/entities
 *
 * Lists all entities for a datasource with metadata (for CRUD interface).
 */

import { NextRequest, NextResponse } from 'next/server';
import { EntityService } from '@/lib/metadata/entity-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      context.user.permissions.includes('metadata_entity:view');

    if (!canView) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeFields = searchParams.get('include_fields') === 'true';
    const activeOnly = searchParams.get('active_only') !== 'false'; // default true

    // List entities for this datasource
    const result = await EntityService.list({
      data_source_id: params.id,
      is_active: activeOnly ? true : undefined,
      is_hidden: false, // Never show hidden entities in CRUD interface
      page: 1,
      limit: 1000, // High limit for entity list
    });

    // Filter fields if includeFields is false
    let entities = result.entities;
    if (!includeFields) {
      entities = entities.map(({ fields, ...rest }) => rest);
    }

    return NextResponse.json({
      success: true,
      data: {
        entities,
        total: result.total,
      },
    });
  } catch (error) {
    console.error('Error listing datasource entities:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list datasource entities',
        },
      },
      { status: 500 }
    );
  }
}
