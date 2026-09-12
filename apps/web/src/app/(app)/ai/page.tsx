import { createClient } from "@/lib/supabase/server";
import { readScope } from "@/lib/ai/thinktank";
import { AiRoom, type RoomApp, type RoomMessage, type RoomSheet, type RoomThread } from "@/components/ai/ai-room";

export const metadata = { title: "AI" };

/** The think tank: threads on the left, one scoped conversation on the right. Scope = the user's apps (+ sheets). */
export default async function AiPage(props: PageProps<"/ai">) {
  const sp = await props.searchParams;
  const threadParam = typeof sp.thread === "string" ? sp.thread : null;
  const sheetParam = typeof sp.sheet === "string" ? sp.sheet : null;

  const supabase = await createClient();
  const [{ data: instances }, { data: tables }, { data: threadRows }] = await Promise.all([
    supabase.from("user_app_instances").select("id, name, status, mini_apps(name, icon)").neq("status", "draft").order("created_at", { ascending: false }),
    supabase.from("user_tables").select("id, name, icon").order("updated_at", { ascending: false }),
    supabase.from("ai_threads").select("id, title, updated_at, app_instance_ids").order("updated_at", { ascending: false }).limit(100),
  ]);

  const apps: RoomApp[] = (instances ?? []).map((i) => {
    const mini = i.mini_apps as unknown as { name: string; icon: string | null } | null;
    return { id: i.id, name: i.name ?? mini?.name ?? "App", icon: mini?.icon ?? null, status: i.status };
  });
  const sheets: RoomSheet[] = (tables ?? []).map((t) => ({ id: t.id, name: t.name, icon: t.icon ?? null }));
  const threads: RoomThread[] = (threadRows ?? []).map((t) => ({ id: t.id, title: t.title ?? "Untitled", updatedAt: t.updated_at }));

  let active: { id: string; scope: { app_instance_ids: string[]; sheet_ids: string[] }; messages: RoomMessage[] } | null = null;
  const activeRow = threadParam ? (threadRows ?? []).find((t) => t.id === threadParam) : null;
  if (activeRow) {
    const { data: msgs } = await supabase
      .from("ai_messages")
      .select("id, role, content, cost_usd, billed_usd, meta, created_at")
      .eq("thread_id", activeRow.id)
      .order("created_at", { ascending: true });
    const sys = (msgs ?? []).find((m) => m.role === "system");
    active = {
      id: activeRow.id,
      scope: readScope(activeRow.app_instance_ids, sys?.meta),
      messages: (msgs ?? [])
        .filter((m) => m.role !== "system")
        .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content, billedUsd: Number(m.billed_usd ?? 0), meta: (m.meta ?? null) as RoomMessage["meta"], createdAt: m.created_at })),
    };
  }

  const preselectSheets = sheetParam && sheets.some((s) => s.id === sheetParam) ? [sheetParam] : [];

  return <AiRoom key={active?.id ?? "new"} apps={apps} sheets={sheets} threads={threads} active={active} preselectSheetIds={preselectSheets} />;
}
