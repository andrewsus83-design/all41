"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";
import { categoryLabel, whoFor } from "./catalog-copy";
import type { CatalogApp } from "@/components/apps/types";

/** Search + category chips + a compact grid. Filters client-side; comfortable at 100+ apps. */
export function CatalogGrid({ apps, selected, onOpen }: { apps: CatalogApp[]; selected: string | null; onOpen: (slug: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const a of apps) if (!a.isCustom) seen.set(a.category ?? "other", (seen.get(a.category ?? "other") ?? 0) + 1);
    return Array.from(seen.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [apps]);
  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      apps.filter((a) => {
        if (cat && !a.isCustom && (a.category ?? "other") !== cat) return false;
        if (cat && a.isCustom) return false;
        if (!needle) return true;
        const hay = [a.name, a.description, a.category ?? "", ...a.tags, a.isCustom ? "start from scratch custom" : ""].join(" ").toLowerCase();
        return needle.split(/\s+/).every((w) => hay.includes(w));
      }),
    [apps, cat, needle],
  );
  return (
    <div className="space-y-4">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps…" aria-label="Search apps" className="h-11" />
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCat(null)} className={cn("squircle h-8 px-3 rounded-1 border text-xs font-title font-medium transition", cat === null ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted hover:text-fg")}>All <span className="num">{apps.length}</span></button>
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCat(cat === c ? null : c)} className={cn("squircle h-8 px-3 rounded-1 border text-xs font-title font-medium transition", cat === c ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted hover:text-fg")}>{categoryLabel(c)}</button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="text-sm text-fg-faint px-1">Nothing matches “{q}”. Try another word, or start from scratch.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {shown.map((a) => (
            <button key={a.slug} type="button" onClick={() => onOpen(a.slug)} className={cn("squircle text-left rounded-3 border bg-bg-elev p-4 space-y-2 transition hover:border-line-strong hover:bg-bg-elev-2", selected === a.slug ? "border-green/50" : a.isCustom ? "border-amber/40" : "border-line")}>
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">{a.icon}</span>
                <span className="font-title font-medium truncate">{a.isCustom ? "Start from scratch" : a.name}</span>
              </div>
              <p className="text-sm text-fg-muted line-clamp-2 min-h-10">{a.description}</p>
              <p className="text-xs text-fg-faint">≈ <Money usd={a.estCostUsd} /> per run{a.category && !a.isCustom ? ` · ${categoryLabel(a.category)}` : ""}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** What it's for · who it's for · how it works · what it asks · typical cost → "Build this". */
export function AppModal({ app, onClose, onBuild }: { app: CatalogApp; onClose: () => void; onBuild: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="app-modal-title" onClick={(e) => e.stopPropagation()} className="squircle w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-5 bg-bg-elev border border-line-strong p-8 space-y-8">
        <div className="flex items-start gap-5">
          <span className="text-5xl leading-none">{app.icon}</span>
          <div className="space-y-1 min-w-0 flex-1">
            <h2 id="app-modal-title" className="text-3xl font-semibold">{app.isCustom ? "Start from scratch" : app.name}</h2>
            <p className="text-fg-muted">{app.description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-fg-faint hover:text-fg text-2xl leading-none">×</button>
        </div>

        <section className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Who it&apos;s for</p>
          <p className="reflect text-fg">{whoFor(app.slug, app.whoFor)}</p>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-fg-faint">How it works</p>
          <ol className="space-y-2">
            {app.steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-4">
                <span className="num text-sm text-fg-faint w-5">{i + 1}</span>
                <span>{s.label}</span>
                {s.when && <span className="text-xs text-fg-faint">— only if you ask for fresh information</span>}
              </li>
            ))}
            <li className="flex items-center gap-4"><span className="num text-sm text-fg-faint w-5">{app.steps.length + 1}</span><span>Delivers it where you chose, and keeps a copy in My Apps</span></li>
          </ol>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-fg-faint">What it asks you</p>
          <ul className="space-y-1.5 text-fg-muted">
            {app.questions.map((q) => <li key={q.key}>· {q.question}</li>)}
          </ul>
        </section>

        <section className="flex items-center justify-between gap-6 flex-wrap pt-2 border-t border-line">
          <div>
            <p className="text-xs uppercase tracking-wide text-fg-faint">Typical cost per run</p>
            <p className="text-2xl">≈ <Money usd={app.estCostUsd} /></p>
            <p className="text-xs text-fg-faint">You only pay when it actually runs.</p>
          </div>
          <Button phase="green" size="lg" onClick={onBuild}>Build this</Button>
        </section>
      </div>
    </div>
  );
}
