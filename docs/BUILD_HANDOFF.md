# all41 — Claude Code Build Handoff

**How to use this file:** This is the step-by-step build guide for Claude Code. Work through it **one task at a time, in order**. Each task has a clear goal, what to build, and a "done when" check. Do NOT skip ahead — later tasks depend on earlier ones. After each task, stop, verify the "done when," commit, then continue.

**Read first:** the companion `all41_master_plan.md` (the what and why) and `all41_graph_engine_spec.md` (the graph detail). This file is the how, in order.

---

## GROUND RULES (read once, apply always)

1. **Financial spine before features.** The credit ledger and API usage log are built before any AI feature. No API call — ever — runs without being logged and without a pre-flight balance check.
2. **The user never sees an API key.** All ~50 provider keys live server-side in Supabase Vault. The user tops up credit; that's it.
3. **RLS on every table.** Every table with user data gets a policy `auth.uid() = user_id`. No exceptions. Test isolation before moving on.
4. **One language.** Everything is TypeScript. App is a Next.js modular monolith. The graph engine is the one separate service (still TypeScript).
5. **Meter everything.** Every LLM call, every crawl, every search, every embedding, every graph edge-build → logged to `api_usage_log` with real cost.
6. **Commit after every task.** Small commits. Descriptive messages. One task = one commit (or a few).
7. **Design system is locked.** Use the all41 tokens (colors: red/amber/green; fonts: Space Grotesk / DM Sans / JetBrains Mono / Instrument Serif; Apple continuous corners 8→12→16→22→28→36; 8px spacing grid). Numbers always in JetBrains Mono.
8. **When unsure, ask before building.** Don't invent scope. If a task is ambiguous, surface the question.

---

## STACK REFERENCE (use exactly these)

- **App:** Next.js 16 (App Router) + TypeScript, deployed on Vercel
- **Boilerplate:** Supastarter (Supabase + auth + billing + multi-tenant + RLS) — start from this, don't build auth from scratch
- **UI base:** TailAdmin + custom all41 design system tokens; TanStack Table for grids
- **Data:** Supabase (one project) — Postgres + pgvector, Storage, Auth, Vault
- **Model router:** OpenRouter (launch) — one key, many models; abstract it so LiteLLM can replace it later
- **Orchestration:** Mastra (TypeScript) — workflows, suspend/resume, verification loop
- **Automation / jobs:** Inngest — background jobs, scheduled routines, async graph edge-building
- **Graph engine:** separate TypeScript service on a flat VPS (Hetzner/DigitalOcean + Coolify)
- **Payments:** Stripe (top-up only; real-time gating is your own ledger)
- **Digest/alerts:** Telegram bot

---

# PHASE 0 — FOUNDATION (Week 1–2)

### Task 0.1 — Project scaffold
**Goal:** a running Next.js app deployed to Vercel.
**Build:** Initialize from Supastarter. Connect a new Supabase project. Get the default auth flow working (email/password). Deploy the skeleton to Vercel.
**Done when:** you can sign up, log in, and see an empty authenticated dashboard at the live Vercel URL.

### Task 0.2 — Auth complete
**Goal:** all login methods + MFA.
**Build:** Enable email/password, OTP magic link, Google OAuth, and optional MFA (TOTP) via Supabase Auth. Add a minimal Settings > Security page to manage MFA.
**Done when:** a user can sign up via any method and enable/disable MFA.

### Task 0.3 — Design system tokens
**Goal:** the all41 look is available app-wide.
**Build:** Add the design tokens (colors, fonts via Google Fonts, radius scale, spacing scale) as Tailwind config + CSS variables. Build 4 base components: Button (3 sizes, phase-colored variants), Badge, Input, Card — matching the design system spec exactly.
**Done when:** the base components render with correct fonts, colors, and continuous corners in both a quick preview page.

### Task 0.4 — Core schema + RLS
**Goal:** the database foundation.
**Build:** Create these tables with RLS `auth.uid() = user_id` on every one:
`profiles`, `files`, `user_tables`, `user_rows`, `connections`, `credit_ledger`, `mini_apps`, `user_app_instances`, `tasks`, `api_usage_log`, `daily_pnl`, `benchmark_results`, `cost_rates`, `knowledge_nodes`, `knowledge_edges`.
(Full column lists in `all41_master_plan.md` §13 and `all41_graph_engine_spec.md` §3. Enable the `vector` extension for pgvector.)
**Done when:** all tables exist, RLS is on, and a test confirms User A's rows are invisible to User B.

### Task 0.5 — Provider key vault (backend only)
**Goal:** the 50 provider keys stored securely, never exposed.
**Build:** Store provider API keys in Supabase Vault (pgcrypto). Create a server-side helper `getProviderKey(provider)` that decrypts at runtime. This is server-only — never reachable from the client. Start with the keys you have (OpenAI, Anthropic, Google, OpenRouter).
**Done when:** a server route can fetch a decrypted key; the client cannot access keys by any path.

