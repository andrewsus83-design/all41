import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { loadStats } from "@/lib/checkin/queries";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/**
 * The live numbers of the door, polled by every staff phone every few seconds.
 * One cheap database call; row level security decides whether the caller may see the event.
 */
export async function GET(_request: NextRequest, context: RouteContext<"/dashboard/events/[eventId]/checkin/live">) {
  if (!(await getCurrentUser())) return Response.json({ error: "signed_out" }, { status: 401, headers: NO_STORE });

  const { eventId } = await context.params;
  if (!z.uuid().safeParse(eventId).success) return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  const supabase = await createClient();
  const result = await loadStats(supabase, eventId, 8);
  if (!result.ok) {
    const status = result.error.code === "42501" ? 403 : 500;
    if (status === 500) console.error("[a41] check-in stats failed", result.error.code, result.error.message);
    return Response.json({ error: status === 403 ? "forbidden" : "failed" }, { status, headers: NO_STORE });
  }

  return Response.json({ stats: result.value, at: new Date().toISOString() }, { headers: NO_STORE });
}
