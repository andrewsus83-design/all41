import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getProviderKey, primeSecrets } from "@/lib/env";
import { callModel } from "@/lib/ai/callModel";
import { routeTask } from "@/lib/ai/router";
import { splitModelId, type ChatMessage } from "@/lib/ai/types";
import { estimateCost, getBalance, InsufficientCreditError, metered } from "@/lib/finance";
import { createTask } from "./run";
import { OUTPUT_SCHEMAS, type OutputSchemaKey } from "./schemas";
import { fetchGrounding, groundingToContext, ingestToGraph } from "./grounding";
import { runAgentStep, resolveAgentLimits, type AgentEvent, type AgentStep, type AgentStepResult } from "./agent";
import { runCrew, CREWS, type CrewStep, type CrewStepResult, type CrewEvent, type CrewTools } from "./crew";
import type { Verification } from "./verify";
import type { Json } from "@/lib/supabase/database.types";

/** Task 3.1 — a mini app's pre-built workflow. Configured (never generated) per user. */
export type PipelineStep = {
  id: string;
  kind: "search" | "crawl" | "llm";
  task_type: string;
  prompt: string;
  schema?: OutputSchemaKey;
  /** Optional condition of the form "key=Value" against the instance config. The step is skipped when it doesn't match. */
  when?: string;
};
/** Level 1/2 steps run in order; a Level-3 `agent` step decides its own steps inside a hard cap and ceiling (engine/agent.ts);
 *  a `crew` step runs a team of specialist agents (professional-grade apps — engine/crew.ts). */
export type WorkflowStep = PipelineStep | AgentStep | CrewStep;
export type WorkflowDef = { steps: WorkflowStep[] };
export type { AgentStep, CrewStep };

/** docs/APP_AUTONOMY_GUIDE.md — 1 fixed pipeline · 2 branching workflow · 3 bounded agent. */
export type AutonomyLevel = 1 | 2 | 3;

export type SearchResult = { title: string; link: string; snippet: string };
export type StepOutput =
  | { id: string; kind: "search"; query: string; results: SearchResult[]; isMock: boolean; billedUsd: number }
  | { id: string; kind: "crawl"; url: string; markdown: string; isMock: boolean; billedUsd: number }
  | { id: string; kind: "llm"; model: string; output: unknown; schema: OutputSchemaKey | null; isMock: boolean; billedUsd: number }
  | AgentStepResult
  | CrewStepResult;

export type AppRunResult = { taskId: string; result: unknown; billedUsd: number };

/** What the user attached to an app — included on every run ("uploaded data"). Lives in `config.data`. */
export type InstanceData = { file_ids?: string[]; doc_ids?: string[]; sheet_ids?: string[]; note?: string };

/** Live progress emitted while an instance runs. Labels are plain words — safe to show as-is. */
export type RunEvent =
  | { step: "start"; taskId: string; preview: boolean }
  | { step: "data"; sources: number; chars: number }
  | { step: "step"; id: string; kind: WorkflowStep["kind"]; label: string; phase: "running" | "done" | "skipped"; billedUsd: number; billedSoFar: number; isMock?: boolean }
  | AgentEvent
  | CrewEvent
  | { step: "done"; taskId: string; billedUsd: number; balance: number }
  | { step: "blocked"; message: string; balance: number; needed: number }
  | { step: "error"; message: string };

export type StepDescription = {
  id: string; kind: WorkflowStep["kind"]; label: string; when: string | null; active: boolean;
  /** Level-3 only: the hard limits, so the UI can say "up to N steps, never more than $X". */
  maxSteps?: number; ceilingUsd?: number; verify?: boolean;
};

/** The autonomy level a workflow runs at — derived from its shape (mirrors the migration rule). */
export function autonomyLevel(def: WorkflowDef | null | undefined): AutonomyLevel {
  const steps = def?.steps ?? [];
  if (steps.some((s) => s.kind === "agent" || s.kind === "crew")) return 3;
  if (steps.some((s) => s.when) || steps.filter((s) => s.kind === "llm").length >= 2) return 2;
  return 1;
}

type Config = Record<string, unknown>;

export const SCHEDULES = ["once", "daily", "weekly", "monthly"] as const;
export const OUTPUT_TARGETS = ["chat", "email", "dashboard"] as const;

export function normalizeSchedule(v: unknown): (typeof SCHEDULES)[number] {
  const s = String(v ?? "once").toLowerCase();
  return (SCHEDULES as readonly string[]).includes(s) ? (s as (typeof SCHEDULES)[number]) : "once";
}
export function normalizeTarget(v: unknown): (typeof OUTPUT_TARGETS)[number] {
  const s = String(v ?? "chat").toLowerCase();
  return (OUTPUT_TARGETS as readonly string[]).includes(s) ? (s as (typeof OUTPUT_TARGETS)[number]) : "chat";
}

