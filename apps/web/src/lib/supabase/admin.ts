import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses RLS — use ONLY in server code that has already
 * verified the caller (financial spine, webhooks, jobs). Never import from client code.
 */
let _admin: ReturnType<typeof createClient<Database>> | null = null;
export function adminClient() {
  if (!_admin) {
    _admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _admin;
}
