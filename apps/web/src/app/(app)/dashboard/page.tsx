import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/finance";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";

export const metadata = { title: "Dashboard" };

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d = new Date()) { const x = startOfDay(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; }

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const weekStart = startOfWeek().toISOString();
  const dayStart = startOfDay().toISOString();

  const [balance, { data: weekUsage }, { data: tasks }, { data: instances }, { count: taskCount }, { data: allBilled }] = await Promise.all([
    getBalance(user.id).catch(() => 0),
    supabase.from("api_usage_log").select("billed_usd, created_at").gte("created_at", weekStart),
    supabase.from("tasks").select("id, briefing, status, task_type, models_used, total_billed, created_at, app_instance_id").order("created_at", { ascending: false }).limit(12),
    supabase.from("user_app_instances").select("id, name, schedule, status, next_run_at, run_count").eq("status", "active").order("next_run_at"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).in("status", ["done", "failed", "blocked"]),
    supabase.from("tasks").select("total_billed").eq("status", "done"),
  ]);

  const spentWeek = (weekUsage ?? []).reduce((n, r) => n + Number(r.billed_usd), 0);
  const spentToday = (weekUsage ?? []).filter((r) => r.created_at >= dayStart).reduce((n, r) => n + Number(r.billed_usd), 0);
  const doneTasks = allBilled ?? [];
  const avg = doneTasks.length ? doneTasks.reduce((n, r) => n + Number(r.total_billed), 0) / doneTasks.length : 0;

  return (
    <div className="max-w-5xl space-y-10">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Dashboard</h1>
        <p className="text-fg-muted">Plain dollars. Real usage. Nothing hidden.</p>
      </header>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="md:col-span-2 space-y-2">
          <CardHint>Credit balance</CardHint>
          <p className="text-6xl font-semibold"><Money usd={balance} /></p>
          <Link href="/settings/billing" className="text-sm text-green hover:underline">Top up →</Link>
        </Card>
        <Card className="space-y-2"><CardHint>Spent today</CardHint><p className="text-3xl"><Money usd={spentToday} /></p></Card>
        <Card className="space-y-2"><CardHint>Spent this week</CardHint><p className="text-3xl"><Money usd={spentWeek} /></p></Card>
        <Card className="space-y-2"><CardHint>Tasks run</CardHint><p className="text-3xl num">{taskCount ?? 0}</p></Card>
        <Card className="space-y-2"><CardHint>Avg cost / task</CardHint><p className="text-3xl"><Money usd={avg} /></p></Card>
        <Card className="md:col-span-2 space-y-2">
          <CardHint>Active apps</CardHint>
          {(instances ?? []).length === 0 ? (
            <p className="text-fg-faint text-sm">None yet — <Link href="/my-apps" className="text-green underline">pick one</Link>.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {(instances ?? []).map((i) => (
                <li key={i.id} className="flex justify-between gap-4">
                  <span className="truncate">{i.name}</span>
                  <span className="num text-fg-faint text-xs">{i.schedule} · next {i.next_run_at ? new Date(i.next_run_at).toLocaleString() : "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="space-y-4">
        <CardTitle className="text-xl">Recent tasks</CardTitle>
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-fg-faint">
              <tr className="border-b border-line">
                <th className="text-left px-6 py-3">What</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Models</th><th className="text-right px-4 py-3">Billed</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-fg-faint">No tasks yet. <Link href="/build" className="text-green underline">Brief one</Link>.</td></tr>}
              {(tasks ?? []).map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3 max-w-xs truncate">{String((t.briefing as { what?: string })?.what ?? "—")}{t.app_instance_id && <span className="text-fg-faint text-xs"> · app</span>}</td>
                  <td className="px-4 py-3 text-fg-muted">{t.task_type ?? "—"}</td>
                  <td className="px-4 py-3 num text-xs text-fg-muted max-w-[220px] truncate">{(t.models_used ?? []).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-right"><Money usd={Number(t.total_billed)} /></td>
                  <td className="px-4 py-3"><Badge tone={t.status === "done" ? "green" : t.status === "blocked" || t.status === "failed" ? "red" : "amber"}>{t.status}</Badge></td>
                  <td className="px-6 py-3 text-right num text-xs text-fg-faint">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
