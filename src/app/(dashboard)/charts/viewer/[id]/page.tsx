'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ChartRenderer } from '@/components/charts/chart-renderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { RefreshCw, Settings, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { ChartDefinition, ChartConfig, DataMapping } from '@/types/database';

export default function ChartViewerPage() {
  const params = useParams();
  const chartId = params.id as string;

  const { data: chart, isLoading: isLoadingChart } = useQuery<ChartDefinition>({
    queryKey: ['chart', chartId],
    queryFn: async () => {
      const res = await fetch(`/api/charts/${chartId}`);
      const data = await res.json();
      return data.data;
    },
  });

  const { data: chartData, isLoading: isLoadingData, refetch } = useQuery({
    queryKey: ['chart-data', chartId],
    queryFn: async () => {
      const res = await fetch(`/api/charts/${chartId}/data`);
      const data = await res.json();
      return data.data;
    },
    enabled: !!chartId,
    refetchInterval: chart?.refresh_interval ? chart.refresh_interval * 1000 : undefined,
  });

  const handleExport = async (format: 'png' | 'svg') => {
    toast.info('Export feature coming soon');
  };

  if (isLoadingChart) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (!chart) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chart not found</div>
      </div>
    );
  }

  let chartConfig: ChartConfig = {};
  let dataMapping: DataMapping = { xAxis: { field: '' }, yAxis: [] };

  try {
    chartConfig = JSON.parse(chart.chart_config);
    dataMapping = JSON.parse(chart.data_mapping);
  } catch {
    // Use defaults
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Charts', href: '/charts' },
          { label: chart.name },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{chart.name}</h1>
          {chart.description && (
            <p className="text-muted-foreground">{chart.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/charts/editor/${chartId}`}>
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{chartConfig.title?.text || chart.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-muted-foreground">Loading data...</div>
            </div>
          ) : (
            <ChartRenderer
              data={chartData?.data || []}
              chartType={chart.chart_type}
              chartConfig={chartConfig}
              dataMapping={dataMapping}
              height={400}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
