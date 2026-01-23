import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export type JobType = 'report:generate' | 'chart:render' | 'data:export' | 'scheduled:refresh';

export interface ReportJobData {
  type: 'report:generate';
  reportId: string;
  userId: string;
  parameters?: Record<string, unknown>;
  format?: 'csv' | 'xlsx' | 'pdf';
}

export interface ChartJobData {
  type: 'chart:render';
  chartId: string;
  userId: string;
  format?: 'png' | 'svg';
}

export interface ExportJobData {
  type: 'data:export';
  queryId: string;
  userId: string;
  format: 'csv' | 'xlsx' | 'pdf';
  parameters?: Record<string, unknown>;
}

export interface ScheduledRefreshData {
  type: 'scheduled:refresh';
  targetType: 'report' | 'chart' | 'dashboard';
  targetId: string;
  userId: string;
}

export type JobData = ReportJobData | ChartJobData | ExportJobData | ScheduledRefreshData;

export interface JobResult {
  success: boolean;
  outputLocation?: string;
  rowCount?: number;
  duration: number;
  error?: string;
}

// Create the main job queue
export const reportingQueue = new Queue<JobData, JobResult>('reporting', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 60 * 60, // 7 days
    },
  },
});

// Queue events for monitoring
export const queueEvents = new QueueEvents('reporting', {
  connection: redisConnection as any,
});

// Add a job to the queue
export async function addJob(
  data: JobData,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }
): Promise<Job<JobData, JobResult>> {
  return reportingQueue.add(data.type, data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: options?.jobId,
  });
}

// Add a scheduled (repeatable) job
export async function addScheduledJob(
  data: JobData,
  cronExpression: string,
  options?: {
    jobId?: string;
    timezone?: string;
  }
): Promise<Job<JobData, JobResult>> {
  return reportingQueue.add(data.type, data, {
    repeat: {
      pattern: cronExpression,
      tz: options?.timezone || 'UTC',
    },
    jobId: options?.jobId,
  });
}

// Remove a scheduled job
export async function removeScheduledJob(jobId: string): Promise<boolean> {
  return reportingQueue.removeRepeatableByKey(jobId);
}

// Get job by ID
export async function getJob(jobId: string): Promise<Job<JobData, JobResult> | undefined> {
  return reportingQueue.getJob(jobId);
}

// Get queue status
export async function getQueueStatus() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    reportingQueue.getWaitingCount(),
    reportingQueue.getActiveCount(),
    reportingQueue.getCompletedCount(),
    reportingQueue.getFailedCount(),
    reportingQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

// Get jobs by status
export async function getJobs(
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
  start: number = 0,
  end: number = 20
) {
  return reportingQueue.getJobs([status], start, end);
}

// Clean old jobs
export async function cleanOldJobs(grace: number = 1000, limit: number = 1000) {
  await reportingQueue.clean(grace, limit, 'completed');
  await reportingQueue.clean(grace, limit, 'failed');
}

// Close connections
export async function closeQueue() {
  await reportingQueue.close();
  await queueEvents.close();
  await redisConnection.quit();
}
