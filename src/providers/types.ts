/**
 * WNERSAI - Core Provider Contract
 * Every AI provider adapter (OpenAI, Google, Anthropic, xAI, Custom) implements this
 * interface. Nothing above this layer (router, commands, services) is allowed to
 * import a provider-specific SDK directly - they only ever talk to `AIProvider`.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  /** per-request abort signal so the router can enforce timeouts */
  signal?: AbortSignal;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** true if the provider did not return real usage and we estimated it */
  estimated: boolean;
}

export interface AIResponse {
  providerId: string;
  model: string;
  content: string;
  usage: AIUsage;
  latencyMs: number;
  raw?: unknown;
}

export interface AIModel {
  id: string;
  displayName: string;
  contextWindow?: number;
  supportsTools?: boolean;
  supportsVision?: boolean;
}

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly retryable: boolean,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;

  /** Configure this adapter instance with a specific user's credentials. */
  configure(creds: ProviderCredentials): void;

  chat(options: ChatOptions): Promise<AIResponse>;

  models(): Promise<AIModel[]>;

  healthCheck(): Promise<boolean>;
}
