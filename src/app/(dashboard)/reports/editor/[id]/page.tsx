'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
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
import { GripVertical, Save, Eye, Trash, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportDefinition, SavedQuery, ColumnDefinition, FormatterType, FilterDefinition } from '@/types/database';

// Filter types
type FilterOperator =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than' | 'between'
  | 'is_null' | 'is_not_null'
  | 'in' | 'not_in'
  | 'before' | 'after'
  | 'is_true' | 'is_false';

type FilterLogic = 'AND' | 'OR';

interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value?: string | number | boolean | (string | number)[];
  value2?: string | number; // For "between" operator
}

interface FilterGroup {
  id: string;
  logic: FilterLogic;
  conditions: FilterCondition[];
  groups?: FilterGroup[];
}

const OPERATORS_BY_TYPE: Record<string, { value: FilterOperator; label: string; needsValue?: boolean; needsTwoValues?: boolean }[]> = {
  text: [
    { value: 'equals', label: 'Equals', needsValue: true },
    { value: 'not_equals', label: 'Not Equals', needsValue: true },
    { value: 'contains', label: 'Contains', needsValue: true },
    { value: 'not_contains', label: 'Does Not Contain', needsValue: true },
    { value: 'starts_with', label: 'Starts With', needsValue: true },
    { value: 'ends_with', label: 'Ends With', needsValue: true },
    { value: 'is_null', label: 'Is Empty' },
    { value: 'is_not_null', label: 'Is Not Empty' },
    { value: 'in', label: 'In (comma separated)', needsValue: true },
    { value: 'not_in', label: 'Not In (comma separated)', needsValue: true },
  ],
  number: [
    { value: 'equals', label: 'Equals', needsValue: true },
    { value: 'not_equals', label: 'Not Equals', needsValue: true },
    { value: 'greater_than', label: 'Greater Than', needsValue: true },
    { value: 'less_than', label: 'Less Than', needsValue: true },
    { value: 'between', label: 'Between', needsValue: true, needsTwoValues: true },
    { value: 'is_null', label: 'Is Null' },
    { value: 'is_not_null', label: 'Is Not Null' },
  ],
  date: [
    { value: 'equals', label: 'Equals', needsValue: true },
    { value: 'before', label: 'Before', needsValue: true },
    { value: 'after', label: 'After', needsValue: true },
    { value: 'between', label: 'Between', needsValue: true, needsTwoValues: true },
    { value: 'is_null', label: 'Is Null' },
    { value: 'is_not_null', label: 'Is Not Null' },
  ],
  boolean: [
    { value: 'is_true', label: 'Is True' },
    { value: 'is_false', label: 'Is False' },
  ],
};

