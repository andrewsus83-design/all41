"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { SECRET_NAMES, setSecret, deleteSecret, getSecret, primeSecrets, type SecretName } from "@/lib/secrets";
import { callModel, testProviderKey } from "@/lib/ai/callModel";
import { getRoutingWeights } from "@/lib/ai/router";
import { getRates, getPricing, computeCost } from "@/lib/finance/cost";
import { splitModelId } from "@/lib/ai/types";
import { logApiUsage } from "@/lib/finance/usage";

type R = { ok: boolean; message: string; extra?: unknown };
const isSecret = (n: string): n is SecretName => (SECRET_NAMES as readonly string[]).includes(n);

export async function saveKeyAction(name: string, value: string): Promise<R> {
  await requireAdmin();
  if (!isSecret(name)) return { ok: false, message: "unknown secret" };
  if (!value.trim()) return { ok: false, message: "empty value" };
  await setSecret(name, value);
  revalidatePath("/admin");
  return { ok: true, message: "saved to vault" };
}

export async function removeKeyAction(name: string): Promise<R> {
  await requireAdmin();
  if (!isSecret(name)) return { ok: false, message: "unknown secret" };
  await deleteSecret(name);
  revalidatePath("/admin");
  return { ok: true, message: "removed" };
}

export async function testKeyAction(provider: string, value?: string): Promise<R> {
  await requireAdmin();
  await primeSecrets(true);
  const name = `${provider.toUpperCase()}_API_KEY`;
  const key = value?.trim() || getSecret(name);
  if (!key) return { ok: false, message: "no key to test" };
  const r = await testProviderKey(provider, key);
  return { ok: r.ok, message: r.detail, extra: r.models?.slice(0, 40) };
}

/** Runs one tiny metered call against a model (logged as benchmark, user_id null) and reports latency/cost. */
export async function testModelAction(modelId: string): Promise<R> {
  await requireAdmin();
  const { provider, model } = splitModelId(modelId);
  try {
    const out = await callModel({ model: modelId, messages: [{ role: "user", content: "Reply with the single word: ready" }], maxTokens: 20, temperature: 0 });
    let costUsd = 0;
    try { costUsd = (await computeCost(provider, model, out.usage)).costUsd; } catch { /* no rate row */ }
    await logApiUsage({ userId: null, provider, model, callKind: "benchmark", usage: out.usage, latencyMs: out.latencyMs, costUsd });
    return { ok: true, message: `"${out.text.trim().slice(0, 40)}" · ${out.latencyMs} ms · ${out.usage.inputTokens}/${out.usage.outputTokens} tok · $${costUsd.toFixed(6)}${costUsd === 0 && provider !== "mock" ? " (no cost_rates row!)" : ""}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function upsertRouteAction(taskType: string, model: string, weight: number, isLeader: boolean): Promise<R> {
  await requireAdmin();
  const db = adminClient();
  if (!/^[a-z_]+$/.test(taskType) || !model.includes(":")) return { ok: false, message: "task_type a-z_ and model as provider:model" };
  if (isLeader) await db.from("routing_weights").update({ is_leader: false }).eq("task_type", taskType);
  const { error } = await db.from("routing_weights").upsert({ task_type: taskType, model, weight, is_leader: isLeader, updated_at: new Date().toISOString() }, { onConflict: "task_type,model" });
  if (error) return { ok: false, message: error.message };
  await getRoutingWeights(true);
  revalidatePath("/admin");
  return { ok: true, message: "route saved" };
}

export async function deleteRouteAction(taskType: string, model: string): Promise<R> {
  await requireAdmin();
  const { error } = await adminClient().from("routing_weights").delete().eq("task_type", taskType).eq("model", model);
  if (error) return { ok: false, message: error.message };
  await getRoutingWeights(true);
  revalidatePath("/admin");
  return { ok: true, message: "deleted" };
}

export async function upsertRateAction(provider: string, model: string, inputRate: number, outputRate: number, unit: string): Promise<R> {
  await requireAdmin();
  const { error } = await adminClient().from("cost_rates").upsert({ api_provider: provider, api_model: model, input_rate: inputRate, output_rate: outputRate, unit, source: "manual", updated_at: new Date().toISOString() }, { onConflict: "api_provider,api_model" });
  if (error) return { ok: false, message: error.message };
  await getRates(true);
  revalidatePath("/admin");
  return { ok: true, message: "rate saved" };
}

export async function deleteRateAction(provider: string, model: string): Promise<R> {
  await requireAdmin();
  const { error } = await adminClient().from("cost_rates").delete().eq("api_provider", provider).eq("api_model", model);
  if (error) return { ok: false, message: error.message };
  await getRates(true);
  revalidatePath("/admin");
  return { ok: true, message: "deleted" };
}

export async function saveSettingAction(key: string, value: number): Promise<R> {
  await requireAdmin();
  if (!["markup", "platform_fee", "margin_floor", "fixed_costs_daily_usd", "free_tier_max_cost_usd"].includes(key)) return { ok: false, message: "unknown setting" };
  const { error } = await adminClient().from("platform_settings").upsert({ key, value: value as unknown as never, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: error.message };
  await getPricing(true);
  revalidatePath("/admin");
  return { ok: true, message: "setting saved" };
}
