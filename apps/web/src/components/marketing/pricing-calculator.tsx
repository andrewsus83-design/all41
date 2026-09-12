"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { SPRAWL_TOOLS, TASK_PRICE_USD, type TaskWeight } from "@/content/sprawl";

const WEEKS_PER_MONTH = 4.33;
const WEIGHTS: { key: TaskWeight; label: string; hint: string }[] = [
  { key: "light", label: "Light", hint: "a question, a summary" },
  { key: "standard", label: "Standard", hint: "a briefing, a draft" },
  { key: "heavy", label: "Heavy", hint: "search + read + report" },
];

export function PricingCalculator() {
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(SPRAWL_TOOLS.map((t) => [t.id, ["chatgpt", "claude", "perplexity"].includes(t.id)])));
  const [perWeek, setPerWeek] = useState(20);
  const [weight, setWeight] = useState<TaskWeight>("standard");

  const today = useMemo(() => SPRAWL_TOOLS.filter((t) => picked[t.id]).reduce((n, t) => n + t.monthlyUsd, 0), [picked]);
  const all41 = perWeek * WEEKS_PER_MONTH * TASK_PRICE_USD[weight];
  const diff = today - all41;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-6 p-7">
        <div className="space-y-1">
          <CardTitle className="text-xl">What you pay today</CardTitle>
          <CardHint>Tick what you have. List prices, per month.</CardHint>
        </div>
        <ul className="grid sm:grid-cols-2 gap-2">
          {SPRAWL_TOOLS.map((t) => (
            <li key={t.id}>
              <label className={cn("squircle flex items-center justify-between gap-3 rounded-2 border px-4 py-3 cursor-pointer transition", picked[t.id] ? "border-amber/50 bg-amber-soft" : "border-line bg-bg hover:border-line-strong")}>
                <span className="flex items-center gap-3">
                  <input type="checkbox" checked={!!picked[t.id]} onChange={(e) => setPicked((p) => ({ ...p, [t.id]: e.target.checked }))} className="accent-[var(--amber)] w-4 h-4" />
                  <span>{t.name}</span>
                </span>
                <span className="num text-fg-muted">${t.monthlyUsd}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex items-end justify-between border-t border-line pt-5">
          <span className="text-fg-muted">Per month</span>
          <span className="num text-4xl">${today}</span>
        </div>
      </Card>

      <Card className="space-y-6 p-7 border-green/30">
        <div className="space-y-1">
          <CardTitle className="text-xl">What all41 would cost</CardTitle>
          <CardHint>An estimate. Real prices are shown before every run.</CardHint>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="perweek" className="text-fg-muted">Tasks per week</label>
            <span className="num text-xl">{perWeek}</span>
          </div>
          <input id="perweek" type="range" min={1} max={100} value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))} className="w-full accent-[var(--green)]" />
        </div>
        <div className="space-y-3">
          <p className="text-fg-muted">Typical task</p>
          <div className="grid grid-cols-3 gap-2">
            {WEIGHTS.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => setWeight(w.key)}
                aria-pressed={weight === w.key}
                className={cn("squircle rounded-2 border px-3 py-3 text-left transition", weight === w.key ? "border-green/50 bg-green-soft" : "border-line bg-bg hover:border-line-strong")}
              >
                <span className="block font-title font-medium">{w.label}</span>
                <span className="block text-xs text-fg-faint">{w.hint}</span>
                <span className="block num text-sm text-fg-muted mt-1">${TASK_PRICE_USD[w.key].toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end justify-between border-t border-line pt-5">
          <span className="text-fg-muted">Per month, about</span>
          <span className="num text-4xl text-green">${all41.toFixed(2)}</span>
        </div>
        <div className={cn("squircle rounded-3 border px-5 py-4 flex items-center justify-between gap-4", diff >= 0 ? "border-green/40 bg-green-soft" : "border-amber/40 bg-amber-soft")}>
          <span className="text-sm text-fg-muted">{diff >= 0 ? "You would keep, per month" : "You would pay more, per month"}</span>
          <span className={cn("num text-2xl", diff >= 0 ? "text-green" : "text-amber")}>${Math.abs(diff).toFixed(2)}</span>
        </div>
        <Link href="/login" className="block"><Button phase="green" size="lg" className="w-full">Start with <span className="num">$2</span> free</Button></Link>
      </Card>
    </div>
  );
}
