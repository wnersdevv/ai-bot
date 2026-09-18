import { Client } from 'discord.js';
import { ToolDefinition, ToolError } from '../types';

/**
 * These three tools are strictly READ-ONLY. There is no tool anywhere in
 * this system that bans, kicks, manages roles, deletes channels, touches
 * bot tokens, or changes admin permissions - that capability simply does
 * not exist in the tool layer, by design (see spec's AI Permissions section).
 */

interface DiscordInfoArgs {
  topic: 'ping' | 'uptime';
}

export function createDiscordInfoTool(client: Client): ToolDefinition<DiscordInfoArgs, Record<string, unknown>> {
  return {
    name: 'discord-info',
    description: 'Returns basic read-only info about the bot itself (ping, uptime)',
    timeoutMs: 2_000,
    rateLimitPerMinute: 20,
    validate: (args: unknown) => {
      const topic = (args as any)?.topic;
      if (topic !== 'ping' && topic !== 'uptime') {
        throw new ToolError('topic must be "ping" or "uptime"', 'validation');
      }
      return { topic };
    },
    execute: async ({ topic }) => {
      if (topic === 'ping') return { wsPingMs: client.ws.ping };
      return { uptimeMs: client.uptime ?? 0 };
    },
  };
}

interface UserInfoArgs {
  userId: string;
}

export function createUserInfoTool(client: Client): ToolDefinition<UserInfoArgs, Record<string, unknown>> {
  return {
    name: 'user-info',
    description: 'Returns basic public profile info for a Discord user id (read-only)',
    timeoutMs: 3_000,
    rateLimitPerMinute: 20,
    validate: (args: unknown) => {
      const userId = (args as any)?.userId;
      if (typeof userId !== 'string' || !/^\d{5,25}$/.test(userId)) {
        throw new ToolError('userId must be a valid Discord snowflake', 'validation');
      }
      return { userId };
    },
    execute: async ({ userId }) => {
      try {
        const user = await client.users.fetch(userId);
        return { id: user.id, username: user.username, createdAt: user.createdAt.toISOString(), bot: user.bot };
      } catch {
        throw new ToolError('User not found', 'execution');
      }
    },
  };
}

interface ServerInfoArgs {
  guildId: string;
}

export function createServerInfoTool(client: Client): ToolDefinition<ServerInfoArgs, Record<string, unknown>> {
  return {
    name: 'server-info',
    description: 'Returns basic public info about a guild the bot is in (read-only)',
    timeoutMs: 3_000,
    rateLimitPerMinute: 20,
    validate: (args: unknown) => {
      const guildId = (args as any)?.guildId;
      if (typeof guildId !== 'string' || !/^\d{5,25}$/.test(guildId)) {
        throw new ToolError('guildId must be a valid Discord snowflake', 'validation');
      }
      return { guildId };
    },
    execute: async ({ guildId }) => {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) throw new ToolError('Bot is not in that guild', 'execution');
      return {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        createdAt: guild.createdAt.toISOString(),
      };
    },
  };
}
