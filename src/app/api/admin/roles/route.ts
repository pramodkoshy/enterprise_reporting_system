import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { isAdmin } from '@/lib/permissions/permissions';
import { randomUUID } from 'crypto';
import type { Role } from '@/types/database';

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

    const db = getDb();
    const roles = await db('roles').orderBy('name');

    return NextResponse.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch roles' } },
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
    const { name, description, permissions } = body;

    if (!name || !permissions || permissions.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Name and permissions are required' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if role name already exists
    const existing = await db('roles').where('name', name).first();
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'ROLE_EXISTS', message: 'Role with this name already exists' } },
        { status: 400 }
      );
    }

    const roleId = randomUUID();

    await db('roles').insert({
      id: roleId,
      name,
      description,
      permissions: JSON.stringify(permissions),
    });

    const role = await db('roles').where('id', roleId).first();

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create role' } },
      { status: 500 }
    );
  }
}
