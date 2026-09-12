# all41 — Master Plan & Business Requirements Document

**Version 1.1 · September 2026**
**Author: Founder / CTO working document**
**Status: Pre-build — this is the map from zero to launch**
**v1.1 changes: credit top-up model; mini apps as pre-built templates configured by chat ("pick → chat → ready"); no user-facing API keys; stack revised per deep research (OpenRouter→LiteLLM, Mastra, pgvector, Inngest, Supastarter, flat VPS); legal/compliance section added.**

> *"AI doesn't replace your thinking. It rewards you for thinking clearly."*
> **GEM — Grow in Easy way and Measurable**

---

## 0. How to read this document

This is a living BRD written by the founder wearing two hats: the founder who owns the vision and the money, and the CTO who owns the architecture and the build. Every section answers one of two questions: *why does this exist* (founder) and *how do we build it* (CTO).

Read it top to bottom once. Then use it as a checklist. Nothing here is decoration — if a line is in this document, it's because skipping it costs money or time later.

---

# PART A — THE BUSINESS (Founder Hat)

## 1. Executive Summary

all41 is an AI work engine for solo operators AND non-technical first-timers — founders, consultants, agency owners, and freelancers who currently juggle ChatGPT, Claude, Perplexity, and Zapier by hand. It replaces that manual juggling with one platform that: optimizes the user's context, routes each task to the best model, executes the work, and tracks the cost of every cent (financial engine).

**Critical principle: the user never touches technical configuration.** all41 owns ~50 third-party API integrations on the backend. Users never connect an API key, never see n8n, never configure anything. Instead of "connect n8n," they tap "add routine." Instead of "connect a model," they just run a task. All complexity is hidden — like using Uber without knowing about the engine or GPS routing.

The product surface is a chat + dashboard + plug-and-play mini apps, built on Supabase. Pricing is **top-up credit, pay-per-use across everything**: users buy a credit balance, each task deducts based on COGS × markup. New users get $2 in free credits to try. No subscriptions, no wasted credits.

The wedge is the **briefing flow** — a structured intake (What, Goal, Condition, Execute, Track) that forces the user to think clearly before the AI acts. This kills hallucination on both sides: the user can't be vague, and the AI can't invent context.

**The one-line pitch:** You describe the job. all41 optimizes your context, picks the right model, executes the task, and tracks the cost. One chat. Done.

## 2. The Problem

Solo operators in 2026 face three compounding problems:

**Tool sprawl.** The average solopreneur pays for 8–15 separate SaaS subscriptions (ChatGPT $20, Claude $20, Perplexity $20, Jasper $49, SEMrush $129, Zapier $30, and so on). Most use 10% of each tool's features. The total is $300–600/month for capabilities they barely touch.

**Model confusion.** There is no single best AI model. Claude is best for code and reasoning, GPT for synthesis, Gemini for crawl and multimodal, Perplexity for research. Models change weekly. A normal user has no way to know which model is winning this week for their specific task — so they default to one and get suboptimal results.

**Garbage in, garbage out.** Users type vague prompts into a blank box and get vague outputs. They blame the AI, but the real problem is the input. Nobody has built a system that forces clarity before execution.

## 3. The Solution

all41 solves all three:

**Consolidation.** One platform replaces the sum of the tools. Mini apps replicate the 20% of features people actually use from expensive SaaS, powered by the all41 AI engine at a fraction of the cost.

**Intelligent routing.** A daily benchmark scores every model on the user's task types. The router automatically sends each task to today's best model. The user never has to know or care which model is winning.

**Forced clarity.** The briefing flow structures every task into What / Goal / Condition / Execute / Track before anything runs. Combined with context grounding (pgvector) and structured output schemas, this eliminates the biggest hallucination trigger.

## 4. Target User

**Primary (launch):** Solo founders, consultants, agency owners, and solopreneurs who already pay for multiple AI tools and value time savings. They are technical enough to connect an API key or click through OAuth, but not developers. They run 5–30 active projects or clients. They currently spend $200–500/month on tools.

**Secondary (later):** Small teams (2–10 people) who need shared workspaces. This is the Team tier, deferred to v2.

