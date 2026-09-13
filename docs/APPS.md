# all41 — Professional apps built to the SOP

Each professional app is a **crew** (`apps/web/src/lib/engine/crew.ts`): a team of specialist agents, each on the model best for its job, each given only its context slice, every call metered, a Verifier gate before output. Registered in `mini_apps` as a Level-3 `crew` step. One real app at a time (per the SOP); the generic template catalog is hidden.

## App #1 — SEO & GEO Optimizer (`seo-geo-optimizer`)
8 agents: Crawler → (Technical, Keyword, Competitor, Social in parallel) → GEO → Report Writer → Verifier. Encodes SEMrush/Ahrefs Site-Audit + Ahrefs KD/DR + 2026 GEO (Princeton citability levers, Reddit) methodology. Output `seo_report` (SEO+GEO health, quick wins, technical by severity, keywords, competitors, GEO, social, sources, flags). Data tools: DataForSEO, Google PageSpeed (free), Firecrawl, SerpAPI, Perplexity (all metered, mock-first). Tables `seo_runs`/`seo_run_steps`. Add-ons: geo-monitor, gap-finder, rank-pulse, site-health, advanced-research.

## App #2 — Proposal / RFP Maker (`proposal-rfp-maker`)
7 agents: RFP Shredder → Capture Analyst → Win-Theme Strategist → Proposal Writer → Consultant-Grade Editor → Compliance Checker → Verifier. Encodes the **Shipley method** (shred L/M/SOW, compliance matrix, capture + win themes, color-team compliance loop) + **MBB consultant-grade** communication (Pyramid Principle, MECE, rule-of-three, SCQA, action titles, so-what). Defining features: the **compliance loop** (Writer↔Compliance, cap 2 iterations) and the **strict Verifier gate** (fabricated credentials can disqualify a bid). Output `proposal_report` (compliance matrix, exec summary, action-titled sections, win themes, compliance summary, flags, sources). Mostly LLM + graph (RFP pasted or attached; bidder materials from attachments/graph). Tables `proposal_runs`/`proposal_run_steps`. Add-ons: bid-no-bid, proposal-review, past-performance-library.

## Quality layers (platform-wide)
- **Layer 1 — Verification Gate**: every crew run's Verifier checks the assembled output vs sources; conflicts surface as flags, never shipped silently.
- **Layer 2 — Development Validation**: each crew has a vitest that runs it end-to-end on mocks (all agents run, metered, trail written, gate fires).
- **Layer 3 — Public Monthly Benchmark**: `/benchmark` — same task 3 ways, judged blind by independent AI, published as-is; honest "live results when keys added" state.

## Engine notes
- `runCrew` dispatches by `crew_id` to a registry (`CREWS`); each entry owns its `stepsTable` + `createRun`/`finishRun`/`failRun` so multiple crews share one engine.
- Every crew runs end-to-end on mock providers (realistic demo output, $0 tool calls) so it's testable offline before keys are added at `/admin`.
- To go live: paste an LLM key (Anthropic/OpenAI) + the app's data keys (DataForSEO/Firecrawl/Perplexity for SEO) at `/admin`.
