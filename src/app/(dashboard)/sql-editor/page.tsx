'use client';

import { useState, useCallback } from 'react';
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
import { Play, Save, FileText, Database, Code } from 'lucide-react';
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [queryDescription, setQueryDescription] = useState('');

  // Fetch data sources
  const { data: dataSources, isLoading: isLoadingDataSources } = useQuery<DataSource[]>({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const res = await fetch('/api/data-sources');
      const data = await res.json();
      return data.data?.items || [];
    },
  });

  // Fetch schema for selected data source
  const { data: schema, isLoading: isLoadingSchema } = useQuery<SchemaInfo>({
    queryKey: ['schema', selectedDataSource],
    queryFn: async () => {
      const res = await fetch(`/api/sql/schema/${selectedDataSource}`);
      const data = await res.json();
      return data.data;
    },
    enabled: !!selectedDataSource,
  });

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
    mutationFn: async (sql: string) => {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          dataSourceId: selectedDataSource,
          limit: 1000,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setQueryResult(data.data);
        setExecutionError(null);
        toast.success('Query executed successfully');
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
    executeMutation.mutate(sqlContent);
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
          <Select value={selectedDataSource} onValueChange={setSelectedDataSource}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select data source" />
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

      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <SchemaBrowser
            schema={schema || null}
            isLoading={isLoadingSchema}
            onTableClick={handleTableClick}
            onColumnClick={handleColumnClick}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={80}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col">
                <MonacoSQLEditor
                  value={sqlContent}
                  onChange={setSqlContent}
                  onExecute={handleExecute}
                  height="100%"
                  className="flex-1"
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={50}>
              <Tabs defaultValue="results" className="h-full flex flex-col">
                <TabsList className="mx-2 mt-2">
                  <TabsTrigger value="results">Results</TabsTrigger>
                  <TabsTrigger value="validation">Validation</TabsTrigger>
                </TabsList>

                <TabsContent value="results" className="flex-1 p-4 overflow-auto">
                  <QueryResults
                    result={queryResult}
                    isLoading={executeMutation.isPending}
                    error={executionError}
                  />
                </TabsContent>

                <TabsContent value="validation" className="flex-1 p-4 overflow-auto">
                  <ValidationPanel validation={validation} />
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
