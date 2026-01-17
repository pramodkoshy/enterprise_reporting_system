'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save, Eye, Trash, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportDefinition, SavedQuery, ColumnDefinition } from '@/types/database';

interface SortableColumnRowProps {
  column: ColumnDefinition;
  onUpdate: (id: string, updates: Partial<ColumnDefinition>) => void;
  onDelete: (id: string) => void;
}

function SortableColumnRow({ column, onUpdate, onDelete }: SortableColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <Input
          value={column.header}
          onChange={(e) => onUpdate(column.id, { header: e.target.value })}
          className="h-8"
        />
      </TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">
        {column.field}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={column.width || ''}
          onChange={(e) => onUpdate(column.id, { width: e.target.value ? Number(e.target.value) : undefined })}
          className="h-8 w-20"
          placeholder="Auto"
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={column.visible}
          onCheckedChange={(visible) => onUpdate(column.id, { visible })}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={column.sortable}
          onCheckedChange={(sortable) => onUpdate(column.id, { sortable })}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={column.filterable}
          onCheckedChange={(filterable) => onUpdate(column.id, { filterable })}
        />
      </TableCell>
      <TableCell>
        <Select
          value={column.formatter?.type || 'text'}
          onValueChange={(type) =>
            onUpdate(column.id, {
              formatter: { type: type as ColumnDefinition['formatter']['type'], options: {} },
            })
          }
        >
          <SelectTrigger className="h-8 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="currency">Currency</SelectItem>
            <SelectItem value="percentage">Percent</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="datetime">DateTime</SelectItem>
            <SelectItem value="boolean">Boolean</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(column.id)}
          className="h-8 w-8 text-destructive"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function ReportEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reportId = params.id as string;

  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: report, isLoading: isLoadingReport } = useQuery<ReportDefinition>({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}`);
      const data = await res.json();
      return data.data;
    },
  });

  const { data: queries } = useQuery<SavedQuery[]>({
    queryKey: ['queries'],
    queryFn: async () => {
      const res = await fetch('/api/queries');
      const data = await res.json();
      return data.data?.items || [];
    },
  });

  useEffect(() => {
    if (report) {
      setReportName(report.name);
      setReportDescription(report.description || '');
      setSelectedQueryId(report.saved_query_id || '');
      try {
        setColumns(JSON.parse(report.column_config) || []);
      } catch {
        setColumns([]);
      }
    }
  }, [report]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName,
          description: reportDescription,
          savedQueryId: selectedQueryId || undefined,
          columnConfig: columns,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Report saved successfully');
        queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      } else {
        toast.error(data.error?.message || 'Failed to save report');
      }
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleUpdateColumn = (id: string, updates: Partial<ColumnDefinition>) => {
    setColumns((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteColumn = (id: string) => {
    setColumns((items) => items.filter((item) => item.id !== id));
  };

  const handleAddColumn = () => {
    const newColumn: ColumnDefinition = {
      id: `col-${Date.now()}`,
      field: 'new_field',
      header: 'New Column',
      visible: true,
      sortable: true,
      filterable: true,
      resizable: true,
    };
    setColumns([...columns, newColumn]);
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
          { label: report.name, href: `/reports/viewer/${reportId}` },
          { label: 'Edit' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Report</h1>
          <p className="text-muted-foreground">Configure report columns and settings</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/reports/viewer/${reportId}`}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </a>
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="query">Data Source Query</Label>
                  <Select value={selectedQueryId} onValueChange={setSelectedQueryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a query" />
                    </SelectTrigger>
                    <SelectContent>
                      {queries?.map((query) => (
                        <SelectItem key={query.id} value={query.id}>
                          {query.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="columns" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Column Configuration</CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddColumn}>
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Header</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Width</TableHead>
                      <TableHead>Visible</TableHead>
                      <TableHead>Sortable</TableHead>
                      <TableHead>Filterable</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={columns.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {columns.map((column) => (
                        <SortableColumnRow
                          key={column.id}
                          column={column}
                          onUpdate={handleUpdateColumn}
                          onDelete={handleDeleteColumn}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>

              {columns.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No columns configured. Add columns to define the report structure.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters">
          <Card>
            <CardHeader>
              <CardTitle>Filter Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Filter configuration coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Export configuration coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
