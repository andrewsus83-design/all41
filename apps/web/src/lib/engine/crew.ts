import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { callModel } from "@/lib/ai/callModel";
import { routeTask } from "@/lib/ai/router";
import { splitModelId, type ChatMessage } from "@/lib/ai/types";
import { estimateCost, metered } from "@/lib/finance";
import type { Json } from "@/lib/supabase/database.types";
import { OUTPUT_SCHEMAS, type OutputSchemaKey } from "./schemas";
import { verifyOutput, type Verification } from "./verify";
import type { SearchResult } from "./apps";

/**
 * The CREW engine (all41 professional-grade app tier — see docs/APP1_SEO_GEO_COMPLETE.md).
 * A crew is a team of specialist agents that hand off in sequence/parallel, each on the model best for its job,
 * each given ONLY its purpose-built context slice (the cost + quality lever). Every model/tool call is metered
 * (Ground Rule 5); a Verifier gate checks the assembled output before it ships (Quality Layer 1).
 *
 * Runs end-to-end on mock providers ($0 tool calls) so the whole crew is testable offline.
 */

export type CrewTool = "search" | "crawl" | "dataforseo" | "pagespeed";

export type CrewTools = {
  search: (q: string) => Promise<{ results: SearchResult[]; isMock: boolean; billedUsd: number }>;
  crawl: (url: string) => Promise<{ url: string; markdown: string; isMock: boolean; billedUsd: number }>;
  dataforseo: (kind: "serp" | "keywords" | "backlinks", input: string) => Promise<{ data: unknown; text: string; isMock: boolean; billedUsd: number }>;
  pagespeed: (url: string) => Promise<{ data: unknown; text: string; isMock: boolean; billedUsd: number }>;
};

export type CrewStep = {
  id: string;
  kind: "crew";
  crew_id: string; // registry key, e.g. "seo_geo"
  task_type: string; // routes the final assembler + drives the cost estimate
  schema: OutputSchemaKey; // the final report schema, e.g. "seo_report"
  /** Depth follows a config answer (light/standard/deep → fewer/more sources). */
  depth_from?: { key: string; values: Record<string, "light" | "standard" | "deep"> };
  when?: string;
};

export type CrewDepth = "light" | "standard" | "deep";

export type CrewAgentTrail = {
  id: string; name: string; model: string; billedUsd: number; findings: number; status: "ok" | "error"; isMock: boolean;
};

/** Progress events — plain words, safe to show as-is. */
export type CrewEvent =
  | { step: "crew.agent"; id: string; name: string; label: string; phase: "running" | "done"; billedSoFar: number; isMock?: boolean; findings?: number }
  | { step: "crew.gate"; verdict: Verification["verdict"] | "skipped"; conflicts: number };

export type CrewStepResult = {
  id: string;
  kind: "crew";
  crew_id: string;
  output: unknown;
  schema: OutputSchemaKey;
  modelsUsed: string[];
  agents: CrewAgentTrail[];
  verification?: Verification;
  isMock: boolean;
  billedUsd: number;
  seoRunId?: string;
};

export type CrewContext = {
  userId: string;
  taskId: string;
  config: Record<string, unknown>;
  userData: string;
  groundingCtx: string;
  tools: CrewTools;
  onEvent?: (e: CrewEvent) => void;
  /** Which per-agent trail table this crew writes to (seo_run_steps | proposal_run_steps). */
  stepsTable?: string;
};

// ---------- small per-agent finding schemas ----------
const findingsSchema = (name: string, item: Record<string, unknown>, required: string[]) => ({
  name,
  schema: {
    type: "object", additionalProperties: false, required: ["findings", "notes"],
    properties: {
      findings: { type: "array", items: { type: "object", additionalProperties: false, required, properties: item } },
      notes: { type: "string" },
    },
  },
});

const CREW_SCHEMAS = {
  crawl: {
    name: "site_structure",
    schema: {
      type: "object", additionalProperties: false, required: ["products", "schema_present", "summary", "issues_seen"],
      properties: {
        products: { type: "array", items: { type: "string" } },
        schema_present: { type: "boolean" },
        summary: { type: "string" },
        issues_seen: { type: "array", items: { type: "string" } },
      },
    },
  },
  technical: findingsSchema("technical_findings", { issue: { type: "string" }, severity: { type: "string", enum: ["error", "warning", "notice"] }, fix: { type: "string" } }, ["issue", "severity", "fix"]),
  keyword: findingsSchema("keyword_findings", { keyword: { type: "string" }, intent: { type: "string" }, recommendation: { type: "string" } }, ["keyword", "intent", "recommendation"]),
  competitor: findingsSchema("competitor_findings", { competitor: { type: "string" }, gap: { type: "string" }, how_to_close: { type: "string" } }, ["competitor", "gap", "how_to_close"]),
  social: findingsSchema("social_findings", { platform: { type: "string" }, recommendation: { type: "string" } }, ["platform", "recommendation"]),
  geo: findingsSchema("geo_findings", { factor: { type: "string" }, status: { type: "string" }, fix: { type: "string" } }, ["factor", "status", "fix"]),
} as const;

// ---------- encoded methodology (Part 3) ----------
const METHOD = {
  technical: `You are a rigorous technical-SEO engineer. Diagnose against the SEMrush/Ahrefs Site-Audit checklist across six areas: crawlability & indexability (robots, canonical, sitemap, orphan pages, redirect chains, 4xx/5xx), HTTPS/security, Core Web Vitals (2026 "good": LCP ≤2.5s, INP ≤200ms, CLS ≤0.1), on-page (titles/meta/H1/alt/thin content), internal linking, and schema.org validity. Classify every issue error / warning / notice using the pro severity model (broken pages, blocked-when-shouldn't-be, no HTTPS = error). For each: the specific fix. Flag anything you cannot verify (JS-rendered content, field CrUX) rather than inventing it.`,
  keyword: `You are a data-driven keyword & content strategist. For the chosen products only: infer search intent from what actually ranks in the SERP (informational / navigational / commercial / transactional — the dominant page type IS the intent, not the keyword's words). Find keyword gaps and thin/weak content. Ground ideas in the SERP data provided; NEVER invent search volumes or difficulty. Recommend the specific keyword + content to add, with its intent.`,
  competitor: `You are a sharp competitive researcher. For each competitor, find where they beat the user: content topics they cover that the user doesn't, keywords they rank for, backlink themes (referring domains matter more than raw links; watch anchor over-optimization), and social strength. Output ACTIONABLE gaps ("they rank for X via Y and links from Z — close it by …"), never raw dumps.`,
  social: `You are a social-signals analyst. Assess the brand's public social footprint as a visibility/GEO factor: which platforms, engagement, competitor social, and — key for GEO — presence on sources AI engines crawl (Reddit, LinkedIn, forums). Recommend where to show up. Analysis + recommendation ONLY, never posting. Respect platform ToS: public-presence signals only.`,
  geo: `You are an AI-search (GEO) specialist — the differentiator. Assess whether the site is citable by AI answer engines (ChatGPT/Perplexity/Gemini/AI Overviews). Check the citability levers (from Princeton GEO research): quotations (+~41% visibility), statistics (+~30%), citing sources (+~30%), schema/structured data, Q&A-formatted content, self-contained answer sentences, entity presence (Wikipedia/Wikidata), and authoritative UGC — Reddit is the #1–2 most-cited domain on every major engine. Keyword stuffing performs WORSE than nothing — flag it. Note that AI visibility is a snapshot and can shift overnight. For each factor: current status + the specific fix.`,
  prioritizer: `You are a pragmatic consultant translating expert findings for a non-technical owner. Merge ALL findings into ONE prioritized action plan. Rank by impact × effort: the top 5 quick wins first (high impact, low effort), then technical (by severity), keywords/content, competitors, GEO, social. Compute two 0–100 health scores (SEO and GEO) from the findings — more/severer issues = lower score. Every item: what, why it matters, expected impact, plain-language fix. Cite sources. Output the seo_geo_report JSON exactly.`,
};

const SYS_JSON = "Respond with a single JSON object only, matching the schema. Cite factual claims with source refs (C# crawl, R# search, K# keyword data, P# PageSpeed). Never invent numbers.";

// ---------- helpers ----------
function depthCount(depth: CrewDepth) {
  return depth === "light" ? { competitors: 1, keywords: 6 } : depth === "deep" ? { competitors: 3, keywords: 20 } : { competitors: 2, keywords: 12 };
}
function pick(config: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) { const v = config[k]; if (v !== undefined && v !== null && String(v).trim()) return Array.isArray(v) ? v.join(", ") : String(v); }
  return "";
}
function guessUrl(raw: string) {
  const s = String(raw).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+/.test(s)) return `https://${s}`;
  return s ? `https://${s.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com` : "";
}

/** A realistic demo audit shown when no data/model keys are set — clearly flagged isMock in the UI. */
function mockSeoReport(site: string, products: string[]) {
  const p = products[0] ?? "your product";
  return {
    health_score: { seo: 68, geo: 41, change_since_last: "first run" },
    quick_wins: [
      { action: `Add a unique meta description to the ${p} page`, why: "It's missing, so Google writes its own — usually worse.", expected_impact: "Higher click-through from search within days." },
      { action: "Add FAQ schema with 3–5 real questions", why: "AI answer engines lift Q&A-structured content; you have none.", expected_impact: "First step toward being cited by ChatGPT/Perplexity." },
      { action: "Compress the 4 largest images on the homepage", why: "They push LCP over 2.5s on mobile.", expected_impact: "Faster load, small ranking lift." },
      { action: "Fix 2 broken internal links", why: "They waste crawl budget and frustrate visitors.", expected_impact: "Cleaner crawl, better UX." },
      { action: "Add one self-contained answer sentence per product", why: "AI engines quote sentences that state a full answer up front.", expected_impact: "More AI citations." },
    ],
    technical: [
      { issue: "Missing meta descriptions on 6 pages", severity: "warning", fix: "Write a 150-char description per page.", affected_pages: [`${site}/products`] },
      { issue: "LCP 3.1s on mobile homepage", severity: "warning", fix: "Compress hero image, defer non-critical JS.", affected_pages: [site] },
      { issue: "No XML sitemap found", severity: "error", fix: "Generate and submit a sitemap.xml.", affected_pages: [] },
    ],
    keywords_content: [
      { keyword: `best ${p} for small business`, intent: "commercial", recommendation: "Write a comparison page — the SERP is all comparison content." },
      { keyword: `${p} pricing`, intent: "transactional", recommendation: "Add a clear pricing page; a competitor owns this term." },
    ],
    competitors: [
      { competitor: "a competitor", gap: "They rank for 40 informational keywords via a blog you don't have.", how_to_close: "Start a small resource hub answering buyer questions." },
    ],
    geo: [
      { factor: "Structured data (schema.org)", status: "Missing", fix: "Add Product + FAQ + Organization schema." },
      { factor: "Reddit / UGC presence", status: "None found", fix: "Get mentioned in relevant subreddit threads — AI engines cite Reddit heavily." },
      { factor: "Self-contained answers", status: "Weak", fix: "Lead each page with a sentence that fully answers its query." },
    ],
    social: [
      { platform: "LinkedIn", recommendation: "No company page found — create one; it feeds AI citability." },
    ],
    sources: [{ ref: "C1", quote: `Crawled ${site} — placeholder run (connect data keys for a live audit).` }],
    flags: ["Demo run on placeholder data. Connect the data sources in /admin for a live, sourced audit."],
    confidence: 0.4,
  };
}

// ---------- the runner ----------
type Runner = (ctx: CrewContext, step: CrewStep, depth: CrewDepth, runId: string) => Promise<Omit<CrewStepResult, "id" | "kind" | "crew_id" | "seoRunId">>;

async function agentCall(
  ctx: CrewContext, runId: string,
  a: { id: string; name: string; taskType: string; system: string; context: string; schema: { name: string; schema: Record<string, unknown> }; label: string },
  billedSoFar: () => number,
): Promise<{ json: Record<string, unknown>; billedUsd: number; model: string; isMock: boolean; findings: number }> {
  ctx.onEvent?.({ step: "crew.agent", id: a.id, name: a.name, label: a.label, phase: "running", billedSoFar: billedSoFar() });
  const { modelId, isMock } = await routeTask(a.taskType);
  const { provider, model } = splitModelId(modelId);
  const messages: ChatMessage[] = [
    { role: "system", content: `${a.system}\n\n${SYS_JSON}` },
    { role: "user", content: a.context.slice(0, 24000) },
  ];
  const est = await estimateCost(provider, model, messages.reduce((n, m) => n + m.content.length, 0), 900);
  let json: Record<string, unknown> = {};
  let billed = 0;
  let status: "ok" | "error" = "ok";
  try {
    const r = await metered({
      userId: ctx.userId, taskId: ctx.taskId, provider, model, callKind: "llm", estimatedBilledUsd: est.billedUsd,
      call: async () => {
        const out = await callModel({ model: modelId, messages, jsonSchema: a.schema, maxTokens: 1600, temperature: 0.2 });
        return { result: out, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.reportedCostUsd };
      },
    });
    json = (r.result.json ?? {}) as Record<string, unknown>;
    billed = r.billedUsd;
    await adminClient().from((ctx.stepsTable ?? "seo_run_steps") as "seo_run_steps").insert({
      run_id: runId, user_id: ctx.userId, agent: a.id, input: { context_chars: a.context.length } as unknown as Json,
      output: json as unknown as Json, model_used: modelId,
      tokens_in: r.result.usage.inputTokens, tokens_out: r.result.usage.outputTokens, cost_usd: r.costUsd, status: "ok",
    });
  } catch (e) {
    status = "error";
    await adminClient().from((ctx.stepsTable ?? "seo_run_steps") as "seo_run_steps").insert({ run_id: runId, user_id: ctx.userId, agent: a.id, model_used: modelId, status: "error", output: { error: String(e).slice(0, 300) } as unknown as Json }).select();
  }
  const findings = Array.isArray(json.findings) ? (json.findings as unknown[]).length : Array.isArray(json.products) ? (json.products as unknown[]).length : 0;
  ctx.onEvent?.({ step: "crew.agent", id: a.id, name: a.name, label: a.label, phase: "done", billedSoFar: billedSoFar() + billed, isMock, findings });
  return { json, billedUsd: billed, model: modelId, isMock, findings, ...(status === "error" ? {} : {}) };
}

