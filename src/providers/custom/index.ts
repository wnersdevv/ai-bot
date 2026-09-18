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
 * Generic OpenAI-compatible custom provider. The user supplies baseUrl, apiKey,
 * model and optional extra headers. This never assumes or advertises
 * "unlimited free AI" - it is a pass-through to whatever endpoint the user configures.
 */
export class CustomProvider implements AIProvider {
  readonly id = 'custom';
  readonly name = 'Custom Provider';

  private http: AxiosInstance;
  private apiKey: string | null = null;
  private extraHeaders: Record<string, string> = {};

  constructor(creds?: ProviderCredentials) {
    if (!creds?.baseUrl) {
      throw new ProviderError('Custom provider requires a baseUrl', this.id, false);
    }
    this.http = createProviderHttpClient(this.id, creds.baseUrl);
    this.configure(creds);
  }

  configure(creds: ProviderCredentials): void {
    this.apiKey = creds.apiKey ?? null;
    this.extraHeaders = creds.headers ?? {};
    if (creds.baseUrl) this.http = createProviderHttpClient(this.id, creds.baseUrl);
  }

  private headers() {
    return {
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      ...this.extraHeaders,
    };
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
      { headers: this.headers(), signal: options.signal },
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
    try {
      const res = await this.http.get('/models', { headers: this.headers() });
      return (res.data.data ?? []).map((m: any) => ({ id: m.id, displayName: m.id }));
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.http.get('/models', { headers: this.headers() });
      return true;
    } catch {
      return false;
    }
  }
}
