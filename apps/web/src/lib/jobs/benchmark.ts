import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { callModel } from "@/lib/ai/callModel";
import { getRoutingWeights } from "@/lib/ai/router";
import { splitModelId, type ChatMessage } from "@/lib/ai/types";
import { hasProviderKey, primeSecrets } from "@/lib/env";
import { logApiUsage } from "@/lib/finance/usage";
import { utcDateString } from "./pnl";

/**
 * Task 4.1 — daily benchmark. A small deterministic eval suite: 2 fixed prompts per task type,
 * graded by keyword/format/JSON checks (0–10). Every call is metered via logApiUsage
 * (user_id null, call_kind 'benchmark') — no credit deduction because there is no user.
 */

type Grader = (text: string, json: unknown) => number;
type BenchPrompt = { id: string; messages: ChatMessage[]; jsonSchema?: { name: string; schema: Record<string, unknown> }; grade: Grader };

const clamp = (n: number) => Math.max(0, Math.min(10, n));
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const has = (s: string, ...needles: string[]) => needles.every((n) => s.toLowerCase().includes(n.toLowerCase()));
const sentences = (s: string) => s.split(/[.!?]+\s/).filter((x) => x.trim().length > 0).length;
const user = (content: string): ChatMessage[] => [{ role: "user", content }];

const VERIFY_SCHEMA = {
  name: "verify_claim",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["verdict", "confidence"],
    properties: { verdict: { type: "string", enum: ["supported", "contradicted", "unknown"] }, confidence: { type: "number" } },
  },
};

