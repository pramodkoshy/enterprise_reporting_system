import { describe, it, expect, beforeEach } from 'vitest';
import { SQLValidator, validateSQL, validateSQLWithWarnings } from '@/lib/sql/validator';

describe('SQLValidator', () => {
  let validator: SQLValidator;

  beforeEach(() => {
    validator = new SQLValidator();
  });

  describe('Basic SQL Validation', () => {
    it('should validate a simple SELECT statement', () => {
      const result = validator.validate('SELECT * FROM users');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate SELECT with columns', () => {
      const result = validator.validate('SELECT id, name, email FROM users');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate SELECT with WHERE clause', () => {
      const result = validator.validate('SELECT * FROM users WHERE id = 1');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate SELECT with multiple conditions', () => {
      const result = validator.validate(
        "SELECT * FROM users WHERE status = 'active' AND age > 18 OR role = 'admin'"
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate SELECT with LIKE operator', () => {
      const result = validator.validate(
        "SELECT * FROM products WHERE name LIKE '%test%'"
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate SELECT with IN clause', () => {
      const result = validator.validate(
        "SELECT * FROM users WHERE status IN ('active', 'pending', 'inactive')"
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate SELECT with BETWEEN', () => {
      const result = validator.validate(
        'SELECT * FROM orders WHERE created_at BETWEEN :start AND :end'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate SELECT with IS NULL', () => {
      const result = validator.validate(
        'SELECT * FROM users WHERE deleted_at IS NULL'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate SELECT with IS NOT NULL', () => {
      const result = validator.validate(
        'SELECT * FROM users WHERE email IS NOT NULL'
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('JOIN Validation', () => {
    it('should validate INNER JOIN', () => {
      const result = validator.validate(
        'SELECT o.id, c.name FROM orders o INNER JOIN customers c ON o.customer_id = c.id'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate LEFT JOIN', () => {
      const result = validator.validate(
        'SELECT u.*, p.name as profile_name FROM users u LEFT JOIN profiles p ON u.id = p.user_id'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate RIGHT JOIN', () => {
      const result = validator.validate(
        'SELECT * FROM orders o RIGHT JOIN customers c ON o.customer_id = c.id'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate multiple JOINs', () => {
      const sql = `
        SELECT o.id, c.name, p.product_name
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        INNER JOIN order_items oi ON o.id = oi.order_id
        INNER JOIN products p ON oi.product_id = p.id
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should validate self-join', () => {
      const result = validator.validate(
        'SELECT e.name, m.name as manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate CROSS JOIN', () => {
      const result = validator.validate(
        'SELECT * FROM products CROSS JOIN categories'
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('Aggregation Validation', () => {
    it('should validate COUNT', () => {
      const result = validator.validate('SELECT COUNT(*) FROM users');
      expect(result.isValid).toBe(true);
    });

    it('should validate SUM', () => {
      const result = validator.validate('SELECT SUM(amount) FROM orders');
      expect(result.isValid).toBe(true);
    });

    it('should validate AVG', () => {
      const result = validator.validate('SELECT AVG(price) FROM products');
      expect(result.isValid).toBe(true);
    });

    it('should validate MIN and MAX', () => {
      const result = validator.validate(
        'SELECT MIN(created_at), MAX(created_at) FROM orders'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate GROUP BY', () => {
      const result = validator.validate(
        'SELECT category_id, COUNT(*) as count FROM products GROUP BY category_id'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate HAVING', () => {
      const result = validator.validate(
        'SELECT category_id, COUNT(*) as count FROM products GROUP BY category_id HAVING COUNT(*) > 10'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate multiple GROUP BY columns', () => {
      const result = validator.validate(
        'SELECT year, month, SUM(sales) FROM sales_data GROUP BY year, month'
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('Subquery Validation', () => {
    it('should validate subquery in WHERE', () => {
      const result = validator.validate(
        'SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 100)'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate subquery in FROM', () => {
      const result = validator.validate(
        'SELECT t.* FROM (SELECT id, name FROM users) t'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate correlated subquery', () => {
      const result = validator.validate(
        'SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate nested subqueries', () => {
      const sql = `
        SELECT * FROM products WHERE category_id IN (
          SELECT id FROM categories WHERE parent_id IN (
            SELECT id FROM categories WHERE name = 'Electronics'
          )
        )
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });
  });

  describe('ORDER BY and LIMIT Validation', () => {
    it('should validate ORDER BY', () => {
      const result = validator.validate('SELECT * FROM users ORDER BY created_at DESC');
      expect(result.isValid).toBe(true);
    });

    it('should validate ORDER BY multiple columns', () => {
      const result = validator.validate(
        'SELECT * FROM users ORDER BY last_name ASC, first_name ASC'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate LIMIT', () => {
      const result = validator.validate('SELECT * FROM users LIMIT 10');
      expect(result.isValid).toBe(true);
    });

    it('should validate LIMIT with OFFSET', () => {
      const result = validator.validate('SELECT * FROM users LIMIT 10 OFFSET 20');
      expect(result.isValid).toBe(true);
    });

    it('should validate DISTINCT', () => {
      const result = validator.validate('SELECT DISTINCT category_id FROM products');
      expect(result.isValid).toBe(true);
    });
  });

  describe('UNION Validation', () => {
    it('should validate UNION', () => {
      const result = validator.validate(
        'SELECT id, name FROM users UNION SELECT id, name FROM admins'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate UNION ALL', () => {
      const result = validator.validate(
        'SELECT id FROM active_users UNION ALL SELECT id FROM inactive_users'
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate multiple UNIONs', () => {
      const result = validator.validate(
        'SELECT id FROM users UNION SELECT id FROM admins UNION SELECT id FROM guests'
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('Common Table Expression (CTE) Validation', () => {
    it('should validate simple CTE', () => {
      const sql = `
        WITH active_users AS (
          SELECT * FROM users WHERE status = 'active'
        )
        SELECT * FROM active_users
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should validate multiple CTEs', () => {
      const sql = `
        WITH
          active_users AS (SELECT * FROM users WHERE status = 'active'),
          recent_orders AS (SELECT * FROM orders WHERE created_at > '2024-01-01')
        SELECT u.*, o.id as order_id
        FROM active_users u
        JOIN recent_orders o ON u.id = o.user_id
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should validate recursive CTE', () => {
      const sql = `
        WITH RECURSIVE category_tree AS (
          SELECT id, name, parent_id, 0 as level
          FROM categories WHERE parent_id IS NULL
          UNION ALL
          SELECT c.id, c.name, c.parent_id, ct.level + 1
          FROM categories c
          JOIN category_tree ct ON c.parent_id = ct.id
        )
        SELECT * FROM category_tree
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Error Detection', () => {
    it('should accept SELECT without FROM (valid in some dialects)', () => {
      // SELECT without FROM is valid in PostgreSQL (e.g., SELECT 1+1)
      const result = validator.validate('SELECT 1');
      expect(result.isValid).toBe(true);
    });

    it('should detect invalid syntax', () => {
      const result = validator.validate('SELEC * FROM users');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect unclosed parenthesis', () => {
      const result = validator.validate('SELECT * FROM users WHERE id IN (1, 2, 3');
      expect(result.isValid).toBe(false);
    });

    it('should detect unclosed string', () => {
      const result = validator.validate("SELECT * FROM users WHERE name = 'test");
      expect(result.isValid).toBe(false);
    });

    it('should detect invalid keyword usage', () => {
      const result = validator.validate('SELECT * FROM WHERE');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Read-Only Validation', () => {
    it('should reject INSERT statements', () => {
      const result = validator.validate("INSERT INTO users (name) VALUES ('test')", { readOnly: true });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('read-only') || e.message.toLowerCase().includes('insert'))).toBe(true);
    });

    it('should reject UPDATE statements', () => {
      const result = validator.validate("UPDATE users SET name = 'test' WHERE id = 1", { readOnly: true });
      expect(result.isValid).toBe(false);
    });

    it('should reject DELETE statements', () => {
      const result = validator.validate('DELETE FROM users WHERE id = 1', { readOnly: true });
      expect(result.isValid).toBe(false);
    });

    it('should reject DROP statements', () => {
      const result = validator.validate('DROP TABLE users', { readOnly: true });
      expect(result.isValid).toBe(false);
    });

    it('should reject TRUNCATE statements', () => {
      const result = validator.validate('TRUNCATE TABLE users', { readOnly: true });
      expect(result.isValid).toBe(false);
    });

    it('should reject ALTER statements', () => {
      const result = validator.validate('ALTER TABLE users ADD COLUMN age INT', { readOnly: true });
      expect(result.isValid).toBe(false);
    });

    it('should reject CREATE statements', () => {
      const result = validator.validate('CREATE TABLE test (id INT)', { readOnly: true });
      expect(result.isValid).toBe(false);
    });

    it('should allow SELECT in read-only mode', () => {
      const result = validator.validate('SELECT * FROM users', { readOnly: true });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Warning Generation', () => {
    it('should warn about SELECT *', () => {
      const result = validateSQLWithWarnings('SELECT * FROM users');
      expect(result.warnings.some(w => w.type === 'performance')).toBe(true);
    });

    it('should warn about missing WHERE clause on large table queries', () => {
      const result = validateSQLWithWarnings('SELECT id FROM orders');
      expect(result.warnings.some(w => w.type === 'performance')).toBe(true);
    });

    it('should warn about LIKE with leading wildcard', () => {
      const result = validateSQLWithWarnings("SELECT * FROM users WHERE name LIKE '%test'");
      expect(result.warnings.some(w => w.type === 'performance')).toBe(true);
    });

    it('should warn about functions in WHERE clause', () => {
      const result = validateSQLWithWarnings('SELECT * FROM users WHERE UPPER(name) = :name');
      expect(result.warnings.some(w => w.type === 'performance')).toBe(true);
    });

    it('should warn about OR conditions', () => {
      const result = validateSQLWithWarnings('SELECT * FROM users WHERE status = :s1 OR role = :r1');
      expect(result.warnings.some(w => w.type === 'performance')).toBe(true);
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract named parameters', () => {
      const result = validator.validate('SELECT * FROM users WHERE id = :userId AND status = :status');
      expect(result.isValid).toBe(true);
      expect(result.parameters).toContain('userId');
      expect(result.parameters).toContain('status');
    });

    it('should extract multiple occurrences of same parameter', () => {
      const result = validator.validate('SELECT * FROM users WHERE created_at > :date OR updated_at > :date');
      expect(result.isValid).toBe(true);
      expect(result.parameters?.filter(p => p === 'date')).toHaveLength(1); // Should be unique
    });

    it('should handle queries without parameters', () => {
      const result = validator.validate('SELECT * FROM users WHERE id = 1');
      expect(result.isValid).toBe(true);
      expect(result.parameters).toHaveLength(0);
    });
  });

  describe('Dialect-Specific Validation', () => {
    it('should validate PostgreSQL-specific syntax', () => {
      const result = validator.validate('SELECT * FROM users WHERE id = ANY(:ids)', { dialect: 'postgresql' });
      expect(result.isValid).toBe(true);
    });

    it('should validate MySQL-specific syntax', () => {
      const result = validator.validate('SELECT * FROM users LIMIT 10, 20', { dialect: 'mysql' });
      expect(result.isValid).toBe(true);
    });

    it('should validate SQLite-specific syntax', () => {
      const result = validator.validate('SELECT * FROM users WHERE rowid > 100', { dialect: 'sqlite' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('Complex Query Validation', () => {
    it('should validate complex analytical query', () => {
      const sql = `
        WITH monthly_sales AS (
          SELECT
            DATE_TRUNC('month', order_date) as month,
            customer_id,
            SUM(total_amount) as total_sales
          FROM orders
          WHERE order_date >= :start_date
          GROUP BY DATE_TRUNC('month', order_date), customer_id
        ),
        customer_rankings AS (
          SELECT
            month,
            customer_id,
            total_sales,
            RANK() OVER (PARTITION BY month ORDER BY total_sales DESC) as sales_rank
          FROM monthly_sales
        )
        SELECT
          cr.month,
          c.name as customer_name,
          cr.total_sales,
          cr.sales_rank
        FROM customer_rankings cr
        INNER JOIN customers c ON cr.customer_id = c.id
        WHERE cr.sales_rank <= 10
        ORDER BY cr.month DESC, cr.sales_rank ASC
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should validate query with window functions', () => {
      const sql = `
        SELECT
          id,
          name,
          salary,
          AVG(salary) OVER (PARTITION BY department_id) as dept_avg,
          salary - AVG(salary) OVER (PARTITION BY department_id) as diff_from_avg,
          ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) as salary_rank
        FROM employees
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should validate query with CASE expression', () => {
      const sql = `
        SELECT
          id,
          name,
          CASE
            WHEN salary > 100000 THEN 'High'
            WHEN salary > 50000 THEN 'Medium'
            ELSE 'Low'
          END as salary_tier
        FROM employees
      `;
      const result = validator.validate(sql);
      expect(result.isValid).toBe(true);
    });

    it('should validate query with COALESCE', () => {
      const result = validator.validate('SELECT COALESCE(nickname, first_name, email) as display_name FROM users');
      expect(result.isValid).toBe(true);
    });

    it('should validate query with NULLIF', () => {
      const result = validator.validate('SELECT total / NULLIF(count, 0) as average FROM stats');
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateSQL function', () => {
  it('should be a convenience function that returns validation result', () => {
    const result = validateSQL('SELECT * FROM users');
    expect(result.isValid).toBe(true);
  });

  it('should accept dialect as second parameter', () => {
    const result = validateSQL('SELECT * FROM users', 'pg');
    expect(result.isValid).toBe(true);
  });
});

describe('validateSQLWithWarnings function', () => {
  it('should return both errors and warnings', () => {
    const result = validateSQLWithWarnings('SELECT * FROM users');
    expect(result.isValid).toBe(true);
    expect(result.warnings).toBeDefined();
  });
});
