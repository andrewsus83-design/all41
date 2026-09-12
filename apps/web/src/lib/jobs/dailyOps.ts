import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getRoutingWeights } from "@/lib/ai/router";
import { splitModelId } from "@/lib/ai/types";
import { getPricing, getRates } from "@/lib/finance/cost";
import { getProviderKey } from "@/lib/env";
import { sendTelegram, escapeHtml } from "@/lib/telegram";
import { computePnl, rollupDailyPnl, utcDateString, utcDayRange, yesterdayUtc, type PnlResult, type UsageRow } from "./pnl";
import { runBenchmark, type BenchmarkSummary } from "./benchmark";
import { ALERT_THRESHOLDS } from "./alerts";

/**
 * Task 4.4 — the 05:00 Asia/Jakarta (22:00 UTC) morning routine, as individual step functions so both
 * the Inngest function (step.run per step) and the plain Vercel-Cron path (`runDailyOps`) share one implementation.
 * Every step tolerates missing keys and returns a JSON-serialisable result.
 */

// ---------- (a) scrapePricing ----------
export type PricingScrapeResult = { updated: string[]; missing: string[]; skipped?: string; fetchedModels?: number };

export async function scrapePricing(): Promise<PricingScrapeResult> {
  const weights = await getRoutingWeights(true);
  const wanted = new Set(weights.map((w) => splitModelId(w.model)).filter((m) => m.provider === "openrouter").map((m) => m.model));
  if (!wanted.size) return { updated: [], missing: [] };
  let list: Array<{ id: string; pricing?: { prompt?: string | number; completion?: string | number } }>;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return { updated: [], missing: [...wanted], skipped: `openrouter models ${res.status}` };
    list = (await res.json()).data ?? [];
  } catch (err) {
    return { updated: [], missing: [...wanted], skipped: `fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  const byId = new Map(list.map((m) => [m.id, m]));
  const updated: string[] = [];
  const missing: string[] = [];
  const db = adminClient();
  for (const model of wanted) {
    const m = byId.get(model);
    const prompt = Number(m?.pricing?.prompt);
    const completion = Number(m?.pricing?.completion);
    if (!m || !Number.isFinite(prompt) || !Number.isFinite(completion)) { missing.push(model); continue; }
    const { error } = await db.from("cost_rates").upsert(
      { api_provider: "openrouter", api_model: model, input_rate: round8(prompt * 1e6), output_rate: round8(completion * 1e6), unit: "per_1m_tokens", source: "scrape", updated_at: new Date().toISOString() },
      { onConflict: "api_provider,api_model" },
    );
    if (error) missing.push(`${model} (${error.message})`);
    else updated.push(model);
  }
  await getRates(true); // refresh the in-process cache
  return { updated, missing, fetchedModels: list.length };
}

// ---------- (b) recalcMarkup ----------
export type MarkupResult = { date: string; grossMargin: number | null; marginFloor: number; markupBefore: number; markupAfter: number; raised: boolean; alert?: string };

export async function recalcMarkup(date = yesterdayUtc()): Promise<MarkupResult> {
  const db = adminClient();
  const { start, end } = utcDayRange(date);
  const { data, error } = await db.from("api_usage_log").select("task_id,user_id,api_provider,cost_usd,billed_usd").gte("created_at", start).lt("created_at", end);
  if (error) throw new Error(`api_usage_log read failed: ${error.message}`);
  const { data: settings } = await db.from("platform_settings").select("key,value").in("key", ["markup", "margin_floor"]);
  const kv = new Map((settings ?? []).map((r) => [r.key, r.value]));
  const markupBefore = Number(kv.get("markup") ?? 3.2);
  const marginFloor = Number(kv.get("margin_floor") ?? ALERT_THRESHOLDS.marginFloor);
  const pnl = computePnl((data ?? []) as UsageRow[], 0);
  const grossMargin = pnl.gross_margin;
  const out: MarkupResult = { date, grossMargin, marginFloor, markupBefore, markupAfter: markupBefore, raised: false };
  if (grossMargin !== null && pnl.total_revenue > 0 && grossMargin < marginFloor) {
    const markupAfter = Math.min(5.0, Math.round((markupBefore + 0.2) * 100) / 100);
    if (markupAfter > markupBefore) {
      const { error: upErr } = await db.from("platform_settings").upsert({ key: "markup", value: markupAfter, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (upErr) throw new Error(`platform_settings markup update failed: ${upErr.message}`);
      await getPricing(true);
      out.markupAfter = markupAfter;
      out.raised = true;
      out.alert = `Margin ${(grossMargin * 100).toFixed(1)}% on ${date} < floor ${(marginFloor * 100).toFixed(0)}% — markup raised ${markupBefore}× → ${markupAfter}×`;
    } else {
      out.alert = `Margin ${(grossMargin * 100).toFixed(1)}% on ${date} < floor but markup already at cap ${markupBefore}×`;
    }
  }
  return out;
}

// ---------- (c) checkProviderBalances ----------
export type ProviderBalances = Record<string, { remainingUsd?: number; totalCredits?: number; totalUsage?: number; note?: string }>;

export async function checkProviderBalances(): Promise<ProviderBalances> {
  const out: ProviderBalances = {};
  const key = getProviderKey("openrouter");
  if (!key) {
    out.openrouter = { note: "no key" };
    return out;
  }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/credits", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) { out.openrouter = { note: `credits ${res.status}` }; return out; }
    const d = (await res.json()).data ?? {};
    const totalCredits = Number(d.total_credits ?? 0);
    const totalUsage = Number(d.total_usage ?? 0);
    out.openrouter = { totalCredits, totalUsage, remainingUsd: Math.round((totalCredits - totalUsage) * 100) / 100 };
  } catch (err) {
    out.openrouter = { note: `fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  return out;
}

// ---------- (d) pnlRollup ----------
export type PnlStepResult = { yesterday: PnlResult & { date: string }; today: PnlResult & { date: string } };

/** Final roll-up of yesterday + a refreshable partial row for today (so dashboards always have "so far"). */
export async function pnlRollup(date = yesterdayUtc()): Promise<PnlStepResult> {
  const yesterday = await rollupDailyPnl(date);
  const today = await rollupDailyPnl(utcDateString());
  return { yesterday, today };
}

// ---------- (f) digest ----------
export type DailyOpsReport = {
  ranAt: string;
  date: string;
  pricing?: PricingScrapeResult;
  markup?: MarkupResult;
  balances?: ProviderBalances;
  pnl?: PnlStepResult;
  benchmark?: BenchmarkSummary;
  alerts: string[];
  stepErrors: Record<string, string>;
  digest?: { sent: boolean; reason?: string; text: string };
};

const usd = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number | null) => (n === null ? "n/a" : `${(n * 100).toFixed(1)}%`);

