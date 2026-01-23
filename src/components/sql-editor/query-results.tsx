'use client';

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
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

export function QueryResults({ result, isLoading, error, onPageChange }: QueryResultsProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

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

  return (
    <div className="space-y-2 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="secondary">
            {result.rowCount} row{result.rowCount !== 1 ? 's' : ''}
          </Badge>
          <span className="text-muted-foreground">
            Execution time: {result.executionTime}ms
          </span>
          {result.truncated && (
            <Badge variant="warning">Results truncated</Badge>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage}
            </span>
            <div className="flex items-center gap-1">
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
        )}
      </div>

      <div className="flex-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
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
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground"
                >
                  No results
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="font-mono text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
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