function FilterBuilder({
  filters,
  availableFields,
  onChange,
}: {
  filters: FilterGroup;
  availableFields: string[];
  onChange: (filters: FilterGroup) => void;
}) {
  const [_expandedGroups, _setExpandedGroups] = useState<Set<string>>(new Set());

  const _toggleGroup = (groupId: string) => {
    _setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const addCondition = (groupId: string) => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: availableFields[0] || '',
      operator: 'equals',
      value: '',
    };

    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [...group.conditions, newCondition],
        };
      }
      if (group.groups) {
        return {
          ...group,
          groups: group.groups.map(updateGroup),
        };
      }
      return group;
    };

    onChange(updateGroup(filters));
  };

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.map((c) =>
            c.id === conditionId ? { ...c, ...updates } : c
          ),
        };
      }
      if (group.groups) {
        return {
          ...group,
          groups: group.groups.map(updateGroup),
        };
      }
      return group;
    };

    onChange(updateGroup(filters));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.filter((c) => c.id !== conditionId),
        };
      }
      if (group.groups) {
        return {
          ...group,
          groups: group.groups.map(updateGroup),
        };
      }
      return group;
    };

    onChange(updateGroup(filters));
  };

  const getOperatorsForField = (_fieldName: string) => {
    // Default to text type if we can't determine
    return OPERATORS_BY_TYPE.text;
  };

  const renderCondition = (groupId: string, condition: FilterCondition) => {
    const operators = getOperatorsForField(condition.field);
    const selectedOperator = operators.find((op) => op.value === condition.operator);

    return (
      <div key={condition.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
        <Select
          value={condition.field}
          onValueChange={(value) => updateCondition(groupId, condition.id, { field: value, operator: 'equals', value: '' })}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Field" />
          </SelectTrigger>
          <SelectContent>
            {availableFields.map((field) => (
              <SelectItem key={field} value={field}>
                {field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={condition.operator}
          onValueChange={(value) => updateCondition(groupId, condition.id, { operator: value as FilterOperator })}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedOperator?.needsValue && !selectedOperator?.needsTwoValues && (
          <Input
            type="text"
            value={condition.value as string || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            className="h-8 flex-1"
            placeholder="Value"
          />
        )}

        {selectedOperator?.needsTwoValues && (
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="text"
              value={condition.value as string || ''}
              onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
              className="h-8 flex-1"
              placeholder="From"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="text"
              value={condition.value2 as string || ''}
              onChange={(e) => updateCondition(groupId, condition.id, { value2: e.target.value })}
              className="h-8 flex-1"
              placeholder="To"
            />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeCondition(groupId, condition.id)}
          className="h-8 w-8 text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderGroup = (group: FilterGroup, level: number = 0) => (
    <div key={group.id} className="border rounded-lg p-4 space-y-3" style={{ marginLeft: `${level * 20}px` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter Group</span>
          <Select
            value={group.logic}
            onValueChange={(value) => {
              const updateGroupLogic = (g: FilterGroup): FilterGroup => {
                if (g.id === group.id) {
                  return { ...g, logic: value as FilterLogic };
                }
                if (g.groups) {
                  return { ...g, groups: g.groups.map(updateGroupLogic) };
                }
                return g;
              };
              onChange(updateGroupLogic(filters));
            }}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {group.conditions.map((condition) => renderCondition(group.id, condition))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => addCondition(group.id)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderGroup(filters)}
    </div>
  );
}

interface SortableColumnRowProps {
  column: ColumnDefinition;
  availableFields: string[];
  onUpdate: (id: string, updates: Partial<ColumnDefinition>) => void;
  onDelete: (id: string) => void;
}

function SortableColumnRow({ column, availableFields, onUpdate, onDelete }: SortableColumnRowProps) {
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
      <TableCell>
        <Select
          value={column.field}
          onValueChange={(field) => onUpdate(column.id, { field })}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {availableFields.map((field) => (
              <SelectItem key={field} value={field}>
                {field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              formatter: { type: type as FormatterType, options: {} },
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
  const queryClient = useQueryClient();
  const reportId = params.id as string;

  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterGroup>({
    id: 'root',
    logic: 'AND',
    conditions: [],
  });
  const [exportFormats, setExportFormats] = useState({
    csv: true,
    excel: true,
    pdf: false,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reusable filter selector state
  const [selectedFilterId, setSelectedFilterId] = useState<string>('');
  const [targetColumn, setTargetColumn] = useState<string>('');

  // Track if we're loading data from server to prevent false "unsaved changes"
  const isLoadingFromServer = useRef(false);

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

  // Fetch available filters
  const { data: availableFilters } = useQuery<FilterDefinition[]>({
    queryKey: ['filters'],
    queryFn: async () => {
      const res = await fetch('/api/filters');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch report filters (link table)
  const { data: reportFilters, refetch: refetchReportFilters } = useQuery({
    queryKey: ['report-filters', reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/filters`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!reportId,
  });

  // Execute query to get available fields when a query is selected
  const { data: queryResult } = useQuery({
    queryKey: ['query-result', selectedQueryId],
    queryFn: async () => {
      if (!selectedQueryId) return null;

      const selectedQuery = queries?.find((q) => q.id === selectedQueryId);
      if (!selectedQuery) return null;

      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: selectedQuery.sql_content,
          dataSourceId: selectedQuery.data_source_id,
          limit: 1, // Only need 1 row to get columns
          offset: 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        return data.data;
      }
      return null;
    },
    enabled: !!selectedQueryId && !!queries,
  });

  // Update available fields when query result changes
  useEffect(() => {
    if (queryResult?.columns) {
      const fields = queryResult.columns.map((col: any) => col.name);
      setAvailableFields(fields);
    } else {
      setAvailableFields([]);
    }
  }, [queryResult]);

  useEffect(() => {
    if (report) {
      isLoadingFromServer.current = true;

      setReportName(report.name);
      setReportDescription(report.description || '');
      setSelectedQueryId(report.saved_query_id || '');
      try {
        setColumns(JSON.parse(report.column_config) || []);
      } catch {
        setColumns([]);
      }
      try {
        setFilters(JSON.parse(report.filter_config || '{"id":"root","logic":"AND","conditions":[]}'));
      } catch {
        setFilters({ id: 'root', logic: 'AND', conditions: [] });
      }
      try {
        setExportFormats(JSON.parse(report.export_config || '{"csv":true,"excel":true,"pdf":false}'));
      } catch {
        setExportFormats({ csv: true, excel: true, pdf: false });
      }
      // Reset unsaved changes flag when data is loaded
      setHasUnsavedChanges(false);

      // Re-enable unsaved changes tracking after a brief delay
      setTimeout(() => {
        isLoadingFromServer.current = false;
      }, 100);
    }
  }, [report]);

  // Track unsaved changes
  useEffect(() => {
    // Don't mark as unsaved if we're loading data from server
    if (report && !isLoadingFromServer.current) {
      setHasUnsavedChanges(true);
    }
  }, [reportName, reportDescription, selectedQueryId, columns, filters, exportFormats, report]);

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
          filterConfig: filters,
          exportConfig: exportFormats,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Report saved successfully');
        queryClient.invalidateQueries({ queryKey: ['report', reportId] });
        setHasUnsavedChanges(false);
      } else {
        toast.error(data.error?.message || 'Failed to save report');
      }
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reportName || 'Draft Report',
          description: reportDescription,
          savedQueryId: selectedQueryId || undefined,
          columnConfig: columns,
          filterConfig: filters,
          exportConfig: exportFormats,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Draft saved');
        queryClient.invalidateQueries({ queryKey: ['report', reportId] });
        // Navigate to preview
        window.location.href = `/reports/viewer/${reportId}`;
      } else {
        toast.error(data.error?.message || 'Failed to save draft');
      }
    },
  });

  // Add filter to report
  const addFilterMutation = useMutation({
    mutationFn: async ({ filterId, targetColumn }: { filterId: string; targetColumn: string }) => {
      const res = await fetch(`/api/reports/${reportId}/filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter_id: filterId, target_column: targetColumn }),
      });
      if (!res.ok) throw new Error('Failed to add filter');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Filter added');
      queryClient.invalidateQueries({ queryKey: ['report-filters', reportId] });
    },
  });

  // Remove filter from report
  const removeFilterMutation = useMutation({
    mutationFn: async (filterLinkId: string) => {
      const res = await fetch(`/api/reports/${reportId}/filters/${filterLinkId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove filter');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Filter removed');
      queryClient.invalidateQueries({ queryKey: ['report-filters', reportId] });
    },
  });

  const handlePreview = () => {
    saveDraftMutation.mutate();
  };

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Edit Report</h1>
            {hasUnsavedChanges && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-muted-foreground">Configure report columns and settings</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={saveDraftMutation.isPending}
          >
            <Eye className="h-4 w-4 mr-2" />
            {saveDraftMutation.isPending ? 'Saving...' : 'Preview'}
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
                          availableFields={availableFields}
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
          <div className="space-y-4">
            {/* Reusable Filters Section */}
            <Card>
              <CardHeader>
                <CardTitle>Reusable Query Filters</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add pre-configured filters that users can select from dropdowns when viewing the report.
                  These filters load options from separate queries.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Filter Form */}
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor="filter-select">Select Filter</Label>
                    <Select value={selectedFilterId} onValueChange={setSelectedFilterId}>
                      <SelectTrigger id="filter-select">
                        <SelectValue placeholder="Choose a filter..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFilters?.filter(f =>
                          !reportFilters?.some((rf: any) => rf.filter_id === f.id)
                        ).map((filter) => (
                          <SelectItem key={filter.id} value={filter.id}>
                            {filter.name}
                            <span className="text-muted-foreground text-xs ml-2">
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
                    Add Filter
                  </Button>
                </div>

                {/* Selected Filters List */}
                {reportFilters && reportFilters.length > 0 && (
                  <div className="space-y-2">
                    <Label>Active Filters</Label>
                    <div className="border rounded-lg divide-y">
                      {reportFilters.map((rf: any) => {
                        const filterDef = availableFilters?.find((f) => f.id === rf.filter_id);
                        if (!filterDef) return null;
                        return (
                          <div key={rf.id} className="flex items-center justify-between p-3">
                            <div className="flex-1">
                              <div className="font-medium">{filterDef.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Filter: <code>{filterDef.display_field}</code> → <code>{filterDef.value_field}</code>
                                {' '}| Target: <code>{rf.target_column}</code>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFilterMutation.mutate(rf.id)}
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

                {reportFilters?.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No reusable filters added. Add filters above to allow users to filter the report.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Existing Static Filter Builder */}
            <Card>
              <CardHeader>
                <CardTitle>Static Filter Conditions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Define static filter conditions for your report. These will be available to users when viewing the report.
                </p>
              </CardHeader>
              <CardContent>
                {availableFields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No fields available. Please select a data source query first.</p>
                  </div>
                ) : (
                  <FilterBuilder
                    filters={filters}
                    availableFields={availableFields}
                    onChange={setFilters}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure which export formats are available for this report. Export buttons will appear in the report header.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="export-csv">CSV Export</Label>
                    <p className="text-xs text-muted-foreground">
                      Comma-separated values format, compatible with Excel and other tools
                    </p>
                  </div>
                  <Switch
                    id="export-csv"
                    checked={exportFormats.csv}
                    onCheckedChange={(checked) =>
                      setExportFormats((prev) => ({ ...prev, csv: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="export-excel">Excel Export</Label>
                    <p className="text-xs text-muted-foreground">
                      Native Excel format with formatting and formulas preserved
                    </p>
                  </div>
                  <Switch
                    id="export-excel"
                    checked={exportFormats.excel}
                    onCheckedChange={(checked) =>
                      setExportFormats((prev) => ({ ...prev, excel: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="export-pdf">PDF Export</Label>
                    <p className="text-xs text-muted-foreground">
                      Portable Document Format, ideal for printing and sharing
                    </p>
                  </div>
                  <Switch
                    id="export-pdf"
                    checked={exportFormats.pdf}
                    onCheckedChange={(checked) =>
                      setExportFormats((prev) => ({ ...prev, pdf: checked }))
                    }
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Export buttons will appear in the report viewer header for enabled formats.
                  Users can click the export button to download the current report data in that format.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
