'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChartRenderer } from '@/components/charts/chart-renderer';
import {
  ArrowLeft,
  Save,
  Eye,
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Plus,
  Trash2,
  Info,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ChartDefinition,
  SavedQuery,
  ChartType,
  ChartConfig,
  DataMapping,
  FilterDefinition,
} from '@/types/database';

const chartTypes: { type: ChartType; icon: React.ReactNode; label: string; description: string; usage: string }[] = [
  {
    type: 'bar',
    icon: <BarChart3 className="h-5 w-5" />,
    label: 'Bar Chart',
    description: 'Compare values across different categories using vertical bars',
    usage: 'Best for: Comparing sales by region, population by country, revenue by product. Requires: 1 category field (X-axis) and 1+ value fields (Y-axis).'
  },
  {
    type: 'line',
    icon: <LineChart className="h-5 w-5" />,
    label: 'Line Chart',
    description: 'Show trends and changes over time with connected data points',
    usage: 'Best for: Stock prices, temperature over time, website traffic. Requires: 1 time/sequence field (X-axis) and 1+ value fields (Y-axis).'
  },
  {
    type: 'area',
    icon: <AreaChart className="h-5 w-5" />,
    label: 'Area Chart',
    description: 'Show volume over time with filled areas under the line',
    usage: 'Best for: Cumulative revenue, website traffic over time, inventory levels. Requires: 1 time/sequence field (X-axis) and 1+ value fields (Y-axis).'
  },
  {
    type: 'pie',
    icon: <PieChart className="h-5 w-5" />,
    label: 'Pie Chart',
    description: 'Show proportions and percentages of a whole',
    usage: 'Best for: Market share, budget allocation, survey results. Requires: 1 category field (X-axis) and 1 numeric value field (Y-axis). Shows data for the first series only.'
  },
  {
    type: 'scatter',
    icon: <ScatterChart className="h-5 w-5" />,
    label: 'Scatter Plot',
    description: 'Show correlation and distribution between two numeric variables',
    usage: 'Best for: Height vs weight, price vs demand, advertising vs sales. Requires: 2 numeric value fields (X and Y axes).'
  },
  {
    type: 'column',
    icon: <BarChart3 className="h-5 w-5" />,
    label: 'Column Chart',
    description: 'Compare values across categories using horizontal bars',
    usage: 'Best for: Long category names, ranking data, comparing performance. Requires: 1 category field (X-axis) and 1+ value fields (Y-axis).'
  },
  {
    type: 'doughnut',
    icon: <PieChart className="h-5 w-5" />,
    label: 'Doughnut Chart',
    description: 'Show proportions with a hollow center, similar to pie chart',
    usage: 'Best for: Showing progress toward goals, metric breakdown with center text. Requires: 1 category field and 1 numeric value. Shows first series only.'
  },
];

