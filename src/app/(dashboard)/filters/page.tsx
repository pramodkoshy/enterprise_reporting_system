'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { FilterDefinition, DataSource } from '@/types/database';

export default function FiltersPage() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<FilterDefinition | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    data_source_id: '',
    filter_query: '',
    display_field: '',
    value_field: '',
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
      return res.json() as Promise<DataSource[]>;
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
      data_source_id: '',
      filter_query: '',
      display_field: '',
      value_field: '',
    });
  };

  const handleCreate = () => {
    createFilter.mutate(formData);
  };

  const handleEdit = (filter: FilterDefinition) => {
    setEditingFilter(filter);
    setFormData({
      name: filter.name,
      description: filter.description || '',
      data_source_id: filter.data_source_id,
      filter_query: filter.filter_query,
      display_field: filter.display_field,
      value_field: filter.value_field,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (editingFilter) {
      updateFilter.mutate({ id: editingFilter.id, data: formData });
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
                Create a reusable filter that can be added to reports and charts.
                The filter query should return at least two fields: one for display
                and one for the actual value.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
              <div className="grid gap-2">
                <Label htmlFor="data_source">Data Source</Label>
                <Select
                  value={formData.data_source_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, data_source_id: value })
                  }
                >
                  <SelectTrigger id="data_source">
                    <SelectValue placeholder="Select data source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dataSources?.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="filter_query">Filter Query</Label>
                <Textarea
                  id="filter_query"
                  value={formData.filter_query}
                  onChange={(e) =>
                    setFormData({ ...formData, filter_query: e.target.value })
                  }
                  placeholder="e.g., SELECT id, name FROM customer ORDER BY name"
                  rows={3}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This query should return the options that will be displayed in the
                  filter dropdown.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="display_field">Display Field</Label>
                  <Input
                    id="display_field"
                    value={formData.display_field}
                    onChange={(e) =>
                      setFormData({ ...formData, display_field: e.target.value })
                    }
                    placeholder="e.g., name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Field shown to users
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="value_field">Value Field</Label>
                  <Input
                    id="value_field"
                    value={formData.value_field}
                    onChange={(e) =>
                      setFormData({ ...formData, value_field: e.target.value })
                    }
                    placeholder="e.g., id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Field used for filtering
                  </p>
                </div>
              </div>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filters?.map((filter) => (
          <Card key={filter.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {filter.name}
                <div className="flex gap-2">
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
              </CardTitle>
              {filter.description && (
                <CardDescription>{filter.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Data Source:</span>{' '}
                {dataSources?.find((ds) => ds.id === filter.data_source_id)?.name ||
                  filter.data_source_id}
              </div>
              <div>
                <span className="font-medium">Display Field:</span>{' '}
                <code className="bg-muted px-1 rounded">
                  {filter.display_field}
                </code>
              </div>
              <div>
                <span className="font-medium">Value Field:</span>{' '}
                <code className="bg-muted px-1 rounded">
                  {filter.value_field}
                </code>
              </div>
              <div className="pt-2">
                <p className="text-muted-foreground text-xs">
                  Query: <code className="text-xs">{filter.filter_query}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
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
              <Label htmlFor="edit-data_source">Data Source</Label>
              <Select
                value={formData.data_source_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, data_source_id: value })
                }
              >
                <SelectTrigger id="edit-data_source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dataSources?.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-filter_query">Filter Query</Label>
              <Textarea
                id="edit-filter_query"
                value={formData.filter_query}
                onChange={(e) =>
                  setFormData({ ...formData, filter_query: e.target.value })
                }
                rows={3}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-display_field">Display Field</Label>
                <Input
                  id="edit-display_field"
                  value={formData.display_field}
                  onChange={(e) =>
                    setFormData({ ...formData, display_field: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-value_field">Value Field</Label>
                <Input
                  id="edit-value_field"
                  value={formData.value_field}
                  onChange={(e) =>
                    setFormData({ ...formData, value_field: e.target.value })
                  }
                />
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
