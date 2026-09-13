# all41 — App Build SOP (six-part standard)

Every professional-grade app is specified in six parts before it's built, and satisfies the eight non-negotiables. **SEO/GEO Optimizer (App #1) is the reference implementation** — its crew lives in `apps/web/src/lib/engine/crew.ts`, registered as `seo-geo-optimizer`.

## The six parts
1. **Design Spec** — what it does, who it's for + category (drives routing), the specialist crew (role/persona/model each), workflow with handoffs, context (graph in/out), briefing, output (professional-grade form), pricing (pay-per-use, never charge a failed run), loop/automated, why it beats alternatives.
2. **Implementation Handoff** — ground rules, this app's tables, the crew (per agent: sharp Skill, minimal Context IN, Tools/Model, structured Output), context strategy (each agent gets only its slice), workflow orchestration, output object, briefing, loop, pricing, Done-when (incl. development validation + the verification gate).
3. **Industry Methodology Appendix** — encode how the leading professional tools actually work (metrics, thresholds, formulas), verify 2026 specifics at build, be honest about limits.
4. **Data Sources & Cost Structure** — the cheapest reliable pay-per-use stack, LLM cost per step, COGS per run (low/typical/high), biggest cost drivers, suggested credit price (3–3.5× COGS + fee), value gap, ToS notes.
5. **Add-On Services Menu** — recurring pay-per-run services by tier/cadence, "turn on = schedule, pay per run, stop anytime, caps, never a subscription", recommended launch set.
6. **Quality & Benchmark Layers** — Layer 1 Verification Gate (every run), Layer 2 Development Validation (before launch), Layer 3 Public Monthly Benchmark (blind, independent AI + user judges, published as-is — all41 only picks fair tasks and runs each path fairly).

## The eight non-negotiables
1. Pay for what you use — no subscriptions; configuring is free; never charge a failed run; price shown before it runs.
2. One universal workflow — every app runs the same engine; only crew/context/skills/personas/models/output differ.
3. Sharp, token-budgeted context per agent — the cost AND quality lever; cache in the graph so recurring runs re-pay only for changes.
4. Professional-grade or it doesn't launch — Part 3 encoded, Part 6 Layer 2 passed.
5. Independent proof, not self-praise — Layer 3 judged externally and blind.
6. Every call metered — logged to `api_usage_log` before the result returns.
7. Tool, not service — the user runs it and owns the result.
8. Simple for non-technical users — no keys, no model pickers, no workflow builders; customization Levels 1 & 2 only (refine output + save preferences).

## How this maps onto the built stack (deliberate deviations)
- **Crew engine** = `apps/web/src/lib/engine/crew.ts` (parallel specialists, per-agent `seo_run_steps` trail, Verifier gate). No Mastra — plain TS orchestration on our direct-provider `callModel` + `metered()` spine.
- **Router** = `routing_weights` + daily benchmark; direct first-party providers only, no aggregator/LiteLLM/OpenRouter (founder decision).
- **Data sources** = DataForSEO (SEO data), Firecrawl (crawl), Google PageSpeed (free CWV), SerpAPI (search), Perplexity (GEO live) — all metered, mock-first; keys in the Vault via `/admin`.
- **Autonomy** = Levels 1/2/3 per `docs/APP_AUTONOMY_GUIDE.md`; a crew is the professional Level-3 form.
