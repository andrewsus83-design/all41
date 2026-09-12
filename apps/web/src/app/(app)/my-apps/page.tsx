import { createClient, requireUser } from "@/lib/supabase/server";
import { describeWorkflow, getInstanceWithRuns, estimateInstanceCost, type WorkflowDef } from "@/lib/engine/apps";
import { getBalance } from "@/lib/finance";
import { MyAppsClient } from "./my-apps-client";
import type { ConfigQuestion, DataLists, InstanceDetail, InstanceSummary } from "@/components/apps/types";

export const metadata = { title: "My Apps" };

export default async function MyAppsPage(props: PageProps<"/my-apps">) {
  const sp = await props.searchParams;
  const selectedId = typeof sp.id === "string" ? sp.id : null;
  const { user } = await requireUser();
  const supabase = await createClient();

  const [{ data: instances }, { data: lastTasks }, balance] = await Promise.all([
    supabase.from("user_app_instances").select("id, name, schedule, output_target, status, run_count, last_run_at, next_run_at, created_at, mini_apps(slug, name, icon)").neq("status", "draft").order("created_at", { ascending: false }),
    supabase.from("tasks").select("app_instance_id, total_billed, created_at").not("app_instance_id", "is", null).eq("status", "done").order("created_at", { ascending: false }).limit(500),
    getBalance(user.id).catch(() => 0),
  ]);
  const lastBilled = new Map<string, number>();
  for (const t of lastTasks ?? []) if (t.app_instance_id && !lastBilled.has(t.app_instance_id)) lastBilled.set(t.app_instance_id, Number(t.total_billed ?? 0));

  const list: InstanceSummary[] = (instances ?? []).map((i) => {
    const app = i.mini_apps as unknown as { slug: string; name: string; icon: string | null } | null;
    return {
      id: i.id, name: i.name ?? app?.name ?? "App", appName: app?.name ?? "App", appSlug: app?.slug ?? "", icon: app?.icon ?? "◻",
      schedule: i.schedule, outputTarget: i.output_target, status: i.status, runCount: i.run_count, lastRunAt: i.last_run_at, nextRunAt: i.next_run_at,
      lastBilled: lastBilled.get(i.id) ?? null,
    };
  });

  const activeId = selectedId && list.some((i) => i.id === selectedId) ? selectedId : (list[0]?.id ?? null);
  let detail: InstanceDetail | null = null;
  let data: DataLists = { files: [], docs: [], sheets: [] };
  if (activeId) {
    const [full, { data: files }, { data: docs }, { data: sheets }] = await Promise.all([
      getInstanceWithRuns(activeId, user.id),
      supabase.from("files").select("id, name, folder, size_bytes").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_docs").select("id, title, folder").order("updated_at", { ascending: false }).limit(100),
      supabase.from("user_tables").select("id, name, folder").order("updated_at", { ascending: false }).limit(100),
    ]);
    data = {
      files: (files ?? []).map((f) => ({ id: f.id, label: f.name, hint: f.folder ?? undefined })),
      docs: (docs ?? []).map((d) => ({ id: d.id, label: d.title, hint: d.folder ?? undefined })),
      sheets: (sheets ?? []).map((s) => ({ id: s.id, label: s.name, hint: s.folder ?? undefined })),
    };
    if (full) {
      const summary = list.find((i) => i.id === activeId)!;
      const config = (full.instance.config ?? {}) as Record<string, unknown>;
      const def = full.app.workflow_def as unknown as WorkflowDef;
      const steps = describeWorkflow(def, config);
      const est = await estimateInstanceCost({ config: full.instance.config, workflow_def: full.app.workflow_def }).catch(() => ({ billedUsd: Number(full.app.est_credit_cost) }));
      const { data: _data, ...answers } = config;
      detail = {
        ...summary,
        config: answers,
        data: (_data ?? {}) as InstanceDetail["data"],
        questions: (Array.isArray(full.app.config_schema) ? full.app.config_schema : []) as ConfigQuestion[],
        steps,
        hasFreshToggle: steps.some((s) => s.when?.startsWith("needs_fresh=")),
        estCostUsd: est.billedUsd,
        runs: full.runs.map((t) => ({
          id: t.id, status: t.status, billed: Number(t.total_billed ?? 0), createdAt: t.created_at, completedAt: t.completed_at,
          preview: Boolean((t.briefing as { preview?: boolean })?.preview), modelsUsed: t.models_used ?? [], result: t.result, error: t.error,
        })),
      };
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">My Apps</h1>
        <p className="text-fg-muted">Your apps, live. Run them, tweak them, feed them your data.</p>
      </header>
      <MyAppsClient key={activeId ?? "none"} list={list} detail={detail} data={data} balance={balance} />
    </div>
  );
}
