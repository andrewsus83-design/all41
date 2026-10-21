import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";

/**
 * A Supabase client with no session: what a guest who is not signed in is.
 * It can only read what the anon role may read and call the public functions
 * (a41_* in schema public) that check an invitation token themselves.
 */
export function createAnonClient() {
  const { url, publishableKey } = supabaseEnv();
  return createSupabaseClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
