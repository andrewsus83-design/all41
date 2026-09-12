import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { getPricing } from "@/lib/finance/cost";
import { evaluateAlerts } from "./alerts";

/** The subset of api_usage_log a rollup needs. */
export type UsageRow = {
  task_id: string | null;
  user_id: string | null;
  api_provider: string;
  cost_usd: number | string;
  billed_usd: number | string;
};

export type PnlResult = {
  tasks: number;
  users: number;
  total_cogs: number;
  total_revenue: number;
  gross_profit: number;
  fixed_costs: number;
  net_profit: number;
  gross_margin: number | null;
  net_margin: number | null;
  by_provider: Record<string, { cogs: number; calls: number }>;
  task_costs: Record<string, number>;
  alerts: string[];
};

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
/** daily_pnl margins are numeric(6,4): clamp to ±99.9999 (a $0.001-revenue day vs $2 fixed costs is a −2000× margin — meaningless past ±100). */
const dbMargin = (n: number | null) => (n === null ? null : Math.max(-99.9999, Math.min(99.9999, n)));
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

/**
 * Pure P&L math (Task 4.3) — exported for hand-checked unit tests.
 * gross = revenue − COGS; net = gross − fixed; margins are relative to revenue (null when revenue is 0).
 */
export function computePnl(rows: UsageRow[], fixedCosts: number): PnlResult {
  const tasks = new Set<string>();
  const users = new Set<string>();
  const by_provider: Record<string, { cogs: number; calls: number }> = {};
  const task_costs: Record<string, number> = {};
  let cogs = 0;
  let revenue = 0;
  for (const row of rows) {
    const c = Number(row.cost_usd) || 0;
    const b = Number(row.billed_usd) || 0;
    cogs += c;
    revenue += b;
    if (row.task_id) {
      tasks.add(row.task_id);
      task_costs[row.task_id] = r6((task_costs[row.task_id] ?? 0) + c);
    }
    if (row.user_id) users.add(row.user_id);
    const p = (by_provider[row.api_provider] ??= { cogs: 0, calls: 0 });
    p.cogs = r6(p.cogs + c);
    p.calls += 1;
  }
  cogs = r6(cogs);
  revenue = r6(revenue);
  const gross_profit = r6(revenue - cogs);
  const fixed_costs = r6(fixedCosts);
  const net_profit = r6(gross_profit - fixed_costs);
  const gross_margin = revenue > 0 ? r4(gross_profit / revenue) : null;
  const net_margin = revenue > 0 ? r4(net_profit / revenue) : null;
  const partial = { tasks: tasks.size, users: users.size, total_cogs: cogs, total_revenue: revenue, gross_profit, fixed_costs, net_profit, gross_margin, net_margin, by_provider, task_costs };
  const alerts = evaluateAlerts({ date: "", ...partial });
  return { ...partial, alerts };
}

/** [startISO, endISO) for a YYYY-MM-DD UTC day. */
export function utcDayRange(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) throw new Error(`INVALID_DATE ${date}`);
  const end = new Date(start.getTime() + 86_400_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function yesterdayUtc(): string {
  return utcDateString(new Date(Date.now() - 86_400_000));
}

/**
 * rollupDailyPnl — aggregate api_usage_log for one UTC day into daily_pnl (upsert). Returns the computed row.
 */
export async function rollupDailyPnl(date: string): Promise<PnlResult & { date: string }> {
  const db = adminClient();
  const { start, end } = utcDayRange(date);
  const rows: UsageRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("api_usage_log")
      .select("task_id,user_id,api_provider,cost_usd,billed_usd")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`api_usage_log read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  const pricing = await getPricing(true);
  const pnl = computePnl(rows, pricing.fixedCostsDailyUsd);

  const { error: upErr } = await db.from("daily_pnl").upsert(
    {
      date,
      tasks: pnl.tasks,
      users: pnl.users,
      total_cogs: pnl.total_cogs,
      total_revenue: pnl.total_revenue,
      gross_profit: pnl.gross_profit,
      fixed_costs: pnl.fixed_costs,
      net_profit: pnl.net_profit,
      gross_margin: dbMargin(pnl.gross_margin),
      net_margin: dbMargin(pnl.net_margin),
      by_provider: pnl.by_provider as unknown as Json,
      alerts: pnl.alerts as unknown as Json,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "date" },
  );
  if (upErr) throw new Error(`daily_pnl upsert failed: ${upErr.message}`);
  return { date, ...pnl };
}
