import "server-only";
import { adminClient } from "@/lib/supabase/admin";

/** Task 1.6 — grant $2 once the email is verified. Idempotent; anti-abuse lives in grant_free_credit(). */
export async function ensureFreeCredit(userId: string, fingerprint?: string | null) {
  const { data, error } = await adminClient().rpc("grant_free_credit", { p_user_id: userId, p_fingerprint: fingerprint ?? undefined });
  if (error) return 0;
  return Number(data ?? 0);
}
