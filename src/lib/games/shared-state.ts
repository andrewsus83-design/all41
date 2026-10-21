import "server-only";

import { createAnonClient } from "@/lib/supabase/anon";
import { SingleFlightCache } from "./memo";
import { huntLeaderboardSchema, quizStateSchema, type HuntLeaderboard, type QuizState } from "./schemas";

/** The play key is 32 hex characters; anything else is not worth a database call. */
export const isPlayKeyShaped = (key: string) => /^[0-9a-f]{32}$/.test(key);

// Everything phones share lives here. One call answers every phone of an event,
// so the load on the database depends on how many events are live, not on how
// many phones there are. Two layers hold the answer for a second:
//   - the CDN (Cache-Control, set by the route handlers) collapses requests across the whole fleet,
//   - this per-instance cache collapses what still reaches one server instance, and runs a single
//     database call for all requests of that second, even when they arrive at the same instant.

const quizStates = new SingleFlightCache<QuizState | null>(1000);
const huntBoards = new SingleFlightCache<HuntLeaderboard | null>(5000);

/** The shared quiz state of an event, or null for an unknown key or an event that is not published. */
export function readQuizState(playKey: string): Promise<QuizState | null> {
  return quizStates.get(playKey, async () => {
    const { data, error } = await createAnonClient().rpc("a41_quiz_public_state", { p_key: playKey });
    if (error) throw new Error(`Could not read the quiz state: ${error.message}`);
    return data === null ? null : quizStateSchema.parse(data);
  });
}

/** The shared hunt leaderboard of an event; it changes slowly, so it is kept a little longer. */
export function readHuntLeaderboard(playKey: string): Promise<HuntLeaderboard | null> {
  return huntBoards.get(playKey, async () => {
    const { data, error } = await createAnonClient().rpc("a41_hunt_public_leaderboard", { p_key: playKey });
    if (error) throw new Error(`Could not read the hunt leaderboard: ${error.message}`);
    return data === null ? null : huntLeaderboardSchema.parse(data);
  });
}
