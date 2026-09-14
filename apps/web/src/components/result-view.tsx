import { Badge } from "@/components/ui/badge";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { SeoReport } from "@/components/apps/seo-report";
import { ProposalReport } from "@/components/apps/proposal-report";
import { ClipReport } from "@/components/apps/clip-report";
import { WebsiteReport } from "@/components/apps/website-report";
import { ContentReport } from "@/components/apps/content-report";

type Source = { ref: string; quote: string };
type AnyOutput = Record<string, unknown> & { title?: string; sources?: Source[]; confidence?: number };

export function ConfidenceBadge({ value }: { value: number | undefined }) {
  if (value === undefined || Number.isNaN(value)) return null;
  const tone = value >= 0.8 ? "green" : value >= 0.5 ? "amber" : "red";
  return (
    <Badge tone={tone}>
      confidence <span className="num">{Math.round(value * 100)}%</span>
    </Badge>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-fg-faint">{label}</p>
      {children}
    </div>
  );
}

function List({ items }: { items: unknown }) {
  if (!Array.isArray(items) || items.length === 0) return <p className="text-fg-faint text-sm">—</p>;
  return (
    <ul className="space-y-1.5 list-disc pl-5">
      {items.map((it, i) => (
        <li key={i}>{typeof it === "string" ? it : JSON.stringify(it)}</li>
      ))}
    </ul>
  );
}

type VerificationHint = { verdict?: string; conflicts?: string[] } | null;

/** Renders any OUTPUT_SCHEMAS shape (answer/report/briefing/content_pack/seo_report) + sources + confidence. */
export function ResultView({ output, schema, isMock, modelsUsed, verification }: { output: unknown; schema?: string; isMock?: boolean; modelsUsed?: string[]; verification?: VerificationHint }) {
  const o = (output ?? {}) as AnyOutput;
  if (!output || typeof output !== "object") return <Card><CardHint>No output.</CardHint></Card>;
  // The flagship SEO/GEO Optimizer gets its own rich renderer (dials, quick wins, GEO, flags).
  if (schema === "seo_report" || "health_score" in o) {
    return <SeoReport report={output} isMock={isMock} verification={verification} />;
  }
  // The Proposal / RFP Maker gets its own renderer (compliance meter, matrix, win themes, flags).
  if (schema === "proposal_report" || "compliance_matrix" in o) {
    return <ProposalReport report={output} isMock={isMock} verification={verification} />;
  }
  // Clip Video gets its own renderer (score dials, per-clip cards, honest drops, render note).
  if (schema === "clip_report" || "clips" in o) {
    return <ClipReport report={output} isMock={isMock} verification={verification} />;
  }
  // Web Builder gets its own renderer (live URL, per-page structure, style, SEO/GEO, flags).
  if (schema === "website_report" || "live_url" in o) {
    return <WebsiteReport report={output} isMock={isMock} verification={verification} />;
  }
  // Content Pipeline gets its own renderer (core piece, channel-native repurposes, schedule).
  if (schema === "content_report" || "repurposes" in o) {
    return <ContentReport report={output} isMock={isMock} verification={verification} />;
  }
  const sources = Array.isArray(o.sources) ? o.sources : [];
  return (
    <Card className="space-y-6 border-green/30">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <CardTitle className="text-2xl">{o.title ?? "Result"}</CardTitle>
        <div className="flex gap-2 flex-wrap">
          {isMock && <Badge tone="amber">mock</Badge>}
          <ConfidenceBadge value={typeof o.confidence === "number" ? o.confidence : undefined} />
        </div>
      </div>

      {schema === "report" || "table" in o ? (
        <>
          {typeof o.summary === "string" && <p className="text-lg leading-relaxed">{o.summary}</p>}
          {Array.isArray(o.table) && o.table.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-fg-faint text-xs uppercase tracking-wide">
                  <tr><th className="text-left py-2 pr-4">Dimension</th><th className="text-left py-2 pr-4">Them</th><th className="text-left py-2">You</th></tr>
                </thead>
                <tbody>
                  {(o.table as Array<Record<string, string>>).map((r, i) => (
                    <tr key={i} className="border-t border-line"><td className="py-2 pr-4 text-fg-muted">{r.dimension}</td><td className="py-2 pr-4">{r.them}</td><td className="py-2">{r.you}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            <Section label="Threats"><List items={o.threats} /></Section>
            <Section label="Opportunities"><List items={o.opportunities} /></Section>
          </div>
          {typeof o.next_move === "string" && o.next_move && <Section label="Next move"><p className="text-green">{o.next_move}</p></Section>}
        </>
      ) : "items" in o && Array.isArray(o.items) ? (
        <div className="space-y-4">
          {(o.items as Array<Record<string, string>>).map((it, i) => (
            <div key={i} className="squircle rounded-3 bg-bg-elev-2 p-5 space-y-1">
              <p className="font-title font-medium text-lg">{it.headline}</p>
              <p className="text-fg-muted">{it.why_it_matters}</p>
              {it.action && <p className="text-green text-sm">→ {it.action}</p>}
            </div>
          ))}
        </div>
      ) : "drafts" in o && Array.isArray(o.drafts) ? (
        <div className="space-y-4">
          {(o.drafts as Array<Record<string, string>>).map((d, i) => (
            <div key={i} className="squircle rounded-3 bg-bg-elev-2 p-5 space-y-2">
              <Badge>{d.platform}</Badge>
              <p className="font-title font-medium text-lg">{d.hook}</p>
              <p className="whitespace-pre-wrap text-fg-muted">{d.body}</p>
              {d.cta && <p className="text-green text-sm">{d.cta}</p>}
            </div>
          ))}
        </div>
      ) : "markdown" in o ? (
        <pre className="whitespace-pre-wrap text-sm text-fg-muted font-sans">{String(o.markdown)}</pre>
      ) : "results" in o && Array.isArray(o.results) ? (
        <List items={(o.results as Array<Record<string, string>>).map((r) => `${r.title} — ${r.link}`)} />
      ) : (
        <>
          {typeof o.answer === "string" && <p className="text-lg leading-relaxed whitespace-pre-wrap">{o.answer}</p>}
          {Array.isArray(o.key_points) && o.key_points.length > 0 && <Section label="Key points"><List items={o.key_points} /></Section>}
          {typeof o.next_action === "string" && o.next_action && <Section label="Next action"><p className="text-green">{o.next_action}</p></Section>}
          {Array.isArray(o.gaps) && o.gaps.length > 0 && <Section label="Gaps"><List items={o.gaps} /></Section>}
        </>
      )}

      {sources.length > 0 && (
        <Section label={`Sources · ${sources.length}`}>
          <ul className="space-y-2 text-sm">
            {sources.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="num text-fg-faint shrink-0 max-w-[10rem] truncate">{s.ref}</span>
                <span className="text-fg-muted">“{s.quote}”</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {modelsUsed && modelsUsed.length > 0 && <p className="text-xs text-fg-faint">Models: <span className="num">{modelsUsed.join(", ")}</span></p>}
    </Card>
  );
}
