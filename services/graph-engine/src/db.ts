import { createClient } from '@supabase/supabase-js';
import type { Database } from './db/database.types.js';
import { HttpError } from './errors.js';
import { priceCall, round6, type Rate, type Settings } from './pricing.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

/** Service-role client. Bypasses RLS — every query MUST scope by user_id explicitly. */
export const admin = createClient<Database>(url, key, { auth: { persistSession: false } });

export type CallKind = 'embedding' | 'graph_edge';
export type { Rate, Settings };

// --- cached config (60s) ---------------------------------------------------
const TTL = 60_000;
let settingsCache: { at: number; value: Settings } | null = null;
const rateCache = new Map<string, { at: number; value: Rate }>();

export async function getSettings(): Promise<Settings> {
  if (settingsCache && Date.now() - settingsCache.at < TTL) return settingsCache.value;
  const { data, error } = await admin.from('platform_settings').select('key,value').in('key', ['markup', 'platform_fee']);
  if (error) throw new HttpError(500, `SETTINGS_READ_FAILED: ${error.message}`);
  const get = (k: string, fallback: number) => {
    const row = data?.find((r) => r.key === k);
    return row ? Number(row.value) : fallback;
  };
  const value = { markup: get('markup', 3.2), platform_fee: get('platform_fee', 0.06) };
  settingsCache = { at: Date.now(), value };
  return value;
}

/** Rate from cost_rates. Missing rows for provider 'mock' price at 0 (so dev works before the seed row lands); missing real rows fail. */
export async function getRate(provider: string, model: string): Promise<Rate> {
  const ck = `${provider}/${model}`;
  const hit = rateCache.get(ck);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const { data, error } = await admin
    .from('cost_rates').select('input_rate,output_rate,unit')
    .eq('api_provider', provider).eq('api_model', model).maybeSingle();
  if (error) throw new HttpError(500, `RATE_READ_FAILED: ${error.message}`);
  let value: Rate;
  if (data) value = { input_rate: Number(data.input_rate), output_rate: Number(data.output_rate), unit: data.unit };
  else if (provider === 'mock') value = { input_rate: 0, output_rate: 0, unit: 'per_1m_tokens' };
  else throw new HttpError(500, `NO_RATE for ${ck} in cost_rates`);
  rateCache.set(ck, { at: Date.now(), value });
  return value;
}


// --- metering --------------------------------------------------------------
export type MeterInput = {
  user_id: string;
  task_id?: string | null;
  provider: string;
  model: string;
  call_kind: CallKind;
  input_tokens: number;
  output_tokens?: number;
  latency_ms?: number;
  note?: string;
};
export type Metered = { cost_usd: number; billed_usd: number };

/** Cheap preflight before a *paid* provider call: refuse when the user has no credit at all. */
export async function assertHasCredit(user_id: string) {
  const { data, error } = await admin.rpc('credit_balance', { p_user_id: user_id });
  if (error) throw new HttpError(500, `BALANCE_READ_FAILED: ${error.message}`);
  if (Number(data) <= 0) throw new HttpError(402, 'INSUFFICIENT_CREDIT', { balance: Number(data) });
}

/**
 * Logs one provider call to api_usage_log (financial source of truth) and deducts billed_usd
 * from the user's credit via credit_apply. Log-write failure fails the request. billed 0 → no deduction.
 */
export async function meterAndDeduct(m: MeterInput): Promise<Metered> {
  const [rate, settings] = await Promise.all([getRate(m.provider, m.model), getSettings()]);
  const out = m.output_tokens ?? 0;
  const { cost_usd, billed_usd } = priceCall(rate, m.input_tokens, out, settings);
  const { data: row, error } = await admin.from('api_usage_log').insert({
    user_id: m.user_id,
    task_id: m.task_id ?? null,
    api_provider: m.provider,
    api_model: m.model,
    call_kind: m.call_kind,
    input_tokens: m.input_tokens,
    output_tokens: out,
    latency_ms: m.latency_ms ?? null,
    cost_usd,
    rate_snapshot: { ...rate, unit: rate.unit },
    markup: settings.markup,
    platform_fee: settings.platform_fee,
    billed_usd,
    status: 'ok',
  }).select('id').single();
  if (error || !row) throw new HttpError(500, `USAGE_LOG_FAILED: ${error?.message ?? 'no row'}`);

  if (billed_usd > 0) {
    const { error: dErr } = await admin.rpc('credit_apply', {
      p_user_id: m.user_id, p_type: 'deduct', p_amount: billed_usd,
      p_note: m.note ?? `graph-engine ${m.call_kind} ${m.provider}/${m.model}`,
    });
    if (dErr) {
      await admin.from('api_usage_log').update({ status: 'error', error: dErr.message }).eq('id', row.id);
      const insufficient = dErr.message.includes('INSUFFICIENT_CREDIT');
      throw new HttpError(insufficient ? 402 : 500, insufficient ? 'INSUFFICIENT_CREDIT' : `CREDIT_DEDUCT_FAILED: ${dErr.message}`);
    }
  }
  return { cost_usd, billed_usd };
}

export const sumMetered = (a: Metered, b: Metered): Metered =>
  ({ cost_usd: round6(a.cost_usd + b.cost_usd), billed_usd: round6(a.billed_usd + b.billed_usd) });
export const ZERO: Metered = { cost_usd: 0, billed_usd: 0 };
