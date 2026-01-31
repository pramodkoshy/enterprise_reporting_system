'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { AddWidgetDialog } from '@/components/dashboard/add-widget-dialog';
import { ConfigureWidgetDialog } from '@/components/dashboard/configure-widget-dialog';
import {
  ArrowLeft,
  Edit,
  Eye,
  Save,
  Plus,
  Globe,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardLayout, DashboardWidget } from '@/types/database';
import type { Layout } from 'react-grid-layout';

interface WidgetWithData extends DashboardWidget {
  title?: string;
}

export default function DashboardViewerPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const dashboardId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [addWidgetDialogOpen, setAddWidgetDialogOpen] = useState(false);
  const [configureWidgetDialogOpen, setConfigureWidgetDialogOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<(DashboardWidget & { dashboard_id: string }) | null>(null);
  const [layout, setLayout] = useState<Layout[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch dashboard
  const { data: dashboard, isLoading: isLoadingDashboard } = useQuery<DashboardLayout>({
    queryKey: ['dashboard', dashboardId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboards/${dashboardId}`);
      const data = await res.json();
      return data.data;
    },
  });

  // Fetch widgets
  const { data: widgets = [], isLoading: isLoadingWidgets } = useQuery<DashboardWidget[]>({
    queryKey: ['dashboard-widgets', dashboardId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboards/${dashboardId}/widgets`);
      const data = await res.json();
      return data.data.items || [];
    },
  });

  // Mutation to add widget
  const addWidgetMutation = useMutation({
    mutationFn: async (widgetData: {
      widgetType: string;
      reportId?: string;
      chartId?: string;
      positionConfig: { x: number; y: number; w: number; h: number; minW: number; minH: number };
      widgetConfig?: { title?: string; content?: string };
    }) => {
      const res = await fetch(`/api/dashboards/${dashboardId}/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(widgetData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to add widget');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
      toast.success('Widget added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add widget');
    },
  });

  // Initialize layout from dashboard or widgets
  useEffect(() => {
    if (dashboard?.layout_config) {
      try {
        const layoutConfig = JSON.parse(dashboard.layout_config);
        if (layoutConfig.layouts?.lg) {
          setLayout(layoutConfig.layouts.lg);
        }
      } catch (error) {
        console.error('Error parsing layout config:', error);
      }
    } else if (widgets.length > 0) {
      // Build layout from widgets' position_config
      const builtLayout = widgets.map((widget) => {
        try {
          const position = JSON.parse(widget.position_config);
          return {
            i: widget.id,
            x: position.x || 0,
            y: position.y || 0,
            w: position.w || 4,
            h: position.h || 4,
            minW: position.minW || 2,
            minH: position.minH || 2,
          };
        } catch {
          return { i: widget.id, x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 2 };
        }
      });
      setLayout(builtLayout);
    }
  }, [dashboard, widgets]);

  // Fetch data for each widget - use parallel queries for better performance
  const widgetsWithData = useMemo(() => {
    return widgets.map((widget: DashboardWidget): WidgetWithData => {
      // Extract title from widget config if available
      let title: string | undefined;
      try {
        const config = widget.widget_config ? JSON.parse(widget.widget_config) : {};
        title = config.title;
      } catch {
        // ignore
      }

      return { ...widget, title };
    });
  }, [widgets]);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
    setHasChanges(true);
  }, []);

  const handleSaveLayout = async () => {
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutConfig: {
            cols: { lg: 12, md: 10, sm: 6, xs: 4 },
            rowHeight: 100,
            containerPadding: [10, 10],
            margin: [10, 10],
            layouts: { lg: layout },
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to save layout');

      toast.success('Layout saved successfully');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) {
      toast.error('Failed to save layout');
    }
  };

  const handleRemoveWidget = async (widgetId: string) => {
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove widget');

      toast.success('Widget removed successfully');
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    } catch (error) {
      toast.error('Failed to remove widget');
    }
  };

  const handleAddWidget = async (widgetData: {
    widgetType: string;
    reportId?: string;
    chartId?: string;
    positionConfig: { x: number; y: number; w: number; h: number; minW: number; minH: number };
    widgetConfig?: { title?: string; content?: string };
  }) => {
    // Auto-calculate Y position based on existing widgets
    const maxY = layout.length > 0 ? Math.max(...layout.map((l) => l.y + l.h)) : 0;
    const newPosition = {
      ...widgetData.positionConfig,
      y: maxY,
    };

    await addWidgetMutation.mutateAsync({
      ...widgetData,
      positionConfig: newPosition,
    });
  };

  if (isLoadingDashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Dashboard not found</p>
          <Link href="/dashboards">
            <Button>Back to Dashboards</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboards">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{dashboard.name}</h1>
              {dashboard.is_public ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Public
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Private
                </Badge>
              )}
            </div>
            {dashboard.description && (
              <p className="text-sm text-muted-foreground">{dashboard.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'dashboard-widgets'] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {!isEditing ? (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Layout
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={() => setAddWidgetDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              {hasChanges && (
                <Button size="sm" onClick={handleSaveLayout}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Layout
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {widgetsWithData.length === 0 && !isLoadingWidgets ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">No widgets added yet</p>
              <Button onClick={() => setAddWidgetDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Widget
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Dashboard Grid */
        <DashboardGrid
          widgets={widgetsWithData}
          layout={layout}
          isEditing={isEditing}
          onLayoutChange={handleLayoutChange}
          onRemoveWidget={handleRemoveWidget}
          onConfigureWidget={(widgetId) => {
            const widget = widgets.find((w) => w.id === widgetId);
            if (widget) {
              setSelectedWidget({ ...widget, dashboard_id: dashboardId });
              setConfigureWidgetDialogOpen(true);
            }
          }}
        />
      )}

      {/* Widget loading skeletons */}
      {isLoadingWidgets && widgetsWithData.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Widget Dialog */}
      <AddWidgetDialog
        open={addWidgetDialogOpen}
        onOpenChange={setAddWidgetDialogOpen}
        onAddWidget={handleAddWidget}
      />

      {/* Configure Widget Dialog */}
      <ConfigureWidgetDialog
        open={configureWidgetDialogOpen}
        onOpenChange={setConfigureWidgetDialogOpen}
        widget={selectedWidget}
      />
    </div>
  );
}
