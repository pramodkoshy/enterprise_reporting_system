import { getDb } from '../src/lib/db/config';
import bcrypt from 'bcrypt';
import { isAdmin, getUserPermissions } from '../src/lib/permissions/permissions';

async function testAdminPermissions() {
  const db = getDb();

  try {
    // 1. Find admin user
    const admin = await db('users').where('email', 'admin@admin.com').first();
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    console.log('✓ Admin user found:', admin.email, '| ID:', admin.id);

    // 2. Test password
    const passwordValid = await bcrypt.compare('admin', admin.password_hash);
    console.log(passwordValid ? '✓ Password valid' : '❌ Password invalid');

    // 3. Check if admin
    const adminCheck = await isAdmin(admin.id);
    console.log(adminCheck ? '✓ isAdmin() returns true' : '❌ isAdmin() returns false');

    // 4. Get user permissions
    const perms = await getUserPermissions(admin.id);
    console.log('✓ Roles:', perms.roles.map(r => r.name));
    console.log('✓ Role permissions:', perms.rolePermissions);
    console.log('✓ Number of permissions:', perms.rolePermissions.length);

    // 5. Check for specific permissions
    const hasUserView = perms.rolePermissions.some(p =>
      p === 'user:view' || p === 'user:*' || p === 'admin:*' || p === '*:*'
    );
    const hasRoleView = perms.rolePermissions.some(p =>
      p === 'role:view' || p === 'role:*' || p === 'admin:*' || p === '*:*'
    );

    console.log(hasUserView ? '✓ Has user:view permission' : '❌ Missing user:view permission');
    console.log(hasRoleView ? '✓ Has role:view permission' : '❌ Missing role:view permission');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

testAdminPermissions();
