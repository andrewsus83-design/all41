import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/**
 * The signed-in user, read from the verified token in the session cookie, or
 * null. It reads request cookies, so call it inside a <Suspense> boundary.
 * Row level security checks the same token again in the database.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) return null;
  return { id: data.claims.sub, email: data.claims.email ?? null };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
