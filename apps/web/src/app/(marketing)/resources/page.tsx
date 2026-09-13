import type { Metadata } from "next";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { NewsletterPlaceholder } from "@/components/marketing/newsletter-placeholder";
import { Eyebrow, Lead, N, Section, SectionHead } from "@/components/marketing/primitives";
import { LLM_PROVIDERS, PROVIDERS, type LlmProvider } from "@/lib/ai/providers";
import { UPDATES } from "@/content/updates";
import { getLatestBenchmarks, getLeaders, getPublishedApps, getRoutingWeights, modelLabel, splitModel, taskLabel, taskWords, type BenchmarkRow } from "../_lib/data";

export const metadata: Metadata = {
  title: "Resources",
  description: "The AI services behind each app, today's test results, and what we shipped. Built in public.",
};

/** What each service does for you, in plain words. */
const ROLE: Record<LlmProvider, string> = {
  anthropic: "Careful thinking, code, and longer writing.",
  openai: "Pulling research together into one clear answer.",
  google: "Reading web pages and summarizing them quickly.",
  groq: "Very fast sorting — what kind of job is this — and linking your notes.",
  perplexity: "Fresh research from the live web.",
  deepseek: "A challenger we test daily; wins some thinking jobs on price.",
  xai: "A challenger we test daily for writing.",
  mistral: "A challenger we test daily for short summaries.",
  mock: "",
};

