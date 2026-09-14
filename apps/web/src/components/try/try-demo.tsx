"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Topbar } from "@/components/shell/topbar";
import { Money } from "@/components/ui/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardHint } from "@/components/ui/card";
import { RunProgress } from "@/components/apps/run-progress";
import { ResultView } from "@/components/result-view";
import { useMockRun } from "./use-mock-run";
import { PERSONA, SEO_RESULT, RUN_COST, START_CREDIT } from "./demo-fixtures";

/* ----------------------------- shell ----------------------------- */
const NAV = [
  { label: "Calendar", hint: "Plans & history by day" },
  { label: "Apps", hint: "Build & run your apps" },
  { label: "My Apps", hint: "Your apps, live" },
  { label: "Data", hint: "Files · sheets · docs" },
  { label: "AI", hint: "Think tank on your apps" },
  { label: "Settings", hint: "Billing · security · help" },
] as const;

function DemoSidebar({ active }: { active: string }) {
  return (
    <aside className="w-60 shrink-0 border-r border-line flex-col p-6 gap-8 min-h-screen sticky top-0 hidden lg:flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="all41" className="h-8 w-auto" />
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const on = n.label === active;
          return (
            <div key={n.label} className={cn("squircle rounded-2 px-4 py-3 transition flex flex-col", on ? "bg-bg-elev-2 text-fg" : "text-fg-muted")}>
              <span className="font-title font-medium">{n.label}</span>
              <span className="text-xs text-fg-faint">{n.hint}</span>
            </div>
          );
        })}
      </nav>
      <p className="mt-auto reflect text-fg-faint text-base">AI rewards you for thinking clearly.</p>
    </aside>
  );
}

/* ----------------------------- acts ----------------------------- */
const ACTS = ["Brief it", "Watch it work", "It runs itself"] as const;
// scene → act index
const SCENE_ACT = [0, 1, 1, 1, 2, 2];
const SCENES = ["brief", "run", "publish", "myapps", "mornings", "close"] as const;

function ActRail({ scene, onJump }: { scene: number; onJump: (act: number) => void }) {
  const act = SCENE_ACT[scene];
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-line bg-bg-elev/90 backdrop-blur px-3 py-2 shadow-lift">
      {ACTS.map((a, i) => (
        <button key={a} type="button" onClick={() => onJump(i)} className="flex items-center gap-2 px-2">
          <span className={cn("size-2 rounded-full transition", i < act ? "bg-green" : i === act ? "bg-amber pulse-soft" : "bg-line-strong")} />
          <span className={cn("text-xs num", i === act ? "text-fg" : "text-fg-faint")}>{i + 1} {a}</span>
        </button>
      ))}
    </div>
  );
}

