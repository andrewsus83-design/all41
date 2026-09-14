import { createClient, requireUser } from "@/lib/supabase/server";
import { loadCatalog } from "../build/catalog";
import { SplitPane } from "@/components/ui/split-pane";
import { JournalFeed, type JournalEntry, type LivingApp } from "@/components/home/journal-feed";
import { HomeAssistant, type MiniApp } from "@/components/home/home-assistant";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

type Jsonish = Record<string, unknown> | null;
function artifactTitle(result: unknown, fallback: string): string {
  const r = (result ?? {}) as Jsonish;
  const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
  const out = (o.output && typeof o.output === "object" ? o.output : o) as Record<string, unknown>;
  return String(out.title ?? out.summary ?? out.executive_summary ?? out.live_url ?? fallback).slice(0, 120);
}
function metaOf(row: { mini_apps?: { icon?: string | null; name?: string | null } | { icon?: string | null; name?: string | null }[] | null }) {
  const m = Array.isArray(row.mini_apps) ? row.mini_apps[0] : row.mini_apps;
  return { icon: m?.icon ?? "◻", name: m?.name ?? "App" };
}

const WELCOME =
  "Welcome to all41 — your personalized AI chat, armed with the right models, tools and skills, and tuned with your own context. Every result comes out sharper, faster and cheaper than a generic chatbot could give you.";

export default async function HomePage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const [{ data: profile }, { data: instances }, { data: artifacts }, { count: nodeCount }, { count: fileCount }, catalog] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("user_app_instances").select("id, name, status, schedule, mini_apps(icon, name, slug)").neq("status", "draft").order("created_at", { ascending: false }).limit(24),
    supabase.from("tasks").select("id, result, created_at, user_app_instances(name, mini_apps(icon, name))").eq("status", "done").not("result", "is", null).order("created_at", { ascending: false }).limit(40),
    supabase.from("knowledge_nodes").select("*", { count: "exact", head: true }),
    supabase.from("files").select("*", { count: "exact", head: true }),
    loadCatalog().catch(() => []),
  ]);

  const apps = instances ?? [];
  const arts = artifacts ?? [];
  const name = profile?.display_name?.trim() || (user.email?.split("@")[0] ?? "there");

  const entries: JournalEntry[] = arts.map((t) => {
    const inst = Array.isArray(t.user_app_instances) ? t.user_app_instances[0] : t.user_app_instances;
    const m = metaOf((inst ?? {}) as never);
    return {
      id: t.id,
      kind: "result",
      icon: m.icon,
      source: (inst as { name?: string } | null)?.name ?? m.name,
      title: artifactTitle(t.result, `${m.name} result`),
      at: t.created_at,
      href: `/chat?task=${t.id}`,
    };
  });

  const livingApps: LivingApp[] = apps.map((a) => {
    const m = metaOf(a);
    return { id: a.id, icon: m.icon, name: a.name ?? m.name, live: a.status !== "paused" && !!a.schedule && a.schedule !== "once" };
  });

  const miniApps: MiniApp[] = catalog
    .filter((a) => !a.isCustom)
    .map((a) => ({ slug: a.slug, name: a.name, icon: a.icon, tags: a.tags ?? [] }));

  const stats = { results: arts.length, apps: apps.length, nodes: nodeCount ?? 0, files: fileCount ?? 0 };

  return (
    <div className="h-full">
      <SplitPane
        storageKey="all41-home-split"
        defaultPct={66}
        min={42}
        max={78}
        fill
        mobileFirst="left"
        left={<JournalFeed entries={entries} name={name} stats={stats} livingApps={livingApps} welcome={WELCOME} />}
        right={<HomeAssistant apps={miniApps} name={name} />}
      />
    </div>
  );
}
