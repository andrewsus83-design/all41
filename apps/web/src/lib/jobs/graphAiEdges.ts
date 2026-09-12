import { inngest, type GraphNodeIngested } from "./inngest";

/**
 * Task 2.9 — after a node is ingested, ask the graph engine to propose semantic edges + entity hubs
 * off the request path. The engine meters its own model calls.
 */
export const graphAiEdges = inngest.createFunction(
  { id: "graph-ai-edges", concurrency: { limit: 2 }, retries: 3, triggers: [{ event: "graph/node.ingested" }] },
  async ({ event, step }) => {
    const url = process.env.GRAPH_ENGINE_URL ?? "";
    if (!url) return { skipped: "GRAPH_ENGINE_URL empty" };
    const payload = event.data as GraphNodeIngested;
    return step.run("link-ai", async () => {
      const res = await fetch(`${url}/link/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GRAPH_ENGINE_SECRET ?? ""}` },
        body: JSON.stringify({ user_id: payload.user_id, source_type: payload.source_type, source_id: payload.source_id }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`graph /link/ai ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return await res.json().catch(() => ({ ok: true }));
    });
  },
);