export const BENCH_SUITE: Record<string, BenchPrompt[]> = {
  classify: [
    {
      id: "classify-1",
      messages: user("Classify this request into exactly one category from [research, content, code, summarize]. Reply with the single category word only.\n\nRequest: \"Compare Jasper AI's pricing tiers against ours and tell me where we're overpriced.\""),
      grade: (t) => clamp((has(t, "research") ? 8 : /research|content|code|summarize/i.test(t) ? 3 : 0) + (words(t) <= 3 ? 2 : 0)),
    },
    {
      id: "classify-2",
      messages: user("Classify this request into exactly one category from [research, content, code, summarize]. Reply with the single category word only.\n\nRequest: \"Write a Python function that dedupes a list while keeping order.\""),
      grade: (t) => clamp((has(t, "code") ? 8 : /research|content|summarize/i.test(t) ? 2 : 0) + (words(t) <= 3 ? 2 : 0)),
    },
  ],
  research: [
    {
      id: "research-1",
      messages: user("List three dated facts about the Eiffel Tower. One fact per line, each line must include a four-digit year."),
      grade: (t) => clamp(Math.min(5, (t.match(/\b1[89]\d{2}\b|\b20\d{2}\b/g) ?? []).length * 1.7) + (has(t, "1889") ? 3 : 0) + (t.trim().split("\n").filter(Boolean).length >= 3 ? 2 : 0)),
    },
    {
      id: "research-2",
      messages: user("Name the capital city of Australia and the year it was formally designated the capital. Answer in one sentence."),
      grade: (t) => clamp((has(t, "canberra") ? 6 : 0) + (/\b1908\b|\b1913\b|\b1927\b/.test(t) ? 2 : 0) + (sentences(t) <= 2 ? 2 : 0)),
    },
  ],
  synthesis: [
    {
      id: "synthesis-1",
      messages: user("Source A: \"Our churn rose 4% last quarter, concentrated in the Starter plan.\"\nSource B: \"Support tickets from Starter users mention onboarding confusion most often.\"\n\nSynthesize both sources into ONE two-sentence insight that mentions churn AND onboarding."),
      grade: (t) => clamp((has(t, "churn") ? 3 : 0) + (has(t, "onboarding") ? 3 : 0) + (sentences(t) <= 3 ? 2 : 0) + (words(t) <= 80 ? 2 : 0)),
    },
    {
      id: "synthesis-2",
      messages: user("Combine these into a single recommendation sentence: (1) Gemini Flash is cheapest for summaries. (2) Claude Sonnet scores highest on reasoning. Mention both models and the word 'route'."),
      grade: (t) => clamp((has(t, "flash") ? 3 : 0) + (has(t, "sonnet") ? 3 : 0) + (has(t, "route") ? 2 : 0) + (sentences(t) <= 2 ? 2 : 0)),
    },
  ],
  reasoning: [
    {
      id: "reasoning-1",
      messages: user("A train leaves at 3:00 PM travelling at 60 mph. The destination is 150 miles away. At what time does it arrive? Reply with the time only."),
      grade: (t) => clamp((/5[:.]30/.test(t) ? 8 : 0) + (words(t) <= 4 ? 2 : 0)),
    },
    {
      id: "reasoning-2",
      messages: user("A task costs $0.02 in API fees. We apply a 3.2x markup and then a 6% platform fee on top. What is the final price in dollars? Reply with the number only, rounded to 4 decimals."),
      grade: (t) => clamp((/0\.0678/.test(t) ? 8 : /0\.06[78]/.test(t) ? 5 : 0) + (words(t) <= 3 ? 2 : 0)),
    },
  ],
  code: [
    {
      id: "code-1",
      messages: user("Write a JavaScript function named isPalindrome(s) that ignores case and non-alphanumerics. Return only the code, no explanation."),
      grade: (t) => clamp((/isPalindrome\s*(=|\()/.test(t) ? 4 : 0) + (/toLowerCase|toUpperCase/.test(t) ? 2 : 0) + (/replace|filter|match/.test(t) ? 2 : 0) + (/^\s*(```|function|const|let)/.test(t) ? 2 : 0)),
    },
    {
      id: "code-2",
      messages: user("Write a TypeScript function `dedupe<T>(xs: T[]): T[]` that keeps first occurrence order. Return only the code."),
      grade: (t) => clamp((/dedupe\s*</.test(t) ? 4 : /dedupe/.test(t) ? 2 : 0) + (/Set|indexOf|includes|Map/.test(t) ? 3 : 0) + (/^\s*(```|function|const|export)/.test(t) ? 3 : 0)),
    },
  ],
  content: [
    {
      id: "content-1",
      messages: user("Write one tweet (max 280 characters) announcing 'all41', an AI assistant that runs multi-step tasks for a few cents each. Include the hashtag #all41. Output the tweet text only."),
      grade: (t) => clamp((t.trim().length <= 280 ? 5 : 0) + (has(t, "#all41") ? 3 : 0) + (has(t, "all41") ? 2 : 0)),
    },
    {
      id: "content-2",
      messages: user("Write a 3-bullet product blurb for a 'Morning Briefing' mini app. Each bullet starts with '- ' and is under 20 words."),
      grade: (t) => {
        const bullets = t.split("\n").filter((l) => /^\s*[-•*]\s/.test(l));
        return clamp((bullets.length === 3 ? 5 : bullets.length >= 2 ? 2 : 0) + (bullets.every((b) => words(b) <= 22) && bullets.length > 0 ? 3 : 0) + (has(t, "briefing") ? 2 : 0));
      },
    },
  ],
  summarize: [
    {
      id: "summarize-1",
      messages: user("Summarize in ONE sentence of at most 25 words:\n\n\"The all41 financial engine logs every provider call before the result is returned, gates each task with a pre-flight credit check, computes revenue from actual cost times markup, re-scrapes rates daily, and raises markup automatically when margin dips below 50%.\""),
      grade: (t) => clamp((words(t) <= 25 ? 5 : words(t) <= 35 ? 2 : 0) + (sentences(t) <= 1 ? 2 : 0) + (has(t, "margin") || has(t, "markup") ? 3 : 0)),
    },
    {
      id: "summarize-2",
      messages: user("Give a 3-word TL;DR (exactly three words) of: \"Users top up a credit balance and every task deducts actual cost times markup from it; there are no subscriptions.\""),
      grade: (t) => clamp((words(t) === 3 ? 6 : words(t) <= 5 ? 3 : 0) + (has(t, "credit") || has(t, "pay") || has(t, "top") ? 4 : 0)),
    },
  ],
  verify: [
    {
      id: "verify-1",
      messages: user("Claim: \"The Eiffel Tower was completed in 1889.\"\nSource: \"Construction of the Eiffel Tower finished in March 1889, in time for the Exposition Universelle.\"\nReturn JSON {verdict: supported|contradicted|unknown, confidence: 0..1}."),
      jsonSchema: VERIFY_SCHEMA,
      grade: (_t, j) => gradeVerify(j, "supported"),
    },
    {
      id: "verify-2",
      messages: user("Claim: \"Canberra has a population above 10 million.\"\nSource: \"Canberra's population was about 470,000 at the 2021 census.\"\nReturn JSON {verdict: supported|contradicted|unknown, confidence: 0..1}."),
      jsonSchema: VERIFY_SCHEMA,
      grade: (_t, j) => gradeVerify(j, "contradicted"),
    },
  ],
};

function gradeVerify(j: unknown, expected: string): number {
  if (!j || typeof j !== "object") return 0;
  const o = j as Record<string, unknown>;
  const verdictOk = o.verdict === expected;
  const conf = typeof o.confidence === "number" && o.confidence >= 0 && o.confidence <= 1;
  return clamp(4 + (verdictOk ? 4 : 0) + (conf ? 2 : 0));
}

export type BenchRun = { task_type: string; model: string; score: number; cost_per_run: number; latency_ms: number; details: Record<string, unknown> };
export type BenchmarkSummary = {
  date: string;
  mock: boolean;
  leaders: Array<{ task_type: string; model: string; score: number; cost_per_run: number }>;
  runs: BenchRun[];
  errors: string[];
};

const CALL_TIMEOUT_MS = 60_000;

async function runOne(modelId: string, p: BenchPrompt): Promise<{ score: number; costUsd: number; latencyMs: number; error?: string; noRate?: boolean }> {
  const { provider, model } = splitModelId(modelId);
  try {
    const res = await Promise.race([
      callModel({ model: modelId, messages: p.messages, temperature: 0, maxTokens: 400, jsonSchema: p.jsonSchema }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("BENCH_TIMEOUT")), CALL_TIMEOUT_MS)),
    ]);
    const score = p.grade(res.text ?? "", res.json);
    let costUsd = 0;
    let noRate = false;
    try {
      const log = await logApiUsage({ userId: null, provider: res.provider, model: res.model, callKind: "benchmark", usage: res.usage, latencyMs: res.latencyMs, costUsd: res.reportedCostUsd });
      costUsd = log.costUsd;
    } catch (err) {
      if (err instanceof Error && err.message.includes("NO_RATE")) {
        noRate = true;
        await logApiUsage({ userId: null, provider: res.provider, model: res.model, callKind: "benchmark", usage: res.usage, latencyMs: res.latencyMs, costUsd: 0, error: "NO_RATE" });
      } else throw err;
    }
    return { score, costUsd, latencyMs: res.latencyMs, noRate };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      await logApiUsage({ userId: null, provider, model, callKind: "benchmark", usage: {}, status: "error", error: msg.slice(0, 500), costUsd: 0 });
    } catch { /* never let metering of a failed call kill the benchmark */ }
    return { score: 0, costUsd: 0, latencyMs: 0, error: msg };
  }
}

