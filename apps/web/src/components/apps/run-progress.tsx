"use client";
import Link from "next/link";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";
import type { RunFrame } from "./types";

function Dot({ tone, pulse }: { tone: "green" | "amber" | "red" | "faint"; pulse?: boolean }) {
  return <span className={cn("inline-block size-2.5 rounded-full shrink-0", tone === "green" ? "bg-green" : tone === "amber" ? "bg-amber" : tone === "red" ? "bg-red" : "bg-fg-faint", pulse && "pulse-soft")} />;
}

const base = "flex items-center gap-4 px-6 py-4 rounded-3 border squircle";

function stepVerb(kind: string, label: string, phase: string) {
  if (phase === "running") {
    if (kind === "search") return "Looking things up…";
    if (kind === "crawl") return "Reading…";
    if (kind === "agent") return "Working through it…";
    return "Writing…";
  }
  if (phase === "skipped") return `Skipped — ${label.toLowerCase()} wasn’t needed this time`;
  return label;
}

/** Plain words for what the agent is doing with a tool. */
function toolVerb(tool: string, input: string, done: boolean) {
  const what = input.trim() ? ` “${input.trim().slice(0, 70)}${input.trim().length > 70 ? "…" : ""}”` : "";
  switch (tool) {
    case "search": return done ? `looked up${what}` : `looking up${what}`;
    case "crawl": return done ? `read${what}` : `reading${what}`;
    case "graph": return done ? `checked your connected knowledge for${what}` : `checking your connected knowledge for${what}`;
    case "user_data": return done ? "read your attached data" : "reading your attached data";
    default: return done ? "done" : "working";
  }
}

function stopLine(reason: string, of: number, ceilingUsd: number) {
  if (reason === "step_cap") return `Stopped early: reached the step limit (${of} steps) — here’s what it found so far.`;
  if (reason === "credit_ceiling") return `Stopped early: reached the spend limit ($${ceilingUsd.toFixed(2)}) — here’s what it found so far.`;
  return "Has what it needs — writing it up.";
}

function verifyLine(verdict: string, conflicts: number) {
  if (verdict === "supported") return "Double-checked against its sources — it holds up.";
  if (verdict === "partially_supported") return "Double-checked against its sources — some points couldn’t be confirmed; they’re marked in the result.";
  if (verdict === "conflicts_found") return `Double-checked against its sources — found ${conflicts} ${conflicts === 1 ? "conflict" : "conflicts"}. Read those parts with care.`;
  return "Skipped the double-check to stay inside the spend limit.";
}

/** crew.gate — the Verifier's final word, in plain language. */
function gateLine(verdict: string, conflicts: number) {
  if (verdict === "supported") return "Double-checked ✓ — every claim holds up against its sources.";
  if (verdict === "partially_supported") return `Double-checked — flagged ${conflicts} ${conflicts === 1 ? "thing" : "things"} we couldn’t confirm; they’re in the report.`;
  if (verdict === "conflicts_found") return `Double-checked — flagged ${conflicts} ${conflicts === 1 ? "thing" : "things"} that didn’t line up; read those with care.`;
  return "Skipped the double-check to stay inside the spend limit.";
}

type AgentRow = { n: number; of: number; thought: string; tool?: string; input?: string; done: boolean; spentUsd?: number };
type CrewRow = { id: string; label: string; done: boolean; billedSoFar?: number; findings?: number };

/**
 * One line per agent step: plan → tool → observe frames for the same step number fold into a single row,
 * so a 12-step run reads as 12 lines, not 36. Stop/verify frames stay as their own lines.
 */
type FoldedFrame = RunFrame | { step: "agent.row"; row: AgentRow } | { step: "crew.row"; row: CrewRow };
function foldFrames(frames: RunFrame[]): FoldedFrame[] {
  const out: FoldedFrame[] = [];
  const rows = new Map<number, AgentRow>();
  const crewRows = new Map<string, CrewRow>();
  for (const f of frames) {
    if (f.step === "agent.plan") {
      const row: AgentRow = { n: f.n, of: f.of, thought: f.thought, done: false };
      rows.set(f.n, row);
      out.push({ step: "agent.row", row });
    } else if (f.step === "agent.tool") {
      const row = rows.get(f.n);
      if (row) { row.tool = f.tool; row.input = f.input; }
    } else if (f.step === "agent.observe") {
      const row = rows.get(f.n);
      if (row) { row.done = true; row.spentUsd = f.spentUsd; }
    } else if (f.step === "crew.agent") {
      // Each specialist folds into one row: first "running" event opens it, "done" closes it.
      const existing = crewRows.get(f.id);
      if (!existing) {
        const row: CrewRow = { id: f.id, label: f.label, done: f.phase === "done", billedSoFar: f.billedSoFar, findings: f.findings };
        crewRows.set(f.id, row);
        out.push({ step: "crew.row", row });
      } else {
        existing.label = f.label;
        if (f.phase === "done") { existing.done = true; existing.billedSoFar = f.billedSoFar; existing.findings = f.findings; }
      }
    } else out.push(f);
  }
  return out;
}

