/**
 * API Route: List Metadata Entities
 * GET /api/metadata/entities
 *
 * Lists all metadata entities the user has access to, with optional filtering and pagination.
 */

import { NextRequest, NextResponse } from 'next/server';
import { EntityService } from '@/lib/metadata/entity-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  try {
    // Get security context and permissions
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // Check view permission on metadata_entity
    const canView = hasPermission(context, 'metadata_entity:view');

    if (!canView) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      data_source_id: searchParams.get('data_source_id') || undefined,
      is_active: searchParams.get('is_active') === 'true' ? true : (searchParams.get('is_active') === 'false' ? false : undefined),
      is_hidden: searchParams.get('is_hidden') === 'true' ? true : (searchParams.get('is_hidden') === 'false' ? false : undefined),
      include_hidden: searchParams.get('include_hidden') === 'true',
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // Fetch entities
    const result = await EntityService.list(params);

    return NextResponse.json({
      success: true,
      data: {
        entities: result.entities,
        total: result.total,
        page: params.page,
        limit: params.limit,
      },
    });
  } catch (error) {
    console.error('Error listing metadata entities:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list metadata entities',
        },
      },
      { status: 500 }
    );
  }
}