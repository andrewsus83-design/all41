import { isCronAuthorized, cronUnauthorized } from "@/lib/jobs/cronAuth";
import { runPublicBenchmark } from "@/lib/jobs/publicBenchmark";

export const maxDuration = 300;

/**
 * Public monthly benchmark — Quality Layer 3 (vercel.json cron: 0 9 1 * *).
 * CRON_SECRET-guarded like the other cron routes. Optional ?taskId= / ?taskType= / ?prompt= override the task.
 */
async function handle(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId") ?? undefined;
  const taskType = url.searchParams.get("taskType") ?? undefined;
  const prompt = url.searchParams.get("prompt") ?? undefined;
  try {
    const summary = await runPublicBenchmark({ taskId, taskType, prompt });
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[cron/benchmark-public] failed", err);
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
