import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAppInstance, estimateInstanceCost, type RunEvent } from "@/lib/engine/apps";
import { getBalance, InsufficientCreditError } from "@/lib/finance";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Runs one of the user's app instances and streams plain-words progress as SSE.
 * Body: { instanceId, preview? }. Final frame: { step: "result", taskId, result, billedUsd }.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("UNAUTHENTICATED", { status: 401 });

  const body = (await req.json().catch(() => null)) as { instanceId?: string; preview?: boolean } | null;
  const instanceId = body?.instanceId ?? "";
  if (!instanceId) return new Response(JSON.stringify({ error: "MISSING_INSTANCE" }), { status: 400 });

  // RLS: only the owner can see it
  const { data: inst } = await supabase.from("user_app_instances").select("id, status, config, mini_apps(workflow_def)").eq("id", instanceId).maybeSingle();
  if (!inst) return new Response(JSON.stringify({ error: "NOT_FOUND" }), { status: 404 });
  const preview = Boolean(body?.preview) || inst.status === "draft";

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        // pre-flight: tell the user before we spend anything
        // A Level-3 (agent) app estimates at its credit CEILING ("up to") — the balance must cover the whole cap before it starts.
        const [est, balance] = await Promise.all([
          estimateInstanceCost({ config: inst.config, mini_apps: inst.mini_apps as unknown as { workflow_def: never } }).catch(() => ({ billedUsd: 0, steps: [], label: "about" as const })),
          getBalance(user.id).catch(() => 0),
        ]);
        const upTo = est.label === "up to";
        send({ step: "estimate", billedUsd: est.billedUsd, balance, upTo });
        if (balance < est.billedUsd) {
          send({ step: "blocked", message: `Not enough credit — balance $${balance.toFixed(2)}, this needs ${upTo ? "up to" : "about"} $${est.billedUsd.toFixed(upTo ? 2 : 4)}. Top up to try it.`, balance, needed: est.billedUsd });
          return;
        }
        const r = await runAppInstance(instanceId, { preview, onEvent: (e: RunEvent) => send(e) });
        send({ step: "result", taskId: r.taskId, result: r.result, billedUsd: r.billedUsd });
      } catch (err) {
        // runAppInstance already emitted blocked/error; make sure the client has something either way
        if (err instanceof InsufficientCreditError) send({ step: "blocked", message: `Not enough credit — balance $${err.balance.toFixed(2)}. Top up to continue.`, balance: err.balance, needed: err.needed, dup: true });
        else send({ step: "error", message: err instanceof Error ? err.message : String(err), dup: true });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
