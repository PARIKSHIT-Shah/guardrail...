import { connectDB, getLogModel } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    const conn = await connectDB();

    if (!conn) {
      res.status(200).json({ logs: [], persisted: false });
      return;
    }

    const Log = getLogModel();
    const logs = await Log.find({}).sort({ createdAt: -1 }).limit(50).lean();
    res.status(200).json({ logs, persisted: true });
  } catch (err) {
    console.error('Failed to fetch logs:', err);
    res.status(500).json({ error: 'Internal error while fetching logs.' });
  }
}
