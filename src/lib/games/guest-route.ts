import "server-only";

import type { z } from "zod";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/**
 * Wraps a guest's POST: reads the JSON body, checks its shape, runs the
 * handler and answers 404 whenever the invitation token does not lead to a
 * guest of a published event. The 404 is the same for a token that never
 * existed and for one whose event is a draft.
 */
export async function guestPost<S extends z.ZodType<{ token: string }>>(
  request: Request,
  schema: S,
  handler: (input: z.output<S>) => Promise<unknown>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });

  const result = await handler(parsed.data);
  if (result === null) return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  return Response.json(result, { headers: NO_STORE });
}
