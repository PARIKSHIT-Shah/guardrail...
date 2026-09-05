import mongoose from 'mongoose';

// Cache the connection across invocations so Vercel's serverless functions
// don't open a new MongoDB connection on every single request.
let cached = global._guardrailMongoose;
if (!cached) {
  cached = global._guardrailMongoose = { conn: null, promise: null };
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  // No URI configured -> app still works, just skips persistence.
  if (!uri) return null;

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error('MongoDB connection error:', err.message);
    return null;
  }

  return cached.conn;
}

const logSchema = new mongoose.Schema({
  input: { type: String, required: true },
  flagged: { type: Boolean, required: true, default: false },
  stage: { type: String, default: null }, // 'toxicity_injection' | 'policy' | null
  categories: { type: [String], default: [] },
  reasons: { type: [String], default: [] },
  finalOutput: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export function getLogModel() {
  return mongoose.models.GuardrailLog || mongoose.model('GuardrailLog', logSchema);
}
