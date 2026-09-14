import { adminClient } from "@/lib/supabase/admin";
import { primeSecrets, secretSource } from "@/lib/secrets";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardHint } from "@/components/ui/card";

export const metadata = { title: "Services · Admin" };
export const dynamic = "force-dynamic";

const LAYERS: Array<{ layer: string; blurb: string; keys: string[] }> = [
  { layer: "LLM providers", blurb: "The models the router picks between per task.", keys: ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "GROQ_API_KEY", "PERPLEXITY_API_KEY", "DEEPSEEK_API_KEY", "XAI_API_KEY", "MISTRAL_API_KEY"] },
  { layer: "Data services", blurb: "Grounding: crawl, search and SEO data.", keys: ["FIRECRAWL_API_KEY", "SERPAPI_API_KEY", "DATAFORSEO_API_KEY"] },
  { layer: "Infra & jobs", blurb: "Payments, scheduled jobs and alerts.", keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"] },
];

function statusBadge(src: "vault" | "env" | "unset") {
  return src === "unset" ? <Badge tone="red">not set</Badge> : <Badge tone="green">{src}</Badge>;
}

/** Module-level (not the component) so the current-time read stays out of render. */
function cutoffISO(hoursAgo: number) {
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
}

export default async function ServicesPage() {
  await primeSecrets(true);
  const since = cutoffISO(24);
  const { data: usage } = await adminClient().from("api_usage_log").select("api_provider,cost_usd,status,created_at").gte("created_at", since).limit(8000);
  const byProvider = new Map<string, { calls: number; errors: number; cost: number }>();
  for (const u of usage ?? []) {
    const cur = byProvider.get(u.api_provider) ?? { calls: 0, errors: 0, cost: 0 };
    cur.calls++; if (u.status === "error") cur.errors++; cur.cost += Number(u.cost_usd);
    byProvider.set(u.api_provider, cur);
  }
  const usageRows = [...byProvider.entries()].sort((a, b) => b[1].calls - a[1].calls);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-medium">Services health <span className="text-fg-faint text-base font-normal">· the multi-layer stack</span></h2>
        <p className="text-sm text-fg-muted max-w-2xl">Every layer that makes an app run — LLMs (router), data services (grounding), the graph (memory), and infra (payments, jobs). Each call is metered; a layer with no key falls back (mock in dev), so nothing hard-fails.</p>
      </div>

      <div className="space-y-4">
        {LAYERS.map((l) => (
          <Card key={l.layer} className="space-y-3">
            <div><CardTitle>{l.layer}</CardTitle><CardHint>{l.blurb}</CardHint></div>
            <div className="flex flex-wrap gap-2">
              {l.keys.map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-xs num text-fg-muted">
                  {statusBadge(secretSource(k))} {k.replace(/_API_KEY$/, "").replace(/_/g, " ").toLowerCase()}
                </span>
              ))}
            </div>
          </Card>
        ))}
        <Card className="space-y-2">
          <div><CardTitle>Graph (memory layer)</CardTitle><CardHint>Postgres + pgvector; per-user knowledge nodes/edges. See the Graph tab for volume.</CardHint></div>
          <Badge tone="green">built-in</Badge>
        </Card>
      </div>

      <Card className="space-y-3 overflow-x-auto">
        <CardTitle>Usage · last 24h</CardTitle>
        {usageRows.length === 0 ? <CardHint>No metered calls in the last 24h.</CardHint> : (
          <table className="w-full text-sm border-collapse">
            <thead className="text-fg-faint text-xs uppercase tracking-wide"><tr>
              <th className="text-left py-2 pr-4">Provider</th><th className="text-left py-2 pr-4">Calls</th><th className="text-left py-2 pr-4">Errors</th><th className="text-left py-2">COGS</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {usageRows.map(([p, s]) => (
                <tr key={p}>
                  <td className="py-2 pr-4">{p}</td>
                  <td className="py-2 pr-4 num">{s.calls}</td>
                  <td className="py-2 pr-4 num">{s.errors > 0 ? <span className="text-coral">{s.errors}</span> : "0"}</td>
                  <td className="py-2 num text-fg-muted">${s.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
