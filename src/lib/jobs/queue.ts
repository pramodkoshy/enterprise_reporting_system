import { Queue, Worker, Job, QueueEvents } from "bullmq";
import Redis from "ioredis";

let redisConnection: Redis | null = null;
let queueInstance: Queue<JobData, JobResult> | null = null;
let queueEventsInstance: QueueEvents | null = null;

function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(
      process.env.REDIS_URL || "redis://localhost:6379",
      {
        maxRetriesPerRequest: null,
        lazyConnect: true,
      },
    );
  }
  return redisConnection;
}

export function getQueue(): Queue<JobData, JobResult> {
  if (!queueInstance) {
    queueInstance = new Queue<JobData, JobResult>("reporting", {
      connection: getRedisConnection() as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 60 * 60,
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 60 * 60,
        },
      },
    });
  }
  return queueInstance;
}

export function getQueueEvents(): QueueEvents {
  if (!queueEventsInstance) {
    queueEventsInstance = new QueueEvents("reporting", {
      connection: getRedisConnection() as any,
    });
  }
  return queueEventsInstance;
}

export type JobType =
  | "report:generate"
  | "chart:render"
  | "data:export"
  | "scheduled:refresh"
  | "email:batch";

export interface ReportJobData {
  type: "report:generate";
  reportId: string;
  userId: string;
  parameters?: Record<string, unknown>;
  format?: "csv" | "xlsx" | "pdf";
}

export interface EmailBatchJobData {
  type: "email:batch";
  queryId: string;
  emailTemplateId: string;
  recipientQueryId: string;
  recipientEmailColumn: string;
  userId: string;
  format?: "csv" | "xlsx" | "pdf";
  reportName?: string;
  parameters?: Record<string, unknown>;
}

export interface ChartJobData {
  type: "chart:render";
  chartId: string;
  userId: string;
  format?: "png" | "svg";
}

export interface ExportJobData {
  type: "data:export";
  queryId: string;
  userId: string;
  format: "csv" | "xlsx" | "pdf";
  parameters?: Record<string, unknown>;
}

export interface ScheduledRefreshData {
  type: "scheduled:refresh";
  targetType: "report" | "chart" | "dashboard";
  targetId: string;
  userId: string;
}

export type JobData =
  | ReportJobData
  | ChartJobData
  | ExportJobData
  | ScheduledRefreshData
  | EmailBatchJobData;

export interface JobResult {
  success: boolean;
  outputLocation?: string;
  rowCount?: number;
  duration: number;
  error?: string;
  emailsSent?: number;
  attachmentPath?: string;
}

export const reportingQueue = {
  get instance() {
    return getQueue();
  },
  add: async (name: string, data: JobData, options?: any) =>
    getQueue().add(name, data, options),
  getJob: async (jobId: string) => getQueue().getJob(jobId),
  getWaitingCount: async () => getQueue().getWaitingCount(),
  getActiveCount: async () => getQueue().getActiveCount(),
  getCompletedCount: async () => getQueue().getCompletedCount(),
  getFailedCount: async () => getQueue().getFailedCount(),
  getDelayedCount: async () => getQueue().getDelayedCount(),
  getJobs: async (types: any[], start?: number, end?: number) =>
    getQueue().getJobs(types, start, end),
  clean: async (grace: number, limit: number, type: string) =>
    getQueue().clean(grace, limit, type as any),
  close: async () => getQueue().close(),
  removeRepeatableByKey: async (key: string) =>
    getQueue().removeRepeatableByKey(key),
};

export const queueEvents = {
  get instance() {
    return getQueueEvents();
  },
  close: async () => getQueueEvents().close(),
};

export async function addJob(
  data: JobData,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  },
): Promise<Job<JobData, JobResult>> {
  return getQueue().add(data.type, data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: options?.jobId,
  });
}

export async function addScheduledJob(
  data: JobData,
  cronExpression: string,
  options?: {
    jobId?: string;
    timezone?: string;
  },
): Promise<Job<JobData, JobResult>> {
  return getQueue().add(data.type, data, {
    repeat: {
      pattern: cronExpression,
      tz: options?.timezone || "UTC",
    },
    jobId: options?.jobId,
  });
}

export async function removeScheduledJob(jobId: string): Promise<boolean> {
  return getQueue().removeRepeatableByKey(jobId);
}

export async function getJob(
  jobId: string,
): Promise<Job<JobData, JobResult> | undefined> {
  return getQueue().getJob(jobId);
}

export async function getQueueStatus() {
  const queue = getQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

export async function getJobs(
  status: "waiting" | "active" | "completed" | "failed" | "delayed",
  start: number = 0,
  end: number = 20,
) {
  return getQueue().getJobs([status], start, end);
}

export async function cleanOldJobs(grace: number = 1000, limit: number = 1000) {
  const queue = getQueue();
  await queue.clean(grace, limit, "completed");
  await queue.clean(grace, limit, "failed");
}

export async function closeQueue() {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
  }
  if (queueEventsInstance) {
    await queueEventsInstance.close();
    queueEventsInstance = null;
  }
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
