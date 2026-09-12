import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { hasProviderKey } from "@/lib/env";
import { splitModelId, type TaskType } from "./types";

let cache: { at: number; rows: Array<{ task_type: string; model: string; weight: number; is_leader: boolean }> } | null = null;

export async function getRoutingWeights(force = false) {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.rows;
  const { data, error } = await adminClient().from("routing_weights").select("task_type,model,weight,is_leader");
  if (error) throw new Error(error.message);
  cache = { at: Date.now(), rows: (data ?? []).map((r) => ({ ...r, weight: Number(r.weight) })) };
  return cache.rows;
}

/**
 * Task 2.1 — routeTask(taskType): the leader for the category, else highest weight.
 * If the chosen provider has no key configured, falls back to the mock provider (dev mode) so the loop still runs.
 */
export async function routeTask(taskType: TaskType | string): Promise<{ modelId: string; isMock: boolean }> {
  const rows = (await getRoutingWeights()).filter((r) => r.task_type === taskType);
  const pick = rows.find((r) => r.is_leader) ?? [...rows].sort((a, b) => b.weight - a.weight)[0];
  const modelId = pick?.model ?? "openrouter:openai/gpt-5-mini";
  const { provider } = splitModelId(modelId);
  if (provider === "openrouter" && !hasProviderKey("openrouter")) return { modelId: "mock:mock-model", isMock: true };
  return { modelId, isMock: provider === "mock" };
}
