import { Schema, model, Document, Types } from 'mongoose';

/**
 * WNERSAI-issued API keys (wners_live_xxx) for third-party apps to call the
 * /v1/* Web API. Only the SHA-256 hash is stored - the raw key is shown to
 * the user exactly once, at creation time, and never again.
 */
export interface IPlatformAPIKey extends Document {
  ownerId: Types.ObjectId;
  label: string;
  hashedKey: string;
  prefix: string; // first few chars shown in UI for identification, e.g. "wners_live_ab12"
  lastUsedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const platformAPIKeySchema = new Schema<IPlatformAPIKey>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, required: true },
    hashedKey: { type: String, required: true, unique: true, select: false },
    prefix: { type: String, required: true },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PlatformAPIKey = model<IPlatformAPIKey>('PlatformAPIKey', platformAPIKeySchema);
