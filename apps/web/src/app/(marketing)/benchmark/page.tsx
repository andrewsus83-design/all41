import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { Eyebrow, Lead, N, Section, SectionHead } from "@/components/marketing/primitives";
import { Badge } from "@/components/ui/badge";
import { BenchmarkMethod } from "@/components/marketing/benchmark-method";
import { BenchmarkResults, type PathAgg, type PathKey } from "@/components/marketing/benchmark-results";

export const metadata: Metadata = {
  title: "Benchmark",
  description: "The same job, three ways, judged blind by independent AI. Proof, not claims — we publish the results as-is and never score ourselves.",
};

// Public page — no session, no service role. Reads only published rows (RLS enforces this).
const DEFAULT_METHODOLOGY = [
  "The same job, three ways, judged blind by independent AI — we don't score ourselves.",
  "",
  "We pick one fair SEO + GEO audit and give the identical prompt to a regular AI, to all41's app, and to a professional-grade stand-in. Three independent AI judges then score the outputs with the labels hidden and the order shuffled — completeness, accuracy, actionability and depth (0–10) plus an overall. We average the overall per path and publish the result as-is. We compare on quality criteria only, never by copying anyone's report.",
].join("\n");

type BenchmarkRow = { id: string; date: string; task_type: string; task_prompt: string; methodology: string | null; is_mock: boolean; status: string };
type EntryRow = { id: string; path: PathKey };
type ScoreRow = { entry_id: string; completeness: number | null; accuracy: number | null; actionability: number | null; depth: number | null; overall: number | string | null };

type Loaded = { bench: BenchmarkRow; entries: EntryRow[]; scores: ScoreRow[] } | null;

async function loadLatest(): Promise<Loaded> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  try {
    const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: bench } = await db
      .from("public_benchmarks")
      .select("id, date, task_type, task_prompt, methodology, is_mock, status")
      .eq("published", true)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!bench) return null;
    const [{ data: entries }, { data: scores }] = await Promise.all([
      db.from("public_benchmark_entries").select("id, path").eq("benchmark_id", bench.id),
      db.from("public_benchmark_scores").select("entry_id, completeness, accuracy, actionability, depth, overall").eq("benchmark_id", bench.id),
    ]);
    return { bench: bench as BenchmarkRow, entries: (entries ?? []) as EntryRow[], scores: (scores ?? []) as ScoreRow[] };
  } catch {
    // Tables not applied yet, or a transient read error — fall back to the honest "how it will work" state.
    return null;
  }
}

const avg = (ns: number[]) => (ns.length ? Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 100) / 100 : null);

function aggregate(entries: EntryRow[], scores: ScoreRow[]): PathAgg[] {
  const paths: PathKey[] = ["all41", "regular_ai", "professional"];
  return paths.map((path) => {
    const entry = entries.find((e) => e.path === path);
    const rows = entry ? scores.filter((s) => s.entry_id === entry.id) : [];
    const col = (k: keyof ScoreRow) => avg(rows.map((r) => Number(r[k])).filter((n) => Number.isFinite(n)));
    return {
      path,
      overall: col("overall"),
      criteria: { completeness: col("completeness"), accuracy: col("accuracy"), actionability: col("actionability"), depth: col("depth") },
      judges: rows.length,
      ran: Boolean(entry),
    };
  });
}

export default async function BenchmarkPage() {
  const loaded = await loadLatest();
  const methodology = loaded?.bench.methodology?.trim() || DEFAULT_METHODOLOGY;
  const paths = loaded ? aggregate(loaded.entries, loaded.scores) : [];
  // A real, countable result needs live (non-mock) data with actual judge scores.
  const isLive = Boolean(loaded && !loaded.bench.is_mock && paths.some((p) => p.overall != null));
  const mockDryRun = loaded && loaded.bench.is_mock ? loaded.bench : null;

  return (
    <>
      <Section className="pt-16 md:pt-24 pb-10">
        <div className="space-y-6 max-w-3xl">
          <Eyebrow phase="green">Benchmark · Quality Layer 3</Eyebrow>
          <h1 className="text-5xl md:text-6xl font-semibold leading-[1.04]">Proof, not claims.</h1>
          <Lead>Skill and context can&apos;t fake the result — here&apos;s what independent judges say. We run the same job three ways, have it judged blind by independent AI, and publish the scores as-is.</Lead>
        </div>
      </Section>

      {/* METHOD */}
      <Section className="pt-6">
        <SectionHead phase="green" eyebrow="How it works" title="The same job, three ways, judged blind." lead="A regular AI, all41's app, and a professional-grade stand-in all get the identical task. Independent AI judges score the outputs without knowing which is which. all41 never scores its own output." />
        <BenchmarkMethod />
      </Section>

      {/* LATEST RESULT */}
      <Section className="pb-28">
        <SectionHead
          eyebrow="Latest benchmark"
          title={isLive ? "What the judges found." : "The first live benchmark runs when the data sources are connected."}
          lead={
            isLive
              ? <>Task run on <N>{loaded!.bench.date}</N>, scored blind by independent AI judges. Real users can vote later.</>
              : <>The pipeline is built and tested end to end. Live results appear here after the AI-search data sources are connected — until then there are no scores to show, only the method above.</>
          }
        />

        {/* The task everyone was given */}
        {loaded ? (
          <div className="squircle rounded-4 border border-line bg-bg-elev p-5 mb-8 space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone="neutral">the task</Badge>
              <span className="text-xs text-fg-faint num">{loaded.bench.date}</span>
            </div>
            <p className="text-fg-muted leading-relaxed">{loaded.bench.task_prompt}</p>
          </div>
        ) : null}

        {isLive ? (
          <BenchmarkResults paths={paths} />
        ) : (
          <div className="squircle rounded-4 border border-line bg-bg-elev p-6 space-y-3">
            <p className="font-title text-lg">No live results yet</p>
            <p className="text-fg-muted leading-relaxed max-w-2xl">
              We won&apos;t post numbers we can&apos;t stand behind. The three paths, the blind judging and the scoring are all wired up and tested
              {mockDryRun ? <> — a dry run on <N>{mockDryRun.date}</N> exercised the full pipeline on an offline stand-in, which we don&apos;t count</> : null}.
              The first real benchmark publishes here once live keys and data sources are in place.
            </p>
          </div>
        )}

        {/* METHODOLOGY, in full */}
        <div className="mt-14 space-y-3 max-w-3xl">
          <p className="font-title text-lg">Methodology</p>
          <p className="text-fg-muted leading-relaxed whitespace-pre-line">{methodology}</p>
        </div>
      </Section>
    </>
  );
}
