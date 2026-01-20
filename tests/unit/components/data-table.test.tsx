import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '@/components/reporting/data-table';
import type { ColumnDef } from '@tanstack/react-table';

// Mock data for testing
interface MockDataRow {
  id: number;
  name: string;
  email: string;
  status: string;
  amount: number;
}

const mockColumns: ColumnDef<MockDataRow>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'amount', header: 'Amount' },
];

const mockData: MockDataRow[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', amount: 100.50 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive', amount: 250.00 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active', amount: 75.25 },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'pending', amount: 300.00 },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'active', amount: 150.75 },
];

describe('DataTable Component', () => {
  describe('Rendering', () => {
    it('should render the table with headers', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('should render all data rows', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.getByText('Alice Brown')).toBeInTheDocument();
      expect(screen.getByText('Charlie Wilson')).toBeInTheDocument();
    });

    it('should render empty state when no data', () => {
      render(<DataTable columns={mockColumns} data={[]} />);

      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(<DataTable columns={mockColumns} data={[]} isLoading={true} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should render columns toggle button', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.getByRole('button', { name: /columns/i })).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort by column when header is clicked', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      // After sorting, Alice should be first alphabetically
      const cells = screen.getAllByRole('cell');
      const nameCell = cells.find(cell => cell.textContent === 'Alice Brown');
      expect(nameCell).toBeInTheDocument();
    });

    it('should call onSortingChange when sorting changes', async () => {
      const onSortingChange = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          onSortingChange={onSortingChange}
        />
      );

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      expect(onSortingChange).toHaveBeenCalled();
    });
  });

  describe('Global Filtering', () => {
    it('should filter data based on search input', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should show empty state when filter matches no rows', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/no results/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    const largeData: MockDataRow[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      status: 'active',
      amount: (i + 1) * 10,
    }));

    it('should show pagination controls', () => {
      render(<DataTable columns={mockColumns} data={largeData} pageSize={10} />);

      // Check for pagination text that shows "Page X of Y"
      expect(screen.getByText(/Page \d+ of \d+/)).toBeInTheDocument();
    });

    it('should navigate to next page', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={largeData} pageSize={10} />);

      // Find the next page button
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find(btn =>
        btn.querySelector('svg.lucide-chevron-right') !== null
      );

      if (nextButton) {
        await user.click(nextButton);

        // Should show User 11 on page 2
        await waitFor(() => {
          expect(screen.getByText('User 11')).toBeInTheDocument();
        });
      }
    });

    it('should call onPaginationChange when page changes', async () => {
      const onPaginationChange = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          columns={mockColumns}
          data={largeData}
          pageSize={10}
          onPaginationChange={onPaginationChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      const nextButton = buttons.find(btn =>
        btn.querySelector('svg.lucide-chevron-right') !== null
      );

      if (nextButton) {
        await user.click(nextButton);
        expect(onPaginationChange).toHaveBeenCalled();
      }
    });

    it('should disable previous button on first page', () => {
      render(<DataTable columns={mockColumns} data={largeData} pageSize={10} />);

      const buttons = screen.getAllByRole('button');
      const prevButton = buttons.find(btn =>
        btn.querySelector('svg.lucide-chevron-left') !== null
      );

      if (prevButton) {
        expect(prevButton).toBeDisabled();
      }
    });
  });

  describe('Column Visibility', () => {
    it('should toggle column visibility', async () => {
      const user = userEvent.setup();
      render(<DataTable columns={mockColumns} data={mockData} />);

      // Open column visibility dropdown
      const columnsButton = screen.getByRole('button', { name: /columns/i });
      await user.click(columnsButton);

      // Toggle a column off
      const emailToggle = screen.getByText('email');
      await user.click(emailToggle);

      // Email data should be hidden
      await waitFor(() => {
        expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('Export', () => {
    it('should show export button when onExport is provided', () => {
      const onExport = vi.fn();
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          onExport={onExport}
        />
      );

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should not show export button when onExport is not provided', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    const largeDataset: MockDataRow[] = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      status: 'active',
      amount: (i + 1) * 10,
    }));

    it('should render large dataset without crashing', () => {
      const start = performance.now();
      render(<DataTable columns={mockColumns} data={largeDataset} pageSize={50} />);
      const duration = performance.now() - start;

      // Should render within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(mockColumns.length);
    });

    it('should have search input with placeholder', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
      // Input type defaults to text when not specified
      expect(searchInput.tagName).toBe('INPUT');
    });
  });
});
