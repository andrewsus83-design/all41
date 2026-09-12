import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTask, runTask, type StepEvent } from "@/lib/engine/run";
import { InsufficientCreditError } from "@/lib/finance";
import { BriefingSchema } from "@/lib/engine/briefing";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Runs the full loop and streams StepEvents as SSE. Final frame: {step:"result", ...TaskResult, taskId}. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("UNAUTHENTICATED", { status: 401 });

  const parsed = BriefingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: "INVALID_BRIEFING", issues: parsed.error.issues }), { status: 400 });

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      let taskId: string | null = null;
      try {
        const created = await createTask(user.id, parsed.data);
        taskId = created.taskId;
        send({ step: "created", taskId });
        const result = await runTask(taskId, (e: StepEvent) => send(e));
        send({ step: "result", ...result, taskId });
      } catch (err) {
        if (err instanceof InsufficientCreditError) {
          // runTask already emitted `blocked`; make sure the client has it even if createTask threw.
          send({ step: "blocked", message: `Not enough credit (balance $${err.balance.toFixed(2)}). Top up to continue.`, taskId });
        } else {
          send({ step: "error", message: err instanceof Error ? err.message : String(err), taskId });
        }
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
