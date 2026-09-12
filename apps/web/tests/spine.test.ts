/** Task 1.5 — the milestone: checkBalance → call → log → deduct, reconciling to the penny (live DB, mock provider). */
import { describe, it, expect, beforeAll } from "vitest";
import { adminClient } from "@/lib/supabase/admin";
import { applyCredit, getBalance, InsufficientCreditError } from "@/lib/finance/ledger";
import { createTask, runTask, type StepEvent } from "@/lib/engine/run";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

describe("financial spine loop", () => {
  beforeAll(async () => {
    // make sure A has some credit, B has none
    const a = await getBalance(USER_A);
    if (a < 0.5) await applyCredit(USER_A, "grant", 1, { note: "test top-up" });
  });

  it("runs a task through balance-check → call → log → deduct and reconciles", async () => {
    const db = adminClient();
    const before = await getBalance(USER_A);
    const { taskId } = await createTask(USER_A, {
      what: "Compare Jasper AI pricing tiers to ours", what_format: "answer",
      goal: "Decide whether to lower our Pro price", condition: { constraints: "focus on monthly plans" }, execute: { confirmed: true },
    });
    const events: StepEvent[] = [];
    const result = await runTask(taskId, (e) => events.push(e));
    expect(result.output).toBeTruthy();
    expect(result.modelsUsed.length).toBeGreaterThan(0);

    const { data: logs } = await db.from("api_usage_log").select("cost_usd,billed_usd,status").eq("task_id", taskId);
    expect(logs!.length).toBeGreaterThan(0);
    const billedTotal = logs!.reduce((s, r) => s + Number(r.billed_usd), 0);
    expect(Number(logs![0].cost_usd)).toBeGreaterThan(0);

    const { data: ledger } = await db.from("credit_ledger").select("amount_usd,type").eq("task_id", taskId);
    const deducted = ledger!.filter((r) => r.type === "deduct").reduce((s, r) => s + Number(r.amount_usd), 0);
    expect(deducted).toBeCloseTo(billedTotal, 6);

    const after = await getBalance(USER_A);
    expect(before - after).toBeCloseTo(deducted, 6);

    const { data: task } = await db.from("tasks").select("status,total_billed,models_used").eq("id", taskId).single();
    expect(task!.status).toBe("done");
    expect(Number(task!.total_billed)).toBeCloseTo(billedTotal, 6);
    expect(events.some((e) => e.step === "done")).toBe(true);
  });

  it("blocks a task with insufficient balance BEFORE any provider call", async () => {
    const db = adminClient();
    const balB = await getBalance(USER_B);
    expect(balB).toBe(0);
    const { taskId } = await createTask(USER_B, { what: "Write a launch tweet thread", goal: "Announce the product", condition: {}, execute: { confirmed: true } });
    await expect(runTask(taskId)).rejects.toBeInstanceOf(InsufficientCreditError);
    const { data: logs } = await db.from("api_usage_log").select("id").eq("task_id", taskId);
    expect(logs!.length).toBe(0);
    const { data: task } = await db.from("tasks").select("status").eq("id", taskId).single();
    expect(task!.status).toBe("blocked");
  });
});
