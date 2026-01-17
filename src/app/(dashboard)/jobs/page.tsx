'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RefreshCw,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Download,
  Trash,
  Pause,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import type { JobDefinition, JobExecution } from '@/types/database';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  running: <RefreshCw className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  cancelled: <Pause className="h-4 w-4" />,
};

export default function JobsPage() {
  const queryClient = useQueryClient();

  const { data: queueStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['queue-status'],
    queryFn: async () => {
      const res = await fetch('/api/jobs/status');
      const data = await res.json();
      return data.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: jobDefinitions, isLoading: isLoadingDefinitions } = useQuery<JobDefinition[]>({
    queryKey: ['job-definitions'],
    queryFn: async () => {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      return data.data?.items || [];
    },
  });

  const { data: recentExecutions, isLoading: isLoadingExecutions } = useQuery<JobExecution[]>({
    queryKey: ['job-executions'],
    queryFn: async () => {
      const res = await fetch('/api/jobs/executions?limit=20');
      const data = await res.json();
      return data.data?.items || [];
    },
    refetchInterval: 10000,
  });

  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Job cancelled');
        queryClient.invalidateQueries({ queryKey: ['job-executions'] });
      } else {
        toast.error(data.error?.message || 'Failed to cancel job');
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Background Jobs</h1>
          <p className="text-muted-foreground">
            Monitor and manage background job processing
          </p>
        </div>

        <Button variant="outline" onClick={() => refetchStatus()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Queue Status */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus?.waiting || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus?.active || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus?.completed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus?.failed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
            <Pause className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus?.delayed || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="executions">
        <TabsList>
          <TabsTrigger value="executions">Recent Executions</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="executions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Job Executions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingExecutions ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : recentExecutions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No job executions yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentExecutions?.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell className="font-mono text-sm">
                          {execution.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 w-fit"
                          >
                            {statusIcons[execution.status]}
                            {execution.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {execution.started_at
                            ? formatDateTime(execution.started_at)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {execution.completed_at
                            ? formatDateTime(execution.completed_at)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {execution.execution_metadata
                            ? JSON.parse(execution.execution_metadata).duration + 'ms'
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {execution.result_location && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`/api/jobs/${execution.id}/result`}
                                    download
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Result
                                  </a>
                                </DropdownMenuItem>
                              )}
                              {execution.status === 'pending' ||
                                (execution.status === 'running' && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      cancelMutation.mutate(execution.id)
                                    }
                                    className="text-destructive"
                                  >
                                    <Trash className="h-4 w-4 mr-2" />
                                    Cancel
                                  </DropdownMenuItem>
                                ))}
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
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDefinitions ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : jobDefinitions?.filter((j) => j.schedule_cron).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scheduled jobs configured
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobDefinitions
                      ?.filter((j) => j.schedule_cron)
                      .map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{job.job_type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {job.schedule_cron}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={job.is_active ? 'default' : 'secondary'}
                            >
                              {job.is_active ? 'Active' : 'Paused'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
