# all41 — Mini App Autonomy Guide

**Version 1.0 · Companion to Master Plan v1.1 & Graph Engine Spec v1.1**
**Purpose: for each mini app, decide the right level of autonomy — fixed workflow, branching workflow, or autonomous agent — so we use the cheapest reliable approach per task, not "agent everything."**

> Core rule: **use the lowest level of autonomy that gets the job done.** Agents cost more (they reason at every step = more model calls), run slower, are harder to predict, and fail in stranger ways. For a credit-per-use business, an over-autonomous app eats margin. Match the intelligence to the task, exactly like matching the model to the task.

---

## The three levels

**Level 1 — Fixed workflow (pipeline). NOT an agent.**
Steps are predefined and always run in the same order. No dynamic decisions. Cheapest, fastest, most predictable, easiest to debug. Use whenever the steps are known and stable.

**Level 2 — Branching workflow (light agent).**
Predefined steps with a few conditional branches ("if X, do Y; if not, do Z"). Limited decision space. Some judgment, still bounded and predictable.

**Level 3 — Autonomous agent.**
Given a goal, the system decides its own steps: picks tools, judges results, decides whether to go deeper or stop, and re-plans mid-run. Most powerful and most "sharper than a human" — but most expensive and least predictable. Use only when the task genuinely needs adaptive reasoning.

All three run on **Mastra** (already chosen) — it handles fixed workflows AND autonomous agents with suspend/resume for human-in-the-loop. You pick the level per app when you build it; you don't need a different tool per level.

**The user never sees the difference.** Every app feels the same: pick → briefing → run → result. The mini-app wrapper hides the autonomy level. This guide is about what happens *inside*.

---

## Classification of every app discussed

| Mini App | Level | Why |
|---|---|---|
| **Clip This Video** | 1 — Fixed | Steps are always the same: transcribe → find moments → cut → caption → deliver. No branching needed. Cheapest to run. |
| **Narrate This** | 1 — Fixed | Clean text → generate audio → deliver. A straight pipeline. |
| **Translate Document** | 1 — Fixed | Extract → translate each segment → rebuild layout → return. Deterministic order. |
| **Summarize This Document** | 1 — Fixed | Ingest → chunk (graph) → synthesize layered summary. Straight pipeline over the graph. |
| **Product Description Rewriter** | 1 — Fixed | Pull catalog → rewrite each item → output. Same steps per product. |
| **Resume / ATS Optimizer** | 1 — Fixed | Parse → score against job → rewrite → re-score. Predefined loop. |
| **Seasonal Landing Page** | 1→2 — Fixed, light branch | Mostly fixed (pull products → write copy → assemble page). Branch only if data is missing (ask user). |
| **Campaign Kit** | 2 — Branching | Assembles multiple assets (page + social + email); branches by which channels the user picked. Bounded. |
| **Content Pipeline** | 2 — Branching | Branches by output format/platform chosen in the briefing. |
| **Morning Briefing** | 2 — Branching | Branches by which sources are connected and what's new that day. Bounded. |
| **Local SEO / GBP** | 2 — Branching | Conditional actions: if citation gaps → fix; if new review → draft reply; if post due → draft post. Limited, well-defined branches. |
| **Email Campaign** | 2 — Branching | Branches by sequence type and audience segment. |
| **CRM Lite (enrich)** | 2 — Branching | Branches by what data is missing per contact. |
| **Invoice Tracker** | 2 — Branching | Branches by document type and whether an invoice is overdue. |
| **Social Monitor** | 2 — Branching | Branches by source and whether a spike/alert threshold is crossed. |
| **SEO Audit** | 2 — Branching | Crawl → rules engine → branch findings by severity. Mostly bounded. |
| **Ad / PPC Audit** | 2 — Branching | Pull account → benchmark rules → branch by what's underperforming. |
| **Catalog Extractor / Migration Prep** | 2 — Branching | Branches by source platform and target import format. |
| **Grant Writing** | 2→3 — Branching, leans agent | Fixed drafting spine, but agent-like when researching the funder and deciding which past-work to pull from the graph. |
| **RFP / Proposal** | 3 — Agent | Must read the RFP, build a compliance matrix, decide which requirements need which evidence, pull the right past-performance, and verify nothing's missed. Genuinely adaptive. |
| **Competitive Intelligence** | 3 — Agent | Decides which sources to crawl, when to dig deeper, when to stop, how to synthesize. The classic autonomous deep-work case. |
| **Deep Research / Market Report** | 3 — Agent | Same as above — open-ended investigation across many sources, re-planning as it learns. |
| **Due Diligence Summary** | 3 — Agent | Ingests a document set, decides what's material, surfaces red flags — adaptive judgment over unknown content. |
| **Real-estate CMA** | 2→3 | Fixed comps model, but agent-like when deciding which comps are truly comparable and how to adjust. |
| **Business Valuation (standard)** | 2→3 | Fixed model math, agent-like in normalization judgment. (Ship "standard/estimate" only — see legal caveats in strategy docs.) |

---

## How to read the pattern

- **Simple, single-output tasks with known steps → Level 1.** These are your cheap, high-margin, high-frequency volume apps (Clip, Narrate, Translate, Rewrite). Build these first — they're the easiest to get right and the best acquisition hooks.
- **Multi-output or conditional tasks → Level 2.** Most recurring/retainer apps live here (Local SEO, Campaign Kit, audits). Bounded branching keeps them predictable and affordable while still feeling smart.
- **Open-ended, "figure it out" tasks → Level 3.** These are your high-ticket, deep-work, "sharper than a human" apps (RFP, Competitive Intel, Deep Research, Due Diligence). They justify a higher credit price because they do work a human genuinely can't do fast — but they cost the most to run, so price them accordingly.

---

## Cost & margin implications (why the level matters for credit pricing)

- **Level 1** — a handful of model calls, mostly cheap models. COGS ~cents. Price low, win on volume.
- **Level 2** — several calls with branching. COGS low-to-moderate. Price moderate.
- **Level 3** — many calls (the agent reasons at every step, may loop). COGS moderate-to-high and *variable per run*. **This is the danger zone for a credit model** — an agent that loops can burn tokens unpredictably.

**Guardrails for Level 3 agents (mandatory):**
1. **Hard step/iteration cap** — the agent stops after N steps no matter what.
2. **Token/credit ceiling per run** — show the user an estimate before running; hard-stop at the cap.
3. **Every model call metered to `api_usage_log`** before it returns (the Master Plan rule applies doubly here).
4. **Pre-flight credit check** — a Level 3 run can cost 10-50× a Level 1 run; make sure the balance covers the ceiling before starting.
5. **Verification loop at the end** — for high-stakes agent output (RFP, due diligence), a second model checks the result against sources before the user relies on it.

---

## Build guidance for Claude Code

- **Default to Level 1.** Only move an app up a level when the task genuinely can't be done with fixed steps. Don't reach for "agent" because it sounds better.
- **Build Level 1 apps first** (Phase 3 mini-app framework) — they prove the pattern cheaply.
- **Add Level 2 apps** once the framework is solid — these are the recurring-revenue engines.
- **Build Level 3 agents last**, and only with all five guardrails above in place. Never ship a Level 3 agent without a step cap and a credit ceiling.
- **Same wrapper for all three** — the briefing flow, credit deduction, and result display are identical. Only the execution engine inside differs. Reuse everything else.

---

*Mini app is the package; the autonomy level is the engine inside. Use the lowest level that works: fixed workflow for known steps, branching for bounded conditions, autonomous agent only for genuinely open-ended deep work — and cap every agent hard so it can't burn credits. Match the intelligence to the task, just like the model to the task.*
