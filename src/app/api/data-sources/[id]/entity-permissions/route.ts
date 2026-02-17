import { NextRequest, NextResponse } from 'next/server';
import { getSecurityContext, hasPermission } from '@/lib/auth/rbac';
import {
  getDsEntityPermissions,
  upsertDsEntityPermission,
  deleteDsEntityPermission,
} from '@/lib/permissions/ds-rbac';
import type { DsEntityPermissionLevel, DsEntityType } from '@/types/database';

const VALID_PERMISSION_LEVELS: DsEntityPermissionLevel[] = ['select', 'insert', 'update', 'delete', 'all'];
const VALID_ENTITY_TYPES: DsEntityType[] = ['table', 'view'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { id: dataSourceId } = await params;
    const { searchParams } = new URL(request.url);
    const dsRoleId = searchParams.get('ds_role_id') || undefined;

    const permissions = await getDsEntityPermissions(dataSourceId, dsRoleId);

    return NextResponse.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Error fetching entity permissions:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(context, 'data_source:admin') && !hasPermission(context, 'admin:*')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }

    const { id: dataSourceId } = await params;
    const body = await request.json();
    const {
      ds_role_id,
      entity_name,
      entity_type = 'table',
      permission_level = 'select',
      entity_schema,
      column_restrictions,
      row_filter,
    } = body;

    if (!ds_role_id || !entity_name) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ds_role_id and entity_name are required' } },
        { status: 400 }
      );
    }

    if (!VALID_PERMISSION_LEVELS.includes(permission_level)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Invalid permission_level. Must be one of: ${VALID_PERMISSION_LEVELS.join(', ')}` } },
        { status: 400 }
      );
    }

    if (!VALID_ENTITY_TYPES.includes(entity_type)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Invalid entity_type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}` } },
        { status: 400 }
      );
    }

    const permission = await upsertDsEntityPermission(
      dataSourceId,
      ds_role_id,
      entity_name,
      entity_type,
      permission_level,
      entity_schema,
      column_restrictions,
      row_filter,
      context.userId
    );

    return NextResponse.json({ success: true, data: permission }, { status: 201 });
  } catch (error) {
    console.error('Error creating entity permission:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getSecurityContext();
    if (!context) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    if (!hasPermission(context, 'data_source:admin') && !hasPermission(context, 'admin:*')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const permissionId = searchParams.get('permission_id');

    if (!permissionId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'permission_id query param is required' } },
        { status: 400 }
      );
    }

    await deleteDsEntityPermission(permissionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entity permission:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
