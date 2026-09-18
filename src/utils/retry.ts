import { ProviderError } from '../providers/types';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 300,
  maxDelayMs: 4000,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn`, retrying only on errors explicitly marked retryable (e.g. 429/408/5xx),
 * with exponential backoff + jitter. Never retries forever, never retries
 * non-retryable errors (bad key, invalid request, etc.)
 */
export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig = DEFAULT_RETRY_CONFIG): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= config.maxRetries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = err instanceof ProviderError ? err.retryable : false;
      if (!retryable || attempt === config.maxRetries) {
        throw err;
      }
      const delay = Math.min(config.baseDelayMs * 2 ** attempt, config.maxDelayMs);
      const jitter = Math.random() * delay * 0.25;
      await sleep(delay + jitter);
      attempt += 1;
    }
  }

  throw lastError;
}
