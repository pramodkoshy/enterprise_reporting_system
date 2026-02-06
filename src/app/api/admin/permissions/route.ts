import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { isAdmin } from '@/lib/permissions/permissions';
import type { ResourceType, PermissionLevel } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const admin = await isAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('resourceType') as ResourceType | null;
    const resourceId = searchParams.get('resourceId') || null;

    const db = getDb();
    let query = db('resource_permissions as rp')
      .join('roles as r', 'rp.role_id', 'r.id')
      .select(
        'rp.id',
        'rp.resource_type',
        'rp.resource_id',
        'rp.role_id',
        'rp.permission_level',
        'r.name as role_name',
        'rp.created_at'
      );

    if (resourceType) {
      query = query.where('rp.resource_type', resourceType);
    }

    if (resourceId) {
      query = query.where('rp.resource_id', resourceId);
    }

    const permissions = await query.orderBy('rp.created_at', 'desc');

    return NextResponse.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch permissions' } },
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

    // Check if user is admin
    const admin = await isAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { resourceType, resourceId, roleId, permissionLevel } = body;

    if (!resourceType || !resourceId || !roleId || !permissionLevel) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'All fields are required' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if permission already exists
    const existing = await db('resource_permissions')
      .where('resource_type', resourceType)
      .where('resource_id', resourceId)
      .where('role_id', roleId)
      .first();

    if (existing) {
      // Update existing permission
      await db('resource_permissions')
        .where('id', existing.id)
        .update({ permission_level: permissionLevel });

      const updated = await db('resource_permissions').where('id', existing.id).first();
      return NextResponse.json({ success: true, data: updated });
    }

    // Create new permission
    const { randomUUID } = await import('crypto');
    const permissionId = randomUUID();

    await db('resource_permissions').insert({
      id: permissionId,
      resource_type: resourceType,
      resource_id: resourceId,
      role_id: roleId,
      permission_level: permissionLevel,
      created_at: new Date().toISOString(),
    });

    const permission = await db('resource_permissions').where('id', permissionId).first();

    return NextResponse.json({ success: true, data: permission });
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create permission' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const admin = await isAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Permission ID is required' } },
        { status: 400 }
      );
    }

    const db = getDb();
    await db('resource_permissions').where('id', id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting permission:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete permission' } },
      { status: 500 }
    );
  }
}
