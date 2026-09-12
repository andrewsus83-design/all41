# all41 — Founder Runbook

Status as of 2026-09-12: **Phase 0 + Phase 1 done and live-verified; Phase 2/3/4 code built; mock providers until keys are added.**

## 1. What is live

- `https://all41.app` — Next.js app on Vercel (git-connected to `andrewsus83-design/all41`, root dir `apps/web`; every push to `main` deploys).
- Supabase project `ojtfgmjbofkgvbljzytq` (PASCUA org, Singapore): schema + RLS + credit ledger + pgvector applied. Auth: email/password, magic link, MFA TOTP enabled; `site_url = https://all41.app`.
- Verified in the live DB: RLS isolation (User B sees none of User A's rows), no double-spend under concurrent deductions, ledger append-only, $2 welcome credit granted once per verified email / device fingerprint, and the Task 1.5 loop (balance-check → call → log → deduct) reconciling to six decimals.

## 2. Keys to add (go from mock → real)

**Easiest: sign in as the admin email (`ADMIN_EMAILS` env, currently andrewsus83@gmail.com) and paste keys at `https://all41.app/admin`.** They are encrypted in Supabase Vault and read by both the web app and the graph engine; Vercel env vars remain a fallback.

| Key | Unlocks | Where to get |
|---|---|---|
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `PERPLEXITY_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY` | direct first-party LLM providers (no aggregator). Each key unlocks that provider's candidates in Routing; the benchmark picks leaders across whatever is keyed | paste in **all41.app/admin** (stored in Supabase Vault) — the "get key ↗" links are there |
| `OPENAI_API_KEY` | also real embeddings (`text-embedding-3-small`, 1536-d) for the graph engine | same |
| `GROQ_API_KEY` | also the graph engine's cheap AI-edge classifier | same |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | credit top-ups. Webhook endpoint: `https://all41.app/api/stripe/webhook`, event `checkout.session.completed` | dashboard.stripe.com |
| `SERPAPI_API_KEY` | real search step in Morning Briefing / Competitor Crawler | serpapi.com |
| `FIRECRAWL_API_KEY` | real crawl step in Competitor Crawler | firecrawl.dev |
| `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` | durable background jobs (AI edges, schedules, daily ops). Until then, Vercel Cron hits `/api/cron/*` with `CRON_SECRET` | inngest.com → connect app at `https://all41.app/api/inngest` |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | 06:15 daily digest + alerts | @BotFather |
| `GRAPH_ENGINE_URL` | grounding + graph tab in production (see §3) | your Coolify deploy URL |

Google OAuth: Supabase dashboard → Auth → Providers → Google → paste client id/secret, redirect `https://ojtfgmjbofkgvbljzytq.supabase.co/auth/v1/callback`. The login page button already exists.

`GRAPH_ENGINE_SECRET` and `CRON_SECRET` are already set on Vercel (random). The graph engine must be started with the same `GRAPH_ENGINE_SECRET` value — copy it from Vercel env when deploying.

## 3. Deploy the graph engine (one separate service)

Plan says Hetzner/DigitalOcean + Coolify (~$15–25/mo). Steps:

1. Create the VPS, install Coolify, add this GitHub repo as a source.
2. New service → Dockerfile build, **base directory** `services/graph-engine`, port `3401`.
3. Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GRAPH_ENGINE_SECRET` (same as Vercel), `OPENAI_API_KEY`, `GROQ_API_KEY` (or leave empty — the engine reads the vault).
4. Set `GRAPH_ENGINE_URL=https://<your-domain>` on Vercel and redeploy.
5. Smoke: `curl https://<your-domain>/health`.

Interim (no VPS yet): run it locally with `pnpm dev:graph` — the web app on localhost:3400 uses it; production runs ungrounded (tasks still work, `grounding.engine = "none"`).

## 4. Daily ops

`0 22 * * *` UTC (= 05:00 WIB) — rate-coverage check → margin check / auto-markup → provider balances → P&L → benchmark → Telegram digest. Runs via Vercel Cron on `/api/cron/daily` (header `Authorization: Bearer $CRON_SECRET`) and via Inngest once configured. Manual trigger:

```bash
curl -X POST https://all41.app/api/cron/daily -H "Authorization: Bearer $CRON_SECRET"
```

## 5. Money model (locked in code)

- billed = COGS × `markup` (3.2) × (1 + `platform_fee` 0.06) — both in `platform_settings`, auto-raised when yesterday's gross margin < `margin_floor` (0.50).
- Unknown model = no rate row = the call **refuses to run** (`NO_RATE`). Add the row to `cost_rates` first.
- Test users in DB: `rls-a@test.all41` / `rls-b@test.all41` — delete before launch.

## 6. Deviations from the handoff (deliberate)

- No Supastarter (paid); auth/billing hand-built on Supabase + Stripe.
- No Mastra; orchestration is plain TypeScript (`runTask`, `runAppInstance`) with the verification loop implemented directly. The Execute step's confirm is the human-in-the-loop pause.
- No OpenRouter or any aggregator (founder decision): every model is called through its own first-party API. Cost rates are seeded and edited in /admin; the daily digest flags routed models missing a rate.
