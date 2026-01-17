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
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import type { ChartDefinition, SavedQuery, ChartType } from '@/types/database';

const chartTypeIcons: Record<ChartType, React.ReactNode> = {
  bar: <BarChart3 className="h-4 w-4" />,
  line: <LineChart className="h-4 w-4" />,
  area: <AreaChart className="h-4 w-4" />,
  pie: <PieChart className="h-4 w-4" />,
  scatter: <BarChart3 className="h-4 w-4" />,
  composed: <BarChart3 className="h-4 w-4" />,
};

export default function ChartsPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChartName, setNewChartName] = useState('');
  const [newChartType, setNewChartType] = useState<ChartType>('bar');
  const [selectedQueryId, setSelectedQueryId] = useState('');

  const { data: charts, isLoading } = useQuery<ChartDefinition[]>({
    queryKey: ['charts'],
    queryFn: async () => {
      const res = await fetch('/api/charts');
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
      const res = await fetch('/api/charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChartName,
          chartType: newChartType,
          savedQueryId: selectedQueryId || undefined,
          chartConfig: { legend: { show: true }, tooltip: { enabled: true } },
          dataMapping: { xAxis: { field: '' }, yAxis: [] },
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Chart created successfully');
        queryClient.invalidateQueries({ queryKey: ['charts'] });
        setCreateDialogOpen(false);
        setNewChartName('');
        setNewChartType('bar');
        setSelectedQueryId('');
      } else {
        toast.error(data.error?.message || 'Failed to create chart');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/charts/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Chart deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['charts'] });
      } else {
        toast.error(data.error?.message || 'Failed to delete chart');
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Charts</h1>
          <p className="text-muted-foreground">
            Create and manage data visualizations
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Chart
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Chart</DialogTitle>
              <DialogDescription>
                Create a new chart visualization from a saved query.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newChartName}
                  onChange={(e) => setNewChartName(e.target.value)}
                  placeholder="My Chart"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Chart Type</Label>
                <Select value={newChartType} onValueChange={(v) => setNewChartType(v as ChartType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="scatter">Scatter Plot</SelectItem>
                    <SelectItem value="composed">Composed Chart</SelectItem>
                  </SelectContent>
                </Select>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newChartName || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Chart'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            All Charts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading charts...
            </div>
          ) : charts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No charts created yet. Create your first chart to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Query</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charts?.map((chart) => (
                  <TableRow key={chart.id}>
                    <TableCell className="font-medium">{chart.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {chartTypeIcons[chart.chart_type]}
                        {chart.chart_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {chart.saved_query_id ? (
                        <Badge variant="secondary">Linked</Badge>
                      ) : (
                        <Badge variant="outline">No Query</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(chart.created_at)}
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
                            <Link href={`/charts/viewer/${chart.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/charts/editor/${chart.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(chart.id)}
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
