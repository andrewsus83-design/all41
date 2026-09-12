import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { callModel } from "@/lib/ai/callModel";
import { routeTask } from "@/lib/ai/router";
import { heuristicIntent, INTENT_SCHEMA, CLASSIFY_SYSTEM, type Intent } from "@/lib/ai/classify";
import { splitModelId, type ChatMessage } from "@/lib/ai/types";
import { metered } from "@/lib/finance/metered";
import { estimateCost, getBalance, InsufficientCreditError } from "@/lib/finance";
import { BriefingSchema, briefingToUserPrompt } from "./briefing";
import { OUTPUT_SCHEMAS, type OutputSchemaKey } from "./schemas";
import { fetchGrounding, groundingToContext, ingestToGraph } from "./grounding";
import { verifyOutput, type Verification } from "./verify";
import type { Json } from "@/lib/supabase/database.types";

export type StepEvent =
  | { step: "classify"; intent: Intent; model: string }
  | { step: "route"; taskType: string; model: string; isMock: boolean }
  | { step: "ground"; chunks: number; tokens: number; engine: string }
  | { step: "execute"; model: string; costUsd: number; billedUsd: number; balanceAfter: number }
  | { step: "verify"; verdict: string; conflicts: number }
  | { step: "done"; totalBilled: number; balance: number }
  | { step: "blocked"; message: string }
  | { step: "error"; message: string };

export type TaskResult = {
  output: unknown;
  schema: OutputSchemaKey;
  taskType: string;
  modelsUsed: string[];
  grounding: { chunks: number; tokens: number; engine: string };
  verification?: Verification;
  isMock: boolean;
};