const seoGeoRunner: Runner = async (ctx, step, depth, runId) => {
  const { config, tools } = ctx;
  const site = guessUrl(pick(config, "site_url", "website", "url"));
  const competitorsRaw = pick(config, "competitor_urls", "competitors");
  const competitors = competitorsRaw ? competitorsRaw.split(",").map((s) => guessUrl(s)).filter(Boolean).slice(0, depthCount(depth).competitors) : [];
  const goal = pick(config, "goal", "focus") || "both";
  const business = pick(config, "business", "what_you_do", "brief_note");
  const productPref = pick(config, "products", "product_scope") || "All";

  const trail: CrewAgentTrail[] = [];
  const models = new Set<string>();
  let billed = 0;
  const soFar = () => billed;
  const record = (id: string, name: string, r: { model: string; billedUsd: number; findings: number; isMock: boolean }) => {
    trail.push({ id, name, model: r.model, billedUsd: r.billedUsd, findings: r.findings, status: "ok", isMock: r.isMock });
    models.add(r.model); billed += r.billedUsd;
  };

  // 1. Crawler — fetch site + PageSpeed, detect products (tools are metered inside apps.ts)
  ctx.onEvent?.({ step: "crew.agent", id: "crawler", name: "Crawler", label: "Reading your site", phase: "running", billedSoFar: soFar() });
  const siteCrawl = site ? await tools.crawl(site) : { url: "", markdown: "", isMock: true, billedUsd: 0 };
  billed += siteCrawl.billedUsd;
  const psi = site ? await tools.pagespeed(site) : { data: null, text: "", isMock: true, billedUsd: 0 };
  billed += psi.billedUsd;
  const compCrawls = await Promise.all(competitors.map((c) => tools.crawl(c)));
  for (const c of compCrawls) billed += c.billedUsd;
  const crawler = await agentCall(ctx, runId, {
    id: "crawler", name: "Crawler", taskType: "crawl",
    system: "You are a meticulous technical auditor. From the crawled markdown, detect the distinct products/pages the site sells, whether schema.org is present, and a one-paragraph structure summary. Do not interpret SEO quality yet.",
    context: `SITE: ${site}\nUSER SCOPE: ${productPref}\n[C1] CRAWL:\n${siteCrawl.markdown.slice(0, 8000)}\n\n[P1] PAGESPEED:\n${psi.text.slice(0, 2000)}`,
    schema: CREW_SCHEMAS.crawl, label: "Reading your site",
  }, soFar);
  record("crawler", "Crawler", crawler);
  const products = (Array.isArray(crawler.json.products) ? (crawler.json.products as string[]) : []).slice(0, 8);
  const chosen = /top/i.test(productPref) ? products.slice(0, 3) : products;
  const siteSummary = String(crawler.json.summary ?? "").slice(0, 1500);

  const compContext = compCrawls.map((c, i) => `[C${i + 2}] COMPETITOR ${c.url}:\n${c.markdown.slice(0, 3000)}`).join("\n\n") || "(none provided)";

  // 2. Parallel specialists — each gets ONLY its slice
  const [technical, keyword, competitor, social] = await Promise.all([
    agentCall(ctx, runId, { id: "technical", name: "Technical Auditor", taskType: "reasoning", system: METHOD.technical, context: `SITE: ${site}\n[C1] STRUCTURE:\n${siteSummary}\nISSUES SEEN: ${(crawler.json.issues_seen as string[] ?? []).join("; ")}\nSCHEMA PRESENT: ${crawler.json.schema_present}\n[P1] PAGESPEED:\n${psi.text.slice(0, 2500)}`, schema: CREW_SCHEMAS.technical, label: "Checking the tech" }, soFar),
    (async () => { const serp = await tools.dataforseo("serp", chosen.join(", ") || business || site); billed += serp.billedUsd; return agentCall(ctx, runId, { id: "keyword", name: "Keyword Analyst", taskType: "research", system: METHOD.keyword, context: `BUSINESS: ${business}\nCHOSEN PRODUCTS: ${chosen.join(", ") || "all"}\nGOAL: ${goal}\n[K1] SERP/KEYWORD DATA:\n${serp.text.slice(0, 6000)}`, schema: CREW_SCHEMAS.keyword, label: "Finding keyword gaps" }, soFar); })(),
    agentCall(ctx, runId, { id: "competitor", name: "Competitor Analyst", taskType: "research", system: METHOD.competitor, context: `YOUR SITE: ${site}\n${siteSummary}\nCHOSEN PRODUCTS: ${chosen.join(", ")}\n${compContext}`, schema: CREW_SCHEMAS.competitor, label: "Comparing competitors" }, soFar),
    agentCall(ctx, runId, { id: "social", name: "Social Analyst", taskType: "research", system: METHOD.social, context: `BRAND: ${business || site}\nGOAL: ${goal}\nCOMPETITORS: ${competitors.join(", ")}`, schema: CREW_SCHEMAS.social, label: "Assessing social presence" }, soFar),
  ]);
  record("technical", "Technical Auditor", technical);
  record("keyword", "Keyword Analyst", keyword);
  record("competitor", "Competitor Analyst", competitor);
  record("social", "Social Analyst", social);

  // 3. GEO — synthesizes across 2–5 + a live citation "test" (search)
  const geoTest = await tools.search(`${business || chosen[0] || site} recommendation`);
  billed += geoTest.billedUsd;
  const socialFindings = (social.json.findings as unknown[]) ?? [];
  const geo = await agentCall(ctx, runId, {
    id: "geo", name: "GEO Analyst", taskType: "reasoning", system: METHOD.geo,
    context: `SITE STRUCTURE:\n${siteSummary}\nSCHEMA PRESENT: ${crawler.json.schema_present}\nSOCIAL FINDINGS: ${JSON.stringify(socialFindings).slice(0, 2000)}\nTARGET QUERIES: ${chosen.join(", ")}\n[R1] LIVE AI-CITATION TEST:\n${geoTest.results.map((r, i) => `[R${i + 1}] ${r.title} — ${r.link}`).join("\n")}`,
    schema: CREW_SCHEMAS.geo, label: "Testing AI-search visibility",
  }, soFar);
  record("geo", "GEO Analyst", geo);

  // 4. Prioritizer — assembles ONE report (seo_report schema). Mock → a realistic demo audit.
  ctx.onEvent?.({ step: "crew.agent", id: "prioritizer", name: "Report Writer", label: "Writing your plan", phase: "running", billedSoFar: soFar() });
  const { isMock: assemblerMock } = await routeTask(step.task_type);
  let report: unknown;
  if (assemblerMock) {
    report = mockSeoReport(site || "your-site.com", chosen.length ? chosen : ["your product"]);
    // meter one mock assembler call for the audit trail
    const pr = await agentCall(ctx, runId, { id: "prioritizer", name: "Report Writer", taskType: step.task_type, system: METHOD.prioritizer, context: "MOCK", schema: OUTPUT_SCHEMAS.seo_report as unknown as { name: string; schema: Record<string, unknown> }, label: "Writing your plan" }, soFar);
    trail.push({ id: "prioritizer", name: "Report Writer", model: pr.model, billedUsd: pr.billedUsd, findings: 0, status: "ok", isMock: true });
    models.add(pr.model); billed += pr.billedUsd;
  } else {
    const pr = await agentCall(ctx, runId, {
      id: "prioritizer", name: "Report Writer", taskType: step.task_type, system: METHOD.prioritizer,
      context: `SITE: ${site}\nGOAL: ${goal}\nFINDINGS:\nTECHNICAL: ${JSON.stringify(technical.json.findings)}\nKEYWORDS: ${JSON.stringify(keyword.json.findings)}\nCOMPETITORS: ${JSON.stringify(competitor.json.findings)}\nSOCIAL: ${JSON.stringify(social.json.findings)}\nGEO: ${JSON.stringify(geo.json.findings)}`,
      schema: OUTPUT_SCHEMAS.seo_report as unknown as { name: string; schema: Record<string, unknown> }, label: "Writing your plan",
    }, soFar);
    report = pr.json;
    trail.push({ id: "prioritizer", name: "Report Writer", model: pr.model, billedUsd: pr.billedUsd, findings: 0, status: "ok", isMock: pr.isMock });
    models.add(pr.model); billed += pr.billedUsd;
  }

  // 5. Verifier gate (Quality Layer 1) — checks claims vs sources; conflicts surfaced as flags, never passed silently.
  const sourcesText = `CRAWL:\n${siteSummary}\nPAGESPEED:\n${psi.text.slice(0, 1500)}\nKEYWORD DATA notes: ${keyword.json.notes ?? ""}\nGEO test: ${geoTest.results.map((r) => r.title).join("; ")}`;
  let verification: Verification | undefined;
  try {
    verification = await verifyOutput({ userId: ctx.userId, taskId: ctx.taskId, output: report, context: sourcesText });
    billed += verification.billedUsd ?? 0;
    if (verification.model) models.add(verification.model);
    if (verification.verdict !== "supported" && report && typeof report === "object") {
      const r = report as { flags?: string[] };
      r.flags = [...(r.flags ?? []), ...verification.conflicts.map((c) => `Unverified: ${c}`), ...verification.unsupported_claims.map((c) => `No source: ${c}`)].slice(0, 12);
    }
    ctx.onEvent?.({ step: "crew.gate", verdict: verification.verdict, conflicts: verification.conflicts.length });
  } catch {
    ctx.onEvent?.({ step: "crew.gate", verdict: "skipped", conflicts: 0 });
  }

  return { output: report, schema: "seo_report", modelsUsed: [...models], agents: trail, verification, isMock: assemblerMock || trail.some((t) => t.isMock), billedUsd: billed };
};

// ---------- Proposal / RFP crew (App #2 — Shipley + MBB, docs/APP2_PROPOSAL_RFP.md) ----------
const METHOD_PROPOSAL = {
  shredder: `You are a meticulous compliance reader running the Shipley "shred". Extract EVERY requirement from the RFP into a compliance matrix. Tag each by source: Section L (instructions to offerors — format/structure/page limits), Section M (evaluation criteria — how it's scored, the most important), or SOW/PWS (the scope of work). Capture every "shall/must/will". Number each. A missed requirement = disqualified unread. Do not draft anything.`,
  capture: `You are a sharp capture strategist (Shipley capture). Build the capture picture: the issuer's profile, their likely hot buttons (what they actually care about), the competitive landscape, and the bidder's OWN strengths and relevant past performance from the materials provided. Organize around the customer's hot buttons, not the bidder's org chart.`,
  winthemes: `You are a competitive bid strategist. Define win themes (why THIS bidder, mapped to the customer's hot buttons) and discriminators (what makes them demonstrably different from competitors), aligned to the Section M evaluation criteria so they hit what is actually scored. Apply MECE: no two themes overlap, and together they leave no obvious "but what about…?" gap. Every theme needs a real proof point from the bidder's materials — never invent one.`,
  writer: `You are a seasoned deal-closer who writes to win (Shipley customer-focused writing). Draft each proposal section as persuasive, customer-focused prose mapped 1:1 to the compliance matrix, weaving in the win themes and REAL proof points. Follow the RFP's required structure (Section L). Lead with benefits; make it easy for an evaluator to score. If prior gaps are listed, fix them.`,
  editor: `You are a top-tier strategy consultant and executive-communication specialist. Rewrite the draft to MBB (McKinsey/BCG/Bain) standard WITHOUT changing what it covers: (1) Pyramid Principle — answer first, then 3 grouped supporting arguments, then evidence; (2) MECE arguments; (3) rule of three (synthesize to ~3 strong arguments per section, not a laundry list); (4) SCQA for the executive summary; (5) action titles — every section heading states the insight, not the topic ("Option B is live in 90 days", not "Timeline"); (6) every claim carries a so-what. Produce an executive_summary and the rewritten sections with action titles.`,
  compliance: `You are a rigorous, zero-miss auditor running Shipley Pink/Red-team logic. Cross-check the draft against the compliance matrix: is EVERY requirement answered, in the right section, in the required format? Mark each row compliant / partial / missing with its response_location and evidence. List every gap. Do not pass until 100% covered — a missed requirement loses the bid.`,
};

const PROPOSAL_SCHEMAS = {
  shredder: { name: "rfp_shred", schema: { type: "object", additionalProperties: false, required: ["matrix", "notes"], properties: {
    matrix: { type: "array", items: { type: "object", additionalProperties: false, required: ["req_id", "source_section", "requirement"], properties: { req_id: { type: "string" }, source_section: { type: "string", enum: ["L", "M", "SOW", "other"] }, requirement: { type: "string" }, format_rule: { type: "string" } } } },
    notes: { type: "string" } } } },
  capture: { name: "capture", schema: { type: "object", additionalProperties: false, required: ["issuer_profile", "hot_buttons", "competitors", "bidder_strengths", "past_performance"], properties: {
    issuer_profile: { type: "string" }, hot_buttons: { type: "array", items: { type: "string" } }, competitors: { type: "array", items: { type: "string" } }, bidder_strengths: { type: "array", items: { type: "string" } }, past_performance: { type: "array", items: { type: "string" } } } } },
  winthemes: { name: "win_themes", schema: { type: "object", additionalProperties: false, required: ["win_themes", "notes"], properties: {
    win_themes: { type: "array", items: { type: "object", additionalProperties: false, required: ["theme", "hot_button", "discriminator", "proof_point"], properties: { theme: { type: "string" }, hot_button: { type: "string" }, discriminator: { type: "string" }, proof_point: { type: "string" } } } }, notes: { type: "string" } } } },
  writer: { name: "draft", schema: { type: "object", additionalProperties: false, required: ["sections", "notes"], properties: {
    sections: { type: "array", items: { type: "object", additionalProperties: false, required: ["section", "content"], properties: { section: { type: "string" }, content: { type: "string" }, covers_req_ids: { type: "array", items: { type: "string" } } } } }, notes: { type: "string" } } } },
  editor: { name: "edited", schema: { type: "object", additionalProperties: false, required: ["executive_summary", "sections"], properties: {
    executive_summary: { type: "string" }, sections: { type: "array", items: { type: "object", additionalProperties: false, required: ["section", "action_title", "content"], properties: { section: { type: "string" }, action_title: { type: "string" }, content: { type: "string" }, covers_req_ids: { type: "array", items: { type: "string" } } } } } } } },
  compliance: { name: "compliance_check", schema: { type: "object", additionalProperties: false, required: ["matrix", "gaps"], properties: {
    matrix: { type: "array", items: { type: "object", additionalProperties: false, required: ["req_id", "source_section", "requirement", "status", "response_location"], properties: { req_id: { type: "string" }, source_section: { type: "string", enum: ["L", "M", "SOW", "other"] }, requirement: { type: "string" }, status: { type: "string", enum: ["compliant", "partial", "missing"] }, response_location: { type: "string" }, evidence: { type: "string" } } } }, gaps: { type: "array", items: { type: "string" } } } } },
} as const;

