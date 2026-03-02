import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { prisma } from '@campaignsites/database';
import { createLogger, initializeProcessLogging } from '@campaignsites/logging';

dotenv.config();

const logger = createLogger();
logger.initialize(prisma);
initializeProcessLogging(logger, {
  sourcePrefix: 'worker',
  rethrowUncaught: true,
});

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

type WorkerName = 'builder' | 'auditor1' | 'cicd-builder' | 'auditor2';

function attachWorkerLogging(workerName: WorkerName, worker: Worker) {
  worker.on('ready', () => {
    logger.info('Worker ready', `worker/${workerName}`, {
      queueName: worker.name,
    });
  });

  worker.on('active', (job) => {
    logger.info('Worker job started', `worker/${workerName}`, {
      queueName: worker.name,
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
    });
  });

  worker.on('completed', (job, result) => {
    logger.info('Worker job completed', `worker/${workerName}`, {
      queueName: worker.name,
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      result: result ?? null,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error('Worker job failed', `worker/${workerName}`, error, {
      queueName: worker.name,
      jobId: job?.id ?? null,
      jobName: job?.name ?? null,
      attemptsMade: job?.attemptsMade ?? null,
      failedReason: job?.failedReason ?? null,
      stacktrace: job?.stacktrace ?? null,
      data: job?.data ?? null,
    });
  });

  worker.on('error', (error) => {
    logger.error('Worker process error', `worker/${workerName}`, error, {
      queueName: worker.name,
    });
  });

  worker.on('stalled', (jobId) => {
    logger.warn('Worker job stalled', `worker/${workerName}`, {
      queueName: worker.name,
      jobId,
    });
  });
}

async function processJob(workerName: WorkerName, queueName: string, job: any) {
  try {
    logger.info('Processing worker job', `worker/${workerName}`, {
      queueName,
      jobId: job.id,
      jobName: job.name,
      data: job.data ?? null,
    });

    // AI Pipeline logic will go here
    return { success: true };
  } catch (error) {
    logger.error('Unhandled exception while processing worker job', `worker/${workerName}`, error, {
      queueName,
      jobId: job.id,
      jobName: job.name,
      data: job.data ?? null,
    });
    throw error;
  }
}

// Builder Worker - Handles the 3+ LLM ring for initial site generation
const builderWorker = new Worker(
  'builder-queue',
  async (job) => {
    return processJob('builder', 'builder-queue', job);
  },
  { connection }
);

// Auditor 1 Worker - Single LLM validation
const auditor1Worker = new Worker(
  'auditor1-queue',
  async (job) => {
    return processJob('auditor1', 'auditor1-queue', job);
  },
  { connection }
);

// CI/CD Builder Worker - 3+ LLM ring for deployment preparation
const cicdBuilderWorker = new Worker(
  'cicd-builder-queue',
  async (job) => {
    return processJob('cicd-builder', 'cicd-builder-queue', job);
  },
  { connection }
);

// Auditor 2 Worker - Final validation
const auditor2Worker = new Worker(
  'auditor2-queue',
  async (job) => {
    return processJob('auditor2', 'auditor2-queue', job);
  },
  { connection }
);

attachWorkerLogging('builder', builderWorker);
attachWorkerLogging('auditor1', auditor1Worker);
attachWorkerLogging('cicd-builder', cicdBuilderWorker);
attachWorkerLogging('auditor2', auditor2Worker);

logger.info('Workers started successfully', 'worker/startup', {
  queues: ['builder-queue', 'auditor1-queue', 'cicd-builder-queue', 'auditor2-queue'],
  redisHost: connection.host,
  redisPort: connection.port,
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Worker shutdown initiated', 'worker/shutdown', { signal: 'SIGTERM' });
  await Promise.all([
    builderWorker.close(),
    auditor1Worker.close(),
    cicdBuilderWorker.close(),
    auditor2Worker.close(),
  ]);
  logger.info('Worker shutdown completed', 'worker/shutdown', { signal: 'SIGTERM' });
});

process.on('SIGINT', async () => {
  logger.info('Worker shutdown initiated', 'worker/shutdown', { signal: 'SIGINT' });
  await Promise.all([
    builderWorker.close(),
    auditor1Worker.close(),
    cicdBuilderWorker.close(),
    auditor2Worker.close(),
  ]);
  logger.info('Worker shutdown completed', 'worker/shutdown', { signal: 'SIGINT' });
});
