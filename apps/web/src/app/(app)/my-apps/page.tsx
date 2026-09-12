import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { InstanceControls } from "./instance-controls";

export const metadata = { title: "Apps" };

export default async function AppsPage() {
  const supabase = await createClient();
  const [{ data: apps }, { data: instances }] = await Promise.all([
    supabase.from("mini_apps").select("id, slug, name, description, icon, est_credit_cost, category").eq("is_published", true).order("sort_order"),
    supabase.from("user_app_instances").select("id, name, config, schedule, output_target, status, run_count, last_run_at, next_run_at, mini_app_id, mini_apps(slug, name, icon)").order("created_at", { ascending: false }),
  ]);
  const active = instances ?? [];

  return (
    <div className="max-w-5xl space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Apps</h1>
        <p className="text-fg-muted">Pre-built templates, configured by chat. Pick one, answer 3–4 questions, it runs.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl">Active <span className="num text-fg-faint">{active.length}</span></h2>
        {active.length === 0 ? (
          <p className="text-sm text-fg-faint">Nothing running yet. Pick an app below.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {active.map((i) => {
              const app = i.mini_apps as unknown as { slug: string; name: string; icon: string | null } | null;
              const cfg = (i.config ?? {}) as Record<string, unknown>;
              const summary = Object.entries(cfg).filter(([k]) => k !== "schedule" && k !== "output_target").map(([, v]) => (Array.isArray(v) ? v.join(", ") : String(v))).join(" · ");
              return (
                <Card key={i.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{app?.icon ?? "◻"}</span>
                      <div>
                        <CardTitle>{i.name ?? app?.name}</CardTitle>
                        <CardHint className="truncate max-w-xs">{summary || "default config"}</CardHint>
                      </div>
                    </div>
                    <Badge tone={i.status === "active" ? "green" : i.status === "paused" ? "amber" : "neutral"}>{i.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><p className="text-xs uppercase tracking-wide text-fg-faint">Schedule</p><p>{i.schedule} → {i.output_target}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-fg-faint">Runs</p><p className="num">{i.run_count}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-fg-faint">Next run</p><p className="num text-xs">{i.next_run_at ? new Date(i.next_run_at).toLocaleString() : "—"}</p></div>
                  </div>
                  <InstanceControls id={i.id} status={i.status} />
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl">Available</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {(apps ?? []).map((a) => (
            <Link key={a.id} href={`/my-apps/${a.slug}`} className="group">
              <Card className="h-full space-y-4 transition group-hover:border-line-strong group-hover:bg-bg-elev-2">
                <span className="text-4xl">{a.icon ?? "◻"}</span>
                <div className="space-y-1">
                  <CardTitle className="text-xl">{a.name}</CardTitle>
                  <CardHint>{a.description}</CardHint>
                </div>
                <p className="text-sm text-fg-muted">≈ <Money usd={Number(a.est_credit_cost)} /> per run</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
