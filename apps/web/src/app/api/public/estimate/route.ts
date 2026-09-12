import { z } from "zod";
import { heuristicIntent } from "@/lib/ai/classify";
import { routeTask } from "@/lib/ai/router";
import { splitModelId } from "@/lib/ai/types";
import { estimateCost } from "@/lib/finance/cost";
import { PROVIDERS, isLlmProvider } from "@/lib/ai/providers";

const Body = z.object({ what: z.string().max(600).default(""), goal: z.string().max(400).default("") });

/** Public, unauthenticated, zero-cost: the landing-page demo's "≈ $0.03 · routed to X" preview. No secrets, no provider calls. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "bad input" }, { status: 400 });
  const { what, goal } = parsed.data;
  const text = `${what}\n${goal}`.trim() || "Compare a competitor's pricing to ours";
  const taskType = heuristicIntent(text);
  const { modelId, isMock } = await routeTask(taskType);
  const { provider, model } = splitModelId(modelId);
  const est = await estimateCost(provider, model, text.length + 1200, 1200);
  const label = isLlmProvider(provider) ? PROVIDERS[provider].label : provider;
  return Response.json({ taskType, model: modelId, providerLabel: label, modelName: model, isMock, estimatedBilledUsd: est.billedUsd }, { headers: { "Cache-Control": "no-store" } });
}