/** Plain-words progress lines for a live run. */
export function RunProgress({ frames, running }: { frames: RunFrame[]; running: boolean }) {
  const lines = foldFrames(frames);
  return (
    <div className="space-y-2">
      {lines.map((f, i) => {
        if (f.step === "start") return <div key={i} className={cn(base, "border-line bg-bg-elev")}><Dot tone="amber" /><span className="text-fg-muted">{f.preview ? "Trying it out — this is a real run, so you can see exactly what you’d get." : "Starting the run."}</span></div>;
        if (f.step === "data") return <div key={i} className={cn(base, "border-line bg-bg-elev")}><Dot tone="amber" /><span>Reading your attached data · <span className="num">{f.sources}</span> {f.sources === 1 ? "source" : "sources"}</span></div>;
        if (f.step === "step" && f.kind === "crew") {
          // Group header for a crew step — the specialist rows fold in beneath it.
          const runningNow = f.phase === "running";
          if (f.phase === "skipped") return null;
          return (
            <div key={i} className={cn(base, f.phase === "done" ? "border-green/30 bg-bg-elev" : "border-line bg-bg-elev")}>
              <Dot tone={f.phase === "done" ? "green" : "amber"} pulse={runningNow} />
              <span className={cn("font-title", runningNow && "pulse-soft")}>{runningNow ? "Your team of specialists is on it…" : "Your team of specialists finished"}</span>
              <span className="ml-auto text-sm text-fg-muted">so far <Money usd={f.billedSoFar} /></span>
            </div>
          );
        }
        if (f.step === "crew.row") {
          const r = f.row;
          const working = !r.done && running;
          return (
            <div key={i} className={cn(base, "border-line bg-bg-elev ml-6")}>
              <Dot tone={r.done ? "green" : "amber"} pulse={working} />
              <span className={cn("min-w-0", working && "pulse-soft")}>
                {r.label}{working ? "…" : ""}
                {r.done && r.findings ? <span className="text-fg-faint"> · found <span className="num">{r.findings}</span></span> : null}
              </span>
              {r.done && r.billedSoFar !== undefined && <span className="ml-auto text-sm text-fg-muted whitespace-nowrap">so far <Money usd={r.billedSoFar} /></span>}
            </div>
          );
        }
        if (f.step === "crew.gate") {
          const bad = f.verdict === "conflicts_found";
          const supported = f.verdict === "supported";
          return (
            <div key={i} className={cn(base, "ml-6", bad ? "border-red/40 bg-red-soft text-red" : supported ? "border-green/30 bg-green-soft" : "border-line bg-bg-elev")}>
              <Dot tone={bad ? "red" : supported ? "green" : "amber"} />
              <span>{gateLine(f.verdict, f.conflicts)}</span>
            </div>
          );
        }
        if (f.step === "step") {
          const runningNow = f.phase === "running";
          return (
            <div key={i} className={cn(base, f.phase === "done" ? "border-green/30 bg-bg-elev" : "border-line bg-bg-elev")}>
              <Dot tone={f.phase === "done" ? "green" : f.phase === "skipped" ? "faint" : "amber"} pulse={runningNow} />
              <span className={cn(f.phase === "skipped" && "text-fg-faint", runningNow && "pulse-soft")}>{stepVerb(f.kind, f.label, f.phase)}</span>
              {f.phase !== "skipped" && <span className="ml-auto text-sm text-fg-muted">so far <Money usd={f.billedSoFar} /></span>}
            </div>
          );
        }
        if (f.step === "agent.row") {
          const r = f.row;
          const working = !r.done && running;
          return (
            <div key={i} className={cn(base, "border-line bg-bg-elev ml-6")}>
              <Dot tone={r.done ? "green" : "amber"} pulse={working} />
              <span className={cn("min-w-0", working && "pulse-soft")}>
                <span className="text-fg-muted">Step <span className="num">{r.n}</span> of <span className="num">{r.of}</span></span>
                {r.tool ? <> · {toolVerb(r.tool, r.input ?? "", r.done)}</> : r.thought ? <> · <span className="text-fg-muted">{r.thought.slice(0, 120)}</span></> : null}
              </span>
              {r.done && r.spentUsd !== undefined && <span className="ml-auto text-sm text-fg-muted whitespace-nowrap">so far <Money usd={r.spentUsd} /></span>}
            </div>
          );
        }
        if (f.step === "agent.stop") {
          const early = f.reason !== "finished";
          return (
            <div key={i} className={cn(base, "ml-6", early ? "border-amber/40 bg-amber-soft" : "border-line bg-bg-elev")}>
              <Dot tone={early ? "amber" : "green"} />
              <span>{stopLine(f.reason, f.of, f.ceilingUsd)}</span>
              <span className="ml-auto text-sm text-fg-muted whitespace-nowrap"><span className="num">{f.n}</span> of <span className="num">{f.of}</span> steps · <Money usd={f.spentUsd} /> of <Money usd={f.ceilingUsd} /></span>
            </div>
          );
        }
        if (f.step === "agent.verify") {
          const bad = f.verdict === "conflicts_found";
          return (
            <div key={i} className={cn(base, "ml-6", bad ? "border-red/40 bg-red-soft text-red" : f.verdict === "supported" ? "border-green/30 bg-bg-elev" : "border-line bg-bg-elev")}>
              <Dot tone={bad ? "red" : f.verdict === "supported" ? "green" : "faint"} />
              <span>{verifyLine(f.verdict, f.conflicts)}</span>
            </div>
          );
        }
        if (f.step === "done") return <div key={i} className={cn(base, "border-green/30 bg-green-soft")}><Dot tone="green" /><span>Done · this run cost <Money usd={f.billedUsd} /></span><span className="ml-auto text-sm">credit left <Money usd={f.balance} /></span></div>;
        if (f.step === "blocked") return <div key={i} className={cn(base, "border-red/40 bg-red-soft text-red")}><span>{f.message}</span><Link href="/settings/billing" className="ml-auto underline whitespace-nowrap">Top up</Link></div>;
        if (f.step === "error") return <div key={i} className={cn(base, "border-red/40 bg-red-soft text-red")}><span>This run didn’t finish: {f.message}</span></div>;
        return null;
      })}
      {running && frames.length === 0 && <p className="text-fg-muted pulse-soft text-sm px-2">Getting ready…</p>}
    </div>
  );
}
