"use client";
import { useEffect, useState } from "react";
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

function Stars({ color }: { color: string }) {
  return <span style={{ color, letterSpacing: 1 }} aria-hidden>★★★★★</span>;
}

function Hero({ src, alt, colors, radius = 0, minH = 260 }: { src?: string; alt: string; colors: Colors; radius?: number; minH?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius, display: "block", minHeight: minH }} />;
  return <div style={{ width: "100%", minHeight: minH, height: "100%", borderRadius: radius, background: colors.cream, display: "grid", placeItems: "center", color: colors.muted, fontSize: 13 }}>your photo</div>;
}

function Hd({ font, size = 40, children }: { font: string; size?: number; children: React.ReactNode }) {
  return <h1 style={{ fontFamily: font, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.08, fontSize: `clamp(26px, ${size / 12}vw, ${size}px)` }}>{children}</h1>;
}

function TopNav({ brand, pages, active, onNav, colors, D }: { brand: string; pages: Page[]; active: number; onNav: (i: number) => void; colors: Colors; D: string }) {
  const cta = pages[active]?.cta || "Book";
  return (
    <div className="flex items-center justify-between px-6 sm:px-9 py-4" style={{ borderBottom: `1px solid ${colors.line}` }}>
      <span style={{ fontFamily: D, fontWeight: 600, fontSize: 20, letterSpacing: "-0.01em" }}>{brand}</span>
      <div className="hidden sm:flex items-center gap-6" style={{ fontSize: 14, color: colors.muted }}>
        {pages.map((p, i) => (
          <button key={i} type="button" onClick={() => onNav(i)} style={{ color: i === active ? colors.ink : colors.muted, fontWeight: i === active ? 600 : 400 }} className="transition hover:opacity-70">{p.type}</button>
        ))}
        <span className="px-4 py-2 rounded-full" style={{ background: colors.accent, color: colors.onAccent, fontWeight: 600, fontSize: 14 }}>{cta}</span>
      </div>
      <span className="sm:hidden px-3.5 py-1.5 rounded-full" style={{ background: colors.accent, color: colors.onAccent, fontWeight: 600, fontSize: 13 }}>{cta}</span>
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
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span style={{ background: colors.accent, color: colors.onAccent, fontWeight: 600, padding: pad, borderRadius: 999, fontSize: big ? 16 : 14 }}>{page.cta || "Get started"}</span>
      <span style={{ border: `1.5px solid ${colors.line}`, color: colors.ink, fontWeight: 500, padding: pad, borderRadius: 999, fontSize: big ? 16 : 14 }}>See pricing</span>
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
          <span style={{ color: colors.accent, fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>Services & pricing</span>
          <div className="mt-3"><Hd font={D} size={38}>{page.headline}</Hd></div>
          {page.subhead && <p className="mx-auto" style={{ maxWidth: 560, marginTop: 12, color: colors.muted, fontSize: 16, lineHeight: 1.6 }}>{page.subhead}</p>}
        </div>
        {prices.length > 0 && (
          <div className="px-7 sm:px-10 py-11">
            <div className="grid sm:grid-cols-3 gap-4">
              {prices.map((p, i) => (
                <div key={i} className="rounded-2xl p-6 text-center" style={{ background: "#fff", border: i === 1 ? `2px solid ${colors.accent}` : `1px solid ${colors.line}` }}>
                  {i === 1 && <span style={{ background: colors.accent, color: colors.onAccent, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>Most booked</span>}
                  <p style={{ fontFamily: D, fontWeight: 600, fontSize: 18, marginTop: i === 1 ? 10 : 0 }}>{p.name}</p>
                  <p style={{ fontFamily: D, fontWeight: 700, fontSize: 40, color: colors.accent, margin: "6px 0" }}>{p.price}</p>
                  <span style={{ display: "inline-block", marginTop: 8, background: i === 1 ? colors.accent : colors.cream, color: i === 1 ? colors.onAccent : colors.ink, fontWeight: 600, padding: "10px 20px", borderRadius: 999, fontSize: 14 }}>{page.cta || "Book"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="px-7 sm:px-10 pb-12">
          <p style={{ fontFamily: D, fontWeight: 600, fontSize: 20, marginBottom: 12 }}>Every groom includes</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {(proof.length ? proof : ["Bath, blow-dry and brush-out", "Nails, ears and sanitary trim"]).map((p, i) => (
              <p key={i} style={{ fontSize: 15, lineHeight: 1.5, display: "flex", gap: 10 }}><span style={{ color: colors.accent, fontWeight: 700 }}>✓</span>{p}</p>
            ))}
          </div>
        </div>
        <Footer brand={brand} sub={brand.toLowerCase()} colors={colors} D={D} />
      </div>
    );
  }

  // ---------- BOOK ----------
  if (type === "book") {
    return (
      <div style={{ background: colors.cream, color: colors.ink, fontFamily: fonts.body }}>
        <div className="px-7 sm:px-10 pt-12 pb-6 text-center">
          <span style={{ color: colors.accent, fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>Book in 60 seconds</span>
          <div className="mt-3"><Hd font={D} size={36}>{page.headline}</Hd></div>
          {page.subhead && <p className="mx-auto" style={{ maxWidth: 520, marginTop: 12, color: colors.muted, fontSize: 16, lineHeight: 1.6 }}>{page.subhead}</p>}
        </div>
        <div className="px-7 sm:px-10 pb-12">
          <div className="mx-auto rounded-3xl p-6 sm:p-8" style={{ maxWidth: 520, background: "#fff", border: `1px solid ${colors.line}`, boxShadow: "0 20px 50px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>Your dog&apos;s size</p>
            <div className="flex gap-2 mt-2 mb-5">
              {["Small", "Medium", "Large"].map((s, i) => (
                <span key={s} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, fontSize: 14, fontWeight: 600, background: i === 1 ? colors.accent : colors.cream, color: i === 1 ? colors.onAccent : colors.ink }}>{s}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>Package</p>
            <div className="flex gap-2 mt-2 mb-5 flex-wrap">
              {parsePrices(page).map((p) => (
                <span key={p.name} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: `1px solid ${colors.line}` }}>{p.name} · {p.price}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>When works?</p>
            <div className="flex gap-2 mt-2 mb-6">
              {["Tue AM", "Wed PM", "Fri AM"].map((s, i) => (
                <span key={s} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, background: i === 0 ? colors.ink : "#fff", color: i === 0 ? "#fff" : colors.ink, border: `1px solid ${colors.line}` }}>{s}</span>
              ))}
            </div>
            <div style={{ background: colors.accent, color: colors.onAccent, fontWeight: 700, textAlign: "center", padding: "14px 0", borderRadius: 999, fontSize: 16 }}>{page.cta || "Reserve my appointment"}</div>
            <div className="mt-4 flex flex-col gap-1.5">
              {proof.slice(0, 3).map((p, i) => <p key={i} style={{ fontSize: 13, color: colors.muted, display: "flex", gap: 8 }}><span style={{ color: colors.accent }}>✓</span>{p}</p>)}
            </div>
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
      <div style={{ position: "relative" }}>
        <div style={{ minHeight: 380 }}><Hero src={page.image} alt={brand} colors={colors} minH={380} /></div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.42) 45%, rgba(0,0,0,0.85) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, padding: "40px 28px", display: "flex", flexDirection: "column", justifyContent: "flex-end", color: "#fff", textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>
          <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#fff", opacity: 0.85 }}>{brand}</span>
          <h1 style={{ fontFamily: D, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05, fontSize: "clamp(28px, 4.6vw, 46px)", maxWidth: 620, marginTop: 10, color: "#fff" }}>{page.headline}</h1>
          {page.subhead && <p style={{ fontSize: 16, lineHeight: 1.55, maxWidth: 520, marginTop: 12, opacity: 0.95, color: "#fff" }}>{page.subhead}</p>}
          <div style={{ marginTop: 18 }}>
            <span style={{ background: colors.accent, color: colors.onAccent, fontWeight: 700, padding: "14px 28px", borderRadius: 999, fontSize: 16 }}>{page.cta || "Book now"}</span>
          </div>
        </div>
      </div>

      {/* value prop */}
      {page.value_prop && (
        <div className="px-7 sm:px-10 py-11 text-center">
          <p className="mx-auto" style={{ fontFamily: D, fontWeight: 600, maxWidth: 640, fontSize: "clamp(19px, 2.6vw, 26px)", lineHeight: 1.3 }}>{page.value_prop}</p>
        </div>
      )}

      {/* review wall from proof */}
      {proof.length > 0 && (
        <div className="px-7 sm:px-10 py-11" style={{ background: colors.cream }}>
          <div className="grid sm:grid-cols-3 gap-4">
            {proof.slice(0, 3).map((p, i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${colors.line}` }}>
                <Stars color={colors.accent} />
                <p style={{ fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* pricing teaser */}
      {prices.length > 0 && (
        <div className="px-7 sm:px-10 py-11">
          <p style={{ fontFamily: D, fontWeight: 600, fontSize: 22, textAlign: "center", marginBottom: 16 }}>Simple, flat pricing</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {prices.map((p, i) => (
              <div key={i} className="rounded-2xl p-5 text-center" style={{ border: i === 1 ? `2px solid ${colors.accent}` : `1px solid ${colors.line}` }}>
                <p style={{ fontFamily: D, fontWeight: 600, fontSize: 16 }}>{p.name}</p>
                <p style={{ fontFamily: D, fontWeight: 700, fontSize: 34, color: colors.accent }}>{p.price}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* final CTA */}
      <div className="px-7 sm:px-10 py-14 text-center" style={{ background: colors.ink, color: "#fff" }}>
        <p style={{ fontFamily: D, fontWeight: 600, fontSize: "clamp(22px, 3vw, 32px)", maxWidth: 560, margin: "0 auto" }}>Your dog&apos;s best groom is one tap away.</p>
        <span style={{ display: "inline-block", marginTop: 18, background: colors.accent, color: colors.onAccent, fontWeight: 700, padding: "14px 30px", borderRadius: 999, fontSize: 16 }}>{page.cta || "Book now"}</span>
      </div>
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
          </div>
          <div className="max-h-[600px] overflow-y-auto" style={{ background: "#fff" }}>
            <TopNav brand={brand} pages={pages} active={idx} onNav={setActive} colors={colors} D={fonts.display} />
            {page && <SitePage page={page} brand={brand} colors={colors} fonts={fonts} />}
          </div>
        </div>
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
