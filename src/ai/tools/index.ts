import { Client } from 'discord.js';
import Redis from 'ioredis';
import { ToolManager } from './ToolManager';
import { calculatorTool } from './calculator';
import { webSearchTool } from './webSearch';
import { createDiscordInfoTool, createUserInfoTool, createServerInfoTool } from './discordTools';

/**
 * Builds the one ToolManager instance for a given bot's Client. This is the
 * complete tool registry for WNERSAI - nothing outside this file registers
 * additional tools, and this file registers no moderation-capable tool.
 */
export function buildToolManager(client: Client, redis: Redis): ToolManager {
  const manager = new ToolManager(redis);
  manager.register(calculatorTool);
  manager.register(webSearchTool);
  manager.register(createDiscordInfoTool(client));
  manager.register(createUserInfoTool(client));
  manager.register(createServerInfoTool(client));
  return manager;
}
