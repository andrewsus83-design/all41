import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/graph/node/[id]">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await ctx.params;
  if (!env.graphEngineUrl) return NextResponse.json({ error: "ENGINE_OFFLINE" }, { status: 503 });
  try {
    const res = await fetch(`${env.graphEngineUrl}/node/${encodeURIComponent(id)}?user_id=${encodeURIComponent(user.id)}`, {
      headers: { Authorization: `Bearer ${env.graphEngineSecret}` }, signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: `ENGINE_${res.status}` }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "ENGINE_UNREACHABLE" }, { status: 503 });
  }
}
