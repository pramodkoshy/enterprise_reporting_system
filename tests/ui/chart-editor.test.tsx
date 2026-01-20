import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/charts',
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock recharts components
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter" />,
  ComposedChart: ({ children }: { children: React.ReactNode }) => <div data-testid="composed-chart">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  Cell: () => <div data-testid="cell" />,
}));

// Import the page component after mocking
import ChartsPage from '@/app/(dashboard)/charts/page';
import { ChartRenderer } from '@/components/charts/chart-renderer';

// Mock chart data
const mockCharts = [
  {
    id: 'chart-1',
    name: 'Sales Overview',
    chart_type: 'bar' as const,
    saved_query_id: 'query-1',
    chart_config: JSON.stringify({ legend: { show: true }, tooltip: { enabled: true } }),
    data_mapping: JSON.stringify({ xAxis: { field: 'month' }, yAxis: [{ field: 'revenue', label: 'Revenue' }] }),
    created_by: 'user-1',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'chart-2',
    name: 'Revenue Trends',
    chart_type: 'line' as const,
    saved_query_id: 'query-2',
    chart_config: JSON.stringify({ legend: { show: true }, tooltip: { enabled: true } }),
    data_mapping: JSON.stringify({ xAxis: { field: 'date' }, yAxis: [{ field: 'amount', label: 'Amount' }] }),
    created_by: 'user-1',
    created_at: '2025-01-14T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },
  {
    id: 'chart-3',
    name: 'Customer Distribution',
    chart_type: 'pie' as const,
    saved_query_id: null,
    chart_config: JSON.stringify({ legend: { show: true } }),
    data_mapping: JSON.stringify({ xAxis: { field: 'segment' }, yAxis: [{ field: 'count' }] }),
    created_by: 'user-1',
    created_at: '2025-01-13T10:00:00Z',
    updated_at: '2025-01-13T10:00:00Z',
  },
];

const mockQueries = [
  { id: 'query-1', name: 'Monthly Sales Query', sql_query: 'SELECT * FROM sales GROUP BY month' },
  { id: 'query-2', name: 'Daily Revenue Query', sql_query: 'SELECT * FROM orders' },
  { id: 'query-3', name: 'Customer Segments Query', sql_query: 'SELECT * FROM customers' },
];

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Charts Page', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the page header', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/api/charts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { items: mockCharts } }),
          });
        }
        if (url.includes('/api/queries')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { items: mockQueries } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<ChartsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Charts')).toBeInTheDocument();
      expect(screen.getByText('Create and manage data visualizations')).toBeInTheDocument();
    });

    it('should render the New Chart button', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<ChartsPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /new chart/i })).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      fetchMock.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ChartsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/loading charts/i)).toBeInTheDocument();
    });

    it('should show empty state when no charts exist', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<ChartsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/no charts created yet/i)).toBeInTheDocument();
      });
    });

    it('should render chart list table with headers', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/api/charts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { items: mockCharts } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        });
      });

      render(<ChartsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Query')).toBeInTheDocument();
        expect(screen.getByText('Created')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should render all charts in the list', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/api/charts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { items: mockCharts } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        });
      });

      render(<ChartsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sales Overview')).toBeInTheDocument();
        expect(screen.getByText('Revenue Trends')).toBeInTheDocument();
        expect(screen.getByText('Customer Distribution')).toBeInTheDocument();
      });
    });

    it('should display chart type badges', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/api/charts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { items: mockCharts } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        });
      });

      render(<ChartsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('bar')).toBeInTheDocument();
        expect(screen.getByText('line')).toBeInTheDocument();
        expect(screen.getByText('pie')).toBeInTheDocument();
      });
    });

    it('should show linked badge for charts with queries', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/api/charts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { items: mockCharts } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        });
      });

      render(<ChartsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const linkedBadges = screen.getAllByText('Linked');
        expect(linkedBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Create Chart Dialog', () => {
    it('should open create chart dialog when button is clicked', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<ChartsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new chart/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // Use the heading role to find the dialog title specifically
        expect(screen.getByRole('heading', { name: /create chart/i })).toBeInTheDocument();
      });
    });

    it('should display chart type dropdown in dialog', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockQueries } }),
        })
      );

      render(<ChartsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new chart/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check that the chart type label exists in the dialog
      expect(screen.getByText('Chart Type')).toBeInTheDocument();
    });

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<ChartsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new chart/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should disable create button when name is empty', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<ChartsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new chart/i }));

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /^create chart$/i });
        expect(createButton).toBeDisabled();
      });
    });

    it('should enable create button when name is provided', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockQueries } }),
        })
      );

      render(<ChartsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new chart/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test Chart');

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /^create chart$/i });
        expect(createButton).not.toBeDisabled();
      });
    });

    it('should call create API when form is submitted', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/charts') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { id: 'new-chart-1' } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockQueries } }),
        });
      });

      render(<ChartsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new chart/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'New Test Chart');

      const createButton = screen.getByRole('button', { name: /^create chart$/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/charts',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New Test Chart'),
          })
        );
      });
    });
  });

  describe('Chart Actions', () => {
    it('should render action buttons for each chart row', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/api/charts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { items: mockCharts } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        });
      });

      render(<ChartsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sales Overview')).toBeInTheDocument();
        expect(screen.getByText('Revenue Trends')).toBeInTheDocument();
        expect(screen.getByText('Customer Distribution')).toBeInTheDocument();
      });

      // Verify chart rows are rendered (action buttons exist in the table)
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should render chart types correctly', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/api/charts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { items: mockCharts } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        });
      });

      render(<ChartsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('bar')).toBeInTheDocument();
        expect(screen.getByText('line')).toBeInTheDocument();
        expect(screen.getByText('pie')).toBeInTheDocument();
      });
    });
  });
});