/* ----------------------------- the director ----------------------------- */
export function TryDemo() {
  const [scene, setScene] = useState(0);
  const [auto, setAuto] = useState(true);
  const [morningRuns, setMorningRuns] = useState(0);
  const [appName, setAppName] = useState(PERSONA.appName);
  const [weekly, setWeekly] = useState(true);
  const [goal, setGoal] = useState(PERSONA.goal);
  const [published, setPublished] = useState(false);
  const run = useMockRun();
  const dwell = useRef<number | null>(null);

  const sidebarActive = scene === 4 ? "Calendar" : scene === 3 ? "My Apps" : "Apps";
  // credit is DERIVED (never set in an effect): the try run spends once it finishes, plus each morning run.
  const tryDone = scene >= 2 || run.done;
  const credit = START_CREDIT - (tryDone ? RUN_COST : 0) - morningRuns * RUN_COST;

  const go = useCallback((s: number) => setScene(Math.max(0, Math.min(SCENES.length - 1, s))), []);

  // enter the run scene → start the mock crew run once
  useEffect(() => {
    if (scene === 1 && run.frames.length === 0 && !run.running && !run.done) run.start();
  }, [scene, run]);

  // auto-advance (skippable). the run scene waits for the crew to finish.
  useEffect(() => {
    if (!auto) return;
    if (dwell.current) clearTimeout(dwell.current);
    const dwellMs = [4200, 0, 5200, 5000, 7000, 0][scene];
    if (scene === 1) {
      if (run.done) dwell.current = window.setTimeout(() => go(2), 2600);
    } else if (dwellMs > 0) {
      dwell.current = window.setTimeout(() => go(scene + 1), dwellMs);
    }
    return () => { if (dwell.current) clearTimeout(dwell.current); };
  }, [auto, scene, run.done, go]);

  const takeOver = () => setAuto(false);
  const replay = () => { run.reset(); setMorningRuns(0); setPublished(false); setScene(0); setAuto(true); };

  return (
    <div className="fixed inset-0 z-[60] flex bg-bg overflow-hidden">
      <DemoSidebar active={sidebarActive} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar email="you@riverside-ceramics.com" balance={credit} />

        {/* persistent demo affordances */}
        <div className="absolute top-24 left-4 lg:left-64 z-40 flex items-center gap-2">
          <Badge tone="amber">demo — nothing here is real</Badge>
          <Link href="/apps" className="text-xs text-fg-faint hover:text-fg">Exit ↗</Link>
        </div>
        <div className="absolute top-24 right-6 z-40">
          <Button size="sm" phase="ghost" onClick={() => setAuto((a) => !a)}>{auto ? "Auto-play ▸ I'll drive" : "▸ Auto-play"}</Button>
        </div>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 pt-16">
          <div key={scene} className="max-w-5xl mx-auto scene-in">
            {scene === 0 && <SceneBrief goal={goal} setGoal={(g) => { takeOver(); setGoal(g); }} onBuild={() => go(1)} />}
            {scene === 1 && <SceneRun run={run} goal={goal} onNext={() => go(2)} />}
            {scene === 2 && <ScenePublish appName={appName} setAppName={(v) => { takeOver(); setAppName(v); }} weekly={weekly} setWeekly={(v) => { takeOver(); setWeekly(v); }} published={published} onPublish={() => { setPublished(true); }} onOpen={() => go(3)} />}
            {scene === 3 && <SceneMyApps appName={appName} weekly={weekly} onNext={() => go(4)} />}
            {scene === 4 && <SceneMornings appName={appName} weekly={weekly} extraRuns={morningRuns} credit={credit} onAdvance={() => setMorningRuns((m) => m + 1)} onNext={() => go(5)} />}
            {scene === 5 && <SceneClose onReplay={replay} />}
          </div>
        </main>
      </div>

      <ActRail scene={scene} onJump={(act) => { takeOver(); go(SCENE_ACT.indexOf(act)); }} />

      {/* manual nav */}
      <div className="fixed bottom-5 right-6 z-30 flex gap-2">
        <Button size="sm" phase="ghost" onClick={() => { takeOver(); go(scene - 1); }} disabled={scene === 0}>← Back</Button>
        <Button size="sm" phase="ghost" onClick={() => { takeOver(); go(scene + 1); }} disabled={scene === SCENES.length - 1}>Next →</Button>
      </div>
    </div>
  );
}

/* ----------------------------- scenes ----------------------------- */
function ConsultantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid place-items-center size-9 rounded-full bg-amber-soft text-amber font-title font-bold shrink-0">a</span>
      <div className="squircle rounded-3 bg-bg-elev border border-line px-4 py-3 text-fg-muted">{children}</div>
    </div>
  );
}

