# all41

> You describe the job. all41 optimizes your context, picks the right model, executes the task, and tracks the cost. One chat. Done.

Monorepo (pnpm workspace):

| Path | What | Runs where |
|---|---|---|
| `apps/web` | Next.js 16 modular monolith — chat + briefing, financial spine, model router, mini apps, dashboard | Vercel (`all41.app`, root dir `apps/web`) |
| `services/graph-engine` | The one separate service — chunk → embed → nodes, deterministic + AI edges, token-capped grounding query | VPS + Coolify (Dockerfile) — or locally on :3401 |
| `supabase/migrations` | Schema, RLS, credit ledger RPCs, pgvector, seed catalog | Supabase project `ojtfgmjbofkgvbljzytq` |
| `docs/` | Master Plan · Graph Engine Spec · Build Handoff · Runbook | — |

## Quick start

```bash
pnpm install
pnpm dev            # web on http://localhost:3400
pnpm dev:graph      # graph engine on http://localhost:3401
pnpm typecheck && pnpm test
```

Env: copy `apps/web/.env.example` → `apps/web/.env.local` and `services/graph-engine/.env.example` → `.env`. Keys are managed at `/admin` (Supabase Vault; direct first-party providers only, no aggregators). With **no provider keys** the whole loop still runs on deterministic mock providers (results are flagged `isMock`) — so the financial spine, briefing flow, graph, and apps are testable offline.

See `docs/RUNBOOK.md` for what to add to go from mock to real, and how to deploy the graph engine.

## Ground rules (never break)

1. No provider call without a pre-flight credit check and an `api_usage_log` write **before** the result returns.
2. The user never sees an API key. Provider keys are server env only.
3. RLS on every table (`auth.uid() = user_id`).
4. Numbers in JetBrains Mono. Money in plain dollars, never points.
