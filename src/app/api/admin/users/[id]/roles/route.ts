import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { isAdmin } from '@/lib/permissions/permissions';

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

    const { id: userId } = await params;
    const db = getDb();

    const userRoles = await db('user_roles as ur')
      .join('roles as r', 'ur.role_id', 'r.id')
      .where('ur.user_id', userId)
      .select('r.id', 'r.name');

    return NextResponse.json({
      success: true,
      data: userRoles,
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch user roles' } },
      { status: 500 }
    );
  }
}

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

    // Check if user is admin
    const admin = await isAdmin(session.user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { id: userId } = await params;
    const body = await request.json();
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Role ID is required' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if role is already assigned
    const existing = await db('user_roles')
      .where('user_id', userId)
      .where('role_id', roleId)
      .first();

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_ASSIGNED', message: 'Role is already assigned to this user' } },
        { status: 400 }
      );
    }

    // Assign role
    await db('user_roles').insert({
      user_id: userId,
      role_id: roleId,
      assigned_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to assign role' } },
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

    const { id: userId } = await params;
    const body = await request.json();
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Role ID is required' } },
        { status: 400 }
      );
    }

    const db = getDb();
    await db('user_roles')
      .where('user_id', userId)
      .where('role_id', roleId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to remove role' } },
      { status: 500 }
    );
  }
}