/** Create a task row from a validated briefing (Task 2.3 → stored structured object). */
export async function createTask(userId: string, briefingInput: unknown, opts: { appInstanceId?: string | null; taskType?: string } = {}) {
  const briefing = BriefingSchema.parse(briefingInput);
  const { data, error } = await adminClient()
    .from("tasks")
    .insert({ user_id: userId, briefing: briefing as unknown as Json, status: "queued", app_instance_id: opts.appInstanceId ?? null, task_type: opts.taskType ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { taskId: data.id as string, briefing };
}

/** Task 2.2 — closed-set classification via the cheapest capable model (metered), heuristic when mock. */
export async function classifyIntent(userId: string, taskId: string, text: string): Promise<{ intent: Intent; model: string; billedUsd: number }> {
  const { modelId, isMock } = await routeTask("classify");
  if (isMock) return { intent: heuristicIntent(text), model: "heuristic", billedUsd: 0 };
  const { provider, model } = splitModelId(modelId);
  const messages: ChatMessage[] = [{ role: "system", content: CLASSIFY_SYSTEM }, { role: "user", content: text.slice(0, 2000) }];
  const est = await estimateCost(provider, model, text.length + CLASSIFY_SYSTEM.length, 30);
  const r = await metered({
    userId, taskId, provider, model, callKind: "llm", estimatedBilledUsd: est.billedUsd,
    call: async () => {
      const out = await callModel({ model: modelId, messages, jsonSchema: INTENT_SCHEMA, temperature: 0, maxTokens: 50 });
      return { result: out, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.reportedCostUsd };
    },
  });
  const j = r.result.json as { intent?: string } | undefined;
  const intent = (j?.intent && (["research", "content", "synthesis", "reasoning", "code", "summarize"] as string[]).includes(j.intent) ? j.intent : heuristicIntent(text)) as Intent;
  return { intent, model: modelId, billedUsd: r.billedUsd };
}

const SYSTEM = `You are all41, a sharp work engine for solo operators. You answer ONLY from the provided CONTEXT plus clearly-labelled general knowledge.
Rules: cite every factual claim with a source ref like S1/S2 from the context (or "general" if none); never invent numbers; if context is missing, say so in gaps; be concrete and decision-oriented; respond with JSON matching the schema.`;

/**
 * The full loop (Tasks 1.5 + 2.1 + 2.2 + 2.7 + 2.8):
 * classify → route → ground → checkBalance → call → log → deduct → (verify) → store.
 */
export async function runTask(taskId: string, onEvent?: (e: StepEvent) => void): Promise<TaskResult> {
  const db = adminClient();
  const { data: task, error } = await db.from("tasks").select("*").eq("id", taskId).single();
  if (error || !task) throw new Error("TASK_NOT_FOUND");
  const userId = task.user_id;
  const briefing = BriefingSchema.parse(task.briefing);
  const emit = (e: StepEvent) => onEvent?.(e);
  const modelsUsed: string[] = [];
  let totalBilled = 0;
  let totalCost = 0;

  await db.from("tasks").update({ status: "running" }).eq("id", taskId);
  try {
    // 1) classify
    const userPrompt = briefingToUserPrompt(briefing);
    let taskType = task.task_type ?? "";
    if (!taskType) {
      const c = await classifyIntent(userId, taskId, `${briefing.what}\n${briefing.goal}`);
      taskType = c.intent;
      totalBilled += c.billedUsd;
      if (c.model !== "heuristic") modelsUsed.push(c.model);
      emit({ step: "classify", intent: c.intent, model: c.model });
    }

    // 2) route
    const { modelId, isMock } = await routeTask(taskType);
    const { provider, model } = splitModelId(modelId);
    emit({ step: "route", taskType, model: modelId, isMock });

    // 3) ground (graph engine, token-capped)
    const grounding = briefing.execute.use_context ? await fetchGrounding(userId, `${briefing.what} ${briefing.goal}`) : { chunks: [], tokenCount: 0, engine: "none" as const };
    const context = groundingToContext(grounding);
    emit({ step: "ground", chunks: grounding.chunks.length, tokens: grounding.tokenCount, engine: grounding.engine });

    // 4) execute (metered: checkBalance → call → log → deduct)
    const schemaKey: OutputSchemaKey = briefing.what_format === "report" ? "report" : "answer";
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content: `CONTEXT:\n${context}\n\nBRIEFING:\n${userPrompt}` },
    ];
    const est = await estimateCost(provider, model, messages.reduce((n, m) => n + m.content.length, 0), 1200);
    const exec = await metered({
      userId, taskId, provider, model, callKind: "llm", estimatedBilledUsd: est.billedUsd,
      call: async () => {
        const out = await callModel({ model: modelId, messages, jsonSchema: OUTPUT_SCHEMAS[schemaKey], maxTokens: 2000 });
        return { result: out, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.reportedCostUsd };
      },
    });
    modelsUsed.push(modelId);
    totalBilled += exec.billedUsd;
    totalCost += exec.costUsd;
    emit({ step: "execute", model: modelId, costUsd: exec.costUsd, billedUsd: exec.billedUsd, balanceAfter: exec.balanceAfter });
    const output = exec.result.json ?? { title: "Result", answer: exec.result.text, key_points: [], next_action: "", sources: [], confidence: 0.5, gaps: ["unstructured output"] };

    // 5) verify (high-stakes only)
    let verification: Verification | undefined;
    if (briefing.condition.high_stakes && grounding.chunks.length > 0) {
      verification = await verifyOutput({ userId, taskId, output, context });
      modelsUsed.push(verification.model);
      emit({ step: "verify", verdict: verification.verdict, conflicts: verification.conflicts.length });
    }

    const result: TaskResult = {
      output, schema: schemaKey, taskType, modelsUsed,
      grounding: { chunks: grounding.chunks.length, tokens: grounding.tokenCount, engine: grounding.engine },
      verification, isMock,
    };
    const balance = await getBalance(userId);
    await db.from("tasks").update({
      status: "done", result: result as unknown as Json, task_type: taskType, models_used: modelsUsed,
      total_cost: totalCost, total_billed: totalBilled, completed_at: new Date().toISOString(),
    }).eq("id", taskId);
    emit({ step: "done", totalBilled, balance });

    // 6) feed the output back into the graph (task_output nodes → derived_from edges) — fire and forget
    const o = output as { title?: string; answer?: string; summary?: string };
    void ingestToGraph({
      user_id: userId, source_type: "task", source_id: taskId, task_id: taskId, node_type: "task_output",
      title: o.title ?? briefing.what.slice(0, 80), content: JSON.stringify(output).slice(0, 12000),
    });
    return result;
  } catch (err) {
    if (err instanceof InsufficientCreditError) {
      await db.from("tasks").update({ status: "blocked", error: "INSUFFICIENT_CREDIT" }).eq("id", taskId);
      emit({ step: "blocked", message: `Not enough credit (balance $${err.balance.toFixed(2)}, needs ~$${err.needed.toFixed(4)}). Top up to continue.` });
      throw err;
    }
    await db.from("tasks").update({ status: "failed", error: String(err).slice(0, 500) }).eq("id", taskId);
    emit({ step: "error", message: String(err) });
    throw err;
  }
}
