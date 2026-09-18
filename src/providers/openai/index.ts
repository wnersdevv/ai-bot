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
 * Official OpenAI REST API adapter (api.openai.com/v1).
 * No leaked/cracked keys, no bypass logic - this only ever talks to the
 * documented, official endpoints using the credentials the user supplied.
 */
export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';

  private http: AxiosInstance;
  private apiKey: string | null = null;

  constructor(creds?: ProviderCredentials) {
    this.http = createProviderHttpClient(this.id, creds?.baseUrl || 'https://api.openai.com/v1');
    if (creds) this.configure(creds);
  }

  configure(creds: ProviderCredentials): void {
    this.apiKey = creds.apiKey ?? null;
    if (creds.baseUrl) {
      this.http = createProviderHttpClient(this.id, creds.baseUrl);
    }
  }

  private authHeaders() {
    if (!this.apiKey) {
      throw new ProviderError('OpenAI API key not configured for this user', this.id, false);
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
        stream: false,
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
    return (res.data.data ?? [])
      .filter((m: any) => typeof m.id === 'string')
      .map((m: any) => ({ id: m.id, displayName: m.id }));
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
