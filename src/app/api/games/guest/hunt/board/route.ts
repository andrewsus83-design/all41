import { z } from "zod";
import { getHuntBoard } from "@/lib/games/guest";
import { guestPost } from "@/lib/games/guest-route";

const body = z.object({ token: z.string().max(200) });

/** The missions, the guest's progress and the top of the leaderboard. Mission codes are never in it. */
export const POST = (request: Request) => guestPost(request, body, ({ token }) => getHuntBoard(token));
