import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/** Proxies the graph engine's /graph for the signed-in user (secret never leaves the server). */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const empty = { nodes: [], edges: [], engine: "offline" as const };
  if (!env.graphEngineUrl) return NextResponse.json(empty);
  const focus = req.nextUrl.searchParams.get("focus") ?? "";
  try {
    const url = `${env.graphEngineUrl}/graph?user_id=${encodeURIComponent(user.id)}${focus ? `&focus=${encodeURIComponent(focus)}` : ""}&limit=300`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${env.graphEngineSecret}` }, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return NextResponse.json({ ...empty, engine: "error" });
    const data = await res.json();
    return NextResponse.json({ nodes: data.nodes ?? [], edges: data.edges ?? [], engine: "graph" });
  } catch {
    return NextResponse.json({ ...empty, engine: "unreachable" });
  }
}
