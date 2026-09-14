"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ConfidenceBadge } from "@/components/result-view";

/** Client-safe shapes for the `website_report` schema (see lib/engine/schemas.ts). All fields optional-guarded. */
type Page = {
  type?: string;
  slug?: string;
  headline?: string;
  subhead?: string;
  value_prop?: string;
  proof?: string[];
  cta?: string;
  cta_href?: string;
  has_nav?: boolean;
};
type Style = { palette?: string[]; typography?: string; tone?: string; layout?: string };
type SeoGeo = { summary?: string; schema_present?: boolean; geo_notes?: string[] };
type Source = { ref?: string; quote?: string };
export type WebsiteReportData = {
  live_url?: string;
  status?: "live" | "deploy_pending" | "failed";
  subdomain?: string;
  pages?: Page[];
  style?: Style;
  seo_geo_baseline?: SeoGeo;
  conversion_notes?: string[];
  checkout_linked?: boolean;
  render_note?: string;
  flags?: string[];
  sources?: Source[];
  confidence?: number;
};

type Verdict = { verdict?: string; conflicts?: string[] } | null | undefined;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const hex = (s: string | undefined, fallback: string) => (s && /^#?[0-9a-fA-F]{3,8}$/.test(s.trim()) ? (s.startsWith("#") ? s : `#${s}`) : fallback);

const statusLabel: Record<string, string> = { live: "Live", deploy_pending: "Ready to publish", failed: "Failed" };
const statusTone: Record<string, "green" | "amber" | "red"> = { live: "green", deploy_pending: "amber", failed: "red" };

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Checked against your brand — the site's claims hold up." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Checked — a few claims couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: "Checked — some content didn’t line up with your brand; see the flags below." };
  return null;
}

