"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ResultView } from "@/components/result-view";
import { briefingIsVague, type Briefing } from "@/lib/engine/briefing";
import { cn } from "@/lib/cn";

export type RecentTask = {
  id: string; what: string; goal: string; status: string; taskType: string | null; modelsUsed: string[];
  billed: number; result: unknown; createdAt: string; fromApp: boolean;
};

type Plan = { taskType: string; model: string; isMock: boolean; estimatedBilledUsd: number; groundingAvailable: boolean; verify: boolean };
type Ev = Record<string, unknown> & { step: string };

const FORMATS: Briefing["what_format"][] = ["answer", "report", "list", "table", "draft", "plan"];
const FRESH: Briefing["condition"]["freshness"][] = ["any", "week", "day"];
const TONES: Briefing["condition"]["tone"][] = ["direct", "warm", "formal", "playful"];
const TRACKS: Array<{ v: Briefing["track"]; label: string }> = [
  { v: "once", label: "Once" }, { v: "remind", label: "Remind me" }, { v: "daily", label: "Daily" }, { v: "weekly", label: "Weekly" }, { v: "save_app", label: "Save as app" },
];

type Phase = "red" | "amber" | "green";
const STEP_META: Array<{ key: string; label: string; phase: Phase; title: string }> = [
  { key: "what", label: "Stop & Think", phase: "red", title: "What do you need delivered?" },
  { key: "goal", label: "Stop & Think", phase: "red", title: "What decision does this help you make?" },
  { key: "condition", label: "Prepare", phase: "amber", title: "Any constraints?" },
  { key: "execute", label: "Prepare", phase: "amber", title: "Here’s the plan." },
  { key: "track", label: "Go & Track", phase: "green", title: "How should we follow up?" },
];

function Chip({ active, onClick, children, tone = "neutral" }: { active?: boolean; onClick?: () => void; children: React.ReactNode; tone?: Phase | "neutral" }) {
  const activeCls = tone === "red" ? "bg-red text-white" : tone === "amber" ? "bg-amber text-black" : tone === "green" ? "bg-green text-black" : "bg-fg text-bg";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("squircle h-11 px-5 rounded-2 border text-sm font-title font-medium transition", active ? `${activeCls} border-transparent` : "bg-bg-elev border-line-strong text-fg-muted hover:text-fg hover:bg-bg-elev-2")}
    >
      {children}
    </button>
  );
}

function PhaseDot({ phase }: { phase: Phase }) {
  return <span className={cn("inline-block size-2.5 rounded-full", phase === "red" ? "bg-red" : phase === "amber" ? "bg-amber" : "bg-green")} />;
}

function LockedRow({ phase, label, value }: { phase: Phase; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 rounded-2 bg-bg-elev border border-line">
      <PhaseDot phase={phase} />
      <span className="text-xs uppercase tracking-wide text-fg-faint w-24 shrink-0">{label}</span>
      <span className="text-fg truncate">{value}</span>
    </div>
  );
}