**Not the target:** Enterprise (needs compliance, SLAs, dedicated support all41 won't have on day one). Pure developers (they'll self-host the open-source stack for free). Complete non-technical users (can't connect an API key).

## 5. Positioning & Differentiation

all41 does not compete on model quality — it uses everyone else's models. It competes on **output quality**, which is a function of input quality, which is a function of how well the platform structures the user's thinking.

This is a moat nobody can copy with a better model. OpenAI can ship GPT-7 tomorrow and it won't help a user who doesn't know what they want. all41 solves the user problem, not the model problem.

**Anti-positioning:** "Other AI tools let you be lazy. all41 makes you sharp."

Competitors and why all41 differs:
- **OpenRouter / LiteLLM / Portkey** — pure model routers, built for developers. No briefing flow, no mini apps, no non-technical UX. all41 adds guided briefing + owned integrations + outcome mini apps on top.
- **Poe / ChatLLM / Magai** — consumer aggregators, but they sell *model access*, not *outcomes*. all41 sells finished deliverables (a report, a content pipeline) to people who don't want to think about models.
- **Zapier / Make** — automation, no AI intelligence layer. all41 has the AI decide, not just follow predefined flows.
- **ChatGPT / Claude standalone** — single model, no routing, no context grounding, no automation. all41 orchestrates all of them.

## 6. Business Model

**Pricing: top-up credit, pay-per-use across everything.**
- Users buy a credit balance (top-up, e.g. $10). Every task — chat, mini app run, routine — deducts from the balance.
- New users get **$2 in free credits** to try across everything (part of it spent automatically in the first-run to show value fast).
- Selling price per task = (COGS × markup) + small platform fee. **Markup revised to blended 3.0–3.5× + 5–8% platform fee** (research showed 2.8× is too thin once non-LLM API costs, router fees, retries, and the verification-loop second call are included).
- Mini apps calculate their own credit cost per run (a multi-step app costs more than a single chat).
- No subscriptions, no wasted credits. Credits expire after 12 months (defensible precedent: OpenAI's own service credits expire after 1 year).
- Credit is shown in **plain currency** ("$0.03 for this task"), never opaque points — Poe's per-model point system is a known source of user confusion.

**Unit economics (2026 prices have fallen sharply in our favor):**
- Typical multi-step task COGS: ~$0.01–0.08 (GPT-5.6 Luna-class dropped to $0.20/$1.20 per 1M tokens; Gemini Flash-class and DeepSeek far cheaper; intent classification costs fractions of a cent)
- Average selling price: $0.05–0.25 depending on task complexity
- Target gross margin: 60–70% blended
- After fixed costs: net margin positive from low volume

**The hidden costs that erode margin are non-LLM** — web crawl (Firecrawl 1–5 credits/page), search (SerpAPI-class ~$1.66/1k, Brave cheaper), voice (ElevenLabs/Deepgram), embeddings, the daily benchmark runs, storage/egress, and the always-on VPS. Every one must be metered before it returns.

**Fixed monthly costs at launch:** ~$40–65 (Supabase Pro $25, Vercel free/Pro, one flat VPS ~$15–25 on Hetzner/DigitalOcean + Coolify instead of usage-billed Railway, benchmark API costs, domain).

**The rule that keeps this profitable:** No task executes without its cost logged first. Revenue is calculated from actual COGS, never estimated. Prices are re-scraped daily so markup stays accurate even when providers change rates. Auto-raise markup if margin drops below 50%.

## 7. Success Metrics (GEM — the Measurable part)

**Phase 1 (first 90 days):**
- 5 paying users running real tasks weekly
- Gross margin holding above 55%
- Average task completes without user re-prompting (clarity metric)
- Zero untracked API spend (every cent logged)

**Phase 2 (6 months):**
- 50 paying users
- $1,500+ MRR-equivalent from pay-per-use
- 3+ mini apps with recurring daily usage
- Net profit positive every single day

**Phase 3 (12 months):**
- 200+ users
- Team tier launched
- Mini app marketplace with community-created apps
- Break-even on founder time (i.e., the business pays for itself and then some)

---

# PART B — THE PRODUCT (Founder + CTO)

## 8. Product Surface

**Web app** (Next.js on Vercel) with six areas:

1. **Chat** — the primary surface. Every task starts here via the briefing flow.
2. **Dashboard** — usage, **credit balance**, cost, model stats, recent tasks at a glance.
3. **Connect** — optional one-click OAuth to connect the user's *own world* (Gmail, Google Drive, Calendar). This is NOT about API keys — those are all backend. It's about letting all41 read the user's data with their permission. Fully optional; the product works without it.
4. **Apps** — the mini app marketplace (plug-and-play modules — see §11).
5. **Models** — the daily benchmark table (a trust/transparency feature, not the core differentiator).
6. **Settings** — **credit top-up & billing**, profile, security (MFA, OTP). No API keys visible to the user, ever.

## 9. The Briefing Flow (core UX)

Every task moves through 5 steps before execution:

1. **What** — What do you need delivered? (structured options)
2. **Goal** — What decision does this help you make? (forces intent)
3. **Condition** — Any constraints? (competitor, freshness, tone, format)
4. **Execute** — Confirm the plan (shows which models will run each step)
5. **Track** — How to follow up? (once / remind / auto-recurring / save as mini app)

Each step is one question, answered by tap or short input, locked before the next. Total time: 20–30 seconds. The output is a structured task object stored in Supabase — never a freeform prompt.

The "Save as reusable mini app" option in step 5 is how mini apps get created organically: when a user runs the same briefing 3+ times, the system suggests saving it as a one-tap app.

## 10. Anti-Hallucination Architecture (5 layers)

1. **Intent classification** — a cheap fast model (Groq/Haiku) categorizes the task into a closed set. Near-zero hallucination risk.
2. **Structured briefing** — the user answers specific questions, not open prompts. No ambiguity.
3. **Context grounding (graph engine)** — context pulled from the user's actual connected data, structured as an **Obsidian-style knowledge graph** (nodes + edges), built from the start. pgvector underpins retrieval (semantic anchor); the graph adds connected context (1–2 hop expansion) for sharper grounding. See the companion **Graph Engine Spec** for full detail. The AI answers from real, connected data — not training memory.
4. **Structured output schema** — the AI generates into predefined JSON fields with required `sources` and `confidence`. Can't invent fields or skip citations.
5. **Verification loop** — for high-stakes outputs, a second model checks the first against sources and flags conflicts instead of passing them through silently.

## 11. Mini Apps — pre-built templates, configured by chat

**What a mini app IS (and is NOT).** A mini app is NOT a separately generated application with its own code and URL. all41 does not build software from scratch (that is Lovable/v0/Bolt territory, deliberately out of scope). A mini app is a **pre-built template** — you (the founder) build it once, complete with its crawl/analyze/publish logic, model routing, and output format. The only thing left blank is the user's specific parameters. The briefing flow fills them in.

**The flow the user experiences — "pick → chat → ready":**

```
User picks "Competitor Crawler" from the Apps tab
        ↓
AI asks in chat:  "Who's the competitor to track?"
User: "Jasper AI"
        ↓
AI:  "Compare what?"      [Pricing] [Features] [Content] [All]
User taps: Pricing
        ↓
AI:  "How often?"         [Once] [Weekly] [Monthly]
User taps: Weekly
        ↓
AI:  "Where should results go?"   [Chat] [Email] [Dashboard]
User taps: Email
        ↓
✅ App ready. First run now, then every Monday 6 AM.
```

3–4 questions, ~20 seconds, conversational. The app is "ready" not because it was built from nothing, but because a pre-built template was just configured for this user. No code generation, no hosting, no deployment — it reuses the entire all41 engine (briefing flow, model router, financial engine, credit system).

**How it works technically.** Each mini app you build ships with a **config schema** — the set of questions the briefing flow should ask (competitor name, comparison type, frequency, output target). The briefing flow reads the schema to know what to ask. The user's answers are saved as a row in `user_app_instances` (see §13). A scheduled instance runs through the same execution engine as any task, and each run deducts credit based on COGS × markup, exactly like a normal task.

**"Add routine" / "add calendar"** are the same mechanism with a friendly name: the user taps a button, answers a couple of questions, and an instance is scheduled. n8n runs it in the background — the user never knows n8n exists.

**Phase 1 roster** — each mini app replaces an expensive SaaS the user already pays for:

| Mini App | Replaces | Their cost | all41 cost/run |
|---|---|---|---|
| Competitor Crawler | SEMrush / Ahrefs | $99–129/mo | ~$0.05–0.20 |
| Content Pipeline | Jasper / Buffer | $49–99/mo | ~$0.01–0.05 |
| Morning Briefing | Feedly / Mention | $8–41/mo | ~$0.01/day |
| Email Campaign | Mailchimp / ConvertKit | $13–39/mo | ~$0.02 |
| CRM Lite | HubSpot / Salesforce | $15–800/mo | ~$0.01/enrich |
| Invoice Tracker | FreshBooks / QuickBooks | $17–30/mo | ~$0.01/scan |
| Social Monitor | Brand24 / Mention | $41–79/mo | ~$0.01/day |
| Meeting Notes | Otter / Fireflies | $16–19/mo | ~$0.02 |

**Launch with 3:** Morning Briefing (cheapest to run — best first-value demo), Competitor Crawler, Content Pipeline. These demonstrate value in under 5 minutes.

**Organic app creation (later).** When a user runs the *same custom briefing* 3+ times, the system offers "Save as mini app" — turning their repeated task into a one-tap personal app. This is how the library grows from user behavior without you building every template.

---

# PART C — THE ARCHITECTURE (CTO Hat)

## 12. Technology Stack

**Frontend:**
- Next.js 16 (App Router) + TypeScript
- TailAdmin as the admin base + custom all41 design system
- TanStack Table for the spreadsheet/data grid
- Deployed on Vercel

**Backend & Data:**
- Supabase (one project, shared schema, RLS isolation)
- PostgreSQL for all structured data
- Supabase Storage for files (folder-per-user isolation)
- Supabase Auth (email/password, OTP magic link, Google OAuth, MFA/TOTP)
- Supabase Vault (pgcrypto) for encrypted API key storage

**AI & Orchestration (revised per research):**
- **Model router:** start on **OpenRouter** (one key, 400+ models, instant fallback — fastest to validate). Migrate hot paths to **self-hosted LiteLLM** on the VPS once monthly model spend approaches ~$3,600 (the published crossover point). Note OpenRouter's real fee: 5.5% on credit purchases + $0.80 minimum per top-up — factor this into COGS during the OpenRouter phase; it disappears when you move to your own keys.
- **Orchestration:** **Mastra (TypeScript-native)** instead of CrewAI. Your whole stack is TypeScript — CrewAI is Python-first and forces a second runtime. Mastra has suspend/resume for human-in-the-loop (ideal for the briefing confirm step), memory, and built-in evals, keeping everything one language.
- **Context grounding (graph engine):** an **Obsidian-style knowledge graph** (nodes + edges) built as ONE separate service on the VPS, on top of **pgvector**. Hybrid edges (deterministic structural + async AI semantic), per-user isolation, chunked section-level nodes, token-budgeted grounding queries. Built from the start — see companion Graph Engine Spec. (LightRAG only considered at large scale.)
- **Automation:** **Inngest** (code-first, TS-native, durable execution) preferred over n8n so you don't run a separate service; or self-host n8n on the VPS if you want the visual builder. Either way, hidden from the user behind "add routine."

**Infrastructure:**
- One flat-billed VPS (**Hetzner or DigitalOcean + Coolify, ~$15–25/mo**) running the router/workers/automation + the 5–6 AM cron. Avoid Railway for always-on — its usage billing is unpredictable.
- Vercel for the Next.js app
- Supabase Cloud for DB/auth/storage
- Consider a **paid boilerplate (Supastarter, ~$299 one-time, Supabase + RLS + multi-tenant + billing)** to skip 2–3 months of auth/billing plumbing.

## 13. Data Model (core tables)

```sql
-- User profile (extends Supabase auth.users)
profiles (id, display_name, avatar_url, plan, created_at)

-- Files metadata (actual files in Storage)
files (id, user_id, name, type, size_bytes, storage_path,
       graphify_indexed, graphify_node_count, folder, created_at)

-- User-created tables (spreadsheet-like)
user_tables (id, user_id, name, columns jsonb, icon, created_at)
user_rows (id, table_id, user_id, data jsonb, created_at)

-- External integrations (user's OWN world via OAuth — NOT API keys)
connections (id, user_id, provider, access_token_encrypted,
             refresh_token_encrypted, status, last_synced_at)

-- Mini app CATALOG (templates you build once — the library)
mini_apps (id, slug, name, description, category, icon,
           config_schema jsonb,   -- the questions the briefing asks
           workflow_def jsonb,     -- the pre-built steps + model routing
           est_credit_cost, is_published, created_at)

-- Mini app INSTANCES (a user's configured copy of a template)
user_app_instances (id, user_id, mini_app_id,
                    config jsonb,          -- user's answers to the briefing
                    schedule text,         -- 'once' | 'daily' | 'weekly' | cron
                    output_target text,    -- 'chat' | 'email' | 'dashboard'
                    next_run_at timestamptz,
                    status text,            -- 'active' | 'paused'
                    created_at)

-- Credit ledger (the real-time balance — source of truth for billing)
credit_ledger (id, user_id, type text,     -- 'topup' | 'deduct' | 'grant' | 'refund'
               amount_usd numeric(10,6),
               balance_after numeric(10,6),
               task_id uuid,                -- if a deduction
               stripe_payment_id text,      -- if a top-up
               created_at)

-- Every task
tasks (id, user_id, briefing jsonb, status, models_used[],
       total_cost, result jsonb,
       app_instance_id uuid,   -- set if this task was a mini app run
       created_at)

-- The financial source of truth
api_usage_log (id, user_id, task_id, api_provider, api_model,
               input_tokens, output_tokens, api_credits, latency_ms,
               cost_usd, rate_snapshot jsonb, markup, platform_fee,
               billed_usd, status, created_at)

-- Daily P&L rollup
daily_pnl (date, tasks, users, total_cogs, total_revenue,
           gross_profit, net_profit, gross_margin, net_margin)

-- Model benchmark results
benchmark_results (id, date, task_type, model, score,
                   cost_per_run, latency_ms, is_leader)

-- Cost rate table (updated daily)
cost_rates (api_provider, api_model, input_rate, output_rate,
            unit, updated_at)

-- KNOWLEDGE GRAPH (Obsidian-style grounding — see Graph Engine Spec)
knowledge_nodes (id, user_id, title, content, chunk_index, node_type,
                 source_type, source_id, parent_node, embedding vector(1536),
                 tags, entities, token_count, created_at, updated_at)
knowledge_edges (id, user_id, from_node, to_node, relation, origin,
                 weight, confidence, created_at)
```

**RLS on every table:** `auth.uid() = user_id`. One policy pattern, unbreakable isolation. Admin policy for the founder dashboard.

## 14. Security Requirements

- **Auth:** email/password + OTP magic link + Google OAuth + optional MFA (TOTP)
- **Authorization:** Row Level Security on every table
- **Encryption at rest:** AES-256 (Supabase default) + pgcrypto for secrets
- **Encryption in transit:** HTTPS/TLS everywhere (Vercel enforced)
- **Storage:** per-user folder policies, no cross-user access
- **Provider API keys are backend-only.** all41 holds the ~50 first-party provider keys server-side, encrypted in Supabase Vault, decrypted only at runtime, never logged in plaintext, and **never exposed to any user.** The user has no concept of an API key.
- **User OAuth tokens** (their own Gmail/Drive, if they connect) — auto-refreshed, encrypted, never exposed to the client.
- **Credit ledger integrity:** the `credit_ledger` is append-only. A pre-flight balance check gates every task (Stripe does NOT gate spend in real time — you build this). Top-up webhooks are idempotent and reconciled to handle the paid-but-webhook-failed gap.
- **Legal (from research):** hold only first-party Commercial/API keys. Route Claude ONLY through the Commercial API — never the Claude Code binary or consumer Pro/Max OAuth tokens (that specific resale is prohibited). Publish a DPA-backed privacy policy naming each provider as a sub-processor. Avoid reselling Google's specific "Grounded Results / Search Suggestions." Re-verify provider terms quarterly.

## 15. The Financial Engine (non-negotiable)

The single most important system. Rules:

1. **No task executes without its cost logged first.** If the `api_usage_log` write fails, the task fails.
2. **A pre-flight credit check gates every task.** Stripe meters and invoices at cycle end — it does NOT check balance in real time. Your own `credit_ledger` + Redis/Postgres balance gate is load-bearing. Deduct before returning results.
3. **Revenue is calculated, never estimated.** Selling price = actual COGS × markup (blended 3.0–3.5×) + platform fee (5–8%).
4. **Rates are re-scraped daily** at 5:00 AM so markup stays accurate.
5. **Auto-adjust markup** if margin drops below 50%, with admin alert.
6. **Alert thresholds:** margin < 50%, single API > 30% of COGS, daily COGS > $50, cost/task > $0.10, negative net profit.
7. **Meter every non-LLM call too** — crawl, search, voice, embeddings, benchmark runs. These erode margin more than the LLM line.

**Daily cron (5:00–6:15 AM):**
- 5:00 — scrape latest API pricing
- 5:15 — recalculate markup if needed
- 5:30 — check API credit balances
- 5:45 — generate yesterday's P&L
- 6:00 — run model benchmark, update routing weights
- 6:15 — send daily digest to founder (Telegram/email)

## 16. Design System (summary)

- **Colors:** Red (Stop & Think), Amber (Prepare), Green (Go & Track) — traffic-light cycle
- **Fonts:** Space Grotesk (title), DM Sans (body), JetBrains Mono (data), Instrument Serif italic (reflective questions)
- **Corners:** Apple continuous, 8→12→16→22→28→36px by element size
- **Spacing:** 8px grid, tokens from 4px to 128px
- **Style:** modern minimalist, dark mode default, spacious, everything bigger and clearer
- **Rule:** when in doubt, make it bigger, add more space, remove an element

---

# PART D — THE BUILD PLAN (CTO Hat)

## 17. Phased Roadmap (12 weeks to launch)

### Stage 0 — De-risk before code (Week 0–1)
- [ ] Lock compliance: first-party Commercial keys only; Claude via API only; draft privacy policy + DPA naming providers as sub-processors
- [ ] Stand up Beehiiv newsletter + Tally waitlist; start build-in-public posting (target 50+ signups in 2 weeks before heavy build)
- [ ] Buy Supastarter boilerplate (~$299 one-time)

### Phase 0 — Foundation (Week 1–2)
- [ ] Supabase project (one project, shared schema, RLS) — accelerated by Supastarter
- [ ] Auth: email/password + Google OAuth + magic link + MFA
- [ ] Create all core tables incl. `credit_ledger`, `mini_apps`, `user_app_instances` + RLS
- [ ] Backend Vault for the 50 provider keys (server-side only, never user-facing)
- [ ] Next.js 16 + TailAdmin + all41 design system tokens; deploy skeleton to Vercel
- [ ] Flat VPS (Hetzner/DigitalOcean + Coolify) for workers/router/automation

### Phase 1 — Financial spine FIRST (Week 2–3)
- [ ] **Build `api_usage_log` + logging function before any AI feature**
- [ ] **Build `credit_ledger` + real-time balance gate (pre-flight check)**
- [ ] Stripe Checkout for top-up → webhook → grant credits (idempotent, reconciled)
- [ ] Wire ONE model via OpenRouter and prove the full loop: call → log → deduct → balance
- [ ] $2 free-credit grant on signup (with anti-abuse: email verify + fingerprint)

### Phase 2 — AI Engine + Graph (Week 3–5)
- [ ] OpenRouter router, wire 3+ models (Claude, Gemini Flash, Perplexity, Groq for classify)
- [ ] Intent classifier (cheap fast model)
- [ ] Briefing flow UI (structured task object, one question per step)
- [ ] Mastra orchestration incl. verification loop (suspend/resume for confirm step)
- [ ] Structured output schemas per task type
- [ ] Chat interface with task decomposition + live credit deduction display
- [ ] **Graph engine (separate service) — build order:** (1) chunked nodes + embeddings, (2) deterministic edges, (3) two-stage grounding query with token ceiling, (4) async AI edges (batched, vector-pre-filtered, metered)

### Phase 3 — Mini App Framework (Week 5–7)
- [ ] **Mini app engine: config_schema → briefing reads it → user_app_instances saved → runs on engine**
- [ ] "Pick → chat → ready" flow in the Apps tab
- [ ] "Add routine" / "add calendar" (scheduled instances via Inngest/n8n, hidden)
- [ ] Ship 3 apps: Morning Briefing (cheapest, best demo), Competitor Crawler, Content Pipeline
- [ ] Meter every non-LLM call (crawl, search) into api_usage_log

### Phase 4 — Benchmark & Cost Automation (Week 7–9)
- [ ] Daily benchmark eval suite (task types × models) → routing weights
- [ ] Cost rate scraper (Firecrawl on provider pricing pages) → cost_rates
- [ ] Daily P&L rollup + daily_pnl; auto-markup guardrail
- [ ] 5:00–6:15 AM cron (scrape → recalc → balances → P&L → benchmark → Telegram digest)
- [ ] Models tab UI (benchmark table as trust feature)

### Phase 5 — Onboarding & Polish (Week 9–11)
- [ ] **Zero-config first run:** one JTBD question → auto-run one mini app on free credit → artifact in <5 min
- [ ] Dashboard: live credit balance, per-task cost preview, usage
- [ ] Optional Connect page (Gmail/Drive OAuth — the user's own world, not keys)
- [ ] Alert system (all financial thresholds); completion checklist for next actions

### Phase 6 — Launch (Week 11–12)
- [ ] End-to-end test of full flow
- [ ] Security audit (RLS every table; provider keys never exposed; webhook-failure & race paths tested)
- [ ] Cost accuracy check (log matches actual provider bills)
- [ ] Launch to waitlist + X/#buildinpublic + one subreddit + manual DMs
- [ ] Onboard first 5 paying users; build-in-public launch content (YouTube)

## 18. Definition of Done (launch checklist)

The product is ready to launch when:
- [ ] A brand-new, non-technical user signs up and gets a finished deliverable in under 5 minutes — with zero configuration and zero API keys
- [ ] A user can pick a mini app, answer 3–4 chat questions, and have it ready ("pick → chat → ready")
- [ ] Every API call (LLM AND non-LLM) is logged to api_usage_log before its result returns
- [ ] A pre-flight credit check blocks a task if balance is insufficient
- [ ] The $2 free credit works and is protected against abuse
- [ ] The daily P&L matches actual provider bills (verified against real invoices)
- [ ] RLS is confirmed on every table (User A cannot see User B's data)
- [ ] Provider API keys are backend-only and never appear in logs or the client
- [ ] The briefing flow prevents a user from running a vague task
- [ ] 3 mini apps work end to end via config schema → instance → scheduled run
- [ ] Stripe top-up grants credit correctly, even if the webhook is retried
- [ ] 5 real users are paying (topping up credit) and running weekly tasks

## 19. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| API provider raises prices without warning | Daily rate scraper + auto-markup adjustment |
| A dependency gets acquired/deprecated | Mastra + Inngest + OpenRouter, all swappable; no single-vendor lock |
| Reselling AI via credits violates provider terms | First-party keys only; Claude via API only; genuine value-add app; DPA + sub-processor disclosure; quarterly re-check |
| Stripe doesn't gate spend in real time | Own credit_ledger + pre-flight balance gate; idempotent webhooks |
| Power user burns through margin | Per-task cost logging + alert thresholds + optional caps |
| Hallucination reaches user | 5-layer anti-hallucination architecture |
| Supabase free tier limits hit | Upgrade path to Pro is one click, cost scales with revenue |
| Model changes weekly, routing goes stale | Daily benchmark keeps routing current |
| Security breach exposes user data | RLS + encryption + no plaintext keys + MFA |
| Founder burnout (solo build) | Phased plan, ship one phase at a time, mini apps ship incrementally |

## 20. First Three Things To Do Monday Morning

1. **Create the Supabase project** and run the core schema + RLS (accelerated by Supastarter). This is the foundation everything sits on.
2. **Build `api_usage_log` + `credit_ledger` and the logging/balance functions first** — before any AI feature. The financial engine is the spine; build it before the muscles.
3. **Wire one model through OpenRouter and prove the full loop** — pre-flight balance check → call → log → deduct → new balance — with a single model before adding routing or mini apps. If this loop is correct and every cent reconciles, everything else is addition.

*(Parallel, non-code: start the Beehiiv newsletter + Tally waitlist today. Distribution is the bottleneck, not building.)*

---

*End of Master Plan v1.1. This document is the map. Update it as reality teaches you what's wrong. Ship one phase at a time. Track every cent. Make the user think clearly. Grow in Easy way and Measurable.*
