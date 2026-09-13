import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ConfidenceBadge } from "@/components/result-view";

/** Client-safe shapes for the `seo_report` schema (see lib/engine/schemas.ts). All fields optional-guarded. */
type HealthScore = { seo?: number; geo?: number; change_since_last?: string };
type QuickWin = { action?: string; why?: string; expected_impact?: string };
type Severity = "error" | "warning" | "notice";
type Technical = { issue?: string; severity?: Severity; fix?: string; affected_pages?: string[] };
type KeywordContent = { keyword?: string; intent?: string; recommendation?: string };
type Competitor = { competitor?: string; gap?: string; how_to_close?: string };
type GeoFactor = { factor?: string; status?: string; fix?: string };
type Social = { platform?: string; recommendation?: string };
type Source = { ref?: string; quote?: string };
export type SeoReportData = {
  health_score?: HealthScore;
  quick_wins?: QuickWin[];
  technical?: Technical[];
  keywords_content?: KeywordContent[];
  competitors?: Competitor[];
  geo?: GeoFactor[];
  social?: Social[];
  sources?: Source[];
  flags?: string[];
  confidence?: number;
};

type Verdict = { verdict?: string; conflicts?: string[] } | null | undefined;

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
function band(n: number): "green" | "amber" | "red" {
  return n >= 80 ? "green" : n >= 50 ? "amber" : "red";
}
const toneText = { green: "text-green", amber: "text-amber", red: "text-red" } as const;

// ---------- big health dial ----------
function Dial({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const tone = band(v);
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={cn("relative", toneText[tone])}>
        <svg width="140" height="140" viewBox="0 0 132 132" className="-rotate-90" aria-hidden>
          <circle cx="66" cy="66" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="10" />
          <circle
            cx="66" cy="66" r={r} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("num text-5xl font-semibold leading-none", toneText[tone])}>{v}</span>
          <span className="num text-xs text-fg-faint mt-1">/ 100</span>
        </div>
      </div>
      <span className="font-title text-base text-fg-muted">{label}</span>
    </div>
  );
}

// ---------- collapsible section ----------
function Panel({
  title, count, accent, tag, defaultOpen = true, children,
}: {
  title: string; count?: number; accent?: boolean; tag?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className={cn("group squircle rounded-4 border bg-bg-elev", accent ? "border-green/40" : "border-line")}>
      <summary className="flex items-center gap-3 cursor-pointer select-none list-none px-6 py-5 [&::-webkit-details-marker]:hidden">
        <h3 className="font-title text-xl font-medium">{title}</h3>
        {typeof count === "number" && <span className="num text-sm text-fg-faint">{count}</span>}
        {tag && <Badge tone="green">{tag}</Badge>}
        <span className="ml-auto text-fg-faint text-sm transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="px-6 pb-6 space-y-3">{children}</div>
    </details>
  );
}

function intentTone(intent: string): "green" | "amber" | "red" | "neutral" {
  const i = intent.toLowerCase();
  if (i.includes("transactional") || i.includes("commercial")) return "green";
  if (i.includes("navigational")) return "amber";
  return "neutral";
}

/** Positive / negative read of a GEO status word ("Present"/"Strong" vs "Missing"/"None"/"Weak"). */
function statusTone(status: string): "green" | "amber" | "red" {
  const s = status.toLowerCase();
  if (/(missing|none|absent|no\b|not found|nonexistent)/.test(s)) return "red";
  if (/(weak|partial|thin|limited|some|low)/.test(s)) return "amber";
  if (/(present|strong|good|yes|solid|found|complete|healthy)/.test(s)) return "green";
  return "amber";
}

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  const conflicts = arr<string>(v.conflicts).length;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Double-checked against its sources — it all holds up." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Double-checked — a few points couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: `Double-checked — found ${conflicts} thing${conflicts === 1 ? "" : "s"} that didn’t line up; see the flags below.` };
  return null;
}

