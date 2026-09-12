"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const TASK_WORDS: Record<string, string> = { classify: "sorting", research: "research", synthesis: "writing it up", reasoning: "thinking it through", code: "code", content: "writing", crawl: "reading pages", summarize: "summarizing", verify: "double-checking", edges: "connecting notes" };
const taskWords = (t: string) => TASK_WORDS[t] ?? t;

const SAMPLE = {
  what: "Compare Jasper AI's pricing tiers to our $29 plan",
  goal: "Decide whether to cut our Pro price before Q4",
};

type Estimate = { taskType: string; model: string; providerLabel: string; modelName: string; isMock: boolean; estimatedBilledUsd: number };

const STEPS = [
  { key: "what", label: "What", phase: "red", hint: "Stop & Think" },
  { key: "goal", label: "Goal", phase: "red", hint: "Stop & Think" },
  { key: "condition", label: "Condition", phase: "amber", hint: "Prepare" },
  { key: "execute", label: "Execute", phase: "green", hint: "Go" },
  { key: "track", label: "Track", phase: "green", hint: "Track" },
] as const;

const phaseText = { red: "text-red", amber: "text-amber", green: "text-green" } as const;
const phaseRing = { red: "border-red/50", amber: "border-amber/50", green: "border-green/50" } as const;
const phaseDot = { red: "bg-red", amber: "bg-amber", green: "bg-green" } as const;

