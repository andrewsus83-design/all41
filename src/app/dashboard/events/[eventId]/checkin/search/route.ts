import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { searchGuests } from "@/lib/checkin/queries";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/** Finds guests by name, phone or email for the manual check-in. At most 20, from this event only. */
export async function GET(request: NextRequest, context: RouteContext<"/dashboard/events/[eventId]/checkin/search">) {
  if (!(await getCurrentUser())) return Response.json({ error: "signed_out" }, { status: 401, headers: NO_STORE });

  const { eventId } = await context.params;
  if (!z.uuid().safeParse(eventId).success) return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (query.length < 2) return Response.json({ hits: [] }, { headers: NO_STORE });

  const supabase = await createClient();
  const result = await searchGuests(supabase, eventId, query);
  if (!result.ok) {
    const status = result.error.code === "42501" ? 403 : 500;
    if (status === 500) console.error("[a41] check-in search failed", result.error.code, result.error.message);
    return Response.json({ error: status === 403 ? "forbidden" : "failed" }, { status, headers: NO_STORE });
  }

  return Response.json({ hits: result.value }, { headers: NO_STORE });
}
