/**
 * Queue Module - Public API
 * Modular job queue system using BullMQ with Bull Board UI integration
 */

// Types
export type {
  JobType,
  ReportJobData,
  ChartJobData,
  ExportJobData,
  ScheduledRefreshData,
  JobData,
  JobResult,
  QueueStatus,
  JobOptions,
  ScheduledJobOptions,
  QueueConfig,
} from './types';

// Queue Manager - Main API
export {
  getQueue,
  getQueueEvents,
  addJob,
  addScheduledJob,
  removeScheduledJob,
  getJob,
  getQueueStatus,
  getJobs,
  cleanOldJobs,
  pauseQueue,
  resumeQueue,
  obliterateQueue,
  closeQueue,
  isQueuePaused,
  retryJob,
  removeJob,
} from './queue-manager';

// Bull Board Integration
export {
  getBullBoardBasePath,
  isBullBoardAuthEnabled,
  getBullBoardCredentials,
} from './bull-board';

// Config
export { QUEUE_NAME, DEFAULT_QUEUE_CONFIG, WORKER_CONCURRENCY, RATE_LIMITER, BULL_BOARD_CONFIG } from './config';
