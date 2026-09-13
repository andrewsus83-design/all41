import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ConfidenceBadge } from "@/components/result-view";

/** Client-safe shapes for the `proposal_report` schema (see lib/engine/schemas.ts). All fields optional-guarded. */
type Status = "compliant" | "partial" | "missing";
type SourceSection = "L" | "M" | "SOW" | "other";
type ComplianceRow = {
  req_id?: string;
  source_section?: SourceSection;
  requirement?: string;
  status?: Status;
  response_location?: string;
  evidence?: string;
};
type ProposalSection = { section?: string; action_title?: string; content?: string; covers_req_ids?: string[] };
type WinTheme = { theme?: string; hot_button?: string; discriminator?: string; proof_point?: string };
type ComplianceSummary = { total?: number; compliant?: number; partial?: number; missing?: number };
type Source = { ref?: string; quote?: string };
export type ProposalReportData = {
  executive_summary?: string;
  compliance_matrix?: ComplianceRow[];
  proposal_sections?: ProposalSection[];
  win_themes?: WinTheme[];
  compliance_summary?: ComplianceSummary;
  flags?: string[];
  sources?: Source[];
  confidence?: number;
};

type Verdict = { verdict?: string; conflicts?: string[] } | null | undefined;

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const statusTone: Record<Status, "green" | "amber" | "red"> = { compliant: "green", partial: "amber", missing: "red" };
const statusLabel: Record<Status, string> = { compliant: "Covered", partial: "Partial", missing: "Missing" };

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  const conflicts = arr<string>(v.conflicts).length;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Double-checked against the RFP and your materials — every claim holds up." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Double-checked — a few claims couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: `Double-checked — found ${conflicts} thing${conflicts === 1 ? "" : "s"} that didn’t line up; see the flags below.` };
  return null;
}

// ---------- the hero: compliance meter ----------
function ComplianceMeter({ summary, matrix }: { summary: ComplianceSummary; matrix: ComplianceRow[] }) {
  // Fall back to counting the matrix if the summary is missing or zeroed.
  const counted = {
    compliant: matrix.filter((r) => r.status === "compliant").length,
    partial: matrix.filter((r) => r.status === "partial").length,
    missing: matrix.filter((r) => r.status === "missing").length,
  };
  const compliant = summary.compliant ?? counted.compliant;
  const partial = summary.partial ?? counted.partial;
  const missing = summary.missing ?? counted.missing;
  const total = summary.total ?? compliant + partial + missing;
  const covered = compliant; // "covered" = fully compliant requirements
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const allGood = total > 0 && missing === 0 && partial === 0;

  return (
    <section className="squircle rounded-4 border border-line bg-bg-elev p-8 space-y-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="font-title text-2xl font-medium">Requirements coverage</h2>
        <p className={cn("text-sm", allGood ? "text-green" : missing > 0 ? "text-amber" : "text-fg-muted")}>
          {allGood ? "Every requirement covered" : missing > 0 ? "Gaps to close before you submit" : "A few partials to firm up"}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-4xl font-semibold leading-none">
          <span className="num">{covered}</span>
          <span className="text-fg-faint"> of </span>
          <span className="num">{total}</span>
          <span className="text-lg font-normal text-fg-muted"> requirements fully covered</span>
        </p>

        {/* segmented green / amber / red bar */}
        <div className="flex h-4 w-full overflow-hidden rounded-1 bg-bg-elev-2" role="img" aria-label={`${compliant} covered, ${partial} partial, ${missing} missing of ${total}`}>
          {compliant > 0 && <div className="h-full bg-green" style={{ width: `${pct(compliant)}%` }} />}
          {partial > 0 && <div className="h-full bg-amber" style={{ width: `${pct(partial)}%` }} />}
          {missing > 0 && <div className="h-full bg-red" style={{ width: `${pct(missing)}%` }} />}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2"><span className="inline-block size-2.5 rounded-full bg-green" />Covered <span className="num text-fg-muted">{compliant}</span></span>
          <span className="flex items-center gap-2"><span className="inline-block size-2.5 rounded-full bg-amber" />Partial <span className="num text-fg-muted">{partial}</span></span>
          <span className="flex items-center gap-2"><span className="inline-block size-2.5 rounded-full bg-red" />Missing <span className="num text-fg-muted">{missing}</span></span>
        </div>
      </div>
    </section>
  );
}

