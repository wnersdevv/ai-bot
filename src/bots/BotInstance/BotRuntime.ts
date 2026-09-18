import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { Types } from 'mongoose';
import Redis from 'ioredis';
import { logger, LogEvent } from '../../utils/logger';
import { BotInstance } from '../../models/BotInstance';
import { registerInteractionHandlers } from '../../components';
import { registerPrefixHandler } from '../../prefix/prefixHandler';
import { AIService } from '../../services/AIService';
import { buildToolManager } from '../../ai/tools';

/** Minimal shape BotRuntime needs from BotManager - avoids a circular import (BotManager -> BotRuntime -> BotManager). */
export interface BotManagerLike {
  startBot(id: Types.ObjectId): Promise<void>;
  stopBot(id: Types.ObjectId): Promise<void>;
  restartBot(id: Types.ObjectId): Promise<void>;
}

export interface BotRuntimeDeps {
  aiService: AIService;
  encryptionKey: string;
  redis: Redis;
  botManager: BotManagerLike;
}

/**
 * One Discord client for one BotInstance document. BotManager owns a
 * collection of these. Kept intentionally thin - slash/prefix routing lives
 * in commands/ and prefix/, both calling the same AIService.
 */
export class BotRuntime {
  public client: Client;
  public readonly botInstanceId: Types.ObjectId;
  private token: string;

  constructor(botInstanceId: Types.ObjectId, token: string, private deps: BotRuntimeDeps) {
    this.botInstanceId = botInstanceId;
    this.token = token;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
      partials: [Partials.Channel],
    });
  }

  async start(): Promise<void> {
    const toolManager = buildToolManager(this.client, this.deps.redis);
    registerInteractionHandlers(
      this.client,
      this.deps.aiService,
      this.botInstanceId,
      this.deps.encryptionKey,
      this.deps.redis,
      this.deps.botManager,
      toolManager,
    );
    registerPrefixHandler(this.client, this.deps.aiService, this.botInstanceId);

    this.client.once('ready', async () => {
      logger.info({ event: LogEvent.BOT_START, botInstanceId: this.botInstanceId }, `Bot online as ${this.client.user?.tag}`);
      await BotInstance.findByIdAndUpdate(this.botInstanceId, {
        status: 'online',
        guildCount: this.client.guilds.cache.size,
      });
    });

    this.client.on('error', async (err) => {
      logger.error({ err, botInstanceId: this.botInstanceId }, 'Bot client error');
      await BotInstance.findByIdAndUpdate(this.botInstanceId, { status: 'error', lastError: err.message });
    });

    await this.client.login(this.token);
  }

  async stop(): Promise<void> {
    await this.client.destroy();
    logger.info({ event: LogEvent.BOT_STOP, botInstanceId: this.botInstanceId }, 'Bot stopped');
    await BotInstance.findByIdAndUpdate(this.botInstanceId, { status: 'offline' });
  }
}