/** mustache-style {{key}} substitution from the instance config. Arrays join with ", ". */
export function renderTemplate(tpl: string, config: Config) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = config[key];
    if (v === undefined || v === null) return "";
    return Array.isArray(v) ? v.join(", ") : String(v);
  });
}

export function configSummary(config: Config) {
  return Object.entries(config)
    .filter(([k]) => k !== "data" && k !== "brief_note")
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

export function nextRunFrom(schedule: string, from = new Date()): string | null {
  const d = new Date(from);
  switch (schedule) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString();
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      return d.toISOString();
    case "monthly":
      d.setUTCDate(d.getUTCDate() + 30);
      return d.toISOString();
    default:
      return null;
  }
}

// ---- conditions ("key=Value") ----

function norm(v: unknown) {
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v ?? "").trim().toLowerCase();
}

/** `when: "needs_fresh=Yes"` → true when config.needs_fresh is "Yes" (case-insensitive; arrays match if they include it). */
export function stepApplies(step: Pick<WorkflowStep, "when">, config: Config): boolean {
  if (!step.when) return true;
  const i = step.when.indexOf("=");
  if (i < 0) return true;
  const key = step.when.slice(0, i).trim();
  const want = norm(step.when.slice(i + 1));
  const have = config[key];
  if (Array.isArray(have)) return have.some((x) => norm(x) === want);
  return norm(have) === want;
}

/** Plain-words description of what the app does when it runs (no model names, no infra terms). */
export function describeWorkflow(def: WorkflowDef | null | undefined, config?: Config): StepDescription[] {
  const steps = def?.steps ?? [];
  const llmCount = steps.filter((s) => s.kind === "llm").length;
  let llmSeen = 0;
  const out: StepDescription[] = [];
  for (const s of steps) {
    if (s.kind === "crew") {
      const def2 = CREWS[s.crew_id];
      const lines = def2?.describe ?? ["Runs a team of specialists", "Double-checks the result"];
      const active = config ? stepApplies(s, config) : true;
      lines.forEach((label, i) => out.push({ id: `${s.id}.${i}`, kind: "crew", label, when: s.when ?? null, active, verify: true }));
      continue;
    }
    let label: string;
    if (s.kind === "agent") {
      const { maxSteps, ceilingUsd, verify } = resolveAgentLimits(s, config ?? {});
      label = `Works through it step by step (up to ${maxSteps} steps, never more than $${ceilingUsd.toFixed(2)})${verify ? ", then double-checks the result" : ""}`;
      out.push({ id: s.id, kind: s.kind, label, when: s.when ?? null, active: config ? stepApplies(s, config) : true, maxSteps, ceilingUsd, verify });
      continue;
    }
    if (s.kind === "search") label = "Looks up fresh information";
    else if (s.kind === "crawl") label = "Reads the pages it found";
    else {
      llmSeen += 1;
      const isLast = llmSeen === llmCount;
      if (!isLast) label = "Thinks it through";
      else if (s.schema === "briefing") label = "Writes your briefing";
      else if (s.schema === "report") label = "Writes the comparison report";
      else if (s.schema === "content_pack") label = "Writes the drafts";
      else label = "Writes the result";
    }
    out.push({ id: s.id, kind: s.kind, label, when: s.when ?? null, active: config ? stepApplies(s, config) : true });
  }
  return out;
}

/** TODO(email): wire a provider (Resend) — until then the run is visible in My Apps and we log the intent. */
async function deliverByEmail(userId: string, taskId: string, result: unknown) {
  const o = result as { title?: string } | null;
  console.info(`[apps] deliverByEmail TODO — user=${userId} task=${taskId} title=${o?.title ?? ""}`);
}

const SYSTEM = `You are all41, a sharp work engine for solo operators. Answer ONLY from the provided CONTEXT, USER DATA and PRIOR STEPS plus clearly-labelled general knowledge.
Cite every factual claim with a source ref (S1/S2 for context, D1/D2 for user data, R1/R2 for search results, C1 for crawled pages, or "general"). Never invent numbers. Respond with JSON matching the schema.`;

const GROUNDING_CHARS = 6000 * 4;

// ---- user data ("uploaded data") ----

const TEXT_TYPES = /^(text\/|application\/(json|csv|x-ndjson))/;
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|log)$/i;

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function columnKeys(columns: unknown, firstRow: Record<string, unknown> | undefined): string[] {
  if (Array.isArray(columns) && columns.length) {
    return columns.map((c) => (typeof c === "string" ? c : String((c as Record<string, unknown>)?.key ?? (c as Record<string, unknown>)?.id ?? (c as Record<string, unknown>)?.name ?? ""))).filter(Boolean);
  }
  return firstRow ? Object.keys(firstRow) : [];
}

