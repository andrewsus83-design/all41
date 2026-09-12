import { env } from "@/lib/env";
import { IngestPanel } from "./ingest-panel";
import { GraphCanvas } from "./graph-canvas";

export const metadata = { title: "Graph" };

export default function GraphPage() {
  return (
    <div className="max-w-6xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold">Graph</h1>
        <p className="text-fg-muted">Your connected context. Every task is grounded here — the more you add, the sharper the answers.</p>
      </header>
      <IngestPanel />
      <GraphCanvas engineConfigured={Boolean(env.graphEngineUrl)} />
    </div>
  );
}
