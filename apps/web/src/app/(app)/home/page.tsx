import { createClient, requireUser } from "@/lib/supabase/server";
import { loadCatalog } from "../build/catalog";
import { SplitPane } from "@/components/ui/split-pane";
import { JournalPanel, type JournalEntry, type LivingApp } from "@/components/home/journal-panel";
import { HomeAssistant, type MiniApp } from "@/components/home/home-assistant";
import type { Todo, TodoKind, Cadence } from "./journal-actions";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

type Jsonish = Record<string, unknown> | null;
function outOf(result: unknown) {
  const r = (result ?? {}) as Jsonish;
  const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
  return (o.output && typeof o.output === "object" ? o.output : o) as Record<string, unknown>;
}
function artifactTitle(result: unknown, fallback: string): string {
  const out = outOf(result);
  return String(out.title ?? out.summary ?? out.executive_summary ?? out.live_url ?? fallback).slice(0, 120);
}
function artifactBody(result: unknown, fallback: string): string {
  const out = outOf(result);
  return String(out.executive_summary ?? out.summary ?? out.body ?? out.markdown ?? out.content ?? out.title ?? out.live_url ?? fallback).slice(0, 4000);
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

  // Journal extras — tolerate the pre-migration state (missing column/table → empty).
  const [{ data: spaceRow }, { data: todoRows }, { data: noteRows }] = await Promise.all([
    supabase.from("profiles").select("space_name").eq("id", user.id).maybeSingle(),
    supabase.from("journal_todos").select("id, title, kind, cadence, done").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("journal_notes").select("id, body, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const apps = instances ?? [];
  const arts = artifacts ?? [];
  const name = profile?.display_name?.trim() || (user.email?.split("@")[0] ?? "there");
  const spaceName = (spaceRow as { space_name?: string | null } | null)?.space_name ?? null;

  const resultEntries: JournalEntry[] = arts.map((t) => {
    const inst = Array.isArray(t.user_app_instances) ? t.user_app_instances[0] : t.user_app_instances;
    const m = metaOf((inst ?? {}) as never);
    return {
      id: t.id, kind: "result", icon: m.icon,
      source: (inst as { name?: string } | null)?.name ?? m.name,
      title: artifactTitle(t.result, `${m.name} result`),
      detail: artifactBody(t.result, `${m.name} result`),
      at: t.created_at, href: `/chat?task=${t.id}`,
    };
  });
  const noteEntries: JournalEntry[] = (noteRows ?? []).map((n) => ({
    id: n.id, kind: "note", icon: "✍️", source: "Note", title: n.body, detail: n.body, at: n.created_at,
  }));
  const entries = [...resultEntries, ...noteEntries].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const todos: Todo[] = (todoRows ?? []).map((t) => ({ id: t.id, title: t.title, kind: t.kind as TodoKind, cadence: (t.cadence as Cadence | null) ?? null, done: t.done }));

  const livingApps: LivingApp[] = apps.map((a) => {
    const m = metaOf(a);
    return { id: a.id, icon: m.icon, name: a.name ?? m.name, live: a.status !== "paused" && !!a.schedule && a.schedule !== "once" };
  });

  const miniApps: MiniApp[] = catalog.filter((a) => !a.isCustom).map((a) => ({ slug: a.slug, name: a.name, icon: a.icon, tags: a.tags ?? [] }));
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
        left={<JournalPanel name={name} spaceName={spaceName} stats={stats} livingApps={livingApps} welcome={WELCOME} entries={entries} todos={todos} />}
        right={<HomeAssistant apps={miniApps} name={name} />}
      />
    </div>
  );
}
