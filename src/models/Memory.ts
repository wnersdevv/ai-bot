import { Schema, model, Document, Types } from 'mongoose';

export interface IMemory extends Document {
  userId: Types.ObjectId;
  botInstanceId: Types.ObjectId;
  content: string;
  /** simple relevance tag/category to help retrieval without a vector DB in v1 */
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const memorySchema = new Schema<IMemory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    botInstanceId: { type: Schema.Types.ObjectId, ref: 'BotInstance', required: true, index: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Memory = model<IMemory>('Memory', memorySchema);
