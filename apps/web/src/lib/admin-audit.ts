import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/** Append an entry to admin_audit_log. Never throws into the caller — auditing must not break the action. */
export async function logAudit(actor: string | null, action: string, target: string | null, detail?: unknown) {
  try {
    await adminClient().from("admin_audit_log").insert({
      actor, action, target: target ?? null, detail: (detail ?? null) as unknown as Json,
    });
  } catch (e) {
    console.error("[audit] failed", action, target, e);
  }
}
