/**
 * Performance Tests for Complex 29-Table Join Query
 * Tests query execution time with 30,000 records per table (1.1M+ total records)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import knex, { Knex } from 'knex';
import path from 'path';

// Database connection
let db: Knex;

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  COMPLEX_JOIN_29_TABLES: 5000,      // 5 seconds for full 29-table join
  COMPLEX_JOIN_WITH_LIMIT: 1000,     // 1 second with LIMIT 100
  COMPLEX_JOIN_WITH_AGGREGATION: 5000, // 5 seconds with aggregation on 1.1M records
  COMPLEX_JOIN_FILTERED: 2000,        // 2 seconds with date filter
  SIMPLE_JOIN_5_TABLES: 500,          // 500ms for 5-table join
  SIMPLE_JOIN_10_TABLES: 1000,        // 1 second for 10-table join
};

// Performance results collection
interface PerformanceResult {
  name: string;
  duration: number;
  rowCount: number;
  threshold: number;
  passed: boolean;
}

const performanceResults: PerformanceResult[] = [];

// Helper function to measure query execution time
async function measureQuery<T>(
  name: string,
  queryFn: () => Promise<T>,
  threshold: number
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await queryFn();
  const duration = performance.now() - start;

  const rowCount = Array.isArray(result) ? result.length : 0;

  performanceResults.push({
    name,
    duration,
    rowCount,
    threshold,
    passed: duration < threshold,
  });

  console.log(`  ${name}: ${duration.toFixed(2)}ms (${rowCount} rows) - ${duration < threshold ? 'PASS' : 'FAIL'}`);

  return { result, duration };
}

describe('Complex 29-Table Join Query Performance Tests', () => {
  beforeAll(async () => {
    const dbPath = path.join(process.cwd(), 'data', 'test.sqlite');

    db = knex({
      client: 'better-sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });

    // Verify database has data
    const orderCount = await db('orders').count('* as count').first();
    console.log(`\nDatabase contains ${orderCount?.count} orders`);
    console.log('Running performance tests...\n');
  });

  afterAll(async () => {
    // Print performance summary
    console.log('\n========================================');
    console.log('PERFORMANCE TEST RESULTS SUMMARY');
    console.log('========================================\n');

    performanceResults.forEach(result => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status} | ${result.name}`);
      console.log(`       Duration: ${result.duration.toFixed(2)}ms (threshold: ${result.threshold}ms)`);
      console.log(`       Rows: ${result.rowCount}`);
      console.log('');
    });

    const passed = performanceResults.filter(r => r.passed).length;
    const failed = performanceResults.filter(r => !r.passed).length;
    console.log(`Total: ${passed} passed, ${failed} failed`);

    await db.destroy();
  });

  describe('Full 29-Table Join Query', () => {
    // The complete 29-table join query
    const complex29TableJoinQuery = `
      SELECT
        o.id as order_id,
        o.order_number,
        o.order_date,
        o.total_amount as order_total,
        c.customer_number,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email as customer_email,
        ct.name as customer_type,
        ctry.name as customer_country,
        cur.name as currency_name,
        cur.code as currency_code,
        os.name as order_status,
        sm.name as shipping_method,
        pm.name as payment_method,
        ca.city as shipping_city,
        ca.state as shipping_state,
        e.first_name || ' ' || e.last_name as sales_rep_name,
        d.name as sales_rep_department,
        pos.title as sales_rep_position,
        oi.quantity,
        oi.unit_price,
        oi.line_total,
        p.name as product_name,
        p.sku as product_sku,
        cat.name as category_name,
        b.name as brand_name,
        sup.name as supplier_name,
        sup_ctry.name as supplier_country,
        w.name as warehouse_name,
        inv.quantity as stock_quantity,
        i.invoice_number,
        i.status as invoice_status,
        pay.payment_number,
        pay.amount as payment_amount,
        ship.tracking_number,
        ship.status as shipment_status,
        pr.rating as product_rating,
        pr.review_text as review_comment,
        promo.code as promo_code,
        promo.discount_value,
        al.action_type as last_activity,
        dss.total_revenue as daily_revenue,
        dss.total_orders as daily_orders,
        clv.total_spent,
        clv.customer_segment
      FROM orders o
      INNER JOIN customers c ON o.customer_id = c.id
      INNER JOIN customer_types ct ON c.customer_type_id = ct.id
      INNER JOIN countries ctry ON c.country_id = ctry.id
      INNER JOIN currencies cur ON o.currency_id = cur.id
      INNER JOIN order_statuses os ON o.status_id = os.id
      INNER JOIN shipping_methods sm ON o.shipping_method_id = sm.id
      INNER JOIN payment_methods pm ON o.payment_method_id = pm.id
      LEFT JOIN customer_addresses ca ON o.shipping_address_id = ca.id
      LEFT JOIN employees e ON o.sales_rep_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions pos ON e.position_id = pos.id
      INNER JOIN order_items oi ON o.id = oi.order_id
      INNER JOIN products p ON oi.product_id = p.id
      INNER JOIN categories cat ON p.category_id = cat.id
      INNER JOIN brands b ON p.brand_id = b.id
      INNER JOIN suppliers sup ON p.supplier_id = sup.id
      INNER JOIN countries sup_ctry ON sup.country_id = sup_ctry.id
      LEFT JOIN warehouses w ON oi.warehouse_id = w.id
      LEFT JOIN inventory inv ON p.id = inv.product_id AND inv.warehouse_id = COALESCE(oi.warehouse_id, 1)
      LEFT JOIN invoices i ON o.id = i.order_id
      LEFT JOIN payments pay ON i.id = pay.invoice_id
      LEFT JOIN shipments ship ON o.id = ship.order_id
      LEFT JOIN product_reviews pr ON p.id = pr.product_id AND c.id = pr.customer_id
      LEFT JOIN customer_promotions cp ON c.id = cp.customer_id
      LEFT JOIN promotions promo ON cp.promotion_id = promo.id
      LEFT JOIN activity_logs al ON c.id = al.entity_id AND al.entity_type = 'customer'
      LEFT JOIN daily_sales_summary dss ON DATE(o.order_date) = dss.summary_date
      LEFT JOIN customer_lifetime_value clv ON c.id = clv.customer_id
    `;

    it('should execute 29-table join with LIMIT 100 efficiently', async () => {
      const { duration } = await measureQuery(
        '29-Table Join (LIMIT 100)',
        () => db.raw(`${complex29TableJoinQuery} ORDER BY o.order_date DESC LIMIT 100`),
        THRESHOLDS.COMPLEX_JOIN_WITH_LIMIT
      );

      expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_JOIN_WITH_LIMIT);
    });

    it('should execute 29-table join with date filter efficiently', async () => {
      const { duration } = await measureQuery(
        '29-Table Join (Date Filter)',
        () => db.raw(`${complex29TableJoinQuery} WHERE o.order_date >= '2024-01-01' ORDER BY o.order_date DESC LIMIT 500`),
        THRESHOLDS.COMPLEX_JOIN_FILTERED
      );

      expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_JOIN_FILTERED);
    });

    it('should execute 29-table join with aggregation efficiently', async () => {
      const aggregationQuery = `
        SELECT
          ct.name as customer_type,
          cat.name as category_name,
          COUNT(DISTINCT o.id) as order_count,
          SUM(oi.line_total) as total_revenue,
          AVG(oi.unit_price) as avg_price,
          COUNT(DISTINCT c.id) as unique_customers
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        INNER JOIN customer_types ct ON c.customer_type_id = ct.id
        INNER JOIN countries ctry ON c.country_id = ctry.id
        INNER JOIN currencies cur ON o.currency_id = cur.id
        INNER JOIN order_statuses os ON o.status_id = os.id
        INNER JOIN shipping_methods sm ON o.shipping_method_id = sm.id
        INNER JOIN payment_methods pm ON o.payment_method_id = pm.id
        LEFT JOIN customer_addresses ca ON o.shipping_address_id = ca.id
        LEFT JOIN employees e ON o.sales_rep_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions pos ON e.position_id = pos.id
        INNER JOIN order_items oi ON o.id = oi.order_id
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN categories cat ON p.category_id = cat.id
        INNER JOIN brands b ON p.brand_id = b.id
        INNER JOIN suppliers sup ON p.supplier_id = sup.id
        INNER JOIN countries sup_ctry ON sup.country_id = sup_ctry.id
        LEFT JOIN warehouses w ON oi.warehouse_id = w.id
        LEFT JOIN inventory inv ON p.id = inv.product_id
        LEFT JOIN invoices i ON o.id = i.order_id
        LEFT JOIN payments pay ON i.id = pay.invoice_id
        LEFT JOIN shipments ship ON o.id = ship.order_id
        LEFT JOIN product_reviews pr ON p.id = pr.product_id
        LEFT JOIN customer_promotions cp ON c.id = cp.customer_id
        LEFT JOIN promotions promo ON cp.promotion_id = promo.id
        LEFT JOIN customer_lifetime_value clv ON c.id = clv.customer_id
        GROUP BY ct.name, cat.name
        ORDER BY total_revenue DESC
        LIMIT 50
      `;

      const { duration } = await measureQuery(
        '29-Table Join (Aggregated)',
        () => db.raw(aggregationQuery),
        THRESHOLDS.COMPLEX_JOIN_WITH_AGGREGATION
      );

      expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_JOIN_WITH_AGGREGATION);
    });

    it('should execute full 29-table join (LIMIT 1000)', async () => {
      const { duration } = await measureQuery(
        '29-Table Join (LIMIT 1000)',
        () => db.raw(`${complex29TableJoinQuery} ORDER BY o.order_date DESC LIMIT 1000`),
        THRESHOLDS.COMPLEX_JOIN_29_TABLES
      );

      expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_JOIN_29_TABLES);
    });
  });

  describe('Incremental Join Performance', () => {
    it('should execute 5-table join efficiently', async () => {
      const query = `
        SELECT o.id, o.order_number, o.total_amount,
               c.first_name, c.last_name,
               ct.name as customer_type,
               os.name as order_status,
               cur.name as currency
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_types ct ON c.customer_type_id = ct.id
        JOIN order_statuses os ON o.status_id = os.id
        JOIN currencies cur ON o.currency_id = cur.id
        ORDER BY o.order_date DESC
        LIMIT 500
      `;

      const { duration } = await measureQuery(
        '5-Table Join',
        () => db.raw(query),
        THRESHOLDS.SIMPLE_JOIN_5_TABLES
      );

      expect(duration).toBeLessThan(THRESHOLDS.SIMPLE_JOIN_5_TABLES);
    });

    it('should execute 10-table join efficiently', async () => {
      const query = `
        SELECT o.id, o.order_number, o.total_amount,
               c.first_name, c.last_name,
               ct.name as customer_type,
               ctry.name as country,
               os.name as order_status,
               cur.name as currency,
               sm.name as shipping_method,
               pm.name as payment_method,
               e.first_name as sales_rep
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_types ct ON c.customer_type_id = ct.id
        JOIN countries ctry ON c.country_id = ctry.id
        JOIN order_statuses os ON o.status_id = os.id
        JOIN currencies cur ON o.currency_id = cur.id
        JOIN shipping_methods sm ON o.shipping_method_id = sm.id
        JOIN payment_methods pm ON o.payment_method_id = pm.id
        LEFT JOIN employees e ON o.sales_rep_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        ORDER BY o.order_date DESC
        LIMIT 500
      `;

      const { duration } = await measureQuery(
        '10-Table Join',
        () => db.raw(query),
        THRESHOLDS.SIMPLE_JOIN_10_TABLES
      );

      expect(duration).toBeLessThan(THRESHOLDS.SIMPLE_JOIN_10_TABLES);
    });

    it('should execute 15-table join efficiently', async () => {
      const query = `
        SELECT o.id, o.order_number, o.total_amount,
               c.first_name, c.last_name,
               ct.name as customer_type,
               ctry.name as country,
               os.name as order_status,
               cur.name as currency,
               sm.name as shipping_method,
               pm.name as payment_method,
               e.first_name as sales_rep,
               d.name as department,
               pos.title as position,
               oi.quantity,
               p.name as product
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_types ct ON c.customer_type_id = ct.id
        JOIN countries ctry ON c.country_id = ctry.id
        JOIN order_statuses os ON o.status_id = os.id
        JOIN currencies cur ON o.currency_id = cur.id
        JOIN shipping_methods sm ON o.shipping_method_id = sm.id
        JOIN payment_methods pm ON o.payment_method_id = pm.id
        LEFT JOIN employees e ON o.sales_rep_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions pos ON e.position_id = pos.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        JOIN categories cat ON p.category_id = cat.id
        JOIN brands b ON p.brand_id = b.id
        ORDER BY o.order_date DESC
        LIMIT 500
      `;

      const { duration } = await measureQuery(
        '15-Table Join',
        () => db.raw(query),
        1500 // 1.5 seconds
      );

      expect(duration).toBeLessThan(1500);
    });

    it('should execute 20-table join efficiently', async () => {
      const query = `
        SELECT o.id, o.order_number, o.total_amount,
               c.first_name, c.last_name,
               ct.name as customer_type,
               ctry.name as country,
               os.name as order_status,
               cur.name as currency,
               sm.name as shipping_method,
               pm.name as payment_method,
               e.first_name as sales_rep,
               d.name as department,
               pos.title as position,
               oi.quantity,
               p.name as product,
               cat.name as category,
               b.name as brand,
               sup.name as supplier,
               w.name as warehouse
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_types ct ON c.customer_type_id = ct.id
        JOIN countries ctry ON c.country_id = ctry.id
        JOIN order_statuses os ON o.status_id = os.id
        JOIN currencies cur ON o.currency_id = cur.id
        JOIN shipping_methods sm ON o.shipping_method_id = sm.id
        JOIN payment_methods pm ON o.payment_method_id = pm.id
        LEFT JOIN employees e ON o.sales_rep_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions pos ON e.position_id = pos.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        JOIN categories cat ON p.category_id = cat.id
        JOIN brands b ON p.brand_id = b.id
        JOIN suppliers sup ON p.supplier_id = sup.id
        JOIN countries sup_ctry ON sup.country_id = sup_ctry.id
        LEFT JOIN warehouses w ON oi.warehouse_id = w.id
        LEFT JOIN inventory inv ON p.id = inv.product_id
        LEFT JOIN customer_addresses ca ON o.shipping_address_id = ca.id
        ORDER BY o.order_date DESC
        LIMIT 500
      `;

      const { duration } = await measureQuery(
        '20-Table Join',
        () => db.raw(query),
        2000 // 2 seconds
      );

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Query Variations', () => {
    it('should handle ORDER BY with complex join efficiently', async () => {
      const query = `
        SELECT o.order_number, o.total_amount, c.first_name, ct.name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_types ct ON c.customer_type_id = ct.id
        JOIN countries ctry ON c.country_id = ctry.id
        JOIN order_statuses os ON o.status_id = os.id
        ORDER BY o.total_amount DESC, o.order_date DESC
        LIMIT 100
      `;

      const { duration } = await measureQuery(
        'Complex ORDER BY',
        () => db.raw(query),
        500
      );

      expect(duration).toBeLessThan(500);
    });

    it('should handle GROUP BY with complex join efficiently', async () => {
      const query = `
        SELECT
          ct.name as customer_type,
          ctry.name as country,
          COUNT(*) as order_count,
          SUM(o.total_amount) as total_sales,
          AVG(o.total_amount) as avg_order_value
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_types ct ON c.customer_type_id = ct.id
        JOIN countries ctry ON c.country_id = ctry.id
        JOIN order_statuses os ON o.status_id = os.id
        GROUP BY ct.name, ctry.name
        HAVING COUNT(*) > 5
        ORDER BY total_sales DESC
        LIMIT 50
      `;

      const { duration } = await measureQuery(
        'Complex GROUP BY',
        () => db.raw(query),
        1000
      );

      expect(duration).toBeLessThan(1000);
    });

    it('should handle DISTINCT with complex join efficiently', async () => {
      const query = `
        SELECT DISTINCT
          ctry.name as country,
          ct.name as customer_type,
          cat.name as category
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_types ct ON c.customer_type_id = ct.id
        JOIN countries ctry ON c.country_id = ctry.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        JOIN categories cat ON p.category_id = cat.id
        LIMIT 500
      `;

      const { duration } = await measureQuery(
        'DISTINCT with Joins',
        () => db.raw(query),
        1000
      );

      expect(duration).toBeLessThan(1000);
    });

    it('should handle subquery with complex join efficiently', async () => {
      const query = `
        SELECT o.*,
               (SELECT SUM(oi.line_total) FROM order_items oi WHERE oi.order_id = o.id) as calculated_total
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_types ct ON c.customer_type_id = ct.id
        JOIN order_statuses os ON o.status_id = os.id
        WHERE o.total_amount > (SELECT AVG(total_amount) FROM orders)
        ORDER BY o.order_date DESC
        LIMIT 100
      `;

      const { duration } = await measureQuery(
        'Subquery with Joins',
        () => db.raw(query),
        1500
      );

      expect(duration).toBeLessThan(1500);
    });
  });

  describe('Stress Tests', () => {
    it('should handle multiple concurrent queries', async () => {
      const query = `
        SELECT o.order_number, c.first_name, ct.name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_types ct ON c.customer_type_id = ct.id
        ORDER BY o.order_date DESC
        LIMIT 100
      `;

      const start = performance.now();

      // Run 5 queries concurrently
      await Promise.all([
        db.raw(query),
        db.raw(query),
        db.raw(query),
        db.raw(query),
        db.raw(query),
      ]);

      const duration = performance.now() - start;

      performanceResults.push({
        name: '5 Concurrent Queries',
        duration,
        rowCount: 500,
        threshold: 2000,
        passed: duration < 2000,
      });

      console.log(`  5 Concurrent Queries: ${duration.toFixed(2)}ms - ${duration < 2000 ? 'PASS' : 'FAIL'}`);

      expect(duration).toBeLessThan(2000);
    });

    it('should handle sequential heavy queries', async () => {
      const start = performance.now();

      for (let i = 0; i < 3; i++) {
        await db.raw(`
          SELECT COUNT(*) as cnt, SUM(total_amount) as total
          FROM orders o
          JOIN customers c ON o.customer_id = c.id
          JOIN customer_types ct ON c.customer_type_id = ct.id
          WHERE o.order_date >= DATE('now', '-${365 + i * 30} days')
        `);
      }

      const duration = performance.now() - start;

      performanceResults.push({
        name: '3 Sequential Heavy Queries',
        duration,
        rowCount: 3,
        threshold: 3000,
        passed: duration < 3000,
      });

      console.log(`  3 Sequential Heavy Queries: ${duration.toFixed(2)}ms - ${duration < 3000 ? 'PASS' : 'FAIL'}`);

      expect(duration).toBeLessThan(3000);
    });
  });
});
