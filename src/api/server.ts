import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Types } from 'mongoose';
import Redis from 'ioredis';
import { apiKeyAuth, AuthedRequest } from '../middleware/apiKeyAuth';
import { AIService } from '../services/AIService';
import { AIProviderConfig } from '../models/AIProviderConfig';
import { ProviderManager } from '../providers/provider-manager/ProviderManager';
import { Usage } from '../models/Usage';
import { logger } from '../utils/logger';

const chatRequestSchema = z.object({
  botInstanceId: z.string(),
  prompt: z.string().min(1),
  conversationId: z.string().optional(),
  fallbackEnabled: z.boolean().optional(),
});

export function createApiServer(redis: Redis, encryptionKey: string, apiKeyHashSecret: string) {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));

  const limiter = rateLimit({
    windowMs: 60_000,
    max: Number(process.env.API_RATE_LIMIT_PER_MINUTE || 60),
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/v1', limiter, apiKeyAuth(apiKeyHashSecret));

  const aiService = new AIService(redis, encryptionKey);

  app.post('/v1/chat', async (req: AuthedRequest, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    try {
      const result = await aiService.ask({
        userId: new Types.ObjectId(req.ownerId),
        botInstanceId: new Types.ObjectId(parsed.data.botInstanceId),
        conversationId: parsed.data.conversationId ? new Types.ObjectId(parsed.data.conversationId) : undefined,
        prompt: parsed.data.prompt,
        fallbackEnabled: parsed.data.fallbackEnabled,
      });
      res.json(result);
    } catch (err) {
      logger.error({ err }, 'v1/chat failed');
      res.status(502).json({ error: 'AI provider request failed' });
    }
  });

  app.get('/v1/models', async (req: AuthedRequest, res) => {
    const configs = await AIProviderConfig.find({ ownerId: req.ownerId, enabled: true });
    res.json({ providers: configs.map((c) => ({ provider: c.provider, selectedModel: c.selectedModel })) });
  });

  app.get('/v1/providers', async (_req, res) => {
    res.json({ providers: ProviderManager.KNOWN_PROVIDERS });
  });

  app.get('/v1/usage', async (req: AuthedRequest, res) => {
    const usage = await Usage.find({ userId: req.ownerId }).sort({ createdAt: -1 }).limit(100);
    res.json({ usage });
  });

  return app;
}