/**
 * Build the "USER DATA" block from `config.data`: file chunks (graph-ingested, or the raw text file as a fallback),
 * docs, sheets as CSV, and the free-text note. Capped so it never crowds out the task itself.
 */
export async function buildUserData(userId: string, data: InstanceData | null | undefined): Promise<{ text: string; sources: number; chars: number }> {
  if (!data) return { text: "", sources: 0, chars: 0 };
  const db = adminClient();
  const parts: string[] = [];
  let ref = 0;
  const FILE_CAP = 24_000; // ≈6k tokens across all files
  const DOC_CAP = 24_000;
  const SHEET_CAP = 24_000;

  const fileIds = (data.file_ids ?? []).slice(0, 12);
  if (fileIds.length) {
    let used = 0;
    const [{ data: files }, { data: nodes }] = await Promise.all([
      db.from("files").select("id, name, type, storage_path").eq("user_id", userId).in("id", fileIds),
      db.from("knowledge_nodes").select("source_id, chunk_index, content").eq("user_id", userId).eq("source_type", "file").in("source_id", fileIds).order("chunk_index", { ascending: true }),
    ]);
    for (const f of files ?? []) {
      if (used >= FILE_CAP) break;
      let text = (nodes ?? []).filter((n) => n.source_id === f.id).map((n) => n.content).join("\n");
      if (!text && (TEXT_TYPES.test(f.type ?? "") || TEXT_EXT.test(f.name))) {
        const dl = await db.storage.from("user-files").download(f.storage_path).catch(() => null);
        if (dl && !dl.error) text = await dl.data.text().catch(() => "");
      }
      if (!text) continue;
      const slice = text.slice(0, FILE_CAP - used);
      used += slice.length;
      ref += 1;
      parts.push(`[D${ref}] FILE “${f.name}”:\n${slice}`);
    }
  }

  const docIds = (data.doc_ids ?? []).slice(0, 12);
  if (docIds.length) {
    const { data: docs } = await db.from("user_docs").select("id, title, content_md").eq("user_id", userId).in("id", docIds);
    let used = 0;
    for (const d of docs ?? []) {
      if (used >= DOC_CAP) break;
      const slice = (d.content_md ?? "").slice(0, DOC_CAP - used);
      used += slice.length;
      ref += 1;
      parts.push(`[D${ref}] DOC “${d.title}”:\n${slice}`);
    }
  }

  const sheetIds = (data.sheet_ids ?? []).slice(0, 6);
  if (sheetIds.length) {
    const { data: tables } = await db.from("user_tables").select("id, name, columns").eq("user_id", userId).in("id", sheetIds);
    let used = 0;
    for (const t of tables ?? []) {
      if (used >= SHEET_CAP) break;
      const { data: rows } = await db.from("user_rows").select("data").eq("user_id", userId).eq("table_id", t.id).order("created_at", { ascending: true }).limit(200);
      const rowObjs = (rows ?? []).map((r) => (r.data && typeof r.data === "object" && !Array.isArray(r.data) ? (r.data as Record<string, unknown>) : {}));
      const keys = columnKeys(t.columns, rowObjs[0]);
      const csv = [keys.map(csvCell).join(","), ...rowObjs.map((r) => keys.map((k) => csvCell(r[k])).join(","))].join("\n");
      const slice = csv.slice(0, SHEET_CAP - used);
      used += slice.length;
      ref += 1;
      parts.push(`[D${ref}] SHEET “${t.name}” (${rowObjs.length} rows, CSV):\n${slice}`);
    }
  }

  const note = (data.note ?? "").trim();
  if (note) {
    ref += 1;
    parts.push(`[D${ref}] NOTE:\n${note.slice(0, 8000)}`);
  }

  const text = parts.join("\n\n");
  return { text, sources: ref, chars: text.length };
}

// ---- step runners (each metered — Ground Rule 5) ----

/** One metered web search (SerpAPI, or a mock when no key). Shared by pipeline steps and the agent's `search` tool. */
async function searchWeb(userId: string, taskId: string, query: string): Promise<{ results: SearchResult[]; isMock: boolean; billedUsd: number }> {
  await primeSecrets();
  const key = getProviderKey("serpapi");
  const est = await estimateCost("serpapi", "search", 0, 0);
  const r = await metered({
    userId, taskId, provider: "serpapi", model: "search", callKind: "search", estimatedBilledUsd: key ? est.billedUsd : 0,
    call: async () => {
      const t0 = Date.now();
      if (!key) {
        const results: SearchResult[] = [1, 2, 3].map((i) => ({
          title: `[mock] Result ${i} for “${query.slice(0, 60)}”`,
          link: `https://example.com/${encodeURIComponent(query.split(/\s+/)[0] ?? "result").toLowerCase()}/${i}`,
          snippet: `Placeholder search result ${i}. Connect SERPAPI_API_KEY for live results about ${query.slice(0, 80)}.`,
        }));
        return { result: { results, isMock: true }, usage: { apiCredits: 1 }, latencyMs: Date.now() - t0, costUsd: 0 };
      }
      const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=8&api_key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`SERPAPI_${res.status}`);
      const data = await res.json();
      const results: SearchResult[] = ((data.organic_results ?? []) as Array<Record<string, string>>)
        .slice(0, 8)
        .map((o) => ({ title: o.title ?? "", link: o.link ?? "", snippet: o.snippet ?? "" }));
      return { result: { results, isMock: false }, usage: { apiCredits: 1 }, latencyMs: Date.now() - t0 };
    },
  });
  return { results: r.result.results, isMock: r.result.isMock, billedUsd: r.billedUsd };
}

