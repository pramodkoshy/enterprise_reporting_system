'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartRenderer } from '@/components/charts/chart-renderer';
import { DataTable } from '@/components/reporting/data-table';
import type { DashboardWidget, ChartType, ChartConfig, DataMapping } from '@/types/database';

interface WidgetCardProps {
  widget: DashboardWidget;
}

export function WidgetCard({ widget }: WidgetCardProps) {
  // Fetch chart data if this is a chart widget
  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ['chart-data-for-widget', widget.chart_id],
    queryFn: async () => {
      if (!widget.chart_id) return null;
      const res = await fetch(`/api/charts/${widget.chart_id}/data`);
      const data = await res.json();
      return data.data;
    },
    enabled: widget.widget_type === 'chart' && !!widget.chart_id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch chart definition if this is a chart widget
  const { data: chartDef } = useQuery({
    queryKey: ['chart', widget.chart_id],
    queryFn: async () => {
      if (!widget.chart_id) return null;
      const res = await fetch(`/api/charts/${widget.chart_id}`);
      const data = await res.json();
      return data.data;
    },
    enabled: widget.widget_type === 'chart' && !!widget.chart_id,
    staleTime: 300000, // Cache for 5 minutes
  });

  // Fetch report data if this is a report widget
  const { data: reportData, isLoading: isLoadingReport } = useQuery({
    queryKey: ['report-data-for-widget', widget.report_id],
    queryFn: async () => {
      if (!widget.report_id) return null;
      const res = await fetch(`/api/reports/${widget.report_id}/data?pageSize=100`);
      const data = await res.json();
      return data.data;
    },
    enabled: widget.widget_type === 'report' && !!widget.report_id,
    staleTime: 30000, // Cache for 30 seconds
  });

  const isLoading = widget.widget_type === 'chart' ? isLoadingChart : isLoadingReport;

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="space-y-3 w-full px-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Render widget content based on type
  switch (widget.widget_type) {
    case 'chart':
      if (!chartData || !chartDef) {
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No chart data available
          </div>
        );
      }
      try {
        const chartConfig: ChartConfig = chartDef.chart_config
          ? JSON.parse(chartDef.chart_config)
          : undefined;
        const dataMapping: DataMapping = chartDef.data_mapping
          ? JSON.parse(chartDef.data_mapping)
          : undefined;

        return (
          <ChartRenderer
            data={chartData.rows || []}
            chartType={chartDef.chart_type as ChartType}
            chartConfig={chartConfig}
            dataMapping={dataMapping}
            height={250}
          />
        );
      } catch (error) {
        console.error('Error rendering chart:', error);
        return (
          <div className="flex items-center justify-center h-full text-destructive text-sm">
            Error rendering chart
          </div>
        );
      }

    case 'report':
      if (!reportData) {
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No report data available
          </div>
        );
      }
      try {
        const reportColumns = reportData.columns || [];

        return (
          <div className="overflow-auto h-full">
            <DataTable
              data={reportData.rows || []}
              columns={reportColumns.map((col: any) => ({
                accessorKey: col.field || col.accessorKey,
                header: col.header || col.field,
                cell: ({ getValue }) => {
                  const value = getValue();
                  if (value === null || value === undefined) {
                    return <span className="text-muted-foreground">-</span>;
                  }
                  return String(value);
                },
              }))}
              pageSize={10}
            />
          </div>
        );
      } catch (error) {
        console.error('Error rendering report:', error);
        return (
          <div className="flex items-center justify-center h-full text-destructive text-sm">
            Error rendering report
          </div>
        );
      }

    case 'metric':
      const config = widget.widget_config ? JSON.parse(widget.widget_config) : {};
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl font-bold">{config.value || '--'}</div>
            <div className="text-muted-foreground">{config.label || 'Metric'}</div>
          </div>
        </div>
      );

    case 'text':
      const textConfig = widget.widget_config ? JSON.parse(widget.widget_config) : {};
      return (
        <div className="p-2 h-full overflow-auto">
          <p className="text-sm text-muted-foreground">{textConfig.content || 'Text widget'}</p>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Unknown widget type: {widget.widget_type}
        </div>
      );
  }
}
