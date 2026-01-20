import type { Knex } from 'knex';

/**
 * Test Database Schema with 40 tables and foreign key relationships
 * Designed for comprehensive testing of complex joins and queries
 */
export async function createTestSchema(knex: Knex): Promise<void> {
  // 1. Core lookup tables (no foreign keys)
  await knex.schema.createTable('countries', (table) => {
    table.increments('id').primary();
    table.string('code', 3).notNullable().unique();
    table.string('name', 100).notNullable();
    table.string('region', 50);
    table.string('currency_code', 3);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('currencies', (table) => {
    table.increments('id').primary();
    table.string('code', 3).notNullable().unique();
    table.string('name', 50).notNullable();
    table.string('symbol', 5);
    table.decimal('exchange_rate', 10, 4).defaultTo(1);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description');
    table.integer('parent_id').unsigned().references('id').inTable('categories');
    table.integer('level').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('brands', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('logo_url', 255);
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('suppliers', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.string('contact_name', 100);
    table.string('email', 100);
    table.string('phone', 20);
    table.text('address');
    table.integer('country_id').unsigned().references('id').inTable('countries');
    table.string('rating', 5);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 2. Organizational tables
  await knex.schema.createTable('departments', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description');
    table.integer('parent_id').unsigned().references('id').inTable('departments');
    table.integer('budget').unsigned();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('positions', (table) => {
    table.increments('id').primary();
    table.string('title', 100).notNullable();
    table.integer('department_id').unsigned().references('id').inTable('departments');
    table.decimal('min_salary', 12, 2);
    table.decimal('max_salary', 12, 2);
    table.integer('level').defaultTo(1);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('employees', (table) => {
    table.increments('id').primary();
    table.string('employee_number', 20).notNullable().unique();
    table.string('first_name', 50).notNullable();
    table.string('last_name', 50).notNullable();
    table.string('email', 100).notNullable().unique();
    table.string('phone', 20);
    table.date('hire_date').notNullable();
    table.date('termination_date');
    table.integer('position_id').unsigned().references('id').inTable('positions');
    table.integer('manager_id').unsigned().references('id').inTable('employees');
    table.integer('department_id').unsigned().references('id').inTable('departments');
    table.decimal('salary', 12, 2);
    table.string('status', 20).defaultTo('active');
    table.timestamps(true, true);
  });

  // 3. Customer tables
  await knex.schema.createTable('customer_types', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable();
    table.text('description');
    table.decimal('discount_percentage', 5, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('customers', (table) => {
    table.increments('id').primary();
    table.string('customer_number', 20).notNullable().unique();
    table.string('company_name', 200);
    table.string('first_name', 50);
    table.string('last_name', 50);
    table.string('email', 100).notNullable();
    table.string('phone', 20);
    table.integer('customer_type_id').unsigned().references('id').inTable('customer_types');
    table.integer('country_id').unsigned().references('id').inTable('countries');
    table.integer('assigned_employee_id').unsigned().references('id').inTable('employees');
    table.decimal('credit_limit', 12, 2).defaultTo(0);
    table.string('status', 20).defaultTo('active');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('customer_addresses', (table) => {
    table.increments('id').primary();
    table.integer('customer_id').unsigned().notNullable().references('id').inTable('customers').onDelete('CASCADE');
    table.string('address_type', 20).notNullable();
    table.string('street_address', 255).notNullable();
    table.string('city', 100).notNullable();
    table.string('state', 100);
    table.string('postal_code', 20);
    table.integer('country_id').unsigned().references('id').inTable('countries');
    table.boolean('is_default').defaultTo(false);
    table.timestamps(true, true);
  });

  // 4. Product tables
  await knex.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.string('sku', 50).notNullable().unique();
    table.string('name', 200).notNullable();
    table.text('description');
    table.integer('category_id').unsigned().references('id').inTable('categories');
    table.integer('brand_id').unsigned().references('id').inTable('brands');
    table.integer('supplier_id').unsigned().references('id').inTable('suppliers');
    table.decimal('unit_price', 12, 2).notNullable();
    table.decimal('cost_price', 12, 2);
    table.integer('quantity_in_stock').defaultTo(0);
    table.integer('reorder_level').defaultTo(10);
    table.string('unit_of_measure', 20);
    table.decimal('weight', 10, 3);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('product_attributes', (table) => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.string('attribute_name', 50).notNullable();
    table.string('attribute_value', 255).notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('product_images', (table) => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.string('image_url', 255).notNullable();
    table.string('alt_text', 255);
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_primary').defaultTo(false);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('product_pricing_history', (table) => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.decimal('old_price', 12, 2).notNullable();
    table.decimal('new_price', 12, 2).notNullable();
    table.date('effective_date').notNullable();
    table.string('reason', 255);
    table.integer('changed_by').unsigned().references('id').inTable('employees');
    table.timestamps(true, true);
  });

  // 5. Inventory tables
  await knex.schema.createTable('warehouses', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('code', 10).notNullable().unique();
    table.text('address');
    table.integer('country_id').unsigned().references('id').inTable('countries');
    table.integer('manager_id').unsigned().references('id').inTable('employees');
    table.integer('capacity').unsigned();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('inventory', (table) => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    table.integer('warehouse_id').unsigned().notNullable().references('id').inTable('warehouses');
    table.integer('quantity').notNullable().defaultTo(0);
    table.string('bin_location', 50);
    table.date('last_counted_date');
    table.timestamps(true, true);
    table.unique(['product_id', 'warehouse_id']);
  });

  await knex.schema.createTable('inventory_transactions', (table) => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    table.integer('warehouse_id').unsigned().notNullable().references('id').inTable('warehouses');
    table.string('transaction_type', 20).notNullable();
    table.integer('quantity').notNullable();
    table.integer('previous_quantity').notNullable();
    table.integer('new_quantity').notNullable();
    table.string('reference_type', 50);
    table.integer('reference_id');
    table.text('notes');
    table.integer('performed_by').unsigned().references('id').inTable('employees');
    table.timestamps(true, true);
  });

  // 6. Order tables
  await knex.schema.createTable('order_statuses', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.text('description');
    table.string('color', 7);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('shipping_methods', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description');
    table.decimal('base_cost', 10, 2).notNullable();
    table.decimal('cost_per_kg', 10, 2);
    table.integer('estimated_days_min');
    table.integer('estimated_days_max');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('payment_methods', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable();
    table.text('description');
    table.decimal('processing_fee_percentage', 5, 2).defaultTo(0);
    table.decimal('processing_fee_fixed', 10, 2).defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('orders', (table) => {
    table.increments('id').primary();
    table.string('order_number', 20).notNullable().unique();
    table.integer('customer_id').unsigned().notNullable().references('id').inTable('customers');
    table.integer('status_id').unsigned().notNullable().references('id').inTable('order_statuses');
    table.date('order_date').notNullable();
    table.date('required_date');
    table.date('shipped_date');
    table.integer('shipping_address_id').unsigned().references('id').inTable('customer_addresses');
    table.integer('billing_address_id').unsigned().references('id').inTable('customer_addresses');
    table.integer('shipping_method_id').unsigned().references('id').inTable('shipping_methods');
    table.integer('payment_method_id').unsigned().references('id').inTable('payment_methods');
    table.decimal('subtotal', 12, 2).notNullable();
    table.decimal('tax_amount', 12, 2).defaultTo(0);
    table.decimal('shipping_cost', 12, 2).defaultTo(0);
    table.decimal('discount_amount', 12, 2).defaultTo(0);
    table.decimal('total_amount', 12, 2).notNullable();
    table.integer('currency_id').unsigned().references('id').inTable('currencies');
    table.integer('sales_rep_id').unsigned().references('id').inTable('employees');
    table.text('notes');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('order_items', (table) => {
    table.increments('id').primary();
    table.integer('order_id').unsigned().notNullable().references('id').inTable('orders').onDelete('CASCADE');
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    table.integer('quantity').notNullable();
    table.decimal('unit_price', 12, 2).notNullable();
    table.decimal('discount_percentage', 5, 2).defaultTo(0);
    table.decimal('line_total', 12, 2).notNullable();
    table.integer('warehouse_id').unsigned().references('id').inTable('warehouses');
    table.timestamps(true, true);
  });

  // 7. Financial tables
  await knex.schema.createTable('invoices', (table) => {
    table.increments('id').primary();
    table.string('invoice_number', 20).notNullable().unique();
    table.integer('order_id').unsigned().notNullable().references('id').inTable('orders');
    table.integer('customer_id').unsigned().notNullable().references('id').inTable('customers');
    table.date('invoice_date').notNullable();
    table.date('due_date').notNullable();
    table.decimal('subtotal', 12, 2).notNullable();
    table.decimal('tax_amount', 12, 2).defaultTo(0);
    table.decimal('total_amount', 12, 2).notNullable();
    table.decimal('amount_paid', 12, 2).defaultTo(0);
    table.string('status', 20).defaultTo('pending');
    table.text('notes');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('payments', (table) => {
    table.increments('id').primary();
    table.string('payment_number', 20).notNullable().unique();
    table.integer('invoice_id').unsigned().notNullable().references('id').inTable('invoices');
    table.integer('customer_id').unsigned().notNullable().references('id').inTable('customers');
    table.integer('payment_method_id').unsigned().references('id').inTable('payment_methods');
    table.date('payment_date').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.string('reference_number', 100);
    table.string('status', 20).defaultTo('completed');
    table.text('notes');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('credit_notes', (table) => {
    table.increments('id').primary();
    table.string('credit_note_number', 20).notNullable().unique();
    table.integer('invoice_id').unsigned().references('id').inTable('invoices');
    table.integer('customer_id').unsigned().notNullable().references('id').inTable('customers');
    table.date('credit_date').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.string('reason', 255);
    table.string('status', 20).defaultTo('issued');
    table.timestamps(true, true);
  });

  // 8. Purchase tables
  await knex.schema.createTable('purchase_orders', (table) => {
    table.increments('id').primary();
    table.string('po_number', 20).notNullable().unique();
    table.integer('supplier_id').unsigned().notNullable().references('id').inTable('suppliers');
    table.integer('warehouse_id').unsigned().references('id').inTable('warehouses');
    table.date('order_date').notNullable();
    table.date('expected_date');
    table.date('received_date');
    table.decimal('subtotal', 12, 2).notNullable();
    table.decimal('tax_amount', 12, 2).defaultTo(0);
    table.decimal('shipping_cost', 12, 2).defaultTo(0);
    table.decimal('total_amount', 12, 2).notNullable();
    table.string('status', 20).defaultTo('pending');
    table.integer('created_by').unsigned().references('id').inTable('employees');
    table.integer('approved_by').unsigned().references('id').inTable('employees');
    table.text('notes');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('purchase_order_items', (table) => {
    table.increments('id').primary();
    table.integer('purchase_order_id').unsigned().notNullable().references('id').inTable('purchase_orders').onDelete('CASCADE');
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    table.integer('quantity_ordered').notNullable();
    table.integer('quantity_received').defaultTo(0);
    table.decimal('unit_cost', 12, 2).notNullable();
    table.decimal('line_total', 12, 2).notNullable();
    table.timestamps(true, true);
  });

  // 9. Shipping tables
  await knex.schema.createTable('shipments', (table) => {
    table.increments('id').primary();
    table.string('tracking_number', 50).notNullable().unique();
    table.integer('order_id').unsigned().notNullable().references('id').inTable('orders');
    table.integer('shipping_method_id').unsigned().references('id').inTable('shipping_methods');
    table.integer('warehouse_id').unsigned().references('id').inTable('warehouses');
    table.date('ship_date');
    table.date('delivery_date');
    table.string('status', 20).defaultTo('pending');
    table.decimal('weight', 10, 3);
    table.decimal('shipping_cost', 10, 2);
    table.text('notes');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('shipment_items', (table) => {
    table.increments('id').primary();
    table.integer('shipment_id').unsigned().notNullable().references('id').inTable('shipments').onDelete('CASCADE');
    table.integer('order_item_id').unsigned().notNullable().references('id').inTable('order_items');
    table.integer('quantity').notNullable();
    table.timestamps(true, true);
  });

  // 10. Review and feedback tables
  await knex.schema.createTable('product_reviews', (table) => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    table.integer('customer_id').unsigned().notNullable().references('id').inTable('customers');
    table.integer('order_id').unsigned().references('id').inTable('orders');
    table.integer('rating').notNullable();
    table.string('title', 255);
    table.text('review_text');
    table.boolean('is_verified_purchase').defaultTo(false);
    table.boolean('is_approved').defaultTo(false);
    table.timestamps(true, true);
  });

  // 11. Marketing tables
  await knex.schema.createTable('promotions', (table) => {
    table.increments('id').primary();
    table.string('code', 50).notNullable().unique();
    table.string('name', 200).notNullable();
    table.text('description');
    table.string('discount_type', 20).notNullable();
    table.decimal('discount_value', 10, 2).notNullable();
    table.decimal('minimum_order_value', 12, 2);
    table.decimal('maximum_discount', 12, 2);
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.integer('usage_limit');
    table.integer('usage_count').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('promotion_products', (table) => {
    table.increments('id').primary();
    table.integer('promotion_id').unsigned().notNullable().references('id').inTable('promotions').onDelete('CASCADE');
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    table.timestamps(true, true);
    table.unique(['promotion_id', 'product_id']);
  });

  await knex.schema.createTable('customer_promotions', (table) => {
    table.increments('id').primary();
    table.integer('customer_id').unsigned().notNullable().references('id').inTable('customers');
    table.integer('promotion_id').unsigned().notNullable().references('id').inTable('promotions');
    table.integer('order_id').unsigned().references('id').inTable('orders');
    table.date('used_date');
    table.decimal('discount_applied', 12, 2);
    table.timestamps(true, true);
  });

  // 12. Activity and audit tables
  await knex.schema.createTable('activity_logs', (table) => {
    table.increments('id').primary();
    table.integer('employee_id').unsigned().references('id').inTable('employees');
    table.integer('customer_id').unsigned().references('id').inTable('customers');
    table.string('action_type', 50).notNullable();
    table.string('entity_type', 50).notNullable();
    table.integer('entity_id');
    table.text('details');
    table.string('ip_address', 45);
    table.string('user_agent', 255);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('email_logs', (table) => {
    table.increments('id').primary();
    table.integer('customer_id').unsigned().references('id').inTable('customers');
    table.string('email_type', 50).notNullable();
    table.string('recipient', 255).notNullable();
    table.string('subject', 255).notNullable();
    table.text('body');
    table.string('status', 20).defaultTo('sent');
    table.datetime('sent_at');
    table.datetime('opened_at');
    table.datetime('clicked_at');
    table.timestamps(true, true);
  });

  // 13. Analytics/reporting helper tables
  await knex.schema.createTable('daily_sales_summary', (table) => {
    table.increments('id').primary();
    table.date('summary_date').notNullable().unique();
    table.integer('total_orders').defaultTo(0);
    table.decimal('total_revenue', 14, 2).defaultTo(0);
    table.decimal('total_cost', 14, 2).defaultTo(0);
    table.decimal('total_profit', 14, 2).defaultTo(0);
    table.integer('total_items_sold').defaultTo(0);
    table.integer('unique_customers').defaultTo(0);
    table.decimal('average_order_value', 12, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('monthly_category_sales', (table) => {
    table.increments('id').primary();
    table.integer('year').notNullable();
    table.integer('month').notNullable();
    table.integer('category_id').unsigned().references('id').inTable('categories');
    table.integer('total_orders').defaultTo(0);
    table.integer('total_quantity').defaultTo(0);
    table.decimal('total_revenue', 14, 2).defaultTo(0);
    table.timestamps(true, true);
    table.unique(['year', 'month', 'category_id']);
  });

  await knex.schema.createTable('customer_lifetime_value', (table) => {
    table.increments('id').primary();
    table.integer('customer_id').unsigned().notNullable().references('id').inTable('customers').unique();
    table.integer('total_orders').defaultTo(0);
    table.decimal('total_spent', 14, 2).defaultTo(0);
    table.decimal('average_order_value', 12, 2).defaultTo(0);
    table.date('first_order_date');
    table.date('last_order_date');
    table.integer('days_since_last_order');
    table.string('customer_segment', 50);
    table.timestamps(true, true);
  });

  // Create indexes for better query performance
  await knex.schema.raw('CREATE INDEX idx_orders_customer_id ON orders(customer_id)');
  await knex.schema.raw('CREATE INDEX idx_orders_order_date ON orders(order_date)');
  await knex.schema.raw('CREATE INDEX idx_orders_status_id ON orders(status_id)');
  await knex.schema.raw('CREATE INDEX idx_order_items_order_id ON order_items(order_id)');
  await knex.schema.raw('CREATE INDEX idx_order_items_product_id ON order_items(product_id)');
  await knex.schema.raw('CREATE INDEX idx_products_category_id ON products(category_id)');
  await knex.schema.raw('CREATE INDEX idx_products_brand_id ON products(brand_id)');
  await knex.schema.raw('CREATE INDEX idx_products_supplier_id ON products(supplier_id)');
  await knex.schema.raw('CREATE INDEX idx_inventory_product_id ON inventory(product_id)');
  await knex.schema.raw('CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id)');
  await knex.schema.raw('CREATE INDEX idx_customers_country_id ON customers(country_id)');
  await knex.schema.raw('CREATE INDEX idx_employees_department_id ON employees(department_id)');
  await knex.schema.raw('CREATE INDEX idx_employees_position_id ON employees(position_id)');
  await knex.schema.raw('CREATE INDEX idx_invoices_order_id ON invoices(order_id)');
  await knex.schema.raw('CREATE INDEX idx_invoices_customer_id ON invoices(customer_id)');
  await knex.schema.raw('CREATE INDEX idx_payments_invoice_id ON payments(invoice_id)');
  await knex.schema.raw('CREATE INDEX idx_shipments_order_id ON shipments(order_id)');
  await knex.schema.raw('CREATE INDEX idx_activity_logs_employee_id ON activity_logs(employee_id)');
  await knex.schema.raw('CREATE INDEX idx_activity_logs_customer_id ON activity_logs(customer_id)');
  await knex.schema.raw('CREATE INDEX idx_daily_sales_summary_date ON daily_sales_summary(summary_date)');
}

export async function dropTestSchema(knex: Knex): Promise<void> {
  const tables = [
    'customer_lifetime_value',
    'monthly_category_sales',
    'daily_sales_summary',
    'email_logs',
    'activity_logs',
    'customer_promotions',
    'promotion_products',
    'promotions',
    'product_reviews',
    'shipment_items',
    'shipments',
    'purchase_order_items',
    'purchase_orders',
    'credit_notes',
    'payments',
    'invoices',
    'order_items',
    'orders',
    'payment_methods',
    'shipping_methods',
    'order_statuses',
    'inventory_transactions',
    'inventory',
    'warehouses',
    'product_pricing_history',
    'product_images',
    'product_attributes',
    'products',
    'customer_addresses',
    'customers',
    'customer_types',
    'employees',
    'positions',
    'departments',
    'suppliers',
    'brands',
    'categories',
    'currencies',
    'countries',
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}

export const TABLE_NAMES = [
  'countries',
  'currencies',
  'categories',
  'brands',
  'suppliers',
  'departments',
  'positions',
  'employees',
  'customer_types',
  'customers',
  'customer_addresses',
  'products',
  'product_attributes',
  'product_images',
  'product_pricing_history',
  'warehouses',
  'inventory',
  'inventory_transactions',
  'order_statuses',
  'shipping_methods',
  'payment_methods',
  'orders',
  'order_items',
  'invoices',
  'payments',
  'credit_notes',
  'purchase_orders',
  'purchase_order_items',
  'shipments',
  'shipment_items',
  'product_reviews',
  'promotions',
  'promotion_products',
  'customer_promotions',
  'activity_logs',
  'email_logs',
  'daily_sales_summary',
  'monthly_category_sales',
  'customer_lifetime_value',
];