### Task 0.6 — VPS + graph engine skeleton
**Goal:** the one separate service is live.
**Build:** Provision a flat VPS (Hetzner/DigitalOcean) with Coolify. Deploy a bare TypeScript service exposing `/health`, `/ingest`, `/link`, `/query`, `/graph` (stubs for now). It connects to the same Supabase. Set up Inngest.
**Done when:** the app can reach the graph engine's `/health` over an internal HTTP call.

---

# PHASE 1 — FINANCIAL SPINE (Week 2–3)  ← build this BEFORE any AI

### Task 1.1 — Credit ledger
**Goal:** a real-time, append-only balance.
**Build:** Implement `credit_ledger` writes (`topup` / `deduct` / `grant` / `refund`), each recording `balance_after`. Build `getBalance(userId)` (fast — from latest ledger row or a cached balance). Build `deductCredit(userId, amount, taskId)` as an atomic transaction.
**Done when:** grants, deductions, and balance reads are correct and consistent under concurrent calls (test with parallel deductions — no double-spend).

### Task 1.2 — Pre-flight balance gate
**Goal:** no task runs without enough credit.
**Build:** A `checkBalance(userId, estimatedCost)` guard that every task must pass before execution. If insufficient, block with a clear "top up to continue" response.
**Done when:** a task with insufficient balance is blocked before any API call is made.

### Task 1.3 — API usage log
**Goal:** every call metered.
**Build:** `logApiUsage({ userId, taskId, provider, model, inputTokens, outputTokens, apiCredits, latencyMs, costUsd, markup, platformFee, billedUsd, status })`. The rule: this write happens **before the result returns to the user**. Build `computeCost(provider, model, usage)` reading from `cost_rates`.
**Done when:** a logged call appears in `api_usage_log` with an accurate `cost_usd`, and the flow fails safely if the log write fails.

### Task 1.4 — Stripe top-up
**Goal:** users can buy credit.
**Build:** Stripe Checkout for credit top-up. On the success webhook, grant credit to `credit_ledger`. Make the webhook **idempotent** (same event never grants twice) and reconcilable (handle paid-but-webhook-failed). No subscriptions — top-up only.
**Done when:** a test purchase grants the exact credit once, even if the webhook is delivered twice.

### Task 1.5 — Prove the full loop (single model)
**Goal:** the spine works end to end.
**Build:** Wire ONE model via OpenRouter behind an abstraction `callModel(model, messages)`. Run the sequence: `checkBalance` → `callModel` → `logApiUsage` → `deductCredit` → return result + new balance.
**Done when:** one real model call flows through balance-check → call → log → deduct, the ledger reconciles to the penny, and the new balance shows in the UI. **This is the milestone — everything else is addition.**

### Task 1.6 — Free credit on signup (anti-abuse)
**Goal:** $2 free, protected.
**Build:** Grant $2 credit on first signup. Gate it: require email verification; add device/payment fingerprinting; restrict free-tier tasks to cheap models only.
**Done when:** a new verified user has $2, and obvious duplicate-signup abuse is blocked.

---

# PHASE 2 — AI ENGINE + GRAPH (Week 3–5)

### Task 2.1 — Model router abstraction
**Goal:** route by task category.
**Build:** A `routeTask(taskType)` that picks a model per category from a `routing_weights` config (Claude=code/reasoning, GPT=synthesis, Gemini=crawl/index, Perplexity=research, Groq/Haiku=classify). Keep it behind the `callModel` abstraction so LiteLLM can replace OpenRouter later.
**Done when:** the same task type reliably routes to the configured model, and switching a weight changes routing.

### Task 2.2 — Intent classifier
**Goal:** categorize any user input cheaply.
**Build:** On any chat input, a cheap fast model classifies it into a closed set of task types. Closed-set output only (no free generation).
**Done when:** typical inputs classify correctly into the right task type.

### Task 2.3 — Briefing flow
**Goal:** the core UX — structured intake.
**Build:** The 5-step flow (What / Goal / Condition / Execute / Track). One question per step, answered by tap or short input, each locked before the next. Produces a structured task object (JSON), not a freeform prompt. Options per step adapt to the task type. Use the design system (red for think-steps, amber for prepare-steps, green for the go-step). Reflective questions in Instrument Serif italic.
**Done when:** a user completes a briefing in ~20–30s and it yields a valid structured task object stored on `tasks`.

