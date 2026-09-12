import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Delete one of the user's think-tank threads (messages cascade). RLS-scoped — no admin client needed. */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/ai/threads/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { error, count } = await supabase.from("ai_threads").delete({ count: "exact" }).eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "THREAD_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
