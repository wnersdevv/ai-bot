import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  discordId: string;
  username: string;
  language: 'tr' | 'en' | 'de' | 'es';
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    discordId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    language: { type: String, enum: ['tr', 'en', 'de', 'es'], default: 'tr' },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);
