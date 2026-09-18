import { Schema, model, Document, Types } from 'mongoose';

export interface IUsage extends Document {
  provider: string;
  model: string;
  userId?: Types.ObjectId;
  botInstanceId?: Types.ObjectId;
  guildId?: Types.ObjectId;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedTokens: boolean;
  latencyMs: number;
  status: 'success' | 'error';
  error?: string;
  /** cost is only populated when a configurable pricing table has an entry for this model */
  estimatedCostUsd?: number | null;
  createdAt: Date;
}

const usageSchema = new Schema<IUsage>(
  {
    provider: { type: String, required: true, index: true },
    model: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    botInstanceId: { type: Schema.Types.ObjectId, ref: 'BotInstance', index: true },
    guildId: { type: Schema.Types.ObjectId, ref: 'Guild' },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedTokens: { type: Boolean, default: false },
    latencyMs: { type: Number, required: true },
    status: { type: String, enum: ['success', 'error'], required: true },
    error: { type: String },
    estimatedCostUsd: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

usageSchema.index({ createdAt: -1 });

export const Usage = model<IUsage>('Usage', usageSchema);

export interface IAuditLog extends Document {
  actorUserId?: Types.ObjectId;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    targetType: { type: String },
    targetId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
