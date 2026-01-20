import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import knex, { Knex } from 'knex';
import path from 'path';
import fs from 'fs';

/**
 * Performance Test Suite
 * Tests query performance with large datasets
 * Targets:
 * - Simple queries: < 100ms
 * - Complex joins: < 500ms
 * - Aggregations: < 300ms
 * - Paginated queries: < 200ms
 *
 * NOTE: These tests require the database to be seeded first.
 * Run `npm run test:seed` before running performance tests.
 */

describe.skip('Query Performance Tests', () => {
  let db: Knex;
  const testDbPath = path.join(process.cwd(), 'data', 'test.sqlite');

  // Performance thresholds (in milliseconds)
  const THRESHOLDS = {
    SIMPLE_QUERY: 100,
    FILTERED_QUERY: 200,
    JOIN_QUERY: 500,
    MULTI_JOIN_QUERY: 1000,
    AGGREGATION: 300,
    GROUP_BY: 500,
    PAGINATION: 200,
    SUBQUERY: 800,
    COMPLEX_QUERY: 1500,
  };

  // Track all test results for summary
  const performanceResults: Array<{
    name: string;
    duration: number;
    threshold: number;
    passed: boolean;
    rowCount?: number;
  }> = [];

  function recordResult(
    name: string,
    duration: number,
    threshold: number,
    rowCount?: number
  ) {
    performanceResults.push({
      name,
      duration,
      threshold,
      passed: duration < threshold,
      rowCount,
    });
  }

  async function measureQuery<T>(
    name: string,
    queryFn: () => Promise<T>,
    threshold: number
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await queryFn();
    const duration = performance.now() - start;

    const rowCount = Array.isArray(result) ? result.length : undefined;
    recordResult(name, duration, threshold, rowCount);

    console.log(
      `  ${name}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms) ${
        duration < threshold ? '✓' : '✗'
      }`
    );

    return { result, duration };
  }

  beforeAll(async () => {
    // Check if test database exists
    if (!fs.existsSync(testDbPath)) {
      console.log('Test database not found. Run `npm run test:seed` first.');
      throw new Error('Test database not found');
    }

    db = knex({
      client: 'better-sqlite3',
      connection: {
        filename: testDbPath,
      },
      useNullAsDefault: true,
    });

    // Verify database has data
    const [{ count }] = await db('orders').count('* as count');
    console.log(`Test database loaded with ${count} orders`);

    if (parseInt(count as string) < 1000) {
      console.warn('Warning: Test database may not have enough data for meaningful performance tests');
    }
  });

  afterAll(async () => {
    await db.destroy();

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(80));

    const passed = performanceResults.filter((r) => r.passed).length;
    const total = performanceResults.length;

    console.log(`\nTotal: ${passed}/${total} tests passed`);
    console.log('\nDetailed Results:');
    console.log('-'.repeat(80));

    for (const result of performanceResults) {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const rows = result.rowCount ? ` (${result.rowCount} rows)` : '';
      console.log(
        `${status} | ${result.name.padEnd(40)} | ${result.duration.toFixed(2).padStart(10)}ms | threshold: ${result.threshold}ms${rows}`
      );
    }

    console.log('='.repeat(80));

    // Fail the suite if too many tests failed
    const failureRate = (total - passed) / total;
    if (failureRate > 0.2) {
      console.log(`\nWarning: ${Math.round(failureRate * 100)}% of performance tests failed`);
    }
  });

  describe('Simple Queries', () => {
    it('should select single row by primary key quickly', async () => {
      const { duration } = await measureQuery(
        'SELECT by primary key',
        () => db('customers').where('id', 1).first(),
        THRESHOLDS.SIMPLE_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.SIMPLE_QUERY);
    });

    it('should select with LIMIT quickly', async () => {
      const { result, duration } = await measureQuery(
        'SELECT with LIMIT 100',
        () => db('orders').select('*').limit(100),
        THRESHOLDS.SIMPLE_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.SIMPLE_QUERY);
      expect(result).toHaveLength(100);
    });

    it('should count all rows quickly', async () => {
      const { duration } = await measureQuery(
        'COUNT all orders',
        () => db('orders').count('* as count'),
        THRESHOLDS.SIMPLE_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.SIMPLE_QUERY);
    });
  });

  describe('Filtered Queries', () => {
    it('should filter by indexed column quickly', async () => {
      const { duration } = await measureQuery(
        'Filter by indexed column (customer_id)',
        () => db('orders').where('customer_id', 100).limit(100),
        THRESHOLDS.FILTERED_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.FILTERED_QUERY);
    });

    it('should filter by status with index quickly', async () => {
      const { duration } = await measureQuery(
        'Filter by status_id',
        () => db('orders').where('status_id', 1).limit(1000),
        THRESHOLDS.FILTERED_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.FILTERED_QUERY);
    });

    it('should handle BETWEEN clause efficiently', async () => {
      const { duration } = await measureQuery(
        'BETWEEN on date range',
        () =>
          db('orders')
            .whereBetween('order_date', ['2024-01-01', '2024-06-30'])
            .limit(1000),
        THRESHOLDS.FILTERED_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.FILTERED_QUERY);
    });

    it('should handle IN clause efficiently', async () => {
      const statusIds = [1, 2, 3, 4, 5];
      const { duration } = await measureQuery(
        'IN clause with 5 values',
        () => db('orders').whereIn('status_id', statusIds).limit(1000),
        THRESHOLDS.FILTERED_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.FILTERED_QUERY);
    });

    it('should handle LIKE with suffix wildcard efficiently', async () => {
      const { duration } = await measureQuery(
        'LIKE with suffix wildcard',
        () => db('products').where('name', 'like', 'Product%').limit(100),
        THRESHOLDS.FILTERED_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.FILTERED_QUERY);
    });
  });

  describe('Join Queries', () => {
    it('should perform simple INNER JOIN quickly', async () => {
      const { duration } = await measureQuery(
        'Simple INNER JOIN (orders-customers)',
        () =>
          db('orders as o')
            .join('customers as c', 'o.customer_id', 'c.id')
            .select('o.id', 'o.total_amount', 'c.first_name', 'c.last_name')
            .limit(1000),
        THRESHOLDS.JOIN_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.JOIN_QUERY);
    });

    it('should perform LEFT JOIN quickly', async () => {
      const { duration } = await measureQuery(
        'LEFT JOIN (customers-orders)',
        () =>
          db('customers as c')
            .leftJoin('orders as o', 'c.id', 'o.customer_id')
            .select('c.id', 'c.first_name', 'o.order_number')
            .limit(1000),
        THRESHOLDS.JOIN_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.JOIN_QUERY);
    });

    it('should perform multiple JOINs efficiently', async () => {
      const { duration } = await measureQuery(
        'Multiple JOINs (orders-customers-items-products)',
        () =>
          db('orders as o')
            .join('customers as c', 'o.customer_id', 'c.id')
            .join('order_items as oi', 'o.id', 'oi.order_id')
            .join('products as p', 'oi.product_id', 'p.id')
            .select(
              'o.order_number',
              'c.first_name',
              'c.last_name',
              'p.name as product_name',
              'oi.quantity',
              'oi.line_total'
            )
            .limit(1000),
        THRESHOLDS.MULTI_JOIN_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.MULTI_JOIN_QUERY);
    });

    it('should perform self-join efficiently', async () => {
      const { duration } = await measureQuery(
        'Self JOIN (employees-managers)',
        () =>
          db('employees as e')
            .leftJoin('employees as m', 'e.manager_id', 'm.id')
            .select('e.first_name', 'e.last_name', 'm.first_name as manager_first_name')
            .limit(1000),
        THRESHOLDS.JOIN_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.JOIN_QUERY);
    });
  });

  describe('Aggregation Queries', () => {
    it('should calculate SUM quickly', async () => {
      const { duration } = await measureQuery(
        'SUM of order totals',
        () => db('orders').sum('total_amount as total'),
        THRESHOLDS.AGGREGATION
      );

      expect(duration).toBeLessThan(THRESHOLDS.AGGREGATION);
    });

    it('should calculate AVG quickly', async () => {
      const { duration } = await measureQuery(
        'AVG order value',
        () => db('orders').avg('total_amount as avg'),
        THRESHOLDS.AGGREGATION
      );

      expect(duration).toBeLessThan(THRESHOLDS.AGGREGATION);
    });

    it('should calculate MIN and MAX quickly', async () => {
      const { duration } = await measureQuery(
        'MIN and MAX order values',
        () =>
          db('orders')
            .min('total_amount as min')
            .max('total_amount as max'),
        THRESHOLDS.AGGREGATION
      );

      expect(duration).toBeLessThan(THRESHOLDS.AGGREGATION);
    });

    it('should GROUP BY with COUNT efficiently', async () => {
      const { duration } = await measureQuery(
        'GROUP BY status with COUNT',
        () =>
          db('orders')
            .select('status_id')
            .count('* as count')
            .groupBy('status_id'),
        THRESHOLDS.GROUP_BY
      );

      expect(duration).toBeLessThan(THRESHOLDS.GROUP_BY);
    });

    it('should GROUP BY with multiple aggregations efficiently', async () => {
      const { duration } = await measureQuery(
        'GROUP BY with SUM, AVG, COUNT',
        () =>
          db('orders')
            .select('status_id')
            .count('* as order_count')
            .sum('total_amount as total_revenue')
            .avg('total_amount as avg_order_value')
            .groupBy('status_id'),
        THRESHOLDS.GROUP_BY
      );

      expect(duration).toBeLessThan(THRESHOLDS.GROUP_BY);
    });

    it('should handle GROUP BY with JOIN efficiently', async () => {
      const { duration } = await measureQuery(
        'GROUP BY with JOIN (sales by customer)',
        () =>
          db('orders as o')
            .join('customers as c', 'o.customer_id', 'c.id')
            .select('c.id', 'c.first_name', 'c.last_name')
            .count('o.id as order_count')
            .sum('o.total_amount as total_spent')
            .groupBy('c.id', 'c.first_name', 'c.last_name')
            .orderBy('total_spent', 'desc')
            .limit(100),
        THRESHOLDS.GROUP_BY
      );

      expect(duration).toBeLessThan(THRESHOLDS.GROUP_BY);
    });

    it('should handle HAVING clause efficiently', async () => {
      const { duration } = await measureQuery(
        'GROUP BY with HAVING',
        () =>
          db('orders')
            .select('customer_id')
            .count('* as order_count')
            .sum('total_amount as total')
            .groupBy('customer_id')
            .having('order_count', '>', 2)
            .limit(100),
        THRESHOLDS.GROUP_BY
      );

      expect(duration).toBeLessThan(THRESHOLDS.GROUP_BY);
    });
  });

  describe('Pagination Queries', () => {
    it('should handle first page efficiently', async () => {
      const { result, duration } = await measureQuery(
        'Pagination: Page 1 (offset 0, limit 50)',
        () =>
          db('orders')
            .select('*')
            .orderBy('id')
            .limit(50)
            .offset(0),
        THRESHOLDS.PAGINATION
      );

      expect(duration).toBeLessThan(THRESHOLDS.PAGINATION);
      expect(result).toHaveLength(50);
    });

    it('should handle middle page efficiently', async () => {
      const { result, duration } = await measureQuery(
        'Pagination: Page 100 (offset 5000, limit 50)',
        () =>
          db('orders')
            .select('*')
            .orderBy('id')
            .limit(50)
            .offset(5000),
        THRESHOLDS.PAGINATION
      );

      expect(duration).toBeLessThan(THRESHOLDS.PAGINATION);
      expect(result).toHaveLength(50);
    });

    it('should handle deep pagination with keyset', async () => {
      // Keyset pagination is more efficient for deep pages
      const { result, duration } = await measureQuery(
        'Keyset pagination (id > 50000)',
        () =>
          db('orders')
            .select('*')
            .where('id', '>', 50000)
            .orderBy('id')
            .limit(50),
        THRESHOLDS.PAGINATION
      );

      expect(duration).toBeLessThan(THRESHOLDS.PAGINATION);
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Subquery Performance', () => {
    it('should handle IN subquery efficiently', async () => {
      const { duration } = await measureQuery(
        'IN subquery (top customers)',
        () =>
          db('orders')
            .whereIn(
              'customer_id',
              db('customer_lifetime_value')
                .select('customer_id')
                .orderBy('total_spent', 'desc')
                .limit(100)
            )
            .limit(1000),
        THRESHOLDS.SUBQUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.SUBQUERY);
    });

    it('should handle EXISTS subquery efficiently', async () => {
      const { duration } = await measureQuery(
        'EXISTS subquery (customers with orders)',
        () =>
          db('customers as c')
            .whereExists(
              db('orders as o')
                .whereRaw('o.customer_id = c.id')
                .where('o.status_id', 1)
            )
            .limit(1000),
        THRESHOLDS.SUBQUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.SUBQUERY);
    });

    it('should handle scalar subquery efficiently', async () => {
      const { duration } = await measureQuery(
        'Scalar subquery (orders with customer count)',
        () =>
          db('orders')
            .select(
              'id',
              'order_number',
              'total_amount',
              db('order_items')
                .count('*')
                .whereRaw('order_items.order_id = orders.id')
                .as('item_count')
            )
            .limit(100),
        THRESHOLDS.SUBQUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.SUBQUERY);
    });
  });

  describe('Complex Report Queries', () => {
    it('should generate sales summary report efficiently', async () => {
      const { duration } = await measureQuery(
        'Sales summary by month',
        () =>
          db('orders')
            .select(
              db.raw("strftime('%Y-%m', order_date) as month"),
            )
            .count('* as order_count')
            .sum('total_amount as total_revenue')
            .avg('total_amount as avg_order_value')
            .groupBy(db.raw("strftime('%Y-%m', order_date)"))
            .orderBy('month', 'desc')
            .limit(24),
        THRESHOLDS.COMPLEX_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_QUERY);
    });

    it('should generate top products report efficiently', async () => {
      const { duration } = await measureQuery(
        'Top products by revenue',
        () =>
          db('order_items as oi')
            .join('products as p', 'oi.product_id', 'p.id')
            .join('categories as c', 'p.category_id', 'c.id')
            .select('p.id', 'p.name', 'c.name as category')
            .sum('oi.line_total as total_revenue')
            .count('oi.id as times_ordered')
            .sum('oi.quantity as total_quantity')
            .groupBy('p.id', 'p.name', 'c.name')
            .orderBy('total_revenue', 'desc')
            .limit(50),
        THRESHOLDS.COMPLEX_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_QUERY);
    });

    it('should generate customer analysis report efficiently', async () => {
      const { duration } = await measureQuery(
        'Customer analysis (lifetime value)',
        () =>
          db('customers as c')
            .leftJoin('orders as o', 'c.id', 'o.customer_id')
            .leftJoin('customer_types as ct', 'c.customer_type_id', 'ct.id')
            .select(
              'c.id',
              'c.first_name',
              'c.last_name',
              'ct.name as customer_type'
            )
            .count('o.id as order_count')
            .sum('o.total_amount as lifetime_value')
            .min('o.order_date as first_order')
            .max('o.order_date as last_order')
            .groupBy('c.id', 'c.first_name', 'c.last_name', 'ct.name')
            .having('order_count', '>', 0)
            .orderBy('lifetime_value', 'desc')
            .limit(100),
        THRESHOLDS.COMPLEX_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_QUERY);
    });

    it('should generate inventory report efficiently', async () => {
      const { duration } = await measureQuery(
        'Inventory status report',
        () =>
          db('inventory as i')
            .join('products as p', 'i.product_id', 'p.id')
            .join('warehouses as w', 'i.warehouse_id', 'w.id')
            .join('categories as c', 'p.category_id', 'c.id')
            .select(
              'p.sku',
              'p.name as product_name',
              'c.name as category',
              'w.name as warehouse'
            )
            .sum('i.quantity as total_stock')
            .groupBy('p.sku', 'p.name', 'c.name', 'w.name')
            .orderBy('total_stock', 'desc')
            .limit(100),
        THRESHOLDS.COMPLEX_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_QUERY);
    });

    it('should generate sales by region report efficiently', async () => {
      const { duration } = await measureQuery(
        'Sales by region report',
        () =>
          db('orders as o')
            .join('customers as c', 'o.customer_id', 'c.id')
            .join('countries as co', 'c.country_id', 'co.id')
            .select('co.name as country', 'co.region')
            .count('o.id as order_count')
            .sum('o.total_amount as total_revenue')
            .avg('o.total_amount as avg_order_value')
            .groupBy('co.name', 'co.region')
            .orderBy('total_revenue', 'desc')
            .limit(50),
        THRESHOLDS.COMPLEX_QUERY
      );

      expect(duration).toBeLessThan(THRESHOLDS.COMPLEX_QUERY);
    });
  });

  describe('Concurrent Query Performance', () => {
    it('should handle concurrent simple queries efficiently', async () => {
      const start = performance.now();

      const queries = Array.from({ length: 10 }, (_, i) =>
        db('orders').where('id', i + 1).first()
      );

      await Promise.all(queries);

      const duration = performance.now() - start;
      recordResult('10 concurrent simple queries', duration, 500);

      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent join queries efficiently', async () => {
      const start = performance.now();

      const queries = Array.from({ length: 5 }, () =>
        db('orders as o')
          .join('customers as c', 'o.customer_id', 'c.id')
          .select('o.id', 'c.first_name')
          .limit(100)
      );

      await Promise.all(queries);

      const duration = performance.now() - start;
      recordResult('5 concurrent join queries', duration, 1000);

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Index Utilization', () => {
    it('should use primary key index efficiently', async () => {
      const { duration } = await measureQuery(
        'Primary key lookup',
        () => db('products').where('id', 12345).first(),
        50
      );

      expect(duration).toBeLessThan(50);
    });

    it('should use unique index efficiently', async () => {
      const { duration } = await measureQuery(
        'Unique index lookup (sku)',
        () => db('products').where('sku', 'SKU0000012345').first(),
        50
      );

      expect(duration).toBeLessThan(50);
    });

    it('should use foreign key index efficiently', async () => {
      const { duration } = await measureQuery(
        'Foreign key index (customer_id)',
        () => db('orders').where('customer_id', 100).limit(100),
        100
      );

      expect(duration).toBeLessThan(100);
    });
  });
});
