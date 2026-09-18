import Redis from 'ioredis';
import { AIResponse, ChatOptions, ProviderCredentials, ProviderError } from '../../providers/types';
import { ProviderKind, ProviderManager } from '../../providers/provider-manager/ProviderManager';
import { CircuitBreaker } from './CircuitBreaker';
import { withRetry } from '../../utils/retry';

export interface RouteRequest {
  /** ordered list: first is primary, rest are fallback in order, as configured by the user */
  chain: Array<{ kind: ProviderKind; creds: ProviderCredentials; model: string }>;
  chat: ChatOptions;
  timeoutMs?: number;
  /** fallback only fires if the user has explicitly enabled it AND has a key for that provider */
  fallbackEnabled: boolean;
}

export interface RouteResult extends AIResponse {
  /** true if this response came from anything other than chain[0] */
  usedFallback: boolean;
  attemptedProviders: string[];
}

/**
 * Central AI Gateway entry point used by both slash and prefix command
 * handlers (via AIService) - see "command compatibility" in the spec.
 * Handles: provider selection, model selection (via chain[i].model),
 * timeout, retry, circuit breaker, and fallback - never business logic
 * duplication between Discord entry points.
 */
export class ProviderRouter {
  private breaker: CircuitBreaker;

  constructor(redis: Redis) {
    this.breaker = new CircuitBreaker(redis);
  }

  async route(req: RouteRequest): Promise<RouteResult> {
    const attempted: string[] = [];
    const steps = req.fallbackEnabled ? req.chain : req.chain.slice(0, 1);

    let lastError: unknown;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      attempted.push(step.kind);

      const available = await this.breaker.isAvailable(step.kind);
      if (!available) continue;

      try {
        const provider = ProviderManager.create(step.kind, step.creds);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 30_000);

        const response = await withRetry(() =>
          provider.chat({ ...req.chat, model: step.model, signal: controller.signal }),
        );

        clearTimeout(timeout);
        await this.breaker.recordSuccess(step.kind);

        return { ...response, usedFallback: i > 0, attemptedProviders: attempted };
      } catch (err) {
        lastError = err;
        await this.breaker.recordFailure(step.kind);
        // fall through to next provider in chain, if fallback enabled
      }
    }

    if (lastError instanceof ProviderError) throw lastError;
    throw new ProviderError(
      'All configured providers failed or are unavailable',
      attempted.join(',') || 'none',
      false,
      undefined,
      lastError,
    );
  }
}
