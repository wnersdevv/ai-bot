import { Schema, model, Document, Types } from 'mongoose';

export type ProviderKind = 'openai' | 'google' | 'anthropic' | 'xai' | 'custom';

export interface IAPIKey extends Document {
  ownerId: Types.ObjectId; // ref User
  provider: ProviderKind;
  label: string;
  /** AES-256-GCM encrypted payload - see security/encryption.ts. Never returned in API responses. */
  encryptedKey: string;
  baseUrl?: string; // for custom provider
  headers?: Record<string, string>; // for custom provider
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IAPIKey>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['openai', 'google', 'anthropic', 'xai', 'custom'], required: true },
    label: { type: String, required: true },
    encryptedKey: { type: String, required: true, select: false },
    baseUrl: { type: String },
    headers: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);

apiKeySchema.index({ ownerId: 1, provider: 1 });

export const APIKey = model<IAPIKey>('APIKey', apiKeySchema);
