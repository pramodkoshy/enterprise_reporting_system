import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { isAdmin } from '@/lib/permissions/permissions';
import type { Role } from '@/types/database';

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

    // Check if user is admin
    const admin = await isAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const db = getDb();

    const role = await db('roles').where('id', id).first();

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch role' } },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Check if user is admin
    const admin = await isAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { description, permissions } = body;

    if (!permissions || permissions.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Permissions are required' } },
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

    // Prevent modifying Admin role
    if (role.name === 'Admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot modify Admin role' } },
        { status: 403 }
      );
    }

    // Update role
    await db('roles')
      .where('id', id)
      .update({
        description,
        permissions: JSON.stringify(permissions),
        updated_at: new Date().toISOString(),
      });

    const updatedRole = await db('roles').where('id', id).first();

    return NextResponse.json({ success: true, data: updatedRole });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update role' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if user is admin
    const admin = await isAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const db = getDb();

    // Check if role exists
    const role = await db('roles').where('id', id).first();
    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } },
        { status: 404 }
      );
    }

    // Prevent deleting Admin role
    if (role.name === 'Admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete Admin role' } },
        { status: 403 }
      );
    }

    // Delete role
    await db('roles').where('id', id).delete();

    // Also remove all user role assignments
    await db('user_roles').where('role_id', id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete role' } },
      { status: 500 }
    );
  }
}
