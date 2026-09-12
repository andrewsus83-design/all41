/**
 * Level 3 — bounded agent (docs/APP_AUTONOMY_GUIDE.md), live DB, mock providers.
 * Provider keys are blanked below so routing falls to the mock model and the mock search/crawl tools:
 * the loop, the step cap, the credit ceiling and the pre-flight are exercised for $0 real spend
 * (mock calls still cost credit through cost_rates, so metering is real).
 * Needs migration 20260912000010_autonomy.sql (the `deep-research` template).
 */
process.env.ANTHROPIC_API_KEY = "";
process.env.OPENAI_API_KEY = "";
process.env.GOOGLE_API_KEY = "";
process.env.GROQ_API_KEY = "";
process.env.PERPLEXITY_API_KEY = "";
process.env.DEEPSEEK_API_KEY = "";
process.env.XAI_API_KEY = "";
process.env.MISTRAL_API_KEY = "";
process.env.SERPAPI_API_KEY = "";
process.env.FIRECRAWL_API_KEY = "";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminClient } from "@/lib/supabase/admin";
import { applyCredit, getBalance, InsufficientCreditError } from "@/lib/finance/ledger";
import { runAppInstance, describeWorkflow, estimateInstanceCost, autonomyLevel, type RunEvent, type WorkflowDef } from "@/lib/engine/apps";
import { resolveAgentLimits, type AgentStep, type AgentStopReason } from "@/lib/engine/agent";
import type { Json } from "@/lib/supabase/database.types";

const USER_A = "11111111-1111-1111-1111-111111111111"; // has credit
const USER_B = "22222222-2222-2222-2222-222222222222"; // zero credit

// Small enough that the loop stops on spend before the scripted planner finishes, large enough for ≥1 iteration + the write-up.
// (Mock rates: planner ≈ $0.0007/call billed, write-up reserve ≈ $0.009 — see the calibration note in the ceiling test.)
const TINY_CEILING = 0.0105;

type Row = { id: string; workflow_def: Json };
let app: Row;
let clone: { id: string; slug: string } | null = null;
const instances: string[] = [];

async function createInstance(userId: string, miniAppId: string, config: Record<string, unknown>) {
  const { data, error } = await adminClient()
    .from("user_app_instances")
    .insert({ user_id: userId, mini_app_id: miniAppId, name: "agent test", config: config as Json, schedule: "once", output_target: "chat", status: "draft", next_run_at: null })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  instances.push(data.id);
  return data.id as string;
}

const QUICK = { question: "Is there room for a premium coffee subscription in Jakarta?", purpose: "deciding whether to launch in Q1", depth: "Quick", schedule: "Once", output_target: "Chat" };

