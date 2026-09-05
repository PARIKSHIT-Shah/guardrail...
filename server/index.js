import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import moderateHandler from '../api/moderate.js';
import logsHandler from '../api/logs.js';
import healthHandler from '../api/health.js';

const app = express();
app.use(cors());
app.use(express.json());

// These are the exact same (req, res) handlers Vercel runs in production —
// running them behind Express locally keeps dev/prod behavior identical.
app.post('/api/moderate', moderateHandler);
app.get('/api/logs', logsHandler);
app.get('/api/health', healthHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Guardrail API dev server running at http://localhost:${PORT}`);
});
