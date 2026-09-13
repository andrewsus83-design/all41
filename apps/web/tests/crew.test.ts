/**
 * Professional CREW tier (docs/APP1_SEO_GEO_COMPLETE.md), live DB, mock providers.
 * Keys blanked → routing falls to the mock model + mock search/crawl/dataforseo/pagespeed tools:
 * the 8-agent crew, per-agent metering, parallelism, and the Verifier gate run for $0 real spend
 * (mock calls still cost credit through cost_rates, so metering is real).
 * Needs migration 20260913000001_crew_seo_geo.sql (the `seo-geo-optimizer` app).
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
process.env.DATAFORSEO_API_KEY = "";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { adminClient } from "@/lib/supabase/admin";
import { applyCredit, getBalance } from "@/lib/finance/ledger";
import { runAppInstance, describeWorkflow, autonomyLevel, type RunEvent, type WorkflowDef } from "@/lib/engine/apps";
import { CREWS } from "@/lib/engine/crew";
import type { Json } from "@/lib/supabase/database.types";

const USER_A = "11111111-1111-1111-1111-111111111111";

let appId: string;
let workflow: WorkflowDef;
const instances: string[] = [];

async function createInstance(config: Record<string, unknown>) {
  const { data, error } = await adminClient().from("user_app_instances")
    .insert({ user_id: USER_A, mini_app_id: appId, name: "crew test", config: config as Json, schedule: "once", output_target: "chat", status: "draft", next_run_at: null })
    .select("id").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  instances.push(data.id);
  return data.id as string;
}

const CONFIG = { site_url: "acme-candles.com", goal: "both", product_scope: "all of them", competitor_urls: "rival-candles.com", business: "handmade candles for gift shops", schedule: "Once", output_target: "Chat" };

describe("CREW — SEO/GEO 8-agent audit, metered, gated", () => {
  beforeAll(async () => {
    if ((await getBalance(USER_A)) < 1) await applyCredit(USER_A, "grant", 2, { note: "crew test top-up" });
    const { data } = await adminClient().from("mini_apps").select("id, workflow_def").eq("slug", "seo-geo-optimizer").maybeSingle();
    if (!data) throw new Error("seo-geo-optimizer missing — push 20260913000001_crew_seo_geo.sql first");
    appId = data.id as string;
    workflow = data.workflow_def as unknown as WorkflowDef;
  });

  afterAll(async () => {
    const db = adminClient();
    for (const id of instances) {
      const { data: tasks } = await db.from("tasks").select("id").eq("app_instance_id", id);
      for (const t of tasks ?? []) {
        await db.from("api_usage_log").delete().eq("task_id", t.id);
        await db.from("seo_runs").delete().eq("task_id", t.id);
      }
      await db.from("tasks").delete().eq("app_instance_id", id);
      await db.from("user_app_instances").delete().eq("id", id);
    }
  });

  it("classifies the app as Level 3 and describes it in plain words", () => {
    expect(autonomyLevel(workflow)).toBe(3);
    const steps = describeWorkflow(workflow, CONFIG);
    expect(steps.length).toBeGreaterThanOrEqual(4);
    // no infra/model terms leak into the plain-word description
    const text = steps.map((s) => s.label).join(" ").toLowerCase();
    expect(text).not.toMatch(/gemini|claude|dataforseo|serp|schema\.org|pgvector/);
  });

  it("runs all 8 specialists, meters each, writes an seo_runs trail, and gates the output", async () => {
    const id = await createInstance(CONFIG);
    const events: RunEvent[] = [];
    const { taskId, result } = await runAppInstance(id, { preview: true, onEvent: (e) => events.push(e) });
    const r = result as { output: Record<string, unknown>; crew?: { agents: unknown[]; seoRunId?: string }; verification?: { verdict: string }; schema: string };

    // the report shape
    expect(r.schema).toBe("seo_report");
    expect(r.output).toHaveProperty("health_score");
    expect(Array.isArray(r.output.quick_wins)).toBe(true);
    expect((r.output.quick_wins as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(r.output.geo)).toBe(true); // the differentiator layer is present

    // the crew trail — 8 agents' worth of specialists recorded
    const db = adminClient();
    const { data: run } = await db.from("seo_runs").select("id, status, health_score_seo, health_score_geo, report").eq("task_id", taskId).maybeSingle();
    expect(run?.status).toBe("done");
    expect(run?.report).toBeTruthy();
    const { data: stepRows } = await db.from("seo_run_steps").select("agent").eq("run_id", run!.id);
    const agents = new Set((stepRows ?? []).map((s) => s.agent));
    // crawler + technical + keyword + competitor + social + geo + prioritizer
    for (const a of ["crawler", "technical", "keyword", "competitor", "social", "geo", "prioritizer"]) expect(agents.has(a)).toBe(true);

    // every model call metered to api_usage_log before the result returned
    const { data: usage } = await db.from("api_usage_log").select("id, cost_usd").eq("task_id", taskId);
    expect((usage ?? []).length).toBeGreaterThanOrEqual(7);

    // the Verifier gate ran (verdict present, or a crew.gate event)
    const gate = events.find((e) => e.step === "crew.gate");
    expect(gate).toBeTruthy();
  }, 60_000);

  it("has the crew registered with 8 named agents", () => {
    expect(CREWS.seo_geo).toBeTruthy();
    expect(CREWS.seo_geo.agents.length).toBe(8);
  });
});