/** A believable brand mark from the subdomain / url. */
function brandName(r: WebsiteReportData): string {
  const src = (r.subdomain || r.live_url || "your-brand").replace(/^https?:\/\//, "").split(".")[0];
  return src.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Renders one page as a real, styled landing page inside the preview canvas — using the site's own palette. */
function RenderedPage({ page, brand, colors }: { page: Page; brand: string; colors: { ink: string; accent: string; surface: string; onAccent: string; muted: string; card: string } }) {
  const proof = arr<string>(page.proof);
  const nav = page.has_nav;
  return (
    <div style={{ background: colors.surface, color: colors.ink }} className="min-w-0">
      {/* top bar */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: nav ? `1px solid ${colors.ink}14` : "none" }}>
        <span className="font-semibold tracking-tight" style={{ fontSize: 17 }}>{brand}</span>
        {nav ? (
          <nav className="hidden sm:flex items-center gap-5 text-[13px]" style={{ color: colors.muted }}>
            <span>Services</span><span>About</span><span>Reviews</span>
            <span className="px-3 py-1.5 rounded-full text-[13px] font-semibold" style={{ background: colors.accent, color: colors.onAccent }}>{page.cta || "Book"}</span>
          </nav>
        ) : (
          <span className="px-3 py-1.5 rounded-full text-[13px] font-semibold" style={{ background: colors.accent, color: colors.onAccent }}>{page.cta || "Get started"}</span>
        )}
      </div>

      {/* hero */}
      <div className="px-6 sm:px-10 pt-12 pb-10 text-center">
        {page.type && <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: colors.accent }}>{page.type === "Home" ? "Now booking" : page.type}</p>}
        <h1 className="font-bold tracking-tight mx-auto max-w-2xl leading-[1.08]" style={{ fontSize: "clamp(28px, 4.4vw, 44px)" }}>{page.headline || brand}</h1>
        {page.subhead && <p className="mt-4 mx-auto max-w-xl text-[16px] leading-relaxed" style={{ color: colors.muted }}>{page.subhead}</p>}
        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <span className="px-6 py-3 rounded-full text-[15px] font-semibold shadow-sm" style={{ background: colors.accent, color: colors.onAccent }}>{page.cta || "Get started"}</span>
          <span className="px-6 py-3 rounded-full text-[15px] font-medium" style={{ border: `1.5px solid ${colors.ink}22`, color: colors.ink }}>See pricing</span>
        </div>
      </div>

      {/* value prop band */}
      {page.value_prop && (
        <div className="px-6 sm:px-10 py-10" style={{ background: colors.card }}>
          <p className="mx-auto max-w-2xl text-center font-medium leading-snug" style={{ fontSize: "clamp(18px, 2.6vw, 24px)" }}>{page.value_prop}</p>
        </div>
      )}

      {/* proof / social proof */}
      {proof.length > 0 && (
        <div className="px-6 sm:px-10 py-11">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(proof.length, 3)}, minmax(0,1fr))` }}>
            {proof.slice(0, 3).map((p, i) => (
              <div key={i} className="rounded-2xl p-5 text-center" style={{ background: colors.card, border: `1px solid ${colors.ink}0f` }}>
                <span className="block text-[15px] font-semibold leading-snug">{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* final CTA band */}
      <div className="px-6 sm:px-10 py-12 text-center" style={{ background: colors.accent, color: colors.onAccent }}>
        <p className="font-bold tracking-tight mx-auto max-w-xl" style={{ fontSize: "clamp(20px, 3vw, 30px)" }}>{page.headline ? "Ready when you are." : brand}</p>
        <span className="inline-block mt-5 px-6 py-3 rounded-full text-[15px] font-semibold" style={{ background: colors.onAccent, color: colors.accent }}>{page.cta || "Get started"}</span>
      </div>

      {/* footer */}
      <div className="px-6 sm:px-10 py-6 flex items-center justify-between text-[12px]" style={{ color: colors.muted, borderTop: `1px solid ${colors.ink}14` }}>
        <span>© {brand}</span>
        <span>Built with all41</span>
      </div>
    </div>
  );
}

/** Web Builder result — leads with a real, rendered preview of the site (browser frame), then the supporting detail. */
export function WebsiteReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  const [active, setActive] = useState(0);
  if (!report || typeof report !== "object") return null;
  const r = report as WebsiteReportData;
  const pages = arr<Page>(r.pages);
  const style = r.style ?? {};
  const palette = arr<string>(style.palette);
  const seo = r.seo_geo_baseline ?? {};
  const conv = arr<string>(r.conversion_notes);
  const flags = arr<string>(r.flags);
  const sources = arr<Source>(r.sources);
  const status = r.status ?? "deploy_pending";
  const brand = brandName(r);
  const dc = doubleChecked(verification);
  const urlText = (r.live_url || `https://${r.subdomain || "your-brand.all41.app"}`).replace(/^https?:\/\//, "");

  const colors = {
    ink: hex(palette[0], "#1e1c1a"),
    accent: hex(palette[1], "#ff6b5e"),
    surface: "#ffffff",
    card: hex(palette[2], "#f6f1e9"),
    onAccent: "#ffffff",
    muted: "#6b6660",
  };
  const page = pages[Math.min(active, Math.max(0, pages.length - 1))] ?? pages[0];

  return (
    <div className="space-y-8">
      {/* header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={statusTone[status]}>{statusLabel[status] ?? status}</Badge>
          <span className="text-sm text-fg-muted">Here&apos;s the site you&apos;d publish.</span>
        </div>
        <div className="flex items-center gap-2">
          {isMock && <Badge tone="amber">sample</Badge>}
          <ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} />
        </div>
      </div>
      {dc && (
        <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}>
          <span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />{dc.text}
        </p>
      )}

      {/* THE PREVIEW — a browser frame with the rendered site */}
      {page && (
        <div className="squircle rounded-4 overflow-hidden border border-line-strong shadow-lift bg-bg-elev">
          {/* browser chrome */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-line bg-bg-elev-2">
            <div className="flex gap-1.5">
              <span className="size-3 rounded-full bg-red/60" /><span className="size-3 rounded-full bg-amber/60" /><span className="size-3 rounded-full bg-green/60" />
            </div>
            <div className="flex-1 flex items-center gap-2 rounded-full bg-bg border border-line px-3 py-1 text-xs text-fg-muted min-w-0">
              <span aria-hidden>🔒</span><span className="num truncate">{urlText}{page.slug && page.slug !== "/" ? page.slug : ""}</span>
            </div>
            {pages.length > 1 && (
              <div className="hidden sm:flex items-center gap-1">
                {pages.map((p, i) => (
                  <button key={i} type="button" onClick={() => setActive(i)} className={cn("px-2.5 py-1 rounded-full text-xs font-title font-medium transition", i === active ? "bg-fg text-bg" : "text-fg-muted hover:text-fg hover:bg-bg-elev")}>{p.type || `Page ${i + 1}`}</button>
                ))}
              </div>
            )}
          </div>
          {/* rendered site (scrolls within the frame) */}
          <div className="max-h-[560px] overflow-y-auto">
            <RenderedPage page={page} brand={brand} colors={colors} />
          </div>
        </div>
      )}

      {/* mobile page switcher */}
      {pages.length > 1 && (
        <div className="flex sm:hidden gap-2 overflow-x-auto -mx-1 px-1">
          {pages.map((p, i) => (
            <button key={i} type="button" onClick={() => setActive(i)} className={cn("shrink-0 px-3 py-1.5 rounded-full text-sm font-title font-medium border transition", i === active ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted")}>{p.type || `Page ${i + 1}`}</button>
          ))}
        </div>
      )}

      {/* live address + signals */}
      <section className="squircle rounded-4 border border-line bg-bg-elev p-6 space-y-3">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <p className="text-lg"><span className="text-fg-faint">Live at </span><span className="num font-medium break-all">{urlText}</span></p>
          <span className="text-sm text-fg-muted"><span className="num">{pages.length}</span> page{pages.length === 1 ? "" : "s"}</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
          <span className="flex items-center gap-2"><span className={cn("inline-block size-2.5 rounded-full", r.checkout_linked ? "bg-green" : "bg-amber")} />{r.checkout_linked ? "CTA linked to your checkout" : "No checkout linked yet"}</span>
          <span className="flex items-center gap-2"><span className={cn("inline-block size-2.5 rounded-full", seo.schema_present ? "bg-green" : "bg-amber")} />{seo.schema_present ? "SEO/GEO baked in" : "SEO/GEO pending"}</span>
        </div>
      </section>

      {/* why this converts */}
      {conv.length > 0 && (
        <section className="squircle rounded-4 border border-green/30 bg-green-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-green">Why this converts</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">{conv.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </section>
      )}

      {/* SEO/GEO baseline */}
      {(seo.summary || arr<string>(seo.geo_notes).length > 0) && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">SEO &amp; AI-search baseline</h3>
          {seo.summary && <p className="text-fg-muted leading-relaxed">{seo.summary}</p>}
          {arr<string>(seo.geo_notes).length > 0 && (
            <ul className="space-y-1.5 list-disc pl-5 text-sm text-fg-muted">{arr<string>(seo.geo_notes).map((n, i) => <li key={i}>{n}</li>)}</ul>
          )}
        </section>
      )}

      {/* flags */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Before it goes live</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </section>
      )}

      {r.render_note && <p className="text-xs text-fg-faint leading-relaxed px-1">{r.render_note}</p>}

      {sources.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Sources · <span className="num">{sources.length}</span></p>
          <ul className="space-y-2 text-sm">
            {sources.map((s, i) => (
              <li key={i} className="flex gap-3"><span className="num text-fg-faint shrink-0 max-w-[10rem] truncate">{s.ref}</span><span className="text-fg-muted">“{s.quote}”</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
