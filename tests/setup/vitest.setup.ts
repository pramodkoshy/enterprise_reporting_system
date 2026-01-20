import '@testing-library/jest-dom/vitest';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock environment variables
process.env.DATABASE_PATH = './data/test.sqlite';
process.env.AUTH_SECRET = 'test-auth-secret-for-testing-only-32chars';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-hex';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NODE_ENV = 'test';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ onChange, value }: { onChange?: (value: string) => void; value?: string }) => {
    return {
      type: 'div',
      props: {
        'data-testid': 'mock-monaco-editor',
        children: value,
        onChange: (e: { target: { value: string } }) => onChange?.(e.target.value),
      },
    };
  },
  loader: {
    init: vi.fn(),
  },
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  BarChart: () => null,
  Bar: () => null,
  LineChart: () => null,
  Line: () => null,
  AreaChart: () => null,
  Area: () => null,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ScatterChart: () => null,
  Scatter: () => null,
  ComposedChart: () => null,
}));

// Mock react-grid-layout
vi.mock('react-grid-layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
  WidthProvider: (Component: React.ComponentType) => Component,
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Performance tracking for tests
const performanceMarks: Map<string, number> = new Map();

export function startPerformanceMark(name: string) {
  performanceMarks.set(name, performance.now());
}

export function endPerformanceMark(name: string): number {
  const start = performanceMarks.get(name);
  if (!start) {
    throw new Error(`Performance mark "${name}" not found`);
  }
  const duration = performance.now() - start;
  performanceMarks.delete(name);
  return duration;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
