import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add field_type and operator columns to filter_definitions table
  await knex.schema.alterTable('filter_definitions', (table) => {
    table.string('field_type').defaultTo('id').after('value_field');
    table.string('operator').defaultTo('in').after('field_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('filter_definitions', (table) => {
    table.dropColumn('field_type');
    table.dropColumn('operator');
  });
}
