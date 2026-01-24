'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MonacoSQLEditor } from '@/components/sql-editor/monaco-editor';
import { SchemaBrowser } from '@/components/sql-editor/schema-browser';
import { QueryResults } from '@/components/sql-editor/query-results';
import { ValidationPanel } from '@/components/sql-editor/validation-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Play, Save, FileText, Database, Code, AlertCircle, AlertTriangle, PanelLeftClose, PanelLeftOpen, PanelTopClose, PanelTopOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { DataSource } from '@/types/database';
import type { SchemaInfo, SQLExecutionResponse } from '@/types/api';
import type { SQLValidationResult } from '@/lib/sql/validator';

export default function SQLEditorPage() {
  const [sqlContent, setSqlContent] = useState('SELECT * FROM users LIMIT 10;');
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [queryResult, setQueryResult] = useState<SQLExecutionResponse | null>(null);
  const [validation, setValidation] = useState<SQLValidationResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schemaWarning, setSchemaWarning] = useState<string | null>(null);
  const [schemaLogs, setSchemaLogs] = useState<string[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [queryDescription, setQueryDescription] = useState('');
  const [pageOffset, setPageOffset] = useState(0);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
  const [isSchemaCollapsed, setIsSchemaCollapsed] = useState(false);

  const PAGE_SIZE = 100;

  // Handle schema panel collapse/expand
  const handleToggleSchema = useCallback(() => {
    setIsSchemaCollapsed(prev => !prev);
  }, []);

  // Handle editor panel collapse/expand
  const handleToggleEditor = useCallback(() => {
    setIsEditorCollapsed(prev => !prev);
  }, []);

  // Fetch data sources (only active ones)
  const { data: dataSources, isLoading: isLoadingDataSources } = useQuery<DataSource[]>({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const res = await fetch('/api/data-sources');
      const data = await res.json();
      // Filter to only show active data sources
      const sources = data.data?.items || [];
      return sources.filter((ds: DataSource) => ds.is_active);
    },
  });

  // Fetch schema for selected data source
  const { data: schema, isLoading: isLoadingSchema, error: schemaQueryError } = useQuery<{ tables: any[], views: any[], logs?: string[] }>({
    queryKey: ['schema', selectedDataSource],
    queryFn: async () => {
      const res = await fetch(`/api/sql/schema/${selectedDataSource}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to load schema');
      }

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load schema');
      }

      // Capture logs
      if (data.data?.logs) {
        setSchemaLogs(data.data.logs);
      }

      // Show warning if schema is empty
      if (data.warning) {
        toast.warning(data.warning);
        setSchemaWarning(data.warning);
        setSchemaError(null);
      } else {
        setSchemaWarning(null);
        setSchemaError(null);
      }

      return data.data;
    },
    enabled: !!selectedDataSource,
    retry: false,
  });

  // Handle schema query errors
  useEffect(() => {
    if (schemaQueryError) {
      const errorMessage = schemaQueryError instanceof Error ? schemaQueryError.message : 'Failed to load schema';
      setSchemaError(errorMessage);
      toast.error(errorMessage);
    }
  }, [schemaQueryError]);

  // Validate SQL mutation
  const validateMutation = useMutation({
    mutationFn: async (sql: string) => {
      const res = await fetch('/api/sql/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, dataSourceId: selectedDataSource }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setValidation(data.data);
    },
  });

  // Execute SQL mutation
  const executeMutation = useMutation({
    mutationFn: async ({ sql, offset = 0 }: { sql: string; offset?: number }) => {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          dataSourceId: selectedDataSource,
          limit: PAGE_SIZE,
          offset,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setQueryResult(data.data);
        setExecutionError(null);
        // Only show success toast on first page load
        if (pageOffset === 0) {
          toast.success('Query executed successfully');
        }
      } else {
        setExecutionError(data.error?.message || 'Query execution failed');
        setQueryResult(null);
      }
    },
    onError: (error) => {
      setExecutionError(error instanceof Error ? error.message : 'Unknown error');
      setQueryResult(null);
    },
  });

  // Save query mutation
  const saveQueryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: queryName,
          description: queryDescription,
          dataSourceId: selectedDataSource,
          sqlContent,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Query saved successfully');
        setSaveDialogOpen(false);
        setQueryName('');
        setQueryDescription('');
      } else {
        toast.error(data.error?.message || 'Failed to save query');
      }
    },
  });

  const handleExecute = useCallback(() => {
    if (!selectedDataSource) {
      toast.error('Please select a data source');
      return;
    }
    setPageOffset(0); // Reset to first page
    executeMutation.mutate({ sql: sqlContent, offset: 0 });
  }, [sqlContent, selectedDataSource, executeMutation]);

  const handlePageChange = useCallback((offset: number) => {
    if (!selectedDataSource) {
      toast.error('Please select a data source');
      return;
    }
    setPageOffset(offset);
    executeMutation.mutate({ sql: sqlContent, offset });
  }, [sqlContent, selectedDataSource, executeMutation]);

  const handleValidate = useCallback(() => {
    validateMutation.mutate(sqlContent);
  }, [sqlContent, validateMutation]);

  const handleTableClick = (tableName: string) => {
    setSqlContent(`SELECT * FROM ${tableName} LIMIT 100;`);
  };

  const handleColumnClick = (tableName: string, columnName: string) => {
    setSqlContent((prev) => {
      const insertion = `${tableName}.${columnName}`;
      return prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + insertion;
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">SQL Editor</h1>
          <p className="text-muted-foreground">Write and execute SQL queries</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Select value={selectedDataSource} onValueChange={setSelectedDataSource} disabled={!dataSources || dataSources.length === 0}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={dataSources && dataSources.length === 0 ? 'No active data sources' : 'Select data source'} />
              </SelectTrigger>
              <SelectContent>
                {dataSources?.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id}>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      {ds.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dataSources && dataSources.length === 0 && (
              <div className="absolute top-full mt-1 w-[200px] text-xs text-muted-foreground z-10 bg-background border rounded p-1">
                No active data sources available
              </div>
            )}
          </div>

          <Button variant="outline" onClick={handleValidate} disabled={!sqlContent}>
            <Code className="h-4 w-4 mr-2" />
            Validate
          </Button>

          <Button
            onClick={handleExecute}
            disabled={!selectedDataSource || executeMutation.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            {executeMutation.isPending ? 'Running...' : 'Run'}
          </Button>

          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!selectedDataSource || !sqlContent}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Query</DialogTitle>
                <DialogDescription>
                  Save this query for later use in reports and charts.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="query-name">Name</Label>
                  <Input
                    id="query-name"
                    value={queryName}
                    onChange={(e) => setQueryName(e.target.value)}
                    placeholder="My Query"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="query-description">Description</Label>
                  <Input
                    id="query-description"
                    value={queryDescription}
                    onChange={(e) => setQueryDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => saveQueryMutation.mutate()}
                  disabled={!queryName || saveQueryMutation.isPending}
                >
                  {saveQueryMutation.isPending ? 'Saving...' : 'Save Query'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ResizablePanelGroup orientation="horizontal" className="h-full rounded-lg border relative">
        {/* Floating toggle button for Schema Browser */}
        <div className="absolute top-4 z-[9999] pointer-events-auto transition-all duration-200" style={{ left: isSchemaCollapsed ? '4px' : 'calc(20% - 20px)' }}>
          <Button
            variant="default"
            size="sm"
            className="shadow-lg"
            onClick={handleToggleSchema}
          >
            {isSchemaCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <ResizablePanel
          size={schemaPanelSize}
          minSize={0}
          maxSize={40}
          collapsible={true}
          collapsedSize={0}
          id="schema-browser-panel"
          onCollapse={() => setIsSchemaCollapsed(true)}
          onExpand={() => setIsSchemaCollapsed(false)}
        >
          {schemaPanelSize > 0 && (
            <div className="h-full overflow-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0 sticky top-0 z-10">
                <h2 className="text-sm font-semibold px-2">Schema Browser</h2>
              </div>
              <SchemaBrowser
                schema={schema || null}
                isLoading={isLoadingSchema}
                onTableClick={handleTableClick}
                onColumnClick={handleColumnClick}
              />
            </div>
          )}
        </ResizablePanel>

        <ResizableHandle withHandle className={schemaPanelSize > 0 ? '' : 'hidden'} />

        <ResizablePanel size={100 - schemaPanelSize} minSize={30} id="main-content-panel">
          <ResizablePanelGroup orientation="vertical" className="h-full relative">
            {/* Floating toggle button for SQL Editor */}
            <div className="absolute right-4 z-[9999] pointer-events-auto transition-all duration-200" style={{ top: isEditorCollapsed ? '4px' : 'calc(50% - 16px)' }}>
              <Button
                variant="default"
                size="sm"
                className="shadow-lg"
                onClick={handleToggleEditor}
              >
                {isEditorCollapsed ? <PanelTopOpen className="h-4 w-4" /> : <PanelTopClose className="h-4 w-4" />}
              </Button>
            </div>

            <ResizablePanel
              size={editorPanelSize}
              minSize={0}
              maxSize={90}
              collapsible={true}
              collapsedSize={0}
              id="sql-editor-panel"
              onCollapse={() => setIsEditorCollapsed(true)}
              onExpand={() => setIsEditorCollapsed(false)}
            >
              {editorPanelSize > 0 && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold">SQL Editor</h2>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedDataSource ? dataSources?.find(ds => ds.id === selectedDataSource)?.name : 'No data source selected'}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <MonacoSQLEditor
                      value={sqlContent}
                      onChange={setSqlContent}
                      onExecute={handleExecute}
                      height="100%"
                      className="h-full"
                      schema={schema || null}
                    />
                  </div>
                </div>
              )}
            </ResizablePanel>

            <ResizableHandle withHandle className={editorPanelSize > 0 ? '' : 'hidden'} />

            <ResizablePanel size={100 - editorPanelSize} minSize={10} maxSize={100} id="results-panel">
              <Tabs defaultValue="results" className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
                  <TabsList>
                    <TabsTrigger value="results">Results</TabsTrigger>
                    <TabsTrigger value="validation">Validation</TabsTrigger>
                    <TabsTrigger value="schema">Schema</TabsTrigger>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="results" className="flex-1 min-h-0 p-4 overflow-auto data-[state=active]:flex">
                  {!queryResult && !executionError && !executeMutation.isPending && (
                    <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                      <div className="text-center">
                        <Play className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">Run a query to see results here</p>
                      </div>
                    </div>
                  )}
                  <QueryResults
                    result={queryResult}
                    isLoading={executeMutation.isPending}
                    error={executionError}
                    onPageChange={handlePageChange}
                  />
                </TabsContent>

                <TabsContent value="validation" className="flex-1 min-h-0 p-4 overflow-auto data-[state=active]:flex">
                  {!validation && (
                    <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                      <div className="text-center">
                        <Code className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">Click Validate to check your SQL syntax</p>
                      </div>
                    </div>
                  )}
                  <ValidationPanel validation={validation} />
                </TabsContent>

                <TabsContent value="schema" className="flex-1 min-h-0 p-4 overflow-auto data-[state=active]:flex">
                  {!selectedDataSource && (
                    <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                      <div className="text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No data source selected</p>
                        <p className="text-xs mt-1">Select a data source from the dropdown above</p>
                      </div>
                    </div>
                  )}
                  {selectedDataSource && isLoadingSchema && (
                    <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                      <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-sm">Loading schema...</p>
                      </div>
                    </div>
                  )}
                  {selectedDataSource && !isLoadingSchema && schema && (
                    <div className="space-y-4 overflow-auto">
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-green-600" />
                        <div>
                          <h3 className="font-semibold">Schema Loaded Successfully</h3>
                          <p className="text-sm text-muted-foreground">
                            {schema.tables.length} tables, {schema.views.length} views found
                          </p>
                        </div>
                      </div>
                      {schema.tables.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Tables:</h4>
                          <div className="flex flex-wrap gap-2">
                            {schema.tables.map((table) => (
                              <span
                                key={table.name}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-sm"
                              >
                                {table.name} <span className="text-xs opacity-70">({table.columns.length} cols)</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {schema.views.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Views:</h4>
                          <div className="flex flex-wrap gap-2">
                            {schema.views.map((view) => (
                              <span
                                key={view.name}
                                className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md text-sm"
                              >
                                {view.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {schemaError && (
                    <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">Schema Error</h4>
                          <p className="text-sm text-red-700 dark:text-red-400 mt-1">{schemaError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {schemaWarning && (
                    <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">Schema Warning</h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">{schemaWarning}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="logs" className="flex-1 min-h-0 p-4 overflow-auto data-[state=active]:flex">
                  <div className="space-y-2 w-full">
                    {schemaLogs.length === 0 ? (
                      <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p className="text-sm">No logs available</p>
                          <p className="text-xs mt-1">Select a data source to see schema loading logs</p>
                        </div>
                      </div>
                    ) : (
                      <div className="font-mono text-xs space-y-1">
                        {schemaLogs.map((log, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded ${
                              log.includes('ERROR') || log.includes('failed')
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                : log.includes('WARN') || log.includes('Warning')
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                                : 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
