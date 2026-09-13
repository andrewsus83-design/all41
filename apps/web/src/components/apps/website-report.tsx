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
const isHex = (s: string) => /^#?[0-9a-fA-F]{3,8}$/.test(s.trim());

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Checked against your brand — the site's claims hold up." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Checked — a few claims couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: "Checked — some content didn’t line up with your brand; see the flags below." };
  return null;
}

const statusLabel: Record<string, string> = { live: "Live", deploy_pending: "Ready to publish", failed: "Failed" };
const statusTone: Record<string, "green" | "amber" | "red"> = { live: "green", deploy_pending: "amber", failed: "red" };

/** Plain-language renderer for a Web Builder run — live URL, per-page structure, style, SEO/GEO, flags. */
export function WebsiteReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
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
  const dc = doubleChecked(verification);

  return (
    <div className="space-y-8">
      {/* HERO — the live address */}
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {isMock && <Badge tone="amber">demo run</Badge>}
          <ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} />
        </div>
        <section className="squircle rounded-4 border border-line bg-bg-elev p-8 space-y-4">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="font-title text-2xl font-medium">Your website</h2>
            <Badge tone={statusTone[status]}>{statusLabel[status] ?? status}</Badge>
          </div>
          {r.live_url && (
            <p className="text-lg">
              <span className="text-fg-faint">at </span>
              <span className="num font-medium break-all">{r.live_url.replace(/^https?:\/\//, "")}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
            <span className="flex items-center gap-2">
              <span className={cn("inline-block size-2.5 rounded-full", r.checkout_linked ? "bg-green" : "bg-amber")} />
              {r.checkout_linked ? "CTA linked to your checkout" : "No checkout linked yet"}
            </span>
            <span className="flex items-center gap-2">
              <span className={cn("inline-block size-2.5 rounded-full", seo.schema_present ? "bg-green" : "bg-amber")} />
              {seo.schema_present ? "SEO/GEO baked in" : "SEO/GEO pending"}
            </span>
            <span className="flex items-center gap-2"><span className="num">{pages.length}</span> page{pages.length === 1 ? "" : "s"}</span>
          </div>
        </section>
        {dc && (
          <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}>
            <span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />
            {dc.text}
          </p>
        )}
      </div>

      {/* STYLE */}
      {(palette.length > 0 || style.typography || style.tone) && (
        <section className="squircle rounded-4 border border-line bg-bg-elev-2 p-6 space-y-4">
          <p className="font-title text-lg font-medium">Style</p>
          {palette.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {palette.map((c, i) => (
                <span key={i} className="flex items-center gap-2 text-sm">
                  <span className="inline-block size-6 rounded-2 border border-line" style={isHex(c) ? { background: c.startsWith("#") ? c : `#${c}` } : undefined} />
                  <span className="num text-fg-muted">{c}</span>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-fg-muted">
            {style.typography && <span><span className="text-fg-faint">Type:</span> {style.typography}</span>}
            {style.tone && <span><span className="text-fg-faint">Tone:</span> {style.tone}</span>}
            {style.layout && <span><span className="text-fg-faint">Layout:</span> {style.layout}</span>}
          </div>
        </section>
      )}

      {/* PAGES — one card each, the converting structure */}
      {pages.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">Pages</h3>
          <div className="space-y-3">
            {pages.map((p, i) => (
              <div key={i} className="squircle rounded-4 border border-line bg-bg-elev p-6 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-fg-faint">
                      {p.type && <Badge>{p.type}</Badge>}
                      {p.slug && <span className="num">{p.slug}</span>}
                      <Badge tone={p.has_nav ? "neutral" : "green"}>{p.has_nav ? "with nav" : "no nav (conversion page)"}</Badge>
                    </p>
                    {p.headline && <p className="font-title text-lg font-medium leading-snug">{p.headline}</p>}
                    {p.subhead && <p className="text-fg-muted">{p.subhead}</p>}
                  </div>
                </div>
                {p.value_prop && <p className="text-fg-muted leading-relaxed">{p.value_prop}</p>}
                {arr<string>(p.proof).length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {arr<string>(p.proof).map((pf, j) => (
                      <li key={j} className="flex gap-2"><span className="text-green shrink-0">✓</span><span className="text-fg-muted">{pf}</span></li>
                    ))}
                  </ul>
                )}
                {p.cta && (
                  <p className="pt-1">
                    <span className="inline-flex items-center h-8 px-4 rounded-full bg-coral text-white text-sm font-semibold">{p.cta}</span>
                    {p.cta_href && <span className="ml-2 text-xs text-fg-faint break-all">→ {p.cta_href}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEO/GEO baseline */}
      {(seo.summary || arr<string>(seo.geo_notes).length > 0) && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">SEO &amp; AI-search baseline</h3>
          {seo.summary && <p className="text-fg-muted leading-relaxed">{seo.summary}</p>}
          {arr<string>(seo.geo_notes).length > 0 && (
            <ul className="space-y-1.5 list-disc pl-5 text-sm text-fg-muted">
              {arr<string>(seo.geo_notes).map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </section>
      )}

      {/* CONVERSION NOTES — the methodology applied */}
      {conv.length > 0 && (
        <section className="squircle rounded-4 border border-green/30 bg-green-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-green">Why this converts</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">
            {conv.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </section>
      )}

      {/* FLAGS */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Before it goes live</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">
            {flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </section>
      )}

      {/* RENDER NOTE — what's live vs pending */}
      {r.render_note && <p className="text-xs text-fg-faint leading-relaxed px-1">{r.render_note}</p>}

      {/* SOURCES */}
      {sources.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-fg-faint">Sources · <span className="num">{sources.length}</span></p>
          <ul className="space-y-2 text-sm">
            {sources.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="num text-fg-faint shrink-0 max-w-[10rem] truncate">{s.ref}</span>
                <span className="text-fg-muted">“{s.quote}”</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