function mockProposalReport(subject: string) {
  const s = subject || "the engagement";
  return {
    executive_summary: `We recommend ${s} deliver its scope through a phased, low-risk approach led by a team with directly relevant past performance. This proposal answers every requirement in the solicitation, maps our strengths to your evaluation criteria, and prices the work transparently. (Demo run — paste a real RFP and connect an AI key in /admin for a live, sourced draft.)`,
    compliance_matrix: [
      { req_id: "L-1", source_section: "L", requirement: "Submit a technical volume, max 20 pages", status: "compliant", response_location: "Technical Approach", evidence: "18-page technical volume drafted" },
      { req_id: "M-1", source_section: "M", requirement: "Demonstrate relevant past performance", status: "compliant", response_location: "Past Performance", evidence: "3 relevant references from your materials" },
      { req_id: "SOW-3", source_section: "SOW", requirement: "Provide a 90-day implementation plan", status: "partial", response_location: "Implementation", evidence: "Plan drafted — confirm dates with your team" },
    ],
    proposal_sections: [
      { section: "Executive Summary", action_title: "A phased approach that is live in 90 days at lower risk", content: "SCQA-framed summary leading with the recommendation, then three grouped arguments." },
      { section: "Technical Approach", action_title: "Our method removes the two risks that sink projects like this", content: "Answer-first, MECE breakdown of the approach with a so-what on each step." },
      { section: "Past Performance", action_title: "We have done this exact work three times, on time", content: "Three real references pulled from your materials, each tied to a hot button." },
    ],
    win_themes: [
      { theme: "Lower delivery risk through a proven phased method", hot_button: "on-time delivery", discriminator: "3 comparable projects delivered on schedule", proof_point: "past-performance references" },
      { theme: "Faster time-to-value", hot_button: "budget certainty", discriminator: "90-day first milestone vs. typical 6 months", proof_point: "your implementation record" },
    ],
    compliance_summary: { total: 3, compliant: 2, partial: 1, missing: 0 },
    flags: ["Demo run on placeholder data. Paste the real RFP and connect an AI key in /admin for a live, fact-checked draft."],
    sources: [{ ref: "RFP", quote: "Placeholder — connect a real RFP for cited requirements." }],
    confidence: 0.4,
  };
}

const proposalRunner: Runner = async (ctx, step, _depth, runId) => {
  const { config } = ctx;
  const rfp = [pick(config, "rfp_text", "rfp", "source_text"), ctx.userData].filter(Boolean).join("\n\n").slice(0, 24000);
  const bidder = pick(config, "bidder", "bidder_name", "business") || "the bidder";
  const materials = ctx.userData || "(no bidder materials attached — attach past proposals & capabilities in My Apps for a sharper, specific draft)";
  const emphasis = pick(config, "emphasis");

  const trail: CrewAgentTrail[] = [];
  const models = new Set<string>();
  let billed = 0;
  const soFar = () => billed;
  const rec = (id: string, name: string, r: { model: string; billedUsd: number; findings: number; isMock: boolean }) => { trail.push({ id, name, model: r.model, billedUsd: r.billedUsd, findings: r.findings, status: "ok", isMock: r.isMock }); models.add(r.model); billed += r.billedUsd; };

  // 1. Shred the RFP
  const shred = await agentCall(ctx, runId, { id: "shredder", name: "RFP Shredder", taskType: "summarize", system: METHOD_PROPOSAL.shredder, context: `RFP:\n${rfp || "(no RFP text — ask the user to paste the RFP)"}`, schema: PROPOSAL_SCHEMAS.shredder, label: "Shredding the RFP" }, soFar);
  rec("shredder", "RFP Shredder", shred);
  const matrix = (shred.json.matrix as unknown[]) ?? [];
  const sectionM = matrix.filter((m) => (m as { source_section?: string }).source_section === "M");

  // 2. Capture (issuer research + bidder materials)
  const issuerSearch = await ctx.tools.search(`${pick(config, "issuer") || bidder} priorities`);
  billed += issuerSearch.billedUsd;
  const capture = await agentCall(ctx, runId, { id: "capture", name: "Capture Analyst", taskType: "research", system: METHOD_PROPOSAL.capture, context: `BIDDER: ${bidder}\nEMPHASIS: ${emphasis}\nRFP SUMMARY:\n${String(shred.json.notes ?? "").slice(0, 1500)}\nBIDDER MATERIALS:\n${materials.slice(0, 8000)}\n[R] ISSUER RESEARCH: ${issuerSearch.results.map((r) => r.title).join("; ")}`, schema: PROPOSAL_SCHEMAS.capture, label: "Researching the buyer" }, soFar);
  rec("capture", "Capture Analyst", capture);

  // 3. Win themes (mapped to Section M)
  const winthemes = await agentCall(ctx, runId, { id: "winthemes", name: "Win-Theme Strategist", taskType: "reasoning", system: METHOD_PROPOSAL.winthemes, context: `HOT BUTTONS: ${JSON.stringify(capture.json.hot_buttons)}\nBIDDER STRENGTHS: ${JSON.stringify(capture.json.bidder_strengths)}\nSECTION M (scored): ${JSON.stringify(sectionM)}\nCOMPETITORS: ${JSON.stringify(capture.json.competitors)}`, schema: PROPOSAL_SCHEMAS.winthemes, label: "Setting win themes" }, soFar);
  rec("winthemes", "Win-Theme Strategist", winthemes);
  const themes = winthemes.json.win_themes ?? [];

  // 4–6. Write → consultant-grade edit → compliance loop (Shipley color-team; cap 2 iterations)
  let writer!: Awaited<ReturnType<typeof agentCall>>;
  let editor!: Awaited<ReturnType<typeof agentCall>>;
  let compliance!: Awaited<ReturnType<typeof agentCall>>;
  let gaps: string[] = [];
  for (let iter = 0; iter < 2; iter++) {
    writer = await agentCall(ctx, runId, { id: "writer", name: "Proposal Writer", taskType: "content", system: METHOD_PROPOSAL.writer, context: `COMPLIANCE MATRIX:\n${JSON.stringify(matrix).slice(0, 6000)}\nWIN THEMES:\n${JSON.stringify(themes)}\nBIDDER MATERIALS:\n${materials.slice(0, 6000)}${gaps.length ? `\nFIX THESE GAPS FROM THE LAST PASS:\n- ${gaps.join("\n- ")}` : ""}`, schema: PROPOSAL_SCHEMAS.writer, label: iter === 0 ? "Writing the draft" : "Closing the gaps" }, soFar);
    rec("writer", "Proposal Writer", writer);
    editor = await agentCall(ctx, runId, { id: "editor", name: "Consultant-Grade Editor", taskType: "reasoning", system: METHOD_PROPOSAL.editor, context: `WIN THEMES:\n${JSON.stringify(themes)}\nDRAFT SECTIONS:\n${JSON.stringify(writer.json.sections).slice(0, 8000)}`, schema: PROPOSAL_SCHEMAS.editor, label: "Rewriting to consultant standard" }, soFar);
    rec("editor", "Consultant-Grade Editor", editor);
    compliance = await agentCall(ctx, runId, { id: "compliance", name: "Compliance Checker", taskType: "reasoning", system: METHOD_PROPOSAL.compliance, context: `COMPLIANCE MATRIX:\n${JSON.stringify(matrix).slice(0, 6000)}\nPROPOSAL SECTIONS:\n${JSON.stringify(editor.json.sections).slice(0, 8000)}`, schema: PROPOSAL_SCHEMAS.compliance, label: "Checking every requirement" }, soFar);
    rec("compliance", "Compliance Checker", compliance);
    gaps = (compliance.json.gaps as string[]) ?? [];
    if (!gaps.length) break;
  }

  // 7. Assemble the proposal report (mock → a realistic demo).
  const { isMock: assemblerMock } = await routeTask(step.task_type);
  let report: unknown;
  if (assemblerMock) {
    report = mockProposalReport(pick(config, "rfp_title", "issuer") || bidder);
  } else {
    const cMatrix = (compliance.json.matrix as Array<{ status?: string }>) ?? [];
    const count = (st: string) => cMatrix.filter((r) => r.status === st).length;
    report = {
      executive_summary: editor.json.executive_summary ?? "",
      proposal_sections: editor.json.sections ?? writer.json.sections ?? [],
      compliance_matrix: cMatrix,
      win_themes: themes,
      compliance_summary: { total: cMatrix.length, compliant: count("compliant"), partial: count("partial"), missing: count("missing") },
      flags: gaps.map((g) => `Still open after ${2} passes: ${g}`).slice(0, 10),
      sources: [{ ref: "RFP", quote: rfp.slice(0, 200) }, ...(materials !== "" ? [{ ref: "MAT", quote: "Bidder's own materials" }] : [])],
      confidence: gaps.length ? 0.6 : 0.8,
    };
  }

  // Verifier gate — check claims/credentials vs the RFP + real materials (disqualification/fraud stakes; strict here).
  let verification: Verification | undefined;
  try {
    verification = await verifyOutput({ userId: ctx.userId, taskId: ctx.taskId, output: report, context: `RFP:\n${rfp.slice(0, 4000)}\nBIDDER MATERIALS:\n${materials.slice(0, 4000)}` });
    billed += verification.billedUsd ?? 0;
    if (verification.model) models.add(verification.model);
    if (verification.verdict !== "supported" && report && typeof report === "object") {
      const r = report as { flags?: string[] };
      r.flags = [...(r.flags ?? []), ...verification.conflicts.map((c) => `Check this claim: ${c}`), ...verification.unsupported_claims.map((c) => `No proof found: ${c}`)].slice(0, 14);
    }
    ctx.onEvent?.({ step: "crew.gate", verdict: verification.verdict, conflicts: verification.conflicts.length });
  } catch {
    ctx.onEvent?.({ step: "crew.gate", verdict: "skipped", conflicts: 0 });
  }

  return { output: report, schema: "proposal_report", modelsUsed: [...models], agents: trail, verification, isMock: assemblerMock || trail.some((t) => t.isMock), billedUsd: billed };
};

// ---------- Clip Video crew (App #3 — viral short-form methodology, docs App#3 build package) ----------
// The judgment agents (Moment Finder + Hook Optimizer + Captioner + Quality Checker) are LLM and run live.
// Transcription (Deepgram/Whisper), reframe (ffmpeg) and animated captions (Remotion) are the media boundary —
// wired as adapters below. Offline / no-VPS → a mock timestamped transcript + ready-to-render clip specs, so the
// whole crew is testable end-to-end (matching the engine's mock-first design), and every clip is flagged render_pending.
const METHOD_CLIP = {
  moment_finder: `You are a viral-instinct short-form editor with the eye of someone who has studied 13.5M+ clips. Read the transcript and find self-contained clip-worthy MOMENTS — each must have a HOOK (a reason to stop scrolling in the first ~3 seconds) AND a PAYOFF (a resolution, insight, or emotional beat). A moment must STAND ALONE: reject anything that needs context from earlier in the video or trails off without resolving. Score every candidate 0–99 on three dimensions, then aggregate to an overall virality_score:
1) HOOK STRENGTH — the first ~3 seconds; the single biggest factor in whether the algorithm keeps distributing.
2) FLOW & PACING — narrative momentum and information density; no dead air, no meander.
3) ENGAGEMENT VALUE — emotional trigger, shareability, and a clear payoff.
Rank by aggregate score, keep the number requested, honour any focus. Give each a one-line honest "why it scored high". Treat the score as a strong SHORTLIST, not an oracle — the single best AI pick doesn't always win when posted. If this creator's past winning patterns are provided, weight toward what has worked for THEM. Use only lines that are actually in the transcript; never invent dialogue. start_sec/end_sec are in seconds.`,
  hook_optimizer: `You are a short-form HOOK specialist. For each chosen moment, make it OPEN on its strongest beat. Trim dead air before the hook; if the payoff-worthy line is buried, move the clip's start so the first 1–3 seconds land on a proven high-performing hook type. The five that perform best (TikTok 7-day views, 34,635 clips analysed):
1) Product/Outcome Showcase — show the finished result/transformation in the first 2 seconds (the HIGHEST performer, ~2× the weakest).
2) Contrarian/Myth-Bust — reject a widely-held belief in the first sentence; the brain must resolve the contradiction, so the scroll stops.
3) Credibility + Curiosity + Payoff — credibility in second 1, curiosity in 2, a payoff-promise in 3.
4) Question / Curiosity gap — open a loop the viewer needs closed.
5) High-stakes / Emotional — an emotional or high-stakes opening beat.
For each clip, name the hook type it best fits and adjust start_sec/end_sec so it OPENS on that beat — all three "moves" should complete before the algorithm finishes its early distribution test. Reference each clip by its index. Only re-time what is actually in the transcript; never fabricate.`,
  captioner: `You are a punchy social copywriter. For each clip, write a scroll-stopping HOOK TITLE (the on-screen text that earns the first second) and one clean caption line — both FAITHFUL to what was actually said. Captions and titles must never distort the meaning or clip-bait. Match the creator's caption style if provided. Keep titles tight and platform-native. Reference each clip by its index.`,
  quality_checker: `You are a detail-focused reviewer AND an integrity guard. For each finished clip verify: is it coherent standalone? Is the caption/title accurate to what was said (no out-of-context misquoting, no meaning-distorting clip-bait)? Is the length right for its target platform? DROP any clip that fails — a discarded clip beats a misleading one. The industry discards ~40% of auto-generated clips, so be honest about which survive. Return kept_indexes (the clips that pass) and dropped (index + reason for each you cut).`,
};

