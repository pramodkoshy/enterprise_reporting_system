/**
 * Test Database Seeder
 * Generates 300,000 records per table for performance testing
 * Uses batch inserts for efficiency and maintains referential integrity
 */

import knex, { Knex } from 'knex';
import { faker } from '@faker-js/faker';
import path from 'path';
import fs from 'fs';
import { createTestSchema, dropTestSchema, TABLE_NAMES } from './test-database-schema';

const RECORDS_PER_TABLE = 300000;
const BATCH_SIZE = 5000;
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test.sqlite');

// Ensure data directory exists
const dataDir = path.dirname(TEST_DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize Knex
const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: TEST_DB_PATH,
  },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1,
  },
});

// Performance tracking
const perfStats: Record<string, { duration: number; records: number }> = {};

function logProgress(table: string, current: number, total: number) {
  const percent = Math.round((current / total) * 100);
  process.stdout.write(`\r  Seeding ${table}: ${percent}% (${current.toLocaleString()}/${total.toLocaleString()})`);
}

function logComplete(table: string, duration: number, records: number) {
  const rate = Math.round(records / (duration / 1000));
  console.log(`\n  Completed ${table}: ${records.toLocaleString()} records in ${(duration / 1000).toFixed(2)}s (${rate.toLocaleString()} records/sec)`);
  perfStats[table] = { duration, records };
}

async function batchInsert(
  tableName: string,
  generator: (index: number) => Record<string, unknown>,
  count: number
): Promise<void> {
  const start = Date.now();
  let inserted = 0;

  while (inserted < count) {
    const batchCount = Math.min(BATCH_SIZE, count - inserted);
    const batch: Record<string, unknown>[] = [];

    for (let i = 0; i < batchCount; i++) {
      batch.push(generator(inserted + i));
    }

    await db(tableName).insert(batch);
    inserted += batchCount;
    logProgress(tableName, inserted, count);
  }

  logComplete(tableName, Date.now() - start, count);
}

