import { isPlayKeyShaped, readQuizState } from "@/lib/games/shared-state";

/**
 * The quiz state every phone polls. It is the same for all guests of an event,
 * so the CDN can answer for them all: s-maxage=1 means one request per second
 * reaches this function however many phones ask, and stale-while-revalidate
 * lets the CDN keep answering while that one request is refreshed.
 * It carries no answers and no guest data, so it is safe to share.
 */
const SHARED = "public, max-age=0, s-maxage=1, stale-while-revalidate=2";

export async function GET(_request: Request, context: RouteContext<"/api/games/state/[playKey]/quiz">) {
  const { playKey } = await context.params;
  if (!isPlayKeyShaped(playKey)) return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": SHARED } });

  const state = await readQuizState(playKey);
  if (!state) return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": SHARED } });
  return Response.json(state, { headers: { "Cache-Control": SHARED } });
}
