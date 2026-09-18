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

/**
 * Official xAI Grok API adapter (api.x.ai/v1). xAI's API is OpenAI-compatible,
 * so the request/response shape mirrors the OpenAI adapter, but this stays a
 * separate class so xAI-specific quirks/models don't leak into OpenAIProvider.
 */
export class XAIProvider implements AIProvider {
  readonly id = 'xai';
  readonly name = 'xAI Grok';

  private http: AxiosInstance;
  private apiKey: string | null = null;

  constructor(creds?: ProviderCredentials) {
    this.http = createProviderHttpClient(this.id, creds?.baseUrl || 'https://api.x.ai/v1');
    if (creds) this.configure(creds);
  }

  configure(creds: ProviderCredentials): void {
    this.apiKey = creds.apiKey ?? null;
    if (creds.baseUrl) this.http = createProviderHttpClient(this.id, creds.baseUrl);
  }

  private authHeaders() {
    if (!this.apiKey) {
      throw new ProviderError('xAI API key not configured for this user', this.id, false);
    }
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    const start = Date.now();
    const res = await this.http.post(
      '/chat/completions',
      {
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      },
      { headers: this.authHeaders(), signal: options.signal },
    );

    const data = res.data;
    const usage = data.usage;
    return {
      providerId: this.id,
      model: options.model,
      content: data.choices?.[0]?.message?.content ?? '',
      usage: usage
        ? {
            inputTokens: usage.prompt_tokens ?? 0,
            outputTokens: usage.completion_tokens ?? 0,
            totalTokens: usage.total_tokens ?? 0,
            estimated: false,
          }
        : { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimated: true },
      latencyMs: Date.now() - start,
      raw: data,
    };
  }

  async models(): Promise<AIModel[]> {
    const res = await this.http.get('/models', { headers: this.authHeaders() });
    return (res.data.data ?? []).map((m: any) => ({ id: m.id, displayName: m.id }));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.http.get('/models', { headers: this.authHeaders() });
      return true;
    } catch {
      return false;
    }
  }
}
