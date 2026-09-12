import { createClient } from "@/lib/supabase/server";
import { ChatClient, type RecentTask } from "./chat-client";

export const metadata = { title: "Chat" };

export default async function ChatPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, briefing, status, task_type, models_used, total_billed, result, created_at, app_instance_id")
    .order("created_at", { ascending: false })
    .limit(25);
  const recent: RecentTask[] = (data ?? []).map((t) => ({
    id: t.id,
    what: String((t.briefing as { what?: string })?.what ?? "Untitled"),
    goal: String((t.briefing as { goal?: string })?.goal ?? ""),
    status: t.status,
    taskType: t.task_type,
    modelsUsed: t.models_used ?? [],
    billed: Number(t.total_billed ?? 0),
    result: t.result,
    createdAt: t.created_at,
    fromApp: Boolean(t.app_instance_id),
  }));
  return <ChatClient recent={recent} />;
}
