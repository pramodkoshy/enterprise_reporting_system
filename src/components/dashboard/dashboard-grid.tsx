'use client';

import { useState, useCallback } from 'react';
import GridLayout, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartRenderer } from '@/components/charts/chart-renderer';
import { DataTable } from '@/components/reporting/data-table';
import { X, Move, Maximize2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidget, WidgetType, ChartConfig, DataMapping, ChartType } from '@/types/database';

const ResponsiveGridLayout = WidthProvider(GridLayout);

interface DashboardGridProps {
  widgets: (DashboardWidget & {
    reportData?: { rows: Record<string, unknown>[]; columns: { accessorKey: string; header: string }[] };
    chartData?: { data: Record<string, unknown>[]; chartType: ChartType; chartConfig: ChartConfig; dataMapping: DataMapping };
    title?: string;
  })[];
  layout: Layout[];
  isEditing?: boolean;
  onLayoutChange?: (layout: Layout[]) => void;
  onRemoveWidget?: (widgetId: string) => void;
  onConfigureWidget?: (widgetId: string) => void;
}

export function DashboardGrid({
  widgets,
  layout,
  isEditing = false,
  onLayoutChange,
  onRemoveWidget,
  onConfigureWidget,
}: DashboardGridProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      onLayoutChange?.(newLayout);
    },
    [onLayoutChange]
  );

  const renderWidgetContent = (widget: DashboardGridProps['widgets'][0]) => {
    switch (widget.widget_type) {
      case 'chart':
        if (!widget.chartData) {
          return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No chart data
            </div>
          );
        }
        return (
          <ChartRenderer
            data={widget.chartData.data}
            chartType={widget.chartData.chartType}
            chartConfig={widget.chartData.chartConfig}
            dataMapping={widget.chartData.dataMapping}
            height={200}
          />
        );

      case 'report':
        if (!widget.reportData) {
          return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No report data
            </div>
          );
        }
        return (
          <div className="overflow-auto h-full">
            <DataTable
              data={widget.reportData.rows}
              columns={widget.reportData.columns.map((col) => ({
                accessorKey: col.accessorKey,
                header: col.header,
              }))}
              pageSize={5}
            />
          </div>
        );

      case 'metric':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl font-bold">--</div>
              <div className="text-muted-foreground">Metric</div>
            </div>
          </div>
        );

      case 'text':
        const config = widget.widget_config ? JSON.parse(widget.widget_config) : {};
        return (
          <div className="p-4">
            <p className="text-muted-foreground">{config.content || 'Text widget'}</p>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Unknown widget type
          </div>
        );
    }
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={100}
      containerPadding={[0, 0]}
      margin={[16, 16]}
      isDraggable={isEditing}
      isResizable={isEditing}
      onLayoutChange={handleLayoutChange}
      onDragStart={() => setIsDragging(true)}
      onDragStop={() => setIsDragging(false)}
      draggableHandle=".drag-handle"
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="widget-container">
          <Card
            className={cn(
              'h-full overflow-hidden',
              isDragging && 'cursor-grabbing',
              isEditing && 'border-dashed border-2'
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-0">
              <CardTitle className="text-sm font-medium truncate">
                {widget.title || widget.widget_type}
              </CardTitle>
              {isEditing && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 drag-handle cursor-grab"
                  >
                    <Move className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onConfigureWidget?.(widget.id)}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => onRemoveWidget?.(widget.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-3 h-[calc(100%-40px)]">
              {renderWidgetContent(widget)}
            </CardContent>
          </Card>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
