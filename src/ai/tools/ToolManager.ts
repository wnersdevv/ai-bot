import { PermissionsBitField } from 'discord.js';
import Redis from 'ioredis';
import { ToolDefinition, ToolError, ToolExecutionContext } from './types';
import { ToolRateLimiter } from './ToolRateLimiter';
import { logger } from '../../utils/logger';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ToolError(`Tool execution timed out after ${ms}ms`, 'timeout')), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * The ONLY way the AI (or anything else) may invoke a tool. Every call goes
 * through, in order: validation -> user permission check -> bot permission
 * check -> rate limit -> timeout-bounded execution. No tool is reachable by
 * any other path, and no tool in this system's registry performs a
 * ban/kick/role/channel-delete/token/admin-permission action - see
 * discordTools.ts and the calculator/webSearch tools for what actually
 * exists.
 */
export class ToolManager {
  private tools = new Map<string, ToolDefinition>();
  private rateLimiter: ToolRateLimiter;

  constructor(redis: Redis) {
    this.rateLimiter = new ToolRateLimiter(redis);
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  list(): Array<{ name: string; description: string }> {
    return Array.from(this.tools.values()).map((t) => ({ name: t.name, description: t.description }));
  }

  async call(toolName: string, rawArgs: unknown, ctx: ToolExecutionContext): Promise<unknown> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new ToolError(`Unknown tool: ${toolName}`, 'validation');
    }

    const args = tool.validate(rawArgs);

    if (tool.requiredUserPermissions?.length) {
      const userPerms = new PermissionsBitField(ctx.userPermissions ?? 0n);
      const missing = tool.requiredUserPermissions.filter((p) => !userPerms.has(p));
      if (missing.length) {
        throw new ToolError('Calling user lacks required permission(s) for this tool', 'permission');
      }
    }

    if (tool.requiredBotPermissions?.length) {
      const botPerms = new PermissionsBitField(ctx.botPermissions ?? 0n);
      const missing = tool.requiredBotPermissions.filter((p) => !botPerms.has(p));
      if (missing.length) {
        throw new ToolError('Bot lacks required permission(s) for this tool in this guild', 'permission');
      }
    }

    const allowed = await this.rateLimiter.allow(ctx.discordUserId, tool.name, tool.rateLimitPerMinute);
    if (!allowed) {
      throw new ToolError(`Rate limit exceeded for tool "${tool.name}"`, 'rate_limit');
    }

    try {
      return await withTimeout(tool.execute(args, ctx), tool.timeoutMs);
    } catch (err) {
      logger.warn({ tool: tool.name, err }, 'Tool execution failed');
      throw err;
    }
  }
}
