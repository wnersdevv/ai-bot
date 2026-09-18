import { AIProvider, ProviderCredentials } from '../types';
import { OpenAIProvider } from '../openai';
import { GoogleProvider } from '../google';
import { AnthropicProvider } from '../anthropic';
import { XAIProvider } from '../xai';
import { CustomProvider } from '../custom';

export type ProviderKind = 'openai' | 'google' | 'anthropic' | 'xai' | 'custom';

/**
 * Factory that builds a fresh, per-request-safe provider adapter instance
 * configured with one user's decrypted credentials. Adapters are cheap to
 * construct and are NOT shared/cached across users, so one tenant's key can
 * never leak into another tenant's request.
 */
export class ProviderManager {
  static readonly KNOWN_PROVIDERS: ProviderKind[] = ['openai', 'google', 'anthropic', 'xai', 'custom'];

  static create(kind: ProviderKind, creds: ProviderCredentials): AIProvider {
    switch (kind) {
      case 'openai':
        return new OpenAIProvider(creds);
      case 'google':
        return new GoogleProvider(creds);
      case 'anthropic':
        return new AnthropicProvider(creds);
      case 'xai':
        return new XAIProvider(creds);
      case 'custom':
        return new CustomProvider(creds);
      default:
        throw new Error(`Unknown provider kind: ${kind}`);
    }
  }
}
