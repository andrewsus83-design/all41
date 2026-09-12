import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { billedFromCost, computeCost, getPricing, type Usage } from "./cost";

export type CallKind = "llm" | "embedding" | "crawl" | "search" | "voice" | "graph_edge" | "benchmark";

export type UsageEntry = {
  userId: string | null;
  taskId?: string | null;
  provider: string;
  model: string;
  callKind?: CallKind;
  usage: Usage;
  latencyMs?: number;
  status?: "ok" | "error";
  error?: string;
  /** Override computed cost (e.g. provider reported exact cost). */
  costUsd?: number;
};

/**
 * Task 1.3 — logApiUsage. THE rule: this write happens before the result returns to the user.
 * If the write fails, the caller must fail the task (throw here, never swallow).
 */
export async function logApiUsage(e: UsageEntry) {
  const pricing = await getPricing();
  let costUsd: number;
  let rateSnapshot: Json = null;
  if (e.costUsd !== undefined) {
    costUsd = e.costUsd;
  } else {
    const c = await computeCost(e.provider, e.model, e.usage);
    costUsd = c.costUsd;
    rateSnapshot = c.rate as unknown as Json;
  }
  const billedUsd = billedFromCost(costUsd, pricing);
  const row = {
    user_id: e.userId,
    task_id: e.taskId ?? null,
    api_provider: e.provider,
    api_model: e.model,
    call_kind: e.callKind ?? "llm",
    input_tokens: e.usage.inputTokens ?? 0,
    output_tokens: e.usage.outputTokens ?? 0,
    api_credits: e.usage.apiCredits ?? 0,
    latency_ms: e.latencyMs ?? null,
    cost_usd: costUsd,
    rate_snapshot: rateSnapshot,
    markup: pricing.markup,
    platform_fee: pricing.platformFee,
    billed_usd: billedUsd,
    status: e.status ?? "ok",
    error: e.error ?? null,
  };
  const { data, error } = await adminClient().from("api_usage_log").insert(row).select("id").single();
  if (error) throw new Error(`USAGE_LOG_WRITE_FAILED: ${error.message}`);
  return { id: data.id as string, costUsd, billedUsd };
}