/** Pick the leader: highest score first, then lowest cost. Returns null when nothing ran. */
export function pickLeader<T extends { score: number; cost_per_run: number }>(runs: T[]): T | null {
  if (!runs.length) return null;
  return [...runs].sort((a, b) => b.score - a.score || a.cost_per_run - b.cost_per_run)[0];
}

export async function runBenchmark(opts: { date?: string; taskTypes?: string[] } = {}): Promise<BenchmarkSummary> {
  const db = adminClient();
  const date = opts.date ?? utcDateString();
  const weights = await getRoutingWeights(true);
  await primeSecrets();
  const liveKey = ["anthropic","openai","google","groq","perplexity","deepseek","xai","mistral"].some((p) => hasProviderKey(p));
  const types = (opts.taskTypes ?? Object.keys(BENCH_SUITE)).filter((t) => BENCH_SUITE[t]);
  const runs: BenchRun[] = [];
  const leaders: BenchmarkSummary["leaders"] = [];
  const errors: string[] = [];

  for (const task_type of types) {
    const prompts = BENCH_SUITE[task_type];
    const candidates = weights.filter((w) => w.task_type === task_type).map((w) => w.model);
    const keyed = candidates.filter((m) => { const p = splitModelId(m).provider; return p === "mock" || hasProviderKey(p); });
    const runnable = keyed.length ? keyed : ["mock:mock-model"];
    const typeRuns: BenchRun[] = [];

    for (const modelId of runnable) {
      const per: Array<Awaited<ReturnType<typeof runOne>>> = [];
      for (const p of prompts) per.push(await runOne(modelId, p));
      const ok = per.filter((r) => !r.error);
      const score = per.reduce((s, r) => s + r.score, 0) / per.length;
      const cost = per.reduce((s, r) => s + r.costUsd, 0) / per.length;
      const latency = ok.length ? Math.round(ok.reduce((s, r) => s + r.latencyMs, 0) / ok.length) : 0;
      const run: BenchRun = {
        task_type, model: modelId,
        score: Math.round(score * 1000) / 1000,
        cost_per_run: Math.round(cost * 1e6) / 1e6,
        latency_ms: latency,
        details: {
          mock: !liveKey || splitModelId(modelId).provider === "mock",
          prompts: prompts.map((p, i) => ({ id: p.id, score: per[i].score, cost_usd: per[i].costUsd, latency_ms: per[i].latencyMs, error: per[i].error ?? null, no_rate: per[i].noRate ?? false })),
        },
      };
      typeRuns.push(run);
      for (const r of per) if (r.error) errors.push(`${task_type}/${modelId}: ${r.error}`);
    }

    const leader = pickLeader(typeRuns);
    for (const r of typeRuns) (r.details as Record<string, unknown>).is_leader = leader === r;

    // Replace today's rows for this type so re-runs are idempotent.
    await db.from("benchmark_results").delete().eq("date", date).eq("task_type", task_type);
    if (typeRuns.length) {
      const { error } = await db.from("benchmark_results").insert(
        typeRuns.map((r) => ({ date, task_type, model: r.model, score: r.score, cost_per_run: r.cost_per_run, latency_ms: r.latency_ms, is_leader: leader === r, details: r.details as Json })),
      );
      if (error) errors.push(`benchmark_results insert ${task_type}: ${error.message}`);
    }

    // Update routing only when the leader is a real routing candidate (never promote the mock model).
    if (leader && candidates.includes(leader.model) && splitModelId(leader.model).provider !== "mock") {
      await db.from("routing_weights").update({ is_leader: false, updated_at: new Date().toISOString() }).eq("task_type", task_type);
      const { error } = await db.from("routing_weights").update({ is_leader: true, updated_at: new Date().toISOString() }).eq("task_type", task_type).eq("model", leader.model);
      if (error) errors.push(`routing_weights update ${task_type}: ${error.message}`);
    }
    if (leader) leaders.push({ task_type, model: leader.model, score: leader.score, cost_per_run: leader.cost_per_run });
    runs.push(...typeRuns);
  }

  return { date, mock: !liveKey, leaders, runs, errors };
}
