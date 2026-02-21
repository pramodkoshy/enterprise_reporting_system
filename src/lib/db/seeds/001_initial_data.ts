import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { encrypt } from '../../security/encryption';

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
  const passwordHash = await bcrypt.hash('admin', 10);

  await knex('users').insert({
    id: adminUserId,
    email: 'admin@admin.com',
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

  // Create a demo data source (SQLite Sakila database)
  const dataSourceId = uuidv4();
  await knex('data_sources').insert({
    id: dataSourceId,
    name: 'Sakila Demo DB',
    description: 'Sample Sakila database for testing',
    client_type: 'sqlite3',
    connection_config: encrypt(JSON.stringify({
      filename: './data/uploads/sakila.db',
    })),
    is_active: true,
    created_by: adminUserId,
  });

  // Create default saved queries for the Sakila database
  await knex('saved_queries').insert([
    {
      id: uuidv4(),
      name: 'Top 10 Actors by Film Count',
      description: 'Shows the top 10 actors who have appeared in the most films',
      data_source_id: dataSourceId,
      sql_content: 'SELECT\n  a.first_name,\n  a.last_name,\n  COUNT(fa.film_id) as film_count\nFROM actor a\nJOIN film_actor fa ON a.actor_id = fa.actor_id\nGROUP BY a.actor_id, a.first_name, a.last_name\nORDER BY film_count DESC\nLIMIT 10;',
      created_by: adminUserId,
    },
    {
      id: uuidv4(),
      name: 'Monthly Revenue Summary',
      description: 'Total revenue grouped by month and year',
      data_source_id: dataSourceId,
      sql_content: 'SELECT\n  strftime(\'%Y-%m\', p.payment_date) as month,\n  SUM(p.amount) as total_revenue,\n  COUNT(p.payment_id) as payment_count\nFROM payment p\nGROUP BY month\nORDER BY month DESC\nLIMIT 24;',
      created_by: adminUserId,
    },
    {
      id: uuidv4(),
      name: 'Film Inventory by Category',
      description: 'Number of films in each category',
      data_source_id: dataSourceId,
      sql_content: 'SELECT\n  c.name as category,\n  COUNT(fc.film_id) as film_count\nFROM category c\nJOIN film_category fc ON c.category_id = fc.category_id\nGROUP BY c.category_id, c.name\nORDER BY film_count DESC;',
      created_by: adminUserId,
    },
    {
      id: uuidv4(),
      name: 'Customer Rental Activity',
      description: 'Top customers by rental count and total spending',
      data_source_id: dataSourceId,
      sql_content: 'SELECT\n  c.first_name,\n  c.last_name,\n  COUNT(r.rental_id) as rental_count,\n  SUM(p.amount) as total_spent\nFROM customer c\nJOIN rental r ON c.customer_id = r.customer_id\nJOIN payment p ON r.rental_id = p.rental_id\nGROUP BY c.customer_id, c.first_name, c.last_name\nORDER BY total_spent DESC\nLIMIT 20;',
      created_by: adminUserId,
    },
    {
      id: uuidv4(),
      name: 'Films by Rating',
      description: 'Count of films grouped by rating (G, PG, PG-13, R, NC-17)',
      data_source_id: dataSourceId,
      sql_content: 'SELECT\n  rating,\n  COUNT(*) as film_count,\n  AVG(replacement_cost) as avg_replacement_cost\nFROM film\nGROUP BY rating\nORDER BY film_count DESC;',
      created_by: adminUserId,
    },
    {
      id: uuidv4(),
      name: 'Store Performance',
      description: 'Revenue and rental counts per store',
      data_source_id: dataSourceId,
      sql_content: 'SELECT\n  s.store_id,\n  COUNT(DISTINCT s.staff_id) as staff_count,\n  COUNT(DISTINCT c.customer_id) as customer_count,\n  COUNT(DISTINCT r.rental_id) as rental_count,\n  SUM(p.amount) as total_revenue\nFROM store s\nLEFT JOIN staff st ON s.store_id = st.store_id\nLEFT JOIN customer c ON s.store_id = c.store_id\nLEFT JOIN inventory i ON s.store_id = i.store_id\nLEFT JOIN rental r ON i.inventory_id = r.inventory_id\nLEFT JOIN payment p ON r.rental_id = p.rental_id\nGROUP BY s.store_id;',
      created_by: adminUserId,
    },
  ]);

  console.log('Seed data created successfully');
  console.log('=================================');
  console.log('DEFAULT ADMIN CREDENTIALS:');
  console.log('Email: admin@admin.com');
  console.log('Password: admin');
  console.log('=================================');
  console.log('Analyst user: analyst@example.com / analyst123');
}
