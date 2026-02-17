import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getSecurityContext, hasPermission } from '@/lib/auth/rbac';
import { getDsRoles, createDsRole } from '@/lib/permissions/ds-rbac';
import { getDb } from '@/lib/db/config';

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

    const { id: dataSourceId } = await params;
    const roles = await getDsRoles(dataSourceId);

    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error('Error fetching DS roles:', error);
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
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Role name is required' } },
        { status: 400 }
      );
    }

    // Verify data source exists
    const db = getDb();
    const dataSource = await db('data_sources').where('id', dataSourceId).first();
    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Data source not found' } },
        { status: 404 }
      );
    }

    const role = await createDsRole(dataSourceId, name.trim(), description, context.userId);

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    console.error('Error creating DS role:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('UNIQUE constraint failed') || message.includes('unique')) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE', message: 'A role with this name already exists for this data source' } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