describe("Level 3 agent — caps, ceiling, metering, pre-flight", () => {
  beforeAll(async () => {
    const a = await getBalance(USER_A);
    if (a < 1) await applyCredit(USER_A, "grant", 2, { note: "agent test top-up" });
    const { data } = await adminClient().from("mini_apps").select("id, workflow_def").eq("slug", "deep-research").maybeSingle();
    if (!data) throw new Error("deep-research template missing — push supabase/migrations/20260912000010_autonomy.sql first");
    app = data as Row;
  });

  afterAll(async () => {
    const db = adminClient();
    if (instances.length) {
      await db.from("tasks").delete().in("app_instance_id", instances); // usage/ledger rows keep their history (task_id → null)
      await db.from("user_app_instances").delete().in("id", instances);
    }
    if (clone) await db.from("mini_apps").delete().eq("id", clone.id);
  });

  it("describes and estimates a Level-3 app in plain words, at its ceiling", async () => {
    const def = app.workflow_def as unknown as WorkflowDef;
    expect(autonomyLevel(def)).toBe(3);
    const step = def.steps[0] as AgentStep;
    expect(resolveAgentLimits(step, { depth: "Quick" }).maxSteps).toBe(4);
    expect(resolveAgentLimits(step, { depth: "Standard" }).maxSteps).toBe(8);
    expect(resolveAgentLimits(step, { depth: "Deep" }).maxSteps).toBe(12);
    const [d] = describeWorkflow(def, { depth: "Deep" });
    expect(d.label).toBe("Works through it step by step (up to 12 steps, never more than $0.60), then double-checks the result");
    const est = await estimateInstanceCost({ config: { depth: "Quick" } as Json, workflow_def: app.workflow_def });
    expect(est.label).toBe("up to");
    expect(est.billedUsd).toBeCloseTo(step.credit_ceiling_usd, 6);
  });

  it("runs deep-research (Quick) inside its step cap, metering every planner call", async () => {
    const db = adminClient();
    const id = await createInstance(USER_A, app.id, QUICK);
    const events: RunEvent[] = [];
    const r = await runAppInstance(id, { preview: true, onEvent: (e) => events.push(e) });
    const result = r.result as { output: unknown; verification?: { verdict: string }; agent: { iterations: number; maxSteps: number; stopReason: AgentStopReason; spentUsd: number } };

    expect(result.output).toBeTruthy();
    expect(result.agent.maxSteps).toBe(4);
    expect(result.agent.iterations).toBeLessThanOrEqual(4);
    expect(result.agent.iterations).toBeGreaterThanOrEqual(1);

    const stop = events.find((e) => e.step === "agent.stop");
    expect(stop && stop.step === "agent.stop" && ["finished", "step_cap"].includes(stop.reason)).toBe(true);
    const plans = events.filter((e) => e.step === "agent.plan");
    expect(plans.length).toBe(result.agent.iterations);
    expect(events.some((e) => e.step === "agent.tool")).toBe(true);
    expect(events.some((e) => e.step === "agent.observe")).toBe(true);
    expect(events.some((e) => e.step === "agent.verify")).toBe(true);
    expect(result.verification?.verdict).toBeTruthy();

    // guardrail 3 — one api_usage_log row per planner iteration, plus the write-up (and the verify pass)
    const { data: logs } = await db.from("api_usage_log").select("call_kind, billed_usd, status").eq("task_id", r.taskId);
    const llmRows = (logs ?? []).filter((l) => l.call_kind === "llm" && l.status === "ok");
    expect(llmRows.length).toBeGreaterThanOrEqual(result.agent.iterations + 1);
    const billed = (logs ?? []).reduce((s, l) => s + Number(l.billed_usd), 0);
    expect(billed).toBeCloseTo(r.billedUsd, 6);
    expect(billed).toBeLessThanOrEqual(0.6);

    const { data: task } = await db.from("tasks").select("status, total_billed").eq("id", r.taskId).single();
    expect(task!.status).toBe("done");
    expect(Number(task!.total_billed)).toBeCloseTo(billed, 6);
  });

  it("hard-stops at a tiny credit ceiling and still writes up what it found", async () => {
    const db = adminClient();
    // clone the template with a tiny ceiling and a high step cap so spend, not steps, is the binding limit
    const def = structuredClone(app.workflow_def) as { steps: Array<Record<string, unknown>> };
    def.steps[0] = { ...def.steps[0], credit_ceiling_usd: TINY_CEILING, max_steps: 12, max_steps_from: undefined };
    delete def.steps[0].max_steps_from;
    const slug = `test-agent-ceiling-${Date.now()}`;
    const { data: c, error } = await db.from("mini_apps").insert({ slug, name: "Ceiling test", workflow_def: def as unknown as Json, is_published: false, category: "research", est_credit_cost: TINY_CEILING }).select("id, slug").single();
    if (error || !c) throw new Error(error?.message ?? "clone failed");
    clone = c;

    const id = await createInstance(USER_A, c.id, { ...QUICK, depth: "Deep" });
    const events: RunEvent[] = [];
    const r = await runAppInstance(id, { preview: true, onEvent: (e) => events.push(e) });
    const result = r.result as { output: unknown; agent: { iterations: number; stopReason: AgentStopReason; spentUsd: number; ceilingUsd: number } };

    expect(result.agent.stopReason).toBe("credit_ceiling");
    expect(result.agent.iterations).toBeGreaterThanOrEqual(1); // the loop ran before the ceiling bit
    expect(result.agent.iterations).toBeLessThan(12);
    expect(result.output).toBeTruthy(); // never nothing after spending
    const stop = events.find((e) => e.step === "agent.stop");
    expect(stop && stop.step === "agent.stop" ? stop.reason : null).toBe("credit_ceiling");

    // Tolerance: the loop reserves the write-up's *estimate* and never spends into it, so the total normally lands under the
    // ceiling. The one call allowed past it is the final write-up (its real cost can exceed the estimate, and a ceiling
    // smaller than one write-up still gets a write-up) — so: total ≤ ceiling + the largest single call on this task.
    const { data: logs } = await db.from("api_usage_log").select("billed_usd").eq("task_id", r.taskId);
    const rows = (logs ?? []).map((l) => Number(l.billed_usd));
    const billed = rows.reduce((s, n) => s + n, 0);
    const oneCall = Math.max(...rows);
    expect(billed).toBeCloseTo(r.billedUsd, 6);
    expect(billed).toBeLessThanOrEqual(TINY_CEILING + oneCall + 1e-6);
  });

  it("refuses a zero-credit user BEFORE any provider call (pre-flight on the ceiling)", async () => {
    const db = adminClient();
    expect(await getBalance(USER_B)).toBe(0);
    const id = await createInstance(USER_B, app.id, QUICK);
    const events: RunEvent[] = [];
    await expect(runAppInstance(id, { preview: true, onEvent: (e) => events.push(e) })).rejects.toBeInstanceOf(InsufficientCreditError);
    expect(events.some((e) => e.step === "agent.plan" || e.step === "agent.tool")).toBe(false);
    const { data: task } = await db.from("tasks").select("id, status").eq("app_instance_id", id).maybeSingle();
    expect(task?.status).toBe("blocked");
    const { data: logs } = await db.from("api_usage_log").select("id").eq("task_id", task!.id);
    expect(logs!.length).toBe(0);
  });
});
