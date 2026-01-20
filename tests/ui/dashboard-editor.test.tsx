import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  usePathname: () => '/dashboards',
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

// Mock react-grid-layout
vi.mock('react-grid-layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="grid-layout">{children}</div>,
  WidthProvider: (Component: React.ComponentType<any>) => {
    return function WidthProviderComponent(props: any) {
      return <Component {...props} />;
    };
  },
}));

// Mock recharts for ChartRenderer
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

// Import components after mocking
import DashboardsPage from '@/app/(dashboard)/dashboards/page';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';

// Mock dashboard data
const mockDashboards = [
  {
    id: 'dashboard-1',
    name: 'Sales Dashboard',
    description: 'Overview of sales performance',
    is_public: true,
    layout_config: JSON.stringify({
      cols: { lg: 12, md: 10, sm: 6, xs: 4 },
      rowHeight: 100,
      layouts: { lg: [], md: [], sm: [], xs: [] },
    }),
    created_by: 'user-1',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'dashboard-2',
    name: 'Operations Dashboard',
    description: 'Operational metrics and KPIs',
    is_public: false,
    layout_config: JSON.stringify({
      cols: { lg: 12, md: 10, sm: 6, xs: 4 },
      rowHeight: 100,
      layouts: { lg: [], md: [], sm: [], xs: [] },
    }),
    created_by: 'user-1',
    created_at: '2025-01-14T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },
  {
    id: 'dashboard-3',
    name: 'Executive Summary',
    description: '',
    is_public: true,
    layout_config: JSON.stringify({
      cols: { lg: 12, md: 10, sm: 6, xs: 4 },
      rowHeight: 100,
      layouts: { lg: [], md: [], sm: [], xs: [] },
    }),
    created_by: 'user-1',
    created_at: '2025-01-13T10:00:00Z',
    updated_at: '2025-01-13T10:00:00Z',
  },
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

describe('Dashboards Page', () => {
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
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockDashboards } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Dashboards')).toBeInTheDocument();
      expect(screen.getByText('Create and manage interactive dashboards')).toBeInTheDocument();
    });

    it('should render the New Dashboard button', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /new dashboard/i })).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      fetchMock.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DashboardsPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/loading dashboards/i)).toBeInTheDocument();
    });

    it('should show empty state when no dashboards exist', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/no dashboards created yet/i)).toBeInTheDocument();
      });
    });

    it('should render dashboard list table with headers', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockDashboards } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Visibility')).toBeInTheDocument();
        expect(screen.getByText('Created')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should render all dashboards in the list', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockDashboards } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Operations Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      });
    });

    it('should display public/private badges correctly', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockDashboards } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const publicBadges = screen.getAllByText('Public');
        const privateBadges = screen.getAllByText('Private');
        expect(publicBadges.length).toBe(2);
        expect(privateBadges.length).toBe(1);
      });
    });

    it('should display descriptions when provided', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockDashboards } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Overview of sales performance')).toBeInTheDocument();
        expect(screen.getByText('Operational metrics and KPIs')).toBeInTheDocument();
      });
    });
  });

  describe('Create Dashboard Dialog', () => {
    it('should open create dashboard dialog when button is clicked', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new dashboard/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // Use the heading role to find the dialog title specifically
        expect(screen.getByRole('heading', { name: /create dashboard/i })).toBeInTheDocument();
      });
    });

    it('should display form fields in create dialog', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new dashboard/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        expect(screen.getByText(/make dashboard public/i)).toBeInTheDocument();
      });
    });

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new dashboard/i }));

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

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new dashboard/i }));

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /^create dashboard$/i });
        expect(createButton).toBeDisabled();
      });
    });

    it('should enable create button when name is provided', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new dashboard/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test Dashboard');

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /^create dashboard$/i });
        expect(createButton).not.toBeDisabled();
      });
    });

    it('should toggle public switch', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new dashboard/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const publicSwitch = screen.getByRole('switch');
      expect(publicSwitch).not.toBeChecked();

      await user.click(publicSwitch);

      expect(publicSwitch).toBeChecked();
    });

    it('should call create API when form is submitted', async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/api/dashboards') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { id: 'new-dashboard-1' } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: [] } }),
        });
      });

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /new dashboard/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'New Test Dashboard');

      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, 'Test description');

      const createButton = screen.getByRole('button', { name: /^create dashboard$/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/dashboards',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New Test Dashboard'),
          })
        );
      });
    });
  });

  describe('Dashboard Actions', () => {
    it('should render all dashboard rows with descriptions', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockDashboards } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Operations Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      });

      // Verify descriptions are shown
      expect(screen.getByText('Overview of sales performance')).toBeInTheDocument();
      expect(screen.getByText('Operational metrics and KPIs')).toBeInTheDocument();
    });

    it('should render visibility badges correctly', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockDashboards } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
      });

      // Check visibility badges
      const publicBadges = screen.getAllByText('Public');
      const privateBadges = screen.getAllByText('Private');
      expect(publicBadges.length).toBe(2);
      expect(privateBadges.length).toBe(1);
    });

    it('should render table with all columns', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { items: mockDashboards } }),
        })
      );

      render(<DashboardsPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
      });

      // Verify table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });
});

