# Guardrail — Content Moderation Pipeline

A 3-stage moderation API (Model Chain Prompting): every message passes through
**Toxicity & Prompt-Injection Check → Content Policy Validation → Final Output
Generation**. Built as React (Vite) + serverless Node functions + MongoDB, 

## Stack

- **Frontend:** React (Vite), no extra framework — split-screen console (input
  left, verdict right) plus a live activity log.
- **Backend:** Node serverless functions in `/api` (Vercel's zero-config
  format — no Express needed in production).
- **Database:** MongoDB (Atlas free tier works) via Mongoose, with a
  serverless-safe cached connection. If `MONGODB_URI` isn't set, the app still
  works — it just skips persistence.
- **Local dev:** a thin Express server (`server/index.js`) that imports the
  *exact same* handler files as production, so dev and prod behavior match.

## Project structure

```
├── api/                  # Vercel serverless functions (production API)
│   ├── _lib/
│   │   ├── db.js         # Mongoose connection + Log model
│   │   └── rules.js      # The 3-stage moderation pipeline
│   ├── moderate.js       # POST /api/moderate
│   ├── logs.js           # GET  /api/logs
│   └── health.js         # GET  /api/health
├── server/index.js       # Local Express server (dev only)
├── src/                  # React frontend
├── vercel.json           # SPA rewrite + function config
└── vite.config.js        # Dev proxy: /api -> localhost:3001
```


## How the pipeline works (`api/_lib/rules.js`)

1. **Toxicity & Prompt Injection Check** — regex patterns catch common
   jailbreak/injection phrasing ("ignore previous instructions", "reveal your
   system prompt", etc). If `OPENAI_API_KEY` is set, this stage also calls
   OpenAI's moderation endpoint for real toxicity scoring; otherwise it falls
   back to a small keyword list.
2. **Content Policy Validation** — pattern-matches against five categories:
   violence, self-harm, hate speech, sexual content involving minors, and
   illegal activity.
3. **Final Output Generation** — if both checks pass, a safe response is
   generated. If either stage flags the input, the pipeline stops immediately
   and returns which stage/category/reason caused the block.

Every request (passed or blocked) is written to MongoDB via `api/moderate.js`
so the log viewer can show real-time activity.

## Extending it

- Swap the regex-based Stage 2 for LangChain or Guardrails.ai validators —
  the pipeline shape (`api/_lib/rules.js`) already isolates each stage so you
  can replace the internals without touching the API contract.
- Add authentication in front of `/api/logs` before shipping this beyond a
  demo — right now it's open to whoever has the URL.
- The 4000-character input limit and 512MB/10s function config in
  `vercel.json` are conservative defaults — tune them to your needs.