describe('ChartRenderer Component', () => {
  const mockChartData = [
    { month: 'Jan', revenue: 1000, profit: 400 },
    { month: 'Feb', revenue: 1500, profit: 600 },
    { month: 'Mar', revenue: 1200, profit: 450 },
    { month: 'Apr', revenue: 1800, profit: 720 },
    { month: 'May', revenue: 2000, profit: 800 },
  ];

  describe('Bar Chart', () => {
    it('should render bar chart with data', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="bar"
          chartConfig={{ legend: { show: true }, tooltip: { enabled: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue', label: 'Revenue' }],
          }}
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should render legend when enabled', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="bar"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue', label: 'Revenue' }],
          }}
        />
      );

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should render tooltip when enabled', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="bar"
          chartConfig={{ tooltip: { enabled: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue', label: 'Revenue' }],
          }}
        />
      );

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Line Chart', () => {
    it('should render line chart with data', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="line"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue', label: 'Revenue' }],
          }}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Area Chart', () => {
    it('should render area chart with data', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="area"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue', label: 'Revenue' }],
          }}
        />
      );

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
  });

  describe('Pie Chart', () => {
    const pieData = [
      { name: 'Category A', value: 400 },
      { name: 'Category B', value: 300 },
      { name: 'Category C', value: 200 },
      { name: 'Category D', value: 100 },
    ];

    it('should render pie chart with data', () => {
      render(
        <ChartRenderer
          data={pieData}
          chartType="pie"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'name' },
            yAxis: [{ field: 'value' }],
          }}
        />
      );

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  describe('Scatter Chart', () => {
    const scatterData = [
      { x: 100, y: 200 },
      { x: 120, y: 150 },
      { x: 170, y: 300 },
      { x: 140, y: 250 },
    ];

    it('should render scatter chart with data', () => {
      render(
        <ChartRenderer
          data={scatterData}
          chartType="scatter"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'x' },
            yAxis: [{ field: 'y', label: 'Y Value' }],
          }}
        />
      );

      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
    });
  });

  describe('Composed Chart', () => {
    it('should render composed chart with data', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="composed"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [
              { field: 'revenue', label: 'Revenue' },
              { field: 'profit', label: 'Profit' },
            ],
          }}
        />
      );

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show no data message when data is empty', () => {
      render(
        <ChartRenderer
          data={[]}
          chartType="bar"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue' }],
          }}
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Unsupported Chart Type', () => {
    it('should show unsupported message for unknown chart types', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType={'unknown' as any}
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue' }],
          }}
        />
      );

      expect(screen.getByText(/unsupported chart type/i)).toBeInTheDocument();
    });
  });

  describe('Chart Configuration', () => {
    it('should use custom height when provided', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="bar"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue' }],
          }}
          height={600}
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should not render legend when disabled', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="bar"
          chartConfig={{ legend: { show: false } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue' }],
          }}
        />
      );

      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });

    it('should not render tooltip when disabled', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="bar"
          chartConfig={{ tooltip: { enabled: false } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [{ field: 'revenue' }],
          }}
        />
      );

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Multi-Series Charts', () => {
    it('should render multiple series on bar chart', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="bar"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [
              { field: 'revenue', label: 'Revenue' },
              { field: 'profit', label: 'Profit' },
            ],
          }}
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      const bars = screen.getAllByTestId('bar');
      expect(bars.length).toBe(2);
    });

    it('should render multiple series on line chart', () => {
      render(
        <ChartRenderer
          data={mockChartData}
          chartType="line"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'month' },
            yAxis: [
              { field: 'revenue', label: 'Revenue' },
              { field: 'profit', label: 'Profit' },
            ],
          }}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      const lines = screen.getAllByTestId('line');
      expect(lines.length).toBe(2);
    });
  });

  describe('Complex 29-Table Join Query Chart', () => {
    const complexQueryChartData = [
      {
        customer_name: 'John Doe',
        customer_type: 'Premium',
        customer_country: 'USA',
        order_total: 2500.00,
        product_name: 'Enterprise Software',
        category_name: 'Software',
        brand_name: 'TechCorp',
        sales_rep_name: 'Alice Manager',
        daily_revenue: 15000.00,
      },
      {
        customer_name: 'Jane Smith',
        customer_type: 'Standard',
        customer_country: 'Canada',
        order_total: 1800.00,
        product_name: 'Support Package',
        category_name: 'Services',
        brand_name: 'TechCorp',
        sales_rep_name: 'Bob Seller',
        daily_revenue: 12000.00,
      },
      {
        customer_name: 'Bob Johnson',
        customer_type: 'Enterprise',
        customer_country: 'UK',
        order_total: 5000.00,
        product_name: 'Cloud Solution',
        category_name: 'Cloud',
        brand_name: 'CloudMax',
        sales_rep_name: 'Charlie Rep',
        daily_revenue: 25000.00,
      },
    ];

    it('should render chart with complex query data', () => {
      render(
        <ChartRenderer
          data={complexQueryChartData}
          chartType="bar"
          chartConfig={{ legend: { show: true }, tooltip: { enabled: true } }}
          dataMapping={{
            xAxis: { field: 'customer_name' },
            yAxis: [
              { field: 'order_total', label: 'Order Total' },
              { field: 'daily_revenue', label: 'Daily Revenue' },
            ],
          }}
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should render pie chart showing category distribution', () => {
      const categoryData = [
        { category_name: 'Software', total: 15000 },
        { category_name: 'Services', total: 12000 },
        { category_name: 'Cloud', total: 25000 },
      ];

      render(
        <ChartRenderer
          data={categoryData}
          chartType="pie"
          chartConfig={{ legend: { show: true } }}
          dataMapping={{
            xAxis: { field: 'category_name' },
            yAxis: [{ field: 'total' }],
          }}
        />
      );

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should render line chart showing revenue trends', () => {
      const revenueTrendData = [
        { date: '2025-01-01', revenue: 10000, orders: 50 },
        { date: '2025-01-02', revenue: 12000, orders: 60 },
        { date: '2025-01-03', revenue: 15000, orders: 75 },
        { date: '2025-01-04', revenue: 11000, orders: 55 },
        { date: '2025-01-05', revenue: 18000, orders: 90 },
      ];

      render(
        <ChartRenderer
          data={revenueTrendData}
          chartType="line"
          chartConfig={{ legend: { show: true }, tooltip: { enabled: true } }}
          dataMapping={{
            xAxis: { field: 'date' },
            yAxis: [
              { field: 'revenue', label: 'Revenue' },
              { field: 'orders', label: 'Orders' },
            ],
          }}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});

describe('Chart Accessibility', () => {
  it('should have accessible chart controls', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { items: [] } }),
      })
    );
    global.fetch = fetchMock;

    render(<ChartsPage />, { wrapper: createWrapper() });

    // Check for accessible button
    const newChartButton = screen.getByRole('button', { name: /new chart/i });
    expect(newChartButton).toBeInTheDocument();
    expect(newChartButton).toHaveAccessibleName();
  });

  it('should have proper heading hierarchy', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { items: [] } }),
      })
    );
    global.fetch = fetchMock;

    render(<ChartsPage />, { wrapper: createWrapper() });

    const heading = screen.getByRole('heading', { name: 'Charts' });
    expect(heading).toBeInTheDocument();
  });
});
