import { isCronAuthorized, cronUnauthorized } from "@/lib/jobs/cronAuth";
import { runDueInstancesOnce } from "@/lib/jobs/instances";

export const maxDuration = 300;

/** Vercel Cron entry (every 5 min) — runs due app instances without Inngest. */
async function handle(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  try {
    const out = await runDueInstancesOnce(20);
    return Response.json({ ok: true, ...out });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
