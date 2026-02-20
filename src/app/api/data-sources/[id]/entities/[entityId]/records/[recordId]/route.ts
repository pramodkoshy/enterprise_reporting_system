/**
 * API Route: CRUD Single Entity Record
 * GET /api/data-sources/[id]/entities/[entityId]/records/[recordId] - Get record
 * POST /api/data-sources/[id]/entities/[entityId]/records/[recordId] - Create record (recordId is ignored)
 * PUT /api/data-sources/[id]/entities/[entityId]/records/[recordId] - Update record
 * DELETE /api/data-sources/[id]/entities/[entityId]/records/[recordId] - Delete record
 *
 * CRUD operations for individual entity records.
 * Requires is_editable=true on the datasource.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/metadata/data-service';
import { EntityService } from '@/lib/metadata/entity-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';

// GET - Fetch single record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; entityId: string; recordId: string } }
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

    const entity = await EntityService.getById(params.entityId);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } },
        { status: 404 }
      );
    }

    if (entity.data_source_id !== params.id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Entity does not belong to this datasource' } },
        { status: 400 }
      );
    }

    const record = await DataService.getRecord(
      params.id,
      entity,
      params.recordId,
      context.userId
    );

    if (!record) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Record not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error getting entity record:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get entity record',
        },
      },
      { status: 500 }
    );
  }
}

// POST - Create new record
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; entityId: string; recordId: string } }
) {
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

    const entity = await EntityService.getById(params.entityId);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } },
        { status: 404 }
      );
    }

    if (entity.data_source_id !== params.id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Entity does not belong to this datasource' } },
        { status: 400 }
      );
    }

    const body = await request.json();

    const record = await DataService.createRecord(
      params.id,
      entity,
      body,
      context.userId
    );

    return NextResponse.json({
      success: true,
      data: record,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating entity record:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create entity record',
        },
      },
      { status: 500 }
    );
  }
}

// PUT - Update record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; entityId: string; recordId: string } }
) {
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

    const entity = await EntityService.getById(params.entityId);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } },
        { status: 404 }
      );
    }

    if (entity.data_source_id !== params.id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Entity does not belong to this datasource' } },
        { status: 400 }
      );
    }

    const body = await request.json();

    const record = await DataService.updateRecord(
      params.id,
      entity,
      params.recordId,
      body,
      context.userId
    );

    if (!record) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Record not found or no changes made' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error updating entity record:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update entity record',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; entityId: string; recordId: string } }
) {
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

    const entity = await EntityService.getById(params.entityId);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Entity not found' } },
        { status: 404 }
      );
    }

    if (entity.data_source_id !== params.id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Entity does not belong to this datasource' } },
        { status: 400 }
      );
    }

    const deleted = await DataService.deleteRecord(
      params.id,
      entity,
      params.recordId,
      context.userId
    );

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Record not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Record deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting entity record:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete entity record',
        },
      },
      { status: 500 }
    );
  }
}
