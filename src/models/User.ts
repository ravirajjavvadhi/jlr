import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password?: string;
  email?: string;
  custom_api_key?: string;
  gemini_api_keys?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: false },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  custom_api_key: { type: String, default: null },
  gemini_api_keys: { type: [String], default: [] },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
