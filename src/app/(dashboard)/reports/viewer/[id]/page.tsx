'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { DataTable } from '@/components/reporting/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Download, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReportDefinition, ColumnDefinition } from '@/types/database';

export default function ReportViewerPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data: report, isLoading: isLoadingReport } = useQuery<ReportDefinition>({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}`);
      const data = await res.json();
      return data.data;
    },
  });

  const { data: reportData, isLoading: isLoadingData, refetch } = useQuery({
    queryKey: ['report-data', reportId, page, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/data?page=${page}&pageSize=${pageSize}`);
      const data = await res.json();
      return data.data;
    },
    enabled: !!reportId,
  });

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    if (!report?.column_config) return [];

    try {
      const columnConfig: ColumnDefinition[] = JSON.parse(report.column_config);
      return columnConfig
        .filter((col) => col.visible)
        .map((col) => ({
          accessorKey: col.field,
          header: col.header,
          cell: ({ getValue }) => {
            const value = getValue();
            if (value === null || value === undefined) {
              return <span className="text-muted-foreground">-</span>;
            }
            return String(value);
          },
        }));
    } catch {
      return [];
    }
  }, [report?.column_config]);

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const res = await fetch(`/api/reports/${reportId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report?.name || 'report'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  if (isLoadingReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Report not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Reports', href: '/reports' },
          { label: report.name },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{report.name}</h1>
          {report.description && (
            <p className="text-muted-foreground">{report.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/reports/editor/${reportId}`}>
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            data={reportData?.rows || []}
            columns={columns}
            isLoading={isLoadingData}
            totalRows={reportData?.meta?.total}
            pageSize={pageSize}
            onExport={handleExport}
            serverSide
            onPaginationChange={(pagination) => {
              setPage(pagination.pageIndex);
              setPageSize(pagination.pageSize);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
