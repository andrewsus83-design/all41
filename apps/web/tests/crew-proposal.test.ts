/**
 * App #2 — Proposal / RFP Maker crew (Shipley + MBB), live DB, mock providers.
 * Keys blanked → the 7-agent crew (Shredder, Capture, Win-Theme, Writer, Consultant Editor,
 * Compliance loop, Verifier) runs for $0 real spend; per-agent metering + proposal_run_steps trail are real.
 * Needs migration 20260913000005_crew_proposal.sql (the `proposal-rfp-maker` app).
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
import { applyCredit, getBalance } from "@/lib/finance/ledger";
import { runAppInstance, autonomyLevel, type RunEvent, type WorkflowDef } from "@/lib/engine/apps";
import { CREWS } from "@/lib/engine/crew";
import type { Json } from "@/lib/supabase/database.types";

const USER_A = "11111111-1111-1111-1111-111111111111";
let appId: string;
let workflow: WorkflowDef;
const instances: string[] = [];

async function createInstance(config: Record<string, unknown>) {
  const { data, error } = await adminClient().from("user_app_instances")
    .insert({ user_id: USER_A, mini_app_id: appId, name: "proposal test", config: config as Json, schedule: "once", output_target: "chat", status: "draft", next_run_at: null })
    .select("id").single();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  instances.push(data.id);
  return data.id as string;
}

const RFP = "Section L: Submit a technical volume, max 20 pages. Section M: Past performance weighted 40%. SOW: Deliver a 90-day implementation with weekly reporting.";
const CONFIG = { rfp_text: RFP, bidder: "Northwind Consulting", tone: "commercial", emphasis: "on-time delivery", deadline: "2026-10-15", schedule: "Once", output_target: "Chat" };

describe("CREW — Proposal / RFP Maker, Shipley loop, metered, gated", () => {
  beforeAll(async () => {
    if ((await getBalance(USER_A)) < 2) await applyCredit(USER_A, "grant", 3, { note: "proposal test top-up" });
    const { data } = await adminClient().from("mini_apps").select("id, workflow_def").eq("slug", "proposal-rfp-maker").maybeSingle();
    if (!data) throw new Error("proposal-rfp-maker missing — push 20260913000005_crew_proposal.sql first");
    appId = data.id as string;
    workflow = data.workflow_def as unknown as WorkflowDef;
  });

  afterAll(async () => {
    const db = adminClient();
    for (const id of instances) {
      const { data: tasks } = await db.from("tasks").select("id").eq("app_instance_id", id);
      for (const t of tasks ?? []) { await db.from("api_usage_log").delete().eq("task_id", t.id); await db.from("proposal_runs").delete().eq("task_id", t.id); }
      await db.from("tasks").delete().eq("app_instance_id", id);
      await db.from("user_app_instances").delete().eq("id", id);
    }
  });

  it("is registered as a 7-agent Level-3 crew", () => {
    expect(autonomyLevel(workflow)).toBe(3);
    expect(CREWS.proposal).toBeTruthy();
    expect(CREWS.proposal.agents.length).toBe(7);
    expect(CREWS.proposal.stepsTable).toBe("proposal_run_steps");
  });

  it("shreds the RFP, loops writer↔compliance, writes a proposal_runs trail, and gates the output", async () => {
    const id = await createInstance(CONFIG);
    const events: RunEvent[] = [];
    const { taskId, result } = await runAppInstance(id, { preview: true, onEvent: (e) => events.push(e) });
    const r = result as { output: Record<string, unknown>; schema: string; crew?: { seoRunId?: string } };

    expect(r.schema).toBe("proposal_report");
    expect(r.output).toHaveProperty("compliance_matrix");
    expect(r.output).toHaveProperty("executive_summary");
    expect(Array.isArray(r.output.proposal_sections)).toBe(true);
    expect(Array.isArray(r.output.win_themes)).toBe(true);

    const db = adminClient();
    const { data: run } = await db.from("proposal_runs").select("id, status, proposal").eq("task_id", taskId).maybeSingle();
    expect(run?.status).toBe("done");
    const { data: stepRows } = await db.from("proposal_run_steps").select("agent").eq("run_id", run!.id);
    const agents = new Set((stepRows ?? []).map((s) => s.agent));
    for (const a of ["shredder", "capture", "winthemes", "writer", "editor", "compliance"]) expect(agents.has(a)).toBe(true);

    // every call metered before returning (7+ agents incl. the compliance loop)
    const { data: usage } = await db.from("api_usage_log").select("id").eq("task_id", taskId);
    expect((usage ?? []).length).toBeGreaterThanOrEqual(6);

    // the Verifier gate ran
    expect(events.find((e) => e.step === "crew.gate")).toBeTruthy();
  }, 60_000);
});
