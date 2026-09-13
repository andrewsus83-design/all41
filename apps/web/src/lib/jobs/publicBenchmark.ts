import "server-only";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { callModel } from "@/lib/ai/callModel";
import { routeTask } from "@/lib/ai/router";
import { hasProviderKey, primeSecrets } from "@/lib/env";
import { logApiUsage } from "@/lib/finance/usage";
import { applyCredit, getBalance } from "@/lib/finance/ledger";
import { runAppInstance } from "@/lib/engine/apps";
import { OUTPUT_SCHEMAS } from "@/lib/engine/schemas";
import { utcDateString } from "./pnl";

/**
 * Quality Layer 3 — the PUBLIC monthly benchmark ("proof, not claims").
 *
 * The same representative job is run THREE ways and the outputs are judged BLIND by independent AI
 * judges (real users can vote later). all41 only picks a fair task and runs each path fairly — it
 * never scores its own output. Results are published as-is.
 *
 *   Path A — regular AI   : one genuine best-effort single call (routeTask("reasoning")). Not weakened.
 *   Path B — all41        : a real draft run of the `seo-geo-optimizer` crew app (runAppInstance).
 *   Path C — professional : a strong single call instructed to emulate an agency / SEMrush-style audit
 *                           (a clearly-labelled stand-in; we compare on quality criteria only, never by
 *                           copying any copyrighted report).
 *
 * Every model call the job makes directly is metered to api_usage_log (call_kind 'benchmark', user_id
 * null → no credit deduction). Path B is metered by the engine as any run is. On MOCK providers the
 * whole pipeline runs at $0 real spend; the run is flagged is_mock and the /benchmark page presents it
 * as an illustrative dry run — it never claims all41 "wins" from mock data.
 */

/** The benchmark runs as this dedicated system/test user (already seeded, holds credit). */
const BENCHMARK_USER = "11111111-1111-1111-1111-111111111111";
const LLM_PROVIDERS = ["anthropic", "openai", "google", "groq", "perplexity", "deepseek", "xai", "mistral"] as const;

/** A small pool of FAIR, representative SEO/GEO audit tasks. Neutral example domains only — no real
 *  business is singled out, and every path gets the identical prompt. */
export type BenchTask = {
  id: string;
  task_type: string;
  site: string;
  business: string;
  competitor: string;
  prompt: string;
};

export const PUBLIC_BENCH_TASKS: BenchTask[] = [
  {
    id: "seo-geo-shop",
    task_type: "seo_geo_audit",
    site: "example-shop.com",
    business: "an online shop selling handmade ceramic homeware",
    competitor: "example-rival-shop.com",
    prompt:
      "Audit example-shop.com (an online shop selling handmade ceramic homeware) for BOTH Google Search and AI answer engines (GEO — ChatGPT, Perplexity, Google AI Overviews). Cover: technical SEO issues by severity, keyword and content opportunities, a competitor gap vs example-rival-shop.com, GEO readiness (structured data, citable facts, entity clarity), and social signals. Return an overall SEO health score and GEO health score, then a prioritized, plain-language action plan a non-technical owner can act on this week.",
  },
  {
    id: "seo-geo-clinic",
    task_type: "seo_geo_audit",
    site: "example-clinic.com",
    business: "a local physiotherapy clinic",
    competitor: "example-rival-clinic.com",
    prompt:
      "Audit example-clinic.com (a local physiotherapy clinic) for BOTH Google Search and AI answer engines (GEO). Cover: local/technical SEO issues by severity, keyword and content opportunities, a competitor gap vs example-rival-clinic.com, GEO readiness (structured data, citable facts, entity clarity), and social signals. Return an overall SEO health score and GEO health score, then a prioritized, plain-language action plan a non-technical owner can act on this week.",
  },
  {
    id: "seo-geo-saas",
    task_type: "seo_geo_audit",
    site: "example-saas.com",
    business: "a small B2B invoicing SaaS",
    competitor: "example-rival-saas.com",
    prompt:
      "Audit example-saas.com (a small B2B invoicing SaaS) for BOTH Google Search and AI answer engines (GEO). Cover: technical SEO issues by severity, keyword and content opportunities, a competitor gap vs example-rival-saas.com, GEO readiness (structured data, citable facts, entity clarity), and social signals. Return an overall SEO health score and GEO health score, then a prioritized, plain-language action plan a non-technical owner can act on this week.",
  },
];

