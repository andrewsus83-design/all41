import { z } from "zod";
import { getQuizMe } from "@/lib/games/guest";
import { guestPost } from "@/lib/games/guest-route";

const body = z.object({ token: z.string().max(200) });

/** A guest's own answer, score and rank. Their result shows up only after the reveal. */
export const POST = (request: Request) => guestPost(request, body, ({ token }) => getQuizMe(token));
