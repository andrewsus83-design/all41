"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  image?: string; // optional sample imagery
};
type Style = { palette?: string[]; typography?: string; tone?: string; layout?: string; fonts?: { display?: string; body?: string } };
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

type Colors = { ink: string; accent: string; cream: string; onAccent: string; muted: string; line: string };

function brandName(r: WebsiteReportData): string {
  const src = (r.subdomain || r.live_url || "your-brand").replace(/^https?:\/\//, "").split(".")[0];
  return src.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Pull "Name $NN" pairs out of the copy → pricing cards. */
function parsePrices(page: Page): { name: string; price: string }[] {
  const hay = [page.value_prop ?? "", ...(page.proof ?? [])].join(" · ");
  const out: { name: string; price: string }[] = [];
  const re = /([A-Z][A-Za-z'’&-]+(?:\s[A-Za-z'’&-]+){0,3})\s*\$(\d{2,4})/g;
  for (let m = re.exec(hay); m && out.length < 3; m = re.exec(hay)) out.push({ name: m[1].trim(), price: `$${m[2]}` });
  return out;
}

function Hero({ src, alt, colors, radius = 0, minH = 260 }: { src?: string; alt: string; colors: Colors; radius?: number; minH?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius, display: "block", minHeight: minH }} />;
  return <div style={{ width: "100%", minHeight: minH, height: "100%", borderRadius: radius, background: colors.cream, display: "grid", placeItems: "center", color: colors.muted, fontSize: 13 }}>your photo</div>;
}

function Hd({ font, size = 40, children }: { font: string; size?: number; children: React.ReactNode }) {
  return <h1 style={{ fontFamily: font, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.08, fontSize: `clamp(26px, ${size / 12}cqw, ${size}px)` }}>{children}</h1>;
}

function TopNav({ brand, pages, active, onNav, colors, D }: { brand: string; pages: Page[]; active: number; onNav: (i: number) => void; colors: Colors; D: string }) {
  const cta = pages[active]?.cta;
  return (
    <div className="flex items-center justify-between gap-4 px-6 sm:px-9 py-4" style={{ borderBottom: `1px solid ${colors.line}` }}>
      <span style={{ fontFamily: D, fontWeight: 600, fontSize: 20, letterSpacing: "-0.01em" }}>{brand}</span>
      <div className="hidden sm:flex items-center gap-6" style={{ fontSize: 14, color: colors.muted }}>
        {pages.map((p, i) => (
          <button key={i} type="button" onClick={() => onNav(i)} style={{ color: i === active ? colors.ink : colors.muted, fontWeight: i === active ? 600 : 400 }} className="transition hover:opacity-70">{p.type}</button>
        ))}
        {cta && <span className="px-4 py-2 rounded-full" style={{ background: colors.accent, color: colors.onAccent, fontWeight: 600, fontSize: 14 }}>{cta}</span>}
      </div>
      {cta && <span className="sm:hidden px-3.5 py-1.5 rounded-full whitespace-nowrap" style={{ background: colors.accent, color: colors.onAccent, fontWeight: 600, fontSize: 13 }}>{cta}</span>}
    </div>
  );
}

function Footer({ brand, sub, colors, D }: { brand: string; sub: string; colors: Colors; D: string }) {
  return (
    <div className="px-6 sm:px-9 py-8 flex items-center justify-between flex-wrap gap-3" style={{ background: colors.ink, color: "#fff" }}>
      <div>
        <p style={{ fontFamily: D, fontWeight: 600, fontSize: 18 }}>{brand}</p>
        <p style={{ fontSize: 12, opacity: 0.6 }}>© {brand} · {sub}</p>
      </div>
      <span style={{ fontSize: 12, opacity: 0.6 }}>Built with all41</span>
    </div>
  );
}

function CtaButtons({ page, colors, big }: { page: Page; colors: Colors; big?: boolean }) {
  const pad = big ? "14px 28px" : "11px 22px";
  if (!page.cta) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span style={{ background: colors.accent, color: colors.onAccent, fontWeight: 600, padding: pad, borderRadius: 999, fontSize: big ? 16 : 14 }}>{page.cta}</span>
    </div>
  );
}

