import { adminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardHint } from "@/components/ui/card";

export const metadata = { title: "Graph · Admin" };
export const dynamic = "force-dynamic";

async function headCount(table: string): Promise<number> {
  const { count } = await adminClient().from(table as "knowledge_nodes").select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function GraphPage() {
  const db = adminClient();
  const [nodes, edges, { data: byType }, { data: recent }] = await Promise.all([
    headCount("knowledge_nodes"),
    headCount("knowledge_edges"),
    db.from("knowledge_nodes").select("node_type").limit(5000),
    db.from("knowledge_nodes").select("title,node_type,created_at").order("created_at", { ascending: false }).limit(12),
  ]);
  const typeCounts = new Map<string, number>();
  for (const n of byType ?? []) typeCounts.set(n.node_type, (typeCounts.get(n.node_type) ?? 0) + 1);
  const types = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium">Knowledge graph <span className="text-fg-faint text-base font-normal">· Obsidian-style memory</span></h2>
        <p className="text-sm text-fg-muted max-w-2xl">Every file, task output and note becomes a node; deterministic + AI edges link them. This is the shared, per-user (soon per-org) memory that lets apps “sound like you” and stay consistent — token-budgeted retrieval feeds each crew only its slice.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="space-y-1"><p className="text-3xl font-semibold num">{nodes}</p><p className="text-sm text-fg-muted">Nodes</p></Card>
        <Card className="space-y-1"><p className="text-3xl font-semibold num">{edges}</p><p className="text-sm text-fg-muted">Edges</p></Card>
        <Card className="space-y-1"><p className="text-3xl font-semibold num">{types.length}</p><p className="text-sm text-fg-muted">Node types</p></Card>
      </div>

      <Card className="space-y-3">
        <CardTitle>By node type</CardTitle>
        {types.length === 0 ? <CardHint>No nodes yet.</CardHint> : (
          <div className="flex flex-wrap gap-2">{types.map(([t, n]) => <Badge key={t} tone="sky">{t} · {n}</Badge>)}</div>
        )}
      </Card>

      <Card className="space-y-3">
        <CardTitle>Recent nodes</CardTitle>
        {(recent ?? []).length === 0 ? <CardHint>Nothing ingested yet.</CardHint> : (
          <ul className="divide-y divide-line text-sm">
            {(recent ?? []).map((n, i) => (
              <li key={i} className="py-2 flex items-center gap-3">
                <Badge>{n.node_type}</Badge>
                <span className="text-fg-muted truncate flex-1">{n.title ?? "(untitled)"}</span>
                <span className="text-xs text-fg-faint num">{new Date(n.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
