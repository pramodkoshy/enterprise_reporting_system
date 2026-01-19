import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Users table
  await knex.schema.createTable('users', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('display_name').notNullable();
    table.string('avatar_url');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Roles table
  await knex.schema.createTable('roles', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('name').unique().notNullable();
    table.string('description');
    table.text('permissions').notNullable(); // JSON array
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // User roles junction table
  await knex.schema.createTable('user_roles', (table) => {
    table.string('user_id', 36).references('id').inTable('users').onDelete('CASCADE');
    table.string('role_id', 36).references('id').inTable('roles').onDelete('CASCADE');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.primary(['user_id', 'role_id']);
  });

  // Data sources table
  await knex.schema.createTable('data_sources', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('name').notNullable();
    table.string('description');
    table.string('client_type').notNullable(); // 'pg', 'mysql', 'mssql', 'sqlite3', 'oracledb'
    table.text('connection_config').notNullable(); // Encrypted JSON
    table.boolean('is_active').defaultTo(true);
    table.string('created_by', 36).references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Saved queries table
  await knex.schema.createTable('saved_queries', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('name').notNullable();
    table.string('description');
    table.string('data_source_id', 36).references('id').inTable('data_sources').onDelete('CASCADE');
    table.text('sql_content').notNullable();
    table.text('parameters_schema'); // JSON Schema
    table.boolean('is_validated').defaultTo(false);
    table.text('validation_result'); // JSON
    table.string('created_by', 36).references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Report definitions table
  await knex.schema.createTable('report_definitions', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('name').notNullable();
    table.string('description');
    table.string('saved_query_id', 36).references('id').inTable('saved_queries').onDelete('SET NULL');
    table.text('column_config').notNullable(); // JSON
    table.text('filter_config'); // JSON
    table.text('sort_config'); // JSON
    table.text('pagination_config'); // JSON
    table.text('export_formats').defaultTo('["csv","xlsx","pdf"]'); // JSON array
    table.string('created_by', 36).references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Chart definitions table
  await knex.schema.createTable('chart_definitions', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('name').notNullable();
    table.string('description');
    table.string('saved_query_id', 36).references('id').inTable('saved_queries').onDelete('SET NULL');
    table.string('chart_type').notNullable(); // 'bar', 'line', 'area', 'pie', 'scatter', 'composed'
    table.text('chart_config').notNullable(); // JSON
    table.text('data_mapping').notNullable(); // JSON
    table.integer('refresh_interval'); // seconds
    table.string('created_by', 36).references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Dashboard layouts table
  await knex.schema.createTable('dashboard_layouts', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('name').notNullable();
    table.string('description');
    table.text('layout_config').notNullable(); // JSON: React Grid Layout structure
    table.text('theme_config'); // JSON
    table.text('refresh_config'); // JSON
    table.boolean('is_public').defaultTo(false);
    table.string('created_by', 36).references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Dashboard widgets table
  await knex.schema.createTable('dashboard_widgets', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('dashboard_id', 36).references('id').inTable('dashboard_layouts').onDelete('CASCADE');
    table.string('widget_type').notNullable(); // 'report', 'chart', 'metric', 'text'
    table.string('report_id', 36).references('id').inTable('report_definitions').onDelete('SET NULL');
    table.string('chart_id', 36).references('id').inTable('chart_definitions').onDelete('SET NULL');
    table.text('position_config').notNullable(); // JSON: {x, y, w, h, minW, minH}
    table.text('widget_config'); // JSON: widget-specific overrides
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Job definitions table
  await knex.schema.createTable('job_definitions', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('name').notNullable();
    table.string('job_type').notNullable(); // 'report', 'chart', 'export'
    table.string('target_id').notNullable(); // report_id or chart_id
    table.string('schedule_cron'); // Cron expression
    table.text('parameters'); // JSON
    table.text('notification_config'); // JSON
    table.boolean('is_active').defaultTo(true);
    table.string('created_by', 36).references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Job executions table
  await knex.schema.createTable('job_executions', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('job_definition_id', 36).references('id').inTable('job_definitions').onDelete('CASCADE');
    table.string('status').notNullable(); // 'pending', 'running', 'completed', 'failed', 'cancelled'
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.string('result_location'); // File path or URL
    table.text('error_message');
    table.text('execution_metadata'); // JSON
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Resource permissions table
  await knex.schema.createTable('resource_permissions', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('resource_type').notNullable(); // 'data_source', 'query', 'report', 'chart', 'dashboard'
    table.string('resource_id').notNullable();
    table.string('role_id', 36).references('id').inTable('roles').onDelete('CASCADE');
    table.string('permission_level').notNullable(); // 'view', 'edit', 'execute', 'admin'
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['resource_type', 'resource_id', 'role_id']);
  });

  // Audit log table
  await knex.schema.createTable('audit_log', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('user_id', 36).references('id').inTable('users');
    table.string('action').notNullable(); // 'create', 'update', 'delete', 'execute', 'view'
    table.string('resource_type').notNullable();
    table.string('resource_id');
    table.text('details'); // JSON
    table.string('ip_address');
    table.string('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create indexes
  await knex.schema.raw('CREATE INDEX idx_saved_queries_data_source ON saved_queries(data_source_id)');
  await knex.schema.raw('CREATE INDEX idx_report_definitions_query ON report_definitions(saved_query_id)');
  await knex.schema.raw('CREATE INDEX idx_chart_definitions_query ON chart_definitions(saved_query_id)');
  await knex.schema.raw('CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id)');
  await knex.schema.raw('CREATE INDEX idx_job_executions_definition ON job_executions(job_definition_id)');
  await knex.schema.raw('CREATE INDEX idx_job_executions_status ON job_executions(status)');
  await knex.schema.raw('CREATE INDEX idx_resource_permissions_resource ON resource_permissions(resource_type, resource_id)');
  await knex.schema.raw('CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at)');
  await knex.schema.raw('CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_log');
  await knex.schema.dropTableIfExists('resource_permissions');
  await knex.schema.dropTableIfExists('job_executions');
  await knex.schema.dropTableIfExists('job_definitions');
  await knex.schema.dropTableIfExists('dashboard_widgets');
  await knex.schema.dropTableIfExists('dashboard_layouts');
  await knex.schema.dropTableIfExists('chart_definitions');
  await knex.schema.dropTableIfExists('report_definitions');
  await knex.schema.dropTableIfExists('saved_queries');
  await knex.schema.dropTableIfExists('data_sources');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('users');
}
