import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { isAdmin } from '@/lib/permissions/permissions';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { User } from '@/types/database';

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
    const users = await db('users')
      .select('id', 'email', 'display_name', 'is_active', 'created_at')
      .orderBy('created_at', 'desc');

    // Get roles for each user
    const usersWithRoles = await Promise.all(
      users.map(async (user: any) => {
        const roles = await db('user_roles as ur')
          .join('roles as r', 'ur.role_id', 'r.id')
          .where('ur.user_id', user.id)
          .select('r.id', 'r.name');

        return {
          ...user,
          roles,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: usersWithRoles,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch users' } },
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
    const { name, email, password, isActive = true } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Name, email, and password are required' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if email already exists
    const existing = await db('users').where('email', email).first();
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already exists' } },
        { status: 400 }
      );
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await db('users').insert({
      id: userId,
      email,
      password_hash: passwordHash,
      display_name: name,
      is_active: isActive,
    });

    const user = await db('users').where('id', userId).first();

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create user' } },
      { status: 500 }
    );
  }
}
