import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface IChat extends Document {
  id: string; // Internal ChatID string
  userId: string;
  title: string;
  messages: IMessage[];
  aiModel?: string;
  updatedAt: Date;
  createdAt: Date;
}

const ChatSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, default: 'New Power Session' },
  messages: { type: Array, default: [] },
  aiModel: { type: String, default: 'Gemini 2.0 Pro' },
  // [SOVEREIGN PURGE]: Chats are automatically purged from the cloud after 5 days
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 
    index: { expires: '0s' } 
  }
}, { timestamps: true });

// Ensure we don't re-compile the model on hot reloads
const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

export default Chat;
