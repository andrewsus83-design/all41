import "server-only";

import { getGameGuest, getHuntBoard } from "@/lib/games/guest";
import { readQuizState } from "@/lib/games/shared-state";
import { getPhotoOverview } from "@/lib/photos/guest";

/** What else the host has switched on for this guest, so the invitation only offers what works. */
export interface GuestFeatures {
  /** The photo wall is on: the camera page and the shared album are open to this guest. */
  photos: boolean;
  /** A quiz has been opened and is not finished. */
  quizLive: boolean;
  /** The hunt has missions; how far this guest has got. */
  hunt: { claimed: number; total: number } | null;
  /** The event's game address, for remembering this phone's invitation. Null when games are not available. */
  playKey: string | null;
}

export const NO_FEATURES: GuestFeatures = { photos: false, quizLive: false, hunt: null, playKey: null };

/** Each feature is read on its own: one that fails to load is simply not offered, and never breaks the invitation. */
export async function loadGuestFeatures(token: string): Promise<GuestFeatures> {
  const [photos, game, hunt] = await Promise.allSettled([getPhotoOverview(token), getGameGuest(token), getHuntBoard(token)]);

  const playKey = game.status === "fulfilled" ? (game.value?.playKey ?? null) : null;

  let quizLive = false;
  if (playKey) {
    try {
      const state = await readQuizState(playKey);
      quizLive = state?.session != null && state.session.phase !== "finished";
    } catch (error) {
      console.error("[a41] could not read the quiz state for an invitation", error instanceof Error ? error.message : error);
    }
  }

  for (const result of [photos, game, hunt]) {
    if (result.status === "rejected") {
      console.error("[a41] could not read a feature for an invitation", result.reason instanceof Error ? result.reason.message : result.reason);
    }
  }

  const board = hunt.status === "fulfilled" ? hunt.value : null;

  return {
    photos: photos.status === "fulfilled" && photos.value?.photosEnabled === true,
    quizLive,
    // `total` on the board is the guest's points; the number of missions is the length of the list
    hunt: board && board.missions.length > 0 ? { claimed: board.claimed, total: board.missions.length } : null,
    playKey,
  };
}
