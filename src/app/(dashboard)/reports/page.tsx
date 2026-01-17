'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
  FileText,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import type { ReportDefinition, SavedQuery } from '@/types/database';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newReportName, setNewReportName] = useState('');
  const [newReportDescription, setNewReportDescription] = useState('');
  const [selectedQueryId, setSelectedQueryId] = useState('');

  const { data: reports, isLoading } = useQuery<ReportDefinition[]>({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports');
      const data = await res.json();
      return data.data?.items || [];
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

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newReportName,
          description: newReportDescription,
          savedQueryId: selectedQueryId || undefined,
          columnConfig: [],
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Report created successfully');
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        setCreateDialogOpen(false);
        setNewReportName('');
        setNewReportDescription('');
        setSelectedQueryId('');
      } else {
        toast.error(data.error?.message || 'Failed to create report');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Report deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['reports'] });
      } else {
        toast.error(data.error?.message || 'Failed to delete report');
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Create and manage tabular reports
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Report</DialogTitle>
              <DialogDescription>
                Create a new report from a saved query.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  placeholder="My Report"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newReportDescription}
                  onChange={(e) => setNewReportDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="query">Saved Query</Label>
                <Select
                  value={selectedQueryId}
                  onValueChange={setSelectedQueryId}
                >
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
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newReportName || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading reports...
            </div>
          ) : reports?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports created yet. Create your first report to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Query</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports?.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.description || '-'}
                    </TableCell>
                    <TableCell>
                      {report.saved_query_id ? (
                        <Badge variant="secondary">Linked</Badge>
                      ) : (
                        <Badge variant="outline">No Query</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(report.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/reports/viewer/${report.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/reports/editor/${report.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(report.id)}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
