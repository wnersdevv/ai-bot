import { Types } from 'mongoose';
import Redis from 'ioredis';
import { BotInstance } from '../../models/BotInstance';
import { SecretBox } from '../../security/encryption';
import { BotRuntime } from '../BotInstance/BotRuntime';
import { AIService } from '../../services/AIService';
import { logger } from '../../utils/logger';

/**
 * Owns the in-memory map of running BotRuntime instances for THIS process.
 * For the "1000 bots" target, a single BotManager per worker process is
 * combined with WorkerManager sharding bot ids across N processes - see
 * WorkerManager for that layer. This class does not assume it owns every
 * bot in the system, only the ones assigned to it.
 */
export class BotManager {
  private runtimes = new Map<string, BotRuntime>();
  private aiService: AIService;
  private secretBox: SecretBox;
  private encryptionKey: string;
  private redis: Redis;

  constructor(redis: Redis, encryptionKey: string) {
    this.aiService = new AIService(redis, encryptionKey);
    this.secretBox = new SecretBox(encryptionKey);
    this.encryptionKey = encryptionKey;
    this.redis = redis;
  }

  async startBot(botInstanceId: Types.ObjectId): Promise<void> {
    const key = botInstanceId.toString();
    if (this.runtimes.has(key)) {
      logger.warn({ botInstanceId }, 'Bot already running in this process');
      return;
    }

    const doc = await BotInstance.findById(botInstanceId).select('+encryptedToken');
    if (!doc) throw new Error(`BotInstance ${key} not found`);

    const token = this.secretBox.decrypt(doc.encryptedToken);
    const runtime = new BotRuntime(botInstanceId, token, {
      aiService: this.aiService,
      encryptionKey: this.encryptionKey,
      redis: this.redis,
      botManager: this,
    });

    this.runtimes.set(key, runtime);
    await BotInstance.findByIdAndUpdate(botInstanceId, { status: 'starting' });
    await runtime.start();
  }

  async stopBot(botInstanceId: Types.ObjectId): Promise<void> {
    const key = botInstanceId.toString();
    const runtime = this.runtimes.get(key);
    if (!runtime) return;
    await runtime.stop();
    this.runtimes.delete(key);
  }

  async restartBot(botInstanceId: Types.ObjectId): Promise<void> {
    await this.stopBot(botInstanceId);
    await this.startBot(botInstanceId);
  }

  isRunning(botInstanceId: Types.ObjectId): boolean {
    return this.runtimes.has(botInstanceId.toString());
  }

  runningCount(): number {
    return this.runtimes.size;
  }

  /** Boots every bot owned by this process that the DB marks as should-be-online. */
  async startAssigned(botInstanceIds: Types.ObjectId[]): Promise<void> {
    for (const id of botInstanceIds) {
      try {
        await this.startBot(id);
      } catch (err) {
        logger.error({ err, botInstanceId: id }, 'Failed to start bot');
      }
    }
  }
}
