/**
 * Bull Board UI Page
 * Custom queue monitoring and management interface
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface Job {
  id: string;
  name: string;
  data: unknown;
  opts?: {
    delay?: number;
    attempts?: number;
  };
  progress: number;
  attemptsMade: number;
  failedReason?: string;
  stacktrace?: string[];
  processedOn?: number;
  finishedOn?: number;
  returnvalue?: unknown;
}

export default function BullBoardPage() {
  const [stats, setStats] = useState<QueueStats>({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<'waiting' | 'active' | 'completed' | 'failed'>('waiting');
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/jobs/status');
      const data = await response.json();
      setStats(data.data || { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs/executions?limit=20`);
      const data = await response.json();
      setJobs(data.data?.items || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const pauseQueue = async () => {
    try {
      const response = await fetch('/api/jobs/pause', { method: 'POST' });
      if (response.ok) {
        setIsPaused(true);
        toast.success('Queue paused successfully');
      }
    } catch (error) {
      toast.error('Failed to pause queue');
    }
  };

  const resumeQueue = async () => {
    try {
      const response = await fetch('/api/jobs/resume', { method: 'POST' });
      if (response.ok) {
        setIsPaused(false);
        toast.success('Queue resumed successfully');
      }
    } catch (error) {
      toast.error('Failed to resume queue');
    }
  };

  const cleanOldJobs = async () => {
    try {
      const response = await fetch('/api/jobs/clean', { method: 'POST' });
      if (response.ok) {
        toast.success('Old jobs cleaned successfully');
        fetchJobs();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to clean old jobs');
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
      if (response.ok) {
        toast.success('Job retrying successfully');
        fetchJobs();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to retry job');
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Job deleted successfully');
        fetchJobs();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to delete job');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchJobs();
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const StatCard = ({ title, count, icon: Icon, color }: {
    title: string;
    count: number;
    icon: React.ElementType;
    color: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage background job queues using BullMQ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchJobs();
              fetchStats();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {isPaused ? (
            <Button size="sm" onClick={resumeQueue}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={pauseQueue}>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={cleanOldJobs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Old Jobs
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Waiting"
          count={stats.waiting}
          icon={Clock}
          color="text-yellow-500"
        />
        <StatCard
          title="Active"
          count={stats.active}
          icon={Activity}
          color="text-blue-500"
        />
        <StatCard
          title="Completed"
          count={stats.completed}
          icon={CheckCircle2}
          color="text-green-500"
        />
        <StatCard
          title="Failed"
          count={stats.failed}
          icon={XCircle}
          color="text-red-500"
        />
        <StatCard
          title="Delayed"
          count={stats.delayed}
          icon={AlertCircle}
          color="text-orange-500"
        />
      </div>

      {/* Jobs Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
          <CardDescription>
            View and manage jobs by status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="waiting">
                Waiting ({stats.waiting})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({stats.completed})
              </TabsTrigger>
              <TabsTrigger value="failed">
                Failed ({stats.failed})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading jobs...
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No {activeTab} jobs
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{job.id?.slice(0, 8) || 'N/A'}</Badge>
                          <span className="font-medium">{job.name || 'Unknown'}</span>
                          {(job.attemptsMade || 0) > 0 && (
                            <Badge variant="secondary">
                              Attempts: {job.attemptsMade}
                            </Badge>
                          )}
                        </div>
                        {job.failedReason && (
                          <p className="text-sm text-red-500 mt-1">{job.failedReason}</p>
                        )}
                        {(job.progress || 0) > 0 && (job.progress || 0) < 100 && (
                          <div className="mt-2">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {activeTab === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryJob(job.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteJob(job.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
