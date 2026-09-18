import Redis from 'ioredis';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitConfig {
  failureThreshold: number; // consecutive failures before opening
  cooldownMs: number; // how long to stay OPEN before trying a health check
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  cooldownMs: 60_000,
};

/**
 * Per-provider (optionally per-user) circuit breaker backed by Redis so state
 * is shared across worker processes. OPEN -> temporarily disabled -> cooldown
 * -> health check -> CLOSED, as specced.
 */
export class CircuitBreaker {
  constructor(
    private redis: Redis,
    private config: CircuitConfig = DEFAULT_CONFIG,
  ) {}

  private key(providerId: string) {
    return `wnersai:circuit:${providerId}`;
  }

  async getState(providerId: string): Promise<CircuitState> {
    const raw = await this.redis.hgetall(this.key(providerId));
    if (!raw.state) return 'CLOSED';
    if (raw.state === 'OPEN' && raw.openedAt) {
      const openedAt = parseInt(raw.openedAt, 10);
      if (Date.now() - openedAt >= this.config.cooldownMs) {
        return 'HALF_OPEN';
      }
    }
    return raw.state as CircuitState;
  }

  async recordSuccess(providerId: string): Promise<void> {
    await this.redis.del(this.key(providerId));
  }

  async recordFailure(providerId: string): Promise<void> {
    const key = this.key(providerId);
    const failures = await this.redis.hincrby(key, 'failures', 1);
    if (failures >= this.config.failureThreshold) {
      await this.redis.hset(key, { state: 'OPEN', openedAt: Date.now().toString() });
    }
  }

  async isAvailable(providerId: string): Promise<boolean> {
    const state = await this.getState(providerId);
    return state !== 'OPEN';
  }
}
