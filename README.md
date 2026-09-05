# Guardrail — Content Moderation Pipeline

A 3-stage moderation API (Model Chain Prompting): every message passes through
**Toxicity & Prompt-Injection Check → Content Policy Validation → Final Output
Generation**. Built as React (Vite) + serverless Node functions + MongoDB, so
it deploys to Vercel with zero configuration.

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

## Run it locally

```bash
npm install
cp .env.example .env      # optional — add MONGODB_URI to persist logs
npm run dev                # starts Vite (5173) + the API server (3001) together
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the local
Express server, so you're testing the same code paths Vercel will run.

## Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, **Add New Project** → import the repo. Vercel auto-detects Vite
   for the frontend and picks up everything in `/api` as serverless
   functions — no build settings to change.
3. Add environment variables in the Vercel project settings:
   - `MONGODB_URI` — your MongoDB Atlas connection string (optional but
     recommended, so flagged/passed interactions are logged).
   - `OPENAI_API_KEY` — optional. If set, Stage 1 calls OpenAI's real
     moderation endpoint instead of the built-in keyword/regex fallback.
4. Deploy. That's it — `vercel.json` handles SPA routing so refreshing any
   route still loads the app correctly.

### Getting a free MongoDB URI
Create a free cluster at https://www.mongodb.com/cloud/atlas, add a database
user, allow access from anywhere (`0.0.0.0/0`) under Network Access, then copy
the connection string from **Connect → Drivers** into `MONGODB_URI`.

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
