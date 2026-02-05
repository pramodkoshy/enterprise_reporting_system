'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import type { FilterDefinition, DataSource, SavedQuery, FilterFieldType, FilterOperator } from '@/types/database';

export default function FiltersPage() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<FilterDefinition | null>(null);
  const [availableFields, setAvailableFields] = useState<Array<{ name: string; type: string }>>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    query_id: '',
    data_source_id: '',
    filter_query: '',
    display_field: [] as string[],
    value_field: '',
    field_type: 'id' as FilterFieldType,
    operator: 'in' as FilterOperator,
    max_from_date: '',
    min_to_date: '',
  });

  // Fetch filters
  const { data: filters, isLoading } = useQuery({
    queryKey: ['filters'],
    queryFn: async () => {
      const res = await fetch('/api/filters');
      if (!res.ok) throw new Error('Failed to fetch filters');
      return res.json() as Promise<FilterDefinition[]>;
    },
  });

  // Fetch data sources
  const { data: dataSources } = useQuery({
    queryKey: ['data-sources'],
    queryFn: async () => {
      const res = await fetch('/api/data-sources');
      if (!res.ok) throw new Error('Failed to fetch data sources');
      const json = await res.json();
      return json.data?.items || json;
    },
  });

  // Fetch saved queries
  const { data: savedQueries } = useQuery({
    queryKey: ['queries'],
    queryFn: async () => {
      const res = await fetch('/api/queries');
      if (!res.ok) throw new Error('Failed to fetch queries');
      const json = await res.json();
      return json.data?.items || json;
    },
  });

  // Create filter mutation
  const createFilter = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create filter');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
  });

  // Update filter mutation
  const updateFilter = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/filters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update filter');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
      setIsEditDialogOpen(false);
      setEditingFilter(null);
      resetForm();
    },
  });

  // Delete filter mutation
  const deleteFilter = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/filters/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete filter');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filters'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      query_id: '',
      data_source_id: '',
      filter_query: '',
      display_field: [],
      value_field: '',
      field_type: 'id',
      operator: 'in',
      max_from_date: '',
      min_to_date: '',
    });
    setAvailableFields([]);
  };

  const handleCreate = () => {
    // Convert display_field array to comma-separated string for storage
    const dataToSubmit = {
      ...formData,
      display_field: Array.isArray(formData.display_field)
        ? formData.display_field.join(', ')
        : formData.display_field,
    };
    // Build date validation config
    if (formData.field_type === 'date' && (formData.max_from_date || formData.min_to_date)) {
      (dataToSubmit as any).date_validation_config = JSON.stringify({
        max_from_date: formData.max_from_date || undefined,
        min_to_date: formData.min_to_date || undefined,
      });
    }
    createFilter.mutate(dataToSubmit);
  };

  const handleQueryChange = async (queryId: string) => {
    setFormData({ ...formData, query_id: queryId });

    // Find the selected query and auto-fill data source and SQL
    const selectedQuery = savedQueries?.find((q) => q.id === queryId);
    if (selectedQuery) {
      setFormData((prev) => ({
        ...prev,
        query_id: queryId,
        data_source_id: selectedQuery.data_source_id,
        filter_query: selectedQuery.sql_content,
        value_field: '', // Reset value field when query changes
      }));

      // Fetch available fields by executing the query with LIMIT 1
      loadQueryFields(selectedQuery.id);
    }
  };

  const loadQueryFields = async (queryId: string) => {
    setIsLoadingFields(true);
    try {
      const res = await fetch(`/api/queries/${queryId}/execute`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data.columns) {
          // columns is an array of column names
          const columnNames = data.data.columns;
          // Try to get column types if available
          const columnTypes = data.data.types || {};

          // Convert to array of objects with name and type
          const fields = columnNames.map((name: string) => ({
            name,
            type: columnTypes[name] || 'text', // Default to text if type not available
          }));
          setAvailableFields(fields);
        } else {
          setAvailableFields([]);
        }
      } else {
        setAvailableFields([]);
      }
    } catch (error) {
      console.error('Failed to fetch query fields:', error);
      setAvailableFields([]);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleEdit = (filter: FilterDefinition) => {
    setEditingFilter(filter);

    // Parse date validation config
    let dateValidationConfig = { max_from_date: '', min_to_date: '' };
    if (filter.date_validation_config) {
      try {
        dateValidationConfig = JSON.parse(filter.date_validation_config);
      } catch (e) {
        console.error('Failed to parse date validation config:', e);
      }
    }

    // Try to find the saved query that matches this filter's query
    const matchingQuery = savedQueries?.find(q => q.sql_content === filter.filter_query);

    setFormData({
      name: filter.name,
      description: filter.description || '',
      query_id: matchingQuery?.id || '',
      data_source_id: filter.data_source_id,
      filter_query: filter.filter_query,
      display_field: Array.isArray(filter.display_field) ? filter.display_field : [filter.display_field].filter(Boolean),
      value_field: filter.value_field,
      field_type: filter.field_type || 'id',
      operator: filter.operator || 'in',
      max_from_date: dateValidationConfig.max_from_date || '',
      min_to_date: dateValidationConfig.min_to_date || '',
    });

    setIsEditDialogOpen(true);

    // If we found a matching query, load its fields
    if (matchingQuery) {
      loadQueryFields(matchingQuery.id);
    }
  };

  const handleUpdate = () => {
    if (editingFilter) {
      // Convert display_field array to comma-separated string for storage
      const dataToSubmit = {
        ...formData,
        display_field: Array.isArray(formData.display_field)
          ? formData.display_field.join(', ')
          : formData.display_field,
      };
      // Build date validation config
      if (formData.field_type === 'date' && (formData.max_from_date || formData.min_to_date)) {
        (dataToSubmit as any).date_validation_config = JSON.stringify({
          max_from_date: formData.max_from_date || undefined,
          min_to_date: formData.min_to_date || undefined,
        });
      }
      updateFilter.mutate({ id: editingFilter.id, data: dataToSubmit });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this filter?')) {
      deleteFilter.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading filters...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Filters</h1>
          <p className="text-muted-foreground">
            Manage reusable filters for reports and charts
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Filter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Filter</DialogTitle>
              <DialogDescription>
                Create a reusable filter for reports and charts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="name">Filter Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Customer Filter"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              {/* Field Type Selection */}
              <div className="grid gap-2">
                <Label htmlFor="field_type">Field Type</Label>
                <Select
                  value={formData.field_type}
                  onValueChange={(value: FilterFieldType) => {
                    setFormData({
                      ...formData,
                      field_type: value,
                      operator: value === 'id' ? 'in' : value === 'date' ? 'between' : value === 'number' ? 'equals' : 'contains',
                    });
                  }}
                >
                  <SelectTrigger id="field_type">
                    <SelectValue placeholder="Select field type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">ID (Dropdown from query)</SelectItem>
                    <SelectItem value="number">Number (Comparison operators)</SelectItem>
                    <SelectItem value="date">Date (Date range)</SelectItem>
                    <SelectItem value="text">Text (Pattern matching)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.field_type === 'id' && 'Select a query to populate dropdown options in filter'}
                  {formData.field_type === 'number' && 'Select a query to filter by numeric column'}
                  {formData.field_type === 'date' && 'Select a query to filter by date column'}
                  {formData.field_type === 'text' && 'Select a query to filter by text column'}
                </p>
              </div>

              {/* Saved Query Selector - shown for all field types */}
              <div className="grid gap-2">
                <Label htmlFor="query_id">Saved Query *</Label>
                <Select
                  value={formData.query_id}
                  onValueChange={handleQueryChange}
                >
                  <SelectTrigger id="query_id">
                    <SelectValue placeholder="Select a saved query..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedQueries?.map((query) => (
                      <SelectItem key={query.id} value={query.id}>
                        {query.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a saved query to populate available columns
                </p>
              </div>

              {/* ID Field Type: Display Fields and Value Field */}
              {formData.field_type === 'id' && (
                <div className="grid gap-4">
                  {/* Display Field - Multiple Selection */}
                  <div className="grid gap-2">
                    <Label>Display Fields (Multiple)</Label>
                    {isLoadingFields ? (
                      <p className="text-xs text-muted-foreground">Loading fields...</p>
                    ) : availableFields.length > 0 ? (
                      <MultiSelect
                        options={availableFields.map((field) => ({
                          label: field.name,
                          value: field.name,
                        }))}
                        value={formData.display_field}
                        onValueChange={(values) =>
                          setFormData({ ...formData, display_field: values })
                        }
                        placeholder="Select display fields..."
                        className="w-full"
                      />
                    ) : (
                      <Input
                        value={formData.display_field.join(', ')}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            display_field: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="e.g., firstName, lastName"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Select multiple fields to display (e.g., firstName + lastName)
                    </p>
                  </div>

                  {/* Value Field - Single Selection */}
                  <div className="grid gap-2">
                    <Label>Value Field</Label>
                    {isLoadingFields ? (
                      <p className="text-xs text-muted-foreground">Loading fields...</p>
                    ) : availableFields.length > 0 ? (
                      <Select
                        value={formData.value_field}
                        onValueChange={(value) =>
                          setFormData({ ...formData, value_field: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.name} ({field.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.value_field}
                        onChange={(e) =>
                          setFormData({ ...formData, value_field: e.target.value })
                        }
                        placeholder="e.g., id"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Field used for filtering (should be unique)
                    </p>
                  </div>
                </div>
              )}

              {/* Number Field Type: Operator Selection */}
              {formData.field_type === 'number' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="operator">Operator</Label>
                    <Select
                      value={formData.operator}
                      onValueChange={(value: FilterOperator) =>
                        setFormData({ ...formData, operator: value })
                      }
                    >
                      <SelectTrigger id="operator">
                        <SelectValue placeholder="Select operator..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals (=)</SelectItem>
                        <SelectItem value="less_than">Less Than (&lt;)</SelectItem>
                        <SelectItem value="less_than_equal">Less Than or Equal (&lt;=)</SelectItem>
                        <SelectItem value="greater_than">Greater Than (&gt;)</SelectItem>
                        <SelectItem value="greater_than_equal">Greater Than or Equal (&gt;=)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value_field">Numeric Column</Label>
                    {isLoadingFields ? (
                      <p className="text-xs text-muted-foreground">Loading fields...</p>
                    ) : availableFields.length > 0 ? (
                      <Select
                        value={formData.value_field}
                        onValueChange={(value) =>
                          setFormData({ ...formData, value_field: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select numeric column..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields
                            .filter(f => {
                              const type = (f.type || '').toLowerCase();
                              return type.includes('int') ||
                                     type.includes('number') ||
                                     type.includes('decimal') ||
                                     type.includes('numeric') ||
                                     type.includes('real') ||
                                     type.includes('double') ||
                                     type.includes('float') ||
                                     type.includes('bigint') ||
                                     type.includes('smallint') ||
                                     type.includes('tinyint');
                            })
                            .map((field) => (
                              <SelectItem key={field.name} value={field.name}>
                                {field.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.value_field}
                        onChange={(e) =>
                          setFormData({ ...formData, value_field: e.target.value })
                        }
                        placeholder="e.g., amount, price"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      The numeric database column to filter on
                    </p>
                  </div>
                </>
              )}

              {/* Date Field Type: Operator and Validation */}
              {formData.field_type === 'date' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="operator">Operator</Label>
                    <Select
                      value={formData.operator}
                      onValueChange={(value: FilterOperator) =>
                        setFormData({ ...formData, operator: value })
                      }
                    >
                      <SelectTrigger id="operator">
                        <SelectValue placeholder="Select operator..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="between">Between (Date Range)</SelectItem>
                        <SelectItem value="equals">Equals (=)</SelectItem>
                        <SelectItem value="less_than">Before (&lt;)</SelectItem>
                        <SelectItem value="greater_than">After (&gt;)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value_field">Date Column</Label>
                    {isLoadingFields ? (
                      <p className="text-xs text-muted-foreground">Loading fields...</p>
                    ) : availableFields.length > 0 ? (
                      <Select
                        value={formData.value_field}
                        onValueChange={(value) =>
                          setFormData({ ...formData, value_field: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select date column..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields
                            .filter(f => {
                              const type = (f.type || '').toLowerCase();
                              return type.includes('date') ||
                                     type.includes('time') ||
                                     type.includes('timestamp');
                            })
                            .map((field) => (
                              <SelectItem key={field.name} value={field.name}>
                                {field.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.value_field}
                        onChange={(e) =>
                          setFormData({ ...formData, value_field: e.target.value })
                        }
                        placeholder="e.g., created_at, order_date"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      The database date column to filter on
                    </p>
                  </div>
                  {formData.operator === 'between' && (
                    <div className="border rounded-md p-3 bg-muted/50">
                      <Label className="text-sm font-medium">Date Validation (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Limit the date range users can select
                      </p>
                      <div className="grid gap-2">
                        <div>
                          <Label htmlFor="max_from_date" className="text-xs">From Date Must Be Before/Equal To</Label>
                          <Input
                            id="max_from_date"
                            type="date"
                            value={formData.max_from_date}
                            onChange={(e) =>
                              setFormData({ ...formData, max_from_date: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="min_to_date" className="text-xs">To Date Must Be After/Equal To</Label>
                          <Input
                            id="min_to_date"
                            type="date"
                            value={formData.min_to_date}
                            onChange={(e) =>
                              setFormData({ ...formData, min_to_date: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Text Field Type: Operator Selection with Warning */}
              {formData.field_type === 'text' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="operator">Operator</Label>
                    <Select
                      value={formData.operator}
                      onValueChange={(value: FilterOperator) =>
                        setFormData({ ...formData, operator: value })
                      }
                    >
                      <SelectTrigger id="operator">
                        <SelectValue placeholder="Select operator..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="starts_with">Starts With</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value_field">Text Column</Label>
                    {isLoadingFields ? (
                      <p className="text-xs text-muted-foreground">Loading fields...</p>
                    ) : availableFields.length > 0 ? (
                      <Select
                        value={formData.value_field}
                        onValueChange={(value) =>
                          setFormData({ ...formData, value_field: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select text column..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields
                            .filter(f => {
                              const type = (f.type || '').toLowerCase();
                              // Include columns that are explicitly text types
                              const isTextType = type.includes('text') ||
                                               type.includes('char') ||
                                               type.includes('varchar') ||
                                               type.includes('string');
                              // Include columns with unknown type (often text by default)
                              const isUnknownType = type === '';
                              // Exclude numeric, date, and boolean columns
                              const isNonText = type.includes('int') ||
                                              type.includes('number') ||
                                              type.includes('decimal') ||
                                              type.includes('numeric') ||
                                              type.includes('real') ||
                                              type.includes('double') ||
                                              type.includes('float') ||
                                              type.includes('date') ||
                                              type.includes('time') ||
                                              type.includes('bool');
                              return (isTextType || isUnknownType) && !isNonText;
                            })
                            .map((field) => (
                              <SelectItem key={field.name} value={field.name}>
                                {field.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.value_field}
                        onChange={(e) =>
                          setFormData({ ...formData, value_field: e.target.value })
                        }
                        placeholder="e.g., customer_name, email"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      The database text column to search in
                    </p>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Performance Warning</p>
                      <p className="text-xs">
                        Text filters (contains, starts with) prevent index usage and will result in slow queries on large datasets.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createFilter.isPending}>
                {createFilter.isPending ? 'Creating...' : 'Create Filter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Data Source</TableHead>
              <TableHead>Display Fields</TableHead>
              <TableHead>Value Field</TableHead>
              <TableHead>Query</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filters?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No filters found. Create your first filter to get started.
                </TableCell>
              </TableRow>
            ) : (
              filters?.map((filter) => (
                <TableRow key={filter.id}>
                  <TableCell className="font-medium">{filter.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {filter.description || '-'}
                  </TableCell>
                  <TableCell>
                    {dataSources?.find((ds) => ds.id === filter.data_source_id)?.name ||
                      filter.data_source_id}
                  </TableCell>
                  <TableCell>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                      {filter.display_field}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                      {filter.value_field}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded block max-w-[300px] truncate">
                      {filter.filter_query}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(filter)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(filter.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Filter</DialogTitle>
            <DialogDescription>
              Update the filter configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Filter Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-query_id">Saved Query</Label>
              <Select
                value={formData.query_id}
                onValueChange={(value) => handleQueryChange(value)}
              >
                <SelectTrigger id="edit-query_id">
                  <SelectValue placeholder="Select a saved query..." />
                </SelectTrigger>
                <SelectContent>
                  {savedQueries?.map((query) => (
                    <SelectItem key={query.id} value={query.id}>
                      {query.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a saved query. The data source and SQL will be auto-filled.
              </p>
            </div>

            <div className="grid gap-4">
              {/* Display Field - Multiple Selection */}
              <div className="grid gap-2">
                <Label>Display Fields (Multiple)</Label>
                {isLoadingFields ? (
                  <p className="text-xs text-muted-foreground">Loading fields...</p>
                ) : availableFields.length > 0 ? (
                  <MultiSelect
                    options={availableFields.map((field) => ({
                      label: field,
                      value: field,
                    }))}
                    value={formData.display_field}
                    onValueChange={(values) =>
                      setFormData({ ...formData, display_field: values })
                    }
                    placeholder="Select display fields..."
                    className="w-full"
                  />
                ) : (
                  <Input
                    value={Array.isArray(formData.display_field) ? formData.display_field.join(', ') : formData.display_field}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_field: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g., firstName, lastName"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Select multiple fields to display (e.g., firstName + lastName)
                </p>
              </div>

              {/* Value Field - Single Selection */}
              <div className="grid gap-2">
                <Label>Value Field</Label>
                {availableFields.length > 0 ? (
                  <Select
                    value={formData.value_field}
                    onValueChange={(value) =>
                      setFormData({ ...formData, value_field: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.value_field}
                    onChange={(e) =>
                      setFormData({ ...formData, value_field: e.target.value })
                    }
                    placeholder="e.g., id"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Field used for filtering (should be unique)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateFilter.isPending}>
              {updateFilter.isPending ? 'Updating...' : 'Update Filter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