async function runSearch(userId: string, taskId: string, step: PipelineStep, config: Config): Promise<StepOutput> {
  const query = renderTemplate(step.prompt, config).trim();
  const r = await searchWeb(userId, taskId, query);
  return { id: step.id, kind: "search", query, results: r.results, isMock: r.isMock, billedUsd: r.billedUsd };
}

function guessUrl(raw: string, prior: StepOutput[]) {
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) return `https://${s}`;
  for (const p of prior) if (p.kind === "search" && p.results[0]?.link) return p.results[0].link;
  return `https://${s.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
}

/** One metered page read (Firecrawl, or a mock when no key). Shared by pipeline steps and the agent's `crawl` tool. */
async function crawlPage(userId: string, taskId: string, url: string): Promise<{ url: string; markdown: string; isMock: boolean; billedUsd: number }> {
  await primeSecrets();
  const key = getProviderKey("firecrawl");
  const est = await estimateCost("firecrawl", "scrape", 0, 0);
  const r = await metered({
    userId, taskId, provider: "firecrawl", model: "scrape", callKind: "crawl", estimatedBilledUsd: key ? est.billedUsd : 0,
    call: async () => {
      const t0 = Date.now();
      if (!key) {
        const markdown = `# [mock] ${url}\n\nPlaceholder page content. Connect FIRECRAWL_API_KEY to scrape live pages.\n\n## Pricing\n- Starter: $29/mo\n- Pro: $99/mo\n\n## Features\n- Feature A\n- Feature B`;
        return { result: { markdown, isMock: true }, usage: { apiCredits: 1 }, latencyMs: Date.now() - t0, costUsd: 0 };
      }
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"] }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error(`FIRECRAWL_${res.status}`);
      const data = await res.json();
      const markdown: string = data?.data?.markdown ?? data?.markdown ?? "";
      return { result: { markdown: markdown.slice(0, 20000), isMock: false }, usage: { apiCredits: 1 }, latencyMs: Date.now() - t0 };
    },
  });
  return { url, markdown: r.result.markdown, isMock: r.result.isMock, billedUsd: r.billedUsd };
}

async function runCrawl(userId: string, taskId: string, step: PipelineStep, config: Config, prior: StepOutput[]): Promise<StepOutput> {
  const url = guessUrl(renderTemplate(step.prompt, config), prior);
  const r = await crawlPage(userId, taskId, url);
  return { id: step.id, kind: "crawl", url, markdown: r.markdown, isMock: r.isMock, billedUsd: r.billedUsd };
}

/** DataForSEO — SEO data (SERP, keywords, backlinks) via one licensed provider. Basic-auth "login:password" in DATAFORSEO_KEY. Mock when unset. */
async function dataForSeo(userId: string, taskId: string, kind: "serp" | "keywords" | "backlinks", input: string): Promise<{ data: unknown; text: string; isMock: boolean; billedUsd: number }> {
  await primeSecrets();
  const key = getProviderKey("dataforseo");
  const r = await metered({
    userId, taskId, provider: "dataforseo", model: kind, callKind: "search", estimatedBilledUsd: key ? 0.004 : 0,
    call: async () => {
      const t0 = Date.now();
      if (!key) {
        const text = kind === "serp"
          ? `[mock] SERP for “${input.slice(0, 60)}”: 10 organic results, an AI Overview citing 2 competitors, a featured snippet, 4 People-Also-Ask questions, 3 ads. Connect DATAFORSEO_KEY for live SERP + keyword + backlink data.`
          : kind === "keywords"
            ? `[mock] Keywords for “${input.slice(0, 60)}”: ~8 related terms with volume 20–2,400/mo and KD 18–61. Connect DATAFORSEO_KEY for real volumes and difficulty.`
            : `[mock] Backlinks: DR 22, 140 referring domains, mostly dofollow. Connect DATAFORSEO_KEY for the real profile.`;
        return { result: { data: null, text }, usage: { apiCredits: 1 }, latencyMs: Date.now() - t0, costUsd: 0 };
      }
      const [login, password] = key.split(":");
      const auth = Buffer.from(`${login}:${password ?? ""}`).toString("base64");
      const endpoint = kind === "serp"
        ? "https://api.dataforseo.com/v3/serp/google/organic/live/regular"
        : kind === "keywords"
          ? "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live"
          : "https://api.dataforseo.com/v3/backlinks/summary/live";
      const body = kind === "backlinks" ? [{ target: input }] : [{ keyword: input, language_code: "en", location_code: 2840, depth: 20 }];
      const res = await fetch(endpoint, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`DATAFORSEO_${res.status}`);
      const data = await res.json();
      return { result: { data, text: JSON.stringify(data?.tasks?.[0]?.result ?? data).slice(0, 6000) }, usage: { apiCredits: 1 }, latencyMs: Date.now() - t0, costUsd: 0.004 };
    },
  });
  return { data: r.result.data, text: r.result.text, isMock: !key, billedUsd: r.billedUsd };
}

