import "server-only";
import { env } from "@/lib/env";

/**
 * Guard for cron/ops routes. Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
 * when the CRON_SECRET env var is set. With no secret configured every call is refused (fail closed).
 */
export function isCronAuthorized(request: Request): boolean {
  if (!env.cronSecret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${env.cronSecret}`;
}

export function cronUnauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