function SceneBrief({ goal, setGoal, onBuild }: { goal: string; setGoal: (g: string) => void; onBuild: () => void }) {
  const goals = ["more local customers", "more sign-ups", "more online sales", "more bookings"];
  return (
    <div className="grid lg:grid-cols-[5fr_7fr] gap-8 items-start">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Apps</h1>
        <p className="text-fg-muted">Pick an app, answer a few questions with the consultant, see it run for real, then publish.</p>
        <div className="squircle rounded-4 border border-line bg-bg-elev p-5 space-y-2">
          <div className="flex items-center gap-2"><span className="text-2xl">📈</span><span className="font-title font-medium">SEO &amp; GEO Optimizer</span></div>
          <p className="text-sm text-fg-muted">A specialist team audits your site for Google search AND AI answers, then hands you a prioritized plain-language plan.</p>
          <p className="num text-xs text-fg-faint">≈ $0.06 per run · SEO</p>
        </div>
      </div>

      <div className="space-y-5">
        <ConsultantBubble>Fill in the blanks, then I&apos;ll run it once so you can see the real thing before it goes live.</ConsultantBubble>
        <div className="squircle rounded-4 border border-line bg-bg-elev p-6 space-y-5">
          <p className="text-xl leading-[2.2] font-title">
            Check <Chip>{PERSONA.site}</Chip> for how well it ranks, aimed at getting{" "}
            <select value={goal} onChange={(e) => setGoal(e.target.value)} className="bg-amber-soft border-b-2 border-amber/60 text-amber rounded-1 px-1 outline-none">
              {goals.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>{" "}
            , compared against <Chip>{PERSONA.rivals}</Chip>, and tell me the top <Chip>3</Chip> things to fix first.
          </p>
          <p className="text-sm text-green">4 of 4 blanks filled — this runs it once, for real, so you can see what you&apos;d get.</p>
          <div className="flex items-center gap-3">
            <Button phase="green" size="lg" className="glow-coral" onClick={onBuild}>Build &amp; try</Button>
            <span className="text-sm text-fg-faint">Trying it costs about <span className="num">${RUN_COST.toFixed(2)}</span> · credit <span className="num">${START_CREDIT.toFixed(2)}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
function Chip({ children }: { children: ReactNode }) {
  return <span className="bg-amber-soft border-b-2 border-amber/60 text-amber rounded-1 px-1.5 num">{children}</span>;
}

function SceneRun({ run, goal, onNext }: { run: ReturnType<typeof useMockRun>; goal: string; onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Your team is on it</h1>
        <p className="text-fg-muted">A whole crew of specialists — working for you right now, for about six cents. Aiming for <span className="text-fg">{goal}</span>.</p>
      </div>
      <RunProgress frames={run.frames} running={run.running} />

      {run.done && (
        <div className="space-y-4 scene-in">
          <div className="flex items-center justify-between gap-3 flex-wrap border-t border-line pt-6">
            <h2 className="text-2xl font-medium">Here&apos;s what it made</h2>
            <span className="text-sm text-fg-faint">demo data · Which AI did the work: Claude · cost <span className="num">${RUN_COST.toFixed(2)}</span></span>
          </div>
          <ResultView output={SEO_RESULT} schema="seo_report" isMock />
          <div className="flex justify-end"><Button phase="green" onClick={onNext}>Happy with it? →</Button></div>
        </div>
      )}
    </div>
  );
}

function ScenePublish({ appName, setAppName, weekly, setWeekly, published, onPublish, onOpen }: { appName: string; setAppName: (v: string) => void; weekly: boolean; setWeekly: (v: boolean) => void; published: boolean; onPublish: () => void; onOpen: () => void }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Make it yours</h1>
        <p className="text-fg-muted">That try-out was the real run. Publish it and it lives in My Apps — ready whenever you are.</p>
      </div>

      {!published ? (
        <Card className="space-y-5 border-green/30">
          <div>
            <CardTitle>Happy with it?</CardTitle>
            <CardHint>Runs here in the app. Publishing keeps it in My Apps.</CardHint>
          </div>
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-fg-faint">Name this app</span>
            <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
          </label>
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-fg-faint">How often?</span>
            <div className="flex flex-wrap gap-2">
              {[{ k: false, label: "Runs once" }, { k: true, label: "Every week" }].map((o) => (
                <button key={o.label} type="button" onClick={() => setWeekly(o.k)}
                  className={cn("squircle rounded-2 border px-4 py-2 text-sm transition", weekly === o.k ? "border-green bg-green-soft text-green" : "border-line text-fg-muted hover:border-green")}>
                  {o.label}
                </button>
              ))}
            </div>
            {weekly && <p className="reflect text-fg-muted">Now you never do this again.</p>}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button phase="green" size="lg" onClick={onPublish}>Publish to My Apps</Button>
            <Button phase="ghost">Change answers</Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-3 border-green/30 bg-green-soft text-center">
          <p className="text-4xl">✓</p>
          <CardTitle>It&apos;s in My Apps.</CardTitle>
          <CardHint>{weekly ? "It'll run every week, on its own." : "Run it whenever you like."}</CardHint>
          <div><Button phase="green" onClick={onOpen}>Open it in My Apps →</Button></div>
        </Card>
      )}
    </div>
  );
}

function SceneMyApps({ appName, weekly, onNext }: { appName: string; weekly: boolean; onNext: () => void }) {
  return (
    <div className="grid lg:grid-cols-[4fr_8fr] gap-8 items-start">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your apps, live</h1>
          <p className="text-fg-muted text-sm">Run them, tweak them, feed them your data.</p>
        </div>
        <div className="squircle rounded-4 border border-green/40 bg-bg-elev p-5 space-y-2 scene-in glow-coral">
          <div className="flex items-center gap-2"><span className="text-xl">📈</span><span className="font-title font-medium">{appName}</span><Badge tone="green">Live</Badge></div>
          <p className="text-xs text-fg-faint">SEO/GEO</p>
          <p className="text-xs text-fg-muted num">{weekly ? "Every week · next in 3 days" : "Runs once"} · 1 run · last billed $0.06</p>
        </div>
      </div>

      <div className="squircle rounded-4 border border-line bg-bg-elev p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📈</span>
          <div>
            <h2 className="text-2xl font-medium">{appName}</h2>
            <p className="text-sm text-fg-muted num">SEO/GEO · {weekly ? "Every week, here in the app · next run in 3 days" : "Runs once"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button phase="green">Run now</Button>
          <Button phase="ghost">Change answers</Button>
          <Button phase="ghost">Feed it data</Button>
        </div>
        <div className="border-t border-line pt-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Run history</p>
          <div className="flex items-center gap-3 text-sm">
            <Badge tone="green">done</Badge><span className="text-fg-muted">First run · health 82/100</span>
            <span className="ml-auto num text-fg-faint">just now · $0.06</span>
          </div>
        </div>
        <p className="reflect text-fg-muted pt-2">This is yours now. Run it whenever — or let it run itself.</p>
        <div className="flex justify-end"><Button phase="green" onClick={onNext}>See it run itself →</Button></div>
      </div>
    </div>
  );
}

function SceneMornings({ appName, weekly, extraRuns, credit, onAdvance, onNext }: { appName: string; weekly: boolean; extraRuns: number; credit: number; onAdvance: () => void; onNext: () => void }) {
  const weeks = useMemo(() => ["This week", "Next week", "In 2 weeks", "In 3 weeks", "In 4 weeks"], []);
  const runs = Math.min(weeks.length, 1 + extraRuns);
  const advance = () => { if (runs < weeks.length) onAdvance(); };
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">It runs itself</h1>
        <p className="text-fg-muted">You thought it through once. It&apos;s been thinking for you ever since — every {weekly ? "week" : "run"}, for a few cents, while you sleep.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {weeks.map((w, i) => {
          const ran = i < runs;
          return (
            <div key={w} className={cn("squircle rounded-3 border p-4 space-y-2 text-center transition", ran ? "border-amber/50 bg-amber-soft/40" : "border-line bg-bg-elev")}>
              <p className="text-xs text-fg-faint">{w}</p>
              <div className={cn("mx-auto size-10 rounded-full grid place-items-center num text-sm", ran ? "border-2 border-amber text-amber" : "border border-line text-fg-faint")}>{ran ? "✓" : "·"}</div>
              <p className="text-[11px] text-fg-muted leading-tight">{ran ? `${appName} · 7:02am` : "scheduled"}</p>
              {ran && <p className="text-[10px] num text-fg-faint">health 82 · $0.06</p>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 text-sm">
        <span className="text-fg-muted"><span className="num text-fg text-lg">{runs}</span> mornings it ran itself</span>
        <span className="text-fg-muted">spent <Money usd={runs * RUN_COST} className="text-fg" /> total</span>
        <span className="text-fg-muted">credit left <Money usd={credit} className="text-fg" /></span>
      </div>

      <p className="reflect text-center text-fg-muted text-lg">You wake up to it done. You never touched it again.</p>

      <div className="flex justify-center gap-2">
        <Button phase="ghost" onClick={advance} disabled={runs >= weeks.length}>Next week →</Button>
        <Button phase="green" onClick={onNext}>That&apos;s the whole idea →</Button>
      </div>
    </div>
  );
}

function SceneClose({ onReplay }: { onReplay: () => void }) {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="glass squircle rounded-6 border border-line p-10 md:p-14 max-w-xl text-center space-y-5">
        <h1 className="text-4xl font-semibold tracking-tight">That&apos;s all41.</h1>
        <p className="text-xl text-fg-muted">Stop learning AI. Just use it.</p>
        <p className="reflect text-fg-muted text-lg">AI made easy ✿</p>
        <p className="text-sm text-fg-faint">You only pay when it actually runs. Nothing to cancel.</p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link href="/build"><Button phase="green" size="lg" className="glow-coral">Start free</Button></Link>
          <Link href="/apps"><Button phase="ghost" size="lg">See all 6 apps</Button></Link>
          <Button phase="ghost" size="lg" onClick={onReplay}>↺ Replay</Button>
        </div>
      </div>
    </div>
  );
}
