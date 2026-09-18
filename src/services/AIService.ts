import Redis from 'ioredis';
import { Types } from 'mongoose';
import { ProviderRouter } from '../ai/router/ProviderRouter';
import { AIProviderConfig } from '../models/AIProviderConfig';
import { APIKey } from '../models/APIKey';
import { Conversation, Message } from '../models/Conversation';
import { Usage } from '../models/Usage';
import { SecretBox } from '../security/encryption';
import { estimateCostUsd } from '../config/pricingTable';
import { buildContext } from '../ai/context/ContextManager';
import { ProviderKind } from '../providers/provider-manager/ProviderManager';
import { logger, LogEvent } from '../utils/logger';
import { ProviderError } from '../providers/types';

export interface AskParams {
  userId: Types.ObjectId;
  botInstanceId: Types.ObjectId;
  guildId?: Types.ObjectId;
  conversationId?: Types.ObjectId;
  prompt: string;
  fallbackEnabled?: boolean;
}

export interface AskResult {
  conversationId: Types.ObjectId;
  content: string;
  provider: string;
  model: string;
  usedFallback: boolean;
  latencyMs: number;
}

/**
 * Single AI business-logic entry point. Both the /ai slash command and the
 * w!ai prefix command call THIS - never their own separate AI code path.
 * Slash -> CommandHandler -> AIService -> ProviderRouter
 * Prefix -> CommandHandler -> AIService -> ProviderRouter
 */
export class AIService {
  private router: ProviderRouter;
  private secretBox: SecretBox;

  constructor(redis: Redis, encryptionKey: string) {
    this.router = new ProviderRouter(redis);
    this.secretBox = new SecretBox(encryptionKey);
  }

  async ask(params: AskParams): Promise<AskResult> {
    const configs = await AIProviderConfig.find({
      ownerId: params.userId,
      botInstanceId: params.botInstanceId,
      enabled: true,
    }).sort({ createdAt: 1 });

    if (!configs.length) {
      throw new ProviderError(
        'No AI provider configured for this user. Use /ayarla to add an API key.',
        'none',
        false,
      );
    }

    const chain = await Promise.all(
      configs.map(async (cfg) => {
        const keyDoc = await APIKey.findById(cfg.apiKeyId).select('+encryptedKey');
        if (!keyDoc) throw new Error('API key referenced by provider config not found');
        return {
          kind: cfg.provider as ProviderKind,
          model: cfg.selectedModel,
          creds: {
            apiKey: this.secretBox.decrypt(keyDoc.encryptedKey),
            baseUrl: keyDoc.baseUrl,
            headers: keyDoc.headers,
          },
        };
      }),
    );

    let conversation = params.conversationId
      ? await Conversation.findById(params.conversationId)
      : null;

    if (!conversation) {
      conversation = await Conversation.create({
        userId: params.userId,
        botInstanceId: params.botInstanceId,
        guildId: params.guildId,
        provider: chain[0].kind,
        model: chain[0].model,
      });
    }

    const context = await buildContext(conversation._id, params.prompt);

    await Message.create({ conversationId: conversation._id, role: 'user', content: params.prompt });

    logger.info({ event: LogEvent.AI_REQUEST, provider: chain[0].kind, userId: params.userId }, 'AI request');

    try {
      const result = await this.router.route({
        chain,
        chat: { model: chain[0].model, messages: context },
        fallbackEnabled: Boolean(params.fallbackEnabled),
      });

      await Message.create({ conversationId: conversation._id, role: 'assistant', content: result.content });

      await Usage.create({
        provider: result.providerId,
        model: result.model,
        userId: params.userId,
        botInstanceId: params.botInstanceId,
        guildId: params.guildId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        estimatedTokens: result.usage.estimated,
        latencyMs: result.latencyMs,
        status: 'success',
        estimatedCostUsd: estimateCostUsd(result.providerId, result.model, result.usage.inputTokens, result.usage.outputTokens),
      });

      logger.info({ event: LogEvent.AI_RESPONSE, provider: result.providerId, latencyMs: result.latencyMs }, 'AI response');

      return {
        conversationId: conversation._id,
        content: result.content,
        provider: result.providerId,
        model: result.model,
        usedFallback: result.usedFallback,
        latencyMs: result.latencyMs,
      };
    } catch (err) {
      const providerError = err instanceof ProviderError ? err : undefined;
      await Usage.create({
        provider: providerError?.providerId ?? chain[0].kind,
        model: chain[0].model,
        userId: params.userId,
        botInstanceId: params.botInstanceId,
        guildId: params.guildId,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedTokens: false,
        latencyMs: 0,
        status: 'error',
        error: providerError?.message ?? 'Unknown error',
      });
      logger.error({ event: LogEvent.PROVIDER_ERROR, err }, 'AI request failed');
      throw err;
    }
  }
}
