"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { nextRunFrom, normalizeSchedule, normalizeTarget, type InstanceData } from "@/lib/engine/apps";
import type { Json } from "@/lib/supabase/database.types";

async function ownInstance(id: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("user_app_instances").select("id, schedule, status, config, name").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("NOT_FOUND");
  return { supabase, user, inst: data };
}

function done() {
  revalidatePath("/my-apps");
  revalidatePath("/calendar");
  revalidatePath("/calendar");
}

export async function pauseInstance(id: string) {
  const { supabase } = await ownInstance(id);
  await supabase.from("user_app_instances").update({ status: "paused" }).eq("id", id);
  done();
}

export async function resumeInstance(id: string) {
  const { supabase, inst } = await ownInstance(id);
  await supabase.from("user_app_instances").update({ status: "active", next_run_at: inst.schedule === "once" ? null : new Date().toISOString() }).eq("id", id);
  done();
}

export async function deleteInstance(id: string) {
  const { supabase } = await ownInstance(id);
  await supabase.from("user_app_instances").delete().eq("id", id);
  done();
}

export async function renameInstance(id: string, name: string) {
  const { supabase, user } = await ownInstance(id);
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false as const, error: "Give it a name." };
  await supabase.from("user_app_instances").update({ name: clean }).eq("id", id);
  // keep the calendar entry in step
  await supabase.from("calendar_items").update({ title: `${clean} runs` }).eq("app_instance_id", id).eq("user_id", user.id).eq("kind", "run").eq("done", false);
  done();
  return { ok: true as const };
}

/** Edit section — save the answers; schedule/output_target come along; the next run is recomputed. */
export async function updateInstanceConfig(id: string, answers: Record<string, unknown>) {
  const { supabase, user, inst } = await ownInstance(id);
  const prev = (inst.config ?? {}) as Record<string, unknown>;
  const config = { ...prev, ...answers } as Record<string, unknown>;
  const schedule = normalizeSchedule(config.schedule);
  const outputTarget = normalizeTarget(config.output_target);
  const now = new Date();
  const scheduleChanged = schedule !== inst.schedule;
  const nextRun = inst.status === "active" ? (schedule === "once" ? null : scheduleChanged ? nextRunFrom(schedule, now) : undefined) : undefined;
  const patch: { config: Json; schedule: string; output_target: string; next_run_at?: string | null; status?: string } = { config: config as Json, schedule, output_target: outputTarget };
  if (nextRun !== undefined) patch.next_run_at = nextRun;
  if (inst.status === "done" && schedule !== "once") { patch.status = "active"; patch.next_run_at = nextRunFrom(schedule, now); }
  const { error } = await supabase.from("user_app_instances").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  if (patch.next_run_at) {
    await supabase.from("calendar_items").delete().eq("app_instance_id", id).eq("user_id", user.id).eq("kind", "run").eq("done", false);
    await supabase.from("calendar_items").insert({ user_id: user.id, date: String(patch.next_run_at).slice(0, 10), title: `${inst.name ?? "App"} runs`, kind: "run", app_instance_id: id });
  }
  done();
  return { ok: true as const };
}

/** Data section — what gets included every time this app runs. */
export async function updateInstanceData(id: string, data: InstanceData, needsFresh?: "Yes" | "No") {
  const { supabase, inst } = await ownInstance(id);
  const prev = (inst.config ?? {}) as Record<string, unknown>;
  const clean: InstanceData = {
    file_ids: (data.file_ids ?? []).filter(Boolean).slice(0, 12),
    doc_ids: (data.doc_ids ?? []).filter(Boolean).slice(0, 12),
    sheet_ids: (data.sheet_ids ?? []).filter(Boolean).slice(0, 6),
    note: (data.note ?? "").trim().slice(0, 8000),
  };
  const empty = !clean.file_ids?.length && !clean.doc_ids?.length && !clean.sheet_ids?.length && !clean.note;
  const config = { ...prev, ...(needsFresh ? { needs_fresh: needsFresh } : {}) } as Record<string, unknown>;
  if (empty) delete config.data; else config.data = clean;
  const { error } = await supabase.from("user_app_instances").update({ config: config as Json }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  done();
  return { ok: true as const };
}
