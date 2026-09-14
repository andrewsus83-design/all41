import { createClient, requireUser } from "@/lib/supabase/server";
import { loadCatalog } from "./catalog";
import { getBalance } from "@/lib/finance";
import { BuildClient } from "@/components/build/build-client";
import type { PastTask } from "@/components/apps/task-view";

export const metadata = { title: "Apps" };

export default async function BuildPage(props: PageProps<"/build">) {
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
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Apps</h1>
        <p className="text-fg-muted">Pick an app — it opens full-screen, where a consultant walks you through a few questions, runs it once for real, then you publish.</p>
      </header>
      <BuildClient apps={apps} preselect={preselect} task={task} balance={balance} />
    </div>
  );
}
