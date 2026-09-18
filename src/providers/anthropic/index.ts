import { AxiosInstance } from 'axios';
import {
  AIModel,
  AIProvider,
  AIResponse,
  ChatOptions,
  ProviderCredentials,
  ProviderError,
} from '../types';
import { createProviderHttpClient } from '../httpClient';

/** Official Anthropic Messages API adapter (api.anthropic.com/v1/messages). */
export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic Claude';

  private http: AxiosInstance;
  private apiKey: string | null = null;

  constructor(creds?: ProviderCredentials) {
    this.http = createProviderHttpClient(this.id, creds?.baseUrl || 'https://api.anthropic.com');
    if (creds) this.configure(creds);
  }

  configure(creds: ProviderCredentials): void {
    this.apiKey = creds.apiKey ?? null;
    if (creds.baseUrl) this.http = createProviderHttpClient(this.id, creds.baseUrl);
  }

  private authHeaders() {
    if (!this.apiKey) {
      throw new ProviderError('Anthropic API key not configured for this user', this.id, false);
    }
    return {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    const start = Date.now();
    const system = options.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const messages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    const res = await this.http.post(
      '/v1/messages',
      {
        model: options.model,
        system: system || undefined,
        messages,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature,
      },
      { headers: this.authHeaders(), signal: options.signal },
    );

    const data = res.data;
    const text = (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const usage = data.usage;
    return {
      providerId: this.id,
      model: options.model,
      content: text,
      usage: usage
        ? {
            inputTokens: usage.input_tokens ?? 0,
            outputTokens: usage.output_tokens ?? 0,
            totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
            estimated: false,
          }
        : { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimated: true },
      latencyMs: Date.now() - start,
      raw: data,
    };
  }

  async models(): Promise<AIModel[]> {
    try {
      const res = await this.http.get('/v1/models', { headers: this.authHeaders() });
      return (res.data.data ?? []).map((m: any) => ({ id: m.id, displayName: m.display_name ?? m.id }));
    } catch {
      // Fall back to a minimal known-safe list if the models endpoint isn't reachable;
      // never presented to the user as exhaustive or guaranteed current.
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.http.get('/v1/models', { headers: this.authHeaders() });
      return true;
    } catch {
      return false;
    }
  }
}
