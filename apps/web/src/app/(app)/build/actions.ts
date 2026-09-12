"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { estimateInstanceCost, nextRunFrom, normalizeSchedule, normalizeTarget } from "@/lib/engine/apps";
import { getBalance } from "@/lib/finance";
import type { Json } from "@/lib/supabase/database.types";

export type DraftResult =
  | { ok: true; instanceId: string; estimateUsd: number; balance: number }
  | { ok: false; error: string };

async function ownDraft(id: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("user_app_instances").select("id, status, schedule, name, config, mini_app_id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("NOT_FOUND");
  return { supabase, user, inst: data };
}

/** Build step 1 — save the consultant's answers as a draft (never scheduled, never counted) so it can be previewed live. */
export async function createDraft(slug: string, answers: Record<string, unknown>): Promise<DraftResult> {
  const { supabase, user } = await requireUser();
  // the `custom` template is unpublished (not in the public catalog) but always buildable
  const { data: app } = await adminClient().from("mini_apps").select("id, name, slug, workflow_def, is_published").eq("slug", slug).maybeSingle();
  if (!app || (!app.is_published && app.slug !== "custom")) return { ok: false, error: "That app isn't available." };

  const schedule = normalizeSchedule(answers.schedule);
  const outputTarget = normalizeTarget(answers.output_target);
  const config = { ...answers } as Record<string, unknown>;
  const name = app.slug === "custom" ? String(answers.what ?? "Custom app").slice(0, 60) : app.name;

  const { data: inst, error } = await supabase
    .from("user_app_instances")
    .insert({ user_id: user.id, mini_app_id: app.id, name, config: config as Json, schedule, output_target: outputTarget, status: "draft", next_run_at: null })
    .select("id")
    .single();
  if (error || !inst) return { ok: false, error: error?.message ?? "Could not save the draft." };

  const [est, balance] = await Promise.all([
    estimateInstanceCost({ config: config as Json, workflow_def: app.workflow_def }).catch(() => ({ billedUsd: 0 })),
    getBalance(user.id).catch(() => 0),
  ]);
  return { ok: true, instanceId: inst.id, estimateUsd: est.billedUsd, balance };
}

/** "Change answers" — update the draft in place (keeps attached data) and re-estimate. */
export async function updateDraftAnswers(id: string, answers: Record<string, unknown>): Promise<DraftResult> {
  const { supabase, user, inst } = await ownDraft(id);
  const prev = (inst.config ?? {}) as Record<string, unknown>;
  const config = { ...answers, ...(prev.data ? { data: prev.data } : {}) } as Record<string, unknown>;
  const schedule = normalizeSchedule(answers.schedule);
  const outputTarget = normalizeTarget(answers.output_target);
  const { data: app } = await adminClient().from("mini_apps").select("slug, workflow_def").eq("id", inst.mini_app_id).maybeSingle();
  const name = app?.slug === "custom" ? String(answers.what ?? inst.name ?? "Custom app").slice(0, 60) : inst.name;
  const { error } = await supabase.from("user_app_instances").update({ config: config as Json, schedule, output_target: outputTarget, name }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  const [est, balance] = await Promise.all([
    estimateInstanceCost({ config: config as Json, workflow_def: app?.workflow_def ?? { steps: [] } }).catch(() => ({ billedUsd: 0 })),
    getBalance(user.id).catch(() => 0),
  ]);
  return { ok: true, instanceId: id, estimateUsd: est.billedUsd, balance };
}

/**
 * "Publish to My Apps" — the preview already ran, so a once-only app is simply finished;
 * anything on a schedule goes live with its next run on the calendar.
 */
export async function publishDraft(id: string, name?: string): Promise<{ ok: true; instanceId: string; live: boolean } | { ok: false; error: string }> {
  const { supabase, user, inst } = await ownDraft(id);
  const cleanName = (name ?? inst.name ?? "").trim().slice(0, 80) || inst.name || "My app";
  const now = new Date();
  const nextRun = nextRunFrom(inst.schedule, now);
  const live = inst.schedule !== "once";
  const { error } = await supabase
    .from("user_app_instances")
    .update({ name: cleanName, status: live ? "active" : "done", next_run_at: nextRun })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (live && nextRun) {
    await supabase.from("calendar_items").insert({
      user_id: user.id, date: nextRun.slice(0, 10), title: `${cleanName} runs`, kind: "run", app_instance_id: id,
    });
  }
  revalidatePath("/my-apps");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { ok: true, instanceId: id, live };
}

/** "Discard" — throw the draft away (its preview runs stay in history as billed tasks). */
export async function discardDraft(id: string): Promise<{ ok: boolean }> {
  const { supabase } = await ownDraft(id);
  await supabase.from("user_app_instances").delete().eq("id", id);
  return { ok: true };
}
