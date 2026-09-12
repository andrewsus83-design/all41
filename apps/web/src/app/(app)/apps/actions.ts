"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { runAppInstance } from "@/lib/engine/apps";
import { InsufficientCreditError } from "@/lib/finance";
import type { Json } from "@/lib/supabase/database.types";

const SCHEDULES = ["once", "daily", "weekly", "monthly"] as const;
const TARGETS = ["chat", "email", "dashboard"] as const;

function scheduleLabel(s: string) {
  return s === "once" ? "This was a one-off run" : s === "daily" ? "Runs every day" : s === "weekly" ? "Runs every week" : "Runs every month";
}

export type CreateInstanceResult =
  | { ok: true; instanceId: string; taskId: string; result: unknown; billedUsd: number; schedule: string; scheduleLabel: string; outputTarget: string }
  | { ok: false; error: string; blocked?: boolean };

/** Task 3.2 — pick → chat → ready: save the instance, run it once now, report back. */
export async function createInstanceAndRun(slug: string, config: Record<string, unknown>): Promise<CreateInstanceResult> {
  const { supabase, user } = await requireUser();
  const { data: app } = await supabase.from("mini_apps").select("id, name, slug").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!app) return { ok: false, error: "App not found." };

  const rawSchedule = String(config.schedule ?? "once").toLowerCase();
  const schedule = (SCHEDULES as readonly string[]).includes(rawSchedule) ? rawSchedule : "once";
  const rawTarget = String(config.output_target ?? "chat").toLowerCase();
  const outputTarget = (TARGETS as readonly string[]).includes(rawTarget) ? rawTarget : "chat";

  const { data: inst, error } = await supabase
    .from("user_app_instances")
    .insert({ user_id: user.id, mini_app_id: app.id, name: app.name, config: config as Json, schedule, output_target: outputTarget, status: "active", next_run_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !inst) return { ok: false, error: error?.message ?? "Could not save the app." };

  try {
    const r = await runAppInstance(inst.id);
    revalidatePath("/apps");
    revalidatePath("/dashboard");
    return { ok: true, instanceId: inst.id, taskId: r.taskId, result: r.result, billedUsd: r.billedUsd, schedule, scheduleLabel: scheduleLabel(schedule), outputTarget };
  } catch (err) {
    revalidatePath("/apps");
    if (err instanceof InsufficientCreditError) return { ok: false, blocked: true, error: `Not enough credit (balance $${err.balance.toFixed(2)}). The app is saved but paused — top up to run it.` };
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function ownInstance(id: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("user_app_instances").select("id, schedule, status").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("NOT_FOUND");
  return { supabase, user, inst: data };
}

export async function pauseInstance(id: string) {
  const { supabase } = await ownInstance(id);
  await supabase.from("user_app_instances").update({ status: "paused" }).eq("id", id);
  revalidatePath("/apps");
}

export async function resumeInstance(id: string) {
  const { supabase, inst } = await ownInstance(id);
  await supabase.from("user_app_instances").update({ status: "active", next_run_at: inst.schedule === "once" ? null : new Date().toISOString() }).eq("id", id);
  revalidatePath("/apps");
}

export async function deleteInstance(id: string) {
  const { supabase } = await ownInstance(id);
  await supabase.from("user_app_instances").delete().eq("id", id);
  revalidatePath("/apps");
}

export async function runInstanceNow(id: string): Promise<{ ok: boolean; taskId?: string; error?: string }> {
  await ownInstance(id);
  try {
    const r = await runAppInstance(id);
    revalidatePath("/apps");
    revalidatePath("/dashboard");
    return { ok: true, taskId: r.taskId };
  } catch (err) {
    revalidatePath("/apps");
    return { ok: false, error: err instanceof InsufficientCreditError ? `Not enough credit (balance $${err.balance.toFixed(2)}). Top up to continue.` : err instanceof Error ? err.message : String(err) };
  }
}
