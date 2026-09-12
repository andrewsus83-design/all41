import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getProviderKey } from "@/lib/env";
import { callModel } from "@/lib/ai/callModel";
import { routeTask } from "@/lib/ai/router";
import { splitModelId, type ChatMessage } from "@/lib/ai/types";
import { estimateCost, getBalance, InsufficientCreditError, metered } from "@/lib/finance";
import { createTask } from "./run";
import { OUTPUT_SCHEMAS, type OutputSchemaKey } from "./schemas";
import { fetchGrounding, groundingToContext, ingestToGraph } from "./grounding";
import type { Json } from "@/lib/supabase/database.types";

/** Task 3.1 — a mini app's pre-built workflow. Configured (never generated) per user. */
export type WorkflowStep = {
  id: string;
  kind: "search" | "crawl" | "llm";
  task_type: string;
  prompt: string;
  schema?: OutputSchemaKey;
};
export type WorkflowDef = { steps: WorkflowStep[] };

export type SearchResult = { title: string; link: string; snippet: string };
export type StepOutput =
  | { id: string; kind: "search"; query: string; results: SearchResult[]; isMock: boolean; billedUsd: number }
  | { id: string; kind: "crawl"; url: string; markdown: string; isMock: boolean; billedUsd: number }
  | { id: string; kind: "llm"; model: string; output: unknown; schema: OutputSchemaKey | null; isMock: boolean; billedUsd: number };

export type AppRunResult = { taskId: string; result: unknown; billedUsd: number };

type Config = Record<string, unknown>;

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

/** TODO(email): wire a provider (Resend) — until then the run is visible in Chat/Dashboard and we log the intent. */
async function deliverByEmail(userId: string, taskId: string, result: unknown) {
  const o = result as { title?: string } | null;
  console.info(`[apps] deliverByEmail TODO — user=${userId} task=${taskId} title=${o?.title ?? ""}`);
}

const SYSTEM = `You are all41, a sharp work engine for solo operators. Answer ONLY from the provided CONTEXT and PRIOR STEPS plus clearly-labelled general knowledge.
Cite every factual claim with a source ref (S1/S2 for context, R1/R2 for search results, C1 for crawled pages, or "general"). Never invent numbers. Respond with JSON matching the schema.`;

// ---- step runners (each metered — Ground Rule 5) ----

async function runSearch(userId: string, taskId: string, step: WorkflowStep, config: Config): Promise<StepOutput> {
  const query = renderTemplate(step.prompt, config).trim();
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
  return { id: step.id, kind: "search", query, results: r.result.results, isMock: r.result.isMock, billedUsd: r.billedUsd };
}