export function ChatClient({ recent }: { recent: RecentTask[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [what, setWhat] = useState("");
  const [format, setFormat] = useState<Briefing["what_format"]>("answer");
  const [goal, setGoal] = useState("");
  const [constraints, setConstraints] = useState("");
  const [freshness, setFreshness] = useState<Briefing["condition"]["freshness"]>("any");
  const [tone, setTone] = useState<Briefing["condition"]["tone"]>("direct");
  const [highStakes, setHighStakes] = useState(false);
  const [useContext, setUseContext] = useState(true);
  const [track, setTrack] = useState<Briefing["track"] | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<(Ev & { output?: unknown; schema?: string; isMock?: boolean; modelsUsed?: string[]; taskId?: string }) | null>(null);
  const [viewing, setViewing] = useState<RecentTask | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const briefing: Briefing = {
    what, what_format: format, goal,
    condition: { constraints, freshness, tone, high_stakes: highStakes },
    execute: { confirmed: step >= 4, use_context: useContext },
    track: track ?? "once",
  };
  const vague = briefingIsVague(briefing);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [step, events.length, result]);

  // Execute step: fetch the plan server-side
  useEffect(() => {
    if (step !== 3) return;
    let alive = true;
    setPlan(null);
    setPlanErr(null);
    fetch("/api/tasks/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(briefing) })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? `HTTP ${r.status}`);
        return r.json();
      })
      .then((p: Plan) => alive && setPlan(p))
      .catch((e) => alive && setPlanErr(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function reset() {
    setStep(0); setWhat(""); setFormat("answer"); setGoal(""); setConstraints(""); setFreshness("any"); setTone("direct");
    setHighStakes(false); setUseContext(true); setTrack(null); setPlan(null); setEvents([]); setResult(null); setViewing(null);
  }

  async function run() {
    if (vague || running) return;
    setRunning(true);
    setEvents([]);
    setResult(null);
    setStep(5);
    try {
      const res = await fetch("/api/tasks/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(briefing) });
      if (!res.ok || !res.body) {
        setEvents([{ step: "error", message: `HTTP ${res.status}` }]);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const f of frames) {
          const line = f.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const ev = JSON.parse(line.slice(6)) as Ev;
          if (ev.step === "result") setResult(ev as typeof result);
          else setEvents((prev) => [...prev, ev]);
        }
      }
    } catch (e) {
      setEvents((prev) => [...prev, { step: "error", message: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  const meta = STEP_META[Math.min(step, 4)];

  return (
    <div className="grid grid-cols-[260px_1fr] gap-10 max-w-6xl">
      {/* left rail: recent tasks */}
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Recent</p>
          <button type="button" onClick={reset} className="text-xs text-green hover:underline">+ New</button>
        </div>
        {recent.length === 0 && <p className="text-sm text-fg-faint">No tasks yet. Your first one is a briefing away.</p>}
        <ul className="space-y-1">
          {recent.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => { setViewing(t); }}
                className={cn("w-full text-left squircle rounded-2 px-4 py-3 transition border", viewing?.id === t.id ? "bg-bg-elev-2 border-line-strong" : "border-transparent hover:bg-bg-elev")}
              >
                <p className="text-sm truncate">{t.what}</p>
                <p className="text-xs text-fg-faint flex items-center gap-2">
                  <span className={cn(t.status === "done" ? "text-green" : t.status === "blocked" || t.status === "failed" ? "text-red" : "text-amber")}>{t.status}</span>
                  <Money usd={t.billed} className="text-fg-faint" />
                  {t.fromApp && <span>· app</span>}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* main transcript */}
      <section className="space-y-6 min-w-0">
        {viewing ? (
          <ViewTask t={viewing} onClose={() => setViewing(null)} />
        ) : (
          <>
            <header className="space-y-2">
              <div className="flex items-center gap-3">
                <PhaseDot phase={meta.phase} />
                <span className="text-xs uppercase tracking-wide text-fg-faint">{meta.label} · step <span className="num">{Math.min(step, 4) + 1}</span>/5</span>
              </div>
              <h1 className="text-4xl font-semibold">Brief the job.</h1>
              <p className="text-fg-muted">One question at a time. Tap or type. ~20 seconds.</p>
            </header>

            {/* locked steps */}
            <div className="space-y-2">
              {step > 0 && <LockedRow phase="red" label="What" value={`${what} · ${format}`} />}
              {step > 1 && <LockedRow phase="red" label="Goal" value={goal} />}
              {step > 2 && <LockedRow phase="amber" label="Condition" value={[constraints || "no constraints", freshness, tone, highStakes ? "high-stakes" : null].filter(Boolean).join(" · ")} />}
              {step > 3 && plan && <LockedRow phase="amber" label="Plan" value={`${plan.taskType} → ${plan.model} · ≈ $${plan.estimatedBilledUsd.toFixed(4)}`} />}
              {step > 4 && track && <LockedRow phase="green" label="Track" value={TRACKS.find((t) => t.v === track)?.label ?? track} />}
            </div>

            {/* active step */}
            {step === 0 && (
              <Card className="space-y-5 border-red/30">
                <CardTitle className="text-2xl">{STEP_META[0].title}</CardTitle>
                <Textarea autoFocus placeholder="e.g. Compare Jasper AI’s pricing against ours and tell me where we’re exposed" value={what} onChange={(e) => setWhat(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => <Chip key={f} tone="red" active={format === f} onClick={() => setFormat(f)}>{f}</Chip>)}
                </div>
                <div className="flex items-center gap-4">
                  <Button phase="red" disabled={what.trim().split(/\s+/).length < 3} onClick={() => setStep(1)}>Lock it →</Button>
                  {what.trim() && what.trim().split(/\s+/).length < 3 && <span className="text-sm text-red">Say a little more — three words minimum.</span>}
                </div>
              </Card>
            )}
            {step === 1 && (
              <Card className="space-y-5 border-red/30">
                <p className="reflect text-fg">{STEP_META[1].title}</p>
                <Input autoFocus placeholder="e.g. Whether to drop our Pro price before Q4" value={goal} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && goal.trim().split(/\s+/).length >= 3) setStep(2); }} />
                <div className="flex items-center gap-4">
                  <Button phase="red" disabled={goal.trim().split(/\s+/).length < 3} onClick={() => setStep(2)}>Lock it →</Button>
                  <Button phase="ghost" size="sm" onClick={() => setStep(0)}>Back</Button>
                </div>
              </Card>
            )}
            {step === 2 && (
              <Card className="space-y-6 border-amber/30">
                <CardTitle className="text-2xl">{STEP_META[2].title}</CardTitle>
                <Input placeholder="Competitor, audience, format, must-include… (optional)" value={constraints} onChange={(e) => setConstraints(e.target.value)} />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-fg-faint">Freshness</p>
                  <div className="flex gap-2">{FRESH.map((f) => <Chip key={f} tone="amber" active={freshness === f} onClick={() => setFreshness(f)}>{f === "any" ? "Any time" : f === "week" ? "Past week" : "Past day"}</Chip>)}</div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-fg-faint">Tone</p>
                  <div className="flex gap-2">{TONES.map((t) => <Chip key={t} tone="amber" active={tone === t} onClick={() => setTone(t)}>{t}</Chip>)}</div>
                </div>
                <div className="flex gap-6 flex-wrap">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" checked={highStakes} onChange={(e) => setHighStakes(e.target.checked)} className="size-5 accent-amber" />
                    <span>High-stakes <span className="text-fg-faint text-sm">— a second model verifies against sources</span></span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} className="size-5 accent-amber" />
                    <span>Use my graph <span className="text-fg-faint text-sm">— ground in your connected context</span></span>
                  </label>
                </div>
                <div className="flex items-center gap-4">
                  <Button phase="amber" onClick={() => setStep(3)}>Lock it →</Button>
                  <Button phase="ghost" size="sm" onClick={() => setStep(1)}>Back</Button>
                </div>
              </Card>
            )}
            {step === 3 && (
              <Card className="space-y-5 border-amber/30">
                <CardTitle className="text-2xl">{STEP_META[3].title}</CardTitle>
                {planErr && <p className="text-red text-sm">{planErr}</p>}
                {!plan && !planErr && <p className="text-fg-muted pulse-soft">Routing the task…</p>}
                {plan && (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="squircle rounded-3 bg-bg-elev-2 p-5"><p className="text-xs uppercase tracking-wide text-fg-faint">Task type</p><p className="text-xl mt-1">{plan.taskType}</p></div>
                    <div className="squircle rounded-3 bg-bg-elev-2 p-5"><p className="text-xs uppercase tracking-wide text-fg-faint">Model</p><p className="num text-base mt-1 break-all">{plan.model}</p>{plan.isMock && <Badge tone="amber" className="mt-2">mock</Badge>}</div>
                    <div className="squircle rounded-3 bg-bg-elev-2 p-5"><p className="text-xs uppercase tracking-wide text-fg-faint">Cost</p><p className="text-xl mt-1">≈ <Money usd={plan.estimatedBilledUsd} /></p><p className="text-xs text-fg-faint">for this task</p></div>
                  </div>
                )}
                {plan && (
                  <p className="text-sm text-fg-muted">
                    Steps: classify → route → {plan.groundingAvailable ? "ground in your graph" : "no graph engine (ungrounded)"} → execute{plan.verify ? " → verify" : ""}.
                  </p>
                )}
                {vague && <p className="text-red text-sm">This briefing is too vague to run — sharpen the What and Goal first.</p>}
                <div className="flex items-center gap-4">
                  <Button phase="green" disabled={!plan || vague} onClick={() => setStep(4)}>Looks right →</Button>
                  <Button phase="ghost" size="sm" onClick={() => setStep(2)}>Back</Button>
                </div>
              </Card>
            )}
            {step === 4 && (
              <Card className="space-y-5 border-green/30">
                <CardTitle className="text-2xl">{STEP_META[4].title}</CardTitle>
                <div className="flex flex-wrap gap-2">{TRACKS.map((t) => <Chip key={t.v} tone="green" active={track === t.v} onClick={() => setTrack(t.v)}>{t.label}</Chip>)}</div>
                {vague && <p className="text-red text-sm">Too vague to run.</p>}
                <div className="flex items-center gap-4">
                  <Button phase="green" size="lg" disabled={!track || vague || running} onClick={run}>
                    Run · ≈ <Money usd={plan?.estimatedBilledUsd ?? 0} />
                  </Button>
                  <Button phase="ghost" size="sm" onClick={() => setStep(3)}>Back</Button>
                </div>
              </Card>
            )}

            {/* transcript */}
            {step >= 5 && (
              <div className="space-y-3">
                {events.map((e, i) => <EventCard key={i} e={e} />)}
                {running && !result && <p className="text-fg-muted pulse-soft text-sm px-2">Working…</p>}
                {result && (
                  <>
                    <ResultView output={result.output} schema={result.schema} isMock={result.isMock} modelsUsed={result.modelsUsed} />
                    <div className="flex gap-3">
                      <Button phase="green" onClick={reset}>New briefing</Button>
                    </div>
                  </>
                )}
                {!running && !result && events.some((e) => e.step === "blocked" || e.step === "error") && (
                  <Button phase="ghost" onClick={reset}>Start over</Button>
                )}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </section>
    </div>
  );
}

function EventCard({ e }: { e: Ev }) {
  const s = e.step;
  const base = "flex items-center gap-4 px-6 py-4 rounded-3 border squircle";
  if (s === "created") return <div className={cn(base, "border-line bg-bg-elev")}><PhaseDot phase="red" /><span className="text-fg-muted">Briefing stored</span><span className="num text-xs text-fg-faint ml-auto">{String(e.taskId).slice(0, 8)}</span></div>;
  if (s === "classify") return <div className={cn(base, "border-line bg-bg-elev")}><PhaseDot phase="red" /><span>Classified as <b>{String(e.intent)}</b></span><span className="num text-xs text-fg-faint ml-auto">{String(e.model)}</span></div>;
  if (s === "route") return <div className={cn(base, "border-line bg-bg-elev")}><PhaseDot phase="amber" /><span>Routing <b>{String(e.taskType)}</b> to</span><span className="num">{String(e.model)}</span>{e.isMock ? <Badge tone="amber">mock</Badge> : null}</div>;
  if (s === "ground") return <div className={cn(base, "border-line bg-bg-elev")}><PhaseDot phase="amber" /><span>Grounding: <span className="num">{String(e.chunks)}</span> connected chunks · <span className="num">{String(e.tokens)}</span> tokens</span><span className="text-xs text-fg-faint ml-auto">{String(e.engine)}</span></div>;
  if (s === "execute") return <div className={cn(base, "border-green/30 bg-bg-elev")}><PhaseDot phase="green" /><span>Executed on <span className="num">{String(e.model)}</span></span><span className="ml-auto text-sm text-fg-muted">cost <Money usd={Number(e.costUsd)} /> → billed <Money usd={Number(e.billedUsd)} /> · balance <Money usd={Number(e.balanceAfter)} className="text-green" /></span></div>;
  if (s === "verify") return <div className={cn(base, "border-line bg-bg-elev")}><PhaseDot phase="green" /><span>Verified: <b>{String(e.verdict)}</b> · <span className="num">{String(e.conflicts)}</span> conflicts</span></div>;
  if (s === "done") return <div className={cn(base, "border-green/30 bg-green-soft")}><PhaseDot phase="green" /><span>Done · billed <Money usd={Number(e.totalBilled)} /></span><span className="ml-auto text-sm">balance <Money usd={Number(e.balance)} /></span></div>;
  if (s === "blocked") return <div className={cn(base, "border-red/40 bg-red-soft text-red")}><span>{String(e.message)}</span><a href="/settings/billing" className="ml-auto underline">Top up</a></div>;
  if (s === "error") return <div className={cn(base, "border-red/40 bg-red-soft text-red")}><span>Error: {String(e.message)}</span></div>;
  return <div className={cn(base, "border-line")}><span className="num text-xs">{JSON.stringify(e)}</span></div>;
}

function ViewTask({ t, onClose }: { t: RecentTask; onClose: () => void }) {
  const r = (t.result ?? {}) as { output?: unknown; schema?: string; isMock?: boolean; modelsUsed?: string[] };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold truncate">{t.what}</h1>
        <Button phase="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
      <Card className="space-y-2">
        <CardHint>Goal · {t.goal || "—"}</CardHint>
        <div className="flex gap-3 flex-wrap items-center text-sm text-fg-muted">
          <Badge tone={t.status === "done" ? "green" : t.status === "blocked" || t.status === "failed" ? "red" : "amber"}>{t.status}</Badge>
          {t.taskType && <span>{t.taskType}</span>}
          <span>billed <Money usd={t.billed} /></span>
          <span className="num text-xs text-fg-faint">{new Date(t.createdAt).toLocaleString()}</span>
        </div>
      </Card>
      {r.output ? <ResultView output={r.output} schema={r.schema} isMock={r.isMock} modelsUsed={r.modelsUsed ?? t.modelsUsed} /> : <Card><CardHint>No result stored for this task.</CardHint></Card>}
    </div>
  );
}
