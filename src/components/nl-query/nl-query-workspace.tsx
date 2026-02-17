'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  RefreshCw,
  Loader2,
  Table as TableIcon,
  BarChart3,
  History,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { NlResultsTable } from './nl-results-table';
import { NlResultsChart } from './nl-results-chart';
import type {
  NlQueryPipelineResult,
  AccessCheckDetail,
  DataSourceListItem,
  SchemaOverviewResponse,
  SchemaTableSummary,
  QueryHistoryEntry,
  NlChartConfig,
  SchemaColumnSummary,
} from '@/types/database';

export function NlQueryWorkspace() {
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>('');
  const [queryResult, setQueryResult] = useState<NlQueryPipelineResult | null>(null);
  const [chartConfig, setChartConfig] = useState<NlChartConfig | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('results');

  // Fetch active data sources
  const { data: dataSources = [] } = useQuery<DataSourceListItem[]>({
    queryKey: ['active-data-sources'],
    queryFn: async () => {
      const res = await fetch('/api/data-sources/active');
      const json = await res.json();
      return json.data || [];
    },
  });

  // Fetch schema when data source is selected
  const { data: schemaInfo, isLoading: schemaLoading, refetch: refetchSchema } = useQuery<SchemaOverviewResponse>({
    queryKey: ['nl-schema', selectedDataSourceId],
    queryFn: async () => {
      const res = await fetch('/api/nl-query/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_source_id: selectedDataSourceId }),
      });
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedDataSourceId,
  });

  // Fetch query history
  const { data: queryHistory = [] } = useQuery<QueryHistoryEntry[]>({
    queryKey: ['nl-query-history', selectedDataSourceId],
    queryFn: async () => {
      const url = selectedDataSourceId
        ? `/api/nl-query/history?data_source_id=${selectedDataSourceId}&limit=20`
        : '/api/nl-query/history?limit=20';
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    },
  });

  // Expose state to CopilotKit
  useCopilotReadable({
    description: 'Currently selected data source and its schema information for natural language SQL queries',
    value: {
      selectedDataSourceId,
      selectedDataSourceName: dataSources.find((ds: DataSourceListItem) => ds.id === selectedDataSourceId)?.name,
      schemaInfo: schemaInfo ? {
        tableCount: schemaInfo.tableCount,
        viewCount: schemaInfo.viewCount,
        tables: schemaInfo.tables?.map((t: SchemaTableSummary) => ({
          name: t.name,
          columns: t.columns?.map((c: SchemaColumnSummary) => `${c.name} (${c.type})`).join(', '),
        })),
      } : null,
      lastQueryResult: queryResult ? {
        accessGranted: queryResult.accessGranted,
        rowCount: queryResult.queryResults?.totalRows,
        error: queryResult.error,
      } : null,
    },
  });

  // CopilotKit action: Execute NL query
  useCopilotAction({
    name: 'executeNaturalLanguageQuery',
    description: 'Execute a natural language query against the selected data source. Generates SQL, checks RBAC permissions, and returns results. Use this when the user asks about data, wants reports, or asks questions about the database.',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The natural language query to execute (e.g., "Show me top 10 customers by revenue")',
        required: true,
      },
      {
        name: 'generatedSql',
        type: 'string',
        description: 'The SQL query generated from the natural language query. Generate valid SQL based on the schema information available in the context.',
        required: true,
      },
    ],
    render: ({ status, args, result }) => {
      if (status !== 'complete') {
        return (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Executing query: &quot;{args.query}&quot;...</span>
          </div>
        );
      }

      const typedResult = result as NlQueryPipelineResult | { error: string } | undefined;
      if (typedResult && 'error' in typedResult && typedResult.error) {
        return (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">{typedResult.error}</span>
          </div>
        );
      }

      const pipelineResult = typedResult as NlQueryPipelineResult | undefined;
      return (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm">
            Query returned {pipelineResult?.queryResults?.totalRows || 0} rows in{' '}
            {pipelineResult?.queryResults?.executionTimeMs || 0}ms. View results in the table below.
          </span>
        </div>
      );
    },
    handler: async ({ query, generatedSql }) => {
      if (!selectedDataSourceId) {
        toast.error('Please select a data source first');
        return { error: 'No data source selected' };
      }

      setIsExecuting(true);
      try {
        const res = await fetch('/api/nl-query/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            data_source_id: selectedDataSourceId,
            generated_sql: generatedSql,
          }),
        });

        const json = await res.json();

        if (!json.success) {
          const errorMsg = json.error?.message || 'Query execution failed';
          setQueryResult(null);
          return { error: errorMsg };
        }

        setQueryResult(json.data as NlQueryPipelineResult);
        setActiveTab('results');
        return json.data as NlQueryPipelineResult;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        return { error: errorMsg };
      } finally {
        setIsExecuting(false);
      }
    },
  });

  // CopilotKit action: Generate chart
  useCopilotAction({
    name: 'generateChart',
    description: 'Generate a chart visualization from the current query results. Use this when the user asks for a chart, graph, trend, or visualization of the data.',
    parameters: [
      {
        name: 'chartType',
        type: 'string',
        description: 'The type of chart to generate: bar, line, area, pie, or scatter',
        required: true,
      },
      {
        name: 'title',
        type: 'string',
        description: 'The chart title',
        required: true,
      },
      {
        name: 'xAxisField',
        type: 'string',
        description: 'The column to use for the X axis',
        required: true,
      },
      {
        name: 'yAxisFields',
        type: 'string',
        description: 'Comma-separated column names to use for the Y axis (e.g., "revenue,count")',
        required: true,
      },
    ],
    render: ({ status }) => {
      if (status !== 'complete') {
        return (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Generating chart...</span>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <span className="text-sm">Chart generated. View it in the Chart tab.</span>
        </div>
      );
    },
    handler: async ({ chartType, title, xAxisField, yAxisFields }) => {
      if (!queryResult?.queryResults) {
        return { error: 'No query results available. Run a query first.' };
      }

      const yFields = yAxisFields.split(',').map((f: string) => f.trim());

      const config: NlChartConfig = {
        chartType: chartType as NlChartConfig['chartType'],
        title,
        xAxis: { field: xAxisField, label: xAxisField },
        yAxis: yFields.map((f: string) => ({ field: f, label: f })),
        colors: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#a4de6c'],
      };

      setChartConfig(config);
      setActiveTab('chart');
      return { success: true, config };
    },
  });

  // CopilotKit action: Refresh schema
  useCopilotAction({
    name: 'refreshSchema',
    description: 'Refresh the database schema cache. Use this when the user mentions schema changes or wants updated schema information.',
    parameters: [],
    handler: async () => {
      if (!selectedDataSourceId) {
        return { error: 'No data source selected' };
      }

      const res = await fetch('/api/nl-query/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_source_id: selectedDataSourceId, refresh: true }),
      });

      const json = await res.json();
      await refetchSchema();
      toast.success('Schema refreshed');
      return json.data as SchemaOverviewResponse;
    },
  });

  const handleRefreshSchema = async () => {
    if (!selectedDataSourceId) return;
    try {
      await fetch('/api/nl-query/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_source_id: selectedDataSourceId, refresh: true }),
      });
      await refetchSchema();
      toast.success('Schema cache refreshed');
    } catch {
      toast.error('Failed to refresh schema');
    }
  };

  const selectedDs = dataSources.find((ds: DataSourceListItem) => ds.id === selectedDataSourceId);

  return (
    <CopilotSidebar
      instructions={`You are an expert SQL analyst assistant for the Enterprise Reporting System.
Help users query their databases using natural language.

IMPORTANT RULES:
1. When a user asks a question about data, use the executeNaturalLanguageQuery action.
2. Generate valid SQL based on the schema information in the context.
3. If the user asks for a chart or visualization, first execute the query, then use generateChart.
4. Always explain what you're doing and what the results mean.
5. If access is denied, explain which entities the user lacks permission for.
6. For trend analysis, use appropriate date grouping (daily, weekly, monthly).
7. Always use proper JOINs when combining tables.

The currently selected data source is: ${selectedDs?.name || 'None selected'}.
${schemaInfo ? `It has ${schemaInfo.tableCount} tables and ${schemaInfo.viewCount} views.` : ''}`}
      labels={{
        title: 'NL Query Assistant',
        initial: selectedDataSourceId
          ? 'Ask me anything about your data! I can generate SQL queries, create charts, and help you explore your database.'
          : 'Select a data source to get started, then ask me questions about your data.',
        placeholder: 'Ask about your data...',
      }}
      defaultOpen={true}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Natural Language Query</h1>
          <p className="text-muted-foreground">
            Ask questions about your data in natural language. Powered by AI with RBAC-enforced access control.
          </p>
        </div>

        {/* Data Source Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={selectedDataSourceId} onValueChange={setSelectedDataSourceId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a data source" />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((ds: DataSourceListItem) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.name} ({ds.client_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDataSourceId && (
                <Button variant="outline" size="sm" onClick={handleRefreshSchema} disabled={schemaLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${schemaLoading ? 'animate-spin' : ''}`} />
                  Refresh Schema
                </Button>
              )}

              {schemaInfo && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{schemaInfo.tableCount} tables</Badge>
                  <Badge variant="secondary">{schemaInfo.viewCount} views</Badge>
                </div>
              )}
            </div>

            {/* Schema overview */}
            {schemaInfo?.tables && schemaInfo.tables.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Available tables:</p>
                <div className="flex flex-wrap gap-1">
                  {schemaInfo.tables.map((t: SchemaTableSummary) => (
                    <Badge key={t.name} variant="outline" className="text-xs font-mono">
                      {t.name} ({t.columnCount} cols)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Area */}
        {(queryResult || isExecuting) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {isExecuting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : queryResult?.accessGranted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  Query Results
                </CardTitle>
                {queryResult?.queryResults && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{queryResult.queryResults.totalRows} rows</span>
                    <span>&middot;</span>
                    <span>{queryResult.queryResults.executionTimeMs}ms</span>
                  </div>
                )}
              </div>

              {/* Access check details */}
              {queryResult?.accessCheckResults && queryResult.accessCheckResults.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Access Check</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {queryResult.accessCheckResults.map((check: AccessCheckDetail, idx: number) => (
                      <Badge
                        key={idx}
                        variant={check.hasAccess ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {check.hasAccess ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {check.entity}
                        {check.grantedBy ? ` (${check.grantedBy})` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated SQL */}
              {queryResult?.generatedSql && (
                <details className="mt-2">
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    View generated SQL
                  </summary>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                    {queryResult.generatedSql}
                  </pre>
                </details>
              )}
            </CardHeader>

            <CardContent>
              {queryResult?.error && (
                <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{queryResult.error}</p>
                </div>
              )}

              {queryResult?.queryResults && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="results" className="gap-1">
                      <TableIcon className="h-4 w-4" /> Table
                    </TabsTrigger>
                    <TabsTrigger value="chart" className="gap-1">
                      <BarChart3 className="h-4 w-4" /> Chart
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="results" className="mt-4">
                    <NlResultsTable
                      columns={queryResult.queryResults.columns}
                      rows={queryResult.queryResults.rows}
                      totalRows={queryResult.queryResults.totalRows}
                    />
                  </TabsContent>

                  <TabsContent value="chart" className="mt-4">
                    {chartConfig ? (
                      <NlResultsChart
                        data={queryResult.queryResults.rows}
                        config={chartConfig}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mb-4" />
                        <p>Ask the assistant to generate a chart from the results.</p>
                        <p className="text-sm mt-1">
                          Try: &quot;Show me a bar chart of this data&quot;
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}

        {/* Query History */}
        {queryHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {queryHistory.slice(0, 10).map((h: QueryHistoryEntry) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{h.natural_language_query}</p>
                      {h.generated_sql && (
                        <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                          {h.generated_sql.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        h.access_check_result === 'granted'
                          ? 'default'
                          : h.access_check_result === 'denied'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="ml-2 flex-shrink-0"
                    >
                      {h.access_check_result}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CopilotSidebar>
  );
}
