import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('audit_log').del();
  await knex('resource_permissions').del();
  await knex('job_executions').del();
  await knex('job_definitions').del();
  await knex('dashboard_widgets').del();
  await knex('dashboard_layouts').del();
  await knex('chart_definitions').del();
  await knex('report_definitions').del();
  await knex('saved_queries').del();
  await knex('data_sources').del();
  await knex('user_roles').del();
  await knex('roles').del();
  await knex('users').del();

  // Create roles
  const adminRoleId = uuidv4();
  const analystRoleId = uuidv4();
  const viewerRoleId = uuidv4();

  await knex('roles').insert([
    {
      id: adminRoleId,
      name: 'Admin',
      description: 'Full system access',
      permissions: JSON.stringify([
        'admin:*',
        'data_source:*',
        'query:*',
        'report:*',
        'chart:*',
        'dashboard:*',
        'job:*',
        'user:*',
      ]),
    },
    {
      id: analystRoleId,
      name: 'Analyst',
      description: 'Can create and execute reports, charts, and queries',
      permissions: JSON.stringify([
        'data_source:view',
        'query:*',
        'report:*',
        'chart:*',
        'dashboard:view',
        'dashboard:edit',
        'job:execute',
        'job:view',
      ]),
    },
    {
      id: viewerRoleId,
      name: 'Viewer',
      description: 'View-only access to reports and dashboards',
      permissions: JSON.stringify([
        'data_source:view',
        'query:view',
        'report:view',
        'report:export',
        'chart:view',
        'dashboard:view',
      ]),
    },
  ]);

  // Create admin user
  const adminUserId = uuidv4();
  const passwordHash = await bcrypt.hash('admin123', 10);

  await knex('users').insert({
    id: adminUserId,
    email: 'admin@example.com',
    password_hash: passwordHash,
    display_name: 'System Administrator',
    is_active: true,
  });

  // Assign admin role to admin user
  await knex('user_roles').insert({
    user_id: adminUserId,
    role_id: adminRoleId,
  });

  // Create a demo analyst user
  const analystUserId = uuidv4();
  const analystPasswordHash = await bcrypt.hash('analyst123', 10);

  await knex('users').insert({
    id: analystUserId,
    email: 'analyst@example.com',
    password_hash: analystPasswordHash,
    display_name: 'Demo Analyst',
    is_active: true,
  });

  await knex('user_roles').insert({
    user_id: analystUserId,
    role_id: analystRoleId,
  });

  console.log('Seed data created successfully');
  console.log('Admin user: admin@example.com / admin123');
  console.log('Analyst user: analyst@example.com / analyst123');
}
