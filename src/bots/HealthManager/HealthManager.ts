import { ProviderManager, ProviderKind } from '../../providers/provider-manager/ProviderManager';
import { ProviderCredentials } from '../../providers/types';

export type HealthStatus = 'online' | 'degraded' | 'offline';

export interface ProviderHealth {
  provider: ProviderKind;
  status: HealthStatus;
  checkedAt: Date;
}

/**
 * Periodic health checks per provider, per user credentials, surfaced on the
 * Bot Manager Dashboard as 🟢 Online / 🟡 Degraded / 🔴 Offline.
 */
export class HealthManager {
  private cache = new Map<string, ProviderHealth>();

  async check(kind: ProviderKind, creds: ProviderCredentials): Promise<ProviderHealth> {
    const provider = ProviderManager.create(kind, creds);
    let status: HealthStatus;
    try {
      const ok = await provider.healthCheck();
      status = ok ? 'online' : 'offline';
    } catch {
      status = 'degraded';
    }
    const result: ProviderHealth = { provider: kind, status, checkedAt: new Date() };
    this.cache.set(kind, result);
    return result;
  }

  getCached(kind: ProviderKind): ProviderHealth | undefined {
    return this.cache.get(kind);
  }

  allCached(): ProviderHealth[] {
    return Array.from(this.cache.values());
  }
}
