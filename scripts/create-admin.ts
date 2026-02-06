import { getDb } from '../src/lib/db/config';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function createAdminUser() {
  const db = getDb();

  try {
    // Check if admin user already exists
    const existingAdmin = await db('users').where('email', 'admin@admin.com').first();
    if (existingAdmin) {
      console.log('Admin user already exists!');
      const adminRoles = await db('user_roles as ur')
        .join('roles as r', 'ur.role_id', 'r.id')
        .where('ur.user_id', existingAdmin.id)
        .select('r.*');

      if (adminRoles.length > 0) {
        console.log('Admin roles:', adminRoles.map(r => r.name));
      } else {
        console.log('Admin user has no roles assigned');
      }

      // Update password hash to use bcrypt if needed
      const testHash = await bcrypt.compare('admin', existingAdmin.password_hash);
      if (!testHash) {
        console.log('Updating password hash to use bcrypt...');
        const newPasswordHash = await bcrypt.hash('admin', 10);
        await db('users').where('id', existingAdmin.id).update({
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString(),
        });
        console.log('Password hash updated successfully!');
      }
      return;
    }

    // Check if Admin role exists
    let adminRole = await db('roles').where('name', 'Admin').first();
    if (!adminRole) {
      // Create Admin role
      const roleId = randomUUID();
      await db('roles').insert({
        id: roleId,
        name: 'Admin',
        description: 'Full system administrator with access to all features',
        permissions: JSON.stringify(['admin:*', 'user:*', 'role:*', 'dashboard:*', 'chart:*', 'report:*', 'query:*', 'data_source:*', 'filter:*', 'job:*']),
        created_at: new Date().toISOString(),
      });
      adminRole = await db('roles').where('id', roleId).first();
      console.log('Created Admin role');
    }

    // Create admin user with bcrypt hash
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash('admin', 10);

    await db('users').insert({
      id: userId,
      email: 'admin@admin.com',
      password_hash: passwordHash,
      display_name: 'Administrator',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Assign Admin role to user
    await db('user_roles').insert({
      user_id: userId,
      role_id: adminRole.id,
      assigned_at: new Date().toISOString(),
    });

    console.log('✅ Successfully created admin user:');
    console.log('   Email: admin@admin.com');
    console.log('   Password: admin');
    console.log('   Role: Admin');
    console.log('');
    console.log('You can now log in at: http://localhost:4050');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

createAdminUser();
