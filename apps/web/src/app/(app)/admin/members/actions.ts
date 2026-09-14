"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { applyCredit } from "@/lib/finance/ledger";
import { logAudit } from "@/lib/admin-audit";

type R = { ok: boolean; message: string };

export async function grantCredit(userId: string, amountUsd: number, note: string): Promise<R> {
  const admin = await requireAdmin();
  if (!userId || !Number.isFinite(amountUsd) || amountUsd <= 0) return { ok: false, message: "amount must be > 0" };
  try {
    const bal = await applyCredit(userId, "grant", amountUsd, { note: note || "admin grant" });
    await logAudit(admin.id, "member.grant_credit", userId, { amountUsd, note });
    revalidatePath("/admin/members");
    return { ok: true, message: `Granted $${amountUsd.toFixed(2)} · new balance $${bal.toFixed(2)}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function setRole(userId: string, makeAdmin: boolean): Promise<R> {
  const admin = await requireAdmin();
  if (userId === admin.id && !makeAdmin) return { ok: false, message: "You can't remove your own admin role." };
  const { error } = await adminClient().auth.admin.updateUserById(userId, { app_metadata: { role: makeAdmin ? "admin" : "user" } });
  if (error) return { ok: false, message: error.message };
  await logAudit(admin.id, makeAdmin ? "member.make_admin" : "member.remove_admin", userId);
  revalidatePath("/admin/members");
  return { ok: true, message: makeAdmin ? "Now an admin" : "Admin removed" };
}