// Data generators for each table
const generators = {
  countries: (index: number) => ({
    code: faker.string.alpha({ length: 3, casing: 'upper' }) + index.toString().slice(-2),
    name: faker.location.country() + ` ${index}`,
    region: faker.helpers.arrayElement(['Americas', 'Europe', 'Asia', 'Africa', 'Oceania']),
    currency_code: faker.string.alpha({ length: 3, casing: 'upper' }),
  }),

  currencies: (index: number) => ({
    code: faker.string.alpha({ length: 3, casing: 'upper' }) + index.toString().slice(-2),
    name: faker.finance.currencyName() + ` ${index}`,
    symbol: faker.finance.currencySymbol(),
    exchange_rate: faker.number.float({ min: 0.01, max: 100, fractionDigits: 4 }),
  }),

  categories: (index: number) => ({
    name: faker.commerce.department() + ` ${index}`,
    description: faker.commerce.productDescription(),
    parent_id: index > 1000 ? faker.number.int({ min: 1, max: 1000 }) : null,
    level: index > 1000 ? 1 : 0,
    is_active: faker.datatype.boolean({ probability: 0.95 }),
  }),

  brands: (index: number) => ({
    name: faker.company.name() + ` ${index}`,
    logo_url: faker.image.url(),
    description: faker.company.catchPhrase(),
    is_active: faker.datatype.boolean({ probability: 0.9 }),
  }),

  suppliers: (index: number, countryCount: number) => ({
    name: faker.company.name() + ` Supplier ${index}`,
    contact_name: faker.person.fullName(),
    email: faker.internet.email() + index,
    phone: faker.phone.number(),
    address: faker.location.streetAddress(true),
    country_id: faker.number.int({ min: 1, max: Math.min(countryCount, RECORDS_PER_TABLE) }),
    rating: faker.helpers.arrayElement(['A', 'B', 'C', 'D']),
    is_active: faker.datatype.boolean({ probability: 0.85 }),
  }),

  departments: (index: number) => ({
    name: faker.commerce.department() + ` Dept ${index}`,
    description: faker.lorem.sentence(),
    parent_id: index > 500 ? faker.number.int({ min: 1, max: 500 }) : null,
    budget: faker.number.int({ min: 10000, max: 1000000 }),
  }),

  positions: (index: number, deptCount: number) => ({
    title: faker.person.jobTitle() + ` ${index}`,
    department_id: faker.number.int({ min: 1, max: Math.min(deptCount, RECORDS_PER_TABLE) }),
    min_salary: faker.number.float({ min: 30000, max: 80000, fractionDigits: 2 }),
    max_salary: faker.number.float({ min: 80001, max: 200000, fractionDigits: 2 }),
    level: faker.number.int({ min: 1, max: 10 }),
  }),

  employees: (index: number, posCount: number, deptCount: number) => ({
    employee_number: `EMP${String(index).padStart(8, '0')}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: `employee${index}@company.test`,
    phone: faker.phone.number(),
    hire_date: faker.date.past({ years: 10 }).toISOString().split('T')[0],
    termination_date: faker.datatype.boolean({ probability: 0.1 })
      ? faker.date.past({ years: 1 }).toISOString().split('T')[0]
      : null,
    position_id: faker.number.int({ min: 1, max: Math.min(posCount, RECORDS_PER_TABLE) }),
    manager_id: index > 100 ? faker.number.int({ min: 1, max: 100 }) : null,
    department_id: faker.number.int({ min: 1, max: Math.min(deptCount, RECORDS_PER_TABLE) }),
    salary: faker.number.float({ min: 35000, max: 180000, fractionDigits: 2 }),
    status: faker.helpers.arrayElement(['active', 'inactive', 'on_leave']),
  }),

  customer_types: (index: number) => ({
    name: faker.helpers.arrayElement(['Individual', 'Business', 'Enterprise', 'Government', 'Non-Profit']) + ` ${index}`,
    description: faker.lorem.sentence(),
    discount_percentage: faker.number.float({ min: 0, max: 25, fractionDigits: 2 }),
  }),

  customers: (index: number, typeCount: number, countryCount: number, empCount: number) => ({
    customer_number: `CUST${String(index).padStart(8, '0')}`,
    company_name: faker.datatype.boolean({ probability: 0.6 }) ? faker.company.name() : null,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: `customer${index}@email.test`,
    phone: faker.phone.number(),
    customer_type_id: faker.number.int({ min: 1, max: Math.min(typeCount, RECORDS_PER_TABLE) }),
    country_id: faker.number.int({ min: 1, max: Math.min(countryCount, RECORDS_PER_TABLE) }),
    assigned_employee_id: faker.number.int({ min: 1, max: Math.min(empCount, RECORDS_PER_TABLE) }),
    credit_limit: faker.number.float({ min: 1000, max: 100000, fractionDigits: 2 }),
    status: faker.helpers.arrayElement(['active', 'inactive', 'suspended']),
  }),

  customer_addresses: (index: number, custCount: number, countryCount: number) => ({
    customer_id: faker.number.int({ min: 1, max: Math.min(custCount, RECORDS_PER_TABLE) }),
    address_type: faker.helpers.arrayElement(['billing', 'shipping', 'both']),
    street_address: faker.location.streetAddress(true),
    city: faker.location.city(),
    state: faker.location.state(),
    postal_code: faker.location.zipCode(),
    country_id: faker.number.int({ min: 1, max: Math.min(countryCount, RECORDS_PER_TABLE) }),
    is_default: faker.datatype.boolean({ probability: 0.3 }),
  }),

  products: (index: number, catCount: number, brandCount: number, supplierCount: number) => ({
    sku: `SKU${String(index).padStart(10, '0')}`,
    name: faker.commerce.productName() + ` ${index}`,
    description: faker.commerce.productDescription(),
    category_id: faker.number.int({ min: 1, max: Math.min(catCount, RECORDS_PER_TABLE) }),
    brand_id: faker.number.int({ min: 1, max: Math.min(brandCount, RECORDS_PER_TABLE) }),
    supplier_id: faker.number.int({ min: 1, max: Math.min(supplierCount, RECORDS_PER_TABLE) }),
    unit_price: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    cost_price: faker.number.float({ min: 0.5, max: 500, fractionDigits: 2 }),
    quantity_in_stock: faker.number.int({ min: 0, max: 10000 }),
    reorder_level: faker.number.int({ min: 5, max: 100 }),
    unit_of_measure: faker.helpers.arrayElement(['EA', 'PK', 'BX', 'CS', 'KG', 'LB']),
    weight: faker.number.float({ min: 0.1, max: 50, fractionDigits: 3 }),
    is_active: faker.datatype.boolean({ probability: 0.92 }),
  }),

  product_attributes: (index: number, prodCount: number) => ({
    product_id: faker.number.int({ min: 1, max: Math.min(prodCount, RECORDS_PER_TABLE) }),
    attribute_name: faker.helpers.arrayElement(['Color', 'Size', 'Material', 'Style', 'Finish']),
    attribute_value: faker.commerce.productAdjective(),
  }),

  product_images: (index: number, prodCount: number) => ({
    product_id: faker.number.int({ min: 1, max: Math.min(prodCount, RECORDS_PER_TABLE) }),
    image_url: faker.image.url(),
    alt_text: faker.lorem.words(3),
    sort_order: faker.number.int({ min: 0, max: 5 }),
    is_primary: faker.datatype.boolean({ probability: 0.2 }),
  }),

  product_pricing_history: (index: number, prodCount: number, empCount: number) => ({
    product_id: faker.number.int({ min: 1, max: Math.min(prodCount, RECORDS_PER_TABLE) }),
    old_price: faker.number.float({ min: 1, max: 900, fractionDigits: 2 }),
    new_price: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
    effective_date: faker.date.past({ years: 2 }).toISOString().split('T')[0],
    reason: faker.helpers.arrayElement(['Price increase', 'Sale', 'Cost adjustment', 'Market change']),
    changed_by: faker.number.int({ min: 1, max: Math.min(empCount, RECORDS_PER_TABLE) }),
  }),

  warehouses: (index: number, countryCount: number, empCount: number) => ({
    name: `Warehouse ${faker.location.city()} ${index}`,
    code: `WH${String(index).padStart(5, '0')}`,
    address: faker.location.streetAddress(true),
    country_id: faker.number.int({ min: 1, max: Math.min(countryCount, RECORDS_PER_TABLE) }),
    manager_id: faker.number.int({ min: 1, max: Math.min(empCount, RECORDS_PER_TABLE) }),
    capacity: faker.number.int({ min: 1000, max: 100000 }),
    is_active: faker.datatype.boolean({ probability: 0.9 }),
  }),

  inventory: (index: number, prodCount: number, whCount: number) => ({
    product_id: (index % Math.min(prodCount, RECORDS_PER_TABLE)) + 1,
    warehouse_id: (Math.floor(index / prodCount) % Math.min(whCount, RECORDS_PER_TABLE)) + 1,
    quantity: faker.number.int({ min: 0, max: 5000 }),
    bin_location: faker.string.alphanumeric(6).toUpperCase(),
    last_counted_date: faker.date.past({ years: 1 }).toISOString().split('T')[0],
  }),

  inventory_transactions: (index: number, prodCount: number, whCount: number, empCount: number) => ({
    product_id: faker.number.int({ min: 1, max: Math.min(prodCount, RECORDS_PER_TABLE) }),
    warehouse_id: faker.number.int({ min: 1, max: Math.min(whCount, RECORDS_PER_TABLE) }),
    transaction_type: faker.helpers.arrayElement(['receipt', 'shipment', 'adjustment', 'transfer', 'return']),
    quantity: faker.number.int({ min: -100, max: 500 }),
    previous_quantity: faker.number.int({ min: 0, max: 1000 }),
    new_quantity: faker.number.int({ min: 0, max: 1500 }),
    reference_type: faker.helpers.arrayElement(['order', 'purchase_order', 'adjustment', 'count']),
    reference_id: faker.number.int({ min: 1, max: 100000 }),
    notes: faker.lorem.sentence(),
    performed_by: faker.number.int({ min: 1, max: Math.min(empCount, RECORDS_PER_TABLE) }),
  }),

  order_statuses: (index: number) => ({
    name: faker.helpers.arrayElement(['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded']) + ` ${index}`,
    description: faker.lorem.sentence(),
    color: faker.internet.color(),
    sort_order: index,
  }),

  shipping_methods: (index: number) => ({
    name: faker.helpers.arrayElement(['Standard', 'Express', 'Overnight', 'Economy', 'Priority']) + ` ${index}`,
    description: faker.lorem.sentence(),
    base_cost: faker.number.float({ min: 5, max: 50, fractionDigits: 2 }),
    cost_per_kg: faker.number.float({ min: 0.5, max: 5, fractionDigits: 2 }),
    estimated_days_min: faker.number.int({ min: 1, max: 5 }),
    estimated_days_max: faker.number.int({ min: 5, max: 14 }),
    is_active: faker.datatype.boolean({ probability: 0.85 }),
  }),

  payment_methods: (index: number) => ({
    name: faker.helpers.arrayElement(['Credit Card', 'Debit Card', 'PayPal', 'Wire Transfer', 'Check', 'Cash']) + ` ${index}`,
    description: faker.lorem.sentence(),
    processing_fee_percentage: faker.number.float({ min: 0, max: 3, fractionDigits: 2 }),
    processing_fee_fixed: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    is_active: faker.datatype.boolean({ probability: 0.9 }),
  }),

  orders: (index: number, custCount: number, statusCount: number, addrCount: number, shipCount: number, payCount: number, currCount: number, empCount: number) => {
    const subtotal = faker.number.float({ min: 20, max: 5000, fractionDigits: 2 });
    const taxAmount = subtotal * 0.08;
    const shippingCost = faker.number.float({ min: 0, max: 50, fractionDigits: 2 });
    const discountAmount = faker.number.float({ min: 0, max: subtotal * 0.2, fractionDigits: 2 });
    return {
      order_number: `ORD${String(index).padStart(10, '0')}`,
      customer_id: faker.number.int({ min: 1, max: Math.min(custCount, RECORDS_PER_TABLE) }),
      status_id: faker.number.int({ min: 1, max: Math.min(statusCount, RECORDS_PER_TABLE) }),
      order_date: faker.date.past({ years: 3 }).toISOString().split('T')[0],
      required_date: faker.date.future({ years: 1 }).toISOString().split('T')[0],
      shipped_date: faker.datatype.boolean({ probability: 0.7 }) ? faker.date.past({ years: 1 }).toISOString().split('T')[0] : null,
      shipping_address_id: faker.number.int({ min: 1, max: Math.min(addrCount, RECORDS_PER_TABLE) }),
      billing_address_id: faker.number.int({ min: 1, max: Math.min(addrCount, RECORDS_PER_TABLE) }),
      shipping_method_id: faker.number.int({ min: 1, max: Math.min(shipCount, RECORDS_PER_TABLE) }),
      payment_method_id: faker.number.int({ min: 1, max: Math.min(payCount, RECORDS_PER_TABLE) }),
      subtotal,
      tax_amount: taxAmount,
      shipping_cost: shippingCost,
      discount_amount: discountAmount,
      total_amount: subtotal + taxAmount + shippingCost - discountAmount,
      currency_id: faker.number.int({ min: 1, max: Math.min(currCount, RECORDS_PER_TABLE) }),
      sales_rep_id: faker.number.int({ min: 1, max: Math.min(empCount, RECORDS_PER_TABLE) }),
      notes: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : null,
    };
  },

  order_items: (index: number, orderCount: number, prodCount: number, whCount: number) => {
    const quantity = faker.number.int({ min: 1, max: 20 });
    const unitPrice = faker.number.float({ min: 5, max: 500, fractionDigits: 2 });
    const discountPercentage = faker.number.float({ min: 0, max: 20, fractionDigits: 2 });
    return {
      order_id: faker.number.int({ min: 1, max: Math.min(orderCount, RECORDS_PER_TABLE) }),
      product_id: faker.number.int({ min: 1, max: Math.min(prodCount, RECORDS_PER_TABLE) }),
      quantity,
      unit_price: unitPrice,
      discount_percentage: discountPercentage,
      line_total: quantity * unitPrice * (1 - discountPercentage / 100),
      warehouse_id: faker.number.int({ min: 1, max: Math.min(whCount, RECORDS_PER_TABLE) }),
    };
  },

  invoices: (index: number, orderCount: number, custCount: number) => {
    const subtotal = faker.number.float({ min: 20, max: 5000, fractionDigits: 2 });
    const taxAmount = subtotal * 0.08;
    const totalAmount = subtotal + taxAmount;
    return {
      invoice_number: `INV${String(index).padStart(10, '0')}`,
      order_id: faker.number.int({ min: 1, max: Math.min(orderCount, RECORDS_PER_TABLE) }),
      customer_id: faker.number.int({ min: 1, max: Math.min(custCount, RECORDS_PER_TABLE) }),
      invoice_date: faker.date.past({ years: 2 }).toISOString().split('T')[0],
      due_date: faker.date.future({ years: 1 }).toISOString().split('T')[0],
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_paid: faker.datatype.boolean({ probability: 0.8 }) ? totalAmount : faker.number.float({ min: 0, max: totalAmount, fractionDigits: 2 }),
      status: faker.helpers.arrayElement(['pending', 'paid', 'overdue', 'cancelled']),
      notes: faker.datatype.boolean({ probability: 0.15 }) ? faker.lorem.sentence() : null,
    };
  },

  payments: (index: number, invCount: number, custCount: number, payMethodCount: number) => ({
    payment_number: `PAY${String(index).padStart(10, '0')}`,
    invoice_id: faker.number.int({ min: 1, max: Math.min(invCount, RECORDS_PER_TABLE) }),
    customer_id: faker.number.int({ min: 1, max: Math.min(custCount, RECORDS_PER_TABLE) }),
    payment_method_id: faker.number.int({ min: 1, max: Math.min(payMethodCount, RECORDS_PER_TABLE) }),
    payment_date: faker.date.past({ years: 2 }).toISOString().split('T')[0],
    amount: faker.number.float({ min: 10, max: 5000, fractionDigits: 2 }),
    reference_number: faker.string.alphanumeric(16).toUpperCase(),
    status: faker.helpers.arrayElement(['completed', 'pending', 'failed', 'refunded']),
    notes: faker.datatype.boolean({ probability: 0.1 }) ? faker.lorem.sentence() : null,
  }),

  credit_notes: (index: number, invCount: number, custCount: number) => ({
    credit_note_number: `CN${String(index).padStart(10, '0')}`,
    invoice_id: faker.number.int({ min: 1, max: Math.min(invCount, RECORDS_PER_TABLE) }),
    customer_id: faker.number.int({ min: 1, max: Math.min(custCount, RECORDS_PER_TABLE) }),
    credit_date: faker.date.past({ years: 1 }).toISOString().split('T')[0],
    amount: faker.number.float({ min: 5, max: 1000, fractionDigits: 2 }),
    reason: faker.helpers.arrayElement(['Return', 'Defective', 'Overcharge', 'Customer satisfaction', 'Error correction']),
    status: faker.helpers.arrayElement(['issued', 'applied', 'expired']),
  }),

  purchase_orders: (index: number, supplierCount: number, whCount: number, empCount: number) => {
    const subtotal = faker.number.float({ min: 100, max: 50000, fractionDigits: 2 });
    const taxAmount = subtotal * 0.08;
    const shippingCost = faker.number.float({ min: 0, max: 500, fractionDigits: 2 });
    return {
      po_number: `PO${String(index).padStart(10, '0')}`,
      supplier_id: faker.number.int({ min: 1, max: Math.min(supplierCount, RECORDS_PER_TABLE) }),
      warehouse_id: faker.number.int({ min: 1, max: Math.min(whCount, RECORDS_PER_TABLE) }),
      order_date: faker.date.past({ years: 2 }).toISOString().split('T')[0],
      expected_date: faker.date.future({ years: 1 }).toISOString().split('T')[0],
      received_date: faker.datatype.boolean({ probability: 0.6 }) ? faker.date.past({ years: 1 }).toISOString().split('T')[0] : null,
      subtotal,
      tax_amount: taxAmount,
      shipping_cost: shippingCost,
      total_amount: subtotal + taxAmount + shippingCost,
      status: faker.helpers.arrayElement(['pending', 'approved', 'ordered', 'received', 'cancelled']),
      created_by: faker.number.int({ min: 1, max: Math.min(empCount, RECORDS_PER_TABLE) }),
      approved_by: faker.datatype.boolean({ probability: 0.8 }) ? faker.number.int({ min: 1, max: Math.min(empCount, RECORDS_PER_TABLE) }) : null,
      notes: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : null,
    };
  },

  purchase_order_items: (index: number, poCount: number, prodCount: number) => {
    const quantityOrdered = faker.number.int({ min: 10, max: 1000 });
    const unitCost = faker.number.float({ min: 1, max: 200, fractionDigits: 2 });
    return {
      purchase_order_id: faker.number.int({ min: 1, max: Math.min(poCount, RECORDS_PER_TABLE) }),
      product_id: faker.number.int({ min: 1, max: Math.min(prodCount, RECORDS_PER_TABLE) }),
      quantity_ordered: quantityOrdered,
      quantity_received: faker.number.int({ min: 0, max: quantityOrdered }),
      unit_cost: unitCost,
      line_total: quantityOrdered * unitCost,
    };
  },

  shipments: (index: number, orderCount: number, shipMethodCount: number, whCount: number) => ({
    tracking_number: `TRK${faker.string.alphanumeric(15).toUpperCase()}${index}`,
    order_id: faker.number.int({ min: 1, max: Math.min(orderCount, RECORDS_PER_TABLE) }),
    shipping_method_id: faker.number.int({ min: 1, max: Math.min(shipMethodCount, RECORDS_PER_TABLE) }),
    warehouse_id: faker.number.int({ min: 1, max: Math.min(whCount, RECORDS_PER_TABLE) }),
    ship_date: faker.date.past({ years: 1 }).toISOString().split('T')[0],
    delivery_date: faker.datatype.boolean({ probability: 0.7 }) ? faker.date.past({ years: 1 }).toISOString().split('T')[0] : null,
    status: faker.helpers.arrayElement(['pending', 'shipped', 'in_transit', 'delivered', 'returned']),
    weight: faker.number.float({ min: 0.1, max: 50, fractionDigits: 3 }),
    shipping_cost: faker.number.float({ min: 5, max: 100, fractionDigits: 2 }),
    notes: faker.datatype.boolean({ probability: 0.15 }) ? faker.lorem.sentence() : null,
  }),

  shipment_items: (index: number, shipCount: number, orderItemCount: number) => ({
    shipment_id: faker.number.int({ min: 1, max: Math.min(shipCount, RECORDS_PER_TABLE) }),
    order_item_id: faker.number.int({ min: 1, max: Math.min(orderItemCount, RECORDS_PER_TABLE) }),
    quantity: faker.number.int({ min: 1, max: 10 }),
  }),

  product_reviews: (index: number, prodCount: number, custCount: number, orderCount: number) => ({
    product_id: faker.number.int({ min: 1, max: Math.min(prodCount, RECORDS_PER_TABLE) }),
    customer_id: faker.number.int({ min: 1, max: Math.min(custCount, RECORDS_PER_TABLE) }),
    order_id: faker.datatype.boolean({ probability: 0.8 }) ? faker.number.int({ min: 1, max: Math.min(orderCount, RECORDS_PER_TABLE) }) : null,
    rating: faker.number.int({ min: 1, max: 5 }),
    title: faker.lorem.words(5),
    review_text: faker.lorem.paragraph(),
    is_verified_purchase: faker.datatype.boolean({ probability: 0.7 }),
    is_approved: faker.datatype.boolean({ probability: 0.85 }),
  }),

  promotions: (index: number) => ({
    code: `PROMO${String(index).padStart(6, '0')}`,
    name: faker.commerce.productAdjective() + ' Sale ' + index,
    description: faker.lorem.sentence(),
    discount_type: faker.helpers.arrayElement(['percentage', 'fixed', 'buy_x_get_y']),
    discount_value: faker.number.float({ min: 5, max: 50, fractionDigits: 2 }),
    minimum_order_value: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    maximum_discount: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
    start_date: faker.date.past({ years: 1 }).toISOString().split('T')[0],
    end_date: faker.date.future({ years: 1 }).toISOString().split('T')[0],
    usage_limit: faker.number.int({ min: 100, max: 10000 }),
    usage_count: faker.number.int({ min: 0, max: 5000 }),
    is_active: faker.datatype.boolean({ probability: 0.6 }),
  }),

  promotion_products: (index: number, promoCount: number, prodCount: number) => ({
    promotion_id: (index % Math.min(promoCount, RECORDS_PER_TABLE)) + 1,
    product_id: faker.number.int({ min: 1, max: Math.min(prodCount, RECORDS_PER_TABLE) }),
  }),

  customer_promotions: (index: number, custCount: number, promoCount: number, orderCount: number) => ({
    customer_id: faker.number.int({ min: 1, max: Math.min(custCount, RECORDS_PER_TABLE) }),
    promotion_id: faker.number.int({ min: 1, max: Math.min(promoCount, RECORDS_PER_TABLE) }),
    order_id: faker.datatype.boolean({ probability: 0.8 }) ? faker.number.int({ min: 1, max: Math.min(orderCount, RECORDS_PER_TABLE) }) : null,
    used_date: faker.date.past({ years: 1 }).toISOString().split('T')[0],
    discount_applied: faker.number.float({ min: 5, max: 200, fractionDigits: 2 }),
  }),

  activity_logs: (index: number, empCount: number, custCount: number) => ({
    employee_id: faker.datatype.boolean({ probability: 0.7 }) ? faker.number.int({ min: 1, max: Math.min(empCount, RECORDS_PER_TABLE) }) : null,
    customer_id: faker.datatype.boolean({ probability: 0.5 }) ? faker.number.int({ min: 1, max: Math.min(custCount, RECORDS_PER_TABLE) }) : null,
    action_type: faker.helpers.arrayElement(['create', 'read', 'update', 'delete', 'login', 'logout', 'export']),
    entity_type: faker.helpers.arrayElement(['order', 'customer', 'product', 'invoice', 'report', 'user']),
    entity_id: faker.number.int({ min: 1, max: 100000 }),
    details: JSON.stringify({ action: faker.lorem.word(), timestamp: new Date().toISOString() }),
    ip_address: faker.internet.ip(),
    user_agent: faker.internet.userAgent(),
  }),

  email_logs: (index: number, custCount: number) => ({
    customer_id: faker.number.int({ min: 1, max: Math.min(custCount, RECORDS_PER_TABLE) }),
    email_type: faker.helpers.arrayElement(['order_confirmation', 'shipping_notification', 'invoice', 'marketing', 'password_reset']),
    recipient: `customer${index}@email.test`,
    subject: faker.lorem.sentence(),
    body: faker.lorem.paragraphs(2),
    status: faker.helpers.arrayElement(['sent', 'delivered', 'bounced', 'opened', 'clicked']),
    sent_at: faker.date.past({ years: 1 }).toISOString(),
    opened_at: faker.datatype.boolean({ probability: 0.4 }) ? faker.date.past({ years: 1 }).toISOString() : null,
    clicked_at: faker.datatype.boolean({ probability: 0.2 }) ? faker.date.past({ years: 1 }).toISOString() : null,
  }),

  daily_sales_summary: (index: number) => {
    const totalOrders = faker.number.int({ min: 10, max: 500 });
    const totalRevenue = faker.number.float({ min: 1000, max: 100000, fractionDigits: 2 });
    const totalCost = totalRevenue * 0.6;
    return {
      summary_date: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      total_profit: totalRevenue - totalCost,
      total_items_sold: faker.number.int({ min: 50, max: 2000 }),
      unique_customers: faker.number.int({ min: 5, max: totalOrders }),
      average_order_value: totalRevenue / totalOrders,
    };
  },

  monthly_category_sales: (index: number, catCount: number) => ({
    year: faker.number.int({ min: 2020, max: 2026 }),
    month: (index % 12) + 1,
    category_id: faker.number.int({ min: 1, max: Math.min(catCount, RECORDS_PER_TABLE) }),
    total_orders: faker.number.int({ min: 100, max: 5000 }),
    total_quantity: faker.number.int({ min: 500, max: 20000 }),
    total_revenue: faker.number.float({ min: 10000, max: 500000, fractionDigits: 2 }),
  }),

  customer_lifetime_value: (index: number, custCount: number) => {
    const totalOrders = faker.number.int({ min: 1, max: 100 });
    const totalSpent = faker.number.float({ min: 100, max: 50000, fractionDigits: 2 });
    return {
      customer_id: (index % Math.min(custCount, RECORDS_PER_TABLE)) + 1,
      total_orders: totalOrders,
      total_spent: totalSpent,
      average_order_value: totalSpent / totalOrders,
      first_order_date: faker.date.past({ years: 5 }).toISOString().split('T')[0],
      last_order_date: faker.date.past({ years: 1 }).toISOString().split('T')[0],
      days_since_last_order: faker.number.int({ min: 1, max: 365 }),
      customer_segment: faker.helpers.arrayElement(['VIP', 'Regular', 'Occasional', 'New', 'At Risk', 'Churned']),
    };
  },
};

async function seedDatabase() {
  console.log('Starting test database seeding...');
  console.log(`Target: ${RECORDS_PER_TABLE.toLocaleString()} records per table`);
  console.log(`Batch size: ${BATCH_SIZE.toLocaleString()}`);
  console.log(`Database: ${TEST_DB_PATH}\n`);

  const totalStart = Date.now();

  try {
    // Drop and recreate schema
    console.log('Dropping existing schema...');
    await dropTestSchema(db);

    console.log('Creating test schema with 40 tables...');
    await createTestSchema(db);
    console.log('Schema created successfully.\n');

    // Seed tables in dependency order
    const tableCounts: Record<string, number> = {};

    // 1. Lookup tables (no dependencies)
    console.log('Phase 1: Seeding lookup tables...\n');

    await batchInsert('countries', (i) => generators.countries(i), RECORDS_PER_TABLE);
    tableCounts.countries = RECORDS_PER_TABLE;

    await batchInsert('currencies', (i) => generators.currencies(i), RECORDS_PER_TABLE);
    tableCounts.currencies = RECORDS_PER_TABLE;

    await batchInsert('categories', (i) => generators.categories(i), RECORDS_PER_TABLE);
    tableCounts.categories = RECORDS_PER_TABLE;

    await batchInsert('brands', (i) => generators.brands(i), RECORDS_PER_TABLE);
    tableCounts.brands = RECORDS_PER_TABLE;

    await batchInsert('customer_types', (i) => generators.customer_types(i), RECORDS_PER_TABLE);
    tableCounts.customer_types = RECORDS_PER_TABLE;

    await batchInsert('order_statuses', (i) => generators.order_statuses(i), RECORDS_PER_TABLE);
    tableCounts.order_statuses = RECORDS_PER_TABLE;

    await batchInsert('shipping_methods', (i) => generators.shipping_methods(i), RECORDS_PER_TABLE);
    tableCounts.shipping_methods = RECORDS_PER_TABLE;

    await batchInsert('payment_methods', (i) => generators.payment_methods(i), RECORDS_PER_TABLE);
    tableCounts.payment_methods = RECORDS_PER_TABLE;

    // 2. Organizational tables
    console.log('\nPhase 2: Seeding organizational tables...\n');

    await batchInsert('departments', (i) => generators.departments(i), RECORDS_PER_TABLE);
    tableCounts.departments = RECORDS_PER_TABLE;

    await batchInsert('positions', (i) => generators.positions(i, tableCounts.departments), RECORDS_PER_TABLE);
    tableCounts.positions = RECORDS_PER_TABLE;

    await batchInsert('employees', (i) => generators.employees(i, tableCounts.positions, tableCounts.departments), RECORDS_PER_TABLE);
    tableCounts.employees = RECORDS_PER_TABLE;

    await batchInsert('suppliers', (i) => generators.suppliers(i, tableCounts.countries), RECORDS_PER_TABLE);
    tableCounts.suppliers = RECORDS_PER_TABLE;

    // 3. Customer tables
    console.log('\nPhase 3: Seeding customer tables...\n');

    await batchInsert('customers', (i) => generators.customers(i, tableCounts.customer_types, tableCounts.countries, tableCounts.employees), RECORDS_PER_TABLE);
    tableCounts.customers = RECORDS_PER_TABLE;

    await batchInsert('customer_addresses', (i) => generators.customer_addresses(i, tableCounts.customers, tableCounts.countries), RECORDS_PER_TABLE);
    tableCounts.customer_addresses = RECORDS_PER_TABLE;

    // 4. Product tables
    console.log('\nPhase 4: Seeding product tables...\n');

    await batchInsert('products', (i) => generators.products(i, tableCounts.categories, tableCounts.brands, tableCounts.suppliers), RECORDS_PER_TABLE);
    tableCounts.products = RECORDS_PER_TABLE;

    await batchInsert('product_attributes', (i) => generators.product_attributes(i, tableCounts.products), RECORDS_PER_TABLE);
    tableCounts.product_attributes = RECORDS_PER_TABLE;

    await batchInsert('product_images', (i) => generators.product_images(i, tableCounts.products), RECORDS_PER_TABLE);
    tableCounts.product_images = RECORDS_PER_TABLE;

    await batchInsert('product_pricing_history', (i) => generators.product_pricing_history(i, tableCounts.products, tableCounts.employees), RECORDS_PER_TABLE);
    tableCounts.product_pricing_history = RECORDS_PER_TABLE;

    // 5. Inventory tables
    console.log('\nPhase 5: Seeding inventory tables...\n');

    await batchInsert('warehouses', (i) => generators.warehouses(i, tableCounts.countries, tableCounts.employees), RECORDS_PER_TABLE);
    tableCounts.warehouses = RECORDS_PER_TABLE;

    // Inventory has unique constraint, so we reduce count
    const inventoryCount = Math.min(RECORDS_PER_TABLE, tableCounts.products * 10);
    await batchInsert('inventory', (i) => generators.inventory(i, tableCounts.products, tableCounts.warehouses), inventoryCount);
    tableCounts.inventory = inventoryCount;

    await batchInsert('inventory_transactions', (i) => generators.inventory_transactions(i, tableCounts.products, tableCounts.warehouses, tableCounts.employees), RECORDS_PER_TABLE);
    tableCounts.inventory_transactions = RECORDS_PER_TABLE;

    // 6. Order tables
    console.log('\nPhase 6: Seeding order tables...\n');

    await batchInsert('orders', (i) => generators.orders(i, tableCounts.customers, tableCounts.order_statuses, tableCounts.customer_addresses, tableCounts.shipping_methods, tableCounts.payment_methods, tableCounts.currencies, tableCounts.employees), RECORDS_PER_TABLE);
    tableCounts.orders = RECORDS_PER_TABLE;

    await batchInsert('order_items', (i) => generators.order_items(i, tableCounts.orders, tableCounts.products, tableCounts.warehouses), RECORDS_PER_TABLE);
    tableCounts.order_items = RECORDS_PER_TABLE;

    // 7. Financial tables
    console.log('\nPhase 7: Seeding financial tables...\n');

    await batchInsert('invoices', (i) => generators.invoices(i, tableCounts.orders, tableCounts.customers), RECORDS_PER_TABLE);
    tableCounts.invoices = RECORDS_PER_TABLE;

    await batchInsert('payments', (i) => generators.payments(i, tableCounts.invoices, tableCounts.customers, tableCounts.payment_methods), RECORDS_PER_TABLE);
    tableCounts.payments = RECORDS_PER_TABLE;

    await batchInsert('credit_notes', (i) => generators.credit_notes(i, tableCounts.invoices, tableCounts.customers), RECORDS_PER_TABLE);
    tableCounts.credit_notes = RECORDS_PER_TABLE;

    // 8. Purchase tables
    console.log('\nPhase 8: Seeding purchase tables...\n');

    await batchInsert('purchase_orders', (i) => generators.purchase_orders(i, tableCounts.suppliers, tableCounts.warehouses, tableCounts.employees), RECORDS_PER_TABLE);
    tableCounts.purchase_orders = RECORDS_PER_TABLE;

    await batchInsert('purchase_order_items', (i) => generators.purchase_order_items(i, tableCounts.purchase_orders, tableCounts.products), RECORDS_PER_TABLE);
    tableCounts.purchase_order_items = RECORDS_PER_TABLE;

    // 9. Shipping tables
    console.log('\nPhase 9: Seeding shipping tables...\n');

    await batchInsert('shipments', (i) => generators.shipments(i, tableCounts.orders, tableCounts.shipping_methods, tableCounts.warehouses), RECORDS_PER_TABLE);
    tableCounts.shipments = RECORDS_PER_TABLE;

    await batchInsert('shipment_items', (i) => generators.shipment_items(i, tableCounts.shipments, tableCounts.order_items), RECORDS_PER_TABLE);
    tableCounts.shipment_items = RECORDS_PER_TABLE;

    // 10. Review tables
    console.log('\nPhase 10: Seeding review tables...\n');

    await batchInsert('product_reviews', (i) => generators.product_reviews(i, tableCounts.products, tableCounts.customers, tableCounts.orders), RECORDS_PER_TABLE);
    tableCounts.product_reviews = RECORDS_PER_TABLE;

    // 11. Marketing tables
    console.log('\nPhase 11: Seeding marketing tables...\n');

    await batchInsert('promotions', (i) => generators.promotions(i), RECORDS_PER_TABLE);
    tableCounts.promotions = RECORDS_PER_TABLE;

    // promotion_products has unique constraint
    const promoProductsCount = Math.min(RECORDS_PER_TABLE, tableCounts.promotions * 10);
    await batchInsert('promotion_products', (i) => generators.promotion_products(i, tableCounts.promotions, tableCounts.products), promoProductsCount);
    tableCounts.promotion_products = promoProductsCount;

    await batchInsert('customer_promotions', (i) => generators.customer_promotions(i, tableCounts.customers, tableCounts.promotions, tableCounts.orders), RECORDS_PER_TABLE);
    tableCounts.customer_promotions = RECORDS_PER_TABLE;

    // 12. Activity/audit tables
    console.log('\nPhase 12: Seeding activity tables...\n');

    await batchInsert('activity_logs', (i) => generators.activity_logs(i, tableCounts.employees, tableCounts.customers), RECORDS_PER_TABLE);
    tableCounts.activity_logs = RECORDS_PER_TABLE;

    await batchInsert('email_logs', (i) => generators.email_logs(i, tableCounts.customers), RECORDS_PER_TABLE);
    tableCounts.email_logs = RECORDS_PER_TABLE;

    // 13. Analytics tables
    console.log('\nPhase 13: Seeding analytics tables...\n');

    // daily_sales_summary has unique date constraint
    const dailySalesCount = Math.min(RECORDS_PER_TABLE, 1095); // ~3 years of daily data
    await batchInsert('daily_sales_summary', (i) => generators.daily_sales_summary(i), dailySalesCount);
    tableCounts.daily_sales_summary = dailySalesCount;

    // monthly_category_sales has composite unique constraint
    const monthlyCatSalesCount = Math.min(RECORDS_PER_TABLE, tableCounts.categories * 72); // 6 years * 12 months
    await batchInsert('monthly_category_sales', (i) => generators.monthly_category_sales(i, tableCounts.categories), monthlyCatSalesCount);
    tableCounts.monthly_category_sales = monthlyCatSalesCount;

    // customer_lifetime_value has unique customer_id constraint
    const clvCount = Math.min(RECORDS_PER_TABLE, tableCounts.customers);
    await batchInsert('customer_lifetime_value', (i) => generators.customer_lifetime_value(i, tableCounts.customers), clvCount);
    tableCounts.customer_lifetime_value = clvCount;

    const totalDuration = Date.now() - totalStart;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING COMPLETE');
    console.log('='.repeat(60));

    let totalRecords = 0;
    for (const [table, count] of Object.entries(tableCounts)) {
      totalRecords += count;
    }

    console.log(`\nTotal tables: ${Object.keys(tableCounts).length}`);
    console.log(`Total records: ${totalRecords.toLocaleString()}`);
    console.log(`Total time: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`);
    console.log(`Average rate: ${Math.round(totalRecords / (totalDuration / 1000)).toLocaleString()} records/sec`);

    console.log('\nPer-table statistics:');
    console.log('-'.repeat(60));
    for (const [table, stats] of Object.entries(perfStats)) {
      const rate = Math.round(stats.records / (stats.duration / 1000));
      console.log(`  ${table.padEnd(30)} ${stats.records.toLocaleString().padStart(10)} records ${(stats.duration / 1000).toFixed(2).padStart(8)}s ${rate.toLocaleString().padStart(10)} rec/s`);
    }

  } catch (error) {
    console.error('\nSeeding failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run if executed directly
seedDatabase()
  .then(() => {
    console.log('\nTest database seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
