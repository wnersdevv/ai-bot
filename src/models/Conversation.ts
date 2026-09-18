import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  userId: Types.ObjectId;
  botInstanceId: Types.ObjectId;
  guildId?: Types.ObjectId;
  provider: string;
  model: string;
  title?: string;
  summary?: string; // rolling compact summary once context window fills, per Memory Engine
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    botInstanceId: { type: Schema.Types.ObjectId, ref: 'BotInstance', required: true, index: true },
    guildId: { type: Schema.Types.ObjectId, ref: 'Guild' },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    title: { type: String },
    summary: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Conversation = model<IConversation>('Conversation', conversationSchema);

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tokenCount?: number;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['system', 'user', 'assistant', 'tool'], required: true },
    content: { type: String, required: true },
    tokenCount: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Message = model<IMessage>('Message', messageSchema);
