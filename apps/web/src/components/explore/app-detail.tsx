"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResultView } from "@/components/result-view";
import { DEMO_RESULTS } from "@/content/demo-results";
import { categoryLabel, costPrefix, whoFor } from "@/components/build/catalog-copy";
import type { CatalogApp } from "@/components/apps/types";

/** A locked one-page app cover — sharp and straightforward, two CTAs: Use now · Sample.
 * "Sample" flips in-place to a real example of the result (canned demo data, nothing charged). */
export function AppDetail({ app, onClose, onBuild }: { app: CatalogApp; onClose: () => void; onBuild: () => void }) {
  const [view, setView] = useState<"cover" | "sample">("cover");
  const demo = DEMO_RESULTS[app.slug] ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (view === "sample") setView("cover"); else onClose(); } };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, view]);

  const cost = costPrefix(app.slug, app.steps);

  if (view === "sample" && demo) {
    return (
      <div className="fixed inset-0 z-[88] bg-bg flex flex-col scene-in" role="dialog" aria-modal="true" aria-label={`${app.name} sample`}>
        <div className="shrink-0 flex items-center justify-between gap-4 p-4 md:p-5 border-b border-line">
          <button type="button" onClick={() => setView("cover")} className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition">← Back</button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg leading-none">{app.icon}</span>
            <span className="font-title font-medium truncate">{app.name}</span>
            <span className="text-xs text-fg-faint hidden sm:inline">· sample · nothing charged</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="size-12 rounded-full grid place-items-center text-fg-muted hover:text-fg bg-bg-elev border border-line hover:bg-bg-elev-2 transition text-xl shrink-0">✕</button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6 pb-28 space-y-4">
            <p className="text-sm text-fg-muted">This is a real example of what <span className="text-fg font-medium">{app.name}</span> produces — canned demo data, so you can see the shape before you run it.</p>
            <ResultView output={demo.result} schema={demo.schema} isMock />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-line bg-bg/90 backdrop-blur">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setView("cover")} className="text-sm text-fg-muted hover:text-fg transition">← Overview</button>
            <Button phase="green" size="lg" className="glow-coral" onClick={onBuild}>Use now →</Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- the locked one-page cover ----
  return (
    <div className="fixed inset-0 z-[88] bg-bg flex flex-col scene-in overflow-hidden" role="dialog" aria-modal="true" aria-label={app.name}>
      <div className="shrink-0 flex items-center justify-between gap-4 p-4 md:p-5">
        <span className="text-sm text-fg-faint font-title">{app.category ? categoryLabel(app.category) : "all41"}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="size-10 rounded-full grid place-items-center text-fg-faint hover:text-fg hover:bg-bg-elev-2 transition">✕</button>
      </div>

      <div className="flex-1 min-h-0 grid place-items-center px-6">
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
            {demo && <Button phase="ghost" size="lg" onClick={() => setView("sample")}>See a sample</Button>}
          </div>
          <p className="text-xs text-fg-faint">Runs once so you can see the real thing — you only pay when it actually runs.</p>
        </div>
      </div>
    </div>
  );
}
