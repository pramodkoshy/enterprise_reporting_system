import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { isAdmin, getUserPermissions } from '@/lib/permissions/permissions';

export async function GET() {
  try {
    const session = await auth();
    console.log('==== PERMISSIONS API DEBUG ====');
    console.log('Session:', session ? 'EXISTS' : 'NULL');

    if (!session?.user) {
      console.log('❌ No user in session');
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log('User ID:', userId);
    console.log('User Email:', session.user.email);

    // Check if user is admin
    const admin = await isAdmin(userId);
    console.log('Is Admin?:', admin);

    // Get user permissions
    const userPerms = await getUserPermissions(userId);
    console.log('Roles:', userPerms.roles.map(r => r.name));
    console.log('Permissions:', userPerms.rolePermissions);

    const responseData = {
      userId,
      roles: userPerms.roles,
      rolePermissions: userPerms.rolePermissions,
      resourcePermissions: userPerms.resourcePermissions,
      isAdmin: admin,
    };

    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log('==== END DEBUG ====');

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch permissions' } },
      { status: 500 }
    );
  }
}
