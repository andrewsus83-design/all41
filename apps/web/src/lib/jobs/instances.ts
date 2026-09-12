import "server-only";
import { adminClient } from "@/lib/supabase/admin";

export type DueInstanceRun = { id: string; ok: boolean; taskId?: string; billedUsd?: number; error?: string };

/** Select active instances whose next_run_at has passed (Task 3.3). */
export async function selectDueInstances(limit = 20): Promise<string[]> {
  const { data, error } = await adminClient()
    .from("user_app_instances")
    .select("id")
    .eq("status", "active")
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`user_app_instances read failed: ${error.message}`);
  return (data ?? []).map((r) => r.id);
}

/** Run one instance via the engine; the engine owns next_run_at / run_count bookkeeping. Never throws. */
export async function runInstanceSafely(id: string): Promise<DueInstanceRun> {
  try {
    const { runAppInstance } = await import("@/lib/engine/apps");
    const r = await runAppInstance(id);
    return { id, ok: true, taskId: r.taskId, billedUsd: r.billedUsd };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[instances] ${id} failed: ${msg}`);
    return { id, ok: false, error: msg };
  }
}

/** Plain loop used by /api/cron/instances (Vercel Cron) — sequential to keep credit gating simple. */
export async function runDueInstancesOnce(limit = 20): Promise<{ due: number; runs: DueInstanceRun[] }> {
  const ids = await selectDueInstances(limit);
  const runs: DueInstanceRun[] = [];
  for (const id of ids) runs.push(await runInstanceSafely(id));
  return { due: ids.length, runs };
}
