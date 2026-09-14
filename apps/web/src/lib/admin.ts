import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export function isAdminUser(user: User | null | undefined) {
  if (!user) return false;
  const role = (user.app_metadata as { role?: string } | undefined)?.role;
  return role === "admin" || env.adminEmails.includes((user.email ?? "").toLowerCase());
}

/** Server-side admin gate for pages and actions. */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminUser(user)) redirect("/home");
  return user!;
}
