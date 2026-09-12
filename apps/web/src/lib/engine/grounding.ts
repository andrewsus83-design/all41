import "server-only";
import { env } from "@/lib/env";

export type GroundingChunk = { id: string; title: string | null; content: string; node_type: string; similarity: number; hop: number; via?: string | null };
export type GroundingBundle = { chunks: GroundingChunk[]; tokenCount: number; engine: "graph" | "none"; costUsd?: number };

/**
 * Task 2.7 — fetch connected context from the graph engine's /query.
 * Never blocks a task: if the engine is unreachable, returns an empty bundle and the task runs ungrounded (flagged).
 */
export async function fetchGrounding(userId: string, query: string, tokenBudget = 6000): Promise<GroundingBundle> {
  if (!env.graphEngineUrl) return { chunks: [], tokenCount: 0, engine: "none" };
  try {
    const res = await fetch(`${env.graphEngineUrl}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.graphEngineSecret}` },
      body: JSON.stringify({ user_id: userId, query, token_budget: tokenBudget, k: 8, hops: 2 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { chunks: [], tokenCount: 0, engine: "none" };
    const data = await res.json();
    return { chunks: data.chunks ?? [], tokenCount: data.token_count ?? 0, engine: "graph", costUsd: data.cost_usd };
  } catch {
    return { chunks: [], tokenCount: 0, engine: "none" };
  }
}

export async function ingestToGraph(payload: {
  user_id: string; source_type: "file" | "task" | "app_instance" | "manual"; source_id: string;
  title: string; content: string; node_type?: string; task_id?: string;
}) {
  if (!env.graphEngineUrl) return null;
  try {
    const res = await fetch(`${env.graphEngineUrl}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.graphEngineSecret}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Task 2.9 — kick off async AI edge linking off the request path (never blocks, never throws).
    try {
      const { inngest } = await import("@/lib/jobs/inngest");
      await inngest.send({ name: "graph/node.ingested", data: { user_id: payload.user_id, source_type: payload.source_type, source_id: payload.source_id } });
    } catch (err) {
      console.warn("[grounding] inngest send skipped:", err instanceof Error ? err.message : String(err));
    }
    return data;
  } catch {
    return null;
  }
}

export function groundingToContext(g: GroundingBundle) {
  if (!g.chunks.length) return "No connected context available — answer from general knowledge and say so in `gaps`.";
  return g.chunks
    .map((c, i) => `[S${i + 1}] (${c.node_type}${c.title ? ` · ${c.title}` : ""}${c.hop ? ` · via ${c.via ?? "link"}` : ""})\n${c.content}`)
    .join("\n\n");
}