/** Beautiful, plain-language renderer for a full proposal / RFP response. Works in server and client trees (no hooks). */
export function ProposalReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  if (!report || typeof report !== "object") return null;
  const r = report as ProposalReportData;
  const matrix = arr<ComplianceRow>(r.compliance_matrix);
  const sections = arr<ProposalSection>(r.proposal_sections);
  const winThemes = arr<WinTheme>(r.win_themes);
  const sources = arr<Source>(r.sources);
  const flags = arr<string>(r.flags);
  const summary = r.compliance_summary ?? {};
  const dc = doubleChecked(verification);

  return (
    <div className="space-y-8">
      {/* HERO — the artifact that wins or loses the bid */}
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {isMock && <Badge tone="amber">demo run</Badge>}
          <ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} />
        </div>
        <ComplianceMeter summary={summary} matrix={matrix} />
        {dc && (
          <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}>
            <span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />
            {dc.text}
          </p>
        )}
      </div>

      {/* EXECUTIVE SUMMARY — answer-first, the lead */}
      {r.executive_summary && (
        <section className="squircle rounded-4 border border-green/30 bg-green-soft p-8 space-y-3">
          <p className="text-xs uppercase tracking-wide text-green">Executive summary</p>
          <p className="text-lg leading-relaxed whitespace-pre-wrap">{r.executive_summary}</p>
        </section>
      )}

      {/* FLAGS — the honesty layer; check before you submit */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Check before you submit</p>
          <p className="text-sm text-fg-muted">We only show what we can stand behind. These need your eyes before this goes out the door:</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">
            {flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </section>
      )}

      {/* PROPOSAL SECTIONS — action title is the insight, section name the eyebrow */}
      {sections.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">The proposal, section by section</h3>
          <div className="space-y-3">
            {sections.map((s, i) => (
              <details key={i} open={i === 0} className="group squircle rounded-4 border border-line bg-bg-elev">
                <summary className="flex items-start gap-3 cursor-pointer select-none list-none px-6 py-5 [&::-webkit-details-marker]:hidden">
                  <div className="space-y-1 min-w-0">
                    {s.section && <p className="text-xs uppercase tracking-wide text-fg-faint">{s.section}</p>}
                    {s.action_title && <p className="font-title text-lg font-medium leading-snug">{s.action_title}</p>}
                  </div>
                  <span className="ml-auto text-fg-faint text-sm transition-transform group-open:rotate-180 shrink-0 mt-1">▾</span>
                </summary>
                <div className="px-6 pb-6 space-y-3">
                  {s.content && <p className="text-fg-muted leading-relaxed whitespace-pre-wrap">{s.content}</p>}
                  {arr<string>(s.covers_req_ids).length > 0 && (
                    <p className="flex flex-wrap items-center gap-2 text-xs text-fg-faint">
                      Answers:
                      {arr<string>(s.covers_req_ids).map((id, j) => (
                        <span key={j} className="num inline-flex items-center h-6 px-2 rounded-1 bg-bg-elev-2 text-fg-muted">{id}</span>
                      ))}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* COMPLIANCE MATRIX — the scannable proof, scrollable so it never breaks the page */}
      {matrix.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">Compliance matrix <span className="num text-sm text-fg-faint font-normal">{matrix.length}</span></h3>
          <p className="text-sm text-fg-muted -mt-2">Every requirement in the solicitation, where we answer it, and whether it holds.</p>
          <div className="overflow-x-auto squircle rounded-4 border border-line">
            <table className="w-full text-sm border-collapse">
              <thead className="text-fg-faint text-xs uppercase tracking-wide bg-bg-elev">
                <tr>
                  <th className="text-left font-medium py-3 px-4 whitespace-nowrap">Req</th>
                  <th className="text-left font-medium py-3 px-4 whitespace-nowrap">Section</th>
                  <th className="text-left font-medium py-3 px-4 min-w-[16rem]">Requirement</th>
                  <th className="text-left font-medium py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="text-left font-medium py-3 px-4 whitespace-nowrap">Where we answer it</th>
                  <th className="text-left font-medium py-3 px-4 min-w-[14rem]">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => {
                  const status = row.status ?? "missing";
                  return (
                    <tr key={i} className="border-t border-line align-top bg-bg-elev">
                      <td className="py-3 px-4 num text-fg-muted whitespace-nowrap">{row.req_id}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.source_section && <Badge>{row.source_section}</Badge>}</td>
                      <td className="py-3 px-4">{row.requirement}</td>
                      <td className="py-3 px-4 whitespace-nowrap"><Badge tone={statusTone[status]}>{statusLabel[status]}</Badge></td>
                      <td className="py-3 px-4 text-fg-muted">{row.response_location}</td>
                      <td className="py-3 px-4 text-fg-muted">{row.evidence || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* WIN THEMES — theme → hot button → discriminator → proof */}
      {winThemes.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-title text-xl font-medium">Win themes</h3>
          <p className="text-sm text-fg-muted -mt-2">Why you’re the obvious choice — each theme answers a buyer hot button with something only you can say.</p>
          <div className="space-y-3">
            {winThemes.map((w, i) => (
              <div key={i} className="squircle rounded-3 bg-bg-elev-2 p-5 space-y-3">
                {w.theme && <p className="font-title text-lg font-medium leading-snug">{w.theme}</p>}
                <div className="grid gap-3 sm:grid-cols-3">
                  {w.hot_button && (
                    <div className="space-y-0.5">
                      <p className="text-xs uppercase tracking-wide text-fg-faint">Their hot button</p>
                      <p className="text-sm">{w.hot_button}</p>
                    </div>
                  )}
                  {w.discriminator && (
                    <div className="space-y-0.5">
                      <p className="text-xs uppercase tracking-wide text-fg-faint">What sets you apart</p>
                      <p className="text-sm">{w.discriminator}</p>
                    </div>
                  )}
                  {w.proof_point && (
                    <div className="space-y-0.5">
                      <p className="text-xs uppercase tracking-wide text-fg-faint">Proof</p>
                      <p className="text-sm text-green">{w.proof_point}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
