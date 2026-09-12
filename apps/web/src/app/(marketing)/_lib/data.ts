import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PROVIDERS, isLlmProvider, type LlmProvider } from "@/lib/ai/providers";
import type { OutputSchemaKey } from "@/lib/engine/schemas";

/** Anon/RLS-scoped reads only — public marketing pages never touch the service role. */

export type MarketingApp = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  est_credit_cost: number;
  questions: ConfigQuestion[];
  steps: WorkflowStep[];
};
export type ConfigQuestion = { key: string; question: string; type: "text" | "choice" | "multi"; options?: string[]; placeholder?: string };
export type WorkflowStep = { id: string; kind: "search" | "crawl" | "llm"; task_type: string; prompt: string; schema?: OutputSchemaKey };

export const getPublishedApps = cache(async (): Promise<MarketingApp[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mini_apps")
    .select("id, slug, name, description, icon, category, est_credit_cost, config_schema, workflow_def")
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    description: a.description,
    icon: a.icon,
    category: a.category,
    est_credit_cost: Number(a.est_credit_cost),
    questions: (Array.isArray(a.config_schema) ? a.config_schema : []) as ConfigQuestion[],
    steps: ((a.workflow_def as { steps?: WorkflowStep[] } | null)?.steps ?? []) as WorkflowStep[],
  }));
});

export const getPublishedApp = cache(async (slug: string) => (await getPublishedApps()).find((a) => a.slug === slug) ?? null);

export type RoutingRow = { task_type: string; model: string; weight: number; is_leader: boolean };
export const getRoutingWeights = cache(async (): Promise<RoutingRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("routing_weights").select("task_type, model, weight, is_leader").order("task_type");
  return (data ?? []).map((r) => ({ ...r, weight: Number(r.weight) }));
});

/** task_type → leader (or best-weighted) model id. */
export async function getLeaders(): Promise<Map<string, string>> {
  const rows = await getRoutingWeights();
  const m = new Map<string, string>();
  for (const r of [...rows].sort((a, b) => Number(b.is_leader) - Number(a.is_leader) || b.weight - a.weight)) {
    if (!m.has(r.task_type)) m.set(r.task_type, r.model);
  }
  return m;
}

export type BenchmarkRow = {
  date: string;
  task_type: string;
  model: string;
  score: number;
  cost_per_run: number | null;
  latency_ms: number | null;
  is_leader: boolean;
};
/**
 * Latest benchmark day. `isMock` = every row came from the offline stand-in model (a dry run),
 * which the public pages treat as "no real test yet" rather than as results.
 */
export const getLatestBenchmarks = cache(async (): Promise<{ date: string | null; rows: BenchmarkRow[]; isMock: boolean }> => {
  const supabase = await createClient();
  const { data: latest } = await supabase.from("benchmark_results").select("date").order("date", { ascending: false }).limit(1).maybeSingle();
  if (!latest?.date) return { date: null, rows: [], isMock: false };
  const { data } = await supabase
    .from("benchmark_results")
    .select("date, task_type, model, score, cost_per_run, latency_ms, is_leader")
    .eq("date", latest.date)
    .order("task_type")
    .order("score", { ascending: false });
  const rows = (data ?? []).map((r) => ({
    ...r,
    score: Number(r.score),
    cost_per_run: r.cost_per_run === null ? null : Number(r.cost_per_run),
  }));
  const isMock = rows.length > 0 && rows.every((r) => splitModel(r.model).provider === "mock");
  return { date: latest.date, rows, isMock };
});

// ---- pure helpers ----

export function splitModel(id: string): { provider: string; model: string } {
  const i = id.indexOf(":");
  if (i < 0) return { provider: "mock", model: id };
  return { provider: id.slice(0, i), model: id.slice(i + 1) };
}

export function providerLabel(provider: string) {
  return isLlmProvider(provider) ? PROVIDERS[provider].label : provider;
}

/** "Anthropic claude-sonnet-5" */
export function modelLabel(id: string) {
  const { provider, model } = splitModel(id);
  return { provider: providerLabel(provider), providerId: provider as LlmProvider | string, model };
}

export type PipelineChip = { kind: "search" | "crawl" | "llm" | "deliver"; title: string; detail: string };

/** Plain-words label for a routing task type. */
export const TASK_WORDS: Record<string, string> = {
  classify: "sorting the request",
  research: "research",
  synthesis: "writing it up",
  reasoning: "thinking it through",
  code: "code",
  content: "writing",
  crawl: "reading pages",
  summarize: "summarizing",
  verify: "double-checking",
  edges: "connecting your notes",
};
export function taskWords(t: string) {
  return TASK_WORDS[t] ?? t;
}
/** Sentence case: "sorting the request" → "Sorting the request". */
export function taskLabel(t: string) {
  const w = taskWords(t);
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/**
 * "How it works" — derived from workflow_def.steps. Plain words on the public pages (no service names);
 * `withServices` adds the service/AI behind each step for the Resources page.
 */
export function pipelineChips(steps: WorkflowStep[], leaders: Map<string, string>, withServices = false): PipelineChip[] {
  const chips: PipelineChip[] = steps.map((s) => {
    if (s.kind === "search") return { kind: "search", title: "Search", detail: withServices ? "SerpAPI / Perplexity" : "looks up the latest on the web" };
    if (s.kind === "crawl") return { kind: "crawl", title: "Read", detail: withServices ? "Firecrawl" : "reads the pages that matter" };
    const leader = leaders.get(s.task_type);
    const plain = `${taskWords(s.task_type)} · today's best AI`;
    if (!withServices || !leader) return { kind: "llm", title: "AI", detail: leader ? plain : `${taskWords(s.task_type)} · picked daily` };
    const { provider, model } = modelLabel(leader);
    return { kind: "llm", title: "AI", detail: `${provider} ${model}` };
  });
  chips.push({ kind: "deliver", title: "Delivered", detail: "chat · email · dashboard" });
  return chips;
}

export function lastLlmSchema(steps: WorkflowStep[]): OutputSchemaKey | null {
  const s = [...steps].reverse().find((x) => x.kind === "llm");
  return s?.schema ?? null;
}

export function scheduleOptions(questions: ConfigQuestion[]): string[] {
  return questions.find((q) => q.key === "schedule")?.options ?? [];
}
