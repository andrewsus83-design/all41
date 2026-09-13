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
    await adminClient().from("seo_run_steps").insert({
      run_id: runId, user_id: ctx.userId, agent: a.id, input: { context_chars: a.context.length } as unknown as Json,
      output: json as unknown as Json, model_used: modelId,
      tokens_in: r.result.usage.inputTokens, tokens_out: r.result.usage.outputTokens, cost_usd: r.costUsd, status: "ok",
    });
  } catch (e) {
    status = "error";
    await adminClient().from("seo_run_steps").insert({ run_id: runId, user_id: ctx.userId, agent: a.id, model_used: modelId, status: "error", output: { error: String(e).slice(0, 300) } as unknown as Json }).select();
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

export const CREWS: Record<string, { label: string; describe: string[]; agents: string[]; run: Runner }> = {
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
  const db = adminClient();
  const { data: run } = await db.from("seo_runs").insert({
    user_id: ctx.userId, task_id: ctx.taskId, site_url: pick(ctx.config, "site_url", "website", "url"),
    competitor_urls: (pick(ctx.config, "competitor_urls", "competitors") || "").split(",").map((s) => s.trim()).filter(Boolean),
    goal: pick(ctx.config, "goal", "focus") || "both", selected_products: (ctx.config.products ?? null) as unknown as Json, status: "running",
  }).select("id").single();
  const runId = run?.id as string;
  let out: Awaited<ReturnType<Runner>>;
  try {
    out = await def.run(ctx, step, depth, runId);
  } catch (e) {
    if (runId) await db.from("seo_runs").update({ status: "failed" }).eq("id", runId);
    throw e;
  }
  const rep = out.output as { health_score?: { seo?: number; geo?: number } } | null;
  if (runId) {
    const { data: usage } = await db.from("api_usage_log").select("cost_usd").eq("task_id", ctx.taskId);
    await db.from("seo_runs").update({
      status: "done", report: out.output as unknown as Json,
      health_score_seo: Math.round(Number(rep?.health_score?.seo ?? 0)), health_score_geo: Math.round(Number(rep?.health_score?.geo ?? 0)),
      total_cost: (usage ?? []).reduce((n, r) => n + Number(r.cost_usd), 0),
    }).eq("id", runId);
  }
  return { id: step.id, kind: "crew", crew_id: step.crew_id, seoRunId: runId, ...out };
}
