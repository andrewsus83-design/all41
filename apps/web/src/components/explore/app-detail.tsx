"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResultView } from "@/components/result-view";
import { DEMO_EXAMPLES } from "@/content/demo-results";
import { categoryLabel, costPrefix, whoFor } from "@/components/build/catalog-copy";
import { cn } from "@/lib/cn";
import type { CatalogApp } from "@/components/apps/types";

/** Large sheet modal over a dimmed Explore. A locked one-page cover (Use now · See samples),
 * then a swipeable gallery of finished, real examples (canned demo data, nothing charged). */
export function AppDetail({ app, onClose, onBuild }: { app: CatalogApp; onClose: () => void; onBuild: () => void }) {
  const [view, setView] = useState<"cover" | "sample">("cover");
  const [ex, setEx] = useState(0);
  const examples = DEMO_EXAMPLES[app.slug] ?? [];
  const bodyRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const go = (d: number) => {
    if (examples.length < 2) return;
    setEx((i) => (i + d + examples.length) % examples.length);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };
  const jump = (i: number) => { setEx(i); if (bodyRef.current) bodyRef.current.scrollTop = 0; };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (view === "sample") setView("cover"); else onClose(); }
      if (view === "sample") { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, view, examples.length]);

  const cost = costPrefix(app.slug, app.steps);
  const cur = examples[Math.min(ex, Math.max(0, examples.length - 1))];

  // shared modal frame: dimmed backdrop + centered sheet (full-screen on small phones)
  const sheet = "relative w-full bg-bg border border-line shadow-lift flex flex-col overflow-hidden scene-in h-full sm:h-auto sm:squircle sm:rounded-5";

  if (view === "sample" && cur) {
    return (
      <div className="fixed inset-0 z-[88] flex items-stretch sm:items-center justify-center p-0 sm:p-4 md:p-6">
        <div className="absolute inset-0 bg-fg/50 backdrop-blur-sm scene-in" onClick={onClose} aria-hidden />
        <div role="dialog" aria-modal="true" aria-label={`${app.name} samples`} className={cn(sheet, "max-w-5xl sm:h-[92vh]")}>
          {/* top bar */}
          <div className="shrink-0 flex items-center justify-between gap-4 p-4 md:p-5 border-b border-line">
            <button type="button" onClick={() => setView("cover")} className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition">← Back</button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg leading-none">{app.icon}</span>
              <span className="font-title font-medium truncate">{app.name}</span>
              <span className="text-xs text-fg-faint num hidden sm:inline">· example {ex + 1} of {examples.length} · nothing charged</span>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="size-12 rounded-full grid place-items-center text-fg-muted hover:text-fg bg-bg-elev border border-line hover:bg-bg-elev-2 transition text-xl shrink-0">✕</button>
          </div>

          {/* example tabs */}
          {examples.length > 1 && (
            <div className="shrink-0 flex items-center gap-2 overflow-x-auto px-4 md:px-5 py-2.5 border-b border-line">
              {examples.map((e, i) => (
                <button key={i} type="button" onClick={() => jump(i)} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-sm font-title font-medium transition border", i === ex ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted hover:text-fg")}>{e.label}</button>
              ))}
            </div>
          )}

          {/* body — swipeable */}
          <div
            ref={bodyRef}
            className="flex-1 min-h-0 overflow-y-auto"
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); touchX.current = null; }}
          >
            <div key={ex} className="max-w-2xl mx-auto px-5 sm:px-6 py-6 space-y-4 slide-fade">
              <p className="text-sm text-fg-muted">A real example of what <span className="text-fg font-medium">{app.name}</span> produces — <span className="text-fg">{cur.label}</span>. Canned demo data, so you can see exactly what you&apos;d get.</p>
              <ResultView output={cur.result} schema={cur.schema} isMock />
            </div>
          </div>

          {/* bottom bar */}
          <div className="shrink-0 border-t border-line bg-bg/95 backdrop-blur">
            <div className="max-w-2xl mx-auto px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
              {examples.length > 1 ? (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => go(-1)} aria-label="Previous example" className="size-9 rounded-full grid place-items-center border border-line text-fg-muted hover:text-fg hover:bg-bg-elev-2 transition">‹</button>
                  <div className="flex items-center gap-1.5">
                    {examples.map((_, i) => <button key={i} type="button" onClick={() => jump(i)} aria-label={`Example ${i + 1}`} className={cn("h-1.5 rounded-full transition-all", i === ex ? "w-5 bg-fg" : "w-1.5 bg-line-strong hover:bg-fg-faint")} />)}
                  </div>
                  <button type="button" onClick={() => go(1)} aria-label="Next example" className="size-9 rounded-full grid place-items-center border border-line text-fg-muted hover:text-fg hover:bg-bg-elev-2 transition">›</button>
                </div>
              ) : <span />}
              <Button phase="green" size="lg" className="glow-coral" onClick={onBuild}>Use now →</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- one-page cover ----
  return (
    <div className="fixed inset-0 z-[88] flex items-stretch sm:items-center justify-center p-0 sm:p-4 md:p-6">
      <div className="absolute inset-0 bg-fg/50 backdrop-blur-sm scene-in" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={app.name} className={cn(sheet, "max-w-2xl sm:max-h-[92vh]")}>
        <div className="shrink-0 flex items-center justify-between gap-4 p-4 md:p-5">
          <span className="text-sm text-fg-faint font-title">{app.category ? categoryLabel(app.category) : "all41"}</span>
          <button type="button" onClick={onClose} aria-label="Close" className="size-12 rounded-full grid place-items-center text-fg-muted hover:text-fg bg-bg-elev border border-line hover:bg-bg-elev-2 transition text-xl shrink-0">✕</button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto grid place-items-center px-6 py-6">
          <div className="w-full max-w-xl text-center space-y-6">
            <span className="grid place-items-center size-24 mx-auto rounded-4 bg-bg-elev-2 text-6xl leading-none">{app.icon}</span>
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-title font-semibold tracking-tight text-pretty">{app.isCustom ? "Start from scratch" : app.name}</h1>
              <p className="text-lg text-fg-muted leading-relaxed text-pretty">{app.description}</p>
            </div>
            {!app.isCustom && <p className="reflect text-fg text-xl leading-snug">{whoFor(app.slug, app.whoFor)}</p>}
            <div className="flex items-center justify-center gap-2 text-sm text-fg-faint num">
              {app.category && <span>{categoryLabel(app.category)}</span>}
              {app.category && <span aria-hidden>·</span>}
              <span>{cost} <Money usd={app.estCostUsd} /> per run</span>
              <span aria-hidden>·</span>
              <span>{app.steps.length + 1} steps</span>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              <Button phase="green" size="lg" className="glow-coral" onClick={onBuild}>Use now →</Button>
              {examples.length > 0 && <Button phase="ghost" size="lg" onClick={() => { setEx(0); setView("sample"); }}>See {examples.length > 1 ? `${examples.length} samples` : "a sample"}</Button>}
            </div>
            <p className="text-xs text-fg-faint">Runs once so you can see the real thing — you only pay when it actually runs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
