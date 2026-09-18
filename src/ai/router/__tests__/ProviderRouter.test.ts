import Redis from 'ioredis-mock';
import { ProviderRouter } from '../ProviderRouter';
import * as PM from '../../../providers/provider-manager/ProviderManager';
import { ProviderError } from '../../../providers/types';

describe('ProviderRouter', () => {
  it('uses the primary provider when it succeeds', async () => {
    const redis = new Redis();
    const router = new ProviderRouter(redis as any);

    jest.spyOn(PM.ProviderManager, 'create').mockReturnValue({
      id: 'openai',
      name: 'OpenAI',
      configure: jest.fn(),
      chat: jest.fn().mockResolvedValue({
        providerId: 'openai',
        model: 'gpt-4o-mini',
        content: 'hi',
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, estimated: false },
        latencyMs: 10,
      }),
      models: jest.fn(),
      healthCheck: jest.fn(),
    } as any);

    const result = await router.route({
      chain: [{ kind: 'openai', creds: { apiKey: 'x' }, model: 'gpt-4o-mini' }],
      chat: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] },
      fallbackEnabled: false,
    });

    expect(result.usedFallback).toBe(false);
    expect(result.content).toBe('hi');
  });

  it('falls back to the secondary provider when the primary fails and fallback is enabled', async () => {
    const redis = new Redis();
    const router = new ProviderRouter(redis as any);

    let call = 0;
    jest.spyOn(PM.ProviderManager, 'create').mockImplementation((kind) => {
      call += 1;
      if (kind === 'openai') {
        return {
          id: 'openai',
          chat: jest.fn().mockRejectedValue(new ProviderError('down', 'openai', true)),
        } as any;
      }
      return {
        id: 'google',
        chat: jest.fn().mockResolvedValue({
          providerId: 'google',
          model: 'gemini-1.5-flash',
          content: 'fallback response',
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, estimated: false },
          latencyMs: 5,
        }),
      } as any;
    });

    const result = await router.route({
      chain: [
        { kind: 'openai', creds: { apiKey: 'x' }, model: 'gpt-4o-mini' },
        { kind: 'google', creds: { apiKey: 'y' }, model: 'gemini-1.5-flash' },
      ],
      chat: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] },
      fallbackEnabled: true,
    });

    expect(result.usedFallback).toBe(true);
    expect(result.providerId).toBe('google');
  });

  it('does NOT fall back when fallback is disabled, even if primary fails', async () => {
    const redis = new Redis();
    const router = new ProviderRouter(redis as any);

    jest.spyOn(PM.ProviderManager, 'create').mockReturnValue({
      id: 'openai',
      chat: jest.fn().mockRejectedValue(new ProviderError('down', 'openai', false)),
    } as any);

    await expect(
      router.route({
        chain: [
          { kind: 'openai', creds: { apiKey: 'x' }, model: 'gpt-4o-mini' },
          { kind: 'google', creds: { apiKey: 'y' }, model: 'gemini-1.5-flash' },
        ],
        chat: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] },
        fallbackEnabled: false,
      }),
    ).rejects.toThrow();
  });
});