export function LiveBriefingDemo() {
  const [what, setWhat] = useState("");
  const [goal, setGoal] = useState("");
  const [step, setStep] = useState(0); // index into STEPS; 5 = finished
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const runEstimate = useCallback(async (w: string, g: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/public/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ what: w, goal: g }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Estimate;
      if (!cancelled.current) setEstimate(data);
    } catch (e) {
      if (!cancelled.current) setError(e instanceof Error ? e.message : "estimate failed");
    } finally {
      if (!cancelled.current) setBusy(false);
    }
  }, []);

  // self-driving script — stops the moment the visitor edits a field
  useEffect(() => {
    if (!auto) return;
    cancelled.current = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const type = async (text: string, set: (s: string) => void) => {
      for (let i = 1; i <= text.length; i++) {
        if (cancelled.current) return;
        set(text.slice(0, i));
        await sleep(28);
      }
    };
    (async () => {
      await sleep(600);
      if (cancelled.current) return;
      await type(SAMPLE.what, setWhat);
      await sleep(500);
      if (cancelled.current) return;
      setStep(1);
      await type(SAMPLE.goal, setGoal);
      await sleep(500);
      if (cancelled.current) return;
      setStep(2);
      await sleep(1100);
      if (cancelled.current) return;
      setStep(3);
      await runEstimate(SAMPLE.what, SAMPLE.goal);
      await sleep(900);
      if (cancelled.current) return;
      setStep(4);
      await sleep(700);
      if (cancelled.current) return;
      setStep(5);
    })();
    return () => {
      cancelled.current = true;
    };
  }, [auto, runEstimate]);

  const takeOver = () => {
    if (auto) {
      cancelled.current = true;
      setAuto(false);
      setBusy(false);
    }
  };

  const execute = async () => {
    takeOver();
    cancelled.current = false;
    setEstimate(null);
    setStep(3);
    await runEstimate(what || SAMPLE.what, goal || SAMPLE.goal);
    setStep(5);
  };

  const active = Math.min(step, 4);
  const current = STEPS[active];

  return (
    <div className="squircle rounded-5 border border-line bg-bg-elev p-6 md:p-8 space-y-6 w-full">
      <div className="flex items-center justify-between gap-4">
        <p className="font-title text-sm text-fg-muted">Try it · nothing is charged</p>
        <span className={cn("text-xs uppercase tracking-[0.18em] font-medium whitespace-nowrap", phaseText[current.phase])}>{current.hint}</span>
      </div>

      {/* step rail */}
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Briefing steps">
        {STEPS.map((s, i) => {
          const done = step > i;
          const isActive = active === i && step < 5;
          return (
            <li key={s.key} className="space-y-1.5">
              <div className={cn("h-1 rounded-full transition", done || isActive ? phaseDot[s.phase] : "bg-line-strong", isActive && "pulse-soft")} />
              <p className={cn("text-[11px] uppercase tracking-wider", done || isActive ? phaseText[s.phase] : "text-fg-faint")}>{s.label}</p>
            </li>
          );
        })}
      </ol>

      <div className="space-y-4">
        <Field label="What" phase="red" active={active === 0 && step < 5} value={what} placeholder={SAMPLE.what} onChange={(v) => { takeOver(); setWhat(v); }} />
        <Field label="Goal" phase="red" active={active === 1 && step < 5} value={goal} placeholder={SAMPLE.goal} onChange={(v) => { takeOver(); setGoal(v); }} dim={step < 1} />

        <div className={cn("space-y-2 transition", step < 2 && "opacity-35")}>
          <p className="text-xs uppercase tracking-wider text-amber">Condition</p>
          <div className="flex flex-wrap gap-2">
            {["from this week", "direct tone", "as a report", "double-check it"].map((c) => (
              <span key={c} className="squircle rounded-1 border border-amber/40 bg-amber-soft px-3 py-1 text-xs font-mono text-amber">{c}</span>
            ))}
          </div>
        </div>

        <div className={cn("space-y-3 transition", step < 3 && "opacity-35")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wider text-green">Execute</p>
            <Button phase="green" size="sm" onClick={execute} disabled={busy}>
              {busy ? "Routing…" : "Execute"}
            </Button>
          </div>
          <div className={cn("squircle rounded-2 border bg-bg px-4 py-3 min-h-14 flex items-center", estimate ? phaseRing.green : "border-line")}>
            {busy ? (
              <p className="text-sm text-fg-muted pulse-soft">Checking balance · picking today&apos;s best AI · pricing the run</p>
            ) : estimate ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="num text-fg">≈ ${estimate.estimatedBilledUsd.toFixed(4)}</span>
                <span className="text-fg-faint">·</span>
                <span className="text-fg-muted">
                  today&apos;s best AI for <span className="text-fg">{taskWords(estimate.taskType)}</span> picked
                </span>
                {estimate.isMock ? <Badge tone="amber">demo mode · no live AI yet</Badge> : null}
              </div>
            ) : error ? (
              <p className="text-sm text-red">Could not price this run ({error}). Try again.</p>
            ) : (
              <p className="text-sm text-fg-faint">The price shows up here before anything runs.</p>
            )}
          </div>
        </div>

        <div className={cn("space-y-2 transition", step < 4 && "opacity-35")}>
          <p className="text-xs uppercase tracking-wider text-green">Track</p>
          <div className="flex flex-wrap gap-2">
            {["just once", "every week", "save as an app"].map((t, i) => (
              <span key={t} className={cn("squircle rounded-1 border px-3 py-1 text-xs font-mono", i === 0 ? "border-green/40 bg-green-soft text-green" : "border-line text-fg-muted")}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="reflect text-fg-muted text-lg md:text-xl">What will you decide once you have this?</p>
    </div>
  );
}

function Field({ label, phase, active, value, placeholder, onChange, dim }: { label: string; phase: "red" | "amber" | "green"; active: boolean; value: string; placeholder: string; onChange: (v: string) => void; dim?: boolean }) {
  return (
    <label className={cn("block space-y-2 transition", dim && "opacity-35")}>
      <span className={cn("text-xs uppercase tracking-wider", phaseText[phase])}>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          "w-full bg-bg border rounded-2 px-4 h-12 text-fg placeholder:text-fg-faint outline-none transition focus:border-amber focus:ring-2 focus:ring-amber/20",
          active ? phaseRing[phase] : "border-line",
        )}
      />
    </label>
  );
}
