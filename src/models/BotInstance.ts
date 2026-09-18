import { Schema, model, Document, Types } from 'mongoose';

export type BotStatus = 'online' | 'offline' | 'starting' | 'stopping' | 'error';

export interface IBotInstance extends Document {
  ownerId: Types.ObjectId; // ref User - multi-tenant isolation boundary
  name: string;
  /** AES-256-GCM encrypted Discord bot token - never plaintext, never logged, never sent to frontend */
  encryptedToken: string;
  status: BotStatus;
  guildCount: number;
  userCount: number;
  defaultPrefix: string;
  defaultProviderKind?: string;
  defaultModel?: string;
  language: 'tr' | 'en' | 'de' | 'es';
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const botInstanceSchema = new Schema<IBotInstance>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    encryptedToken: { type: String, required: true, select: false },
    status: { type: String, enum: ['online', 'offline', 'starting', 'stopping', 'error'], default: 'offline' },
    guildCount: { type: Number, default: 0 },
    userCount: { type: Number, default: 0 },
    defaultPrefix: { type: String, default: 'w!' },
    defaultProviderKind: { type: String },
    defaultModel: { type: String },
    language: { type: String, enum: ['tr', 'en', 'de', 'es'], default: 'tr' },
    lastError: { type: String },
  },
  { timestamps: true },
);

botInstanceSchema.index({ ownerId: 1, name: 1 }, { unique: true });

export const BotInstance = model<IBotInstance>('BotInstance', botInstanceSchema);
