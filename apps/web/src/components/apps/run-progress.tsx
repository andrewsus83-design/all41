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
    return "Writing…";
  }
  if (phase === "skipped") return `Skipped — ${label.toLowerCase()} wasn’t needed this time`;
  return label;
}

/** Plain-words progress lines for a live run. */
export function RunProgress({ frames, running }: { frames: RunFrame[]; running: boolean }) {
  return (
    <div className="space-y-2">
      {frames.map((f, i) => {
        if (f.step === "start") return <div key={i} className={cn(base, "border-line bg-bg-elev")}><Dot tone="amber" /><span className="text-fg-muted">{f.preview ? "Trying it out — this is a real run, so you can see exactly what you’d get." : "Starting the run."}</span></div>;
        if (f.step === "data") return <div key={i} className={cn(base, "border-line bg-bg-elev")}><Dot tone="amber" /><span>Reading your attached data · <span className="num">{f.sources}</span> {f.sources === 1 ? "source" : "sources"}</span></div>;
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
        if (f.step === "done") return <div key={i} className={cn(base, "border-green/30 bg-green-soft")}><Dot tone="green" /><span>Done · this run cost <Money usd={f.billedUsd} /></span><span className="ml-auto text-sm">credit left <Money usd={f.balance} /></span></div>;
        if (f.step === "blocked") return <div key={i} className={cn(base, "border-red/40 bg-red-soft text-red")}><span>{f.message}</span><Link href="/settings/billing" className="ml-auto underline whitespace-nowrap">Top up</Link></div>;
        if (f.step === "error") return <div key={i} className={cn(base, "border-red/40 bg-red-soft text-red")}><span>This run didn’t finish: {f.message}</span></div>;
        return null;
      })}
      {running && frames.length === 0 && <p className="text-fg-muted pulse-soft text-sm px-2">Getting ready…</p>}
    </div>
  );
}
