import "server-only";

import { cacheLife } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import { huntLeaderboardSchema, quizStateSchema, type HuntLeaderboard, type QuizState } from "./schemas";

/** The play key is 32 hex characters; anything else is not worth a database call. */
export const isPlayKeyShaped = (key: string) => /^[0-9a-f]{32}$/.test(key);

// Everything phones share lives here. One call answers every phone of an event,
// so the load on the database depends on how many events are live, not on how
// many phones there are:
//   - the CDN holds the response for a second (Cache-Control, set by the route),
//   - on a server that keeps memory between requests, this cache holds it for a
//     second too and runs one database call for all the requests in that second.

/** The shared quiz state of an event, or null for an unknown key or an event that is not published. */
export async function readQuizState(playKey: string): Promise<QuizState | null> {
  "use cache";
  cacheLife({ stale: 1, revalidate: 1, expire: 2 });

  const { data, error } = await createAnonClient().rpc("a41_quiz_public_state", { p_key: playKey });
  if (error) throw new Error(`Could not read the quiz state: ${error.message}`);
  return data === null ? null : quizStateSchema.parse(data);
}

/** The shared hunt leaderboard of an event; it changes slowly, so it is kept a little longer. */
export async function readHuntLeaderboard(playKey: string): Promise<HuntLeaderboard | null> {
  "use cache";
  cacheLife({ stale: 5, revalidate: 5, expire: 10 });

  const { data, error } = await createAnonClient().rpc("a41_hunt_public_leaderboard", { p_key: playKey });
  if (error) throw new Error(`Could not read the hunt leaderboard: ${error.message}`);
  return data === null ? null : huntLeaderboardSchema.parse(data);
}
