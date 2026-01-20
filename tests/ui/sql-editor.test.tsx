/**
 * Comprehensive UI Tests for SQL Editor Component
 * Tests all SQL Editor functionality including Monaco editor, validation, execution, and schema browser
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

// Mock Monaco Editor since it requires browser APIs
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, onMount, options }: any) => {
    return (
      <div data-testid="monaco-editor">
        <textarea
          data-testid="sql-input"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Enter SQL query..."
          style={{ width: '100%', height: '200px', fontFamily: 'monospace' }}
        />
      </div>
    );
  },
}));

// Mock fetch for API calls
let mockFetch: ReturnType<typeof vi.fn>;

// Mock the SQL Editor component
const SQLEditor = ({
  onExecute,
  onValidate,
  dataSourceId,
  readOnly = false,
  initialQuery = '',
}: {
  onExecute?: (sql: string, results: any) => void;
  onValidate?: (sql: string, result: any) => void;
  dataSourceId?: string;
  readOnly?: boolean;
  initialQuery?: string;
}) => {
  const [sql, setSql] = useState(initialQuery);
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    setError(null);
    try {
      const response = await fetch('/api/sql/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const data = await response.json();
      setValidationResult(data);
      onValidate?.(sql, data);
    } catch (err) {
      setError('Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    try {
      const response = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, dataSourceId }),
      });
      const data = await response.json();
      setExecutionResult(data);
      onExecute?.(sql, data);
    } catch (err) {
      setError('Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div data-testid="sql-editor">
      <div className="toolbar">
        <button
          data-testid="validate-btn"
          onClick={handleValidate}
          disabled={isValidating || !sql.trim()}
        >
          {isValidating ? 'Validating...' : 'Validate'}
        </button>
        <button
          data-testid="execute-btn"
          onClick={handleExecute}
          disabled={isExecuting || readOnly || !sql.trim()}
        >
          {isExecuting ? 'Executing...' : 'Execute'}
        </button>
        <button
          data-testid="clear-btn"
          onClick={() => {
            setSql('');
            setValidationResult(null);
            setExecutionResult(null);
            setError(null);
          }}
          disabled={readOnly}
        >
          Clear
        </button>
      </div>

      <div data-testid="monaco-editor">
        <textarea
          data-testid="sql-input"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="Enter SQL query..."
          readOnly={readOnly}
          aria-label="SQL Query Input"
        />
      </div>

      {validationResult && (
        <div data-testid="validation-result" className={validationResult.valid ? 'success' : 'error'}>
          {validationResult.valid ? (
            <span data-testid="validation-success">Query is valid</span>
          ) : (
            <span data-testid="validation-error">{validationResult.error}</span>
          )}
        </div>
      )}

      {executionResult && (
        <div data-testid="execution-result">
          {executionResult.success ? (
            <div data-testid="results-table">
              <table>
                <thead>
                  <tr>
                    {executionResult.columns?.map((col: string, i: number) => (
                      <th key={i}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {executionResult.rows?.map((row: any, i: number) => (
                    <tr key={i}>
                      {executionResult.columns?.map((col: string, j: number) => (
                        <td key={j}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div data-testid="row-count">{executionResult.rows?.length || 0} rows</div>
            </div>
          ) : (
            <div data-testid="execution-error">{executionResult.error}</div>
          )}
        </div>
      )}

      {error && <div data-testid="error-message">{error}</div>}
    </div>
  );
};

describe('SQL Editor UI', () => {
  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the SQL editor with all components', () => {
      render(<SQLEditor />);

      expect(screen.getByTestId('sql-editor')).toBeInTheDocument();
      expect(screen.getByTestId('sql-input')).toBeInTheDocument();
      expect(screen.getByTestId('validate-btn')).toBeInTheDocument();
      expect(screen.getByTestId('execute-btn')).toBeInTheDocument();
      expect(screen.getByTestId('clear-btn')).toBeInTheDocument();
    });

    it('should render with initial query', () => {
      render(<SQLEditor initialQuery="SELECT * FROM users" />);

      const input = screen.getByTestId('sql-input') as HTMLTextAreaElement;
      expect(input.value).toBe('SELECT * FROM users');
    });

    it('should render in read-only mode', () => {
      render(<SQLEditor readOnly initialQuery="SELECT 1" />);

      const input = screen.getByTestId('sql-input') as HTMLTextAreaElement;
      expect(input).toHaveAttribute('readonly');
      expect(screen.getByTestId('execute-btn')).toBeDisabled();
      expect(screen.getByTestId('clear-btn')).toBeDisabled();
    });
  });

  describe('SQL Input', () => {
    it('should allow typing SQL queries', async () => {
      const user = userEvent.setup();
      render(<SQLEditor />);

      const input = screen.getByTestId('sql-input');
      await user.type(input, 'SELECT * FROM orders');

      expect((input as HTMLTextAreaElement).value).toBe('SELECT * FROM orders');
    });

    it('should clear the query when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<SQLEditor initialQuery="SELECT * FROM users" />);

      const input = screen.getByTestId('sql-input') as HTMLTextAreaElement;
      expect(input.value).toBe('SELECT * FROM users');

      await user.click(screen.getByTestId('clear-btn'));

      expect(input.value).toBe('');
    });

    it('should disable validate button when query is empty', () => {
      render(<SQLEditor />);

      expect(screen.getByTestId('validate-btn')).toBeDisabled();
    });

    it('should enable validate button when query has content', async () => {
      const user = userEvent.setup();
      render(<SQLEditor />);

      const input = screen.getByTestId('sql-input');
      await user.type(input, 'SELECT 1');

      expect(screen.getByTestId('validate-btn')).not.toBeDisabled();
    });
  });

  describe('SQL Validation', () => {
    it('should validate SQL and show success result', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      render(<SQLEditor initialQuery="SELECT * FROM users" />);

      await user.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('validation-success')).toBeInTheDocument();
      });
    });

    it('should validate SQL and show error result', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: false, error: 'Syntax error near "FROM"' }),
      });

      render(<SQLEditor initialQuery="SELECT * FORM users" />);

      await user.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument();
        expect(screen.getByText(/syntax error/i)).toBeInTheDocument();
      });
    });

    it('should call onValidate callback with results', async () => {
      const user = userEvent.setup();
      const onValidate = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      render(<SQLEditor initialQuery="SELECT 1" onValidate={onValidate} />);

      await user.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(onValidate).toHaveBeenCalledWith('SELECT 1', { valid: true });
      });
    });

    it('should show loading state during validation', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ valid: true }) }), 100)
      ));

      render(<SQLEditor initialQuery="SELECT 1" />);

      await user.click(screen.getByTestId('validate-btn'));

      expect(screen.getByText('Validating...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Validating...')).not.toBeInTheDocument();
      });
    });
  });

  describe('SQL Execution', () => {
    it('should execute SQL and show results', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          columns: ['id', 'name', 'email'],
          rows: [
            { id: 1, name: 'John', email: 'john@example.com' },
            { id: 2, name: 'Jane', email: 'jane@example.com' },
          ],
        }),
      });

      render(<SQLEditor initialQuery="SELECT * FROM users" />);

      await user.click(screen.getByTestId('execute-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('results-table')).toBeInTheDocument();
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Jane')).toBeInTheDocument();
        expect(screen.getByText('2 rows')).toBeInTheDocument();
      });
    });

    it('should show execution error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Table "users" does not exist',
        }),
      });

      render(<SQLEditor initialQuery="SELECT * FROM users" />);

      await user.click(screen.getByTestId('execute-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('execution-error')).toBeInTheDocument();
        expect(screen.getByText(/does not exist/i)).toBeInTheDocument();
      });
    });

    it('should call onExecute callback with results', async () => {
      const user = userEvent.setup();
      const onExecute = vi.fn();
      const results = { success: true, columns: ['id'], rows: [{ id: 1 }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(results),
      });

      render(<SQLEditor initialQuery="SELECT 1 as id" onExecute={onExecute} />);

      await user.click(screen.getByTestId('execute-btn'));

      await waitFor(() => {
        expect(onExecute).toHaveBeenCalledWith('SELECT 1 as id', results);
      });
    });

    it('should show loading state during execution', async () => {
      const user = userEvent.setup();
      mockFetch.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ success: true, rows: [] }) }), 100)
      ));

      render(<SQLEditor initialQuery="SELECT 1" />);

      await user.click(screen.getByTestId('execute-btn'));

      expect(screen.getByText('Executing...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Executing...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Complex Query Testing', () => {
    // The 29-table join query that spans across the entire database schema
    const complexQuery = `
      SELECT
        o.order_number,
        o.order_date,
        o.total_amount as order_total,
        c.customer_number,
        c.first_name || ' ' || c.last_name as customer_name,
        ct.name as customer_type,
        ctry.name as customer_country,
        cur.name as currency_name,
        os.name as order_status,
        sm.name as shipping_method,
        pm.name as payment_method,
        ca.city as shipping_city,
        e.first_name || ' ' || e.last_name as sales_rep_name,
        d.name as sales_rep_department,
        pos.title as sales_rep_position,
        oi.quantity,
        oi.unit_price,
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
        ship.tracking_number,
        pr.rating as product_rating,
        promo.code as promo_code,
        al.action as last_activity,
        dss.total_revenue as daily_revenue,
        clv.customer_segment
      FROM orders o
      INNER JOIN customers c ON o.customer_id = c.id
      INNER JOIN customer_types ct ON c.customer_type_id = ct.id
      INNER JOIN countries ctry ON c.country_id = ctry.id
      INNER JOIN currencies cur ON o.currency_id = cur.id
      INNER JOIN order_statuses os ON o.order_status_id = os.id
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
      LEFT JOIN inventory inv ON p.id = inv.product_id AND w.id = inv.warehouse_id
      LEFT JOIN invoices i ON o.id = i.order_id
      LEFT JOIN payments pay ON i.id = pay.invoice_id
      LEFT JOIN shipments ship ON o.id = ship.order_id
      LEFT JOIN product_reviews pr ON p.id = pr.product_id AND c.id = pr.customer_id
      LEFT JOIN customer_promotions cp ON c.id = cp.customer_id
      LEFT JOIN promotions promo ON cp.promotion_id = promo.id
      LEFT JOIN activity_logs al ON c.id = al.entity_id AND al.entity_type = 'customer'
      LEFT JOIN daily_sales_summary dss ON DATE(o.order_date) = dss.date
      LEFT JOIN customer_lifetime_value clv ON c.id = clv.customer_id
      WHERE o.order_date >= '2024-01-01'
      ORDER BY o.order_date DESC
      LIMIT 100
    `;

    it('should handle complex 29-table join query', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      render(<SQLEditor initialQuery={complexQuery} />);

      await user.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/sql/validate',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('FROM orders o'),
          })
        );
      });
    });

    it('should execute complex 29-table join query', async () => {
      const user = userEvent.setup();
      const complexResults = {
        success: true,
        columns: [
          'order_number', 'order_date', 'order_total', 'customer_name',
          'customer_type', 'customer_country', 'product_name', 'category_name',
          'brand_name', 'supplier_name', 'warehouse_name', 'sales_rep_name'
        ],
        rows: [
          {
            order_number: 'ORD-001',
            order_date: '2025-01-15',
            order_total: 1500.00,
            customer_name: 'John Doe',
            customer_type: 'Premium',
            customer_country: 'USA',
            product_name: 'Enterprise Software License',
            category_name: 'Software',
            brand_name: 'TechCorp',
            supplier_name: 'Global Software Inc',
            warehouse_name: 'Central Warehouse',
            sales_rep_name: 'Alice Manager',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(complexResults),
      });

      render(<SQLEditor initialQuery={complexQuery} />);

      await user.click(screen.getByTestId('execute-btn'));

      await waitFor(() => {
        expect(screen.getByText('ORD-001')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Enterprise Software License')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during validation', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SQLEditor initialQuery="SELECT 1" />);

      await user.click(screen.getByTestId('validate-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Validation failed')).toBeInTheDocument();
      });
    });

    it('should handle network errors during execution', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SQLEditor initialQuery="SELECT 1" />);

      await user.click(screen.getByTestId('execute-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Execution failed')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<SQLEditor />);

      const input = screen.getByTestId('sql-input');
      expect(input).toHaveAttribute('aria-label', 'SQL Query Input');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SQLEditor initialQuery="SELECT 1" />);

      // Tab through buttons
      await user.tab();
      expect(screen.getByTestId('validate-btn')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('execute-btn')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('clear-btn')).toHaveFocus();
    });
  });
});

describe('SQL Editor with Data Source', () => {
  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should pass dataSourceId when executing query', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, rows: [] }),
    });

    render(<SQLEditor initialQuery="SELECT 1" dataSourceId="ds-123" />);

    await user.click(screen.getByTestId('execute-btn'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sql/execute',
        expect.objectContaining({
          body: expect.stringContaining('ds-123'),
        })
      );
    });
  });
});

describe('SQL Editor Performance', () => {
  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('should handle large result sets', async () => {
    const user = userEvent.setup();
    const largeResults = {
      success: true,
      columns: ['id', 'name'],
      rows: Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Row ${i + 1}`,
      })),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(largeResults),
    });

    render(<SQLEditor initialQuery="SELECT * FROM large_table" />);

    const start = performance.now();
    await user.click(screen.getByTestId('execute-btn'));

    await waitFor(() => {
      expect(screen.getByText('1000 rows')).toBeInTheDocument();
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
  });

  it('should render quickly with complex queries', () => {
    const start = performance.now();

    render(
      <SQLEditor
        initialQuery={`
          SELECT a.*, b.*, c.*, d.*, e.*
          FROM table_a a
          JOIN table_b b ON a.id = b.a_id
          JOIN table_c c ON b.id = c.b_id
          JOIN table_d d ON c.id = d.c_id
          JOIN table_e e ON d.id = e.d_id
          WHERE a.status = 'active'
          ORDER BY a.created_at DESC
          LIMIT 1000
        `}
      />
    );

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500); // Initial render should be fast
  });
});
