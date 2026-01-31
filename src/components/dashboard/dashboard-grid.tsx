'use client';

import { useState, useCallback } from 'react';
import GridLayout, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WidgetCard } from '@/components/dashboard/widget-card';
import { X, Move, Settings, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/database';

const ResponsiveGridLayout = WidthProvider(GridLayout);

interface DashboardGridProps {
  widgets: (DashboardWidget & {
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
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      onLayoutChange?.(newLayout);
    },
    [onLayoutChange]
  );

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
      onResizeStart={() => setIsDragging(true)}
      onResizeStop={() => setIsDragging(false)}
      draggableHandle=".drag-handle"
      resizeHandles={isEditing ? ['s', 'e', 'se', 'sw', 'n', 'ne', 'nw', 'w'] : []}
      useCSSTransforms
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className="widget-container relative"
          onMouseEnter={() => setHoveredWidget(widget.id)}
          onMouseLeave={() => setHoveredWidget(null)}
        >
          <Card
            className={cn(
              'h-full overflow-hidden transition-shadow',
              isDragging && 'cursor-grabbing shadow-lg',
              isEditing && 'ring-2 ring-primary ring-offset-2',
              hoveredWidget === widget.id && !isEditing && 'shadow-md'
            )}
          >
            {/* Widget Header with Actions */}
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                {widget.title || widget.widget_type}
              </CardTitle>

              {/* Action Buttons - Always visible on hover, visible in edit mode */}
              <div
                className={cn(
                  'flex items-center gap-1 transition-opacity',
                  (isEditing || hoveredWidget === widget.id) ? 'opacity-100' : 'opacity-0',
                  'group/widget'
                )}
              >
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 drag-handle cursor-grab hover:bg-accent"
                    title="Drag to move"
                  >
                    <Move className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-accent"
                  title="Configure widget"
                  onClick={() => onConfigureWidget?.(widget.id)}
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete widget"
                  onClick={() => onRemoveWidget?.(widget.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>

            {/* Widget Content */}
            <CardContent className="p-3 h-[calc(100%-45px)] overflow-hidden">
              <WidgetCard widget={widget} />
            </CardContent>
          </Card>

          {/* Resize Handle Indicator (only in edit mode) */}
          {isEditing && (
            <div className="absolute bottom-1 right-1 w-3 h-3 border-2 border-primary rounded-sm opacity-50 pointer-events-none" />
          )}
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