/** Renders ONE page as its own designed layout, distinct per page type. */
function SitePage({ page, brand, colors, fonts }: { page: Page; brand: string; colors: Colors; fonts: { display: string; body: string } }) {
  const D = fonts.display;
  const proof = arr<string>(page.proof);
  const type = (page.type || "Home").toLowerCase();

  // ---------- ABOUT ----------
  if (type === "about") {
    return (
      <div style={{ background: "#fff", color: colors.ink, fontFamily: fonts.body }}>
        <div className="grid md:grid-cols-2">
          <div className="min-h-[280px]"><Hero src={page.image} alt={brand} colors={colors} minH={280} /></div>
          <div className="px-7 sm:px-10 py-10 flex flex-col justify-center gap-4">
            <span style={{ color: colors.accent, fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>Our story</span>
            <Hd font={D} size={34}>{page.headline}</Hd>
            {page.subhead && <p style={{ color: colors.muted, fontSize: 16, lineHeight: 1.6 }}>{page.subhead}</p>}
            {page.value_prop && <p style={{ fontSize: 15, lineHeight: 1.7 }}>{page.value_prop}</p>}
            <div style={{ marginTop: 6 }}><CtaButtons page={page} colors={colors} /></div>
          </div>
        </div>
        {proof.length > 0 && (
          <div className="px-7 sm:px-10 py-10" style={{ background: colors.cream }}>
            <div className="grid sm:grid-cols-3 gap-4">
              {proof.slice(0, 3).map((p, i) => (
                <div key={i} className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${colors.line}` }}>
                  <span style={{ color: colors.accent, fontWeight: 700 }}>✓</span>
                  <p style={{ fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{p}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <Footer brand={brand} sub={brand.toLowerCase()} colors={colors} D={D} />
      </div>
    );
  }

  // ---------- SERVICES ----------
  if (type === "services") {
    const prices = parsePrices(page);
    return (
      <div style={{ background: "#fff", color: colors.ink, fontFamily: fonts.body }}>
        <div className="px-7 sm:px-10 pt-12 pb-8 text-center" style={{ background: colors.cream }}>
          <span style={{ color: colors.accent, fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>{page.type}</span>
          <div className="mt-3"><Hd font={D} size={38}>{page.headline}</Hd></div>
          {page.subhead && <p className="mx-auto" style={{ maxWidth: 560, marginTop: 12, color: colors.muted, fontSize: 16, lineHeight: 1.6 }}>{page.subhead}</p>}
        </div>
        {prices.length > 0 && (
          <div className="px-7 sm:px-10 py-11">
            <div className="grid sm:grid-cols-3 gap-4">
              {prices.map((p, i) => (
                <div key={i} className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: `1px solid ${colors.line}` }}>
                  <p style={{ fontFamily: D, fontWeight: 600, fontSize: 18 }}>{p.name}</p>
                  <p style={{ fontFamily: D, fontWeight: 700, fontSize: 40, color: colors.accent, margin: "6px 0" }}>{p.price}</p>
                  {page.cta && <span style={{ display: "inline-block", marginTop: 8, background: colors.cream, color: colors.ink, fontWeight: 600, padding: "10px 20px", borderRadius: 999, fontSize: 14 }}>{page.cta}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {proof.length > 0 && (
          <div className="px-7 sm:px-10 pb-12">
            <p style={{ fontFamily: D, fontWeight: 600, fontSize: 20, marginBottom: 12 }}>What&apos;s included</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {proof.map((p, i) => (
                <p key={i} style={{ fontSize: 15, lineHeight: 1.5, display: "flex", gap: 10 }}><span style={{ color: colors.accent, fontWeight: 700 }}>✓</span>{p}</p>
              ))}
            </div>
          </div>
        )}
        <Footer brand={brand} sub={brand.toLowerCase()} colors={colors} D={D} />
      </div>
    );
  }

  // ---------- BOOK / CONTACT / CTA page ----------
  if (type === "book" || type === "contact") {
    const prices = parsePrices(page);
    return (
      <div style={{ background: colors.cream, color: colors.ink, fontFamily: fonts.body }}>
        <div className="px-7 sm:px-10 pt-12 pb-6 text-center">
          <span style={{ color: colors.accent, fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>{page.type}</span>
          <div className="mt-3"><Hd font={D} size={36}>{page.headline}</Hd></div>
          {page.subhead && <p className="mx-auto" style={{ maxWidth: 520, marginTop: 12, color: colors.muted, fontSize: 16, lineHeight: 1.6 }}>{page.subhead}</p>}
        </div>
        <div className="px-7 sm:px-10 pb-12">
          <div className="mx-auto rounded-3xl p-6 sm:p-8" style={{ maxWidth: 540, background: "#fff", border: `1px solid ${colors.line}`, boxShadow: "0 20px 50px rgba(0,0,0,0.06)" }}>
            {page.value_prop && <p style={{ fontSize: 16, lineHeight: 1.65, marginBottom: prices.length || proof.length ? 20 : 24 }}>{page.value_prop}</p>}
            {prices.length > 0 && (
              <div className="flex gap-2 mb-5 flex-wrap">
                {prices.map((p) => <span key={p.name} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: `1px solid ${colors.line}` }}>{p.name} · {p.price}</span>)}
              </div>
            )}
            {proof.length > 0 && (
              <div className="flex flex-col gap-2 mb-6">
                {proof.slice(0, 3).map((p, i) => <p key={i} style={{ fontSize: 14, color: colors.muted, display: "flex", gap: 8 }}><span style={{ color: colors.accent, fontWeight: 700 }}>✓</span>{p}</p>)}
              </div>
            )}
            {page.cta && <div style={{ background: colors.accent, color: colors.onAccent, fontWeight: 700, textAlign: "center", padding: "15px 0", borderRadius: 999, fontSize: 16 }}>{page.cta}</div>}
          </div>
        </div>
        <Footer brand={brand} sub={brand.toLowerCase()} colors={colors} D={D} />
      </div>
    );
  }

  // ---------- HOME ----------
  const prices = parsePrices(page);
  return (
    <div style={{ background: "#fff", color: colors.ink, fontFamily: fonts.body }}>
      {/* image hero with overlaid copy */}
      {page.image ? (
        <div style={{ position: "relative" }}>
          <div style={{ minHeight: 380 }}><Hero src={page.image} alt={brand} colors={colors} minH={380} /></div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.42) 45%, rgba(0,0,0,0.85) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, padding: "40px 28px", display: "flex", flexDirection: "column", justifyContent: "flex-end", color: "#fff", textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>
            <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#fff", opacity: 0.85 }}>{brand}</span>
            <h1 style={{ fontFamily: D, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05, fontSize: "clamp(28px, 4.6cqw, 46px)", maxWidth: 620, marginTop: 10, color: "#fff" }}>{page.headline}</h1>
            {page.subhead && <p style={{ fontSize: 16, lineHeight: 1.55, maxWidth: 520, marginTop: 12, opacity: 0.95, color: "#fff" }}>{page.subhead}</p>}
            {page.cta && <div style={{ marginTop: 18 }}><span style={{ background: colors.accent, color: colors.onAccent, fontWeight: 700, padding: "14px 28px", borderRadius: 999, fontSize: 16 }}>{page.cta}</span></div>}
          </div>
        </div>
      ) : (
        <div style={{ background: colors.ink, color: "#fff", padding: "64px 28px", textAlign: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.75 }}>{brand}</span>
          <h1 style={{ fontFamily: D, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.06, fontSize: "clamp(28px, 4.4cqw, 44px)", maxWidth: 640, margin: "12px auto 0", color: "#fff" }}>{page.headline}</h1>
          {page.subhead && <p style={{ fontSize: 16, lineHeight: 1.55, maxWidth: 540, margin: "14px auto 0", opacity: 0.92, color: "#fff" }}>{page.subhead}</p>}
          {page.cta && <span style={{ display: "inline-block", marginTop: 22, background: colors.accent, color: colors.onAccent, fontWeight: 700, padding: "14px 28px", borderRadius: 999, fontSize: 16 }}>{page.cta}</span>}
        </div>
      )}

      {/* value prop */}
      {page.value_prop && (
        <div className="px-7 sm:px-10 py-11 text-center">
          <p className="mx-auto" style={{ fontFamily: D, fontWeight: 600, maxWidth: 640, fontSize: "clamp(19px, 2.6cqw, 26px)", lineHeight: 1.3 }}>{page.value_prop}</p>
        </div>
      )}

      {/* why choose — proof as honest trust points */}
      {proof.length > 0 && (
        <div className="px-7 sm:px-10 py-11" style={{ background: colors.cream }}>
          <p style={{ fontFamily: D, fontWeight: 600, fontSize: 20, textAlign: "center", marginBottom: 18 }}>Why {brand}</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {proof.slice(0, 3).map((p, i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${colors.line}` }}>
                <span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 999, background: colors.accent, color: colors.onAccent, fontWeight: 700 }}>✓</span>
                <p style={{ fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* pricing (only if the copy carries prices) */}
      {prices.length > 0 && (
        <div className="px-7 sm:px-10 py-11">
          <p style={{ fontFamily: D, fontWeight: 600, fontSize: 22, textAlign: "center", marginBottom: 16 }}>Pricing</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {prices.map((p, i) => (
              <div key={i} className="rounded-2xl p-5 text-center" style={{ border: `1px solid ${colors.line}` }}>
                <p style={{ fontFamily: D, fontWeight: 600, fontSize: 16 }}>{p.name}</p>
                <p style={{ fontFamily: D, fontWeight: 700, fontSize: 34, color: colors.accent }}>{p.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* final CTA — restates the site's own promise */}
      {page.cta && (
        <div className="px-7 sm:px-10 py-14 text-center" style={{ background: colors.ink, color: "#fff" }}>
          <p style={{ fontFamily: D, fontWeight: 600, fontSize: "clamp(20px, 2.8cqw, 30px)", maxWidth: 620, margin: "0 auto", color: "#fff" }}>{page.headline}</p>
          <span style={{ display: "inline-block", marginTop: 18, background: colors.accent, color: colors.onAccent, fontWeight: 700, padding: "14px 30px", borderRadius: 999, fontSize: 16 }}>{page.cta}</span>
        </div>
      )}
      <Footer brand={brand} sub={brand.toLowerCase()} colors={colors} D={D} />
    </div>
  );
}

function DesignSystemPanel({ palette, fonts, tone, layout }: { palette: string[]; fonts: { display: string; body: string }; tone?: string; layout?: string }) {
  return (
    <section className="squircle rounded-4 border border-line bg-bg-elev p-6 space-y-5">
      <p className="font-title text-lg font-medium">The design system</p>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Palette</p>
          <div className="flex flex-wrap gap-3">
            {palette.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="inline-block size-8 rounded-2 border border-line" style={{ background: hex(c, "#ccc") }} />
                <span className="num text-xs text-fg-muted">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Type</p>
          <div className="space-y-1">
            <p style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 22 }}>{fonts.display} <span className="text-fg-faint text-sm font-normal">— display</span></p>
            <p style={{ fontFamily: fonts.body, fontSize: 15 }}>{fonts.body} <span className="text-fg-faint text-xs">— body & UI</span></p>
          </div>
        </div>
      </div>
      {tone && <p className="text-sm text-fg-muted"><span className="text-fg-faint">Voice: </span>{tone}</p>}
      {layout && <p className="text-sm text-fg-muted"><span className="text-fg-faint">Layout: </span>{layout}</p>}
    </section>
  );
}

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Checked against your brand — the site's claims hold up." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Checked — a few claims couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: "Checked — some content didn’t line up with your brand; see the flags below." };
  return null;
}

/** Web Builder result — leads with a real, flagship-grade rendered site (browser frame, per-page), then the detail. */
export function WebsiteReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  const [active, setActive] = useState(0);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setFull(false); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [full]);

  useEffect(() => {
    const id = "all41-preview-fonts";
    if (typeof document !== "undefined" && !document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

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

  const colors: Colors = {
    ink: hex(palette[0], "#1e1c1a"),
    accent: hex(palette[1], "#ff6b5e"),
    cream: hex(palette[2], "#f6f1e9"),
    onAccent: "#ffffff",
    muted: "#6b6660",
    line: "rgba(30,28,26,0.10)",
  };
  const fonts = { display: style.fonts?.display || "Fraunces", body: style.fonts?.body || "Inter" };
  const idx = Math.min(active, Math.max(0, pages.length - 1));
  const page = pages[idx];
  const siteEl = (
    <>
      <TopNav brand={brand} pages={pages} active={idx} onNav={setActive} colors={colors} D={fonts.display} />
      {page && <SitePage page={page} brand={brand} colors={colors} fonts={fonts} />}
    </>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={statusTone[status]}>{statusLabel[status] ?? status}</Badge>
          <span className="text-sm text-fg-muted">The site you&apos;d publish — click through every page.</span>
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

      {/* THE PREVIEW */}
      {page && (
        <div className="squircle rounded-4 overflow-hidden border border-line-strong shadow-lift bg-bg-elev">
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
                  <button key={i} type="button" onClick={() => setActive(i)} className={cn("px-2.5 py-1 rounded-full text-xs font-title font-medium transition", i === idx ? "bg-fg text-bg" : "text-fg-muted hover:text-fg hover:bg-bg-elev")}>{p.type || `Page ${i + 1}`}</button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setFull(true)} aria-label="Open full preview" title="Open full preview" className="shrink-0 size-8 rounded-full grid place-items-center text-fg-muted hover:text-fg hover:bg-bg-elev transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
            </button>
          </div>
          <div className="max-h-[600px] overflow-y-auto cursor-zoom-in" style={{ background: "#fff", containerType: "inline-size" }} onClick={() => setFull(true)}>
            {siteEl}
          </div>
          <div className="px-4 py-2.5 border-t border-line bg-bg-elev-2 text-center">
            <button type="button" onClick={() => setFull(true)} className="text-sm font-title font-medium text-green hover:underline">Open the full site experience →</button>
          </div>
        </div>
      )}

      {/* FULL WEB EXPERIENCE — portal, above the sample sheet */}
      {full && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[95] bg-bg flex flex-col scene-in" role="dialog" aria-modal="true" aria-label={`${brand} — full preview`}>
          <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-line bg-bg-elev">
            <div className="hidden sm:flex gap-1.5"><span className="size-3 rounded-full bg-red/60" /><span className="size-3 rounded-full bg-amber/60" /><span className="size-3 rounded-full bg-green/60" /></div>
            <div className="flex-1 flex items-center gap-2 rounded-full bg-bg border border-line px-3 py-1.5 text-xs text-fg-muted min-w-0">
              <span aria-hidden>🔒</span><span className="num truncate">{urlText}{page?.slug && page.slug !== "/" ? page.slug : ""}</span>
            </div>
            {pages.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto">
                {pages.map((p, i) => (
                  <button key={i} type="button" onClick={() => setActive(i)} className={cn("shrink-0 px-3 py-1.5 rounded-full text-sm font-title font-medium transition", i === idx ? "bg-fg text-bg" : "text-fg-muted hover:text-fg hover:bg-bg-elev-2")}>{p.type || `Page ${i + 1}`}</button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setFull(false)} aria-label="Close full preview" className="size-10 rounded-full grid place-items-center text-fg-muted hover:text-fg bg-bg-elev border border-line hover:bg-bg-elev-2 transition text-lg shrink-0">✕</button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ background: "#fff" }}>
            <div className="mx-auto" style={{ maxWidth: 1100, containerType: "inline-size" }}>{siteEl}</div>
          </div>
        </div>,
        document.body,
      )}

      {/* mobile page switcher */}
      {pages.length > 1 && (
        <div className="flex sm:hidden gap-2 overflow-x-auto -mx-1 px-1">
          {pages.map((p, i) => (
            <button key={i} type="button" onClick={() => setActive(i)} className={cn("shrink-0 px-3 py-1.5 rounded-full text-sm font-title font-medium border transition", i === idx ? "bg-fg text-bg border-transparent" : "border-line-strong text-fg-muted")}>{p.type || `Page ${i + 1}`}</button>
          ))}
        </div>
      )}

      {/* design system */}
      {(palette.length > 0 || style.typography) && <DesignSystemPanel palette={palette} fonts={fonts} tone={style.tone} layout={style.layout} />}

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

      {conv.length > 0 && (
        <section className="squircle rounded-4 border border-green/30 bg-green-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-green">Why this converts</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">{conv.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </section>
      )}

      {(seo.summary || arr<string>(seo.geo_notes).length > 0) && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">SEO &amp; AI-search baseline</h3>
          {seo.summary && <p className="text-fg-muted leading-relaxed">{seo.summary}</p>}
          {arr<string>(seo.geo_notes).length > 0 && <ul className="space-y-1.5 list-disc pl-5 text-sm text-fg-muted">{arr<string>(seo.geo_notes).map((n, i) => <li key={i}>{n}</li>)}</ul>}
        </section>
      )}

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
            {sources.map((s, i) => <li key={i} className="flex gap-3"><span className="num text-fg-faint shrink-0 max-w-[10rem] truncate">{s.ref}</span><span className="text-fg-muted">“{s.quote}”</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
