import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Email templates table for dynamic email template system
  await knex.schema.createTable('email_templates', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(16))))'));
    table.string('name', 255).notNullable();
    table.text('subject').notNullable();
    table.text('htmlBody').notNullable();
    table.string('query_id', 36).nullable().references('id').inTable('saved_queries').onDelete('SET NULL');
    table.text('columnMappings'); // JSON object mapping placeholders to column names
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('query_id');
    table.index('name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('email_templates');
}