### Task 2.4 — Graph engine: nodes + ingest
**Goal:** data becomes chunked nodes.
**Build (in the graph service):** `/ingest` takes a file/output, chunks it to section-level (~200–500 tokens), embeds each chunk (pgvector), stores as `knowledge_nodes` with provenance (`source_type`, `source_id`, `parent_node`). Meter embedding cost to `api_usage_log`.
**Done when:** uploading a file produces multiple chunk nodes with embeddings and correct provenance.

### Task 2.5 — Graph engine: deterministic edges
**Goal:** the free structural graph.
**Build:** `/link` creates deterministic edges on ingest: `part_of`, `derived_from`, `produced_by`, `sibling_of`, `uploaded_in`. Zero AI, zero cost, synchronous.
**Done when:** nodes are correctly connected by structural edges with `origin='deterministic'`.

### Task 2.6 — Graph engine: grounding query
**Goal:** connected context for the AI, token-capped.
**Build:** `/query` runs two-stage retrieval: (1) vector anchor — top-K seed nodes by cosine similarity; (2) graph expansion — walk edges 1–2 hops, rank by (edge weight × similarity × recency), de-duplicate, and cap at a hard token ceiling (4–8k). Returns a tight context bundle.
**Done when:** a query returns seed chunks + their connected context, never exceeding the token ceiling.

### Task 2.7 — Wire grounding into tasks
**Goal:** the AI answers from the graph.
**Build:** Before a task's main model call, fetch context via `/query` using the briefing, inject it into the prompt. Enforce structured output schema (required `sources` + `confidence`).
**Done when:** a task's answer is grounded in the user's actual data and cites sources.

### Task 2.8 — Verification loop
**Goal:** catch hallucination on high-stakes output.
**Build:** With Mastra, for outputs flagged high-stakes, a second model checks the first against the retrieved sources; conflicts are flagged to the user rather than passed through.
**Done when:** an intentionally wrong claim is caught and flagged.

### Task 2.9 — Graph engine: async AI edges
**Goal:** the semantic graph, cheaply.
**Build:** An Inngest background job: for new nodes, pre-filter candidate pairs by vector similarity (top-K only), then a cheap model proposes semantic edges (`about`, `mentions`, `contradicts`, `supports`, `same_topic_as`) + creates entity hub nodes. Store `confidence`; drop <0.6. Meter every call. Runs off the request path.
**Done when:** semantic edges and entity hubs appear seconds after ingest, each metered, none blocking the user.

### Task 2.10 — Chat interface
**Goal:** the primary surface.
**Build:** The chat UI showing: briefing flow inline, task decomposition (which models run which step), live credit deduction, and the final grounded result with sources. Design system throughout.
**Done when:** a full task runs visibly from briefing → routing → result → credit deducted, in one chat.

---

# PHASE 3 — MINI APP FRAMEWORK (Week 5–7)

### Task 3.1 — Mini app engine
**Goal:** templates configured by chat.
**Build:** `mini_apps` holds each template's `config_schema` (the questions the briefing asks) + `workflow_def` (pre-built steps + routing). The briefing flow reads `config_schema` to know what to ask. User answers save to `user_app_instances`. A configured instance runs on the same execution engine as any task.
**Done when:** picking a template drives a briefing from its schema and saves a working instance.

### Task 3.2 — "Pick → chat → ready" flow
**Goal:** the mini app UX.
**Build:** Apps tab: pick a mini app → AI asks 3–4 config questions in chat → instance saved → first run executes → confirmation ("ready, runs weekly"). Show active vs available states.
**Done when:** a non-technical flow goes from pick to a ready, running app in under a minute.

### Task 3.3 — Routines & scheduling
**Goal:** "add routine" / "add calendar."
**Build:** Scheduled instances via Inngest (once / daily / weekly / cron). "Add routine" and "add calendar" are friendly buttons over this — the user never sees the job engine. `next_run_at` drives execution.
**Done when:** a scheduled instance fires at the right time and deducts credit per run.

### Task 3.4 — Ship 3 mini apps
**Goal:** real value, demonstrated.
**Build (in order):**
1. **Morning Briefing** (cheapest to run — best first-value demo): trend/news pull → summarize → deliver to chat/email.
2. **Competitor Crawler**: crawl (Firecrawl) + search (SerpAPI) → compare → report. Meter crawl + search calls.
3. **Content Pipeline**: graph context → draft → format for platforms.
**Done when:** all 3 run end to end via config schema → instance → scheduled run, each fully metered.

---

# PHASE 4 — BENCHMARK & COST AUTOMATION (Week 7–9)

### Task 4.1 — Daily benchmark
**Goal:** keep routing current.
**Build:** An eval suite scoring each model on each task type; write to `benchmark_results`; update `routing_weights` from the leaders. Meter benchmark runs.
**Done when:** the benchmark runs, scores models, and routing weights update automatically.

