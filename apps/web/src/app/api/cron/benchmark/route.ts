import { isCronAuthorized, cronUnauthorized } from "@/lib/jobs/cronAuth";
import { runBenchmark } from "@/lib/jobs/benchmark";

export const maxDuration = 300;

/** Manual benchmark trigger (Task 4.1). Optional ?types=classify,code to restrict. */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  const url = new URL(request.url);
  const types = url.searchParams.get("types")?.split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const summary = await runBenchmark({ taskTypes: types?.length ? types : undefined });
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
