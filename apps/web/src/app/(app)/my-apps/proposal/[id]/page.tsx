import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { ProposalReport } from "@/components/apps/proposal-report";
import { whichAi } from "@/components/apps/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Proposal" };

/** Agent ids (proposal_run_steps.agent) → plain words. */
const AGENT_NAMES: Record<string, string> = {
  shredder: "RFP Shredder",
  capture: "Capture Analyst",
  winthemes: "Win-Theme Strategist",
  writer: "Proposal Writer",
  editor: "Consultant-Grade Editor",
  compliance: "Compliance Checker",
  verifier: "Verifier",
};
function agentName(id: string) {
  return AGENT_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * /my-apps/proposal/[id] — the full, read-only detail of one proposal / RFP response.
 * RLS-scoped: the server client only returns runs owned by the signed-in user.
 */
export default async function ProposalPage(props: PageProps<"/my-apps/proposal/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: run } = await supabase
    .from("proposal_runs")
    .select("id, tone, deadline, proposal, compliance_matrix, win_themes, flags, status, total_cost, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!run) notFound();

  const { data: steps } = await supabase
    .from("proposal_run_steps")
    .select("id, agent, model_used, cost_usd, tokens_in, tokens_out, status, created_at")
    .eq("run_id", id)
    .order("created_at", { ascending: true });

  const stepList = steps ?? [];
  const isMock = stepList.some((s) => (s.model_used ?? "").startsWith("mock"));
  const totalCost = stepList.reduce((n, s) => n + Number(s.cost_usd ?? 0), 0) || Number(run.total_cost ?? 0);

  // Prefer the full stored report; fall back to the split columns if `proposal` is thin.
  const stored = (run.proposal ?? {}) as Record<string, unknown>;
  const report = {
    ...stored,
    compliance_matrix: stored.compliance_matrix ?? run.compliance_matrix,
    win_themes: stored.win_themes ?? run.win_themes,
    flags: stored.flags ?? run.flags,
  };

  return (
    <div className="space-y-10 max-w-4xl">
      <header className="space-y-3">
        <Link href="/my-apps" className="text-sm text-fg-muted hover:text-fg">← Back to My Apps</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-fg-faint">Full proposal</p>
            <h1 className="text-3xl font-semibold font-title">Your proposal response</h1>
            <p className="text-sm text-fg-muted">
              {run.tone ? <>{run.tone === "government" ? "Government" : "Commercial"} tone · </> : null}
              {run.deadline ? <>Due <span className="num">{run.deadline}</span> · </> : null}
              <span className="num">{fmtDate(run.created_at)}</span>
            </p>
          </div>
          <Badge tone={run.status === "done" ? "green" : run.status === "failed" ? "red" : "amber"}>
            {run.status === "done" ? "Complete" : run.status === "failed" ? "Didn’t finish" : run.status}
          </Badge>
        </div>
      </header>

      {run.proposal ? (
        <ProposalReport report={report} isMock={isMock} />
      ) : (
        <p className="text-fg-muted">This run didn’t produce a proposal.</p>
      )}

      {/* transparency / audit trail */}
      {stepList.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-title text-xl font-medium">How this was made</h2>
            <span className="text-sm text-fg-muted">Total cost <Money usd={totalCost} /></span>
          </div>
          <p className="text-sm text-fg-muted">Every specialist on the team, what it ran on, and what it cost — nothing hidden.</p>
          <ul className="divide-y divide-line border border-line rounded-3 squircle overflow-hidden">
            {stepList.map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-5 py-4">
                <span className={cn("inline-block size-2.5 rounded-full shrink-0", s.status === "ok" ? "bg-green" : "bg-red")} />
                <div className="min-w-0">
                  <p className="font-medium">{agentName(s.agent)}</p>
                  <p className="text-xs text-fg-faint truncate">
                    {whichAi([s.model_used ?? ""])}
                    {s.model_used ? <> · <span className="num">{s.model_used}</span></> : null}
                  </p>
                </div>
                <span className="ml-auto text-sm text-fg-muted whitespace-nowrap"><Money usd={Number(s.cost_usd ?? 0)} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
