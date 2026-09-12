import { createClient } from "@/lib/supabase/server";
import { Card, CardHint } from "@/components/ui/card";
import { ModelsTable, type BenchRow } from "./models-table";

export const metadata = { title: "Models" };

export default async function ModelsPage() {
  const supabase = await createClient();
  const { data: latest } = await supabase.from("benchmark_results").select("date").order("date", { ascending: false }).limit(1).maybeSingle();
  let rows: BenchRow[] = [];
  let mode: "benchmark" | "weights" = "weights";
  if (latest?.date) {
    const { data } = await supabase.from("benchmark_results").select("task_type, model, score, latency_ms, cost_per_run, is_leader, date").eq("date", latest.date).order("task_type").order("score", { ascending: false });
    rows = (data ?? []).map((r) => ({ task_type: r.task_type, model: r.model, score: Number(r.score), latency_ms: r.latency_ms, cost_per_run: r.cost_per_run === null ? null : Number(r.cost_per_run), is_leader: r.is_leader }));
    mode = "benchmark";
  } else {
    const { data } = await supabase.from("routing_weights").select("task_type, model, weight, is_leader").order("task_type").order("weight", { ascending: false });
    rows = (data ?? []).map((r) => ({ task_type: r.task_type, model: r.model, score: Number(r.weight), latency_ms: null, cost_per_run: null, is_leader: r.is_leader }));
  }
  return (
    <div className="max-w-5xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Models</h1>
        <p className="text-fg-muted">Every day we benchmark the models we route to, per task type. The leader runs your task. You never pick — and you never pay for a worse model.</p>
      </header>
      {mode === "weights" && (
        <Card className="border-amber/30">
          <CardHint className="text-amber">Benchmark hasn’t run yet — showing the current routing weights instead. Leaders are highlighted.</CardHint>
        </Card>
      )}
      {mode === "benchmark" && <p className="text-sm text-fg-faint">Latest run: <span className="num">{latest?.date}</span></p>}
      <ModelsTable rows={rows} mode={mode} />
      <p className="text-sm text-fg-faint">Trust, not hype: scores are ours, cost is real COGS, and routing is decided by the numbers you see here.</p>
    </div>
  );
}