### Task 4.2 — Cost rate scraper
**Goal:** markup stays accurate.
**Build:** A scheduled job (Firecrawl on provider pricing pages) → parse rates → update `cost_rates`.
**Done when:** `cost_rates` updates daily and `computeCost` uses fresh rates.

### Task 4.3 — Daily P&L + auto-markup
**Goal:** know profit every day.
**Build:** Aggregate `api_usage_log` → `daily_pnl` (tasks, users, COGS, revenue, gross/net profit, margins). Auto-raise markup if margin <50%, with alert.
**Done when:** yesterday's P&L is generated and matches a hand check against real usage.

### Task 4.4 — The 5–6 AM cron + Telegram digest
**Goal:** the morning routine runs itself.
**Build:** Chain (Inngest cron): 5:00 scrape pricing → 5:15 recalc markup → 5:30 check provider credit balances → 5:45 P&L → 6:00 benchmark → 6:15 Telegram digest (revenue, profit, margin, alerts, anomalies).
**Done when:** the full chain runs on schedule and you receive the digest.

### Task 4.5 — Models tab (trust feature)
**Goal:** show the benchmark.
**Build:** The Models tab rendering `benchmark_results` as a table (leaders highlighted). This is a transparency/trust feature, not the headline.
**Done when:** the tab shows current benchmark scores per task type.

---

# PHASE 5 — ONBOARDING & POLISH (Week 9–11)

### Task 5.1 — Zero-config first run
**Goal:** value in under 5 minutes, zero setup.
**Build:** On first login, ask ONE question ("What do you do?"). Pre-fill a briefing and auto-run ONE mini app (Morning Briefing) spending part of the $2 free credit, so the user gets a finished deliverable immediately — no keys, no config. Then a short completion checklist for the next 2–3 actions.
**Done when:** a brand-new non-technical user sees a real finished output within 5 minutes of signup.

### Task 5.2 — Dashboard
**Goal:** the at-a-glance view.
**Build:** Live credit balance, per-task cost preview before running, recent tasks, usage stats. Numbers in JetBrains Mono.
**Done when:** the dashboard reflects real balance and usage accurately.

### Task 5.3 — Connect page (optional, user's own world)
**Goal:** OAuth to the user's data — NOT keys.
**Build:** One-click OAuth to Gmail / Google Drive / Calendar (the user's own accounts). Store tokens encrypted, auto-refresh. Fully optional — the product works without it. No API keys anywhere.
**Done when:** a user can connect Gmail and the AI can use it as context; skipping it breaks nothing.

### Task 5.4 — Graph view UI
**Goal:** the visible payoff.
**Build:** A Graph tab rendering the user's `knowledge_nodes` + `knowledge_edges` (RLS-scoped) as a force-directed graph — nodes sized by connections, colored by type; deterministic edges solid, AI edges dashed. Click a node → content + connections. For large graphs, load the focus neighborhood.
**Done when:** a user sees their connected knowledge graph and can explore it.

### Task 5.5 — Alerts
**Goal:** financial guardrails live.
**Build:** Implement all alert thresholds (margin <50%, single API >30% COGS, daily COGS >$50, cost/task >$0.10, negative net profit) → Telegram.
**Done when:** tripping a threshold fires an alert.

---

# PHASE 6 — LAUNCH (Week 11–12)

### Task 6.1 — End-to-end test
Full flow: signup → free credit → first run → briefing → grounded task → mini app → routine → top-up → paid task. Every step metered and reconciled.

### Task 6.2 — Security audit
RLS confirmed on every table (A can't see B). Provider keys never in logs or client. Webhook-failure and race-condition paths tested. MFA works.

### Task 6.3 — Cost accuracy verification
Compare `daily_pnl` COGS against actual provider invoices for a few days. They must match. Fix any drift.

### Task 6.4 — Launch
Ship to waitlist + X/#buildinpublic + one subreddit + manual DMs. Onboard first 5 paying users. Record build-in-public content.

---

## THE MILESTONE CHECKLIST (in order of importance)

1. Task 1.5 — the full financial loop works (balance → call → log → deduct, reconciles to the penny)
2. Task 2.3 — the briefing flow yields structured task objects
3. Task 2.6/2.7 — grounding returns connected context, token-capped, and the AI answers from it
4. Task 3.2 — pick → chat → ready works for a non-technical user
5. Task 5.1 — a first-timer reaches a finished deliverable in under 5 minutes with zero config
6. Task 6.3 — logged cost matches real provider bills

Hit these six in order and all41 is real.

---

*Build one task at a time. Verify each "done when." Commit. Never run an API call without logging it and checking balance first. Never show a user an API key. Keep the graph sharp but cheap. Make the user think clearly. cepat, bagus, tidak susah.*
