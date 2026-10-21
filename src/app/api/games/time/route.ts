import { connection } from "next/server";

/**
 * The server clock, never cached. Phones compare it with their own to count
 * down to a deadline the database set; the database still decides who was in time.
 */
export async function GET() {
  await connection();
  return Response.json({ now: Date.now() }, { headers: { "Cache-Control": "private, no-store" } });
}
