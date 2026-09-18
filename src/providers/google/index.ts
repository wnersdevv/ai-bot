import { AxiosInstance } from 'axios';
import {
  AIModel,
  AIProvider,
  AIResponse,
  ChatMessage,
  ChatOptions,
  ProviderCredentials,
  ProviderError,
} from '../types';
import { createProviderHttpClient } from '../httpClient';

/** Official Google Gemini API adapter (generativelanguage.googleapis.com). */
export class GoogleProvider implements AIProvider {
  readonly id = 'google';
  readonly name = 'Google Gemini';

  private http: AxiosInstance;
  private apiKey: string | null = null;

  constructor(creds?: ProviderCredentials) {
    this.http = createProviderHttpClient(
      this.id,
      creds?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
    );
    if (creds) this.configure(creds);
  }

  configure(creds: ProviderCredentials): void {
    this.apiKey = creds.apiKey ?? null;
    if (creds.baseUrl) this.http = createProviderHttpClient(this.id, creds.baseUrl);
  }

  private requireKey(): string {
    if (!this.apiKey) {
      throw new ProviderError('Google Gemini API key not configured for this user', this.id, false);
    }
    return this.apiKey;
  }

  private toGeminiContents(messages: ChatMessage[]) {
    // Gemini has no "system" role in the contents array; fold it into the first user turn.
    const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
    const rest = messages.filter((m) => m.role !== 'system');
    const contents = rest.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    if (systemParts.length && contents.length) {
      contents[0].parts.unshift({ text: systemParts.join('\n') + '\n' });
    }
    return contents;
  }

  async chat(options: ChatOptions): Promise<AIResponse> {
    const start = Date.now();
    const key = this.requireKey();
    const res = await this.http.post(
      `/models/${encodeURIComponent(options.model)}:generateContent?key=${key}`,
      {
        contents: this.toGeminiContents(options.messages),
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        },
      },
      { signal: options.signal },
    );

    const data = res.data;
    const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    const usageMeta = data.usageMetadata;
    return {
      providerId: this.id,
      model: options.model,
      content: text,
      usage: usageMeta
        ? {
            inputTokens: usageMeta.promptTokenCount ?? 0,
            outputTokens: usageMeta.candidatesTokenCount ?? 0,
            totalTokens: usageMeta.totalTokenCount ?? 0,
            estimated: false,
          }
        : { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimated: true },
      latencyMs: Date.now() - start,
      raw: data,
    };
  }

  async models(): Promise<AIModel[]> {
    const key = this.requireKey();
    const res = await this.http.get(`/models?key=${key}`);
    return (res.data.models ?? []).map((m: any) => ({
      id: m.name?.replace('models/', '') ?? m.name,
      displayName: m.displayName ?? m.name,
      contextWindow: m.inputTokenLimit,
    }));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.models();
      return true;
    } catch {
      return false;
    }
  }
}
