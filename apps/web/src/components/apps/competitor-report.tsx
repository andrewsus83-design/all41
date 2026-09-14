import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ConfidenceBadge } from "@/components/result-view";

/** Client-safe shapes for the `competitor_report` schema (see lib/engine/schemas.ts). All fields optional-guarded. */
type Change = { competitor?: string; signal?: string; what_changed?: string; significance?: "high" | "medium" | "low"; why_it_matters?: string };
type Intel = { competitor?: string; meaning?: string; likely_reason?: string; threat_or_opportunity?: string };
type Battlecard = { competitor?: string; strengths?: string[]; weaknesses?: string[]; pricing?: string; positioning?: string; how_to_win?: string[] };
type Source = { ref?: string; quote?: string };
export type CompetitorReportData = {
  summary?: string;
  baseline?: boolean;
  changes?: Change[];
  intel?: Intel[];
  battlecards?: Battlecard[];
  trends?: string[];
  filtered_noise_count?: number;
  flags?: string[];
  sources?: Source[];
  confidence?: number;
};

type Verdict = { verdict?: string; conflicts?: string[] } | null | undefined;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const sigTone: Record<string, "coral" | "amber" | "neutral"> = { high: "coral", medium: "amber", low: "neutral" };

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Fact-checked — every change and claim traces to a captured source." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Fact-checked — a few claims couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: "Fact-checked — some claims didn’t match the captured sources; see the flags." };
  return null;
}

/** Plain-language renderer for a Competitor Intelligence run — changes, intel, battlecards, trends. */
export function CompetitorReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  if (!report || typeof report !== "object") return null;
  const r = report as CompetitorReportData;
  const changes = arr<Change>(r.changes).slice().sort((a, b) => {
    const rank = (s?: string) => (s === "high" ? 0 : s === "medium" ? 1 : 2);
    return rank(a.significance) - rank(b.significance);
  });
  const intel = arr<Intel>(r.intel);
  const battlecards = arr<Battlecard>(r.battlecards);
  const trends = arr<string>(r.trends);
  const flags = arr<string>(r.flags);
  const sources = arr<Source>(r.sources);
  const dc = doubleChecked(verification);

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {isMock && <Badge tone="amber">demo run</Badge>}
          {r.baseline && <Badge tone="sky">baseline</Badge>}
          <ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} />
        </div>
        <section className="squircle rounded-4 border border-line bg-bg-elev p-8 space-y-3">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="font-title text-2xl font-medium">Competitor intel</h2>
            <p className="text-sm text-fg-muted">
              <span className="num">{changes.length}</span> material change{changes.length === 1 ? "" : "s"}
              {typeof r.filtered_noise_count === "number" && r.filtered_noise_count > 0 && <> · <span className="num">{r.filtered_noise_count}</span> noise filtered</>}
            </p>
          </div>
          {r.summary && <p className="text-lg leading-relaxed text-fg-muted">{r.summary}</p>}
        </section>
        {dc && (
          <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}>
            <span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />
            {dc.text}
          </p>
        )}
      </div>

      {/* TRENDS */}
      {trends.length > 0 && (
        <section className="squircle rounded-4 border border-violet/30 bg-violet-soft/40 p-6 space-y-2">
          <p className="font-title text-lg font-medium text-violet">Trends over time</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">{trends.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </section>
      )}

      {/* CHANGES */}
      {changes.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">What changed</h3>
          <div className="space-y-3">
            {changes.map((c, i) => (
              <div key={i} className="squircle rounded-4 border border-line bg-bg-elev p-5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {c.competitor && <span className="font-medium">{c.competitor}</span>}
                  {c.signal && <Badge>{c.signal}</Badge>}
                  <Badge tone={sigTone[c.significance ?? "medium"]}>{c.significance ?? "medium"}</Badge>
                </div>
                {c.what_changed && <p className="text-fg">{c.what_changed}</p>}
                {c.why_it_matters && <p className="text-sm text-green">Why it matters: {c.why_it_matters}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* INTEL */}
      {intel.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-title text-xl font-medium">What it signals</h3>
          <div className="space-y-3">
            {intel.map((x, i) => (
              <div key={i} className="squircle rounded-3 bg-bg-elev-2 p-5 space-y-1">
                {x.competitor && <p className="font-medium">{x.competitor}</p>}
                {x.meaning && <p className="text-fg-muted">{x.meaning}</p>}
                {x.likely_reason && <p className="text-sm text-fg-faint">Likely reason: {x.likely_reason}</p>}
                {x.threat_or_opportunity && <p className="text-sm text-coral">→ {x.threat_or_opportunity}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BATTLECARDS */}
      {battlecards.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">Battlecards</h3>
          <div className="space-y-3">
            {battlecards.map((b, i) => (
              <div key={i} className="squircle rounded-4 border border-line bg-bg-elev p-6 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-title text-lg font-medium">{b.competitor}</p>
                  {b.pricing && <span className="text-sm text-fg-muted">Pricing: {b.pricing}</span>}
                </div>
                {b.positioning && <p className="text-sm text-fg-muted">{b.positioning}</p>}
                <div className="grid md:grid-cols-2 gap-4">
                  {arr<string>(b.strengths).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-fg-faint">Strengths</p>
                      <ul className="space-y-1 text-sm">{arr<string>(b.strengths).map((s, j) => <li key={j} className="flex gap-2"><span className="text-coral shrink-0">▲</span><span className="text-fg-muted">{s}</span></li>)}</ul>
                    </div>
                  )}
                  {arr<string>(b.weaknesses).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-fg-faint">Weaknesses</p>
                      <ul className="space-y-1 text-sm">{arr<string>(b.weaknesses).map((s, j) => <li key={j} className="flex gap-2"><span className="text-green shrink-0">▼</span><span className="text-fg-muted">{s}</span></li>)}</ul>
                    </div>
                  )}
                </div>
                {arr<string>(b.how_to_win).length > 0 && (
                  <div className="space-y-1 border-t border-line/60 pt-3">
                    <p className="text-xs uppercase tracking-wide text-green">How to win</p>
                    <ul className="space-y-1 text-sm">{arr<string>(b.how_to_win).map((s, j) => <li key={j} className="flex gap-2"><span className="text-green shrink-0">✓</span><span>{s}</span></li>)}</ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FLAGS */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Before you act on this</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </section>
      )}

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
