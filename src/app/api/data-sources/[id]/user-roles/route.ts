import { NextRequest, NextResponse } from 'next/server';
import { getSecurityContext, hasPermission } from '@/lib/auth/rbac';
import { getDsUserRoles, assignDsUserRole, removeDsUserRole } from '@/lib/permissions/ds-rbac';

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
    const userRoles = await getDsUserRoles(dataSourceId);

    return NextResponse.json({ success: true, data: userRoles });
  } catch (error) {
    console.error('Error fetching DS user roles:', error);
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
    const { user_id, ds_role_id } = body;

    if (!user_id || !ds_role_id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'user_id and ds_role_id are required' } },
        { status: 400 }
      );
    }

    await assignDsUserRole(dataSourceId, user_id, ds_role_id);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error assigning DS user role:', error);
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

    const { id: dataSourceId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const dsRoleId = searchParams.get('ds_role_id');

    if (!userId || !dsRoleId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'user_id and ds_role_id query params are required' } },
        { status: 400 }
      );
    }

    await removeDsUserRole(dataSourceId, userId, dsRoleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing DS user role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}