/** Google PageSpeed Insights — free Core Web Vitals. Metered at $0. */
async function pageSpeed(userId: string, taskId: string, url: string): Promise<{ data: unknown; text: string; isMock: boolean; billedUsd: number }> {
  await primeSecrets();
  const key = getProviderKey("google");
  const r = await metered({
    userId, taskId, provider: "google", model: "pagespeed", callKind: "search", estimatedBilledUsd: 0,
    call: async () => {
      const t0 = Date.now();
      try {
        const u = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile${key ? `&key=${key}` : ""}`;
        const res = await fetch(u, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const audits = data?.lighthouseResult?.audits ?? {};
        const text = `PageSpeed (mobile): LCP ${audits["largest-contentful-paint"]?.displayValue ?? "?"}, CLS ${audits["cumulative-layout-shift"]?.displayValue ?? "?"}, TBT ${audits["total-blocking-time"]?.displayValue ?? "?"}, performance score ${Math.round((data?.lighthouseResult?.categories?.performance?.score ?? 0) * 100)}.`;
        return { result: { data, text }, usage: { apiCredits: 1 }, latencyMs: Date.now() - t0, costUsd: 0 };
      } catch {
        return { result: { data: null, text: "[mock] PageSpeed (mobile): LCP 3.1s, CLS 0.05, performance score 62. (live PSI unavailable)" }, usage: { apiCredits: 1 }, latencyMs: Date.now() - t0, costUsd: 0 };
      }
    },
  });
  return { data: r.result.data, text: r.result.text, isMock: !r.result.data, billedUsd: r.billedUsd };
}

/** The crew's tool belt — the same metered helpers, so every specialist's fetch is logged. */
function crewTools(userId: string, taskId: string): CrewTools {
  return {
    search: (q: string) => searchWeb(userId, taskId, q),
    crawl: (url: string) => crawlPage(userId, taskId, url),
    dataforseo: (kind, input) => dataForSeo(userId, taskId, kind, input),
    pagespeed: (url: string) => pageSpeed(userId, taskId, url),
  };
}

function priorToContext(prior: StepOutput[]) {
  const parts: string[] = [];
  for (const p of prior) {
    if (p.kind === "search") {
      parts.push(`SEARCH “${p.query}”:\n` + p.results.map((r, i) => `[R${i + 1}] ${r.title} — ${r.link}\n${r.snippet}`).join("\n"));
    } else if (p.kind === "crawl") {
      parts.push(`[C1] CRAWLED ${p.url}:\n${p.markdown.slice(0, 8000)}`);
    } else {
      const model = p.kind === "llm" ? p.model : p.modelsUsed.join(", ");
      parts.push(`PRIOR STEP ${p.id} (${model}):\n${JSON.stringify(p.output).slice(0, 6000)}`);
    }
  }
  return parts.join("\n\n") || "(no prior steps)";
}

async function runLlm(userId: string, taskId: string, step: PipelineStep, config: Config, prior: StepOutput[], groundingCtx: string, userData: string): Promise<StepOutput> {
  const { modelId, isMock } = await routeTask(step.task_type);
  const { provider, model } = splitModelId(modelId);
  const schemaKey = step.schema && step.schema in OUTPUT_SCHEMAS ? step.schema : null;
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `CONTEXT:\n${groundingCtx}\n\nUSER DATA:\n${userData || "(none attached)"}\n\nPRIOR STEPS:\n${priorToContext(prior)}\n\nTASK:\n${renderTemplate(step.prompt, config)}${typeof config.brief_note === "string" && config.brief_note.trim() ? `\n\nTHE USER'S OWN WORDING OF THE BRIEF (follow it where it adds detail):\n${config.brief_note.trim().slice(0, 2000)}` : ""}` },
  ];
  const est = await estimateCost(provider, model, messages.reduce((n, m) => n + m.content.length, 0), 1200);
  const r = await metered({
    userId, taskId, provider, model, callKind: "llm", estimatedBilledUsd: est.billedUsd,
    call: async () => {
      const out = await callModel({ model: modelId, messages, jsonSchema: schemaKey ? OUTPUT_SCHEMAS[schemaKey] : undefined, maxTokens: 2000 });
      return { result: out, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.reportedCostUsd };
    },
  });
  const output = r.result.json ?? { title: "Result", answer: r.result.text, key_points: [], next_action: "", sources: [], confidence: 0.5, gaps: ["unstructured output"] };
  return { id: step.id, kind: "llm", model: modelId, output, schema: schemaKey, isMock, billedUsd: r.billedUsd };
}

// ---- helpers the pages need ----

type InstanceRow = {
  id: string; user_id: string; mini_app_id: string; name: string | null; config: Json; schedule: string; output_target: string;
  status: string; run_count: number; last_run_at: string | null; next_run_at: string | null; created_at: string; updated_at: string;
};
type MiniAppRow = {
  id: string; slug: string; name: string; description: string | null; icon: string | null; category: string | null;
  config_schema: Json; workflow_def: Json; est_credit_cost: number; is_published: boolean; sort_order: number;
};
export type TaskRow = {
  id: string; status: string; task_type: string | null; models_used: string[]; total_billed: number; total_cost: number;
  result: Json | null; briefing: Json; error: string | null; created_at: string; completed_at: string | null;
};

/** Instance + its template + the last 20 runs. Scoped to the owner (null when it isn't theirs). */
export async function getInstanceWithRuns(instanceId: string, userId: string): Promise<{ instance: InstanceRow; app: MiniAppRow; runs: TaskRow[] } | null> {
  const db = adminClient();
  const { data: inst } = await db.from("user_app_instances").select("*, mini_apps(*)").eq("id", instanceId).eq("user_id", userId).maybeSingle();
  if (!inst) return null;
  const { data: runs } = await db
    .from("tasks")
    .select("id, status, task_type, models_used, total_billed, total_cost, result, briefing, error, created_at, completed_at")
    .eq("app_instance_id", instanceId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  const { mini_apps, ...instance } = inst;
  return { instance: instance as InstanceRow, app: mini_apps as unknown as MiniAppRow, runs: (runs ?? []) as TaskRow[] };
}

/**
 * Pre-flight estimate for one run of an instance — every applicable step, using `estimateCost`.
 * A Level-3 agent step counts at its credit CEILING (label "up to"): the run can never bill more than that, and the balance must cover it.
 */
export async function estimateInstanceCost(instance: { config: Json | Config | null; mini_apps?: { workflow_def: Json } | null; workflow_def?: Json }): Promise<{ billedUsd: number; steps: Array<{ id: string; kind: WorkflowStep["kind"]; billedUsd: number }>; label: "about" | "up to" }> {
  const def = ((instance.mini_apps?.workflow_def ?? instance.workflow_def ?? { steps: [] }) as unknown) as WorkflowDef;
  const config = ((instance.config ?? {}) as unknown) as Config;
  await primeSecrets();
  const steps: Array<{ id: string; kind: WorkflowStep["kind"]; billedUsd: number }> = [];
  let total = 0;
  let label: "about" | "up to" = "about";
  for (const step of def.steps ?? []) {
    if (!stepApplies(step, config)) continue;
    let billed = 0;
    if (step.kind === "agent") { billed = resolveAgentLimits(step, config).ceilingUsd; label = "up to"; }
    else if (step.kind === "crew") {
      const { modelId } = await routeTask(step.task_type);
      const { provider, model } = splitModelId(modelId);
      const one = (await estimateCost(provider, model, 8000, 1000)).billedUsd;
      const crawlE = getProviderKey("firecrawl") ? (await estimateCost("firecrawl", "scrape", 0, 0)).billedUsd : 0;
      const dfE = getProviderKey("dataforseo") ? 0.004 : 0;
      const searchE = getProviderKey("serpapi") ? (await estimateCost("serpapi", "search", 0, 0)).billedUsd : 0;
      billed = one * 7 + crawlE * 3 + dfE + searchE;
    }
    else if (step.kind === "search") billed = getProviderKey("serpapi") ? (await estimateCost("serpapi", "search", 0, 0)).billedUsd : 0;
    else if (step.kind === "crawl") billed = getProviderKey("firecrawl") ? (await estimateCost("firecrawl", "scrape", 0, 0)).billedUsd : 0;
    else {
      const { modelId } = await routeTask(step.task_type);
      const { provider, model } = splitModelId(modelId);
      const dataChars = config.data ? 24_000 : 0;
      billed = (await estimateCost(provider, model, SYSTEM.length + renderTemplate(step.prompt, config).length + GROUNDING_CHARS + dataChars + 4000, 1200)).billedUsd;
    }
    steps.push({ id: step.id, kind: step.kind, billedUsd: billed });
    total += billed;
  }
  return { billedUsd: Math.round(total * 1e6) / 1e6, steps, label };
}

/** The agent's tool belt — the same metered helpers the pipeline steps use, plus their pre-flight per-call estimates. */
async function agentTools(userId: string, taskId: string) {
  await primeSecrets();
  return {
    search: (query: string) => searchWeb(userId, taskId, query),
    crawl: (url: string) => crawlPage(userId, taskId, url),
    estimates: {
      search: getProviderKey("serpapi") ? (await estimateCost("serpapi", "search", 0, 0)).billedUsd : 0,
      crawl: getProviderKey("firecrawl") ? (await estimateCost("firecrawl", "scrape", 0, 0)).billedUsd : 0,
    },
  };
}

/**
 * Task 3.1 — run one configured instance through the same engine as any task.
 * Every provider call is metered; the final step's output is stored on the task and fed to the graph.
 * `preview` (or a draft instance): still metered and billed, but the schedule is untouched and the task is tagged `briefing.preview`.
 */
export async function runAppInstance(instanceId: string, opts: { preview?: boolean; onEvent?: (e: RunEvent) => void } = {}): Promise<AppRunResult> {
  const db = adminClient();
  const emit = (e: RunEvent) => opts.onEvent?.(e);
  const { data: inst, error } = await db
    .from("user_app_instances")
    .select("*, mini_apps(*)")
    .eq("id", instanceId)
    .single();
  if (error || !inst) throw new Error("INSTANCE_NOT_FOUND");
  const app = inst.mini_apps as unknown as { name: string; slug: string; workflow_def: WorkflowDef };
  const config = (inst.config ?? {}) as Config;
  const steps = app.workflow_def?.steps ?? [];
  const userId = inst.user_id;
  const preview = opts.preview ?? inst.status === "draft";
  const descriptions = describeWorkflow(app.workflow_def, config);
  const labelOf = (id: string) => descriptions.find((d) => d.id === id)?.label ?? "Working";

  const briefing = {
    what: `${app.name}: ${configSummary(config) || "default run"}`.slice(0, 600),
    what_format: "report" as const,
    goal: preview ? "Preview this app before publishing" : "Run scheduled app and deliver its output",
    condition: { constraints: "", freshness: "day" as const, tone: "direct" as const, high_stakes: false },
    execute: { confirmed: true, use_context: true },
    track: inst.schedule === "once" ? ("once" as const) : ("save_app" as const),
  };
  const lastLlm = [...steps].reverse().find((s) => s.kind === "llm" || s.kind === "agent" || s.kind === "crew");
  const { taskId, briefing: stored } = await createTask(userId, briefing, { appInstanceId: instanceId, taskType: lastLlm?.task_type ?? "research" });
  await db.from("tasks").update({ status: "running", briefing: { ...stored, ...(preview ? { preview: true } : {}) } as unknown as Json }).eq("id", taskId);
  emit({ step: "start", taskId, preview });

  const outputs: StepOutput[] = [];
  const modelsUsed: string[] = [];
  let billedUsd = 0;
  try {
    const [grounding, userData] = await Promise.all([
      fetchGrounding(userId, `${app.name} ${configSummary(config)}`),
      buildUserData(userId, (config.data ?? null) as InstanceData | null),
    ]);
    const groundingCtx = groundingToContext(grounding);
    if (userData.sources > 0) emit({ step: "data", sources: userData.sources, chars: userData.chars });

    for (const step of steps) {
      const label = labelOf(step.id);
      if (!stepApplies(step, config)) {
        emit({ step: "step", id: step.id, kind: step.kind, label, phase: "skipped", billedUsd: 0, billedSoFar: billedUsd });
        continue;
      }
      emit({ step: "step", id: step.id, kind: step.kind, label, phase: "running", billedUsd: 0, billedSoFar: billedUsd });
      let out: StepOutput;
      if (step.kind === "search") out = await runSearch(userId, taskId, step, config);
      else if (step.kind === "crawl") out = await runCrawl(userId, taskId, step, config, outputs);
      else if (step.kind === "llm") out = await runLlm(userId, taskId, step, config, outputs, groundingCtx, userData.text);
      else if (step.kind === "agent") {
        // Level 3 — bounded agent: pre-flight on the ceiling, metered plan→act→observe loop, write-up, verification.
        out = await runAgentStep({ userId, taskId, config, userData: userData.text, tools: await agentTools(userId, taskId), onEvent: (e) => emit(e) }, step);
      } else if (step.kind === "crew") {
        // Professional tier — a team of specialist agents, each metered, with a Verifier gate (engine/crew.ts).
        out = await runCrew({ userId, taskId, config, userData: userData.text, groundingCtx, tools: crewTools(userId, taskId), onEvent: (e) => emit(e) }, step);
      } else throw new Error(`UNKNOWN_STEP_KIND ${String((step as { kind: string }).kind)}`);
      if (out.kind === "llm") modelsUsed.push(out.model);
      if (out.kind === "agent" || out.kind === "crew") for (const m of out.modelsUsed) if (!modelsUsed.includes(m)) modelsUsed.push(m);
      billedUsd += out.billedUsd;
      outputs.push(out);
      emit({ step: "step", id: step.id, kind: step.kind, label, phase: "done", billedUsd: out.billedUsd, billedSoFar: billedUsd, isMock: out.isMock });
    }
    const last = outputs[outputs.length - 1];
    const finalOutput = last?.kind === "llm" || last?.kind === "agent" || last?.kind === "crew" ? last.output : last?.kind === "search" ? { title: `Search: ${last.query}`, results: last.results } : last?.kind === "crawl" ? { title: last.url, markdown: last.markdown } : null;
    const isMock = outputs.some((o) => o.isMock);
    const verification: Verification | undefined = last?.kind === "agent" || last?.kind === "crew" ? last.verification : undefined;
    const result = {
      output: finalOutput,
      schema: last?.kind === "llm" || last?.kind === "agent" || last?.kind === "crew" ? (last.schema ?? "answer") : "answer",
      taskType: lastLlm?.task_type ?? "research",
      modelsUsed,
      grounding: { chunks: grounding.chunks.length, tokens: grounding.tokenCount, engine: grounding.engine },
      userData: { sources: userData.sources, chars: userData.chars },
      // same optional field as engine/run.ts TaskResult — surfaced, never passed silently
      ...(verification ? { verification } : {}),
      ...(last?.kind === "agent" ? { agent: last.agent } : {}),
      ...(last?.kind === "crew" ? { crew: { crew_id: last.crew_id, agents: last.agents, seoRunId: last.seoRunId } } : {}),
      isMock,
      preview,
      steps: outputs.map((o) => (o.kind === "crawl" ? { ...o, markdown: o.markdown.slice(0, 2000) } : o.kind === "crew" ? { id: o.id, kind: o.kind, crew_id: o.crew_id, agents: o.agents, billedUsd: o.billedUsd, isMock: o.isMock } : o)),
      app: { slug: app.slug, name: app.name },
    };

    const { data: usage } = await db.from("api_usage_log").select("cost_usd").eq("task_id", taskId);
    const totalCost = (usage ?? []).reduce((n, r) => n + Number(r.cost_usd), 0);
    await db.from("tasks").update({
      status: "done", result: result as unknown as Json, models_used: modelsUsed,
      total_cost: totalCost, total_billed: billedUsd, completed_at: new Date().toISOString(),
    }).eq("id", taskId);

    const now = new Date();
    const patch: { run_count: number; last_run_at: string; next_run_at?: string | null; status?: string } = { run_count: (inst.run_count ?? 0) + 1, last_run_at: now.toISOString() };
    if (!preview && inst.status !== "draft") {
      patch.next_run_at = nextRunFrom(inst.schedule, now);
      patch.status = inst.schedule === "once" ? "done" : inst.status === "paused" ? "paused" : "active";
    }
    await db.from("user_app_instances").update(patch).eq("id", instanceId);

    if (!preview && inst.output_target === "email") await deliverByEmail(userId, taskId, finalOutput);

    const o = finalOutput as { title?: string } | null;
    void ingestToGraph({
      user_id: userId, source_type: "app_instance", source_id: instanceId, task_id: taskId, node_type: "task_output",
      title: o?.title ?? `${app.name} run`, content: JSON.stringify(finalOutput).slice(0, 12000),
    });
    const balance = await getBalance(userId).catch(() => 0);
    emit({ step: "done", taskId, billedUsd, balance });
    return { taskId, result, billedUsd };
  } catch (err) {
    if (err instanceof InsufficientCreditError) {
      const bal = await getBalance(userId).catch(() => err.balance);
      await db.from("tasks").update({ status: "blocked", error: "INSUFFICIENT_CREDIT", total_billed: billedUsd }).eq("id", taskId);
      if (!preview && inst.status !== "draft") await db.from("user_app_instances").update({ status: "paused" }).eq("id", instanceId);
      emit({ step: "blocked", message: `Not enough credit — balance $${bal.toFixed(2)}, this needs about $${err.needed.toFixed(4)}. Top up to continue.`, balance: bal, needed: err.needed });
      throw new InsufficientCreditError(bal, err.needed);
    }
    await db.from("tasks").update({ status: "failed", error: String(err).slice(0, 500), total_billed: billedUsd }).eq("id", taskId);
    emit({ step: "error", message: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