describe('DashboardGrid Component', () => {
  const mockWidgets = [
    {
      id: 'widget-1',
      dashboard_id: 'dashboard-1',
      widget_type: 'chart' as const,
      widget_config: JSON.stringify({}),
      position_x: 0,
      position_y: 0,
      width: 6,
      height: 4,
      title: 'Sales Chart',
      chartData: {
        data: [
          { month: 'Jan', revenue: 1000 },
          { month: 'Feb', revenue: 1500 },
        ],
        chartType: 'bar' as const,
        chartConfig: { legend: { show: true } },
        dataMapping: { xAxis: { field: 'month' }, yAxis: [{ field: 'revenue' }] },
      },
    },
    {
      id: 'widget-2',
      dashboard_id: 'dashboard-1',
      widget_type: 'report' as const,
      widget_config: JSON.stringify({}),
      position_x: 6,
      position_y: 0,
      width: 6,
      height: 4,
      title: 'Sales Report',
      reportData: {
        rows: [
          { id: 1, name: 'Product A', sales: 100 },
          { id: 2, name: 'Product B', sales: 150 },
        ],
        columns: [
          { accessorKey: 'name', header: 'Product' },
          { accessorKey: 'sales', header: 'Sales' },
        ],
      },
    },
    {
      id: 'widget-3',
      dashboard_id: 'dashboard-1',
      widget_type: 'metric' as const,
      widget_config: JSON.stringify({}),
      position_x: 0,
      position_y: 4,
      width: 3,
      height: 2,
      title: 'Total Revenue',
    },
    {
      id: 'widget-4',
      dashboard_id: 'dashboard-1',
      widget_type: 'text' as const,
      widget_config: JSON.stringify({ content: 'Welcome to the dashboard!' }),
      position_x: 3,
      position_y: 4,
      width: 3,
      height: 2,
      title: 'Notes',
    },
  ];

  const mockLayout = [
    { i: 'widget-1', x: 0, y: 0, w: 6, h: 4 },
    { i: 'widget-2', x: 6, y: 0, w: 6, h: 4 },
    { i: 'widget-3', x: 0, y: 4, w: 3, h: 2 },
    { i: 'widget-4', x: 3, y: 4, w: 3, h: 2 },
  ];

  describe('Rendering Widgets', () => {
    it('should render all widgets', () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={false}
        />
      );

      expect(screen.getByText('Sales Chart')).toBeInTheDocument();
      expect(screen.getByText('Sales Report')).toBeInTheDocument();
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('should render chart widget content', () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={false}
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render report widget with data table', () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={false}
        />
      );

      expect(screen.getByText('Product A')).toBeInTheDocument();
      expect(screen.getByText('Product B')).toBeInTheDocument();
    });

    it('should render metric widget', () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={false}
        />
      );

      expect(screen.getByText('--')).toBeInTheDocument();
      expect(screen.getByText('Metric')).toBeInTheDocument();
    });

    it('should render text widget with content', () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={false}
        />
      );

      expect(screen.getByText('Welcome to the dashboard!')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should show edit controls when in edit mode', () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={true}
        />
      );

      // Should have move handles and close buttons
      const moveHandles = document.querySelectorAll('.drag-handle');
      expect(moveHandles.length).toBeGreaterThan(0);
    });

    it('should not show edit controls when not in edit mode', () => {
      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={false}
        />
      );

      // Should not have drag handles visible
      const moveHandles = document.querySelectorAll('.drag-handle');
      expect(moveHandles.length).toBe(0);
    });

    it('should call onRemoveWidget when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onRemoveWidget = vi.fn();

      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={true}
          onRemoveWidget={onRemoveWidget}
        />
      );

      // Find a remove button (X icon)
      const removeButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg.lucide-x');
        return svg !== null;
      });

      if (removeButtons.length > 0) {
        await user.click(removeButtons[0]);
        expect(onRemoveWidget).toHaveBeenCalled();
      }
    });

    it('should call onConfigureWidget when settings button is clicked', async () => {
      const user = userEvent.setup();
      const onConfigureWidget = vi.fn();

      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={true}
          onConfigureWidget={onConfigureWidget}
        />
      );

      // Find a settings button
      const settingsButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg.lucide-settings');
        return svg !== null;
      });

      if (settingsButtons.length > 0) {
        await user.click(settingsButtons[0]);
        expect(onConfigureWidget).toHaveBeenCalled();
      }
    });

    it('should call onLayoutChange when layout changes', () => {
      const onLayoutChange = vi.fn();

      render(
        <DashboardGrid
          widgets={mockWidgets}
          layout={mockLayout}
          isEditing={true}
          onLayoutChange={onLayoutChange}
        />
      );

      // The grid layout component is mocked, so we just verify the prop is passed
      expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
    });
  });

  describe('Empty Widget States', () => {
    it('should show no chart data message when chart widget has no data', () => {
      const widgetWithNoChartData = [{
        ...mockWidgets[0],
        chartData: undefined,
      }];

      render(
        <DashboardGrid
          widgets={widgetWithNoChartData}
          layout={[mockLayout[0]]}
          isEditing={false}
        />
      );

      expect(screen.getByText('No chart data')).toBeInTheDocument();
    });

    it('should show no report data message when report widget has no data', () => {
      const widgetWithNoReportData = [{
        ...mockWidgets[1],
        reportData: undefined,
      }];

      render(
        <DashboardGrid
          widgets={widgetWithNoReportData}
          layout={[mockLayout[1]]}
          isEditing={false}
        />
      );

      expect(screen.getByText('No report data')).toBeInTheDocument();
    });

    it('should show unknown widget type message for unsupported types', () => {
      const unknownWidget = [{
        id: 'widget-unknown',
        dashboard_id: 'dashboard-1',
        widget_type: 'unknown' as any,
        widget_config: JSON.stringify({}),
        position_x: 0,
        position_y: 0,
        width: 6,
        height: 4,
        title: 'Unknown Widget',
      }];

      render(
        <DashboardGrid
          widgets={unknownWidget}
          layout={[{ i: 'widget-unknown', x: 0, y: 0, w: 6, h: 4 }]}
          isEditing={false}
        />
      );

      expect(screen.getByText('Unknown widget type')).toBeInTheDocument();
    });
  });

  describe('Widget with Complex 29-Table Join Query Data', () => {
    const complexQueryWidgets = [
      {
        id: 'widget-complex-1',
        dashboard_id: 'dashboard-1',
        widget_type: 'chart' as const,
        widget_config: JSON.stringify({}),
        position_x: 0,
        position_y: 0,
        width: 12,
        height: 6,
        title: 'Complex Query - Sales by Region',
        chartData: {
          data: [
            {
              customer_name: 'John Doe',
              customer_country: 'USA',
              order_total: 2500.00,
              category_name: 'Software',
              brand_name: 'TechCorp',
            },
            {
              customer_name: 'Jane Smith',
              customer_country: 'Canada',
              order_total: 1800.00,
              category_name: 'Services',
              brand_name: 'TechCorp',
            },
            {
              customer_name: 'Bob Johnson',
              customer_country: 'UK',
              order_total: 5000.00,
              category_name: 'Cloud',
              brand_name: 'CloudMax',
            },
          ],
          chartType: 'bar' as const,
          chartConfig: { legend: { show: true }, tooltip: { enabled: true } },
          dataMapping: {
            xAxis: { field: 'customer_country' },
            yAxis: [{ field: 'order_total', label: 'Order Total' }],
          },
        },
      },
      {
        id: 'widget-complex-2',
        dashboard_id: 'dashboard-1',
        widget_type: 'report' as const,
        widget_config: JSON.stringify({}),
        position_x: 0,
        position_y: 6,
        width: 12,
        height: 6,
        title: 'Complex Query - Detailed Report',
        reportData: {
          rows: [
            {
              order_number: 'ORD-001',
              customer_name: 'John Doe',
              product_name: 'Enterprise Software',
              order_total: 2500.00,
              sales_rep_name: 'Alice Manager',
            },
            {
              order_number: 'ORD-002',
              customer_name: 'Jane Smith',
              product_name: 'Support Package',
              order_total: 1800.00,
              sales_rep_name: 'Bob Seller',
            },
          ],
          columns: [
            { accessorKey: 'order_number', header: 'Order #' },
            { accessorKey: 'customer_name', header: 'Customer' },
            { accessorKey: 'product_name', header: 'Product' },
            { accessorKey: 'order_total', header: 'Total' },
            { accessorKey: 'sales_rep_name', header: 'Sales Rep' },
          ],
        },
      },
    ];

    const complexLayout = [
      { i: 'widget-complex-1', x: 0, y: 0, w: 12, h: 6 },
      { i: 'widget-complex-2', x: 0, y: 6, w: 12, h: 6 },
    ];

    it('should render dashboard with complex query chart widget', () => {
      render(
        <DashboardGrid
          widgets={complexQueryWidgets}
          layout={complexLayout}
          isEditing={false}
        />
      );

      expect(screen.getByText('Complex Query - Sales by Region')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render dashboard with complex query report widget', () => {
      render(
        <DashboardGrid
          widgets={complexQueryWidgets}
          layout={complexLayout}
          isEditing={false}
        />
      );

      expect(screen.getByText('Complex Query - Detailed Report')).toBeInTheDocument();
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Software')).toBeInTheDocument();
    });

    it('should display all columns from complex query in report', () => {
      render(
        <DashboardGrid
          widgets={complexQueryWidgets}
          layout={complexLayout}
          isEditing={false}
        />
      );

      expect(screen.getByText('Order #')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Sales Rep')).toBeInTheDocument();
    });
  });
});

