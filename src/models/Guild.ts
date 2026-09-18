import { Schema, model, Document, Types } from 'mongoose';

export interface IGuild extends Document {
  botInstanceId: Types.ObjectId; // ref BotInstance
  guildId: string; // Discord guild id
  name: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const guildSchema = new Schema<IGuild>(
  {
    botInstanceId: { type: Schema.Types.ObjectId, ref: 'BotInstance', required: true, index: true },
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

guildSchema.index({ botInstanceId: 1, guildId: 1 }, { unique: true });

export const Guild = model<IGuild>('Guild', guildSchema);

export interface IGuildSettings extends Document {
  guildId: Types.ObjectId; // ref Guild
  prefix: string;
  language: 'tr' | 'en' | 'de' | 'es';
  fallbackEnabled: boolean;
  providerChain: string[]; // ordered provider kinds, e.g. ['openai', 'google']
  defaultModelByProvider: Record<string, string>;
  rateLimitPerMinuteOverride?: number;
  createdAt: Date;
  updatedAt: Date;
}

const guildSettingsSchema = new Schema<IGuildSettings>(
  {
    guildId: { type: Schema.Types.ObjectId, ref: 'Guild', required: true, unique: true },
    prefix: { type: String, default: 'w!' },
    language: { type: String, enum: ['tr', 'en', 'de', 'es'], default: 'tr' },
    fallbackEnabled: { type: Boolean, default: false },
    providerChain: { type: [String], default: [] },
    defaultModelByProvider: { type: Schema.Types.Mixed, default: {} },
    rateLimitPerMinuteOverride: { type: Number },
  },
  { timestamps: true },
);

export const GuildSettings = model<IGuildSettings>('GuildSettings', guildSettingsSchema);