const CLIP_SCHEMAS = {
  moment_finder: { name: "clip_moments", schema: { type: "object", additionalProperties: false, required: ["moments", "notes"], properties: {
    moments: { type: "array", items: { type: "object", additionalProperties: false, required: ["start_sec", "end_sec", "virality_score", "dimension_scores", "hook_type", "why", "self_contained"], properties: {
      start_sec: { type: "number" }, end_sec: { type: "number" }, virality_score: { type: "number" },
      dimension_scores: { type: "object", additionalProperties: false, required: ["hook", "pacing", "engagement"], properties: { hook: { type: "number" }, pacing: { type: "number" }, engagement: { type: "number" } } },
      hook_type: { type: "string" }, why: { type: "string" }, self_contained: { type: "boolean" } } } },
    notes: { type: "string" } } } },
  hook_optimizer: { name: "clip_hooks", schema: { type: "object", additionalProperties: false, required: ["clips", "notes"], properties: {
    clips: { type: "array", items: { type: "object", additionalProperties: false, required: ["index", "start_sec", "end_sec", "hook_type", "opening_rationale"], properties: {
      index: { type: "number" }, start_sec: { type: "number" }, end_sec: { type: "number" }, hook_type: { type: "string" }, opening_rationale: { type: "string" } } } },
    notes: { type: "string" } } } },
  captioner: { name: "clip_captions", schema: { type: "object", additionalProperties: false, required: ["captions", "notes"], properties: {
    captions: { type: "array", items: { type: "object", additionalProperties: false, required: ["index", "title", "caption"], properties: {
      index: { type: "number" }, title: { type: "string" }, caption: { type: "string" } } } },
    notes: { type: "string" } } } },
  quality_checker: { name: "clip_quality", schema: { type: "object", additionalProperties: false, required: ["kept_indexes", "dropped", "notes"], properties: {
    kept_indexes: { type: "array", items: { type: "number" } },
    dropped: { type: "array", items: { type: "object", additionalProperties: false, required: ["index", "reason"], properties: { index: { type: "number" }, reason: { type: "string" } } } },
    notes: { type: "string" } } } },
} as const;

type ClipMomentJson = { start_sec?: number; end_sec?: number; virality_score?: number; dimension_scores?: { hook?: number; pacing?: number; engagement?: number }; hook_type?: string; why?: string; self_contained?: boolean };
type ClipHookJson = { index?: number; start_sec?: number; end_sec?: number; hook_type?: string; opening_rationale?: string };
type ClipCapJson = { index?: number; title?: string; caption?: string };
type ClipDropJson = { index?: number; reason?: string };
type TranscriptSeg = { start: number; end: number; speaker: string; text: string };

const RENDER_NOTE = "Clip judgment — moment-finding, hook, captions and the quality gate — runs live. Video rendering (transcription, ffmpeg reframe, Remotion animated captions) is wired to external services / a render VPS; until those are connected each clip is delivered as a ready-to-render spec (exact in/out timecodes, hook type, caption, render category) marked render_pending.";

