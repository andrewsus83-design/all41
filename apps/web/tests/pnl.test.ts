/** Task 4.3 / 5.5 — pure P&L math + alert thresholds, hand-computed. */
import { describe, it, expect } from "vitest";
import { computePnl, utcDayRange, type UsageRow } from "@/lib/jobs/pnl";
import { evaluateAlerts } from "@/lib/jobs/alerts";

const row = (o: Partial<UsageRow> & { cost_usd: number | string; billed_usd: number | string }): UsageRow => ({
  task_id: "t1", user_id: "u1", api_provider: "openrouter", ...o,
});

describe("computePnl", () => {
  it("aggregates tasks, users, COGS, revenue, margins and by_provider by hand", () => {
    // task t1 (user u1): 0.010 cost / 0.034 billed on openrouter, 0.002 / 0.007 on firecrawl
    // task t2 (user u2): 0.020 cost / 0.068 billed on openrouter
    // benchmark row (no task, no user): 0.001 / 0.003 on mock
    const rows: UsageRow[] = [
      row({ task_id: "t1", user_id: "u1", api_provider: "openrouter", cost_usd: 0.01, billed_usd: 0.034 }),
      row({ task_id: "t1", user_id: "u1", api_provider: "firecrawl", cost_usd: "0.002", billed_usd: "0.007" }),
      row({ task_id: "t2", user_id: "u2", api_provider: "openrouter", cost_usd: 0.02, billed_usd: 0.068 }),
      row({ task_id: null, user_id: null, api_provider: "mock", cost_usd: 0.001, billed_usd: 0.003 }),
    ];
    const p = computePnl(rows, 2.0);
    expect(p.tasks).toBe(2);
    expect(p.users).toBe(2);
    expect(p.total_cogs).toBeCloseTo(0.033, 6);
    expect(p.total_revenue).toBeCloseTo(0.112, 6);
    expect(p.gross_profit).toBeCloseTo(0.079, 6);
    expect(p.fixed_costs).toBe(2);
    expect(p.net_profit).toBeCloseTo(-1.921, 6);
    expect(p.gross_margin).toBeCloseTo(0.079 / 0.112, 4); // 0.7054
    expect(p.net_margin).toBeCloseTo(-1.921 / 0.112, 4);
    expect(p.by_provider).toEqual({
      openrouter: { cogs: 0.03, calls: 2 },
      firecrawl: { cogs: 0.002, calls: 1 },
      mock: { cogs: 0.001, calls: 1 },
    });
    expect(p.task_costs).toEqual({ t1: 0.012, t2: 0.02 });
    // openrouter = 90.9% of COGS → provider-share alert; net < 0 → negative-net alert; nothing else
    expect(p.alerts.some((a) => a.startsWith("Provider openrouter"))).toBe(true);
    expect(p.alerts.some((a) => a.startsWith("Negative net profit"))).toBe(true);
    expect(p.alerts.some((a) => a.startsWith("Gross margin"))).toBe(false);
    expect(p.alerts.some((a) => a.startsWith("Daily COGS"))).toBe(false);
    expect(p.alerts.some((a) => a.startsWith("Task cost"))).toBe(false);
  });

  it("handles an empty day (null margins, only fixed-cost loss)", () => {
    const p = computePnl([], 2.0);
    expect(p.tasks).toBe(0);
    expect(p.total_revenue).toBe(0);
    expect(p.gross_margin).toBeNull();
    expect(p.net_margin).toBeNull();
    expect(p.net_profit).toBe(-2);
    expect(p.alerts).toEqual(["Negative net profit $-2.00"]);
  });

  it("utcDayRange covers exactly one UTC day", () => {
    expect(utcDayRange("2026-09-12")).toEqual({ start: "2026-09-12T00:00:00.000Z", end: "2026-09-13T00:00:00.000Z" });
    expect(() => utcDayRange("nope")).toThrow("INVALID_DATE");
  });
});

describe("evaluateAlerts thresholds", () => {
  const healthy = {
    date: "2026-09-11", total_cogs: 10, total_revenue: 40, gross_profit: 30, net_profit: 28, gross_margin: 0.75,
    by_provider: { a: { cogs: 2.5, calls: 1 }, b: { cogs: 2.5, calls: 1 }, c: { cogs: 2.5, calls: 1 }, d: { cogs: 2.5, calls: 1 } },
    task_costs: { t1: 0.05 },
  };
  it("is silent when everything is inside the guardrails", () => {
    expect(evaluateAlerts(healthy)).toEqual([]);
  });
  it("margin < 50% fires", () => {
    const a = evaluateAlerts({ ...healthy, total_revenue: 15, gross_profit: 5, gross_margin: 5 / 15 });
    expect(a).toEqual(["Gross margin 33.3% < 50% floor"]);
  });
  it("single provider > 30% of COGS fires", () => {
    const a = evaluateAlerts({ ...healthy, by_provider: { a: { cogs: 4, calls: 3 }, b: { cogs: 6, calls: 1 } } });
    expect(a).toEqual(["Provider a is 40.0% of COGS (> 30%)", "Provider b is 60.0% of COGS (> 30%)"]);
  });
  it("daily COGS > $50 fires", () => {
    const a = evaluateAlerts({ ...healthy, total_cogs: 60, total_revenue: 240, gross_profit: 180, net_profit: 178,
      by_provider: { a: { cogs: 15, calls: 1 }, b: { cogs: 15, calls: 1 }, c: { cogs: 15, calls: 1 }, d: { cogs: 15, calls: 1 } } });
    expect(a).toEqual(["Daily COGS $60.00 > $50"]);
  });
  it("a single task costing > $0.10 fires (and names the task)", () => {
    const a = evaluateAlerts({ ...healthy, task_costs: { t1: 0.05, t9: 0.1234 } });
    expect(a).toEqual(["Task cost $0.1234 > $0.1 (task t9)"]);
  });
  it("negative net profit fires", () => {
    const a = evaluateAlerts({ ...healthy, net_profit: -0.5 });
    expect(a).toEqual(["Negative net profit $-0.50"]);
  });
  it("margin alert is suppressed on a zero-revenue day", () => {
    const a = evaluateAlerts({ ...healthy, total_revenue: 0, gross_profit: -10, net_profit: -12, gross_margin: null });
    expect(a).toEqual(["Negative net profit $-12.00"]);
  });
});
