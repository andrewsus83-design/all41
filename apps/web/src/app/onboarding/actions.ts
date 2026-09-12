"use server";
import { requireUser } from "@/lib/supabase/server";
import { runAppInstance } from "@/lib/engine/apps";
import { InsufficientCreditError } from "@/lib/finance";
import type { Json } from "@/lib/supabase/database.types";

const ROLES = ["Founder", "Consultant", "Agency owner", "Freelancer", "Other"] as const;
const DEFAULT_TOPIC: Record<(typeof ROLES)[number], string> = {
  Founder: "startup growth tactics and funding news for solo founders",
  Consultant: "consulting industry trends and client-acquisition tactics",
  "Agency owner": "marketing agency trends, tools, and pricing",
  Freelancer: "freelance market rates, platforms, and client demand",
  Other: "AI tools and productivity for solo operators",
};

export type OnboardResult =
  | { ok: true; taskId: string; result: unknown; billedUsd: number; topic: string }
  | { ok: false; error: string; blocked?: boolean };

/** Task 5.1 — one question, then a real deliverable (Morning Briefing) on free credit. */
export async function completeOnboarding(roleIn: string, nicheIn: string): Promise<OnboardResult> {
  const { supabase, user } = await requireUser();
  const role = (ROLES as readonly string[]).includes(roleIn) ? (roleIn as (typeof ROLES)[number]) : "Other";
  const niche = nicheIn.trim().slice(0, 200);
  const topic = niche || DEFAULT_TOPIC[role];

  const { error: pErr } = await supabase.from("profiles").upsert({ id: user.id, role: niche ? `${role} · ${niche}` : role, onboarded_at: new Date().toISOString() }, { onConflict: "id" });
  if (pErr) return { ok: false, error: pErr.message };

  const { data: app } = await supabase.from("mini_apps").select("id, name").eq("slug", "morning-briefing").maybeSingle();
  if (!app) { return { ok: false, error: "Morning Briefing app is not available yet — head to Chat to brief your first task." }; }

  const config = { topic, angle: "All", schedule: "Once", output_target: "Chat" };
  const { data: inst, error } = await supabase
    .from("user_app_instances")
    .insert({ user_id: user.id, mini_app_id: app.id, name: app.name, config: config as Json, schedule: "once", output_target: "chat", status: "active", next_run_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !inst) return { ok: false, error: error?.message ?? "Could not create your first app." };

  try {
    const r = await runAppInstance(inst.id);
    return { ok: true, taskId: r.taskId, result: r.result, billedUsd: r.billedUsd, topic };
  } catch (err) {
    if (err instanceof InsufficientCreditError) return { ok: false, blocked: true, error: `Your free credit isn’t active yet (balance $${err.balance.toFixed(2)}). Verify your email or top up, then run it from Apps.` };
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
