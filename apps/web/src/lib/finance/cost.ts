import "server-only";
import { adminClient } from "@/lib/supabase/admin";

export type Rate = {
  api_provider: string;
  api_model: string;
  input_rate: number;
  output_rate: number;
  unit: "per_1m_tokens" | "per_call" | "per_page" | "per_1k_chars";
};

export type Usage = { inputTokens?: number; outputTokens?: number; apiCredits?: number };

let rateCache: { at: number; rates: Map<string, Rate> } | null = null;
const TTL = 5 * 60 * 1000;

export async function getRates(force = false): Promise<Map<string, Rate>> {
  if (!force && rateCache && Date.now() - rateCache.at < TTL) return rateCache.rates;
  const { data, error } = await adminClient().from("cost_rates").select("*");
  if (error) throw new Error(`cost_rates read failed: ${error.message}`);
  const rates = new Map<string, Rate>();
  for (const r of data as Array<Record<string, unknown>>) {
    rates.set(`${r.api_provider}:${r.api_model}`, {
      api_provider: String(r.api_provider),
      api_model: String(r.api_model),
      input_rate: Number(r.input_rate),
      output_rate: Number(r.output_rate),
      unit: r.unit as Rate["unit"],
    });
  }
  rateCache = { at: Date.now(), rates };
  return rates;
}

export async function getRate(provider: string, model: string): Promise<Rate | null> {
  const rates = await getRates();
  return rates.get(`${provider}:${model}`) ?? null;
}

/** Pure cost math — exported for tests. */
export function costFromRate(rate: Rate, usage: Usage): number {
  switch (rate.unit) {
    case "per_1m_tokens":
      return ((usage.inputTokens ?? 0) * rate.input_rate + (usage.outputTokens ?? 0) * rate.output_rate) / 1_000_000;
    case "per_1k_chars":
      return ((usage.inputTokens ?? 0) / 1000) * rate.input_rate;
    case "per_call":
    case "per_page":
      return (usage.apiCredits ?? 1) * rate.input_rate;
  }
}

/** Task 1.3: computeCost(provider, model, usage) reading from cost_rates. Unknown model → throws (never guess COGS). */
export async function computeCost(provider: string, model: string, usage: Usage) {
  const rate = await getRate(provider, model);
  if (!rate) throw new Error(`NO_RATE for ${provider}:${model} — add it to cost_rates before calling`);
  return { costUsd: costFromRate(rate, usage), rate };
}

// ---- pricing (COGS × markup + platform fee) ----
export type Pricing = { markup: number; platformFee: number; freeTierMaxCostUsd: number; fixedCostsDailyUsd: number };
let pricingCache: { at: number; p: Pricing } | null = null;

export async function getPricing(force = false): Promise<Pricing> {
  if (!force && pricingCache && Date.now() - pricingCache.at < TTL) return pricingCache.p;
  const { data } = await adminClient().from("platform_settings").select("key,value");
  const kv = new Map((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  const p: Pricing = {
    markup: Number(kv.get("markup") ?? 3.2),
    platformFee: Number(kv.get("platform_fee") ?? 0.06),
    freeTierMaxCostUsd: Number(kv.get("free_tier_max_cost_usd") ?? 0.02),
    fixedCostsDailyUsd: Number(kv.get("fixed_costs_daily_usd") ?? 2.0),
  };
  pricingCache = { at: Date.now(), p };
  return p;
}

export function billedFromCost(costUsd: number, p: Pricing) {
  return Math.round(costUsd * p.markup * (1 + p.platformFee) * 1e6) / 1e6;
}

/** Rough pre-flight estimate: chars/4 input tokens + expected output tokens at the model's rate. */
export async function estimateCost(provider: string, model: string, inputChars: number, expectedOutputTokens = 800) {
  const rate = await getRate(provider, model);
  const p = await getPricing();
  if (!rate) return { costUsd: 0.01, billedUsd: billedFromCost(0.01, p) };
  const costUsd = costFromRate(rate, { inputTokens: Math.ceil(inputChars / 4), outputTokens: expectedOutputTokens, apiCredits: 1 });
  return { costUsd, billedUsd: billedFromCost(costUsd, p) };
}
