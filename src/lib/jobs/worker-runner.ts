import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { processReportJob } from './workers/report-worker';
import type { JobData, JobResult } from './queue';
import { WORKER_CONCURRENCY, RATE_LIMITER } from '@/lib/queue/config';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const concurrency = WORKER_CONCURRENCY;


async function processJob(job: Job<JobData>): Promise<JobResult> {
  console.log(`Processing job ${job.id} of type ${job.data.type}`);

  switch (job.data.type) {
    case 'report:generate':
      return processReportJob(job as Job<typeof job.data>);

    case 'chart:render':
      // Chart rendering would be implemented here
      return {
        success: true,
        duration: 0,
      };

    case 'data:export':
      // Generic data export would be implemented here
      return {
        success: true,
        duration: 0,
      };

    case 'scheduled:refresh':
      // Scheduled refresh would be implemented here
      return {
        success: true,
        duration: 0,
      };

    default:
      throw new Error(`Unknown job type: ${(job.data as JobData).type}`);
  }
}

const worker = new Worker<JobData, JobResult>(
  'reporting',
  async (job) => {
    try {
      const result = await processJob(job);
      console.log(`Job ${job.id} completed:`, result.success ? 'success' : 'failed');
      return result;
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection as any,
    concurrency,
    limiter: RATE_LIMITER,
  }
);

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

worker.on('ready', () => {
  console.log('Worker is ready and listening for jobs');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing worker...');
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing worker...');
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
});

console.log(`Worker started with concurrency: ${concurrency}`);
