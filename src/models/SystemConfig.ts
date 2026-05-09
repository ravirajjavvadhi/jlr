import mongoose from 'mongoose';

const SystemConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.SystemConfig || mongoose.model('SystemConfig', SystemConfigSchema);