const fmt = (sec: number) => { const s = Math.max(0, Math.round(Number(sec) || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function secondsFromConfig(config: Record<string, unknown>) {
  const raw = pick(config, "source_duration_sec", "duration_sec", "duration");
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  if (Number.isFinite(n) && n > 0) return n <= 300 ? Math.round(n * 60) : Math.round(n); // ≤300 read as minutes
  return 2700; // default: a 45-minute source
}

function segmentText(segments: TranscriptSeg[], start: number, end: number) {
  const overlap = segments.filter((s) => s.end > start && s.start < end).map((s) => s.text).join(" ");
  return (overlap || segments.map((s) => s.text).join(" ")).slice(0, 600);
}
function shortTitle(text: string) { return ((text || "Clip").split(/\s+/).slice(0, 9).join(" ").replace(/[.,;:]+$/, "")) || "Clip"; }

/** ffmpeg / Remotion boundary. No render VPS yet → a ready-to-render spec, flagged render_pending. */
function renderClip(taskId: string, index: number) {
  const stem = `runs/${taskId || "run"}/clip-${index + 1}`;
  return { clip_file: `${stem}.mp4`, caption_file: `${stem}.captions.json`, status: "render_pending" as const };
}
/** Render Router (rules, no model): gate the heavy Remotion path — Category B only when branded captions earn it. */
function routeRenderCategory(captionsChoice: string, target: string): "A" | "B" {
  if (/plain|none/i.test(captionsChoice)) return "A";
  if (/brand|animat/i.test(captionsChoice)) return "B";
  return /tiktok|reel|short/i.test(target) ? "B" : "A"; // caption-first platforms default to branded
}
function platformFit(score: number, target: string) {
  const all = ["TikTok", "Reels", "Shorts"];
  const primary = /tiktok/i.test(target) ? ["TikTok"] : /reel/i.test(target) ? ["Reels"] : /short/i.test(target) ? ["Shorts"] : all;
  return score >= 75 ? all : primary;
}

/** Transcription boundary (Deepgram/Whisper). Offline → a plausible timestamped transcript, seeded from an attached
 * transcript when the user pasted/attached one, so the judgment crew has real material to work on. */
function mockTranscript(durationSec: number, userData: string): TranscriptSeg[] {
  const text = (userData || "").trim();
  const attached = text ? text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 24).slice(0, 48) : [];
  const base = attached.length >= 4 ? attached : [
    "The thing nobody tells you is that the first three seconds decide whether this ever gets seen.",
    "I spent six years doing it the hard way before I found the shortcut that actually works.",
    "Here's the counterintuitive part — doing less got me dramatically better results.",
    "Most people quit right before the exact step that would have made it click.",
    "The one change that doubled my output was almost embarrassingly simple.",
    "If you take away a single idea from this, let it be this one.",
    "And that's the mistake I see literally everyone make when they start out.",
    "So here's what I'd do differently if I were starting from zero today.",
  ];
  const span = Math.max(18, Math.floor(durationSec / base.length));
  return base.map((t, i) => ({ start: i * span, end: Math.min(durationSec, (i + 1) * span - 2), speaker: "Speaker 1", text: t }));
}

async function transcribeVideo(ctx: CrewContext, runId: string, durationSec: number) {
  const segments = mockTranscript(durationSec, ctx.userData);
  const model = "mock:transcription"; // real: deepgram-nova / whisper — slots in here, metered per audio-minute
  await logCrewStep(ctx, runId, "transcriber", { duration_sec: durationSec }, { segments: segments.length }, model, 0);
  return { segments, isMock: true, billedUsd: 0, model };
}

/** Log a non-LLM (adapter / rules) agent's step to the crew's trail table so total_cost reconciles. */
async function logCrewStep(ctx: CrewContext, runId: string, agent: string, input: unknown, output: unknown, model: string, costUsd: number, status: "ok" | "error" = "ok") {
  await adminClient().from((ctx.stepsTable ?? "seo_run_steps") as "seo_run_steps").insert({
    run_id: runId, user_id: ctx.userId, agent, input: input as unknown as Json, output: output as unknown as Json,
    model_used: model, cost_usd: costUsd, status,
  });
}

function mockClipReport(source: string, captionsChoice: string, target: string) {
  const cat = /plain|none/i.test(captionsChoice) ? "A" as const : "B" as const;
  const mk = (i: number, start: number, dur: number, score: number, hook: number, pacing: number, eng: number, hookType: string, title: string, caption: string, why: string) => ({
    title, start_sec: start, end_sec: start + dur, duration_sec: dur, virality_score: score,
    dimension_scores: { hook, pacing, engagement: eng }, hook_type: hookType, why, caption,
    render_category: cat, platform_fit: platformFit(score, target),
    clip_file: `runs/demo/clip-${i}.mp4`, caption_file: cat === "B" ? `runs/demo/clip-${i}.captions.json` : "", status: "render_pending" as const,
  });
  return {
    summary: "3 vertical clips from your source — hook-scored, opened on their strongest beat, and quality-checked. (Demo run — paste a real video link and connect an AI key in /admin for a live cut.)",
    clips: [
      mk(1, 132, 41, 88, 92, 84, 88, "Product/Outcome Showcase", "The result nobody expected", "Here's what six months of this actually produced.", "Opens on the finished transformation in the first 2s — the highest-performing hook type — with a tight, shareable payoff."),
      mk(2, 640, 34, 79, 82, 78, 77, "Contrarian/Myth-Bust", "Everyone's doing this wrong", "The advice you keep hearing is backwards — here's why.", "Rejects a widely-held belief in sentence one; the brain must resolve the contradiction, so the scroll stops."),
      mk(3, 1180, 47, 71, 70, 74, 69, "Credibility + Curiosity + Payoff", "6 years in, the real answer", "I spent six years on this, and the real answer isn't what they tell you.", "Credibility → curiosity → payoff-promise across the first 3s; a self-contained arc."),
    ],
    dropped: [{ moment: "18:20 aside on scheduling", reason: "Not self-contained — leans on an earlier segment; would confuse a cold viewer." }],
    render_note: RENDER_NOTE,
    flags: [
      "Demo run on placeholder data. Paste a real video and connect an AI key in /admin for a live cut.",
      "Virality scores are a strong shortlist, not a guarantee — ~40% of auto-clips get discarded industry-wide; post the high scorers first.",
    ],
    sources: [{ ref: "T1", quote: source ? `Source: ${source}` : "Placeholder — connect a real video for a sourced run." }],
    confidence: 0.4,
  };
}

const clipRunner: Runner = async (ctx, step, _depth, runId) => {
  const { config } = ctx;
  const source = pick(config, "source_url", "video_url", "url") || pick(config, "source_file_path", "file");
  const numRaw = (pick(config, "num_clips", "num_clips_requested", "clips") || "auto").toLowerCase();
  const targetCount = /^\d+$/.test(numRaw) ? Math.min(10, Math.max(1, parseInt(numRaw, 10))) : 5; // 'auto' → 5
  const vibe = pick(config, "vibe") || "punchy";
  const target = pick(config, "target", "where") || "download";
  const captionsChoice = pick(config, "captions") || "branded animated captions";
  const focus = pick(config, "focus_prompt", "focus");
  const durationSec = secondsFromConfig(config);
  const pastPatterns = (ctx.groundingCtx || "").slice(0, 2000);

  const trail: CrewAgentTrail[] = [];
  const models = new Set<string>();
  let billed = 0;
  const soFar = () => billed;
  const rec = (id: string, name: string, r: { model: string; billedUsd: number; findings: number; isMock: boolean }) => {
    trail.push({ id, name, model: r.model, billedUsd: r.billedUsd, findings: r.findings, status: "ok", isMock: r.isMock }); models.add(r.model); billed += r.billedUsd;
  };

  // 1. Transcriber (adapter — Deepgram/Whisper boundary; mock timestamped transcript offline)
  ctx.onEvent?.({ step: "crew.agent", id: "transcriber", name: "Transcriber", label: "Transcribing the video", phase: "running", billedSoFar: soFar() });
  const trans = await transcribeVideo(ctx, runId, durationSec);
  billed += trans.billedUsd; models.add(trans.model);
  trail.push({ id: "transcriber", name: "Transcriber", model: trans.model, billedUsd: trans.billedUsd, findings: trans.segments.length, status: "ok", isMock: trans.isMock });
  ctx.onEvent?.({ step: "crew.agent", id: "transcriber", name: "Transcriber", label: "Transcribing the video", phase: "done", billedSoFar: soFar(), isMock: trans.isMock, findings: trans.segments.length });
  const transcriptText = trans.segments.map((s) => `[${fmt(s.start)}] ${s.speaker}: ${s.text}`).join("\n").slice(0, 16000);

  // 2. Moment Finder (LLM — the value core; Part 3.A virality dimensions + 3.D self-contained)
  const finder = await agentCall(ctx, runId, {
    id: "moment_finder", name: "Moment Finder", taskType: "reasoning", system: METHOD_CLIP.moment_finder,
    context: `SOURCE: ${source || "(none)"}\nCLIPS REQUESTED: ${numRaw} (aim for ~${targetCount})\nVIBE: ${vibe}\nFOCUS: ${focus || "(none)"}\nTARGET PLATFORM: ${target}\nCREATOR'S PAST WINNING PATTERNS: ${pastPatterns || "(none yet — first run for this creator)"}\n\nTRANSCRIPT (timestamps in mm:ss):\n${transcriptText}`,
    schema: CLIP_SCHEMAS.moment_finder, label: "Finding clip-worthy moments",
  }, soFar);
  rec("moment_finder", "Moment Finder", finder);
  const moments = ((finder.json.moments as ClipMomentJson[]) ?? [])
    .slice().sort((a, b) => (Number(b?.virality_score) || 0) - (Number(a?.virality_score) || 0)).slice(0, targetCount);

  // 3. Hook Optimizer (LLM — Part 3.B five hook types + 3.C storyline)
  const hooks = await agentCall(ctx, runId, {
    id: "hook_optimizer", name: "Hook Optimizer", taskType: "reasoning", system: METHOD_CLIP.hook_optimizer,
    context: `SELECTED MOMENTS (reference each by #index):\n${moments.map((m, i) => `#${i} [${fmt(Number(m.start_sec))}–${fmt(Number(m.end_sec))}] score ${m.virality_score} — ${m.why ?? ""}`).join("\n")}\n\nTRANSCRIPT:\n${transcriptText}`,
    schema: CLIP_SCHEMAS.hook_optimizer, label: "Sharpening the opening hook",
  }, soFar);
  rec("hook_optimizer", "Hook Optimizer", hooks);
  const hookByIndex = new Map<number, ClipHookJson>();
  for (const h of ((hooks.json.clips as ClipHookJson[]) ?? [])) hookByIndex.set(Number(h.index), h);

  const working = moments.map((m, i) => {
    const h = hookByIndex.get(i) ?? {};
    const start = Number(h.start_sec ?? m.start_sec) || 0;
    const end = Number(h.end_sec ?? m.end_sec) || start + 30;
    const ds = m.dimension_scores ?? {};
    return {
      index: i, start_sec: start, end_sec: end, duration_sec: Math.max(1, Math.round(end - start)),
      virality_score: Math.round(Number(m.virality_score) || 0),
      dimension_scores: { hook: Math.round(Number(ds.hook) || 0), pacing: Math.round(Number(ds.pacing) || 0), engagement: Math.round(Number(ds.engagement) || 0) },
      hook_type: h.hook_type ?? m.hook_type ?? "Question / Curiosity gap", why: m.why ?? "", segment_text: segmentText(trans.segments, start, end),
    };
  });

  // 3.5 Render Router (rules — gate Remotion; no model cost)
  ctx.onEvent?.({ step: "crew.agent", id: "render_router", name: "Render Router", label: "Choosing the render path", phase: "running", billedSoFar: soFar() });
  const routed = working.map((c) => ({ ...c, render_category: routeRenderCategory(captionsChoice, target) }));
  await logCrewStep(ctx, runId, "render_router", { captions: captionsChoice, target }, { A: routed.filter((c) => c.render_category === "A").length, B: routed.filter((c) => c.render_category === "B").length }, "rules:render_router", 0);
  trail.push({ id: "render_router", name: "Render Router", model: "rules:render_router", billedUsd: 0, findings: routed.length, status: "ok", isMock: true });
  ctx.onEvent?.({ step: "crew.agent", id: "render_router", name: "Render Router", label: "Choosing the render path", phase: "done", billedSoFar: soFar(), isMock: true, findings: routed.length });

  // 4. Captioner (LLM — hook title + caption per clip, faithful to what was said)
  const captioner = await agentCall(ctx, runId, {
    id: "captioner", name: "Captioner", taskType: "content", system: METHOD_CLIP.captioner,
    context: `CAPTION STYLE: ${captionsChoice}\nCLIPS (reference each by #index):\n${routed.map((c) => `#${c.index} [${fmt(c.start_sec)}] hook:${c.hook_type}\n${c.segment_text}`).join("\n\n")}`,
    schema: CLIP_SCHEMAS.captioner, label: "Writing titles and captions",
  }, soFar);
  rec("captioner", "Captioner", captioner);
  const capByIndex = new Map<number, ClipCapJson>();
  for (const c of ((captioner.json.captions as ClipCapJson[]) ?? [])) capByIndex.set(Number(c.index), c);

  // 4b/4. Clip Editor (ffmpeg, all clips) + Caption/Brand Renderer (Remotion, Category B) — adapters → render specs
  const rendered = routed.map((c) => {
    const cap = capByIndex.get(c.index) ?? {};
    const rr = renderClip(ctx.taskId, c.index);
    return {
      ...c, title: cap.title ?? shortTitle(c.segment_text), caption: cap.caption ?? c.segment_text.slice(0, 140),
      clip_file: rr.clip_file, caption_file: c.render_category === "B" ? rr.caption_file : "", status: rr.status,
    };
  });
  await logCrewStep(ctx, runId, "clip_editor", { clips: rendered.length }, { rendered: rendered.length, pending: rendered.filter((r) => r.status === "render_pending").length }, "adapter:ffmpeg", 0);
  trail.push({ id: "clip_editor", name: "Clip Editor", model: "adapter:ffmpeg", billedUsd: 0, findings: rendered.length, status: "ok", isMock: true });
  const bCount = rendered.filter((r) => r.render_category === "B").length;
  if (bCount) {
    await logCrewStep(ctx, runId, "caption_renderer", { category_b: bCount }, { animated: bCount }, "adapter:remotion", 0);
    trail.push({ id: "caption_renderer", name: "Caption/Brand Renderer", model: "adapter:remotion", billedUsd: 0, findings: bCount, status: "ok", isMock: true });
  }

  // 5. Quality Checker (LLM — Quality Layer 1: drop incoherent / meaning-distorting clips)
  const qc = await agentCall(ctx, runId, {
    id: "quality_checker", name: "Quality Checker", taskType: "reasoning", system: METHOD_CLIP.quality_checker,
    context: `CLIPS (reference each by #index):\n${rendered.map((c) => `#${c.index} "${c.title}" [${c.duration_sec}s] score ${c.virality_score}\ncaption: ${c.caption}\nactually said: ${c.segment_text.slice(0, 400)}`).join("\n\n")}`,
    schema: CLIP_SCHEMAS.quality_checker, label: "Checking quality and integrity",
  }, soFar);
  rec("quality_checker", "Quality Checker", qc);
  const keptSet = new Set<number>(((qc.json.kept_indexes as number[]) ?? rendered.map((r) => r.index)).map(Number));
  const droppedByQc = new Map<number, string>();
  for (const d of ((qc.json.dropped as ClipDropJson[]) ?? [])) droppedByQc.set(Number(d.index), String(d.reason ?? "dropped"));

  // 6. Assemble the clip_report. Mock → a realistic demo.
  const { isMock: assemblerMock } = await routeTask(step.task_type);
  let report: unknown;
  if (assemblerMock) {
    report = mockClipReport(source, captionsChoice, target);
  } else {
    const finalClips = rendered.filter((c) => keptSet.has(c.index) && !droppedByQc.has(c.index)).map((c) => ({
      title: c.title, start_sec: c.start_sec, end_sec: c.end_sec, duration_sec: c.duration_sec,
      virality_score: c.virality_score, dimension_scores: c.dimension_scores, hook_type: c.hook_type, why: c.why,
      caption: c.caption, render_category: c.render_category, platform_fit: platformFit(c.virality_score, target),
      clip_file: c.clip_file, caption_file: c.caption_file, status: c.status,
    }));
    const dropped = rendered.filter((c) => droppedByQc.has(c.index) || !keptSet.has(c.index))
      .map((c) => ({ moment: `${fmt(c.start_sec)} "${c.title}"`, reason: droppedByQc.get(c.index) ?? "below the quality bar" }));
    const flags: string[] = [];
    if (rendered.some((r) => r.status === "render_pending")) flags.push("Rendering pending — connect transcription + ffmpeg/Remotion to produce the video files; timecodes, hooks, captions and scores are final.");
    flags.push("Virality scores are a strong shortlist, not a guarantee — ~40% of auto-clips get discarded industry-wide; post the high scorers first and review the rest.");
    if (!source) flags.push("No source video provided — attach a video link or upload for a real run.");
    report = {
      summary: `${finalClips.length} vertical clip${finalClips.length === 1 ? "" : "s"} from a ${Math.round(durationSec / 60)}-min source — hook-scored, opened on their strongest beat, and quality-checked.`,
      clips: finalClips, dropped, render_note: RENDER_NOTE, flags: flags.slice(0, 8),
      sources: [{ ref: "T1", quote: `Transcript of ${source || "the uploaded video"} — ${trans.segments.length} segments.` }],
      confidence: finalClips.length ? 0.7 : 0.4,
    };
  }

  // Verifier gate (Quality Layer 1) — captions must match what was said; no out-of-context clip-bait shipped.
  let verification: Verification | undefined;
  try {
    verification = await verifyOutput({ userId: ctx.userId, taskId: ctx.taskId, output: report, context: `TRANSCRIPT:\n${transcriptText.slice(0, 6000)}` });
    billed += verification.billedUsd ?? 0;
    if (verification.model) models.add(verification.model);
    if (verification.verdict !== "supported" && report && typeof report === "object") {
      const r = report as { flags?: string[] };
      r.flags = [...(r.flags ?? []), ...verification.conflicts.map((c) => `Caption may distort meaning: ${c}`), ...verification.unsupported_claims.map((c) => `Unsupported: ${c}`)].slice(0, 14);
    }
    ctx.onEvent?.({ step: "crew.gate", verdict: verification.verdict, conflicts: verification.conflicts.length });
  } catch {
    ctx.onEvent?.({ step: "crew.gate", verdict: "skipped", conflicts: 0 });
  }

  return { output: report, schema: "clip_report", modelsUsed: [...models], agents: trail, verification, isMock: assemblerMock || trail.some((t) => t.isMock), billedUsd: billed };
};

// ---------- Web Builder crew (App #4 — conversion web design, docs App#4 build package) ----------
// Brand Interviewer, Design Extractor (crawls refs live via Firecrawl → abstract style, never copies),
// Copywriter, Page Builder, SEO/GEO Optimizer, Verifier run live (LLM). The Deployer is the hosting boundary:
// publishing to Vercel at <brand>.all41.app (wildcard subdomain + SSL, all41's account) wires in as an adapter;
// offline / until connected → a ready-to-deploy build marked deploy_pending with its planned URL.
const METHOD_WEB = {
  interviewer: `You are a friendly onboarding guide building a structured brand profile from a small business's guided-setup answers. Turn what they gave you (what they do, who it's for, products, style feel, reference sites) into a clean profile: a one-line positioning, the target customer, the primary GOAL the site should drive (what the CTA is for), the brand voice in 2–3 adjectives, and the product/service list. Fill sensible gaps from any known brand context; never invent facts about the business.`,
  extractor: `You are a design-taste interpreter. From the fetched reference sites the user LIKES, extract ONLY the abstract STYLE LANGUAGE that should INSPIRE an original design: the dominant palette (hex or plain color names), the typographic feel (e.g. "geometric sans, generous sizes"), the visual tone (minimal / bold / warm / editorial), and the layout patterns (e.g. "full-bleed hero, alternating image-text rows"). NEVER copy a reference's exact layout, its unique components, its wording, or its assets (logos/images) — extract the vibe, not the page. Frame everything as "inspired by", and merge with the user's chosen preset.`,
  copywriter: `You are a conversion copywriter. For each page, encode the method: (1) ONE benefit-led HEADLINE naming WHO it's for and WHAT outcome they get, in one specific sentence — "unlock your potential" and other fluff are banned; name the real outcome. (2) A VALUE PROP under 30 words — why choose this, benefits not features. (3) 3–5 concrete, specific PROOF points (quantified only where the brand gave you real numbers; never fabricate stats or testimonials). (4) ONE primary CTA in action words calibrated to the business ("Get a free quote", "Start free", "Book a call"). Write in the brand's voice. One CTA per page — no competing actions.`,
  builder: `You are a clean front-end builder. Assemble each page to the HIGH-CONVERTING structure with mobile-first discipline: above the fold = headline + subhead + ONE primary CTA (reachable without scrolling on mobile); then value proposition → proof / social proof → features-as-benefits → the SAME CTA repeated near the end → minimal footer. Set has_nav=false on conversion/landing pages — a distracting nav menu lowers conversion ~10–15%; a multi-page brochure page (About/Contact/Blog) may carry light nav. Use the all41 design-system tokens in the extracted style. Output the page STRUCTURE (not raw code): per page its type, slug, headline, subhead, value_prop, proof[], cta, cta_href (the user's checkout when given, else #contact), has_nav.`,
  seogeo: `You are an SEO/GEO specialist baking optimization in AT BUILD (App #1's logic, condensed). Specify the schema.org types to emit (Organization + Product/Service + FAQ), a clean heading hierarchy, and GEO citability levers (self-contained answer sentences, a Q&A/FAQ block, entity clarity) so AI answer engines can cite the site. Give a one-line SEO/GEO baseline summary and the specific GEO notes. Ground it in the brand + pages provided; never invent metrics.`,
  verifier: `You are a QA reviewer confirming the built site is sound before it ships: every page has a benefit-led headline and exactly ONE primary CTA; the CTA points to the user's checkout when one was given (set checkout_ok); conversion pages have no distracting nav; the structure is mobile-first with the CTA above the fold; content is accurate to the brand profile (no invented claims). List concrete flags for anything that fails — a site that fails these does not ship as "done".`,
};

const WEB_SCHEMAS = {
  interviewer: { name: "brand_profile", schema: { type: "object", additionalProperties: false, required: ["positioning", "target_customer", "goal", "voice", "products", "notes"], properties: {
    positioning: { type: "string" }, target_customer: { type: "string" }, goal: { type: "string" },
    voice: { type: "array", items: { type: "string" } }, products: { type: "array", items: { type: "string" } }, notes: { type: "string" } } } },
  extractor: { name: "style_tokens", schema: { type: "object", additionalProperties: false, required: ["palette", "typography", "tone", "layout", "notes"], properties: {
    palette: { type: "array", items: { type: "string" } }, typography: { type: "string" }, tone: { type: "string" }, layout: { type: "string" }, notes: { type: "string" } } } },
  copywriter: { name: "page_copy", schema: { type: "object", additionalProperties: false, required: ["pages", "notes"], properties: {
    pages: { type: "array", items: { type: "object", additionalProperties: false, required: ["type", "headline", "value_prop", "proof", "cta"], properties: {
      type: { type: "string" }, headline: { type: "string" }, subhead: { type: "string" }, value_prop: { type: "string" }, proof: { type: "array", items: { type: "string" } }, cta: { type: "string" } } } },
    notes: { type: "string" } } } },
  builder: { name: "page_build", schema: { type: "object", additionalProperties: false, required: ["pages", "notes"], properties: {
    pages: { type: "array", items: { type: "object", additionalProperties: false, required: ["type", "slug", "headline", "value_prop", "proof", "cta", "has_nav"], properties: {
      type: { type: "string" }, slug: { type: "string" }, headline: { type: "string" }, subhead: { type: "string" }, value_prop: { type: "string" }, proof: { type: "array", items: { type: "string" } }, cta: { type: "string" }, cta_href: { type: "string" }, has_nav: { type: "boolean" } } } },
    notes: { type: "string" } } } },
  seogeo: { name: "seo_bake", schema: { type: "object", additionalProperties: false, required: ["summary", "geo_notes", "notes"], properties: {
    summary: { type: "string" }, geo_notes: { type: "array", items: { type: "string" } }, notes: { type: "string" } } } },
  verifier: { name: "site_qa", schema: { type: "object", additionalProperties: false, required: ["flags", "checkout_ok", "notes"], properties: {
    flags: { type: "array", items: { type: "string" } }, checkout_ok: { type: "boolean" }, notes: { type: "string" } } } },
} as const;

type WebPageJson = { type?: string; slug?: string; headline?: string; subhead?: string; value_prop?: string; proof?: string[]; cta?: string; cta_href?: string; has_nav?: boolean };

const WEB_RENDER_NOTE = "Copy, style, page structure and the SEO/GEO baseline are produced live by the crew. Hosting is the boundary: all41 serves every site from one Vercel Pro multi-tenant renderer at <brand>.all41.app (a single wildcard *.all41.app domain on Vercel nameservers, automatic per-subdomain SSL, tenant resolved by hostname — no per-site provisioning). Until that renderer + wildcard DNS are connected, the site is delivered as a ready-to-deploy build marked deploy_pending, with its planned URL. (Model verified against Vercel's Platforms docs, Sept 2026.)";

function slugify(name: string) {
  const s = (name || "site").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return s || "site";
}
/** Vercel hosting boundary — real deploy (all41 account, *.all41.app wildcard subdomain + SSL) wires in here. */
function deploySite(slug: string) {
  return { subdomain: `${slug}.all41.app`, live_url: `https://${slug}.all41.app`, vercel_deployment_id: "", status: "deploy_pending" as const };
}

function mockWebsiteReport(brand: string, checkoutUrl: string, preset: string) {
  const slug = slugify(brand || "your-brand");
  const cta = checkoutUrl ? "Start now" : "Get a free quote";
  const href = checkoutUrl || "#contact";
  return {
    live_url: `https://${slug}.all41.app`, status: "deploy_pending" as const, subdomain: `${slug}.all41.app`,
    pages: [
      { type: "Home", slug: "/", headline: `${brand || "Your brand"} — the outcome your customer actually wants, done for them`, subhead: "Benefit-led, specific, written to convert.", value_prop: "One clear promise in under 30 words — why a visitor chooses you over the tab they came from.", proof: ["A concrete, quantified result you've delivered", "A named client or use case", "The specific guarantee or turnaround you offer"], cta, cta_href: href, has_nav: false },
      { type: "About", slug: "/about", headline: `Why ${brand || "we"} exist`, subhead: "The short, honest story.", value_prop: "Who you help and the belief behind the work.", proof: ["Years or projects behind you", "A credential that matters"], cta, cta_href: href, has_nav: true },
    ],
    style: { palette: ["#1e1c1a", "#ff6b5e", "#f6f1e9"], typography: `${preset || "Clean"} — a readable sans with generous sizing`, tone: (preset || "clean").toLowerCase(), layout: "full-bleed hero, single-column mobile-first, repeated CTA" },
    seo_geo_baseline: { summary: "Schema, meta and a Q&A block baked in at build — ready to be cited by AI answer engines.", schema_present: true, geo_notes: ["Self-contained answer sentence in the hero", "FAQ block with 3 real questions", "Organization + Product schema"] },
    conversion_notes: ["Single primary CTA, repeated near the hero and the end", "No nav on the landing page (keeps the visitor on one path)", "CTA above the fold on mobile", "Proof placed after the value prop, before the final CTA"],
    checkout_linked: !!checkoutUrl,
    render_note: WEB_RENDER_NOTE,
    flags: [
      "Demo run on placeholder data. Add your brand details and connect an AI key in /admin for a live build.",
      checkoutUrl ? "CTA points to your checkout." : "No checkout link given — the CTA points to a contact section; add your buy link to drive real conversions.",
      "Publishing to brand.all41.app is pending the Vercel hosting connection (see the note below).",
    ],
    sources: [{ ref: "B1", quote: brand ? `Brand: ${brand}` : "Placeholder — add your brand for a real build." }],
    confidence: 0.4,
  };
}

const webBuilderRunner: Runner = async (ctx, step, _depth, runId) => {
  const { config, tools } = ctx;
  const brand = pick(config, "brand_name", "business", "name") || "the brand";
  const whatTheyDo = pick(config, "what_they_do", "what");
  const audience = pick(config, "audience", "who_for");
  const pagesWanted = pick(config, "pages") || "Home";
  const productsRaw = pick(config, "products");
  const refUrls = (pick(config, "reference_urls", "references") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const preset = pick(config, "style_preset", "style") || "Clean";
  const checkoutUrl = pick(config, "checkout_url", "checkout");
  const slug = slugify(brand);
  const brandCtx = (ctx.groundingCtx || "").slice(0, 2000);

  const trail: CrewAgentTrail[] = [];
  const models = new Set<string>();
  let billed = 0;
  const soFar = () => billed;
  const rec = (id: string, name: string, r: { model: string; billedUsd: number; findings: number; isMock: boolean }) => {
    trail.push({ id, name, model: r.model, billedUsd: r.billedUsd, findings: r.findings, status: "ok", isMock: r.isMock }); models.add(r.model); billed += r.billedUsd;
  };

  // 1. Brand Interviewer (LLM)
  const interview = await agentCall(ctx, runId, { id: "interviewer", name: "Brand Interviewer", taskType: "summarize", system: METHOD_WEB.interviewer,
    context: `GUIDED SETUP:\nBUSINESS: ${brand}\nWHAT THEY DO: ${whatTheyDo}\nAUDIENCE: ${audience}\nPAGES: ${pagesWanted}\nPRODUCTS: ${productsRaw || "(none listed)"}\nSTYLE FEEL: ${preset}\nCHECKOUT: ${checkoutUrl || "(none)"}\nKNOWN BRAND CONTEXT:\n${brandCtx || "(new brand)"}`,
    schema: WEB_SCHEMAS.interviewer, label: "Understanding your brand" }, soFar);
  rec("interviewer", "Brand Interviewer", interview);

  // 2. Design Extractor — crawl refs live (Firecrawl), then abstract the style (inspire, never copy)
  ctx.onEvent?.({ step: "crew.agent", id: "extractor", name: "Design Extractor", label: "Reading the styles you like", phase: "running", billedSoFar: soFar() });
  const refCrawls = await Promise.all(refUrls.map((u) => tools.crawl(guessUrl(u))));
  for (const c of refCrawls) billed += c.billedUsd;
  const refText = refCrawls.map((c, i) => `[REF${i + 1}] ${c.url}:\n${c.markdown.slice(0, 3000)}`).join("\n\n") || "(no reference sites given — use the chosen preset only)";
  const extractor = await agentCall(ctx, runId, { id: "extractor", name: "Design Extractor", taskType: "reasoning", system: METHOD_WEB.extractor,
    context: `CHOSEN PRESET: ${preset}\nREFERENCE SITES (inspiration only — abstract the style, never copy):\n${refText}`,
    schema: WEB_SCHEMAS.extractor, label: "Reading the styles you like" }, soFar);
  rec("extractor", "Design Extractor", extractor);

  // 3. Copywriter (LLM) — conversion copy per page
  const copywriter = await agentCall(ctx, runId, { id: "copywriter", name: "Copywriter", taskType: "content", system: METHOD_WEB.copywriter,
    context: `BRAND PROFILE:\n${JSON.stringify(interview.json).slice(0, 3000)}\nPAGES: ${pagesWanted}\nPRODUCTS: ${productsRaw || "(none)"}\nGOAL / CTA TARGET: ${checkoutUrl ? "drive to checkout: " + checkoutUrl : "capture a lead (no checkout given)"}`,
    schema: WEB_SCHEMAS.copywriter, label: "Writing copy that converts" }, soFar);
  rec("copywriter", "Copywriter", copywriter);

  // 4. Page Builder (LLM) — assemble to the converting structure, mobile-first, no-nav on landing
  const builder = await agentCall(ctx, runId, { id: "builder", name: "Page Builder", taskType: "reasoning", system: METHOD_WEB.builder,
    context: `STYLE TOKENS:\n${JSON.stringify(extractor.json).slice(0, 1500)}\nPAGE COPY:\n${JSON.stringify(copywriter.json).slice(0, 5000)}\nPAGES REQUESTED: ${pagesWanted}\nCHECKOUT URL (for cta_href): ${checkoutUrl || "(none — use #contact)"}`,
    schema: WEB_SCHEMAS.builder, label: "Building the pages" }, soFar);
  rec("builder", "Page Builder", builder);

  // 5. SEO/GEO Optimizer (LLM) — bake schema/meta/GEO in
  const seogeo = await agentCall(ctx, runId, { id: "seo_geo", name: "SEO/GEO Optimizer", taskType: "reasoning", system: METHOD_WEB.seogeo,
    context: `BRAND: ${brand} — ${whatTheyDo}\nAUDIENCE: ${audience}\nPAGES:\n${JSON.stringify(builder.json.pages ?? builder.json).slice(0, 4000)}`,
    schema: WEB_SCHEMAS.seogeo, label: "Baking in SEO & AI-search" }, soFar);
  rec("seo_geo", "SEO/GEO Optimizer", seogeo);

  // 6. Deployer (adapter — Vercel boundary; mock → deploy_pending + planned URL)
  ctx.onEvent?.({ step: "crew.agent", id: "deployer", name: "Deployer", label: "Publishing your site", phase: "running", billedSoFar: soFar() });
  const deploy = deploySite(slug);
  await logCrewStep(ctx, runId, "deployer", { slug }, { subdomain: deploy.subdomain, status: deploy.status }, "adapter:vercel", 0);
  trail.push({ id: "deployer", name: "Deployer", model: "adapter:vercel", billedUsd: 0, findings: 1, status: "ok", isMock: true });
  ctx.onEvent?.({ step: "crew.agent", id: "deployer", name: "Deployer", label: "Publishing your site", phase: "done", billedSoFar: soFar(), isMock: true, findings: 1 });

  // 7. Verifier (LLM QA) — blocks "done" on failure (surfaced as flags)
  const built = (builder.json.pages as WebPageJson[]) ?? [];
  const qa = await agentCall(ctx, runId, { id: "verifier", name: "Verifier", taskType: "reasoning", system: METHOD_WEB.verifier,
    context: `BRAND PROFILE:\n${JSON.stringify(interview.json).slice(0, 2000)}\nCHECKOUT URL: ${checkoutUrl || "(none given)"}\nBUILT PAGES:\n${JSON.stringify(built).slice(0, 5000)}`,
    schema: WEB_SCHEMAS.verifier, label: "Checking the site works" }, soFar);
  rec("verifier", "Verifier", qa);

  // 8. Assemble website_report. Mock → a realistic demo.
  const { isMock: assemblerMock } = await routeTask(step.task_type);
  let report: unknown;
  if (assemblerMock) {
    report = mockWebsiteReport(brand, checkoutUrl, preset);
  } else {
    const st = extractor.json as { palette?: unknown; typography?: unknown; tone?: unknown; layout?: unknown };
    const sg = seogeo.json as { summary?: unknown; geo_notes?: unknown };
    const pages = built.map((p) => ({
      type: String(p.type ?? "Page"), slug: String(p.slug ?? "/"), headline: String(p.headline ?? ""),
      subhead: String(p.subhead ?? ""), value_prop: String(p.value_prop ?? ""),
      proof: Array.isArray(p.proof) ? (p.proof as string[]).map(String) : [], cta: String(p.cta ?? "Get started"),
      cta_href: String(p.cta_href ?? checkoutUrl ?? "#contact"), has_nav: Boolean(p.has_nav),
    }));
    const flags = ((qa.json.flags as string[]) ?? []).slice(0, 8);
    flags.push("Publishing to brand.all41.app is pending the Vercel hosting connection (see the note below).");
    if (!checkoutUrl) flags.push("No checkout link given — the CTA points to a contact section; add your buy link to drive real conversions.");
    report = {
      live_url: deploy.live_url, status: deploy.status, subdomain: deploy.subdomain, pages,
      style: { palette: Array.isArray(st.palette) ? (st.palette as string[]).map(String) : [], typography: String(st.typography ?? preset), tone: String(st.tone ?? preset.toLowerCase()), layout: String(st.layout ?? "") },
      seo_geo_baseline: { summary: String(sg.summary ?? "SEO/GEO baseline baked in at build."), schema_present: true, geo_notes: Array.isArray(sg.geo_notes) ? (sg.geo_notes as string[]).map(String) : [] },
      conversion_notes: ["One primary CTA, repeated near the hero and the end", "No distracting nav on conversion pages", "Mobile-first with the CTA above the fold", "Proof placed after the value prop, before the final CTA"],
      checkout_linked: !!checkoutUrl, render_note: WEB_RENDER_NOTE, flags: flags.slice(0, 10),
      sources: [{ ref: "B1", quote: `Brand profile for ${brand}.` }, ...refUrls.map((u, i) => ({ ref: `REF${i + 1}`, quote: `Style inspiration: ${u}` }))],
      confidence: pages.length ? 0.7 : 0.4,
    };
  }

  // Verifier gate — content accurate to the brand; no invented claims shipped as the user's live site.
  let verification: Verification | undefined;
  try {
    verification = await verifyOutput({ userId: ctx.userId, taskId: ctx.taskId, output: report, context: `BRAND: ${brand} — ${whatTheyDo}\nAUDIENCE: ${audience}\nPRODUCTS: ${productsRaw}` });
    billed += verification.billedUsd ?? 0;
    if (verification.model) models.add(verification.model);
    if (verification.verdict !== "supported" && report && typeof report === "object") {
      const r = report as { flags?: string[] };
      r.flags = [...(r.flags ?? []), ...verification.conflicts.map((c) => `Check this on the site: ${c}`), ...verification.unsupported_claims.map((c) => `Unsupported claim: ${c}`)].slice(0, 14);
    }
    ctx.onEvent?.({ step: "crew.gate", verdict: verification.verdict, conflicts: verification.conflicts.length });
  } catch {
    ctx.onEvent?.({ step: "crew.gate", verdict: "skipped", conflicts: 0 });
  }

  return { output: report, schema: "website_report", modelsUsed: [...models], agents: trail, verification, isMock: assemblerMock || trail.some((t) => t.isMock), billedUsd: billed };
};

// ---------- Content Pipeline crew (App #5 — content marketing, docs App#5 build package) ----------
// One idea → a week of channel-native content in the brand voice. Strategist → Researcher (live search) →
// Writer → Repurposer → Brand-Voice Editor → Verifier. All LLM; the Researcher grounds with the search tool.
// Brand voice + past content come from the graph (ctx.groundingCtx) — the moat over generic AI.
const METHOD_CONTENT = {
  strategist: `You are a sharp content strategist. Turn the seed idea into a specific ANGLE and a content plan — never generic coverage. "10 SEO tips" is generic; "The 3 SEO mistakes killing local bakeries" has an angle. Decide the core long-form piece and which channel repurposes to make, with ONE clear point per piece, mapped to the audience and goal. Use the past-content topics provided to avoid repeating what the brand already covered.`,
  researcher: `You are a diligent research assistant. Gather supporting facts, real statistics (each with its source), concrete examples, and the angles currently ranking/trending for the topic, so the content is grounded, not generic filler. NEVER invent statistics — the fastest way to lose credibility. Only return facts/stats you can attribute to a real source in the material provided.`,
  writer: `You are a versatile content writer working in the brand's voice. Write the core long-form piece (blog/article): open on a scroll-stopping HOOK (a bold claim, a surprising stat, a relatable problem, a contrarian take, or a specific promise), use a clear skimmable structure (subheads), land ONE strong takeaway, and weave in the researched facts (cited) with natural keywords (no stuffing) so it can rank on Google AND be cited by AI engines. Give several title/hook OPTIONS (marketers test them). Write to be read and shared, not to fill space.`,
  repurposer: `You are a multi-platform social writer. Adapt the core piece into channel-native formats — each REWRITTEN for its platform, never copy-pasted (which performs badly and looks lazy). LinkedIn: professional, hook in line 1, short paragraphs/line breaks, a soft CTA. X/Twitter: a punchy thread, one idea per tweet, numbered, strong first tweet, payoff at the end. Instagram: casual, emoji-aware, story-led, a clear CTA, a few hashtags. Newsletter: personal, scannable, one core idea, a clear next step. Blog: skimmable subheads, SEO-aware, depth + takeaway. Give each piece its own platform-appropriate hook options. Produce exactly one repurpose per requested channel.`,
  editor: `You are the brand-voice guardian. Make every piece sound like THIS brand — apply the tone, signature phrases and do's/don'ts from the brand-voice profile provided; fix anything off-voice; tighten for clarity and each platform's norms. Do not change the facts or add claims. Return the polished core body and the polished per-channel pieces.`,
  verifier: `You are a skeptical fact-checker and originality guard. Check every fact/stat/claim against the research sources provided; flag anything you cannot confirm rather than letting it ship; ensure no piece is a near-copy of a source (originality). Return the flags, the specific unconfirmed claims, and whether the set is original. Content integrity is the trust bar — never wave through an unverified stat.`,
};

const CONTENT_SCHEMAS = {
  strategist: { name: "content_plan", schema: { type: "object", additionalProperties: false, required: ["angle", "core_brief", "key_points", "repurpose_list", "notes"], properties: {
    angle: { type: "string" }, core_brief: { type: "string" }, key_points: { type: "array", items: { type: "string" } }, repurpose_list: { type: "array", items: { type: "string" } }, notes: { type: "string" } } } },
  researcher: { name: "content_research", schema: { type: "object", additionalProperties: false, required: ["facts", "stats", "examples", "ranking_angles", "notes"], properties: {
    facts: { type: "array", items: { type: "string" } },
    stats: { type: "array", items: { type: "object", additionalProperties: false, required: ["claim", "source"], properties: { claim: { type: "string" }, source: { type: "string" } } } },
    examples: { type: "array", items: { type: "string" } }, ranking_angles: { type: "array", items: { type: "string" } }, notes: { type: "string" } } } },
  writer: { name: "core_piece", schema: { type: "object", additionalProperties: false, required: ["title_options", "body", "takeaway", "notes"], properties: {
    title_options: { type: "array", items: { type: "string" } }, body: { type: "string" }, takeaway: { type: "string" }, notes: { type: "string" } } } },
  repurposer: { name: "content_repurposes", schema: { type: "object", additionalProperties: false, required: ["repurposes", "notes"], properties: {
    repurposes: { type: "array", items: { type: "object", additionalProperties: false, required: ["channel", "content", "hook_options"], properties: {
      channel: { type: "string" }, content: { type: "string" }, hook_options: { type: "array", items: { type: "string" } } } } }, notes: { type: "string" } } } },
  editor: { name: "content_edited", schema: { type: "object", additionalProperties: false, required: ["core_body", "repurposes", "notes"], properties: {
    core_body: { type: "string" }, repurposes: { type: "array", items: { type: "object", additionalProperties: false, required: ["channel", "content"], properties: { channel: { type: "string" }, content: { type: "string" } } } }, notes: { type: "string" } } } },
  verifier: { name: "content_check", schema: { type: "object", additionalProperties: false, required: ["flags", "unconfirmed", "originality_ok", "notes"], properties: {
    flags: { type: "array", items: { type: "string" } }, unconfirmed: { type: "array", items: { type: "string" } }, originality_ok: { type: "boolean" }, notes: { type: "string" } } } },
} as const;

type ContentRepurposeJson = { channel?: string; content?: string; hook_options?: string[] };

function contentChannels(config: Record<string, unknown>): string[] {
  const raw = pick(config, "channels", "platforms");
  const parsed = raw ? raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [];
  return (parsed.length ? parsed : ["LinkedIn", "X", "Newsletter"]).slice(0, 6);
}
function contentSchedule(channels: string[]) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return channels.map((ch, i) => ({ channel: ch, when: days[i % days.length], piece_ref: ch.toLowerCase() }));
}

function mockContentReport(idea: string, channels: string[], tone: string) {
  const topic = idea || "your idea";
  return {
    summary: `A week of content from one idea — a core piece plus ${channels.length} channel-native repurpose${channels.length === 1 ? "" : "s"}, in a ${tone || "brand"} voice. (Demo run — add a real idea and connect an AI key in /admin for a live batch.)`,
    core: {
      title_options: [`The one thing most people get wrong about ${topic}`, `${topic}: what actually works (with the numbers)`, `Stop guessing at ${topic} — here's the playbook`],
      body: `# The one thing most people get wrong about ${topic}\n\nMost advice on ${topic} is generic. Here's the specific angle that actually moves the needle, grounded in what's working now — and the one takeaway you can act on today.\n\n(Demo body — a live run writes the full research-grounded piece in your brand voice.)`,
      takeaway: `Pick the single highest-leverage move on ${topic} and ship it this week.`,
    },
    repurposes: channels.map((ch) => ({
      channel: ch,
      content: `[${ch}] A channel-native rewrite of the core piece about ${topic} — hook first, formatted for ${ch}. (Demo — a live run rewrites it natively per platform.)`,
      hook_options: [`The ${topic} mistake I see every week`, `Nobody talks about this part of ${topic}`],
    })),
    schedule: contentSchedule(channels),
    flags: ["Demo run on placeholder data. Add a real idea and connect an AI key in /admin for a live, verified batch.", "Every stat in a live run is checked against its source before delivery."],
    sources: [{ ref: "R1", quote: idea ? `Seed idea: ${idea}` : "Placeholder — add a real idea/topic for a sourced run." }],
    confidence: 0.4,
  };
}

const contentRunner: Runner = async (ctx, step, _depth, runId) => {
  const { config, tools } = ctx;
  const idea = pick(config, "idea", "topic", "seed") || "the idea";
  const outputSet = pick(config, "output_set") || "Blog + social";
  const channels = contentChannels(config);
  const tone = pick(config, "tone") || "brand voice";
  const brandCtx = (ctx.groundingCtx || "").slice(0, 2500); // brand voice + past content from the graph

  const trail: CrewAgentTrail[] = [];
  const models = new Set<string>();
  let billed = 0;
  const soFar = () => billed;
  const rec = (id: string, name: string, r: { model: string; billedUsd: number; findings: number; isMock: boolean }) => {
    trail.push({ id, name, model: r.model, billedUsd: r.billedUsd, findings: r.findings, status: "ok", isMock: r.isMock }); models.add(r.model); billed += r.billedUsd;
  };

  // 1. Content Strategist (LLM) — angle + plan (Part 3.A). Past topics from the graph to avoid repeats.
  const strategist = await agentCall(ctx, runId, { id: "strategist", name: "Content Strategist", taskType: "reasoning", system: METHOD_CONTENT.strategist,
    context: `SEED IDEA: ${idea}\nOUTPUT SET: ${outputSet}\nCHANNELS: ${channels.join(", ")}\nTONE: ${tone}\nBRAND CONTEXT + PAST CONTENT (avoid repeating):\n${brandCtx || "(new brand — no past content yet)"}`,
    schema: CONTENT_SCHEMAS.strategist, label: "Finding the angle" }, soFar);
  rec("strategist", "Content Strategist", strategist);
  const angle = String(strategist.json.angle ?? idea);

  // 2. Researcher — live search, then ground the facts/stats (Part 3.D)
  ctx.onEvent?.({ step: "crew.agent", id: "researcher", name: "Researcher", label: "Researching the topic", phase: "running", billedSoFar: soFar() });
  const search = await tools.search(`${angle} — facts, statistics, examples, what's ranking`);
  billed += search.billedUsd;
  const researcher = await agentCall(ctx, runId, { id: "researcher", name: "Researcher", taskType: "research", system: METHOD_CONTENT.researcher,
    context: `ANGLE: ${angle}\nCORE BRIEF: ${String(strategist.json.core_brief ?? "").slice(0, 1200)}\n[R] LIVE SEARCH RESULTS:\n${search.results.map((r, i) => `[R${i + 1}] ${r.title} — ${r.link}\n${r.snippet}`).join("\n")}`,
    schema: CONTENT_SCHEMAS.researcher, label: "Researching the topic" }, soFar);
  rec("researcher", "Researcher", researcher);

  // 3. Writer (LLM) — core long-form piece in brand voice (Part 3.B/F)
  const writer = await agentCall(ctx, runId, { id: "writer", name: "Writer", taskType: "content", system: METHOD_CONTENT.writer,
    context: `PLAN:\n${JSON.stringify(strategist.json).slice(0, 2500)}\nRESEARCH (facts/stats with sources):\n${JSON.stringify(researcher.json).slice(0, 4000)}\nBRAND VOICE:\n${brandCtx || "(use the chosen tone: " + tone + ")"}`,
    schema: CONTENT_SCHEMAS.writer, label: "Writing the core piece" }, soFar);
  rec("writer", "Writer", writer);

  // 4. Repurposer (LLM) — channel-native rewrites (Part 3.C), one per channel
  const repurposer = await agentCall(ctx, runId, { id: "repurposer", name: "Repurposer", taskType: "content", system: METHOD_CONTENT.repurposer,
    context: `CHANNELS (one native rewrite each): ${channels.join(", ")}\nCORE PIECE:\nTITLE OPTIONS: ${JSON.stringify(writer.json.title_options)}\nBODY:\n${String(writer.json.body ?? "").slice(0, 5000)}\nTAKEAWAY: ${writer.json.takeaway ?? ""}\nBRAND VOICE: ${brandCtx ? "as in context" : tone}`,
    schema: CONTENT_SCHEMAS.repurposer, label: "Adapting per platform" }, soFar);
  rec("repurposer", "Repurposer", repurposer);
  const repByChannel = new Map<string, ContentRepurposeJson>();
  for (const rp of ((repurposer.json.repurposes as ContentRepurposeJson[]) ?? [])) repByChannel.set(String(rp.channel ?? "").toLowerCase(), rp);

  // 5. Brand-Voice Editor (LLM) — make every piece sound like the brand (Part 3.E, the moat)
  const editor = await agentCall(ctx, runId, { id: "editor", name: "Brand-Voice Editor", taskType: "reasoning", system: METHOD_CONTENT.editor,
    context: `BRAND-VOICE PROFILE:\n${brandCtx || "(no saved profile — enforce the chosen tone: " + tone + ")"}\nCORE BODY:\n${String(writer.json.body ?? "").slice(0, 5000)}\nREPURPOSES:\n${JSON.stringify(repurposer.json.repurposes).slice(0, 5000)}`,
    schema: CONTENT_SCHEMAS.editor, label: "Making it sound like you" }, soFar);
  rec("editor", "Brand-Voice Editor", editor);
  const editedByChannel = new Map<string, string>();
  for (const rp of ((editor.json.repurposes as ContentRepurposeJson[]) ?? [])) editedByChannel.set(String(rp.channel ?? "").toLowerCase(), String(rp.content ?? ""));

  // 6. Verifier (LLM) — facts vs sources + originality (Part 3.G / Quality Layer 1)
  const verifier = await agentCall(ctx, runId, { id: "verifier", name: "Verifier", taskType: "reasoning", system: METHOD_CONTENT.verifier,
    context: `RESEARCH SOURCES:\n${JSON.stringify(researcher.json).slice(0, 3000)}\nCORE BODY:\n${String(editor.json.core_body ?? writer.json.body ?? "").slice(0, 5000)}\nREPURPOSES:\n${JSON.stringify((editor.json.repurposes ?? repurposer.json.repurposes)).slice(0, 4000)}`,
    schema: CONTENT_SCHEMAS.verifier, label: "Checking facts and originality" }, soFar);
  rec("verifier", "Verifier", verifier);

  // 7. Assemble content_report. Mock → a realistic demo.
  const { isMock: assemblerMock } = await routeTask(step.task_type);
  let report: unknown;
  if (assemblerMock) {
    report = mockContentReport(idea, channels, tone);
  } else {
    const repurposes = channels.map((ch) => {
      const key = ch.toLowerCase();
      const base = repByChannel.get(key) ?? {};
      const editedContent = editedByChannel.get(key);
      return { channel: ch, content: editedContent || String(base.content ?? ""), hook_options: Array.isArray(base.hook_options) ? (base.hook_options as string[]).map(String) : [] };
    }).filter((r) => r.content);
    const stats = (researcher.json.stats as Array<{ claim?: string; source?: string }>) ?? [];
    const flags = [...((verifier.json.flags as string[]) ?? []), ...((verifier.json.unconfirmed as string[]) ?? []).map((u) => `Unconfirmed — verify before posting: ${u}`)];
    if (verifier.json.originality_ok === false) flags.push("Originality check flagged a passage too close to a source — reword before posting.");
    report = {
      summary: `A week of content from one idea — a core piece plus ${repurposes.length} channel-native repurpose${repurposes.length === 1 ? "" : "s"}, in your ${tone} voice.`,
      core: {
        title_options: Array.isArray(writer.json.title_options) ? (writer.json.title_options as string[]).map(String) : [],
        body: String(editor.json.core_body ?? writer.json.body ?? ""),
        takeaway: String(writer.json.takeaway ?? ""),
      },
      repurposes,
      schedule: contentSchedule(repurposes.map((r) => r.channel)),
      flags: flags.slice(0, 10),
      sources: [
        { ref: "IDEA", quote: `Seed: ${idea}` },
        ...stats.slice(0, 6).map((s, i) => ({ ref: `S${i + 1}`, quote: `${s.claim ?? ""} — ${s.source ?? ""}`.slice(0, 200) })),
      ],
      confidence: repurposes.length && stats.length ? 0.75 : 0.55,
    };
  }

  // Verifier gate (Quality Layer 1) — facts vs sources; no unverified stat, no near-copy shipped.
  let verification: Verification | undefined;
  try {
    verification = await verifyOutput({ userId: ctx.userId, taskId: ctx.taskId, output: report, context: `RESEARCH:\n${JSON.stringify(researcher.json).slice(0, 5000)}` });
    billed += verification.billedUsd ?? 0;
    if (verification.model) models.add(verification.model);
    if (verification.verdict !== "supported" && report && typeof report === "object") {
      const r = report as { flags?: string[] };
      r.flags = [...(r.flags ?? []), ...verification.conflicts.map((c) => `Check this claim: ${c}`), ...verification.unsupported_claims.map((c) => `No source found: ${c}`)].slice(0, 14);
    }
    ctx.onEvent?.({ step: "crew.gate", verdict: verification.verdict, conflicts: verification.conflicts.length });
  } catch {
    ctx.onEvent?.({ step: "crew.gate", verdict: "skipped", conflicts: 0 });
  }

  return { output: report, schema: "content_report", modelsUsed: [...models], agents: trail, verification, isMock: assemblerMock || trail.some((t) => t.isMock), billedUsd: billed };
};

type CrewDef = {
  label: string; describe: string[]; agents: string[]; run: Runner;
  stepsTable: string;
  createRun: (ctx: CrewContext) => Promise<string | undefined>;
  finishRun: (runId: string, out: Awaited<ReturnType<Runner>>, taskId: string) => Promise<void>;
  failRun: (runId: string) => Promise<void>;
};

export const CREWS: Record<string, CrewDef> = {
  seo_geo: {
    label: "SEO & GEO Optimizer",
    describe: [
      "Reads your website and finds your products",
      "A team checks the tech, keywords, competitors and social — at the same time",
      "Tests whether AI answer engines can cite you",
      "Writes one prioritized plain-language plan",
      "Double-checks every claim before you see it",
    ],
    agents: ["Crawler", "Technical Auditor", "Keyword Analyst", "Competitor Analyst", "Social Analyst", "GEO Analyst", "Report Writer", "Verifier"],
    run: seoGeoRunner,
    stepsTable: "seo_run_steps",
    createRun: async (ctx) => {
      const { data } = await adminClient().from("seo_runs").insert({
        user_id: ctx.userId, task_id: ctx.taskId, site_url: pick(ctx.config, "site_url", "website", "url"),
        competitor_urls: (pick(ctx.config, "competitor_urls", "competitors") || "").split(",").map((s) => s.trim()).filter(Boolean),
        goal: pick(ctx.config, "goal", "focus") || "both", selected_products: (ctx.config.products ?? null) as unknown as Json, status: "running",
      }).select("id").single();
      return data?.id as string | undefined;
    },
    finishRun: async (runId, out, taskId) => {
      const db = adminClient();
      const rep = out.output as { health_score?: { seo?: number; geo?: number } } | null;
      const { data: usage } = await db.from("api_usage_log").select("cost_usd").eq("task_id", taskId);
      await db.from("seo_runs").update({
        status: "done", report: out.output as unknown as Json,
        health_score_seo: Math.round(Number(rep?.health_score?.seo ?? 0)), health_score_geo: Math.round(Number(rep?.health_score?.geo ?? 0)),
        total_cost: (usage ?? []).reduce((n, r) => n + Number(r.cost_usd), 0),
      }).eq("id", runId);
    },
    failRun: async (runId) => { await adminClient().from("seo_runs").update({ status: "failed" }).eq("id", runId); },
  },
  proposal: {
    label: "Proposal / RFP Maker",
    describe: [
      "Shreds the RFP into every requirement (a compliance matrix)",
      "Researches the buyer and pulls your real past work",
      "Sets the win themes that make you the obvious choice",
      "Writes each section, then rewrites it to consultant standard",
      "Loops until every requirement is covered, then fact-checks it",
    ],
    agents: ["RFP Shredder", "Capture Analyst", "Win-Theme Strategist", "Proposal Writer", "Consultant-Grade Editor", "Compliance Checker", "Verifier"],
    run: proposalRunner,
    stepsTable: "proposal_run_steps",
    createRun: async (ctx) => {
      const dl = pick(ctx.config, "deadline");
      const { data } = await adminClient().from("proposal_runs").insert({
        user_id: ctx.userId, task_id: ctx.taskId, tone: (pick(ctx.config, "tone") || "commercial").toLowerCase().includes("gov") ? "government" : "commercial",
        deadline: /^\d{4}-\d{2}-\d{2}/.test(dl) ? dl.slice(0, 10) : null, status: "running",
      }).select("id").single();
      return data?.id as string | undefined;
    },
    finishRun: async (runId, out, taskId) => {
      const db = adminClient();
      const rep = out.output as { compliance_matrix?: unknown; proposal_sections?: unknown; win_themes?: unknown; flags?: unknown } | null;
      const { data: usage } = await db.from("api_usage_log").select("cost_usd").eq("task_id", taskId);
      await db.from("proposal_runs").update({
        status: "done", proposal: out.output as unknown as Json,
        compliance_matrix: (rep?.compliance_matrix ?? null) as unknown as Json, win_themes: (rep?.win_themes ?? null) as unknown as Json, flags: (rep?.flags ?? null) as unknown as Json,
        total_cost: (usage ?? []).reduce((n, r) => n + Number(r.cost_usd), 0),
      }).eq("id", runId);
    },
    failRun: async (runId) => { await adminClient().from("proposal_runs").update({ status: "failed" }).eq("id", runId); },
  },
  clip: {
    label: "Clip Video",
    describe: [
      "Transcribes your video with timestamps",
      "A viral-instinct editor finds the self-contained, clip-worthy moments and scores each",
      "Re-opens every clip on its strongest hook — the first 3 seconds",
      "Cuts, reframes to vertical and captions — the heavy render runs only when it earns it",
      "Quality-checks every clip and drops the weak or misleading ones",
    ],
    agents: ["Transcriber", "Moment Finder", "Hook Optimizer", "Render Router", "Clip Editor", "Caption/Brand Renderer", "Captioner", "Quality Checker", "Verifier"],
    run: clipRunner,
    stepsTable: "clip_run_steps",
    createRun: async (ctx) => {
      const { data } = await adminClient().from("clip_runs").insert({
        user_id: ctx.userId, task_id: ctx.taskId,
        source_url: pick(ctx.config, "source_url", "video_url", "url") || null,
        source_file_path: pick(ctx.config, "source_file_path", "file") || null,
        source_duration_sec: secondsFromConfig(ctx.config),
        num_clips_requested: (pick(ctx.config, "num_clips", "num_clips_requested") || "auto").toLowerCase(),
        vibe: (pick(ctx.config, "vibe") || "punchy").toLowerCase().includes("full") ? "full" : "punchy",
        target: (pick(ctx.config, "target", "where") || "download").toLowerCase(),
        focus_prompt: pick(ctx.config, "focus_prompt", "focus") || null,
        status: "running",
      }).select("id").single();
      return data?.id as string | undefined;
    },
    finishRun: async (runId, out, taskId) => {
      const db = adminClient();
      const rep = out.output as { clips?: unknown } | null;
      const { data: usage } = await db.from("api_usage_log").select("cost_usd").eq("task_id", taskId);
      await db.from("clip_runs").update({
        status: "done", clips: (rep?.clips ?? null) as unknown as Json,
        total_cost: (usage ?? []).reduce((n, r) => n + Number(r.cost_usd), 0),
      }).eq("id", runId);
    },
    failRun: async (runId) => { await adminClient().from("clip_runs").update({ status: "failed" }).eq("id", runId); },
  },
  web_builder: {
    label: "Web Builder",
    describe: [
      "Turns your answers into a clear brand profile",
      "Reads the styles you like and captures the vibe — never copies",
      "Writes conversion copy — one benefit-led headline, one CTA",
      "Builds mobile-first pages to the high-converting structure",
      "Bakes in SEO + AI-search, then publishes and checks it works",
    ],
    agents: ["Brand Interviewer", "Design Extractor", "Copywriter", "Page Builder", "SEO/GEO Optimizer", "Deployer", "Verifier"],
    run: webBuilderRunner,
    stepsTable: "website_build_steps",
    createRun: async (ctx) => {
      const refs = (pick(ctx.config, "reference_urls", "references") || "").split(",").map((s) => s.trim()).filter(Boolean);
      const brand = pick(ctx.config, "brand_name", "business") || "site";
      const { data } = await adminClient().from("websites").insert({
        user_id: ctx.userId, account_id: ctx.userId, task_id: ctx.taskId,
        brand_name: pick(ctx.config, "brand_name", "business") || null,
        what_they_do: pick(ctx.config, "what_they_do") || null,
        audience: pick(ctx.config, "audience") || null,
        reference_urls: refs,
        checkout_url: pick(ctx.config, "checkout_url") || null,
        subdomain: `${slugify(brand)}.all41.app`,
        status: "building",
      }).select("id").single();
      return data?.id as string | undefined;
    },
    finishRun: async (runId, out, taskId) => {
      const db = adminClient();
      const rep = out.output as { pages?: unknown; style?: unknown; subdomain?: string; status?: string } | null;
      const { data: usage } = await db.from("api_usage_log").select("cost_usd").eq("task_id", taskId);
      await db.from("websites").update({
        status: rep?.status === "live" ? "live" : rep?.status === "failed" ? "failed" : "deploy_pending",
        pages: (rep?.pages ?? null) as unknown as Json, style: (rep?.style ?? null) as unknown as Json,
        subdomain: rep?.subdomain ?? null,
        build_cost: (usage ?? []).reduce((n, r) => n + Number(r.cost_usd), 0),
      }).eq("id", runId);
    },
    failRun: async (runId) => { await adminClient().from("websites").update({ status: "failed" }).eq("id", runId); },
  },
  content: {
    label: "Content Pipeline",
    describe: [
      "Turns one idea into a sharp angle and a content plan",
      "Researches real facts and stats to ground it",
      "Writes the core piece in your brand voice",
      "Rewrites it natively for each platform — not copy-paste",
      "Polishes every piece to your voice, then fact-checks it",
    ],
    agents: ["Content Strategist", "Researcher", "Writer", "Repurposer", "Brand-Voice Editor", "Verifier"],
    run: contentRunner,
    stepsTable: "content_run_steps",
    createRun: async (ctx) => {
      const { data } = await adminClient().from("content_runs").insert({
        user_id: ctx.userId, account_id: ctx.userId, task_id: ctx.taskId,
        idea: pick(ctx.config, "idea", "topic") || null,
        output_set: (pick(ctx.config, "output_set") || "").toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "") || null,
        channels: contentChannels(ctx.config),
        tone: (pick(ctx.config, "tone") || "brand_voice").toLowerCase().includes("brand") ? "brand_voice" : (pick(ctx.config, "tone") || "brand_voice").toLowerCase(),
        status: "running",
      }).select("id").single();
      return data?.id as string | undefined;
    },
    finishRun: async (runId, out, taskId) => {
      const db = adminClient();
      const { data: usage } = await db.from("api_usage_log").select("cost_usd").eq("task_id", taskId);
      await db.from("content_runs").update({
        status: "done", content: (out.output ?? null) as unknown as Json,
        total_cost: (usage ?? []).reduce((n, r) => n + Number(r.cost_usd), 0),
      }).eq("id", runId);
    },
    failRun: async (runId) => { await adminClient().from("content_runs").update({ status: "failed" }).eq("id", runId); },
  },
};

export function crewDepth(step: CrewStep, config: Record<string, unknown>): CrewDepth {
  if (!step.depth_from) return "standard";
  const v = String(config[step.depth_from.key] ?? "").toLowerCase();
  for (const [k, d] of Object.entries(step.depth_from.values)) if (k.toLowerCase() === v) return d;
  return "standard";
}

/** Dispatch a crew step: creates a seo_runs row, runs the crew, writes health scores + report back. */
export async function runCrew(ctx: CrewContext, step: CrewStep): Promise<CrewStepResult> {
  const def = CREWS[step.crew_id];
  if (!def) throw new Error(`UNKNOWN_CREW ${step.crew_id}`);
  const depth = crewDepth(step, ctx.config);
  ctx.stepsTable = def.stepsTable;
  const runId = await def.createRun(ctx);
  let out: Awaited<ReturnType<Runner>>;
  try {
    out = await def.run(ctx, step, depth, runId ?? "");
  } catch (e) {
    if (runId) await def.failRun(runId);
    throw e;
  }
  if (runId) await def.finishRun(runId, out, ctx.taskId);
  return { id: step.id, kind: "crew", crew_id: step.crew_id, seoRunId: runId, ...out };
}
