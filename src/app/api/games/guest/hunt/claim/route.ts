import { z } from "zod";
import { claimMission } from "@/lib/games/guest";
import { guestPost } from "@/lib/games/guest-route";

const body = z.object({ token: z.string().max(200), code: z.string().max(200) });

/** Redeems a mission code. The database counts wrong tries and makes a guesser wait. */
export const POST = (request: Request) => guestPost(request, body, ({ token, code }) => claimMission(token, code));
