import { runPipeline } from './_lib/rules.js';
import { connectDB, getLogModel } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const { text } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Request body must include a non-empty "text" string.' });
      return;
    }

    if (text.length > 4000) {
      res.status(400).json({ error: 'Text exceeds 4000 character limit.' });
      return;
    }

    const result = await runPipeline(text);

    // Best-effort logging — never let a DB hiccup break the API response.
    try {
      await connectDB();
      const Log = getLogModel();
      await Log.create({
        input: text,
        flagged: result.flagged,
        stage: result.stage,
        categories: result.categories,
        reasons: result.reasons,
        finalOutput: result.finalOutput
      });
    } catch (dbErr) {
      console.error('Failed to persist log:', dbErr.message);
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('Moderation pipeline error:', err);
    res.status(500).json({ error: 'Internal error while running moderation pipeline.' });
  }
}
