"use client";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { ConfidenceBadge } from "@/components/result-view";

/** Client-safe shapes for the `proposal_report` schema (see lib/engine/schemas.ts). All fields optional-guarded. */
type Status = "compliant" | "partial" | "missing";
type SourceSection = "L" | "M" | "SOW" | "other";
type ComplianceRow = { req_id?: string; source_section?: SourceSection; requirement?: string; status?: Status; response_location?: string; evidence?: string };
type ProposalSection = { section?: string; action_title?: string; content?: string; covers_req_ids?: string[] };
type WinTheme = { theme?: string; hot_button?: string; discriminator?: string; proof_point?: string };
type ComplianceSummary = { total?: number; compliant?: number; partial?: number; missing?: number };
type Source = { ref?: string; quote?: string };
export type ProposalReportData = {
  title?: string;
  client?: string;
  prepared_by?: string;
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

// Document palette — a corporate proposal, independent of the app theme.
const DOC = { navy: "#1f2b47", ink: "#232a33", muted: "#5b6472", gold: "#b8862b", rule: "#e5e7eb", paper: "#ffffff", band: "#f4f2ec" };
const S = "'Source Serif 4', Georgia, serif";

const statusStyle: Record<Status, { bg: string; fg: string; label: string }> = {
  compliant: { bg: "#e6f4ec", fg: "#1c7a45", label: "Compliant" },
  partial: { bg: "#fdf3e0", fg: "#a5711a", label: "Partial" },
  missing: { bg: "#fbe9e9", fg: "#b4342b", label: "Missing" },
};

function doubleChecked(v: Verdict) {
  if (!v?.verdict) return null;
  if (v.verdict === "supported") return { tone: "green" as const, text: "Double-checked against the RFP and your materials — every claim holds up." };
  if (v.verdict === "partially_supported") return { tone: "amber" as const, text: "Double-checked — a few claims couldn’t be confirmed; they’re flagged below." };
  if (v.verdict === "conflicts_found") return { tone: "amber" as const, text: "Double-checked — some claims didn’t line up; see the flags below." };
  return null;
}

/** Proposal / RFP Maker result — rendered as a real, professional proposal document (PDF-style). */
export function ProposalReport({ report, isMock, verification }: { report: unknown; isMock?: boolean; verification?: Verdict }) {
  useEffect(() => {
    const id = "all41-doc-serif";
    if (typeof document !== "undefined" && !document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  if (!report || typeof report !== "object") return null;
  const r = report as ProposalReportData;
  const matrix = arr<ComplianceRow>(r.compliance_matrix);
  const sections = arr<ProposalSection>(r.proposal_sections);
  const winThemes = arr<WinTheme>(r.win_themes);
  const sources = arr<Source>(r.sources);
  const flags = arr<string>(r.flags);
  const summary = r.compliance_summary ?? {};
  const dc = doubleChecked(verification);

  const counted = {
    compliant: matrix.filter((x) => x.status === "compliant").length,
    partial: matrix.filter((x) => x.status === "partial").length,
    missing: matrix.filter((x) => x.status === "missing").length,
  };
  const compliant = summary.compliant ?? counted.compliant;
  const partial = summary.partial ?? counted.partial;
  const missing = summary.missing ?? counted.missing;
  const total = summary.total ?? compliant + partial + missing;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const title = r.title || "Technical & Management Proposal";
  const client = r.client || "In response to your Request for Proposal";
  const preparedBy = r.prepared_by || "Prepared with all41";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-fg-muted">Your submission-ready proposal document.</span>
        <div className="flex items-center gap-2">{isMock && <Badge tone="amber">sample</Badge>}<ConfidenceBadge value={typeof r.confidence === "number" ? r.confidence : undefined} /></div>
      </div>
      {dc && (
        <p className={cn("flex items-center gap-2 text-sm px-1", dc.tone === "green" ? "text-green" : "text-amber")}>
          <span className={cn("inline-block size-2 rounded-full", dc.tone === "green" ? "bg-green" : "bg-amber")} />{dc.text}
        </p>
      )}

      {/* THE DOCUMENT */}
      <div className="squircle rounded-4 overflow-hidden border border-line-strong shadow-lift" style={{ background: DOC.paper, color: DOC.ink, fontFamily: "Inter, system-ui, sans-serif" }}>
        {/* cover band */}
        <div style={{ background: DOC.navy, color: "#fff", padding: "40px 44px" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: DOC.gold, fontWeight: 600 }}>Request for Proposal — Response</p>
          <h1 style={{ fontFamily: S, fontWeight: 700, fontSize: "clamp(26px, 3.4vw, 38px)", lineHeight: 1.12, marginTop: 12, maxWidth: 620 }}>{title}</h1>
          <div style={{ height: 3, width: 64, background: DOC.gold, margin: "18px 0" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 28px", fontSize: 13, opacity: 0.9 }}>
            <span>{client}</span>
            <span>·</span>
            <span>{preparedBy}</span>
            <span>·</span>
            <span>Confidential</span>
          </div>
        </div>

        <div style={{ padding: "clamp(24px, 4vw, 44px)" }}>
          {/* compliance snapshot */}
          <div style={{ border: `1px solid ${DOC.rule}`, borderRadius: 12, padding: 22, background: DOC.band }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
              <p style={{ fontFamily: S, fontWeight: 600, fontSize: 18 }}>Compliance snapshot</p>
              <p style={{ fontSize: 13, color: missing > 0 ? statusStyle.missing.fg : partial > 0 ? statusStyle.partial.fg : statusStyle.compliant.fg, fontWeight: 600 }}>
                {missing > 0 ? "Gaps to close before submission" : partial > 0 ? "A few partials to firm up" : "Fully compliant"}
              </p>
            </div>
            <p style={{ marginTop: 10, fontFamily: S }}>
              <span style={{ fontSize: 34, fontWeight: 700, color: DOC.navy }}>{compliant}</span>
              <span style={{ color: DOC.muted, fontSize: 16 }}> of {total} requirements fully compliant ({pct(compliant)}%)</span>
            </p>
            <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "#e9e6df", marginTop: 12 }}>
              {compliant > 0 && <div style={{ width: `${pct(compliant)}%`, background: statusStyle.compliant.fg }} />}
              {partial > 0 && <div style={{ width: `${pct(partial)}%`, background: statusStyle.partial.fg }} />}
              {missing > 0 && <div style={{ width: `${pct(missing)}%`, background: statusStyle.missing.fg }} />}
            </div>
          </div>

          {/* executive summary */}
          {r.executive_summary && (
            <section style={{ marginTop: 34 }}>
              <SectionHead n="1" title="Executive Summary" />
              <p style={{ fontFamily: S, fontSize: 17, lineHeight: 1.7, whiteSpace: "pre-wrap", marginTop: 12 }}>{r.executive_summary}</p>
            </section>
          )}

          {/* win themes */}
          {winThemes.length > 0 && (
            <section style={{ marginTop: 34 }}>
              <SectionHead n="2" title="Win Themes" />
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                {winThemes.map((w, i) => (
                  <div key={i} style={{ borderLeft: `3px solid ${DOC.gold}`, paddingLeft: 16 }}>
                    {w.theme && <p style={{ fontFamily: S, fontWeight: 600, fontSize: 17 }}>{w.theme}</p>}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 8 }}>
                      {w.hot_button && <Facet label="Their hot button" value={w.hot_button} />}
                      {w.discriminator && <Facet label="What sets us apart" value={w.discriminator} />}
                      {w.proof_point && <Facet label="Proof" value={w.proof_point} accent />}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* proposal sections */}
          {sections.length > 0 && (
            <section style={{ marginTop: 34 }}>
              <SectionHead n="3" title="Technical & Management Approach" />
              <div style={{ marginTop: 14, display: "grid", gap: 20 }}>
                {sections.map((s, i) => (
                  <div key={i}>
                    {s.section && <p style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: DOC.gold, fontWeight: 600 }}>{s.section}</p>}
                    {s.action_title && <p style={{ fontFamily: S, fontWeight: 600, fontSize: 19, lineHeight: 1.3, marginTop: 4 }}>{s.action_title}</p>}
                    {s.content && <p style={{ fontSize: 15, lineHeight: 1.7, color: DOC.muted, marginTop: 8, whiteSpace: "pre-wrap" }}>{s.content}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* compliance matrix */}
          {matrix.length > 0 && (
            <section style={{ marginTop: 34 }}>
              <SectionHead n="4" title="Compliance Matrix" />
              <div style={{ overflowX: "auto", marginTop: 14, border: `1px solid ${DOC.rule}`, borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: DOC.navy, color: "#fff", textAlign: "left" }}>
                      {["Req", "§", "Requirement", "Status", "Where answered", "Evidence"].map((h, i) => (
                        <th key={i} style={{ padding: "10px 12px", fontWeight: 600, whiteSpace: h === "Requirement" || h === "Evidence" ? "normal" : "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, i) => {
                      const st = statusStyle[row.status ?? "missing"];
                      return (
                        <tr key={i} style={{ background: i % 2 ? "#faf9f6" : "#fff", verticalAlign: "top" }}>
                          <td style={{ padding: "10px 12px", color: DOC.muted, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{row.req_id}</td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{row.source_section}</td>
                          <td style={{ padding: "10px 12px", minWidth: 220 }}>{row.requirement}</td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}><span style={{ background: st.bg, color: st.fg, fontWeight: 600, fontSize: 12, padding: "3px 10px", borderRadius: 999 }}>{st.label}</span></td>
                          <td style={{ padding: "10px 12px", color: DOC.muted }}>{row.response_location}</td>
                          <td style={{ padding: "10px 12px", color: DOC.muted, minWidth: 180 }}>{row.evidence || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* footer rule */}
          <div style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${DOC.rule}`, display: "flex", justifyContent: "space-between", fontSize: 12, color: DOC.muted, flexWrap: "wrap", gap: 8 }}>
            <span>{preparedBy}</span><span>Confidential — for evaluation purposes</span>
          </div>
        </div>
      </div>

      {/* honesty layer (outside the document) */}
      {flags.length > 0 && (
        <section className="squircle rounded-4 border border-amber/40 bg-amber-soft p-6 space-y-2">
          <p className="font-title text-lg font-medium text-amber">Check before you submit</p>
          <ul className="space-y-1.5 list-disc pl-5 text-sm">{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </section>
      )}
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

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontFamily: S, fontWeight: 700, color: DOC.gold, fontSize: 22 }}>{n}</span>
      <h3 style={{ fontFamily: S, fontWeight: 700, fontSize: 22, color: DOC.navy }}>{title}</h3>
    </div>
  );
}
function Facet({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: DOC.muted, fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 14, marginTop: 2, color: accent ? statusStyle.compliant.fg : DOC.ink }}>{value}</p>
    </div>
  );
}