export default async function ResourcesPage() {
  const [apps, leaders, bench, weights] = await Promise.all([getPublishedApps(), getLeaders(), getLatestBenchmarks(), getRoutingWeights()]);
  const real = bench.rows.length > 0 && !bench.isMock;

  // provider → apps that use it (leader of each llm step) + "every task" jobs (classify/edges)
  const appsByProvider = new Map<string, Set<string>>();
  for (const a of apps) {
    for (const s of a.steps) {
      if (s.kind !== "llm") continue;
      const leader = leaders.get(s.task_type);
      if (!leader) continue;
      const p = splitModel(leader).provider;
      if (!appsByProvider.has(p)) appsByProvider.set(p, new Set());
      appsByProvider.get(p)!.add(a.name);
    }
  }
  const everyTask = new Set<string>();
  for (const t of ["classify", "edges", "verify"]) {
    const leader = leaders.get(t);
    if (leader) everyTask.add(splitModel(leader).provider);
  }
  // provider → kinds of job it leads today (plain words)
  const leadsByProvider = new Map<string, string[]>();
  for (const [t, m] of leaders) {
    const p = splitModel(m).provider;
    if (!leadsByProvider.has(p)) leadsByProvider.set(p, []);
    leadsByProvider.get(p)!.push(taskWords(t));
  }

  // benchmark grouped by task type
  const groups = new Map<string, BenchmarkRow[]>();
  for (const r of bench.rows) {
    if (!groups.has(r.task_type)) groups.set(r.task_type, []);
    groups.get(r.task_type)!.push(r);
  }
  const candidateGroups = new Map<string, typeof weights>();
  for (const w of weights) {
    if (!candidateGroups.has(w.task_type)) candidateGroups.set(w.task_type, []);
    candidateGroups.get(w.task_type)!.push(w);
  }

  return (
    <>
      <Section className="pt-16 md:pt-24 pb-10">
        <div className="space-y-6 max-w-3xl mx-auto flex flex-col items-center text-center">
          <Eyebrow>Resources</Eyebrow>
          <h1 className="text-5xl md:text-6xl font-semibold leading-[1.04]">What is behind it, in the open.</h1>
          <Lead>The AI services behind each app, today&apos;s test results, and what we have shipped. No secrets, no jargon.</Lead>
        </div>
      </Section>

      {/* PROVIDERS */}
      <Section className="pt-6">
        <SectionHead phase="amber" eyebrow="The AI services behind each app" title="We use the well-known ones, directly." lead="Each is good at something different. We test them every day and give each job to the one doing best. You never pick." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LLM_PROVIDERS.map((p) => {
            const used = [...(appsByProvider.get(p) ?? [])];
            const core = everyTask.has(p);
            const leads = leadsByProvider.get(p) ?? [];
            return (
              <Card key={p} className="space-y-4 h-full">
                <CardTitle>{PROVIDERS[p].label}</CardTitle>
                <CardHint className="leading-relaxed">{ROLE[p]}</CardHint>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {core ? <Badge tone="green">every task</Badge> : null}
                  {used.map((n) => <Badge key={n} tone="neutral">{n}</Badge>)}
                  {!core && used.length === 0 && leads.length > 0 ? <Badge tone="green">today&apos;s pick · {leads.join(", ")}</Badge> : null}
                  {!core && used.length === 0 && leads.length === 0 ? <Badge tone="neutral">challenger</Badge> : null}
                </div>
              </Card>
            );
          })}
        </div>
        <p className="text-sm text-fg-faint mt-6">Web search and page reading use two small services of their own. None of this needs anything from you.</p>
      </Section>

      {/* BENCHMARK */}
      <Section>
        <SectionHead phase="green" eyebrow="Today's test" title="We test the AIs every day so you don't have to." lead={real ? <>Results from <N>{bench.date}</N>. The green row is the one your jobs go to today.</> : <>No real test has run yet{bench.isMock ? <> — only a dry run with an offline stand-in on <N>{bench.date}</N>, which we do not count</> : null}. These are our starting picks; the first real test runs tonight.</>} />
        <div className="space-y-6">
          {real
            ? [...groups.entries()].map(([type, rows]) => {
                const cheapest = rows.filter((r) => r.cost_per_run !== null).sort((a, b) => a.cost_per_run! - b.cost_per_run!)[0];
                const fastest = rows.filter((r) => r.latency_ms !== null).sort((a, b) => a.latency_ms! - b.latency_ms!)[0];
                const strongest = [...rows].sort((a, b) => b.score - a.score)[0];
                return (
                  <div key={type} className="squircle rounded-4 border border-line bg-bg-elev overflow-hidden">
                    <div className="px-5 py-4 border-b border-line flex flex-wrap items-center justify-between gap-3">
                      <p className="font-title text-lg">{taskLabel(type)}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
                        {cheapest ? <span>cheapest · <span className="text-fg">{modelLabel(cheapest.model).model}</span></span> : null}
                        {fastest ? <span>fastest · <span className="text-fg">{modelLabel(fastest.model).model}</span></span> : null}
                        {strongest ? <span>strongest · <span className="text-fg">{modelLabel(strongest.model).model}</span></span> : null}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs uppercase tracking-wider text-fg-faint">
                          <tr className="border-b border-line">
                            <th className="text-left px-5 py-3 font-medium">AI</th>
                            <th className="text-right px-5 py-3 font-medium">Score</th>
                            <th className="text-right px-5 py-3 font-medium">Cost / run</th>
                            <th className="text-right px-5 py-3 font-medium">Speed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => {
                            const m = modelLabel(r.model);
                            return (
                              <tr key={r.model} className={r.is_leader ? "bg-green-soft" : "border-b border-line last:border-0"}>
                                <td className="px-5 py-3">
                                  <span className={r.is_leader ? "text-green" : ""}>{m.provider}</span> <span className="font-mono text-xs text-fg-muted">{m.model}</span>
                                  {r.is_leader ? <Badge tone="green" className="ml-2">today</Badge> : null}
                                </td>
                                <td className="px-5 py-3 text-right num">{r.score.toFixed(1)}</td>
                                <td className="px-5 py-3 text-right">{r.cost_per_run !== null ? <Money usd={r.cost_per_run} /> : "—"}</td>
                                <td className="px-5 py-3 text-right num">{r.latency_ms !== null ? `${(r.latency_ms / 1000).toFixed(1)}s` : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            : [...candidateGroups.entries()].map(([type, rows]) => (
                <div key={type} className="squircle rounded-4 border border-line bg-bg-elev overflow-hidden">
                  <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
                    <p className="font-title text-lg">{taskLabel(type)}</p>
                    <span className="text-xs text-fg-faint">no runs yet</span>
                  </div>
                  <ul className="divide-y divide-line">
                    {[...rows].sort((a, b) => Number(b.is_leader) - Number(a.is_leader) || b.weight - a.weight).map((w) => {
                      const m = modelLabel(w.model);
                      return (
                        <li key={w.model} className={`px-5 py-3 text-sm flex items-center justify-between gap-3 ${w.is_leader ? "bg-green-soft" : ""}`}>
                          <span><span className={w.is_leader ? "text-green" : ""}>{m.provider}</span> <span className="font-mono text-xs text-fg-muted">{m.model}</span></span>
                          {w.is_leader ? <Badge tone="green">starting pick</Badge> : <span className="text-xs text-fg-faint">candidate</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
        </div>
      </Section>

      {/* UPDATES */}
      <Section className="pb-28">
        <SectionHead eyebrow="Updates" title="What we shipped." lead="Built in public. Newest first." />
        <ol className="space-y-8 max-w-3xl">
          {UPDATES.map((u, i) => (
            <li key={i} className="grid sm:grid-cols-[8rem_1fr] gap-2 sm:gap-8">
              <span className="num text-sm text-fg-faint pt-1">{u.date}</span>
              <div className="space-y-1.5">
                <p className="font-title text-xl font-medium">{u.title}</p>
                <p className="text-fg-muted leading-relaxed">{u.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-14 space-y-3">
          <p className="font-title text-lg">Want the next update by email?</p>
          <NewsletterPlaceholder />
        </div>
      </Section>
    </>
  );
}