/** Beautiful, plain-language renderer for a full SEO/GEO audit. Works in server and client trees (no hooks). */
export function SeoReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  if (!report || typeof report !== "object") return null;
  const r = report as SeoReportData;
  const hs = r.health_score ?? {};
  const quickWins = arr<QuickWin>(r.quick_wins).slice(0, 5);
  const technical = arr<Technical>(r.technical);
  const keywords = arr<KeywordContent>(r.keywords_content);
  const competitors = arr<Competitor>(r.competitors);
  const geo = arr<GeoFactor>(r.geo);
  const social = arr<Social>(r.social);
  const sources = arr<Source>(r.sources);
  const flags = arr<string>(r.flags);
  const dc = doubleChecked(verification);

  const sevOrder: Severity[] = ["error", "warning", "notice"];
  const sevTone = { error: "red", warning: "amber", notice: "neutral" } as const;
  const sevLabel = { error: "Needs fixing", warning: "Worth fixing", notice: "Nice to have" } as const;
  const bySeverity = sevOrder
    .map((sev) => ({ sev, items: technical.filter((t) => (t.severity ?? "notice") === sev) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {/* health header */}
      <section className="squircle rounded-4 border border-line bg-bg-elev p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h2 className="font-title text-2xl font-medium">Your SEO &amp; GEO health</h2>
            {hs.change_since_last && (
              <p className="text-sm text-fg-muted">Since last time: <span className="num">{hs.change_since_last}</span></p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {isMock && <Badge tone="amber">demo run</Badge>}
            <ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-around gap-8">
          {typeof hs.seo === "number" && <Dial label="Search (SEO)" value={hs.seo} />}
          {typeof hs.geo === "number" && <Dial label="AI answers (GEO)" value={hs.geo} />}
        </div>
        {dc && (
          <p className={cn("flex items-center gap-2 text-sm", dc.tone === "green" ? "text-green" : "text-amber")}>
            <span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />
            {dc.text}
          </p>
        )}
      </section>

      {/* flags — the honesty layer */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">A few things to know</p>
          <p className="text-sm text-fg-muted">We only show what we can stand behind. These we couldn’t fully confirm:</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">
            {flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </section>
      )}

      {/* quick wins */}
      {quickWins.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">Top {quickWins.length} quick wins</h3>
          <ol className="space-y-3">
            {quickWins.map((w, i) => (
              <li key={i} className="flex gap-5 squircle rounded-3 bg-bg-elev-2 p-5">
                <span className="num text-3xl font-semibold text-fg-faint leading-none shrink-0">{i + 1}</span>
                <div className="space-y-1 min-w-0">
                  {w.action && <p className="font-medium text-lg leading-snug">{w.action}</p>}
                  {w.why && <p className="text-fg-muted text-sm">{w.why}</p>}
                  {w.expected_impact && <p className="text-green text-sm">↑ {w.expected_impact}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* GEO — the differentiator, up top and highlighted */}
      {geo.length > 0 && (
        <Panel title="AI-search visibility (GEO)" count={geo.length} accent tag="our edge">
          <p className="text-sm text-fg-muted -mt-1">How visible you are to AI answer engines like ChatGPT, Perplexity and Google’s AI Overviews — where more and more people now start.</p>
          <div className="space-y-2">
            {geo.map((g, i) => (
              <div key={i} className="squircle rounded-3 bg-bg-elev-2 p-4 space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium">{g.factor}</span>
                  {g.status && <Badge tone={statusTone(g.status)}>{g.status}</Badge>}
                </div>
                {g.fix && <p className="text-fg-muted text-sm">Fix — {g.fix}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* technical */}
      {technical.length > 0 && (
        <Panel title="Technical health" count={technical.length}>
          <div className="space-y-4">
            {bySeverity.map(({ sev, items }) => (
              <div key={sev} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-fg-faint">{sevLabel[sev]} · <span className="num">{items.length}</span></p>
                {items.map((t, i) => (
                  <div key={i} className="squircle rounded-3 bg-bg-elev-2 p-4 space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge tone={sevTone[sev]}>{sev}</Badge>
                      <span className="font-medium">{t.issue}</span>
                    </div>
                    {t.fix && <p className="text-fg-muted text-sm">Fix — {t.fix}</p>}
                    {arr<string>(t.affected_pages).length > 0 && (
                      <p className="text-xs text-fg-faint">
                        Affects: {arr<string>(t.affected_pages).map((p, j) => (
                          <span key={j} className="num">{j > 0 ? ", " : ""}{p}</span>
                        ))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* keywords & content */}
      {keywords.length > 0 && (
        <Panel title="Keywords &amp; content" count={keywords.length} defaultOpen={false}>
          <div className="space-y-2">
            {keywords.map((k, i) => (
              <div key={i} className="squircle rounded-3 bg-bg-elev-2 p-4 space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium">{k.keyword}</span>
                  {k.intent && <Badge tone={intentTone(k.intent)}>{k.intent}</Badge>}
                </div>
                {k.recommendation && <p className="text-fg-muted text-sm">{k.recommendation}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* competitors */}
      {competitors.length > 0 && (
        <Panel title="Competitors" count={competitors.length} defaultOpen={false}>
          <div className="space-y-2">
            {competitors.map((c, i) => (
              <div key={i} className="squircle rounded-3 bg-bg-elev-2 p-4 space-y-1.5">
                {c.competitor && <p className="font-medium">{c.competitor}</p>}
                {c.gap && <p className="text-fg-muted text-sm">Gap — {c.gap}</p>}
                {c.how_to_close && <p className="text-green text-sm">Close it — {c.how_to_close}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* social */}
      {social.length > 0 && (
        <Panel title="Social presence" count={social.length} defaultOpen={false}>
          <div className="space-y-2">
            {social.map((s, i) => (
              <div key={i} className="squircle rounded-3 bg-bg-elev-2 p-4 flex gap-3 flex-wrap items-baseline">
                <Badge>{s.platform}</Badge>
                {s.recommendation && <span className="text-fg-muted text-sm min-w-0">{s.recommendation}</span>}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* sources */}
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
