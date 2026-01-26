'use client';

import { useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SQLExecutionResponse, ColumnInfo, QueryPagination } from '@/types/api';

interface QueryResultsProps {
  result: SQLExecutionResponse | null;
  isLoading?: boolean;
  error?: string | null;
  onPageChange?: (offset: number) => void;
}

const ROW_HEIGHT = 40; // Height of each row in pixels
const ESTIMATED_SCROLL_HEIGHT = 600; // Estimated viewport height

export function QueryResults({ result, isLoading, error, onPageChange }: QueryResultsProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    if (!result?.columns) return [];

    return result.columns.map((col: ColumnInfo) => ({
      accessorKey: col.name,
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          {col.name}
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </button>
      ),
      cell: ({ getValue }) => {
        const value = getValue();
        return <CellValue value={value} />;
      },
    }));
  }, [result?.columns]);

  const table = useReactTable({
    data: result?.rows || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rowModel = table.getRowModel();

  // Set up virtual scrolling
  const virtualizer = useVirtualizer({
    count: rowModel.rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Number of rows to render outside viewport
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-muted-foreground">Executing query...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-md bg-destructive/10">
        <div className="font-medium text-destructive mb-1">Query Error</div>
        <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Play className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Run a query to see results</p>
        </div>
      </div>
    );
  }

  const { pagination } = result;
  const currentPage = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 1;
  const hasNextPage = pagination?.hasMore || false;
  const hasPrevPage = pagination ? pagination.offset > 0 : false;

  const handlePreviousPage = () => {
    if (hasPrevPage && pagination) {
      onPageChange?.(Math.max(0, pagination.offset - pagination.limit));
    }
  };

  const handleNextPage = () => {
    if (hasNextPage && pagination) {
      onPageChange?.(pagination.offset + pagination.limit);
    }
  };

  // Calculate total pages
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : Math.ceil((result?.rowCount || 0) / 100);

  return (
    <div className="space-y-2 flex flex-col h-full">
      {/* Performance Metrics Header - Above Column Headers */}
      <div className="bg-muted/50 rounded-lg p-3 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left Side: Row Counts */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm py-1">
              {pagination?.total || result.rowCount} total row{(pagination?.total || result.rowCount) !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="text-sm py-1">
              {rowModel.rows.length} row{rowModel.rows.length !== 1 ? 's' : ''} displayed
            </Badge>
            {pagination?.serverSide && (
              <Badge variant="outline" className="text-xs py-1" title="Data fetched from server in pages">
                Server-Side Pagination
              </Badge>
            )}
          </div>

          {/* Center: Performance Metrics */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Execution Time:</span>
              <span className={result.executionTime > 1000 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}>
                {result.executionTime}ms
              </span>
            </div>
            {pagination?.limit && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Page Size:</span>
                <span className="font-medium">{pagination.limit} rows</span>
              </div>
            )}
          </div>

          {/* Right Side: Pagination Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={!hasPrevPage}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasNextPage}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Warnings/Info */}
        {result.truncated && (
          <div className="mt-2">
            <Badge variant="warning" className="text-xs">Results truncated at limit</Badge>
          </div>
        )}
      </div>

      {/* Virtualized Table */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto rounded-md border"
        style={{
          height: ESTIMATED_SCROLL_HEIGHT,
        }}
      >
        <Table style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap bg-background">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  padding: 0,
                  verticalAlign: 'top',
                }}
              >
                {rowModel.rows.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <TableCell className="text-center text-muted-foreground">
                      No results
                    </TableCell>
                  </div>
                ) : (
                  virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rowModel.rows[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                        }}
                      >
                        <TableRow style={{ border: 'none' }}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className="font-mono text-sm border-b py-2"
                              style={{
                                boxSizing: 'border-box',
                                display: 'table-cell',
                              }}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </div>
                    );
                  })
                )}
              </td>
            </tr>
          </TableBody>
        </Table>
      </div>

      {/* Performance Info for Large Datasets */}
      {rowModel.rows.length > 100 && (
        <div className="text-xs text-muted-foreground flex-shrink-0">
          💡 Virtual scrolling enabled for {rowModel.rows.length} rows. Only visible rows are rendered for optimal performance.
        </div>
      )}
    </div>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-muted-foreground italic">NULL</span>;
  }

  if (value === undefined) {
    return <span className="text-muted-foreground italic">undefined</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <Badge variant={value ? 'success' : 'secondary'}>
        {value.toString()}
      </Badge>
    );
  }

  if (typeof value === 'object') {
    return (
      <span className="text-xs">{JSON.stringify(value)}</span>
    );
  }

  const stringValue = String(value);
  if (stringValue.length > 100) {
    return (
      <span title={stringValue}>{stringValue.substring(0, 100)}...</span>
    );
  }

  return <span>{stringValue}</span>;
}
