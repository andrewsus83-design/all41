import { z } from "zod";
import { submitQuizAnswer } from "@/lib/games/guest";
import { guestPost } from "@/lib/games/guest-route";

const body = z.object({
  token: z.string().max(200),
  position: z.number().int().min(1).max(100),
  choice: z.number().int().min(0).max(3),
});

/** A guest's answer. The database decides whether it was in time and how many points it earns. */
export const POST = (request: Request) => guestPost(request, body, ({ token, position, choice }) => submitQuizAnswer(token, position, choice));
