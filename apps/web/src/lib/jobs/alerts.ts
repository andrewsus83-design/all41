/**
 * Task 5.5 — financial guardrail thresholds (MASTER_PLAN §15 rule 6).
 * `evaluateAlerts` is pure (used by the P&L rollup + tests); `notifyAlerts` pushes to Telegram.
 */
export const ALERT_THRESHOLDS = {
  marginFloor: 0.5,
  providerShareMax: 0.3,
  dailyCogsMaxUsd: 50,
  taskCostMaxUsd: 0.1,
} as const;

export type PnlSnapshot = {
  date: string;
  total_cogs: number;
  total_revenue: number;
  gross_profit: number;
  net_profit: number;
  gross_margin: number | null;
  by_provider: Record<string, { cogs: number; calls: number }>;
  /** cost per task_id (null task ids are excluded) */
  task_costs?: Record<string, number>;
  /** max single-task cost (used when task_costs isn't carried) */
  max_task_cost?: number;
};

export function evaluateAlerts(p: PnlSnapshot, t = ALERT_THRESHOLDS): string[] {
  const alerts: string[] = [];
  if (p.total_revenue > 0 && p.gross_margin !== null && p.gross_margin < t.marginFloor) {
    alerts.push(`Gross margin ${(p.gross_margin * 100).toFixed(1)}% < ${(t.marginFloor * 100).toFixed(0)}% floor`);
  }
  if (p.total_cogs > 0) {
    for (const [provider, v] of Object.entries(p.by_provider)) {
      const share = v.cogs / p.total_cogs;
      if (share > t.providerShareMax) {
        alerts.push(`Provider ${provider} is ${(share * 100).toFixed(1)}% of COGS (> ${(t.providerShareMax * 100).toFixed(0)}%)`);
      }
    }
  }
  if (p.total_cogs > t.dailyCogsMaxUsd) {
    alerts.push(`Daily COGS $${p.total_cogs.toFixed(2)} > $${t.dailyCogsMaxUsd}`);
  }
  const maxTask = p.max_task_cost ?? Math.max(0, ...Object.values(p.task_costs ?? {}));
  if (maxTask > t.taskCostMaxUsd) {
    const worst = p.task_costs ? Object.entries(p.task_costs).sort((a, b) => b[1] - a[1])[0] : null;
    alerts.push(`Task cost $${maxTask.toFixed(4)} > $${t.taskCostMaxUsd}${worst ? ` (task ${worst[0]})` : ""}`);
  }
  if (p.net_profit < 0) {
    alerts.push(`Negative net profit $${p.net_profit.toFixed(2)}`);
  }
  return alerts;
}

/** Push a list of alert strings to Telegram (no-op when empty or unconfigured). */
export async function notifyAlerts(alerts: string[], context = "all41 alerts"): Promise<{ sent: boolean; count: number }> {
  if (!alerts.length) return { sent: false, count: 0 };
  const { sendTelegram, escapeHtml } = await import("@/lib/telegram");
  const text = `<b>⚠️ ${escapeHtml(context)}</b>\n` + alerts.map((a) => `• ${escapeHtml(a)}`).join("\n");
  const r = await sendTelegram(text);
  return { sent: r.sent, count: alerts.length };
}
