import { isPlayKeyShaped, readHuntLeaderboard } from "@/lib/games/shared-state";

/** The hunt leaderboard every phone polls, shared by the CDN for a few seconds. */
const SHARED = "public, max-age=0, s-maxage=5, stale-while-revalidate=10";

export async function GET(_request: Request, context: RouteContext<"/api/games/state/[playKey]/hunt">) {
  const { playKey } = await context.params;
  if (!isPlayKeyShaped(playKey)) return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": SHARED } });

  const board = await readHuntLeaderboard(playKey);
  if (!board) return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": SHARED } });
  return Response.json(board, { headers: { "Cache-Control": SHARED } });
}
