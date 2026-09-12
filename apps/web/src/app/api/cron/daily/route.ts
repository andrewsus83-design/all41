import { isCronAuthorized, cronUnauthorized } from "@/lib/jobs/cronAuth";
import { runDailyOps } from "@/lib/jobs/dailyOps";

export const maxDuration = 300;

/** Vercel Cron entry (0 22 * * *). ?date=YYYY-MM-DD overrides the P&L day; ?skipBenchmark=1 skips model calls. */
async function handle(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? undefined;
  const skipBenchmark = url.searchParams.get("skipBenchmark") === "1";
  try {
    const report = await runDailyOps({ date, skipBenchmark });
    const { digest, ...rest } = report;
    return Response.json({ ok: true, ...rest, digest: digest ? { sent: digest.sent, reason: digest.reason } : undefined });
  } catch (err) {
    console.error("[cron/daily] failed", err);
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
