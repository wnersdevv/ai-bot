import { Schema, model, Document, Types } from 'mongoose';

/**
 * Per-user/per-bot provider configuration: which providers are enabled,
 * which model is currently selected, and (for custom) connection details.
 * Actual secret material lives in APIKey, referenced here by id.
 */
export interface IAIProviderConfig extends Document {
  ownerId: Types.ObjectId; // ref User
  botInstanceId?: Types.ObjectId; // ref BotInstance, optional (guild-level override)
  provider: 'openai' | 'google' | 'anthropic' | 'xai' | 'custom';
  apiKeyId: Types.ObjectId; // ref APIKey
  selectedModel: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const aiProviderConfigSchema = new Schema<IAIProviderConfig>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    botInstanceId: { type: Schema.Types.ObjectId, ref: 'BotInstance' },
    provider: { type: String, enum: ['openai', 'google', 'anthropic', 'xai', 'custom'], required: true },
    apiKeyId: { type: Schema.Types.ObjectId, ref: 'APIKey', required: true },
    selectedModel: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

aiProviderConfigSchema.index({ ownerId: 1, provider: 1, botInstanceId: 1 }, { unique: true });

export const AIProviderConfig = model<IAIProviderConfig>('AIProviderConfig', aiProviderConfigSchema);

/**
 * Cached copy of a provider's model list (refreshed periodically via
 * provider.models()) so /model can render instantly without an API round trip
 * every time, per "model list should be dynamic, don't trust hardcoded lists".
 */
export interface IAIModelCache extends Document {
  provider: string;
  modelId: string;
  displayName: string;
  contextWindow?: number;
  fetchedAt: Date;
}

const aiModelCacheSchema = new Schema<IAIModelCache>({
  provider: { type: String, required: true, index: true },
  modelId: { type: String, required: true },
  displayName: { type: String, required: true },
  contextWindow: { type: Number },
  fetchedAt: { type: Date, default: Date.now },
});

aiModelCacheSchema.index({ provider: 1, modelId: 1 }, { unique: true });

export const AIModelCache = model<IAIModelCache>('AIModelCache', aiModelCacheSchema);
