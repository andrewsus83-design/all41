import { createClient, requireUser } from "@/lib/supabase/server";
import { loadCatalog } from "../build/catalog";
import { getBalance } from "@/lib/finance";
import { BuildClient } from "@/components/build/build-client";
import type { PastTask } from "@/components/apps/task-view";

export const metadata = { title: "Chat" };

export default async function ChatPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await props.searchParams;
  const preselect = typeof sp.app === "string" ? sp.app : null;
  const taskId = typeof sp.task === "string" ? sp.task : null;
  const { user } = await requireUser();
  const supabase = await createClient();

  const [apps, balance, taskRow] = await Promise.all([
    loadCatalog(),
    getBalance(user.id).catch(() => 0),
    taskId ? supabase.from("tasks").select("id, status, total_billed, created_at, models_used, result, error, briefing, app_instance_id, user_app_instances(name)").eq("id", taskId).maybeSingle().then((r) => r.data) : Promise.resolve(null),
  ]);

  const task: PastTask | null = taskRow
    ? {
        id: taskRow.id, status: taskRow.status, billed: Number(taskRow.total_billed ?? 0), createdAt: taskRow.created_at, modelsUsed: taskRow.models_used ?? [],
        result: taskRow.result, error: taskRow.error, instanceId: taskRow.app_instance_id,
        appName: (taskRow.user_app_instances as unknown as { name: string | null } | null)?.name ?? String((taskRow.briefing as { what?: string })?.what ?? "").split(":")[0] ?? null,
        preview: Boolean((taskRow.briefing as { preview?: boolean })?.preview),
      }
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* the AI leads — you just answer */}
      <div className="flex items-start gap-3 max-w-3xl">
        <span className="grid place-items-center size-10 rounded-full bg-amber-soft text-amber font-title font-bold shrink-0">a</span>
        <div className="squircle rounded-4 bg-bg-elev border border-line px-5 py-4 space-y-1">
          <p className="text-lg font-title font-medium">Hi — what do you want to get done today?</p>
          <p className="text-sm text-fg-muted">Pick one below (or tell me in your own words). I&apos;ll ask a few quick questions, run it once for real so you can see it, then it lands in your Home.</p>
        </div>
      </div>

      <BuildClient apps={apps} preselect={preselect} task={task} balance={balance} basePath="/chat" />
    </div>
  );
}