export const METHODOLOGY = [
  "The same job, three ways, judged blind by independent AI — we don't score ourselves.",
  "",
  "1. We pick one fair, representative SEO + GEO audit task and give the identical prompt to all three paths.",
  "2. Path A is a single best-effort call to a strong general model (regular AI). Path B is all41's SEO & GEO Optimizer app running its real specialist crew. Path C is a single call instructed to emulate an agency / SEMrush-style audit (a labelled stand-in — we compare on quality criteria only, never by copying any copyrighted report).",
  "3. Three independent AI judges score the outputs with the labels hidden and the order shuffled, rating each on completeness, accuracy, actionability and depth (0–10) plus an overall score. Real users can vote later.",
  "4. We average the overall score per path and publish the result as-is — win or lose. all41 never scores its own output.",
].join("\n");

/** Judge scoring schema — one row per output, referenced by its shuffled position (1..n). */
const JUDGE_SCHEMA = {
  name: "benchmark_judgment",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["scores"],
    properties: {
      scores: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["output", "completeness", "accuracy", "actionability", "depth", "overall", "note"],
          properties: {
            output: { type: "number" },
            completeness: { type: "number" },
            accuracy: { type: "number" },
            actionability: { type: "number" },
            depth: { type: "number" },
            overall: { type: "number" },
            note: { type: "string" },
          },
        },
      },
    },
  },
} as const;

type PathKey = "regular_ai" | "all41" | "professional";

export type PublicBenchmarkSummary = {
  benchmarkId: string | null;
  date: string;
  taskType: string;
  isMock: boolean;
  published: boolean;
  paths: Array<{ path: PathKey; overall: number | null; ran: boolean }>;
  judges: number;
  errors: string[];
};

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const clampScore = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(10, Math.round(n))) : null);

