import "server-only";
import { callModel } from "@/lib/ai/callModel";
import { routeTask } from "@/lib/ai/router";
import { OUTPUT_SCHEMAS } from "./schemas";
import { metered } from "@/lib/finance/metered";
import { splitModelId } from "@/lib/ai/types";
import { estimateCost } from "@/lib/finance/cost";

export type Verification = { verdict: "supported" | "partially_supported" | "conflicts_found"; conflicts: string[]; unsupported_claims: string[]; confidence: number; model: string; costUsd?: number; billedUsd?: number };

/** Task 2.8 — second model checks the first against retrieved sources; conflicts are surfaced, never passed silently. */
export async function verifyOutput(args: { userId: string; taskId: string; output: unknown; context: string }): Promise<Verification> {
  const { modelId } = await routeTask("verify");
  const { provider, model } = splitModelId(modelId);
  const messages = [
    { role: "system" as const, content: "You are a strict fact-checker. Compare the OUTPUT against the SOURCES only. List any claim that contradicts a source under `conflicts`, any claim with no supporting source under `unsupported_claims`. JSON only." },
    { role: "user" as const, content: `SOURCES:\n${args.context}\n\nOUTPUT:\n${JSON.stringify(args.output)}` },
  ];
  const est = await estimateCost(provider, model, messages.reduce((n, m) => n + m.content.length, 0), 400);
  const r = await metered({
    userId: args.userId, taskId: args.taskId, provider, model, callKind: "llm", estimatedBilledUsd: est.billedUsd,
    call: async () => {
      const out = await callModel({ model: modelId, messages, jsonSchema: OUTPUT_SCHEMAS.verification, temperature: 0 });
      return { result: out, usage: out.usage, latencyMs: out.latencyMs, costUsd: out.reportedCostUsd };
    },
  });
  const j = (r.result.json ?? {}) as Partial<Verification>;
  return {
    verdict: j.verdict ?? "partially_supported",
    conflicts: j.conflicts ?? [],
    unsupported_claims: j.unsupported_claims ?? [],
    confidence: Number(j.confidence ?? 0.5),
    model: modelId,
    costUsd: r.costUsd,
    billedUsd: r.billedUsd,
  };
}
