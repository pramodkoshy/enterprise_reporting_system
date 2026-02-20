/**
 * API Route: Get/Update Entity Permissions
 * GET /api/metadata/entities/[id]/permissions - Get permissions summary and entity-level permissions
 * PUT /api/metadata/entities/[id]/permissions - Update entity-level permissions (admin only)
 *
 * Permission management for metadata entities using the ds_entity_permissions table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/config';
import { EntityService } from '@/lib/metadata/entity-service';
import { hasPermission, getSecurityContext } from '@/lib/auth/rbac';
import { getEntityPermissionSummary } from '@/lib/metadata/permissions';
import { getDsEntityPermissions, upsertDsEntityPermission } from '@/lib/permissions/ds-rbac';

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

    const canView = hasPermission(context, 'metadata_entity:view');

    if (!canView) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    const entity = await EntityService.getById(params.id);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Get permission summary for the current user
    const permissionSummary = getEntityPermissionSummary(context.permissions);

    // Get entity-level permissions from ds_entity_permissions
    const entityPermissions = await getDsEntityPermissions(entity.data_source_id);

    // Filter permissions for this entity
    const entitySpecificPermissions = entityPermissions.filter(
      p => p.entity_name === entity.entity_name
    );

    return NextResponse.json({
      success: true,
      data: {
        entity_id: entity.id,
        entity_name: entity.entity_name,
        data_source_id: entity.data_source_id,
        user_permissions: permissionSummary,
        entity_permissions: entitySpecificPermissions,
      },
    });
  } catch (error) {
    console.error('Error getting entity permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get entity permissions',
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const canAdmin = hasPermission(context, 'metadata_entity:admin');

    if (!canAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    const entity = await EntityService.getById(params.id);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { ds_role_id, permission_level } = body;

    // Validate input
    if (!ds_role_id || typeof ds_role_id !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ds_role_id is required' } },
        { status: 400 }
      );
    }

    if (!permission_level || typeof permission_level !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'permission_level is required' } },
        { status: 400 }
      );
    }

    if (!['none', 'select', 'insert', 'update', 'delete', 'admin'].includes(permission_level)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'permission_level must be one of: none, select, insert, update, delete, admin' } },
        { status: 400 }
      );
    }

    // Verify the role exists and belongs to this datasource
    const role = await getDb()('ds_roles')
      .where('id', ds_role_id)
      .where('data_source_id', entity.data_source_id)
      .first();

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Role not found for this datasource' } },
        { status: 404 }
      );
    }

    // Upsert the entity permission
    const permission = await upsertDsEntityPermission(
      entity.data_source_id,
      ds_role_id,
      entity.entity_name,
      permission_level,
      context.userId
    );

    return NextResponse.json({
      success: true,
      data: permission,
    });
  } catch (error) {
    console.error('Error updating entity permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update entity permissions',
        },
      },
      { status: 500 }
    );
  }
}
