import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { isAdmin } from '@/lib/permissions/permissions';

// GET - Fetch resource permissions for a role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const admin = await isAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const db = getDb();

    // Fetch all resources that can have permissions assigned
    const [reports, charts, dashboards] = await Promise.all([
      db('report_definitions')
        .select('id', 'name as title')
        .select(db.raw("'report' as type"))
        .where('is_deleted', 0),
      db('chart_definitions')
        .select('id', 'name as title')
        .select(db.raw("'chart' as type")),
      db('dashboard_layouts')
        .select('id', 'name as title')
        .select(db.raw("'dashboard' as type")),
    ]);

    // Fetch existing resource permissions for this role
    const resourcePermissions = await db('resource_permissions as rp')
      .join('roles as r', 'rp.role_id', 'r.id')
      .where('rp.role_id', id)
      .select('rp.*');

    return NextResponse.json({
      success: true,
      data: {
        resources: {
          reports: reports || [],
          charts: charts || [],
          dashboards: dashboards || [],
        },
        resourcePermissions: resourcePermissions || [],
      },
    });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch permissions' } },
      { status: 500 }
    );
  }
}

// POST - Update resource permissions for a role
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const admin = await isAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { permissions } = body; // Array of { resourceType, resourceId, permissionLevel }

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Permissions must be an array' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if role exists
    const role = await db('roles').where('id', id).first();
    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } },
        { status: 404 }
      );
    }

    // Delete existing resource permissions for this role
    await db('resource_permissions').where('role_id', id).delete();

    // Insert new resource permissions
    if (permissions.length > 0) {
      const permissionsToInsert = permissions.map(p => ({
        id: generateId(),
        role_id: id,
        resource_type: p.resourceType,
        resource_id: p.resourceId,
        permission_level: p.permissionLevel,
        created_at: new Date().toISOString(),
      }));

      await db('resource_permissions').insert(permissionsToInsert);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update permissions' } },
      { status: 500 }
    );
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