function guessUrl(raw: string, prior: StepOutput[]) {
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) return `https://${s}`;
  for (const p of prior) if (p.kind === "search" && p.results[0]?.link) return p.results[0].link;
  return `https://${s.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
}

async function runCrawl(userId: string, taskId: string, step: WorkflowStep, config: Config, prior: StepOutput[]): Promise<StepOutput> {
  const url = guessUrl(renderTemplate(step.prompt, config), prior);
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
  return { id: step.id, kind: "crawl", url, markdown: r.result.markdown, isMock: r.result.isMock, billedUsd: r.billedUsd };
}

function priorToContext(prior: StepOutput[]) {
  const parts: string[] = [];
  for (const p of prior) {
    if (p.kind === "search") {
      parts.push(`SEARCH “${p.query}”:\n` + p.results.map((r, i) => `[R${i + 1}] ${r.title} — ${r.link}\n${r.snippet}`).join("\n"));
    } else if (p.kind === "crawl") {
      parts.push(`[C1] CRAWLED ${p.url}:\n${p.markdown.slice(0, 8000)}`);
    } else {
      parts.push(`PRIOR STEP ${p.id} (${p.model}):\n${JSON.stringify(p.output).slice(0, 6000)}`);
    }
  }
  return parts.join("\n\n") || "(no prior steps)";
}

async function runLlm(userId: string, taskId: string, step: WorkflowStep, config: Config, prior: StepOutput[], groundingCtx: string): Promise<StepOutput> {
  const { modelId, isMock } = await routeTask(step.task_type);
  const { provider, model } = splitModelId(modelId);
  const schemaKey = step.schema && step.schema in OUTPUT_SCHEMAS ? step.schema : null;
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `CONTEXT:\n${groundingCtx}\n\nPRIOR STEPS:\n${priorToContext(prior)}\n\nTASK:\n${renderTemplate(step.prompt, config)}` },
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

/**
 * Task 3.1 — run one configured instance through the same engine as any task.
 * Every provider call is metered; the final step's output is stored on the task and fed to the graph.
 */
export async function runAppInstance(instanceId: string): Promise<AppRunResult> {
  const db = adminClient();
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

  const briefing = {
    what: `${app.name}: ${configSummary(config) || "default run"}`.slice(0, 600),
    what_format: "report" as const,
    goal: "Run scheduled app and deliver its output",
    condition: { constraints: "", freshness: "day" as const, tone: "direct" as const, high_stakes: false },
    execute: { confirmed: true, use_context: true },
    track: inst.schedule === "once" ? ("once" as const) : ("save_app" as const),
  };
  const lastLlm = [...steps].reverse().find((s) => s.kind === "llm");
  const { taskId } = await createTask(userId, briefing, { appInstanceId: instanceId, taskType: lastLlm?.task_type ?? "research" });
  await db.from("tasks").update({ status: "running" }).eq("id", taskId);

  const outputs: StepOutput[] = [];
  const modelsUsed: string[] = [];
  let billedUsd = 0;
  try {
    const grounding = await fetchGrounding(userId, `${app.name} ${configSummary(config)}`);
    const groundingCtx = groundingToContext(grounding);
    for (const step of steps) {
      let out: StepOutput;
      if (step.kind === "search") out = await runSearch(userId, taskId, step, config);
      else if (step.kind === "crawl") out = await runCrawl(userId, taskId, step, config, outputs);
      else if (step.kind === "llm") out = await runLlm(userId, taskId, step, config, outputs, groundingCtx);
      else throw new Error(`UNKNOWN_STEP_KIND ${String((step as { kind: string }).kind)}`);
      if (out.kind === "llm") modelsUsed.push(out.model);
      billedUsd += out.billedUsd;
      outputs.push(out);
    }
    const last = outputs[outputs.length - 1];
    const finalOutput = last?.kind === "llm" ? last.output : last?.kind === "search" ? { title: `Search: ${last.query}`, results: last.results } : last?.kind === "crawl" ? { title: last.url, markdown: last.markdown } : null;
    const isMock = outputs.some((o) => o.isMock);
    const result = {
      output: finalOutput,
      schema: last?.kind === "llm" ? (last.schema ?? "answer") : "answer",
      taskType: lastLlm?.task_type ?? "research",
      modelsUsed,
      grounding: { chunks: grounding.chunks.length, tokens: grounding.tokenCount, engine: grounding.engine },
      isMock,
      steps: outputs.map((o) => (o.kind === "crawl" ? { ...o, markdown: o.markdown.slice(0, 2000) } : o)),
      app: { slug: app.slug, name: app.name },
    };

    const { data: usage } = await db.from("api_usage_log").select("cost_usd").eq("task_id", taskId);
    const totalCost = (usage ?? []).reduce((n, r) => n + Number(r.cost_usd), 0);
    await db.from("tasks").update({
      status: "done", result: result as unknown as Json, models_used: modelsUsed,
      total_cost: totalCost, total_billed: billedUsd, completed_at: new Date().toISOString(),
    }).eq("id", taskId);

    const now = new Date();
    const nextRun = nextRunFrom(inst.schedule, now);
    await db.from("user_app_instances").update({
      run_count: (inst.run_count ?? 0) + 1,
      last_run_at: now.toISOString(),
      next_run_at: nextRun,
      status: inst.schedule === "once" ? "done" : inst.status === "paused" ? "paused" : "active",
    }).eq("id", instanceId);

    if (inst.output_target === "email") await deliverByEmail(userId, taskId, finalOutput);

    const o = finalOutput as { title?: string } | null;
    void ingestToGraph({
      user_id: userId, source_type: "app_instance", source_id: instanceId, task_id: taskId, node_type: "task_output",
      title: o?.title ?? `${app.name} run`, content: JSON.stringify(finalOutput).slice(0, 12000),
    });
    return { taskId, result, billedUsd };
  } catch (err) {
    if (err instanceof InsufficientCreditError) {
      const bal = await getBalance(userId).catch(() => err.balance);
      await db.from("tasks").update({ status: "blocked", error: "INSUFFICIENT_CREDIT", total_billed: billedUsd }).eq("id", taskId);
      await db.from("user_app_instances").update({ status: "paused" }).eq("id", instanceId);
      throw new InsufficientCreditError(bal, err.needed);
    }
    await db.from("tasks").update({ status: "failed", error: String(err).slice(0, 500), total_billed: billedUsd }).eq("id", taskId);
    throw err;
  }
}
