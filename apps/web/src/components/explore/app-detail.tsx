"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { autonomyLine, categoryLabel, costPrefix, whoFor } from "@/components/build/catalog-copy";
import type { CatalogApp } from "@/components/apps/types";

/** A full-screen, Typeform-style app detail — big and focused, close top-right, one clear CTA. */
export function AppDetail({ app, onClose, onBuild }: { app: CatalogApp; onClose: () => void; onBuild: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const cost = costPrefix(app.slug, app.steps);

  return (
    <div className="fixed inset-0 z-[88] bg-bg flex flex-col scene-in" role="dialog" aria-modal="true" aria-label={app.name}>
      {/* top bar */}
      <div className="shrink-0 flex items-center justify-between gap-4 p-4 md:p-5">
        <span className="text-sm text-fg-faint font-title">{app.category ? categoryLabel(app.category) : "all41"}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="size-10 rounded-full grid place-items-center text-fg-faint hover:text-fg hover:bg-bg-elev-2 transition">✕</button>
      </div>

      {/* scrolling body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 pb-40 md:pb-44 space-y-10">
          <header className="space-y-4 pt-4">
            <span className="grid place-items-center size-20 rounded-4 bg-bg-elev-2 text-5xl leading-none">{app.icon}</span>
            <h1 className="text-4xl md:text-5xl font-title font-semibold tracking-tight text-pretty">{app.isCustom ? "Start from scratch" : app.name}</h1>
            <p className="text-xl text-fg-muted leading-relaxed text-pretty">{app.description}</p>
          </header>

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-fg-faint">Who it&apos;s for</p>
            <p className="reflect text-fg text-2xl leading-snug">{whoFor(app.slug, app.whoFor)}</p>
          </section>

          <section className="space-y-4">
            <p className="text-xs uppercase tracking-wide text-fg-faint">How it works</p>
            <ol className="space-y-3">
              {app.steps.map((s, i) => (
                <li key={s.id} className="flex items-start gap-4">
                  <span className="num text-sm text-fg-faint w-6 pt-1 shrink-0">{i + 1}</span>
                  <span className="text-lg">{s.label}{s.when && <span className="text-sm text-fg-faint"> — only if you ask for fresh information</span>}</span>
                </li>
              ))}
              <li className="flex items-start gap-4">
                <span className="num text-sm text-fg-faint w-6 pt-1 shrink-0">{app.steps.length + 1}</span>
                <span className="text-lg">Delivers it where you chose, and keeps a copy in My Apps</span>
              </li>
            </ol>
            {!app.isCustom && <p className="text-sm text-fg-muted pt-1">{autonomyLine(app.slug, app.steps)}</p>}
          </section>

          {app.questions.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-fg-faint">What it asks you</p>
              <ul className="space-y-2 text-lg text-fg-muted">
                {app.questions.map((q) => <li key={q.key} className="flex gap-3"><span className="text-fg-faint">·</span>{q.question}</li>)}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* sticky CTA bar */}
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-bg/90 backdrop-blur">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-fg-faint">{cost === "up to" ? "Most per run" : "Typical per run"}</p>
            <p className="text-xl font-title">{cost} <Money usd={app.estCostUsd} /></p>
          </div>
          <Button phase="green" size="lg" className="glow-coral" onClick={onBuild}>{app.isCustom ? "Start building →" : `Try ${app.name.split(" ")[0]} →`}</Button>
        </div>
      </div>
    </div>
  );
}