export function formatDigest(r: DailyOpsReport): string {
  const y = r.pnl?.yesterday;
  const lines: string[] = [`<b>all41 daily ops — ${escapeHtml(r.date)}</b>`];
  if (y) {
    lines.push(
      "",
      `<b>P&amp;L (${escapeHtml(y.date)})</b>`,
      `Revenue ${usd(y.total_revenue)} · COGS ${usd(y.total_cogs)}`,
      `Gross ${usd(y.gross_profit)} (${pct(y.gross_margin)}) · Net ${usd(y.net_profit)} (${pct(y.net_margin)})`,
      `Fixed ${usd(y.fixed_costs)} · Tasks ${y.tasks} · Users ${y.users}`,
    );
    const prov = Object.entries(y.by_provider).sort((a, b) => b[1].cogs - a[1].cogs).slice(0, 5);
    if (prov.length) lines.push("By provider: " + prov.map(([p, v]) => `${escapeHtml(p)} ${usd(v.cogs)} (${v.calls})`).join(", "));
  } else {
    lines.push("", "P&amp;L: not generated");
  }
  if (r.markup) {
    lines.push("", `<b>Markup</b> ${r.markup.markupAfter}×${r.markup.raised ? ` (raised from ${r.markup.markupBefore}×)` : ""} · margin ${pct(r.markup.grossMargin)} vs floor ${pct(r.markup.marginFloor)}`);
  }
  if (r.pricing) {
    lines.push(`<b>Rates</b> ${r.pricing.updated.length} refreshed${r.pricing.missing.length ? `, ${r.pricing.missing.length} missing` : ""}${r.pricing.skipped ? ` (${escapeHtml(r.pricing.skipped)})` : ""}`);
  }
  if (r.balances) {
    const b = Object.entries(r.balances).map(([p, v]) => `${escapeHtml(p)}: ${v.remainingUsd !== undefined ? usd(v.remainingUsd) + " left" : escapeHtml(v.note ?? "?")}`);
    lines.push(`<b>Provider balances</b> ${b.join(" · ")}`);
  }
  if (r.benchmark) {
    lines.push("", `<b>Benchmark leaders</b>${r.benchmark.mock ? " (mock — no OPENROUTER_API_KEY)" : ""}`);
    for (const l of r.benchmark.leaders) lines.push(`• ${escapeHtml(l.task_type)} → ${escapeHtml(l.model)} ${l.score.toFixed(1)}/10 @ ${l.cost_per_run.toFixed(4)}`);
    if (r.benchmark.errors.length) lines.push(`${r.benchmark.errors.length} benchmark call error(s)`);
  }
  lines.push("", r.alerts.length ? `<b>⚠️ Alerts (${r.alerts.length})</b>\n` + r.alerts.map((a) => `• ${escapeHtml(a)}`).join("\n") : "✅ No alerts");
  const errs = Object.entries(r.stepErrors);
  if (errs.length) lines.push("", `<b>Step errors</b>\n` + errs.map(([k, v]) => `• ${escapeHtml(k)}: ${escapeHtml(v.slice(0, 200))}`).join("\n"));
  return lines.join("\n");
}

