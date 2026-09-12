import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { heuristicIntent } from "@/lib/ai/classify";
import { routeTask } from "@/lib/ai/router";
import { splitModelId } from "@/lib/ai/types";
import { estimateCost } from "@/lib/finance";
import { env } from "@/lib/env";
import { BriefingSchema, briefingToUserPrompt } from "@/lib/engine/briefing";

export const runtime = "nodejs";

/** Execute-step preview: which model runs, what it costs (server-side, no keys exposed). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = BriefingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BRIEFING", issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;

  const taskType = heuristicIntent(`${b.what}\n${b.goal}`);
  const { modelId, isMock } = await routeTask(taskType);
  const { provider, model } = splitModelId(modelId);
  const inputChars = briefingToUserPrompt(b).length + 1200 + (b.execute.use_context ? 6000 * 4 : 0);
  const est = await estimateCost(provider, model, inputChars, 1200);

  return NextResponse.json({
    taskType,
    model: modelId,
    isMock,
    estimatedCostUsd: est.costUsd,
    estimatedBilledUsd: est.billedUsd,
    groundingAvailable: Boolean(env.graphEngineUrl),
    verify: b.condition.high_stakes,
  });
}