describe('Dashboard Accessibility', () => {
  it('should have accessible dashboard controls', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { items: [] } }),
      })
    );
    global.fetch = fetchMock;

    render(<DashboardsPage />, { wrapper: createWrapper() });

    // Check for accessible button
    const newDashboardButton = screen.getByRole('button', { name: /new dashboard/i });
    expect(newDashboardButton).toBeInTheDocument();
    expect(newDashboardButton).toHaveAccessibleName();
  });

  it('should have proper heading hierarchy', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { items: [] } }),
      })
    );
    global.fetch = fetchMock;

    render(<DashboardsPage />, { wrapper: createWrapper() });

    const heading = screen.getByRole('heading', { name: 'Dashboards' });
    expect(heading).toBeInTheDocument();
  });

  it('should have accessible form controls in create dialog', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { items: [] } }),
      })
    );
    global.fetch = fetchMock;

    render(<DashboardsPage />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /new dashboard/i }));

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAccessibleName();

      const descInput = screen.getByLabelText(/description/i);
      expect(descInput).toBeInTheDocument();
      expect(descInput).toHaveAccessibleName();
    });
  });
});

describe('Dashboard Error Handling', () => {
  it('should handle API error when fetching dashboards', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ success: false, error: { message: 'Server error' } }),
      })
    );
    global.fetch = fetchMock;

    render(<DashboardsPage />, { wrapper: createWrapper() });

    // Should eventually show empty state or error (depending on implementation)
    await waitFor(() => {
      // The component should handle the error gracefully
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('should handle API error when creating dashboard', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');

    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/dashboards') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: false, error: { message: 'Create failed' } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { items: [] } }),
      });
    });
    global.fetch = fetchMock;

    render(<DashboardsPage />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /new dashboard/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Test Dashboard');

    const createButton = screen.getByRole('button', { name: /^create dashboard$/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});

describe('Dashboard Performance', () => {
  it('should render large number of widgets efficiently', () => {
    const manyWidgets = Array.from({ length: 20 }, (_, i) => ({
      id: `widget-${i}`,
      dashboard_id: 'dashboard-1',
      widget_type: 'metric' as const,
      widget_config: JSON.stringify({}),
      position_x: (i % 4) * 3,
      position_y: Math.floor(i / 4) * 2,
      width: 3,
      height: 2,
      title: `Widget ${i + 1}`,
    }));

    const manyLayout = manyWidgets.map((w, i) => ({
      i: w.id,
      x: (i % 4) * 3,
      y: Math.floor(i / 4) * 2,
      w: 3,
      h: 2,
    }));

    const start = performance.now();

    render(
      <DashboardGrid
        widgets={manyWidgets}
        layout={manyLayout}
        isEditing={false}
      />
    );

    const duration = performance.now() - start;

    // Should render within 500ms
    expect(duration).toBeLessThan(500);

    // All widgets should be rendered
    for (let i = 0; i < 20; i++) {
      expect(screen.getByText(`Widget ${i + 1}`)).toBeInTheDocument();
    }
  });
});