export async function sendDigest(report: DailyOpsReport): Promise<DailyOpsReport["digest"]> {
  const text = formatDigest(report);
  const r = await sendTelegram(text);
  return { sent: r.sent, reason: r.reason, text };
}

// ---------- orchestration (shared by Inngest + Vercel Cron) ----------
export type StepRunner = <T>(name: string, fn: () => Promise<T>) => Promise<T>;

/**
 * Runs the six steps in plan order with a pluggable step wrapper (Inngest's `step.run` or a plain passthrough).
 * Individual step failures are recorded in `stepErrors` and never abort the chain.
 */
export async function runDailyOpsWith(run: StepRunner, opts: { date?: string; skipBenchmark?: boolean } = {}): Promise<DailyOpsReport> {
  const date = opts.date ?? yesterdayUtc();
  const report: DailyOpsReport = { ranAt: new Date().toISOString(), date, alerts: [], stepErrors: {} };
  const guard = async <T>(name: string, fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await run(name, fn);
    } catch (err) {
      report.stepErrors[name] = err instanceof Error ? err.message : String(err);
      return undefined;
    }
  };
  report.pricing = await guard("scrapePricing", () => scrapePricing());
  report.markup = await guard("recalcMarkup", () => recalcMarkup(date));
  if (report.markup?.alert) report.alerts.push(report.markup.alert);
  report.balances = await guard("checkProviderBalances", () => checkProviderBalances());
  report.pnl = await guard("pnlRollup", () => pnlRollup(date));
  if (report.pnl) report.alerts.push(...report.pnl.yesterday.alerts);
  if (!opts.skipBenchmark) report.benchmark = await guard("benchmark", () => runBenchmark());
  report.digest = await guard("digest", () => sendDigest(report));
  return report;
}

/** Plain (no Inngest) version used by GET/POST /api/cron/daily. */
export function runDailyOps(opts: { date?: string; skipBenchmark?: boolean } = {}): Promise<DailyOpsReport> {
  return runDailyOpsWith((_name, fn) => fn(), opts);
}

function round8(n: number) {
  return Math.round(n * 1e8) / 1e8;
}
