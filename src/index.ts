import 'dotenv/config';
import Redis from 'ioredis';
import { Types } from 'mongoose';
import { connectDatabase } from './database/connection';
import { BotManager } from './bots/BotManager/BotManager';
import { WorkerManager } from './bots/WorkerManager/WorkerManager';
import { BotInstance } from './models/BotInstance';
import { createApiServer } from './api/server';
import { logger } from './utils/logger';

async function main() {
  const {
    MONGODB_URI,
    REDIS_URL,
    ENCRYPTION_KEY,
    API_KEY_HASH_SECRET,
    API_PORT,
    WORKER_INDEX,
    WORKER_COUNT,
  } = process.env;

  if (!MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (!REDIS_URL) throw new Error('REDIS_URL is required');
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is required');
  if (!API_KEY_HASH_SECRET) throw new Error('API_KEY_HASH_SECRET is required');

  await connectDatabase(MONGODB_URI);
  const redis = new Redis(REDIS_URL);

  const workerIndex = Number(WORKER_INDEX ?? 0);
  const workerCount = Number(WORKER_COUNT ?? 1);
  const workerManager = new WorkerManager(workerIndex, workerCount);
  const botManager = new BotManager(redis, ENCRYPTION_KEY);

  // Boot every bot that should be online and is assigned to this worker.
  const bots = await BotInstance.find({ status: { $ne: 'offline' } }, '_id');
  const assigned = workerManager.filterOwned(bots.map((b) => b._id as Types.ObjectId));
  await botManager.startAssigned(assigned);
  logger.info({ workerIndex, workerCount, botCount: assigned.length }, 'Worker started');

  const app = createApiServer(redis, ENCRYPTION_KEY, API_KEY_HASH_SECRET);
  const port = Number(API_PORT || 3000);
  app.listen(port, () => logger.info(`WNERSAI API listening on :${port}`));

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    for (const id of assigned) {
      await botManager.stopBot(id);
    }
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