/** Untyped service-role client for the Layer-3 tables (not present in the generated Database types). */
function benchDb(): SupabaseClient {
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Meter a direct benchmark call — user_id null, call_kind 'benchmark' → logged, never billed. NO_RATE is tolerated. */
async function meterBench(res: { provider: string; model: string; usage: { inputTokens: number; outputTokens: number }; latencyMs: number; reportedCostUsd?: number }, errors: string[]) {
  try {
    await logApiUsage({ userId: null, provider: res.provider, model: res.model, callKind: "benchmark", usage: res.usage, latencyMs: res.latencyMs, costUsd: res.reportedCostUsd });
  } catch (err) {
    if (err instanceof Error && err.message.includes("NO_RATE")) {
      await logApiUsage({ userId: null, provider: res.provider, model: res.model, callKind: "benchmark", usage: res.usage, latencyMs: res.latencyMs, costUsd: 0, error: "NO_RATE" }).catch(() => {});
    } else {
      errors.push(`meter ${res.provider}:${res.model}: ${msg(err)}`);
    }
  }
}

function pickTask(opts: { taskType?: string; taskId?: string }): BenchTask {
  if (opts.taskId) { const t = PUBLIC_BENCH_TASKS.find((x) => x.id === opts.taskId); if (t) return t; }
  if (opts.taskType) { const t = PUBLIC_BENCH_TASKS.find((x) => x.task_type === opts.taskType); if (t) return t; }
  // rotate by month so successive monthly runs vary the representative task
  const idx = new Date().getUTCMonth() % PUBLIC_BENCH_TASKS.length;
  return PUBLIC_BENCH_TASKS[idx];
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function outputToText(output: unknown): string {
  if (output == null) return "(no output produced)";
  if (typeof output === "string") return output;
  try { return JSON.stringify(output, null, 2).slice(0, 8000); } catch { return String(output); }
}

// ---------------- Path A — regular AI (one genuine best-effort call) ----------------
async function runRegularAiPath(prompt: string, errors: string[]): Promise<unknown> {
  const { modelId } = await routeTask("reasoning");
  const res = await callModel({
    model: modelId,
    messages: [
      { role: "system", content: "You are a knowledgeable SEO and AI-search (GEO) consultant. Give your best possible single-shot answer to the audit request. Be specific, complete and actionable." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    maxTokens: 1600,
    jsonSchema: { name: OUTPUT_SCHEMAS.seo_report.name, schema: OUTPUT_SCHEMAS.seo_report.schema as unknown as Record<string, unknown> },
  });
  await meterBench(res, errors);
  return res.json ?? res.text;
}

// ---------------- Path C — professional-grade stand-in ----------------
async function runProfessionalPath(prompt: string, errors: string[]): Promise<unknown> {
  const { modelId } = await routeTask("reasoning");
  const res = await callModel({
    model: modelId,
    messages: [
      { role: "system", content: "You are a senior SEO agency lead producing a professional-grade audit to the standard of a paid tool such as SEMrush or Ahrefs (this is a quality-criteria stand-in; do NOT copy or reproduce any specific report). Be rigorous, prioritized, quantify impact where possible, and write findings a paying client would expect." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    maxTokens: 1600,
    jsonSchema: { name: OUTPUT_SCHEMAS.seo_report.name, schema: OUTPUT_SCHEMAS.seo_report.schema as unknown as Record<string, unknown> },
  });
  await meterBench(res, errors);
  return res.json ?? res.text;
}

// ---------------- Path B — all41 (real crew app run, cleaned up after) ----------------
async function runAll41Path(task: BenchTask, errors: string[]): Promise<unknown> {
  const admin = adminClient();
  const { data: app } = await admin.from("mini_apps").select("id").eq("slug", "seo-geo-optimizer").maybeSingle();
  if (!app) throw new Error("seo-geo-optimizer app missing — apply migration 20260913000001_crew_seo_geo.sql");

  // ensure the benchmark user can pay for the (mock-cheap or real) run
  const balance = await getBalance(BENCHMARK_USER).catch(() => 0);
  if (balance < 0.5) await applyCredit(BENCHMARK_USER, "grant", 2, { note: "public benchmark run" }).catch((e) => errors.push(`benchmark credit: ${msg(e)}`));

  const config = {
    site_url: task.site, goal: "both", product_scope: "all of them",
    competitor_urls: task.competitor, business: task.business, schedule: "Once", output_target: "Chat",
  };
  const { data: inst, error } = await admin
    .from("user_app_instances")
    .insert({ user_id: BENCHMARK_USER, mini_app_id: app.id, name: "public benchmark", config: config as Json, schedule: "once", output_target: "chat", status: "draft", next_run_at: null })
    .select("id")
    .single();
  if (error || !inst) throw new Error(`instance insert: ${error?.message}`);
  const instanceId = inst.id as string;

  try {
    const { result } = await runAppInstance(instanceId, { preview: true });
    return (result as { output?: unknown }).output ?? null;
  } finally {
    // Clean up the throwaway instance and its run trail. Keep api_usage_log (financial record; task_id
    // is nulled by the FK) so every metered call still persists.
    try {
      const { data: tasks } = await admin.from("tasks").select("id").eq("app_instance_id", instanceId);
      for (const t of tasks ?? []) await admin.from("seo_runs").delete().eq("task_id", t.id);
      await admin.from("tasks").delete().eq("app_instance_id", instanceId);
      await admin.from("user_app_instances").delete().eq("id", instanceId);
    } catch (e) { errors.push(`all41 cleanup: ${msg(e)}`); }
  }
}

export async function runPublicBenchmark(opts: { taskType?: string; taskId?: string; prompt?: string; date?: string } = {}): Promise<PublicBenchmarkSummary> {
  await primeSecrets();
  const date = opts.date ?? utcDateString();
  const errors: string[] = [];
  const liveKey = LLM_PROVIDERS.some((p) => hasProviderKey(p));
  const db = benchDb();

  const task = pickTask(opts);
  const prompt = opts.prompt ?? task.prompt;

  // 1) store the task row (draft, unpublished)
  const { data: bRow, error: bErr } = await db
    .from("public_benchmarks")
    .insert({ date, task_type: task.task_type, task_prompt: prompt, methodology: METHODOLOGY, status: "draft", published: false, is_mock: !liveKey })
    .select("id")
    .single();
  if (bErr || !bRow) throw new Error(`public_benchmarks insert failed: ${bErr?.message ?? "no row"}`);
  const benchmarkId = bRow.id as string;

  // 2–4) run the three paths (order of computation is not the order judges see)
  const pathB = await runAll41Path(task, errors).catch((e) => { errors.push(`all41: ${msg(e)}`); return null; });
  const pathA = await runRegularAiPath(prompt, errors).catch((e) => { errors.push(`regular_ai: ${msg(e)}`); return null; });
  const pathC = await runProfessionalPath(prompt, errors).catch((e) => { errors.push(`professional: ${msg(e)}`); return null; });

  const paths: Array<{ path: PathKey; output: unknown }> = [
    { path: "regular_ai", output: pathA },
    { path: "all41", output: pathB },
    { path: "professional", output: pathC },
  ];

  // store entries (unpublished until the end)
  const entryId: Partial<Record<PathKey, string>> = {};
  for (const p of paths) {
    const { data, error } = await db
      .from("public_benchmark_entries")
      .insert({ benchmark_id: benchmarkId, path: p.path, output: (p.output ?? { error: "path produced no output" }) as Json, label_revealed: false, published: false })
      .select("id")
      .single();
    if (error || !data) { errors.push(`entry ${p.path}: ${error?.message ?? "no row"}`); continue; }
    entryId[p.path] = data.id as string;
  }

  // 5) judges — blind and shuffled
  const shown = paths.filter((p) => p.output != null && entryId[p.path]).map((p) => ({ path: p.path, entryId: entryId[p.path] as string, text: outputToText(p.output) }));
  const order = shuffle(shown); // positions 1..n as the judge sees them
  let judgeCount = 0;

  if (order.length >= 2) {
    const board = order.map((o, i) => `### Output ${i + 1}\n${o.text}`).join("\n\n");
    const judges = [
      { judge: "independent-judge-1", taskType: "reasoning", framing: "Judge like a rigorous technical reviewer. Reward correctness and depth; penalise vague or generic advice." },
      { judge: "independent-judge-2", taskType: "synthesis", framing: "Judge like a busy business owner. Reward clear, complete, actionable plans you could follow this week." },
      { judge: "independent-judge-3", taskType: "research", framing: "Judge like an editor checking claims. Reward specificity and well-supported findings; penalise unsupported claims." },
    ];
    for (const j of judges) {
      try {
        const { modelId } = await routeTask(j.taskType);
        const res = await callModel({
          model: modelId,
          temperature: 0.2,
          maxTokens: 1200,
          jsonSchema: JUDGE_SCHEMA as unknown as { name: string; schema: Record<string, unknown> },
          messages: [
            { role: "system", content: `You are an INDEPENDENT judge scoring anonymized SEO/GEO audit outputs. You do not know which system produced which output and must not guess. ${j.framing} Score every output on completeness, accuracy, actionability and depth from 0 to 10, plus an overall 0–10. Return one entry per output, referenced by its number.` },
            { role: "user", content: `Task given to every output:\n${prompt}\n\nScore each of the following, referencing it by its output number:\n\n${board}` },
          ],
        });
        await meterBench(res, errors);
        judgeCount++;
        const parsed = (res.json ?? {}) as { scores?: Array<Record<string, unknown>> };
        for (const s of parsed.scores ?? []) {
          const pos = Number(s.output);
          const target = order[pos - 1];
          if (!target) continue;
          const overallRaw = clampScore(s.overall);
          await db.from("public_benchmark_scores").insert({
            benchmark_id: benchmarkId, entry_id: target.entryId, judge: j.judge, judge_kind: "ai",
            completeness: clampScore(s.completeness), accuracy: clampScore(s.accuracy), actionability: clampScore(s.actionability), depth: clampScore(s.depth),
            overall: overallRaw, published: false,
          });
        }
      } catch (e) { errors.push(`judge ${j.judge}: ${msg(e)}`); }
    }
  } else {
    errors.push("fewer than two paths produced output — nothing meaningful to judge");
  }

  // reveal labels now that judging is done
  await db.from("public_benchmark_entries").update({ label_revealed: true }).eq("benchmark_id", benchmarkId);

  // 6) aggregate overall per path (for the summary; the page recomputes from stored rows)
  const summaryPaths: PublicBenchmarkSummary["paths"] = [];
  for (const p of paths) {
    const eid = entryId[p.path];
    let overall: number | null = null;
    if (eid) {
      const { data: rows } = await db.from("public_benchmark_scores").select("overall").eq("entry_id", eid);
      const nums = (rows ?? []).map((r: { overall: number | string | null }) => Number(r.overall)).filter((n) => Number.isFinite(n));
      if (nums.length) overall = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
    }
    summaryPaths.push({ path: p.path, overall, ran: p.output != null });
  }

  // publish — even a mock dry run is published (flagged is_mock); the page presents mock as illustrative
  // and never as a win. A real run (live keys) is a genuine published result.
  await db.from("public_benchmarks").update({ status: liveKey ? "published" : "illustrative", published: true }).eq("id", benchmarkId);
  await db.from("public_benchmark_entries").update({ published: true }).eq("benchmark_id", benchmarkId);
  await db.from("public_benchmark_scores").update({ published: true }).eq("benchmark_id", benchmarkId);

  return { benchmarkId, date, taskType: task.task_type, isMock: !liveKey, published: true, paths: summaryPaths, judges: judgeCount, errors };
}
