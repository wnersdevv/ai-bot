import { Types } from 'mongoose';

/**
 * Every tool the AI can call must declare what it needs. The AI itself
 * NEVER gets direct access to ban/kick/role-management/channel-deletion/
 * token access/admin-permission-change - those actions simply have no
 * corresponding Tool implementation in this system (see ToolManager).
 */
export interface ToolExecutionContext {
  discordUserId: string;
  guildId?: string;
  /** Discord permission bitfield of the invoking user, if known */
  userPermissions?: bigint;
  /** Discord permission bitfield of the bot in this guild, if known */
  botPermissions?: bigint;
  botInstanceId: Types.ObjectId;
}

export interface ToolDefinition<TArgs = any, TResult = any> {
  name: string;
  description: string;
  /** JSON-schema-ish shape used both for AI function-calling declarations and for validating args at runtime */
  validate: (args: unknown) => TArgs;
  /** required Discord permission bits the CALLING USER must have, if any */
  requiredUserPermissions?: bigint[];
  /** required Discord permission bits the BOT must have, if any */
  requiredBotPermissions?: bigint[];
  timeoutMs: number;
  rateLimitPerMinute: number;
  execute: (args: TArgs, ctx: ToolExecutionContext) => Promise<TResult>;
}

export class ToolError extends Error {
  constructor(message: string, public readonly code: 'validation' | 'permission' | 'timeout' | 'rate_limit' | 'execution') {
    super(message);
    this.name = 'ToolError';
  }
}
