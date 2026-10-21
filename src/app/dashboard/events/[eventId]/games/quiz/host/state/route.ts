import { z } from "zod";
import { quizStateSchema } from "@/lib/games/schemas";
import { createClient } from "@/lib/supabase/server";

/**
 * The live quiz for the big screen, read straight from the database as the signed-in team member.
 * Only the host screen asks for it, about once a second, so it is not cached. Someone who is not a
 * member of the event's organization gets the same 404 as for an event that does not exist.
 */
const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, context: RouteContext<"/dashboard/events/[eventId]/games/quiz/host/state">) {
  const { eventId } = await context.params;
  if (!z.uuid().safeParse(eventId).success) return Response.json({ error: "not_found" }, { status: 404, headers: PRIVATE });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("a41_quiz_host_state", { p_event: eventId });
  if (error) {
    if (error.code === "42501") return Response.json({ error: "not_found" }, { status: 404, headers: PRIVATE });
    console.error("[a41] host quiz state failed", error.code, error.message);
    return Response.json({ error: "unavailable" }, { status: 503, headers: PRIVATE });
  }
  return Response.json(quizStateSchema.parse(data), { headers: PRIVATE });
}
