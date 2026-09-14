import Link from "next/link";
import { createClient, requireUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { scheduleLabel } from "@/components/apps/format";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

type Jsonish = Record<string, unknown> | null;
function artifactTitle(result: unknown, fallback: string): string {
  const r = (result ?? {}) as Jsonish;
  const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
  const out = (o.output && typeof o.output === "object" ? o.output : o) as Record<string, unknown>;
  return String(out.title ?? out.summary ?? out.executive_summary ?? out.live_url ?? fallback).slice(0, 90);
}

export default async function HomePage() {
  await requireUser();
  const supabase = await createClient();

  const [{ data: instances }, { data: artifacts }, { count: nodeCount }, { count: fileCount }] = await Promise.all([
    supabase.from("user_app_instances").select("id, name, status, schedule, next_run_at, mini_apps(icon, name, slug)").neq("status", "draft").order("created_at", { ascending: false }).limit(24),
    supabase.from("tasks").select("id, result, created_at, user_app_instances(name, mini_apps(icon, name))").eq("status", "done").not("result", "is", null).order("created_at", { ascending: false }).limit(24),
    supabase.from("knowledge_nodes").select("*", { count: "exact", head: true }),
    supabase.from("files").select("*", { count: "exact", head: true }),
  ]);

  const apps = instances ?? [];
  const arts = artifacts ?? [];
  const empty = apps.length === 0 && arts.length === 0;
  const appMeta = (row: { mini_apps?: { icon?: string | null; name?: string | null } | { icon?: string | null; name?: string | null }[] | null }) => {
    const m = Array.isArray(row.mini_apps) ? row.mini_apps[0] : row.mini_apps;
    return { icon: m?.icon ?? "◻", name: m?.name ?? "App" };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">Your world</h1>
        <p className="text-fg-muted">Everything you&apos;ve built and everything all41 remembers for you — it compounds every time you use it.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted num pt-1">
          <span><span className="text-fg font-semibold">{arts.length}</span> results</span>
          <span><span className="text-fg font-semibold">{apps.length}</span> living apps</span>
          <span><span className="text-fg font-semibold">{nodeCount ?? 0}</span> memory nodes</span>
          <span><span className="text-fg font-semibold">{fileCount ?? 0}</span> files</span>
        </div>
      </header>

      {empty ? (
        <section className="squircle rounded-5 border border-line bg-bg-elev p-10 md:p-14 text-center space-y-4">
          <p className="text-2xl font-title font-medium">Your world is empty — for now.</p>
          <p className="text-fg-muted max-w-md mx-auto">Head to Chat and tell the AI what you want done. The result lands right here, and every run makes the next one smarter.</p>
          <Link href="/chat"><Button phase="green" size="lg" className="glow-coral">Start in Chat →</Button></Link>
        </section>
      ) : (
        <>
          {/* Living apps — the things that run for you */}
          {apps.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-medium">Your apps</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {apps.map((a) => {
                  const m = appMeta(a);
                  const live = a.status !== "paused" && a.schedule && a.schedule !== "once";
                  return (
                    <Link key={a.id} href={`/my-apps?id=${a.id}`} className="squircle rounded-4 border border-line bg-bg-elev p-5 space-y-2 hover:border-line-strong hover:bg-bg-elev-2 transition">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{m.icon}</span>
                        <span className="font-title font-medium truncate">{a.name ?? m.name}</span>
                        {live ? <Badge tone="green">Live</Badge> : <Badge>Once</Badge>}
                      </div>
                      <p className="text-xs text-fg-faint num">{m.name}{a.schedule && a.schedule !== "once" ? ` · ${scheduleLabel(a.schedule)}` : ""}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Artifacts — results that landed in your world */}
          {arts.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-medium">Recent results</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {arts.map((t) => {
                  const inst = Array.isArray(t.user_app_instances) ? t.user_app_instances[0] : t.user_app_instances;
                  const m = appMeta((inst ?? {}) as never);
                  return (
                    <Link key={t.id} href={`/chat?task=${t.id}`} className="squircle rounded-4 border border-line bg-bg-elev p-5 space-y-2 hover:border-line-strong hover:bg-bg-elev-2 transition">
                      <div className="flex items-center gap-2 text-xs text-fg-faint">
                        <span className="text-base">{m.icon}</span>
                        <span className="num truncate">{(inst as { name?: string } | null)?.name ?? m.name}</span>
                        <span className="ml-auto num">{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm leading-snug line-clamp-3">{artifactTitle(t.result, m.name + " result")}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <p className="text-sm text-fg-faint">Add your own files & notes in <Link href="/data" className="underline hover:text-fg">Data</Link> so every app knows more about you.</p>
        </>
      )}
    </div>
  );
}
