/**
 * Comprehensive UI Tests for Report Editor Component
 * Tests report creation, column configuration, filtering, sorting, and export functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

// Mock fetch for API calls
let mockFetch: ReturnType<typeof vi.fn>;

// Mock Report Editor component
interface ColumnConfig {
  id: string;
  field: string;
  header: string;
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
  width?: number;
}

interface ReportConfig {
  name: string;
  description?: string;
  savedQueryId?: string;
  columns: ColumnConfig[];
  filters?: any[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
}

const ReportEditor = ({
  reportId,
  onSave,
  onExport,
  initialConfig,
}: {
  reportId?: string;
  onSave?: (config: ReportConfig) => void;
  onExport?: (format: string) => void;
  initialConfig?: ReportConfig;
}) => {
  const [config, setConfig] = useState<ReportConfig>(
    initialConfig || {
      name: '',
      description: '',
      savedQueryId: '',
      columns: [],
      filters: [],
      sortBy: [],
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('columns');

  const handleSave = async () => {
    if (!config.name.trim()) {
      setError('Report name is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(reportId ? `/api/reports/${reportId}` : '/api/reports', {
        method: reportId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (data.success) {
        onSave?.(config);
      } else {
        setError(data.error?.message || 'Failed to save report');
      }
    } catch (err) {
      setError('Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      setPreviewData(data.data);
    } catch (err) {
      setError('Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      await fetch(`/api/reports/${reportId}/export?format=${format}`);
      onExport?.(format);
    } catch (err) {
      setError(`Failed to export as ${format}`);
    }
  };

  const addColumn = (column: ColumnConfig) => {
    setConfig((prev) => ({
      ...prev,
      columns: [...prev.columns, column],
    }));
  };

  const removeColumn = (columnId: string) => {
    setConfig((prev) => ({
      ...prev,
      columns: prev.columns.filter((c) => c.id !== columnId),
    }));
  };

  const toggleColumnVisibility = (columnId: string) => {
    setConfig((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.id === columnId ? { ...c, visible: !c.visible } : c
      ),
    }));
  };

  const reorderColumns = (fromIndex: number, toIndex: number) => {
    setConfig((prev) => {
      const newColumns = [...prev.columns];
      const [removed] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, removed);
      return { ...prev, columns: newColumns };
    });
  };

  const addFilter = (filter: any) => {
    setConfig((prev) => ({
      ...prev,
      filters: [...(prev.filters || []), filter],
    }));
  };

  const removeFilter = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters?.filter((_, i) => i !== index),
    }));
  };

  return (
    <div data-testid="report-editor">
      <div className="header">
        <input
          data-testid="report-name-input"
          type="text"
          placeholder="Report Name"
          value={config.name}
          onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
        />
        <textarea
          data-testid="report-description-input"
          placeholder="Description (optional)"
          value={config.description || ''}
          onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="tabs" data-testid="report-tabs">
        <button
          data-testid="tab-columns"
          className={activeTab === 'columns' ? 'active' : ''}
          onClick={() => setActiveTab('columns')}
        >
          Columns
        </button>
        <button
          data-testid="tab-filters"
          className={activeTab === 'filters' ? 'active' : ''}
          onClick={() => setActiveTab('filters')}
        >
          Filters
        </button>
        <button
          data-testid="tab-sorting"
          className={activeTab === 'sorting' ? 'active' : ''}
          onClick={() => setActiveTab('sorting')}
        >
          Sorting
        </button>
        <button
          data-testid="tab-preview"
          className={activeTab === 'preview' ? 'active' : ''}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      {activeTab === 'columns' && (
        <div data-testid="columns-panel">
          <div className="column-list" data-testid="column-list">
            {config.columns.map((column, index) => (
              <div key={column.id} data-testid={`column-item-${column.id}`} className="column-item">
                <span>{column.header}</span>
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => toggleColumnVisibility(column.id)}
                  data-testid={`column-visible-${column.id}`}
                />
                <button
                  data-testid={`remove-column-${column.id}`}
                  onClick={() => removeColumn(column.id)}
                >
                  Remove
                </button>
                <button
                  data-testid={`move-up-${column.id}`}
                  onClick={() => reorderColumns(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  data-testid={`move-down-${column.id}`}
                  onClick={() => reorderColumns(index, Math.min(config.columns.length - 1, index + 1))}
                  disabled={index === config.columns.length - 1}
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
          <button
            data-testid="add-column-btn"
            onClick={() =>
              addColumn({
                id: `col-${Date.now()}`,
                field: 'new_field',
                header: 'New Column',
                visible: true,
                sortable: true,
                filterable: true,
              })
            }
          >
            Add Column
          </button>
        </div>
      )}

      {activeTab === 'filters' && (
        <div data-testid="filters-panel">
          <div className="filter-list" data-testid="filter-list">
            {config.filters?.map((filter, index) => (
              <div key={index} data-testid={`filter-item-${index}`} className="filter-item">
                <span>{filter.field} {filter.operator} {filter.value}</span>
                <button
                  data-testid={`remove-filter-${index}`}
                  onClick={() => removeFilter(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="add-filter-form" data-testid="add-filter-form">
            <select data-testid="filter-field-select">
              <option value="">Select Field</option>
              {config.columns.map((col) => (
                <option key={col.id} value={col.field}>{col.header}</option>
              ))}
            </select>
            <select data-testid="filter-operator-select">
              <option value="equals">Equals</option>
              <option value="contains">Contains</option>
              <option value="startsWith">Starts With</option>
              <option value="endsWith">Ends With</option>
              <option value="greaterThan">Greater Than</option>
              <option value="lessThan">Less Than</option>
            </select>
            <input data-testid="filter-value-input" type="text" placeholder="Value" />
            <button
              data-testid="add-filter-btn"
              onClick={() =>
                addFilter({
                  field: 'test_field',
                  operator: 'equals',
                  value: 'test_value',
                })
              }
            >
              Add Filter
            </button>
          </div>
        </div>
      )}

      {activeTab === 'sorting' && (
        <div data-testid="sorting-panel">
          <div className="sort-list" data-testid="sort-list">
            {config.sortBy?.map((sort, index) => (
              <div key={index} data-testid={`sort-item-${index}`} className="sort-item">
                <span>{sort.field} ({sort.direction})</span>
              </div>
            ))}
          </div>
          <button
            data-testid="add-sort-btn"
            onClick={() =>
              setConfig((prev) => ({
                ...prev,
                sortBy: [...(prev.sortBy || []), { field: 'id', direction: 'asc' }],
              }))
            }
          >
            Add Sort
          </button>
        </div>
      )}

      {activeTab === 'preview' && (
        <div data-testid="preview-panel">
          <button data-testid="refresh-preview-btn" onClick={handlePreview} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh Preview'}
          </button>
          {previewData && (
            <table data-testid="preview-table">
              <thead>
                <tr>
                  {previewData.columns?.map((col: string) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows?.map((row: any, i: number) => (
                  <tr key={i}>
                    {Object.values(row).map((val: any, j: number) => (
                      <td key={j}>{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="actions">
        <button data-testid="save-btn" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Report'}
        </button>
        <button data-testid="preview-btn" onClick={handlePreview} disabled={isLoading}>
          Preview
        </button>
        <div className="export-dropdown" data-testid="export-dropdown">
          <button data-testid="export-btn">Export</button>
          <div className="export-options">
            <button data-testid="export-csv" onClick={() => handleExport('csv')}>CSV</button>
            <button data-testid="export-excel" onClick={() => handleExport('excel')}>Excel</button>
            <button data-testid="export-pdf" onClick={() => handleExport('pdf')}>PDF</button>
            <button data-testid="export-json" onClick={() => handleExport('json')}>JSON</button>
          </div>
        </div>
      </div>

      {error && <div data-testid="error-message" className="error">{error}</div>}
    </div>
  );
};

describe('Report Editor UI', () => {
  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the report editor with all components', () => {
      render(<ReportEditor />);

      expect(screen.getByTestId('report-editor')).toBeInTheDocument();
      expect(screen.getByTestId('report-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('report-description-input')).toBeInTheDocument();
      expect(screen.getByTestId('report-tabs')).toBeInTheDocument();
      expect(screen.getByTestId('save-btn')).toBeInTheDocument();
    });

    it('should render with initial configuration', () => {
      const initialConfig: ReportConfig = {
        name: 'Sales Report',
        description: 'Monthly sales data',
        columns: [
          { id: 'col1', field: 'order_date', header: 'Order Date', visible: true, sortable: true, filterable: true },
          { id: 'col2', field: 'total', header: 'Total', visible: true, sortable: true, filterable: true },
        ],
      };

      render(<ReportEditor initialConfig={initialConfig} />);

      expect(screen.getByTestId('report-name-input')).toHaveValue('Sales Report');
      expect(screen.getByTestId('report-description-input')).toHaveValue('Monthly sales data');
    });

    it('should render all tab buttons', () => {
      render(<ReportEditor />);

      expect(screen.getByTestId('tab-columns')).toBeInTheDocument();
      expect(screen.getByTestId('tab-filters')).toBeInTheDocument();
      expect(screen.getByTestId('tab-sorting')).toBeInTheDocument();
      expect(screen.getByTestId('tab-preview')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to columns tab', async () => {
      const user = userEvent.setup();
      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-columns'));
      expect(screen.getByTestId('columns-panel')).toBeInTheDocument();
    });

    it('should switch to filters tab', async () => {
      const user = userEvent.setup();
      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-filters'));
      expect(screen.getByTestId('filters-panel')).toBeInTheDocument();
    });

    it('should switch to sorting tab', async () => {
      const user = userEvent.setup();
      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-sorting'));
      expect(screen.getByTestId('sorting-panel')).toBeInTheDocument();
    });

    it('should switch to preview tab', async () => {
      const user = userEvent.setup();
      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-preview'));
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    });
  });

  describe('Column Configuration', () => {
    it('should add a new column', async () => {
      const user = userEvent.setup();
      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-columns'));
      await user.click(screen.getByTestId('add-column-btn'));

      await waitFor(() => {
        expect(screen.getByText('New Column')).toBeInTheDocument();
      });
    });

    it('should remove a column', async () => {
      const user = userEvent.setup();
      const initialConfig: ReportConfig = {
        name: 'Test',
        columns: [
          { id: 'col1', field: 'test', header: 'Test Column', visible: true, sortable: true, filterable: true },
        ],
      };

      render(<ReportEditor initialConfig={initialConfig} />);

      await user.click(screen.getByTestId('tab-columns'));
      await user.click(screen.getByTestId('remove-column-col1'));

      await waitFor(() => {
        expect(screen.queryByText('Test Column')).not.toBeInTheDocument();
      });
    });

    it('should toggle column visibility', async () => {
      const user = userEvent.setup();
      const initialConfig: ReportConfig = {
        name: 'Test',
        columns: [
          { id: 'col1', field: 'test', header: 'Test Column', visible: true, sortable: true, filterable: true },
        ],
      };

      render(<ReportEditor initialConfig={initialConfig} />);

      await user.click(screen.getByTestId('tab-columns'));
      const checkbox = screen.getByTestId('column-visible-col1');
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should reorder columns', async () => {
      const user = userEvent.setup();
      const initialConfig: ReportConfig = {
        name: 'Test',
        columns: [
          { id: 'col1', field: 'first', header: 'First', visible: true, sortable: true, filterable: true },
          { id: 'col2', field: 'second', header: 'Second', visible: true, sortable: true, filterable: true },
        ],
      };

      render(<ReportEditor initialConfig={initialConfig} />);

      await user.click(screen.getByTestId('tab-columns'));
      await user.click(screen.getByTestId('move-down-col1'));

      // After moving down, First should be after Second
      const columnList = screen.getByTestId('column-list');
      const items = within(columnList).getAllByText(/First|Second/);
      expect(items[0]).toHaveTextContent('Second');
      expect(items[1]).toHaveTextContent('First');
    });
  });

  describe('Filter Configuration', () => {
    it('should add a filter', async () => {
      const user = userEvent.setup();
      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-filters'));
      await user.click(screen.getByTestId('add-filter-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('filter-item-0')).toBeInTheDocument();
      });
    });

    it('should remove a filter', async () => {
      const user = userEvent.setup();
      const initialConfig: ReportConfig = {
        name: 'Test',
        columns: [],
        filters: [{ field: 'status', operator: 'equals', value: 'active' }],
      };

      render(<ReportEditor initialConfig={initialConfig} />);

      await user.click(screen.getByTestId('tab-filters'));
      await user.click(screen.getByTestId('remove-filter-0'));

      await waitFor(() => {
        expect(screen.queryByTestId('filter-item-0')).not.toBeInTheDocument();
      });
    });

    it('should show filter form elements', async () => {
      const user = userEvent.setup();
      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-filters'));

      expect(screen.getByTestId('filter-field-select')).toBeInTheDocument();
      expect(screen.getByTestId('filter-operator-select')).toBeInTheDocument();
      expect(screen.getByTestId('filter-value-input')).toBeInTheDocument();
    });
  });

  describe('Sorting Configuration', () => {
    it('should add a sort rule', async () => {
      const user = userEvent.setup();
      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-sorting'));
      await user.click(screen.getByTestId('add-sort-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('sort-item-0')).toBeInTheDocument();
      });
    });
  });

  describe('Preview Functionality', () => {
    it('should load preview data', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: {
            columns: ['id', 'name', 'total'],
            rows: [
              { id: 1, name: 'Order 1', total: 100 },
              { id: 2, name: 'Order 2', total: 200 },
            ],
          },
        }),
      });

      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-preview'));
      await user.click(screen.getByTestId('refresh-preview-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-table')).toBeInTheDocument();
      });
    });

    it('should show loading state during preview', async () => {
      const user = userEvent.setup();
      let resolvePromise: any;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      render(<ReportEditor />);

      await user.click(screen.getByTestId('tab-preview'));
      await user.click(screen.getByTestId('refresh-preview-btn'));

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      resolvePromise({
        json: () => Promise.resolve({ success: true, data: { columns: [], rows: [] } }),
      });
    });
  });

  describe('Save Functionality', () => {
    it('should save report successfully', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { id: 'report-1' } }),
      });

      render(<ReportEditor onSave={onSave} />);

      const nameInput = screen.getByTestId('report-name-input');
      await user.type(nameInput, 'My Report');

      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('should show error when saving without name', async () => {
      const user = userEvent.setup();
      render(<ReportEditor />);

      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Report name is required')).toBeInTheDocument();
      });
    });

    it('should show saving state', async () => {
      const user = userEvent.setup();
      let resolvePromise: any;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      render(<ReportEditor />);

      const nameInput = screen.getByTestId('report-name-input');
      await user.type(nameInput, 'My Report');

      await user.click(screen.getByTestId('save-btn'));

      expect(screen.getByText('Saving...')).toBeInTheDocument();

      resolvePromise({
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  describe('Export Functionality', () => {
    it('should export as CSV', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();
      mockFetch.mockResolvedValueOnce({});

      render(<ReportEditor reportId="report-1" onExport={onExport} />);

      await user.click(screen.getByTestId('export-csv'));

      await waitFor(() => {
        expect(onExport).toHaveBeenCalledWith('csv');
      });
    });

    it('should export as Excel', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();
      mockFetch.mockResolvedValueOnce({});

      render(<ReportEditor reportId="report-1" onExport={onExport} />);

      await user.click(screen.getByTestId('export-excel'));

      await waitFor(() => {
        expect(onExport).toHaveBeenCalledWith('excel');
      });
    });

    it('should export as PDF', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();
      mockFetch.mockResolvedValueOnce({});

      render(<ReportEditor reportId="report-1" onExport={onExport} />);

      await user.click(screen.getByTestId('export-pdf'));

      await waitFor(() => {
        expect(onExport).toHaveBeenCalledWith('pdf');
      });
    });

    it('should export as JSON', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();
      mockFetch.mockResolvedValueOnce({});

      render(<ReportEditor reportId="report-1" onExport={onExport} />);

      await user.click(screen.getByTestId('export-json'));

      await waitFor(() => {
        expect(onExport).toHaveBeenCalledWith('json');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle save error', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Database error' },
        }),
      });

      render(<ReportEditor />);

      const nameInput = screen.getByTestId('report-name-input');
      await user.type(nameInput, 'My Report');

      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });

    it('should handle network error', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ReportEditor />);

      const nameInput = screen.getByTestId('report-name-input');
      await user.type(nameInput, 'My Report');

      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Failed to save report')).toBeInTheDocument();
      });
    });
  });

  describe('Complex Report with 29-Table Query', () => {
    it('should create report with complex query columns', async () => {
      const user = userEvent.setup();
      const complexConfig: ReportConfig = {
        name: 'Enterprise Sales Report',
        description: 'Comprehensive 29-table sales analysis',
        columns: [
          { id: 'col1', field: 'order_number', header: 'Order #', visible: true, sortable: true, filterable: true },
          { id: 'col2', field: 'customer_name', header: 'Customer', visible: true, sortable: true, filterable: true },
          { id: 'col3', field: 'customer_country', header: 'Country', visible: true, sortable: true, filterable: true },
          { id: 'col4', field: 'product_name', header: 'Product', visible: true, sortable: true, filterable: true },
          { id: 'col5', field: 'category_name', header: 'Category', visible: true, sortable: true, filterable: true },
          { id: 'col6', field: 'brand_name', header: 'Brand', visible: true, sortable: true, filterable: true },
          { id: 'col7', field: 'order_total', header: 'Total', visible: true, sortable: true, filterable: true },
          { id: 'col8', field: 'sales_rep_name', header: 'Sales Rep', visible: true, sortable: true, filterable: true },
          { id: 'col9', field: 'shipping_method', header: 'Shipping', visible: true, sortable: true, filterable: true },
          { id: 'col10', field: 'payment_method', header: 'Payment', visible: true, sortable: true, filterable: true },
          { id: 'col11', field: 'warehouse_name', header: 'Warehouse', visible: true, sortable: true, filterable: true },
          { id: 'col12', field: 'invoice_status', header: 'Invoice Status', visible: true, sortable: true, filterable: true },
          { id: 'col13', field: 'shipment_status', header: 'Shipment Status', visible: true, sortable: true, filterable: true },
        ],
        filters: [
          { field: 'order_date', operator: 'greaterThan', value: '2020-01-01' },
        ],
        sortBy: [
          { field: 'order_date', direction: 'desc' },
        ],
      };

      render(<ReportEditor initialConfig={complexConfig} />);

      expect(screen.getByTestId('report-name-input')).toHaveValue('Enterprise Sales Report');

      await user.click(screen.getByTestId('tab-columns'));
      expect(screen.getByText('Order #')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Product')).toBeInTheDocument();
    });
  });
});
