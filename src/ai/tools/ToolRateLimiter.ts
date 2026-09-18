import Redis from 'ioredis';

/** Fixed 60s window rate limiter, shared with other Redis-backed state (circuit breaker). */
export class ToolRateLimiter {
  constructor(private redis: Redis) {}

  private key(discordUserId: string, toolName: string): string {
    const bucket = Math.floor(Date.now() / 60_000);
    return `wnersai:toolrate:${discordUserId}:${toolName}:${bucket}`;
  }

  async allow(discordUserId: string, toolName: string, limitPerMinute: number): Promise<boolean> {
    const key = this.key(discordUserId, toolName);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 60);
    }
    return count <= limitPerMinute;
  }
}
