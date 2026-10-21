import { z } from "zod";
import { joinQuiz } from "@/lib/games/guest";
import { guestPost } from "@/lib/games/guest-route";

const body = z.object({ token: z.string().max(200) });

/** A guest joins the live quiz of their event (and learns where they stand). */
export const POST = (request: Request) => guestPost(request, body, ({ token }) => joinQuiz(token));
