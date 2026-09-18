import { withRetry } from '../retry';
import { ProviderError } from '../../providers/types';

describe('withRetry', () => {
  it('returns immediately on success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries retryable errors up to maxRetries then throws', async () => {
    const fn = jest.fn().mockRejectedValue(new ProviderError('down', 'openai', true));
    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 })).rejects.toThrow('down');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry a non-retryable error', async () => {
    const fn = jest.fn().mockRejectedValue(new ProviderError('bad key', 'openai', false));
    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 })).rejects.toThrow('bad key');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('recovers if a later attempt succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new ProviderError('down', 'openai', true))
      .mockResolvedValueOnce('recovered');
    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
