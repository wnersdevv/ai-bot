import { Queue, Worker, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { Types } from 'mongoose';
import { AIService, AskParams, AskResult } from '../services/AIService';
import { logger } from '../utils/logger';

const QUEUE_NAME = 'wnersai:ai-requests';

export interface AIJobData {
  userId: string;
  botInstanceId: string;
  guildId?: string;
  conversationId?: string;
  prompt: string;
  fallbackEnabled?: boolean;
}

/**
 * Request queue that protects providers/DB during burst traffic (e.g. many
 * guilds firing /ai at once). Callers that need an immediate reply (the
 * Discord command handlers) call AIService directly - this queue is for
 * higher-throughput paths like the Web API and any future batch/webhook use.
 */
export class AIRequestQueue {
  private queue: Queue<AIJobData>;
  private worker: Worker<AIJobData, AskResult> | undefined;

  constructor(private redisConnection: Redis, private aiService: AIService) {
    this.queue = new Queue<AIJobData>(QUEUE_NAME, { connection: this.redisConnection as any });
  }

  async enqueue(data: AIJobData, opts?: JobsOptions) {
    return this.queue.add('chat', data, {
      attempts: 1, // retries are handled inside ProviderRouter, not at the queue level
      removeOnComplete: 100,
      removeOnFail: 500,
      ...opts,
    });
  }

  /** Starts a worker consuming jobs at a bounded concurrency to protect providers. */
  startWorker(concurrency = 5): void {
    this.worker = new Worker<AIJobData, AskResult>(
      QUEUE_NAME,
      async (job) => {
        const params: AskParams = {
          userId: new Types.ObjectId(job.data.userId),
          botInstanceId: new Types.ObjectId(job.data.botInstanceId),
          guildId: job.data.guildId ? new Types.ObjectId(job.data.guildId) : undefined,
          conversationId: job.data.conversationId ? new Types.ObjectId(job.data.conversationId) : undefined,
          prompt: job.data.prompt,
          fallbackEnabled: job.data.fallbackEnabled,
        };
        return this.aiService.ask(params);
      },
      { connection: this.redisConnection as any, concurrency },
    );

    this.worker.on('failed', (job, err) => {
      logger.error({ err, jobId: job?.id }, 'AI queue job failed');
    });
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
  }
}