export default function ChartEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const chartId = params.id as string;

  // Form state
  const [chartName, setChartName] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedQueryId, setSelectedQueryId] = useState('');
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    title: { show: true, text: '' },
    legend: { show: true, position: 'bottom' },
    tooltip: { enabled: true },
    animation: true,
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  });
  const [dataMapping, setDataMapping] = useState<DataMapping>({
    xAxis: { field: '', label: '' },
    yAxis: [],
    groupBy: '',
    colorBy: '',
  });

  // Preview state
  const [showPreview, setShowPreview] = useState(true);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);

  // Reusable filter selector state
  const [selectedFilterId, setSelectedFilterId] = useState<string>('');
  const [targetColumn, setTargetColumn] = useState<string>('');

  // Fetch chart definition
  const { data: chart, isLoading: _chartLoading } = useQuery<ChartDefinition>({
    queryKey: ['chart', chartId],
    queryFn: async () => {
      const res = await fetch(`/api/charts/${chartId}`);
      const data = await res.json();
      return data.data;
    },
    enabled: !!chartId && chartId !== 'new',
  });

  // Fetch available queries
  const { data: queries, isLoading: _queriesLoading } = useQuery<SavedQuery[]>({
    queryKey: ['queries'],
    queryFn: async () => {
      const res = await fetch('/api/queries');
      const data = await res.json();
      return data.data?.items || [];
    },
  });

  // Fetch available filters
  const { data: availableFilters } = useQuery<FilterDefinition[]>({
    queryKey: ['filters'],
    queryFn: async () => {
      const res = await fetch('/api/filters');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch chart filters (link table)
  const { data: chartFilters, refetch: refetchChartFilters } = useQuery({
    queryKey: ['chart-filters', chartId],
    queryFn: async () => {
      if (chartId === 'new') return [];
      const res = await fetch(`/api/charts/${chartId}/filters`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!chartId && chartId !== 'new',
  });

  // Fetch query results for preview - different logic for new vs existing charts
  const { data: queryResults, isLoading: queryResultsLoading } = useQuery({
    queryKey: ['chart-data', chartId, selectedQueryId],
    queryFn: async () => {
      if (!selectedQueryId) return { rows: [] };

      // For existing charts, use the chart data endpoint
      if (chartId !== 'new') {
        const res = await fetch(`/api/charts/${chartId}/data`);
        const data = await res.json();
        return data.data;
      }

      // For new charts, execute the selected query directly
      const res = await fetch(`/api/queries/${selectedQueryId}/execute`, {
        method: 'POST',
      });
      const data = await res.json();
      return data.data;
    },
    enabled: !!selectedQueryId,
  });

  // Load chart data into form
  useEffect(() => {
    if (chart) {
      setChartName(chart.name || '');
      setChartDescription(chart.description || '');
      setChartType(chart.chart_type || 'bar');
      setSelectedQueryId(chart.saved_query_id || '');

      // Safely parse chart config with defaults
      if (chart.chart_config) {
        try {
          const parsed = JSON.parse(chart.chart_config);
          setChartConfig({
            title: parsed.title || { show: true, text: '' },
            legend: parsed.legend || { show: true, position: 'bottom' },
            tooltip: parsed.tooltip || { enabled: true },
            animation: parsed.animation !== undefined ? parsed.animation : true,
            colors: parsed.colors || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
          });
        } catch {
          // Keep defaults if parsing fails
        }
      }

      // Safely parse data mapping with defaults
      if (chart.data_mapping) {
        try {
          const parsed = JSON.parse(chart.data_mapping);
          setDataMapping({
            xAxis: parsed.xAxis || { field: '', label: '' },
            yAxis: parsed.yAxis || [],
            groupBy: parsed.groupBy || '',
            colorBy: parsed.colorBy || '',
          });
        } catch {
          // Keep defaults if parsing fails
        }
      }
    }
  }, [chart]);

  // Update preview data when query results change
  useEffect(() => {
    if (queryResults?.rows) {
      setPreviewData(queryResults.rows);
    }
  }, [queryResults]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: chartName,
        description: chartDescription,
        chartType: chartType,
        savedQueryId: selectedQueryId || undefined,
        chartConfig: JSON.stringify(chartConfig),
        dataMapping: JSON.stringify(dataMapping),
      };

      const url = chartId === 'new' ? '/api/charts' : `/api/charts/${chartId}`;
      const method = chartId === 'new' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to save chart');
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Chart saved successfully');
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      queryClient.invalidateQueries({ queryKey: ['chart'] });
      if (chartId === 'new') {
        router.push(`/charts/editor/${data.data.id}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add filter to chart
  const addFilterMutation = useMutation({
    mutationFn: async ({ filterId, targetColumn }: { filterId: string; targetColumn: string }) => {
      const res = await fetch(`/api/charts/${chartId}/filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter_id: filterId, target_column: targetColumn }),
      });
      if (!res.ok) throw new Error('Failed to add filter');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Filter added');
      queryClient.invalidateQueries({ queryKey: ['chart-filters', chartId] });
    },
  });

  // Remove filter from chart
  const removeFilterMutation = useMutation({
    mutationFn: async (filterLinkId: string) => {
      const res = await fetch(`/api/charts/${chartId}/filters/${filterLinkId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove filter');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Filter removed');
      queryClient.invalidateQueries({ queryKey: ['chart-filters', chartId] });
    },
  });

  const selectedQuery = queries?.find((q) => q.id === selectedQueryId);
  const availableFields = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  // Add a new Y-axis series
  const addYSeries = () => {
    setDataMapping({
      ...dataMapping,
      yAxis: [
        ...dataMapping.yAxis,
        { field: '', label: '', color: chartConfig.colors[dataMapping.yAxis.length % chartConfig.colors.length] },
      ],
    });
  };

  // Update a Y-axis series
  const updateYSeries = (index: number, updates: Partial<SeriesMapping>) => {
    const newYAxis = [...dataMapping.yAxis];
    newYAxis[index] = { ...newYAxis[index], ...updates };
    setDataMapping({ ...dataMapping, yAxis: newYAxis });
  };

  // Remove a Y-axis series
  const removeYSeries = (index: number) => {
    setDataMapping({
      ...dataMapping,
      yAxis: dataMapping.yAxis.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/charts">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Chart Editor</h1>
              <p className="text-sm text-gray-500">
                {chartId === 'new' ? 'Create a new chart' : 'Edit chart configuration'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Chart'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="chart-name">Chart Name *</Label>
                  <Input
                    id="chart-name"
                    value={chartName}
                    onChange={(e) => setChartName(e.target.value)}
                    placeholder="My Sales Chart"
                  />
                </div>
                <div>
                  <Label htmlFor="chart-description">Description</Label>
                  <Textarea
                    id="chart-description"
                    value={chartDescription}
                    onChange={(e) => setChartDescription(e.target.value)}
                    placeholder="Describe what this chart shows..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Data Source */}
            <Card>
              <CardHeader>
                <CardTitle>Data Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="query-select">Select Query *</Label>
                  <Select value={selectedQueryId} onValueChange={setSelectedQueryId}>
                    <SelectTrigger id="query-select">
                      <SelectValue placeholder="Choose a saved query..." />
                    </SelectTrigger>
                    <SelectContent>
                      {queries?.map((query) => (
                        <SelectItem key={query.id} value={query.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{query.name}</span>
                            <span className="text-xs text-gray-500">{query.description || 'No description'}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedQuery && (
                    <p className="mt-2 text-sm text-gray-500">
                      Using: <span className="font-medium">{selectedQuery.name}</span>
                    </p>
                  )}
                </div>

                {availableFields.length > 0 && (
                  <div className="rounded-md bg-blue-50 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">Available Fields</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {availableFields.map((field) => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reusable Filters */}
            {chartId !== 'new' && (
              <Card>
                <CardHeader>
                  <CardTitle>Reusable Filters</CardTitle>
                  <p className="text-sm text-gray-500">
                    Add pre-configured filters that users can select from dropdowns when viewing the chart.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Filter Form */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="filter-select">Select Filter</Label>
                      <Select value={selectedFilterId} onValueChange={setSelectedFilterId}>
                        <SelectTrigger id="filter-select">
                          <SelectValue placeholder="Choose a filter..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFilters?.filter(f =>
                            !chartFilters?.some((cf: any) => cf.filter_id === f.id)
                          ).map((filter) => (
                            <SelectItem key={filter.id} value={filter.id}>
                              {filter.name}
                              <span className="text-gray-500 text-xs ml-2">
                                ({filter.display_field} → {filter.value_field})
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="target-column">Target Column</Label>
                      <Select value={targetColumn} onValueChange={setTargetColumn}>
                        <SelectTrigger id="target-column">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => {
                        if (selectedFilterId && targetColumn) {
                          addFilterMutation.mutate({
                            filterId: selectedFilterId,
                            targetColumn: targetColumn,
                          });
                          setSelectedFilterId('');
                          setTargetColumn('');
                        }
                      }}
                      disabled={!selectedFilterId || !targetColumn || addFilterMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  {/* Selected Filters List */}
                  {chartFilters && chartFilters.length > 0 && (
                    <div className="space-y-2">
                      <Label>Active Filters</Label>
                      <div className="border rounded-lg divide-y">
                        {chartFilters.map((cf: any) => {
                          const filterDef = availableFilters?.find((f) => f.id === cf.filter_id);
                          if (!filterDef) return null;
                          return (
                            <div key={cf.id} className="flex items-center justify-between p-3">
                              <div className="flex-1">
                                <div className="font-medium">{filterDef.name}</div>
                                <div className="text-sm text-gray-500">
                                  Filter: <code>{filterDef.display_field}</code> → <code>{filterDef.value_field}</code>
                                  {' '}| Target: <code>{cf.target_column}</code>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFilterMutation.mutate(cf.id)}
                                disabled={removeFilterMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {chartFilters?.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No filters added. Add filters above to allow users to filter the chart.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chart Type */}
            <Card>
              <CardHeader>
                <CardTitle>Chart Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chart type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypes.map(({ type, icon, label, description }) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {icon}
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-xs text-gray-500">{description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {chartType && (
                  <div className="space-y-2">
                    <Label htmlFor="chart-usage">How to Use This Chart</Label>
                    <Textarea
                      id="chart-usage"
                      readOnly
                      value={chartTypes.find(ct => ct.type === chartType)?.usage || ''}
                      className="bg-gray-50 min-h-[120px] text-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Axis Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Axis Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* X-Axis */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="x-axis">X-Axis (Categories) *</Label>
                    {dataMapping.xAxis.field && dataMapping.xAxis.field !== '' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() =>
                          setDataMapping({
                            ...dataMapping,
                            xAxis: { field: '', label: '' },
                          })
                        }
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Select
                    value={dataMapping.xAxis.field}
                    onValueChange={(value) => {
                      if (value === '__none__') {
                        setDataMapping({
                          ...dataMapping,
                          xAxis: { field: '', label: '' },
                        });
                      } else {
                        setDataMapping({
                          ...dataMapping,
                          xAxis: { ...dataMapping.xAxis, field: value, label: value },
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="x-axis">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {availableFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {dataMapping.xAxis.field && dataMapping.xAxis.field !== '__none__' && dataMapping.xAxis.field !== '' && (
                    <Input
                      className="mt-2"
                      value={dataMapping.xAxis.label}
                      onChange={(e) =>
                        setDataMapping({
                          ...dataMapping,
                          xAxis: { ...dataMapping.xAxis, label: e.target.value },
                        })
                      }
                      placeholder="Axis label"
                    />
                  )}
                </div>

                {/* Y-Axis Series */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Y-Axis (Values) *</Label>
                    <Button size="sm" variant="outline" onClick={addYSeries}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add Series
                    </Button>
                  </div>
                  {dataMapping.yAxis.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">Add at least one Y-axis series</p>
                  )}
                  {dataMapping.yAxis.map((series, index) => (
                    <div key={index} className="mt-2 space-y-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Series {index + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={() => updateYSeries(index, { field: '', label: '' })}
                          >
                            Clear
                          </Button>
                          {dataMapping.yAxis.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeYSeries(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <Select
                        value={series.field}
                        onValueChange={(value) => {
                          if (value === '__none__') {
                            updateYSeries(index, { field: '', label: '' });
                          } else {
                            updateYSeries(index, { field: value, label: value });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {availableFields.map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={series.label}
                        onChange={(e) => updateYSeries(index, { label: e.target.value })}
                        placeholder="Series label"
                      />
                    </div>
                  ))}
                </div>

                {/* Group By */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="group-by">Group By (Optional)</Label>
                    {dataMapping.groupBy && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => setDataMapping({ ...dataMapping, groupBy: '' })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Select
                    value={dataMapping.groupBy}
                    onValueChange={(value) =>
                      setDataMapping({ ...dataMapping, groupBy: value === '__none__' ? '' : value })
                    }
                  >
                    <SelectTrigger id="group-by">
                      <SelectValue placeholder="Select field to group by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {availableFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color By */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="color-by">Color By (Optional)</Label>
                    {dataMapping.colorBy && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => setDataMapping({ ...dataMapping, colorBy: '' })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <Select
                    value={dataMapping.colorBy}
                    onValueChange={(value) =>
                      setDataMapping({ ...dataMapping, colorBy: value === '__none__' ? '' : value })
                    }
                  >
                    <SelectTrigger id="color-by">
                      <SelectValue placeholder="Select field to color by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {availableFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-title">Show Title</Label>
                  <Switch
                    id="show-title"
                    checked={chartConfig.title.show}
                    onCheckedChange={(checked) =>
                      setChartConfig({ ...chartConfig, title: { ...chartConfig.title, show: checked } })
                    }
                  />
                </div>
                {chartConfig.title.show && (
                  <Input
                    value={chartConfig.title.text}
                    onChange={(e) =>
                      setChartConfig({ ...chartConfig, title: { ...chartConfig.title, text: e.target.value } })
                    }
                    placeholder="Chart title"
                  />
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-legend">Show Legend</Label>
                  <Switch
                    id="show-legend"
                    checked={chartConfig.legend.show}
                    onCheckedChange={(checked) =>
                      setChartConfig({ ...chartConfig, legend: { ...chartConfig.legend, show: checked } })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-tooltip">Enable Tooltip</Label>
                  <Switch
                    id="enable-tooltip"
                    checked={chartConfig.tooltip.enabled}
                    onCheckedChange={(checked) =>
                      setChartConfig({ ...chartConfig, tooltip: { enabled: checked } })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-animation">Animation</Label>
                  <Switch
                    id="enable-animation"
                    checked={chartConfig.animation}
                    onCheckedChange={(checked) =>
                      setChartConfig({ ...chartConfig, animation: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {queryResultsLoading ? (
                    <div className="flex h-96 items-center justify-center">
                      <p className="text-gray-500">Loading preview data...</p>
                    </div>
                  ) : !selectedQueryId ? (
                    <div className="flex h-96 items-center justify-center">
                      <p className="text-gray-500">Select a query to preview your chart</p>
                    </div>
                  ) : !dataMapping.xAxis.field || dataMapping.yAxis.length === 0 ? (
                    <div className="flex h-96 items-center justify-center">
                      <p className="text-gray-500">Configure X and Y axes to see the preview</p>
                    </div>
                  ) : (
                    <ChartRenderer
                      data={previewData}
                      chartType={chartType}
                      chartConfig={chartConfig}
                      dataMapping={dataMapping}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Sample Data */}
              {previewData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            {availableFields.slice(0, 5).map((field) => (
                              <th key={field} className="p-2 text-left font-medium">
                                {field}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b">
                              {availableFields.slice(0, 5).map((field) => (
                                <td key={field} className="p-2">
                                  {String(row[field] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.length > 5 && (
                      <p className="mt-2 text-xs text-gray-500">
                        Showing 5 of {previewData.length} rows
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
